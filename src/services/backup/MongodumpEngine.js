const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const BackupCrypto = require('./backupCrypto');
const logger = require('../../utils/logger');

class MongodumpEngine {
  constructor(options = {}) {
    this.mongodumpPath = options.mongodumpPath || process.env.MONGODUMP_PATH || 'mongodump';
    this.mongorestorePath = options.mongorestorePath || process.env.MONGORESTORE_PATH || 'mongorestore';
  }

  /**
   * Check if native binary is available on the host
   */
  async isAvailable() {
    try {
      await execFileAsync(this.mongodumpPath, ['--version']);
      await execFileAsync(this.mongorestorePath, ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run mongodump to create an archive.gz
   */
  async backup(mongoUri, backupDir, options = {}) {
    const dataDir = path.join(backupDir, 'data');
    await fsp.mkdir(dataDir, { recursive: true });
    const archivePath = path.join(dataDir, 'database.archive.gz');

    const args = [
      `--uri=${mongoUri}`,
      `--archive=${archivePath}`,
      '--gzip',
      '--excludeCollectionsWithPrefix=sessions',
      '--excludeCollectionsWithPrefix=testmaps',
    ];

    if (options.excludeAudit) {
      args.push('--excludeCollection=audit_logs');
      args.push('--excludeCollection=publish_histories');
    }

    logger.info(`[MongodumpEngine] Executing ${this.mongodumpPath} --archive=${archivePath} ...`);
    const { stdout, stderr } = await execFileAsync(this.mongodumpPath, args, { maxBuffer: 10 * 1024 * 1024 });

    if (!fs.existsSync(archivePath)) {
      throw new Error(`mongodump finished but archive file was not created: ${stderr || stdout}`);
    }

    const stat = await fsp.stat(archivePath);
    const checksum = await BackupCrypto.calculateFileSha256(archivePath);

    return {
      file: 'database.archive.gz',
      path: archivePath,
      sizeBytes: stat.size,
      checksum,
      log: stderr || stdout,
    };
  }

  /**
   * Run mongorestore from archive.gz
   * Supports target database re-mapping via --nsFrom and --nsTo
   */
  async restore(mongoUri, backupDir, options = {}) {
    const archivePath = path.join(backupDir, 'data', 'database.archive.gz');
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Tệp archive mongodump không tồn tại: ${archivePath}`);
    }

    const args = [
      `--uri=${mongoUri}`,
      `--archive=${archivePath}`,
      '--gzip',
    ];

    if (options.dropExisting || options.inPlace) {
      args.push('--drop');
    }

    // Remap namespace if targetDb specified
    if (options.targetDb && options.sourceDb && options.targetDb !== options.sourceDb) {
      args.push(`--nsFrom=${options.sourceDb}.*`);
      args.push(`--nsTo=${options.targetDb}.*`);
    } else if (options.targetDb) {
      args.push(`--nsInclude=${options.targetDb}.*`);
    }

    if (options.dryRun) {
      args.push('--dryRun');
    }

    logger.info(`[MongodumpEngine] Executing ${this.mongorestorePath} ...`);
    const { stdout, stderr } = await execFileAsync(this.mongorestorePath, args, { maxBuffer: 10 * 1024 * 1024 });

    return {
      success: true,
      archivePath,
      log: stderr || stdout,
    };
  }
}

module.exports = MongodumpEngine;

