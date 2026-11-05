'use strict';

const crypto = require('crypto');
const https = require('https');
const { PassThrough } = require('stream');
const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');

class CloudinaryStorageProvider {
  constructor(config = {}) {
    this.cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = config.apiKey || process.env.CLOUDINARY_API_KEY;
    this.apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;
    this.folder = config.folder || process.env.CLOUDINARY_API_FOLDER || 'AdminCMS';

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true
      });
      logger.info(`[CloudinaryStorageProvider] Initialized for cloud: ${this.cloudName}, root folder: ${this.folder}`);
    } else {
      logger.warn('[CloudinaryStorageProvider] Missing Cloudinary credentials in environment configuration.');
    }
  }

  /**
   * Làm sạch tên file để tạo public_id an toàn
   */
  getSafeBaseName(originalName) {
    const raw = originalName.replace(/\.[^/.]+$/, '').trim();
    return raw
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
  }

  /**
   * Xác định resource_type cho Cloudinary dựa trên MIME
   */
  getResourceType(mimeType) {
    if (!mimeType) return 'auto';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'auto';
  }

  /**
   * Lưu tệp tin lên Cloudinary
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.originalName
   * @param {string} params.mimeType
   * @param {string} [params.folder]
   * @returns {Promise<{ storagePath: string, fileSize: number, checksum: string, provider: string, publicId: string, secureUrl: string, thumbnailUrl: string|null, dimensions: Object }>}
   */
  async saveFile({ buffer, originalName, mimeType = '', folder = null, publicId = null }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Invalid file buffer provided to CloudinaryStorageProvider.');
    }

    // 1. Tính checksum SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const checksum = hash.digest('hex');

    // 2. Xác định folder đích
    let targetFolder = folder;
    if (targetFolder) {
      targetFolder = targetFolder.replace(/^\/+|\/+$/g, '');
    } else if (this.folder) {
      targetFolder = this.folder.replace(/^\/+|\/+$/g, '');
    } else {
      targetFolder = '';
    }

    const safeBase = this.getSafeBaseName(originalName || 'file');
    const finalPublicId = publicId || `${safeBase}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const resourceType = this.getResourceType(mimeType);

    const uploadOptions = {
      public_id: finalPublicId,
      resource_type: resourceType,
      overwrite: false
    };
    if (targetFolder) {
      uploadOptions.folder = targetFolder;
    }

    // 3. Upload stream lên Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error(`[CloudinaryStorageProvider] Upload failed: ${error.message}`);
            return reject(error);
          }
          resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    const isImage = resourceType === 'image' || uploadResult.resource_type === 'image';
    let thumbnailUrl = null;

    if (isImage) {
      thumbnailUrl = this.getTransformationUrl(uploadResult.public_id, 'thumb', uploadResult.format || 'jpg', uploadResult.version);
    }

    return {
      storagePath: uploadResult.secure_url,
      fileSize: uploadResult.bytes || buffer.length,
      checksum,
      provider: 'cloudinary',
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      thumbnailUrl: thumbnailUrl || uploadResult.secure_url,
      version: uploadResult.version || null,
      dimensions: {
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        format: uploadResult.format || null
      }
    };
  }

  /**
   * Sinh URL ảnh đã biến đổi theo preset được cấp phép (whitelist)
   * @param {string} publicId
   * @param {'thumb'|'medium'|'large'} preset
   * @param {string} [customFormat]
   * @param {string|number} [version]
   * @returns {string|null}
   */
  getTransformationUrl(publicId, preset = 'thumb', customFormat = null, version = null) {
    if (!publicId) return null;
    const presets = {
      thumb: { width: 300, height: 300, crop: 'fill' },
      medium: { width: 800, height: 600, crop: 'fit' },
      large: { width: 1600, height: 1200, crop: 'fit' }
    };
    const config = presets[preset] || presets.thumb;
    const urlOptions = {
      ...config,
      quality: 'auto',
      secure: true
    };
    if (customFormat) {
      urlOptions.format = customFormat;
    }
    if (version) {
      urlOptions.version = version;
    }
    try {
      return cloudinary.url(publicId, urlOptions);
    } catch {
      return null;
    }
  }

  /**
   * Sinh ảnh thumbnail tối ưu qua Cloudinary URL transformation
   */
  async generateThumbnail(publicId, options = { width: 300, height: 300 }) {
    if (!publicId) return null;

    try {
      return cloudinary.url(publicId, {
        width: options.width || 300,
        height: options.height || 300,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'webp',
        secure: true
      });
    } catch (err) {
      logger.warn(`[CloudinaryStorageProvider] Failed to generate thumbnail URL for ${publicId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Đổi tên asset trên Cloudinary (Rename / Move)
   */
  async renameAsset(oldPublicId, newPublicId, options = {}) {
    if (!oldPublicId || !newPublicId) {
      throw new Error('Both oldPublicId and newPublicId are required.');
    }
    try {
      const res = await cloudinary.uploader.rename(oldPublicId, newPublicId, {
        overwrite: options.overwrite !== false,
        invalidate: true,
        resource_type: options.resourceType || 'image'
      });
      return res;
    } catch (err) {
      logger.error(`[CloudinaryStorageProvider] Rename failed from ${oldPublicId} to ${newPublicId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Di chuyển asset (tương đương rename sang path mới)
   */
  async moveAsset(oldPublicId, newPublicId, options = {}) {
    return this.renameAsset(oldPublicId, newPublicId, options);
  }

  /**
   * Thay thế file trên Cloudinary (giữ nguyên public_id)
   */
  async replaceFile({ buffer, publicId, resourceType = 'image' }) {
    if (!buffer || !publicId) {
      throw new Error('Buffer and publicId are required for replaceFile.');
    }
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const uploadOptions = {
      public_id: publicId,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true
    };

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      uploadStream.end(buffer);
    });

    const isImage = resourceType === 'image' || uploadResult.resource_type === 'image';
    const thumbnailUrl = isImage
      ? this.getTransformationUrl(uploadResult.public_id, 'thumb', uploadResult.format || 'jpg', uploadResult.version)
      : null;

    return {
      storagePath: uploadResult.secure_url,
      fileSize: uploadResult.bytes || buffer.length,
      checksum,
      provider: 'cloudinary',
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      thumbnailUrl: thumbnailUrl || uploadResult.secure_url,
      version: uploadResult.version || null,
      dimensions: {
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        format: uploadResult.format || null
      }
    };
  }

  /**
   * Đọc metadata của ảnh
   */
  async getImageMetadata(publicId) {
    if (!publicId) return { width: null, height: null, format: null };

    try {
      const res = await cloudinary.api.resource(publicId);
      return {
        width: res.width || null,
        height: res.height || null,
        format: res.format || null
      };
    } catch {
      return { width: null, height: null, format: null };
    }
  }

  /**
   * Lấy ReadStream từ Cloudinary CDN URL (khi cần stream dữ liệu nhị phân)
   */
  getReadStream(targetUrlOrPath) {
    const passThrough = new PassThrough();

    if (!targetUrlOrPath || !targetUrlOrPath.startsWith('http')) {
      process.nextTick(() => {
        passThrough.emit('error', new Error('Invalid Cloudinary URL for ReadStream.'));
      });
      return passThrough;
    }

    https.get(targetUrlOrPath, (res) => {
      if (res.statusCode >= 400) {
        passThrough.emit('error', new Error(`Cloudinary returned HTTP status ${res.statusCode}`));
        return;
      }
      res.pipe(passThrough);
    }).on('error', (err) => {
      passThrough.emit('error', err);
    });

    return passThrough;
  }

  /**
   * Lấy stat của tệp tin
   */
  async getStat(_storagePath) {
    return { size: 0 };
  }

  /**
   * Xóa file khỏi Cloudinary
   */
  async deleteFile(_storagePath, _thumbnailPath = null, publicId = null) {
    if (!publicId) return;

    try {
      const res = await cloudinary.uploader.destroy(publicId);
      logger.info(`[CloudinaryStorageProvider] Deleted asset ${publicId}: ${res.result}`);
    } catch (err) {
      logger.warn(`[CloudinaryStorageProvider] Error deleting asset ${publicId}: ${err.message}`);
    }
  }

  /**
   * Xóa nhiều file khỏi Cloudinary
   */
  async deleteResources(publicIds = []) {
    if (!publicIds || publicIds.length === 0) return { deleted: {} };
    try {
      const res = await cloudinary.api.delete_resources(publicIds);
      return res;
    } catch (err) {
      logger.error(`[CloudinaryStorageProvider] Error deleting resources: ${err.message}`);
      throw err;
    }
  }

  /**
   * Lấy danh sách thư mục gốc trên Cloudinary
   */
  async getRootFolders() {
    try {
      const res = await cloudinary.api.root_folders();
      return res.folders || [];
    } catch (err) {
      logger.warn(`[CloudinaryStorageProvider] Failed to fetch root folders: ${err.message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách thư mục con của một thư mục trên Cloudinary
   */
  async getSubFolders(parentPath) {
    if (!parentPath) {
      return this.getRootFolders();
    }
    try {
      const cleanPath = parentPath.replace(/^\/+|\/+$/g, '');
      const res = await cloudinary.api.sub_folders(cleanPath);
      return res.folders || [];
    } catch (err) {
      logger.warn(`[CloudinaryStorageProvider] Failed to fetch subfolders for "${parentPath}": ${err.message}`);
      return [];
    }
  }

  /**
   * Lấy toàn bộ cây thư mục Cloudinary (hỗ trợ đệ quy)
   */
  async getAllFolders(baseFolder = null) {
    const results = [];
    const queue = [];

    if (baseFolder) {
      const cleanBase = baseFolder.replace(/^\/+|\/+$/g, '');
      queue.push({ name: cleanBase.split('/').pop(), path: cleanBase });
    } else {
      const roots = await this.getRootFolders();
      for (const r of roots) {
        queue.push({ name: r.name, path: r.path });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      results.push(current);
      try {
        const subs = await this.getSubFolders(current.path);
        for (const s of subs) {
          queue.push({ name: s.name, path: s.path });
        }
      } catch {
        // Tiếp tục duyệt
      }
    }

    return results;
  }

  /**
   * Tạo thư mục mới trên Cloudinary
   */
  async createFolder(folderPath) {
    if (!folderPath) throw new Error('Folder path is required.');
    const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');
    return cloudinary.api.create_folder(cleanPath);
  }

  /**
   * Xóa thư mục trên Cloudinary (thư mục phải rỗng)
   */
  async deleteFolder(folderPath) {
    if (!folderPath) throw new Error('Folder path is required.');
    const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');
    return cloudinary.api.delete_folder(cleanPath);
  }

  /**
   * Truy vấn danh sách tài nguyên ảnh trên Cloudinary
   */
  async getMediaAssets({
    folder = '',
    q = '',
    format = 'all',
    sort = 'created_at_desc',
    next_cursor = null,
    max_results = 40,
    page = 1
  } = {}) {
    try {
      const expressions = ['resource_type:image'];

      if (folder && folder.trim() && folder !== 'root') {
        const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, '');
        expressions.push(`folder="${cleanFolder}"`);
      }

      if (format && format !== 'all') {
        expressions.push(`format=${format.toLowerCase()}`);
      }

      if (q && q.trim()) {
        const cleanQ = q.trim().replace(/[*"']/g, '');
        expressions.push(`(filename:*${cleanQ}* OR public_id:*${cleanQ}*)`);
      }

      const limit = Math.min(parseInt(max_results, 10) || 40, 100);
      let searchReq = cloudinary.search
        .expression(expressions.join(' AND '))
        .max_results(limit);

      if (next_cursor) {
        searchReq = searchReq.next_cursor(next_cursor);
      }

      switch (sort) {
        case 'created_at_asc':
          searchReq = searchReq.sort_by('created_at', 'asc');
          break;
        case 'name_asc':
          searchReq = searchReq.sort_by('public_id', 'asc');
          break;
        case 'name_desc':
          searchReq = searchReq.sort_by('public_id', 'desc');
          break;
        case 'bytes_desc':
          searchReq = searchReq.sort_by('bytes', 'desc');
          break;
        case 'bytes_asc':
          searchReq = searchReq.sort_by('bytes', 'asc');
          break;
        case 'created_at_desc':
        default:
          searchReq = searchReq.sort_by('created_at', 'desc');
          break;
      }

      const searchRes = await searchReq.execute();
      return {
        assets: searchRes.resources || [],
        total_count: searchRes.total_count || 0,
        next_cursor: searchRes.next_cursor || null
      };
    } catch (err) {
      logger.warn(`[CloudinaryStorageProvider] Search API failed (${err.message}), falling back to resources API.`);
      return this.getMediaAssetsFallback({ folder, q, format, max_results, page });
    }
  }

  /**
   * Fallback khi Search API không khả dụng
   */
  async getMediaAssetsFallback({ folder = '', q = '', format = 'all', max_results = 40 } = {}) {
    const options = {
      type: 'upload',
      resource_type: 'image',
      max_results: Math.min(parseInt(max_results, 10) || 40, 100)
    };

    if (folder && folder !== 'root') {
      options.prefix = folder.replace(/^\/+|\/+$/g, '') + '/';
    }

    const res = await cloudinary.api.resources(options);
    let list = res.resources || [];

    if (format && format !== 'all') {
      list = list.filter((a) => (a.format || '').toLowerCase() === format.toLowerCase());
    }

    if (q && q.trim()) {
      const cleanQ = q.trim().toLowerCase();
      list = list.filter((a) => (a.public_id || '').toLowerCase().includes(cleanQ));
    }

    return {
      assets: list,
      total_count: res.total_count || list.length,
      next_cursor: res.next_cursor || null
    };
  }
}

module.exports = CloudinaryStorageProvider;
