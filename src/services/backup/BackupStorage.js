/**
 * Abstract BackupStorage Interface
 */
class BackupStorage {
  async init() {
    throw new Error('Method init() must be implemented.');
  }

  async getBackupDir(backupId) {
    throw new Error('Method getBackupDir() must be implemented.');
  }

  async createWriteStream(backupId, relativeFilePath) {
    throw new Error('Method createWriteStream() must be implemented.');
  }

  async createReadStream(backupId, relativeFilePath) {
    throw new Error('Method createReadStream() must be implemented.');
  }

  async saveFile(backupId, relativeFilePath, data) {
    throw new Error('Method saveFile() must be implemented.');
  }

  async readFile(backupId, relativeFilePath) {
    throw new Error('Method readFile() must be implemented.');
  }

  async fileExists(backupId, relativeFilePath) {
    throw new Error('Method fileExists() must be implemented.');
  }

  async listBackups() {
    throw new Error('Method listBackups() must be implemented.');
  }

  async deleteBackup(backupId) {
    throw new Error('Method deleteBackup() must be implemented.');
  }

  async getBackupSize(backupId) {
    throw new Error('Method getBackupSize() must be implemented.');
  }
}

module.exports = BackupStorage;

