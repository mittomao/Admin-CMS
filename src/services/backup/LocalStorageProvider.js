const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const BackupStorage = require('./BackupStorage');
const logger = require('../../utils/logger');
const { ValidationError } = require('../../utils/errors');

class LocalStorageProvider extends BackupStorage {
  constructor(baseDir) {
    super();
    this.baseDir = path.resolve(baseDir);
  }

  async init() {
    await fsp.mkdir(this.baseDir, { recursive: true });
    logger.info(`[LocalStorageProvider] Initialized backup directory at: ${this.baseDir}`);
  }

  /**
   * Validate backupId to prevent path traversal
   */
  validateBackupId(backupId) {
    if (!backupId || typeof backupId !== 'string') {
      throw new ValidationError('Mã định danh bản sao lưu (backupId) không hợp lệ.');
    }
    // Whitelist only alphanumeric, dashes, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(backupId)) {
      throw new ValidationError('Mã backupId chỉ được chứa ký tự chữ, số, dấu gạch nối và gạch dưới.');
    }
    return backupId;
  }

  /**
   * Resolve safe path within backup directory
   */
  resolveSafePath(backupId, relativeFilePath = '') {
    this.validateBackupId(backupId);

    // Normalize relativeFilePath
    const cleanRel = (relativeFilePath || '').replace(/\\/g, '/');
    if (cleanRel.includes('..')) {
      throw new ValidationError('Phát hiện đường dẫn không hợp lệ (Path Traversal attempt).');
    }

    const backupDir = path.resolve(this.baseDir, backupId);
    const resolved = path.resolve(backupDir, cleanRel);

    if (!resolved.startsWith(this.baseDir)) {
      throw new ValidationError('Đường dẫn tệp nằm ngoài phân vùng lưu trữ backup.');
    }

    return { backupDir, filePath: resolved };
  }

  async getBackupDir(backupId) {
    const { backupDir } = this.resolveSafePath(backupId);
    await fsp.mkdir(backupDir, { recursive: true });
    return backupDir;
  }

  async createWriteStream(backupId, relativeFilePath) {
    const { filePath } = this.resolveSafePath(backupId, relativeFilePath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    return fs.createWriteStream(filePath);
  }

  async createReadStream(backupId, relativeFilePath) {
    const { filePath } = this.resolveSafePath(backupId, relativeFilePath);
    if (!fs.existsSync(filePath)) {
      throw new ValidationError(`Tệp tin không tồn tại: ${relativeFilePath}`);
    }
    return fs.createReadStream(filePath);
  }

  async saveFile(backupId, relativeFilePath, data) {
    const { filePath } = this.resolveSafePath(backupId, relativeFilePath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, data);
    return filePath;
  }

  async readFile(backupId, relativeFilePath) {
    const { filePath } = this.resolveSafePath(backupId, relativeFilePath);
    if (!fs.existsSync(filePath)) {
      throw new ValidationError(`Tệp tin không tồn tại: ${relativeFilePath}`);
    }
    return fsp.readFile(filePath);
  }

  async fileExists(backupId, relativeFilePath) {
    try {
      const { filePath } = this.resolveSafePath(backupId, relativeFilePath);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async deleteBackup(backupId) {
    const { backupDir } = this.resolveSafePath(backupId);
    if (fs.existsSync(backupDir)) {
      await fsp.rm(backupDir, { recursive: true, force: true });
      logger.info(`[LocalStorageProvider] Deleted backup folder: ${backupDir}`);
      return true;
    }
    return false;
  }

  async getBackupSize(backupId) {
    const { backupDir } = this.resolveSafePath(backupId);
    if (!fs.existsSync(backupDir)) return 0;

    let total = 0;
    async function calculateDir(dir) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await calculateDir(fullPath);
        } else if (entry.isFile()) {
          const stat = await fsp.stat(fullPath);
          total += stat.size;
        }
      }
    }
    await calculateDir(backupDir);
    return total;
  }

  async listBackups() {
    await this.init();
    const entries = await fsp.readdir(this.baseDir, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isDirectory() && /^[a-zA-Z0-9_-]+$/.test(entry.name)) {
        const manifestPath = path.join(this.baseDir, entry.name, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const raw = await fsp.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(raw);
            const sizeBytes = await this.getBackupSize(entry.name);
            backups.push({
              backupId: entry.name,
              manifest,
              sizeBytes,
              createdAt: manifest.createdAt ? new Date(manifest.createdAt) : (await fsp.stat(manifestPath)).birthtime,
            });
          } catch (err) {
            logger.warn(`[LocalStorageProvider] Could not parse manifest for ${entry.name}: ${err.message}`);
          }
        }
      }
    }

    // Sort newest first
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backups;
  }
}

module.exports = LocalStorageProvider;

