'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const logger = require('../../utils/logger');

class LocalStorageProvider {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'storage');
    this.uploadsDir = path.join(this.baseDir, 'uploads');
    this.thumbnailsDir = path.join(this.baseDir, 'thumbnails');

    // Đảm bảo thư mục tồn tại
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    fs.mkdirSync(this.thumbnailsDir, { recursive: true });
  }

  /**
   * Tạo đường dẫn con theo năm/tháng: YYYY/MM
   */
  getDateSubdir() {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return path.join(year, month);
  }

  /**
   * Chống Path Traversal: Kiểm tra đường dẫn có nằm trong baseDir không
   */
  resolveSafePath(subPath, isThumbnail = false) {
    const root = isThumbnail ? this.thumbnailsDir : this.uploadsDir;
    const safePath = path.resolve(root, subPath);
    if (!safePath.startsWith(root)) {
      throw new Error('Access denied: Path traversal attempt detected.');
    }
    return safePath;
  }

  /**
   * Lưu tệp tin nhị phân
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.originalName
   * @param {string} params.mimeType
   * @returns {Promise<{ storagePath: string, fileSize: number, checksum: string }>}
   */
  async saveFile({ buffer, originalName }) {
    const dateSubdir = this.getDateSubdir();
    const targetDir = path.join(this.uploadsDir, dateSubdir);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Làm sạch tên file
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);

    const uniqueId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const safeFilename = `${baseName}_${uniqueId}${ext}`;
    const targetPath = path.join(targetDir, safeFilename);

    // Tính checksum SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const checksum = hash.digest('hex');

    // Ghi file ra đĩa
    await fs.promises.writeFile(targetPath, buffer);

    const storagePath = path.join(dateSubdir, safeFilename).replace(/\\/g, '/');
    return {
      storagePath,
      fileSize: buffer.length,
      checksum
    };
  }

  /**
   * Sinh ảnh thumbnail tối ưu bằng Sharp
   * @param {string} storagePath
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async generateThumbnail(storagePath, options = { width: 300, height: 300 }) {
    try {
      const fullPath = this.resolveSafePath(storagePath);
      const ext = path.extname(storagePath).toLowerCase();

      // Chỉ sinh thumbnail cho các định dạng ảnh raster
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        return null;
      }

      const dateSubdir = path.dirname(storagePath);
      const targetDir = path.join(this.thumbnailsDir, dateSubdir);
      await fs.promises.mkdir(targetDir, { recursive: true });

      const baseName = path.basename(storagePath, ext);
      const thumbFilename = `${baseName}_thumb.webp`;
      const thumbFullPath = path.join(targetDir, thumbFilename);

      await sharp(fullPath)
        .rotate() // Tự động xoay theo EXIF
        .resize({
          width: options.width || 300,
          height: options.height || 300,
          fit: sharp.fit.cover,
          position: sharp.strategy.entropy
        })
        .webp({ quality: 80 })
        .toFile(thumbFullPath);

      return path.join(dateSubdir, thumbFilename).replace(/\\/g, '/');
    } catch (err) {
      logger.warn(`Failed to generate thumbnail for ${storagePath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Đọc metadata của ảnh (width, height, format)
   * @param {string} storagePath
   * @returns {Promise<{ width: number|null, height: number|null }>}
   */
  async getImageMetadata(storagePath) {
    try {
      const fullPath = this.resolveSafePath(storagePath);
      const metadata = await sharp(fullPath).metadata();
      return {
        width: metadata.width || null,
        height: metadata.height || null,
        format: metadata.format || null
      };
    } catch {
      return { width: null, height: null, format: null };
    }
  }

  /**
   * Lấy ReadStream của tệp tin
   * @param {string} storagePath
   * @param {boolean} isThumbnail
   * @returns {fs.ReadStream}
   */
  getReadStream(storagePath, isThumbnail = false) {
    const fullPath = this.resolveSafePath(storagePath, isThumbnail);
    return fs.createReadStream(fullPath);
  }

  /**
   * Lấy thông tin tệp tin vật lý (stat)
   * @param {string} storagePath
   * @param {boolean} isThumbnail
   * @returns {Promise<fs.Stats>}
   */
  async getStat(storagePath, isThumbnail = false) {
    const fullPath = this.resolveSafePath(storagePath, isThumbnail);
    return fs.promises.stat(fullPath);
  }

  /**
   * Xóa file vật lý khỏi đĩa
   * @param {string} storagePath
   * @param {string|null} thumbnailPath
   */
  async deleteFile(storagePath, thumbnailPath = null) {
    try {
      if (storagePath) {
        const fullPath = this.resolveSafePath(storagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      }
      if (thumbnailPath) {
        const thumbFullPath = this.resolveSafePath(thumbnailPath, true);
        if (fs.existsSync(thumbFullPath)) {
          await fs.promises.unlink(thumbFullPath);
        }
      }
    } catch (err) {
      logger.warn(`Error deleting physical file: ${err.message}`);
    }
  }
}

module.exports = LocalStorageProvider;

