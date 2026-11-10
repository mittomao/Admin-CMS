const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream/promises');

class BackupCrypto {
  /**
   * Derive a 32-byte key from user secret using SHA-256
   */
  static deriveKey(secretKey) {
    if (!secretKey || typeof secretKey !== 'string') {
      throw new Error('Khóa mã hóa (secretKey) không được để trống.');
    }
    return crypto.createHash('sha256').update(secretKey, 'utf8').digest();
  }

  /**
   * Calculate SHA-256 checksum of a buffer or string
   */
  static calculateSha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate SHA-256 checksum of a file on disk
   */
  static async calculateFileSha256(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Encrypt a Buffer using AES-256-GCM
   * Output format: [12-byte IV] + [16-byte Auth Tag] + [Ciphertext]
   */
  static encryptBuffer(plainBuffer, secretKey) {
    const key = this.deriveKey(secretKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * Decrypt a Buffer using AES-256-GCM
   */
  static decryptBuffer(encryptedBuffer, secretKey) {
    if (!encryptedBuffer || encryptedBuffer.length < 28) {
      throw new Error('Dữ liệu mã hóa không hợp lệ (độ dài tối thiểu 28 bytes).');
    }

    const key = this.deriveKey(secretKey);
    const iv = encryptedBuffer.subarray(0, 12);
    const tag = encryptedBuffer.subarray(12, 28);
    const ciphertext = encryptedBuffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Encrypt a file on disk using AES-256-GCM
   */
  static async encryptFile(inputPath, outputPath, secretKey) {
    const data = await fs.promises.readFile(inputPath);
    const encrypted = this.encryptBuffer(data, secretKey);
    await fs.promises.writeFile(outputPath, encrypted);
    return {
      size: encrypted.length,
      checksum: this.calculateSha256(encrypted),
    };
  }

  /**
   * Decrypt a file on disk using AES-256-GCM
   */
  static async decryptFile(inputPath, outputPath, secretKey) {
    const data = await fs.promises.readFile(inputPath);
    const decrypted = this.decryptBuffer(data, secretKey);
    await fs.promises.writeFile(outputPath, decrypted);
    return {
      size: decrypted.length,
      checksum: this.calculateSha256(decrypted),
    };
  }
}

module.exports = BackupCrypto;

