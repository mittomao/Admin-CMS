const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const env = require('../config/env');
const branding = require('../config/branding');
const LocalStorageProvider = require('./backup/LocalStorageProvider');
const MongodumpEngine = require('./backup/MongodumpEngine');
const NdjsonEngine = require('./backup/NdjsonEngine');
const RestoreEngine = require('./backup/restoreEngine');
const MediaManifestHelper = require('./backup/mediaManifestHelper');
const BackupCrypto = require('./backup/backupCrypto');
const BackupJob = require('../models/BackupJob');
const PublishJob = require('../models/PublishJob');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { ValidationError, ConflictError } = require('../utils/errors');

class BackupService {
  constructor() {
    this.storage = new LocalStorageProvider(env.BACKUP_DIR);
    this.mongodumpEngine = new MongodumpEngine();
    this.restoreEngine = new RestoreEngine(this.storage);
    this.schedulerInterval = null;
  }

  async init() {
    await this.storage.init();
  }

  /**
   * Acquire a lock for backup operations
   */
  async acquireLock(jobId) {
    const lockToken = crypto.randomUUID();
    const updated = await BackupJob.findOneAndUpdate(
      {
        _id: jobId,
        status: 'Pending',
        lockToken: null,
      },
      {
        $set: {
          status: 'Processing',
          lockToken,
          lockedAt: new Date(),
        },
      },
      { new: true }
    );
    return updated ? lockToken : null;
  }

  /**
   * Create a new database backup
   */
  async createBackup(options = {}) {
    await this.init();

    // 1. Guard against running during active Publish Job
    try {
      const activePublishJob = await PublishJob.findOne({ status: 'Processing' });
      if (activePublishJob) {
        throw new ConflictError(
          'Không thể khởi tạo sao lưu: Có tác vụ xuất bản (Publish Job) đang xử lý. Vui lòng đợi hoàn tất.'
        );
      }
    } catch (err) {
      if (err instanceof ConflictError) throw err;
      // If collection doesn't exist yet, proceed
    }

    // 2. Generate unique backup ID: backup-YYYYMMDD-HHmmss-<shortId>
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const randomHex = crypto.randomBytes(4).toString('hex');
    const type = options.type || 'full';
    const backupId = options.backupId || (type === 'pre-restore' ? `pre-restore-${timestampStr}-${randomHex}` : `backup-${timestampStr}-${randomHex}`);

    const backupDir = await this.storage.getBackupDir(backupId);

    // 3. Create tracking record in DB
    const backupJob = await BackupJob.create({
      backupId,
      mode: 'backup',
      type,
      status: 'Pending',
      initiatedBy: options.user ? (options.user._id || options.user.id) : null,
      initiatedByUsername: options.user ? (options.user.username || 'admin') : 'system',
      note: options.note || '',
      options,
    });

    const lockToken = await this.acquireLock(backupJob._id);
    if (!lockToken) {
      throw new ConflictError('Không thể chiếm quyền khóa tiến trình sao lưu.');
    }

    const startTime = Date.now();

    try {
      // 4. Check available engine
      const canUseMongodump = await this.mongodumpEngine.isAvailable();
      const preferredEngine = options.engine || (canUseMongodump ? 'mongodump' : 'ndjson');
      let dumpMeta = [];
      let archiveFile = null;
      let archiveChecksum = null;

      if (preferredEngine === 'mongodump' && canUseMongodump) {
        logger.info(`[BackupService] Starting backup ${backupId} using MongodumpEngine...`);
        const dumpRes = await this.mongodumpEngine.backup(env.MONGO_URI, backupDir, options);
        archiveFile = dumpRes.file;
        archiveChecksum = dumpRes.checksum;
      } else {
        logger.info(`[BackupService] Starting backup ${backupId} using NdjsonEngine...`);
        const db = mongoose.connection.db;
        const ndjson = new NdjsonEngine(db);
        dumpMeta = await ndjson.backup(backupDir, options);
      }

      // 5. Extract Media Manifest
      const mediaManifest = await MediaManifestHelper.extractMediaManifest();
      const mediaManifestPath = path.join(backupDir, 'media-manifest.json');
      await fsp.writeFile(mediaManifestPath, JSON.stringify(mediaManifest, null, 2));

      // 6. Optional Encryption
      const encKey = options.encryptionKey || env.BACKUP_ENCRYPTION_KEY;
      const isEncrypted = Boolean(encKey);

      if (isEncrypted) {
        logger.info(`[BackupService] Encrypting backup ${backupId} with AES-256-GCM...`);
        const dataDir = path.join(backupDir, 'data');
        const files = await fsp.readdir(dataDir);
        for (const file of files) {
          const filePath = path.join(dataDir, file);
          const encRes = await BackupCrypto.encryptFile(filePath, filePath, encKey);
          if (archiveFile === file) {
            archiveChecksum = encRes.checksum;
          }
        }
      }

      // 7. Calculate stats and write manifest.json
      const currentDb = mongoose.connection.db ? mongoose.connection.db.databaseName : 'admin_cms';
      const sizeBytes = await this.storage.getBackupSize(backupId);

      const manifest = {
        backupId,
        appVersion: process.env.npm_package_version || '1.0.0',
        schemaVersion: 1,
        projectName: branding.PROJECT_NAME,
        rootPath: branding.PATHS.ROOT,
        sourceDb: currentDb,
        type,
        engine: preferredEngine,
        isEncrypted,
        createdAt: now.toISOString(),
        initiatedBy: backupJob.initiatedByUsername,
        note: options.note || '',
        collections: dumpMeta,
        archiveFile,
        archiveChecksum,
        totalCollections: dumpMeta.length || (archiveFile ? 1 : 0),
        totalRecords: dumpMeta.reduce((acc, c) => acc + (c.count || 0), 0),
        mediaAssetsCount: mediaManifest.totalAssets || 0,
      };

      const manifestPath = path.join(backupDir, 'manifest.json');
      await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      const durationMs = Date.now() - startTime;

      // 8. Update DB Job
      backupJob.status = 'Success';
      backupJob.lockToken = null;
      backupJob.manifest = manifest;
      backupJob.mediaManifest = mediaManifest;
      backupJob.sizeBytes = sizeBytes;
      backupJob.isEncrypted = isEncrypted;
      backupJob.engine = preferredEngine;
      backupJob.checksum = archiveChecksum;
      backupJob.durationMs = durationMs;
      backupJob.completedAt = new Date();
      await backupJob.save();

      eventBus.emit('backup.created', {
        backupId,
        type,
        sizeBytes,
        isEncrypted,
        byUser: backupJob.initiatedByUsername,
        at: new Date(),
      });

      logger.info(`[BackupService] Backup ${backupId} created successfully in ${durationMs}ms (${sizeBytes} bytes)`);

      return {
        success: true,
        backupId,
        manifest,
        sizeBytes,
        durationMs,
        isEncrypted,
      };
    } catch (err) {
      logger.error(`[BackupService] Backup ${backupId} failed: ${err.message}`, err);

      backupJob.status = 'Failed';
      backupJob.lockToken = null;
      backupJob.error = err.message;
      backupJob.completedAt = new Date();
      await backupJob.save().catch(() => {});

      eventBus.emit('backup.failed', {
        backupId,
        error: err.message,
        at: new Date(),
      });

      throw err;
    }
  }

  /**
   * Verify integrity of a backup
   */
  async verifyBackup(backupId, options = {}) {
    const backupDir = await this.storage.getBackupDir(backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new ValidationError(`Không tìm thấy manifest.json cho bản sao lưu: ${backupId}`);
    }

    const manifestRaw = await fsp.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);

    const report = {
      backupId,
      timestamp: new Date().toISOString(),
      passed: true,
      errors: [],
      filesVerified: 0,
    };

    // 1. Check archive or collection files
    const dataDir = path.join(backupDir, 'data');
    if (!fs.existsSync(dataDir)) {
      report.passed = false;
      report.errors.push('Thư mục dữ liệu (data/) bị thiếu.');
      return report;
    }

    // Verify files checksums
    if (manifest.archiveFile && manifest.archiveChecksum) {
      const archivePath = path.join(dataDir, manifest.archiveFile);
      if (!fs.existsSync(archivePath)) {
        report.passed = false;
        report.errors.push(`Tệp archive "${manifest.archiveFile}" không tồn tại.`);
      } else {
        const actualChecksum = await BackupCrypto.calculateFileSha256(archivePath);
        if (actualChecksum !== manifest.archiveChecksum) {
          report.passed = false;
          report.errors.push(`Mã băm SHA-256 của archive không khớp (Kỳ vọng: ${manifest.archiveChecksum}, Thực tế: ${actualChecksum})`);
        } else {
          report.filesVerified++;
        }
      }
    } else if (Array.isArray(manifest.collections)) {
      for (const coll of manifest.collections) {
        if (!coll.file || !coll.checksum) continue;
        const filePath = path.join(dataDir, coll.file);
        if (!fs.existsSync(filePath)) {
          report.passed = false;
          report.errors.push(`Tệp collection "${coll.file}" không tồn tại.`);
        } else {
          const actual = await BackupCrypto.calculateFileSha256(filePath);
          if (actual !== coll.checksum) {
            report.passed = false;
            report.errors.push(`Mã băm SHA-256 của "${coll.name}" bị sai lệch!`);
          } else {
            report.filesVerified++;
          }
        }
      }
    }

    // 2. Verify decryption key if encrypted
    if (manifest.isEncrypted) {
      const encKey = options.encryptionKey || env.BACKUP_ENCRYPTION_KEY;
      if (!encKey) {
        report.errors.push('Bản sao lưu đã được mã hóa nhưng chưa cung cấp khóa giải mã.');
      }
    }

    report.passed = report.errors.length === 0;

    eventBus.emit(report.passed ? 'backup.verified' : 'backup.verify_failed', {
      backupId,
      passed: report.passed,
      errors: report.errors,
      at: new Date(),
    });

    return report;
  }

  /**
   * Restore a backup
   */
  async restoreBackup(backupId, options = {}, onProgress = null) {
    const isDryRun = Boolean(options.dryRun);
    const mode = options.mode || 'target-db';

    // In-place mode safety: Automatically create pre-restore backup first
    if (mode === 'in-place' && !isDryRun) {
      logger.info(`[BackupService] Creating mandatory pre-restore safety backup before in-place restore...`);
      const preRestore = await this.createBackup({
        type: 'pre-restore',
        note: `Tự động tạo trước khi phục hồi bản sao lưu ${backupId}`,
        user: options.user,
      });

      // Verify pre-restore
      const verifyRes = await this.verifyBackup(preRestore.backupId);
      if (!verifyRes.passed) {
        throw new Error(`Bản sao lưu an toàn pre-restore không đạt chuẩn toàn vẹn: ${verifyRes.errors.join(', ')}`);
      }
      logger.info(`[BackupService] Pre-restore safety backup created and verified: ${preRestore.backupId}`);
    }

    eventBus.emit('restore.started', {
      backupId,
      mode,
      byUser: options.user ? (options.user.username || 'admin') : 'system',
      at: new Date(),
    });

    try {
      const result = await this.restoreEngine.executeRestore(backupId, options, onProgress);

      eventBus.emit('restore.finished', {
        backupId,
        mode,
        at: new Date(),
      });

      return result;
    } catch (err) {
      eventBus.emit('restore.failed', {
        backupId,
        mode,
        error: err.message,
        at: new Date(),
      });
      throw err;
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    return this.storage.listBackups();
  }

  /**
   * Get details of a specific backup
   */
  async getBackupDetails(backupId) {
    const backupDir = await this.storage.getBackupDir(backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new ValidationError(`Không tìm thấy bản sao lưu: ${backupId}`);
    }

    const manifestRaw = await fsp.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    const sizeBytes = await this.storage.getBackupSize(backupId);

    let mediaManifest = null;
    const mediaManifestPath = path.join(backupDir, 'media-manifest.json');
    if (fs.existsSync(mediaManifestPath)) {
      try {
        const rawMedia = await fsp.readFile(mediaManifestPath, 'utf8');
        mediaManifest = JSON.parse(rawMedia);
      } catch {
        // ignore
      }
    }

    return {
      backupId,
      manifest,
      mediaManifest,
      sizeBytes,
    };
  }

  /**
   * Delete a backup with safety retention constraints
   */
  async deleteBackup(backupId) {
    const backups = await this.storage.listBackups();

    // 1. Golden Rule: Never delete the only remaining backup
    if (backups.length <= 1) {
      throw new ValidationError('Không thể xóa bản sao lưu duy nhất còn lại của hệ thống (Quy tắc an toàn dữ liệu).');
    }

    // 2. Safety check: Don't delete the most recent pre-restore backup
    const target = backups.find((b) => b.backupId === backupId);
    if (target && target.manifest && target.manifest.type === 'pre-restore') {
      const mostRecentPreRestore = backups.find((b) => b.manifest && b.manifest.type === 'pre-restore');
      if (mostRecentPreRestore && mostRecentPreRestore.backupId === backupId) {
        throw new ValidationError('Không thể xóa bản sao lưu an toàn pre-restore gần nhất của hệ thống.');
      }
    }

    const deleted = await this.storage.deleteBackup(backupId);
    if (deleted) {
      await BackupJob.deleteOne({ backupId }).catch(() => {});
      eventBus.emit('backup.deleted', { backupId, at: new Date() });
    }
    return deleted;
  }

  /**
   * Prune expired backups according to retention policy
   */
  async pruneBackups(options = {}) {
    const retentionCount = options.retentionCount || env.BACKUP_RETENTION_COUNT || 7;
    const retentionDays = options.retentionDays || env.BACKUP_RETENTION_DAYS || 30;
    const isDryRun = Boolean(options.dryRun);

    const backups = await this.storage.listBackups();
    if (backups.length <= retentionCount) {
      return { prunedCount: 0, keptCount: backups.length, message: 'Số lượng bản sao lưu nằm trong giới hạn lưu giữ.' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Keep the N newest backups
    const toKeep = backups.slice(0, retentionCount);
    const candidates = backups.slice(retentionCount);

    const toDelete = [];
    for (const b of candidates) {
      // Don't delete if it's the only remaining pre-restore
      if (b.manifest?.type === 'pre-restore') continue;
      toDelete.push(b);
    }

    if (isDryRun) {
      return {
        dryRun: true,
        wouldPruneCount: toDelete.length,
        wouldKeepCount: backups.length - toDelete.length,
        backupsToPrune: toDelete.map((b) => b.backupId),
      };
    }

    let prunedCount = 0;
    for (const b of toDelete) {
      try {
        await this.deleteBackup(b.backupId);
        prunedCount++;
      } catch (err) {
        logger.warn(`[BackupService] Failed to prune backup ${b.backupId}: ${err.message}`);
      }
    }

    return {
      prunedCount,
      keptCount: backups.length - prunedCount,
    };
  }

  /**
   * Start in-process internal backup scheduler
   */
  startScheduler() {
    if (this.schedulerInterval) return;

    logger.info('[BackupService] Starting internal backup scheduler (checks every 60m)');
    this.schedulerInterval = setInterval(async () => {
      try {
        const now = new Date();
        // Trigger daily at 02:00 AM
        if (now.getHours() === 2) {
          logger.info('[BackupService] Executing scheduled automatic daily backup...');
          await this.createBackup({
            type: 'full',
            note: 'Tự động tạo theo lịch trình ban đêm (02:00)',
          });
          // Run retention pruning
          await this.pruneBackups();
        }
      } catch (err) {
        logger.error(`[BackupService] Scheduler error: ${err.message}`, err);
      }
    }, 60 * 60 * 1000);
  }

  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info('[BackupService] Stopped internal backup scheduler');
    }
  }
}

module.exports = new BackupService();

