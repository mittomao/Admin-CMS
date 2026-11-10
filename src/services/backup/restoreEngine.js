const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const mongoose = require('mongoose');
const env = require('../../config/env');
const branding = require('../../config/branding');
const maintenanceService = require('../maintenanceService');
const BackupCrypto = require('./backupCrypto');
const MongodumpEngine = require('./MongodumpEngine');
const NdjsonEngine = require('./NdjsonEngine');
const PostRestoreVerifier = require('./postRestoreVerifier');
const logger = require('../../utils/logger');
const { ValidationError, ConflictError } = require('../../utils/errors');

class RestoreEngine {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.mongodumpEngine = new MongodumpEngine();
  }

  /**
   * Validate restore preconditions
   */
  async validatePreconditions(manifest, options = {}) {
    if (!manifest) {
      throw new ValidationError('Không tìm thấy thông tin manifest của bản sao lưu.');
    }

    // 1. App Version & Schema Compatibility
    // Reject if backup is from a strictly newer app version (downgrade not permitted)
    const currentVersion = process.env.npm_package_version || '1.0.0';
    if (manifest.appVersion && manifest.appVersion > currentVersion) {
      throw new ValidationError(
        `Không thể khôi phục: Bản sao lưu được tạo từ phiên bản CMS mới hơn (${manifest.appVersion}) so với phiên bản hiện tại (${currentVersion}).`
      );
    }

    // 2. Mode-specific safety validations
    const mode = options.mode || 'target-db';
    const currentDbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'admin_cms';

    if (mode === 'in-place') {
      // Must be in maintenance mode
      const isMaintenance = await maintenanceService.isMaintenanceMode();
      if (!isMaintenance && !options.force) {
        throw new ConflictError(
          'Chế độ khôi phục đè trực tiếp (--in-place) bắt buộc hệ thống phải ở Chế độ Bảo trì (Maintenance Mode). Vui lòng bật bảo trì trước.'
        );
      }

      // User must explicitly confirm target DB name to prevent accidental overwrites
      if (!options.confirmDbName || options.confirmDbName !== currentDbName) {
        throw new ValidationError(
          `Xác nhận tên cơ sở dữ liệu không khớp. Bạn phải nhập chính xác "${currentDbName}" để xác nhận ghi đè.`
        );
      }
    } else {
      // Target DB Mode
      const targetDb = options.targetDb;
      if (!targetDb || typeof targetDb !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(targetDb)) {
        throw new ValidationError('Tên cơ sở dữ liệu đích (--target-db) không hợp lệ (chỉ gồm chữ, số, gạch nối, gạch dưới).');
      }
      if (targetDb === currentDbName) {
        throw new ValidationError(
          `Cơ sở dữ liệu đích trùng với DB đang chạy ("${currentDbName}"). Để ghi đè DB hiện tại, vui lòng chọn chế độ --in-place.`
        );
      }
    }

    return true;
  }

  /**
   * Execute restore process
   */
  async executeRestore(backupId, options = {}, onProgress = null) {
    const backupDir = await this.storage.getBackupDir(backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new ValidationError(`Bản sao lưu không tồn tại hoặc thiếu manifest.json (${backupId})`);
    }

    const manifestRaw = await fsp.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    await this.validatePreconditions(manifest, options);

    const mode = options.mode || 'target-db';
    const isDryRun = Boolean(options.dryRun);
    const currentDbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'admin_cms';
    const targetDbName = mode === 'in-place' ? currentDbName : options.targetDb;

    // Dry Run mode: report operations without writing
    if (isDryRun) {
      logger.info(`[RestoreEngine] DRY RUN: Would restore ${manifest.totalCollections} collections (${manifest.totalRecords} records) into database "${targetDbName}"`);
      return {
        dryRun: true,
        mode,
        targetDb: targetDbName,
        targetDbName,
        collections: manifest.collections || [],
        totalCollections: manifest.totalCollections || 0,
        totalRecords: manifest.totalRecords || 0,
        isEncrypted: Boolean(manifest.isEncrypted),
      };
    }

    // Decrypt archive if encrypted
    let workingBackupDir = backupDir;
    let tempDecryptedDir = null;

    if (manifest.isEncrypted) {
      const encKey = options.encryptionKey || env.BACKUP_ENCRYPTION_KEY;
      if (!encKey) {
        throw new ValidationError('Bản sao lưu được mã hóa. Vui lòng cung cấp khóa giải mã (BACKUP_ENCRYPTION_KEY).');
      }

      tempDecryptedDir = path.join(backupDir, '.decrypted_tmp');
      await fsp.mkdir(tempDecryptedDir, { recursive: true });
      workingBackupDir = tempDecryptedDir;

      // Decrypt data files
      const dataSrcDir = path.join(backupDir, 'data');
      const dataDestDir = path.join(tempDecryptedDir, 'data');
      await fsp.mkdir(dataDestDir, { recursive: true });

      const files = await fsp.readdir(dataSrcDir);
      for (const file of files) {
        const srcFile = path.join(dataSrcDir, file);
        const destFile = path.join(dataDestDir, file);
        await BackupCrypto.decryptFile(srcFile, destFile, encKey);
      }
    }

    try {
      const sourceDb = manifest.sourceDb || currentDbName;
      let restoreResult = null;

      // Choose Engine
      const canUseMongodump = manifest.engine === 'mongodump' && (await this.mongodumpEngine.isAvailable());

      if (canUseMongodump) {
        logger.info(`[RestoreEngine] Restoring using native MongodumpEngine into "${targetDbName}"...`);
        restoreResult = await this.mongodumpEngine.restore(env.MONGO_URI, workingBackupDir, {
          sourceDb,
          targetDb: targetDbName,
          inPlace: mode === 'in-place',
          dropExisting: true,
        });
      } else {
        logger.info(`[RestoreEngine] Restoring using NdjsonEngine into "${targetDbName}"...`);
        // Connect to targetDb if different from current
        let targetConnection = mongoose.connection.db;
        if (targetDbName !== currentDbName) {
          const client = mongoose.connection.getClient();
          targetConnection = client.db(targetDbName);
        }

        const ndjsonEngine = new NdjsonEngine(targetConnection);
        restoreResult = await ndjsonEngine.restore(
          targetConnection,
          workingBackupDir,
          manifest.collections || [],
          { inPlace: mode === 'in-place', dropExisting: true },
          onProgress
        );
      }

      // Load media manifest if present
      let mediaManifest = null;
      const mediaManifestPath = path.join(backupDir, 'media-manifest.json');
      if (fs.existsSync(mediaManifestPath)) {
        try {
          const raw = await fsp.readFile(mediaManifestPath, 'utf8');
          mediaManifest = JSON.parse(raw);
        } catch {
          // ignore parsing error for media manifest
        }
      }

      // Post-restore validation & cleanup
      let targetDbConnection = mongoose.connection.db;
      if (targetDbName !== currentDbName) {
        targetDbConnection = mongoose.connection.getClient().db(targetDbName);
      }
      const postVerification = await PostRestoreVerifier.verify(targetDbConnection, mediaManifest);

      logger.info(`[RestoreEngine] Restore completed successfully into "${targetDbName}". Passed: ${postVerification.passed}`);

      let totalRestored = 0;
      if (Array.isArray(restoreResult)) {
        totalRestored = restoreResult.reduce((sum, r) => sum + (r.restoredCount || 0), 0);
      } else if (restoreResult && typeof restoreResult.totalRestored === 'number') {
        totalRestored = restoreResult.totalRestored;
      }

      return {
        success: true,
        backupId,
        mode,
        targetDb: targetDbName,
        targetDbName,
        totalRestored,
        engineUsed: canUseMongodump ? 'mongodump' : 'ndjson',
        restoreResult,
        postVerification,
      };
    } finally {
      // Clean up decrypted temporary directory if created
      if (tempDecryptedDir && fs.existsSync(tempDecryptedDir)) {
        await fsp.rm(tempDecryptedDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}

module.exports = RestoreEngine;
