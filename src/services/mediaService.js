'use strict';

const mongoose = require('mongoose');
const Item = require('../models/Item');
const Media = require('../models/Media'); // Legacy collection for fallback / backwards-compatibility
require('../models/User'); // Đăng ký User model cho Mongoose populate
const { getStorageProvider } = require('./storage');
const { ensureMediaTemplates, MEDIA_TEMPLATES } = require('./mediaTemplateService');
const mediaPathMapper = require('../utils/mediaPathMapper');
const { sniffBuffer } = require('../utils/fileSniffer');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const branding = require('../config/branding');

const ROOT_MEDIA_PATH = branding.PATHS.MEDIA;

class MediaService {
  constructor() {
    this.legacyCleaned = false;
  }

  /**
   * Helper: Chuẩn hóa một Item thành cấu trúc Media tương thích ngược cho controller & view
   */
  formatMediaItem(item) {
    if (!item) return null;
    const shared = (item.sharedFields instanceof Map) ? Object.fromEntries(item.sharedFields) : (item.sharedFields || {});
    const isFolder = item.isFolder || item.templateId?.name === MEDIA_TEMPLATES.MEDIA_FOLDER || item.templateId?.toString() === MEDIA_TEMPLATES.MEDIA_FOLDER;
    const directUrl = shared.secureUrl || item.fields?.secureUrl || item.fileDetails?.secureUrl || (isFolder ? null : `/media/file/${item._id}`);
    const storageProvider = getStorageProvider();
    const publicId = shared.publicId || item.fileDetails?.publicId || null;
    const format = shared.format || item.fileDetails?.extension || '';
    const ext = (shared.extension || item.fileDetails?.extension || '').toLowerCase();

    const mimeMap = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf'
    };
    const mimeType = mimeMap[ext] || (shared.resourceType === 'image' || isFolder ? 'image/jpeg' : (item.fileDetails?.mimeType || 'application/octet-stream'));

    let assetVersion = shared.version || item.fileDetails?.version || null;
    if (!assetVersion && directUrl) {
      const vMatch = directUrl.match(/\/v(\d+)\//);
      if (vMatch) assetVersion = vMatch[1];
    }

    let thumbUrl = null;
    if (!isFolder && publicId && typeof storageProvider.getTransformationUrl === 'function') {
      thumbUrl = storageProvider.getTransformationUrl(publicId, 'thumb', format, assetVersion);
    }
    if (!thumbUrl) {
      thumbUrl = shared.thumbnailUrl || item.fileDetails?.thumbnailUrl || directUrl;
    }

    let viAlt = '';
    let viTitle = '';
    let viDesc = '';
    const viVer = item.languages?.find((l) => l.code === 'vi')?.versions?.[0];
    if (viVer && viVer.fields) {
      if (viVer.fields instanceof Map) {
        viAlt = viVer.fields.get('altText') || '';
        viTitle = viVer.fields.get('title') || '';
        viDesc = viVer.fields.get('description') || '';
      } else {
        viAlt = viVer.fields.altText || '';
        viTitle = viVer.fields.title || '';
        viDesc = viVer.fields.description || '';
      }
    }

    let enAlt = '';
    let enTitle = '';
    let enDesc = '';
    const enVer = item.languages?.find((l) => l.code === 'en')?.versions?.[0];
    if (enVer && enVer.fields) {
      if (enVer.fields instanceof Map) {
        enAlt = enVer.fields.get('altText') || '';
        enTitle = enVer.fields.get('title') || '';
        enDesc = enVer.fields.get('description') || '';
      } else {
        enAlt = enVer.fields.altText || '';
        enTitle = enVer.fields.title || '';
        enDesc = enVer.fields.description || '';
      }
    }

    const altMap = new Map();
    altMap.set('vi', viAlt || item.altText?.vi || '');
    altMap.set('en', enAlt || item.altText?.en || '');
    altMap.vi = altMap.get('vi');
    altMap.en = altMap.get('en');

    const title = viTitle || enTitle || item.title || item.displayName || item.name;
    const description = viDesc || enDesc || item.description || '';

    return {
      _id: item._id,
      name: item.name,
      displayName: item.displayName || item.name,
      title,
      description,
      path: item.path,
      isFolder: Boolean(isFolder),
      parentId: item.parentId,
      ancestors: item.ancestors || [],
      templateId: item.templateId,
      secure_url: directUrl,
      url: directUrl,
      thumbnailUrl: thumbUrl,
      altText: altMap,
      fileDetails: {
        originalName: item.displayName || item.name,
        storagePath: directUrl,
        thumbnailPath: thumbUrl,
        thumbnailUrl: thumbUrl,
        mimeType,
        fileSize: shared.fileSize || item.fileDetails?.fileSize || 0,
        dimensions: {
          width: shared.width || item.fileDetails?.dimensions?.width || null,
          height: shared.height || item.fileDetails?.dimensions?.height || null
        },
        extension: ext,
        format: format || ext,
        checksum: shared.checksum || item.fileDetails?.checksum || '',
        provider: 'cloudinary',
        publicId: publicId,
        secureUrl: directUrl
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy
    };
  }

  /**
   * Khởi tạo hoặc lấy thư mục gốc Media Library dưới dạng Item
   */
  async getOrCreateRootFolder(userId = null) {
    const templates = await ensureMediaTemplates();
    const folderTpl = templates[MEDIA_TEMPLATES.MEDIA_FOLDER];

    let root = await Item.findOne({
      path: { $in: [branding.PATHS.MEDIA, '/root/media library'] },
      deleted: false,
    });
    if (!root) {
      // Đảm bảo node cha /root hoặc /treecraft tồn tại nếu có thể
      let rootNode = await Item.findOne({
        path: { $in: [branding.PATHS.ROOT, '/root'] },
        deleted: false,
      });
      const parentId = rootNode ? rootNode._id : null;
      const ancestors = rootNode ? [rootNode._id] : [];

      root = await Item.create({
        name: 'media library',
        displayName: 'Media Library',
        templateId: folderTpl._id,
        parentId,
        ancestors,
        path: branding.PATHS.MEDIA,
        sortOrder: 300,
        fields: {},
        sharedFields: {},
        createdBy: userId,
        updatedBy: userId
      });
      logger.info(`Created root media library item node: ${branding.PATHS.MEDIA}`);
    }

    const formatted = this.formatMediaItem(root);
    formatted.isFolder = true;
    return formatted;
  }

  /**
   * Dọn dẹp các bản ghi upload cục bộ cũ hoặc hỏng để tránh broken image
   */
  async cleanupLegacyLocalMedia() {
    if (this.legacyCleaned) return;
    try {
      // Đánh dấu deleted trên collection legacy media các bản ghi không có Cloudinary URL
      await Media.updateMany(
        {
          isFolder: false,
          isDeleted: false,
          $or: [
            { 'fileDetails.provider': 'local' },
            { 'fileDetails.provider': { $exists: false } },
            { 'fileDetails.secureUrl': { $exists: false } },
            { 'fileDetails.secureUrl': null },
            { 'fileDetails.secureUrl': { $not: /^https?:\/\// } }
          ]
        },
        { $set: { isDeleted: true } }
      );
      this.legacyCleaned = true;
    } catch (e) {
      logger.warn(`Could not cleanup legacy local media: ${e.message}`);
    }
  }

  /**
   * Lấy thông tin Media theo ID (hỗ trợ cả ObjectId MongoDB và Cloudinary publicId)
   */
  async getMediaById(id) {
    if (!id) throw new AppError('Mã tài nguyên Media không hợp lệ.', 400);

    const templates = await ensureMediaTemplates();
    const folderTplId = templates[MEDIA_TEMPLATES.MEDIA_FOLDER]._id.toString();

    // 1. Tìm trong Item collection trước (Nguồn sự thật duy nhất cho GĐ 5.1)
    if (mongoose.Types.ObjectId.isValid(id)) {
      const item = await Item.findOne({ _id: id, deleted: false }).lean();
      if (item) {
        const formatted = this.formatMediaItem(item);
        if (item.templateId && item.templateId.toString() === folderTplId) {
          formatted.isFolder = true;
        }
        return formatted;
      }
    }

    // 2. Tra cứu Item theo publicId
    const itemByPublicId = await Item.findOne({ 'sharedFields.publicId': id, deleted: false }).lean();
    if (itemByPublicId) {
      return this.formatMediaItem(itemByPublicId);
    }

    // 3. Fallback tìm trong legacy Media collection
    if (mongoose.Types.ObjectId.isValid(id)) {
      const legacyMedia = await Media.findOne({ _id: id, isDeleted: false }).lean();
      if (legacyMedia) {
        return this.formatMediaItem(legacyMedia);
      }
    }

    // 4. Tra cứu trực tiếp từ Cloudinary API
    try {
      const storageProvider = getStorageProvider();
      const meta = await storageProvider.getImageMetadata(id);
      if (meta && (meta.format || meta.width)) {
        const ext = meta.format || 'jpg';
        const secureUrl = `https://res.cloudinary.com/${storageProvider.cloudName}/image/upload/${id}.${ext}`;
        return {
          _id: id,
          name: id.split('/').pop(),
          displayName: id.split('/').pop(),
          isFolder: false,
          path: id,
          fileDetails: {
            publicId: id,
            storagePath: secureUrl,
            secureUrl,
            thumbnailUrl: await storageProvider.generateThumbnail(id),
            mimeType: `image/${ext}`,
            extension: ext,
            dimensions: { width: meta.width, height: meta.height },
            fileSize: 0
          }
        };
      }
    } catch {
      // Ignore fallback error
    }

    throw new AppError('Không tìm thấy tài nguyên media.', 404);
  }

  /**
   * Tạo thư mục Media mới (Item với template Media Folder)
   */
  async createFolder({ name, displayName, parentId = null, userId = null }) {
    if (!name || typeof name !== 'string') {
      throw new AppError('Tên thư mục không được để trống.', 400);
    }

    const cleanName = mediaPathMapper.sanitizeItemName(name);
    const templates = await ensureMediaTemplates();
    const folderTpl = templates[MEDIA_TEMPLATES.MEDIA_FOLDER];

    let parent;
    if (!parentId || parentId === 'root') {
      parent = await this.getOrCreateRootFolder(userId);
    } else {
      parent = await this.getMediaById(parentId);
      if (!parent.isFolder) {
        throw new AppError('Thư mục cha không hợp lệ.', 400);
      }
    }

    const targetPath = `${parent.path}/${cleanName}`;

    // Kiểm tra trùng tên thư mục con trong cùng parent
    const existing = await Item.findOne({ path: targetPath, deleted: false });
    if (existing) {
      throw new AppError(`Thư mục "${cleanName}" đã tồn tại trong thư mục này.`, 409);
    }

    // Tạo thư mục trên Cloudinary tương ứng
    const storageProvider = getStorageProvider();
    if (typeof storageProvider.createFolder === 'function') {
      try {
        const { assetFolder } = mediaPathMapper.itemPathToCloudinary({ itemPath: targetPath });
        await storageProvider.createFolder(assetFolder);
      } catch (err) {
        logger.warn(`Could not create folder on Cloudinary: ${err.message}`);
      }
    }

    const ancestors = [...(parent.ancestors || []), parent._id];
    const folderItem = await Item.create({
      name: cleanName,
      displayName: displayName ? displayName.trim() : name.trim(),
      templateId: folderTpl._id,
      parentId: parent._id,
      ancestors,
      path: targetPath,
      fields: {},
      sharedFields: {},
      createdBy: userId,
      updatedBy: userId
    });

    const formatted = this.formatMediaItem(folderItem);
    formatted.isFolder = true;
    return formatted;
  }

  /**
   * Lấy cây thư mục (hỗ trợ phân cấp cho UI Media Browser)
   */
  async getFolderTree(parentId = null, recursive = true) {
    const root = await this.getOrCreateRootFolder();
    const templates = await ensureMediaTemplates();
    const folderTplId = templates[MEDIA_TEMPLATES.MEDIA_FOLDER]._id;

    const query = {
      templateId: folderTplId,
      deleted: false
    };

    if (parentId && parentId !== 'root' && parentId !== root._id.toString()) {
      if (recursive) {
        query.ancestors = parentId;
      } else {
        query.parentId = parentId;
      }
    } else {
      query.$or = [
        { parentId: root._id },
        { ancestors: root._id }
      ];
    }

    const folders = await Item.find(query)
      .sort({ name: 1 })
      .select('_id name displayName path parentId ancestors')
      .lean();

    const formattedChildren = folders.map((f) => {
      const formatted = this.formatMediaItem(f);
      formatted.isFolder = true;
      return formatted;
    });

    if (!parentId || parentId === 'root' || parentId === root._id.toString()) {
      return [root, ...formattedChildren];
    }

    return formattedChildren;
  }

  /**
   * Lấy Breadcrumbs cho thư mục
   */
  async getBreadcrumbs(folderId) {
    if (!folderId || folderId === 'root') {
      const root = await this.getOrCreateRootFolder();
      return [{ _id: root._id, name: root.displayName, path: root.path }];
    }

    const current = await this.getMediaById(folderId);
    const crumbs = [];

    if (current.ancestors && current.ancestors.length > 0) {
      const ancestorsDocs = await Item.find({
        _id: { $in: current.ancestors },
        deleted: false
      })
        .select('_id displayName name path')
        .lean();

      for (const ancId of current.ancestors) {
        const found = ancestorsDocs.find((a) => a._id.toString() === ancId.toString());
        if (found) {
          crumbs.push({ _id: found._id, name: found.displayName || found.name, path: found.path });
        }
      }
    }

    crumbs.push({ _id: current._id, name: current.displayName || current.name, path: current.path });
    return crumbs;
  }

  /**
   * Lấy danh sách tài nguyên file ảnh/tệp tin trong thư mục
   */
  async listAssets({
    folderId = null,
    page = 1,
    limit = 40,
    format = 'all',
    sort = 'created_at_desc',
    q = ''
  }) {
    await this.cleanupLegacyLocalMedia();
    const templates = await ensureMediaTemplates();
    const imageTplId = templates[MEDIA_TEMPLATES.IMAGE]._id;
    const fileTplId = templates[MEDIA_TEMPLATES.FILE]._id;

    let isRoot = false;
    let targetFolder = null;
    if (folderId && folderId !== 'root') {
      targetFolder = await this.getMediaById(folderId);
    } else {
      targetFolder = await this.getOrCreateRootFolder();
      isRoot = true;
    }

    const query = {
      templateId: { $in: [imageTplId, fileTplId] },
      deleted: false
    };

    if (isRoot) {
      // Khi ở root: Hiển thị tất cả asset trong Media Library (bao gồm thư mục con)
      query.$or = [
        { parentId: targetFolder._id },
        { ancestors: targetFolder._id },
        { path: new RegExp(`^${targetFolder.path}/`, 'i') }
      ];
    } else {
      // Khi chọn một thư mục con cụ thể: Lọc chính xác các asset trong thư mục đó
      query.parentId = targetFolder._id;
    }

    // Bộ lọc từ khóa tìm kiếm
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { displayName: regex },
        { 'sharedFields.publicId': regex }
      ];
    }

    // Bộ lọc định dạng
    if (format && format !== 'all') {
      const fmt = format.toLowerCase().trim();
      if (fmt === 'jpg' || fmt === 'jpeg') {
        query['sharedFields.extension'] = { $in: ['jpg', 'jpeg'] };
      } else {
        query['sharedFields.extension'] = fmt;
      }
    }

    // Sắp xếp
    let sortOptions = { createdAt: -1 };
    switch (sort) {
      case 'created_at_asc':
        sortOptions = { createdAt: 1 };
        break;
      case 'name_asc':
        sortOptions = { displayName: 1 };
        break;
      case 'name_desc':
        sortOptions = { displayName: -1 };
        break;
      case 'bytes_desc':
        sortOptions = { 'sharedFields.fileSize': -1 };
        break;
      case 'bytes_asc':
        sortOptions = { 'sharedFields.fileSize': 1 };
        break;
      case 'created_at_desc':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, rawAssets] = await Promise.all([
      Item.countDocuments(query),
      Item.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'username fullName')
        .lean()
    ]);

    const assets = rawAssets.map((asset) => this.formatMediaItem(asset));
    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      assets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages
      }
    };
  }

  /**
   * Upload tệp tin mới lên Cloudinary và lưu dưới dạng Item
   */
  async uploadFile({ file, folderId = null, userId = null }) {
    if (!file || !file.buffer) {
      throw new AppError('Dữ liệu tệp tin không hợp lệ.', 400);
    }

    // 1. Quét Magic Bytes kiểm tra tệp
    const sniffed = sniffBuffer(file.buffer);
    const detectedMime = sniffed ? sniffed.mime : file.mimetype;
    const ext = sniffed ? sniffed.ext : (file.originalname.split('.').pop().toLowerCase() || 'jpg');

    // 2. Xác định thư mục cha đích
    let parent;
    if (!folderId || folderId === 'root') {
      parent = await this.getOrCreateRootFolder(userId);
    } else {
      parent = await this.getMediaById(folderId);
      if (!parent.isFolder) {
        throw new AppError('Thư mục lưu trữ đích không hợp lệ.', 400);
      }
    }

    // 3. Chuẩn hóa tên Item không kèm đuôi mở rộng
    const rawBaseName = file.originalname.replace(/\.[^/.]+$/, '').trim();
    let cleanName = mediaPathMapper.sanitizeItemName(rawBaseName);

    // Kiểm tra trùng tên trong thư mục: nếu trùng, thêm hậu tố ngẫu nhiên để an toàn
    const duplicateCheck = await Item.findOne({
      parentId: parent._id,
      name: cleanName,
      deleted: false
    });
    if (duplicateCheck) {
      cleanName = `${cleanName}-${Date.now().toString(36)}`;
    }

    const targetItemPath = `${parent.path}/${cleanName}`;
    const isImage = detectedMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext);

    // 4. Ánh xạ sang Cloudinary folder và publicId
    const { assetFolder, publicId } = mediaPathMapper.itemPathToCloudinary({
      itemPath: targetItemPath,
      isRaw: !isImage,
      ext
    });

    const storageProvider = getStorageProvider();

    // 5. Lưu stream lên Cloudinary
    let saveResult;
    try {
      saveResult = await storageProvider.saveFile({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: detectedMime,
        folder: assetFolder,
        publicId: cleanName
      });
    } catch (uploadErr) {
      logger.error(`[mediaService] Cloudinary upload failed: ${uploadErr.message}`);
      throw new AppError(`Tải tệp tin lên Cloudinary thất bại: ${uploadErr.message}`, 502);
    }

    // 6. Tạo Item trong MongoDB
    const templates = await ensureMediaTemplates();
    const templateId = isImage ? templates[MEDIA_TEMPLATES.IMAGE]._id : templates[MEDIA_TEMPLATES.FILE]._id;
    const ancestors = [...(parent.ancestors || []), parent._id];

    let itemDoc;
    try {
      itemDoc = await Item.create({
        name: cleanName,
        displayName: file.originalname,
        templateId,
        parentId: parent._id,
        ancestors,
        path: targetItemPath,
        fields: {},
        sharedFields: {
          publicId: saveResult.publicId || publicId,
          assetId: saveResult.assetId || '',
          format: saveResult.dimensions?.format || ext,
          extension: ext,
          secureUrl: saveResult.secureUrl,
          thumbnailUrl: saveResult.thumbnailUrl || null,
          version: saveResult.version || null,
          fileSize: saveResult.fileSize,
          width: saveResult.dimensions?.width || null,
          height: saveResult.dimensions?.height || null,
          checksum: saveResult.checksum,
          resourceType: isImage ? 'image' : 'raw',
          syncedAt: new Date()
        },
        languages: [
          {
            code: 'vi',
            unversionedFields: {},
            versions: [
              {
                version: 1,
                fields: {
                  altText: '',
                  title: file.originalname,
                  description: ''
                },
                createdBy: userId
              }
            ]
          }
        ],
        createdBy: userId,
        updatedBy: userId
      });
    } catch (dbErr) {
      // Rollback: nếu lưu CSDL thất bại, dọn dẹp asset vừa upload trên Cloudinary để không tạo rác
      logger.error(`[mediaService] Item creation failed, rolling back Cloudinary upload: ${dbErr.message}`);
      if (saveResult && saveResult.publicId) {
        await storageProvider.deleteFile(saveResult.storagePath, null, saveResult.publicId).catch(() => {});
      }
      throw dbErr;
    }

    return this.formatMediaItem(itemDoc);
  }

  /**
   * Tìm các tệp tin có cùng checksum
   */
  async findDuplicates(checksum, excludeId = null) {
    if (!checksum) return [];
    const candidates = await Item.find({ deleted: { $ne: true } }).lean();
    const matched = candidates.filter((item) => {
      if (excludeId && item._id.toString() === excludeId.toString()) return false;
      const chk = (item.sharedFields instanceof Map)
        ? item.sharedFields.get('checksum')
        : (item.sharedFields?.checksum || item.fileDetails?.checksum);
      return chk === checksum;
    });
    return matched.map((d) => this.formatMediaItem(d));
  }

  /**
   * Thay thế nội dung tệp tin hoặc tải tệp lên cho một Media Item chưa có file (Replace / Attach)
   */
  async replaceFile(mediaId, { file, userId = null }) {
    if (!file || !file.buffer) {
      throw new AppError('Dữ liệu tệp không hợp lệ.', 400);
    }

    const media = await this.getMediaById(mediaId);
    if (media.isFolder) {
      throw new AppError('Không thể thay thế nội dung của thư mục.', 400);
    }

    const sniffed = sniffBuffer(file.buffer);
    const detectedMime = sniffed ? sniffed.mime : file.mimetype;
    const ext = sniffed ? sniffed.ext : (file.originalname.split('.').pop().toLowerCase() || 'jpg');
    const isImage = detectedMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext);

    const storageProvider = getStorageProvider();
    const existingPublicId = media.fileDetails?.publicId;

    let replaceResult;
    let finalPublicId = existingPublicId;

    if (!finalPublicId) {
      // Item chưa có file trên Cloudinary (ví dụ tạo từ Template Image/File trong Content Editor)
      const { assetFolder, publicId: mappedPublicId } = mediaPathMapper.itemPathToCloudinary({
        itemPath: media.path,
        isRaw: !isImage,
        ext
      });
      finalPublicId = mappedPublicId;

      replaceResult = await storageProvider.saveFile({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: detectedMime,
        folder: assetFolder,
        publicId: media.name
      });
    } else {
      // Đã có publicId trên Cloudinary, thực hiện replace
      if (typeof storageProvider.replaceFile === 'function') {
        replaceResult = await storageProvider.replaceFile({
          buffer: file.buffer,
          publicId: finalPublicId,
          resourceType: isImage ? 'image' : 'raw'
        });
      } else {
        replaceResult = await storageProvider.saveFile({
          buffer: file.buffer,
          originalName: file.originalname || 'replaced.png',
          mimeType: detectedMime
        });
        replaceResult.publicId = finalPublicId;
      }
    }

    const item = await Item.findById(media._id);
    if (item) {
      if (file.originalname) {
        item.displayName = file.originalname;
      }

      item.sharedFields = item.sharedFields || new Map();
      const setField = (k, v) => {
        if (item.sharedFields instanceof Map) {
          item.sharedFields.set(k, v);
        } else {
          item.sharedFields[k] = v;
        }
      };

      setField('publicId', replaceResult.publicId || finalPublicId);
      setField('assetId', replaceResult.assetId || '');
      setField('format', replaceResult.dimensions?.format || ext);
      setField('extension', ext);
      setField('secureUrl', replaceResult.secureUrl);
      setField('thumbnailUrl', replaceResult.thumbnailUrl || null);
      if (replaceResult.version) {
        setField('version', replaceResult.version);
      }
      setField('fileSize', replaceResult.fileSize);
      if (replaceResult.dimensions?.width) setField('width', replaceResult.dimensions.width);
      if (replaceResult.dimensions?.height) setField('height', replaceResult.dimensions.height);
      setField('checksum', replaceResult.checksum);
      setField('resourceType', isImage ? 'image' : 'raw');
      setField('syncedAt', new Date());
      setField('missingOnCloudinary', false);

      // Đồng bộ vào item.fields để các trường hiển thị trong form Item Info có giá trị
      item.fields = item.fields || new Map();
      const setItemField = (k, v) => {
        if (item.fields instanceof Map) {
          item.fields.set(k, v);
        } else {
          item.fields[k] = v;
        }
      };
      setItemField('publicId', replaceResult.publicId || finalPublicId);
      setItemField('assetId', replaceResult.assetId || '');
      setItemField('format', replaceResult.dimensions?.format || ext);
      setItemField('extension', ext);
      setItemField('secureUrl', replaceResult.secureUrl);
      setItemField('thumbnailUrl', replaceResult.thumbnailUrl || null);
      if (replaceResult.version) {
        setItemField('version', replaceResult.version);
      }
      setItemField('fileSize', replaceResult.fileSize);
      if (replaceResult.dimensions?.width) setItemField('width', replaceResult.dimensions.width);
      if (replaceResult.dimensions?.height) setItemField('height', replaceResult.dimensions.height);
      setItemField('checksum', replaceResult.checksum);
      setItemField('syncedAt', new Date().toISOString());

      // Cập nhật title trong language version nếu chưa có
      if (Array.isArray(item.languages)) {
        for (const lang of item.languages) {
          if (Array.isArray(lang.versions) && lang.versions.length > 0) {
            const v = lang.versions[0];
            if (v.fields instanceof Map) {
              if (!v.fields.get('title')) v.fields.set('title', file.originalname);
            } else if (v.fields && !v.fields.title) {
              v.fields.title = file.originalname;
            }
          }
        }
      }

      item.updatedBy = userId;
      item.updatedAt = new Date();
      item.markModified('sharedFields');
      item.markModified('fields');
      item.markModified('languages');
      await item.save();
      return this.formatMediaItem(item);
    }

    return media;
  }

  /**
   * Cập nhật metadata (Alt Text, Title, Description, DisplayName)
   */
  async updateMetadata(mediaId, { altText = {}, title, description, displayName, userId = null }) {
    const item = await Item.findOne({ _id: mediaId, deleted: false });
    if (!item) throw new AppError('Không tìm thấy tài nguyên media.', 404);

    if (displayName && displayName.trim()) {
      item.displayName = displayName.trim();
    }

    item.languages = item.languages || [];

    // Cập nhật tiếng Việt
    let viLang = item.languages.find((l) => l.code === 'vi');
    if (!viLang) {
      item.languages.push({ code: 'vi', unversionedFields: {}, versions: [{ version: 1, fields: new Map(), createdBy: userId }] });
      viLang = item.languages[item.languages.length - 1];
    }
    const viVer = viLang.versions?.[0];
    if (viVer) {
      if (!viVer.fields) viVer.fields = new Map();
      if (viVer.fields instanceof Map) {
        if (altText?.vi !== undefined) viVer.fields.set('altText', altText.vi);
        if (title !== undefined) viVer.fields.set('title', title);
        if (description !== undefined) viVer.fields.set('description', description);
      } else {
        if (altText?.vi !== undefined) viVer.fields.altText = altText.vi;
        if (title !== undefined) viVer.fields.title = title;
        if (description !== undefined) viVer.fields.description = description;
      }
    }

    // Cập nhật tiếng Anh
    if (altText && typeof altText === 'object' && altText.en !== undefined) {
      let enLang = item.languages.find((l) => l.code === 'en');
      if (!enLang) {
        item.languages.push({ code: 'en', unversionedFields: {}, versions: [{ version: 1, fields: new Map(), createdBy: userId }] });
        enLang = item.languages[item.languages.length - 1];
      }
      const enVer = enLang.versions?.[0];
      if (enVer) {
        if (!enVer.fields) enVer.fields = new Map();
        if (enVer.fields instanceof Map) {
          enVer.fields.set('altText', altText.en);
          if (title !== undefined) enVer.fields.set('title', title);
          if (description !== undefined) enVer.fields.set('description', description);
        } else {
          enVer.fields.altText = altText.en;
          if (title !== undefined) enVer.fields.title = title;
          if (description !== undefined) enVer.fields.description = description;
        }
      }
    }

    item.updatedBy = userId;
    item.updatedAt = new Date();
    item.markModified('languages');
    await item.save();

    return this.formatMediaItem(item);
  }

  /**
   * Cập nhật altText theo mã ngôn ngữ cụ thể
   */
  async updateAltText(mediaId, lang, altText, userId = null) {
    return this.updateMetadata(mediaId, {
      altText: { [lang]: altText },
      userId
    });
  }

  /**
   * Di chuyển tài nguyên hoặc thư mục sang thư mục cha khác
   */
  async moveMedia(mediaId, targetFolderId, userId = null) {
    const media = await this.getMediaById(mediaId);
    const targetFolder = await this.getMediaById(targetFolderId);

    if (!targetFolder.isFolder) {
      throw new AppError('Đích đến phải là một thư mục.', 400);
    }

    // Kiểm tra cycle: không thể di chuyển thư mục vào chính nó hoặc con cháu của nó
    const targetAncestors = (targetFolder.ancestors || []).map((a) => a.toString());
    if (media._id.toString() === targetFolder._id.toString() || targetAncestors.includes(media._id.toString())) {
      throw new AppError('Không thể di chuyển một thư mục vào thư mục con của nó.', 400);
    }

    const newPath = `${targetFolder.path}/${media.name}`;
    const conflict = await Item.findOne({ path: newPath, deleted: false });
    if (conflict && !conflict._id.equals(media._id)) {
      throw new AppError(`Tài nguyên "${media.name}" đã tồn tại trong thư mục đích.`, 409);
    }

    const storageProvider = getStorageProvider();
    const oldPublicId = media.fileDetails?.publicId;

    if (!media.isFolder && oldPublicId) {
      const { publicId: newPublicId } = mediaPathMapper.itemPathToCloudinary({ itemPath: newPath });
      try {
        await storageProvider.moveAsset(oldPublicId, newPublicId);
      } catch (err) {
        logger.warn(`Could not rename asset on Cloudinary during move: ${err.message}`);
      }
    }

    const item = await Item.findById(media._id);
    if (!item) throw new AppError('Không tìm thấy tài nguyên.', 404);

    const oldPath = item.path;
    item.parentId = targetFolder._id;
    item.ancestors = [...(targetFolder.ancestors || []), targetFolder._id];
    item.path = newPath;
    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    // Nếu là thư mục, cập nhật path và ancestors cho toàn bộ cây con
    if (media.isFolder) {
      const descendants = await Item.find({ ancestors: item._id, deleted: false });
      for (const desc of descendants) {
        desc.path = desc.path.replace(oldPath, newPath);
        desc.ancestors = [...item.ancestors, item._id, ...desc.ancestors.slice(desc.ancestors.indexOf(item._id) + 1)];
        await desc.save();
      }
    }

    return this.formatMediaItem(item);
  }

  /**
   * Đổi tên tài nguyên hoặc thư mục
   */
  async renameMedia(mediaId, newName, userId = null) {
    if (!newName || typeof newName !== 'string') {
      throw new AppError('Tên mới không được để trống.', 400);
    }

    const media = await this.getMediaById(mediaId);
    if (media.path === ROOT_MEDIA_PATH) {
      throw new AppError('Không được phép đổi tên thư mục gốc của Media Library.', 400);
    }

    const cleanName = mediaPathMapper.sanitizeItemName(newName);
    const parent = media.parentId ? await this.getMediaById(media.parentId) : null;
    const parentPath = parent ? parent.path : ROOT_MEDIA_PATH;
    const newPath = `${parentPath}/${cleanName}`;

    const conflict = await Item.findOne({ path: newPath, deleted: false });
    if (conflict && !conflict._id.equals(media._id)) {
      throw new AppError(`Tên "${cleanName}" đã tồn tại trong thư mục này.`, 409);
    }

    // Đổi tên trên Cloudinary
    const storageProvider = getStorageProvider();
    const oldPublicId = media.fileDetails?.publicId;

    if (!media.isFolder && oldPublicId) {
      const { publicId: newPublicId } = mediaPathMapper.itemPathToCloudinary({ itemPath: newPath });
      try {
        await storageProvider.renameAsset(oldPublicId, newPublicId);
        if (media.sharedFields) {
          media.sharedFields.publicId = newPublicId;
        }
      } catch (err) {
        logger.warn(`Could not rename asset on Cloudinary: ${err.message}`);
      }
    }

    const item = await Item.findById(media._id);
    if (!item) throw new AppError('Không tìm thấy tài nguyên.', 404);

    const oldPath = item.path;
    item.name = cleanName;
    item.displayName = newName.trim();
    item.path = newPath;
    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    if (media.isFolder) {
      const descendants = await Item.find({ ancestors: item._id, deleted: false });
      for (const desc of descendants) {
        desc.path = desc.path.replace(oldPath, newPath);
        await desc.save();
      }
    }

    return this.formatMediaItem(item);
  }

  /**
   * Xóa tài nguyên hoặc thư mục trên CMS và dọn dẹp file vật lý trên Cloudinary
   */
  async deleteMedia(mediaId, userId = null) {
    const media = await this.getMediaById(mediaId);

    if (media.path === ROOT_MEDIA_PATH) {
      throw new AppError('Không được phép xóa thư mục gốc của Media Library.', 400);
    }

    if (media.isFolder) {
      const childCount = await Item.countDocuments({
        parentId: media._id,
        deleted: false
      });
      if (childCount > 0) {
        throw new AppError(
          `Thư mục "${media.displayName}" vẫn còn chứa ${childCount} tài nguyên con. Hãy xóa hoặc di chuyển các tài nguyên con trước.`,
          400
        );
      }
    }

    // 1. Xóa file trên Cloudinary nếu có publicId
    const publicId = media.fileDetails?.publicId || (media.sharedFields && (media.sharedFields.get ? media.sharedFields.get('publicId') : media.sharedFields.publicId));
    if (publicId) {
      try {
        const storageProvider = getStorageProvider();
        if (typeof storageProvider.deleteFile === 'function') {
          await storageProvider.deleteFile(null, null, publicId);
          logger.info(`[mediaService] Deleted asset from Cloudinary: ${publicId}`);
        }
      } catch (cldErr) {
        logger.warn(`[mediaService] Could not delete asset on Cloudinary (${publicId}): ${cldErr.message}`);
      }
    }

    // 2. Cập nhật soft-delete trên CMS Item
    const item = await Item.findById(media._id);
    if (item) {
      item.deleted = true;
      item.isDeleted = true;
      item.deletedAt = new Date();
      item.deletedBy = userId;
      await item.save();
    }

    // Đồng thời đồng bộ soft-delete trên legacy Media nếu có
    await Media.updateOne(
      { _id: media._id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } }
    ).catch(() => {});

    return { success: true, message: `Đã xóa tài nguyên "${media.displayName}".` };
  }

  /**
   * Xóa hàng loạt nhiều tài nguyên Media (Bulk Delete)
   */
  async bulkDelete(mediaIds, userId = null) {
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      throw new AppError('Danh sách mã tài nguyên cần xóa không được để trống.', 400);
    }

    const result = {
      total: mediaIds.length,
      deleted: 0,
      errors: []
    };

    for (const id of mediaIds) {
      try {
        await this.deleteMedia(id, userId);
        result.deleted += 1;
      } catch (err) {
        result.errors.push({ id, message: err.message });
      }
    }

    return result;
  }

  /**
   * Kiểm tra quyền thực thi trên Media (ACL)
   */
  canPerform(user, _media, action) {
    if (!user) return false;
    const userRoles = Array.isArray(user.roles)
      ? user.roles.map((r) => {
          if (typeof r === 'string') return r;
          return r.name || '';
        })
      : [];

    const isAdmin = userRoles.includes('Administrator');
    const isEditor = userRoles.includes('Editor');
    const isAuthor = userRoles.includes('Author');

    if (isAdmin) return true;

    if (action === 'media:delete' || action === 'media:replace' || action === 'media:sync') {
      return isEditor || isAdmin;
    }

    if (action === 'media:upload' || action === 'media:write') {
      return isAuthor || isEditor;
    }

    if (action === 'media:read') {
      return true;
    }

    return false;
  }

  /**
   * Tra cứu các Item trong Content Tree đang sử dụng Media này (Usage)
   */
  async getUsage(mediaId) {
    const idStr = mediaId.toString();

    const candidates = await Item.find({ deleted: { $ne: true } })
      .select('_id name displayName path templateId fields sharedFields languages')
      .lean();

    const matchedItems = candidates.filter((item) => {
      if (item.fields) {
        for (const val of Object.values(item.fields)) {
          if (typeof val === 'string' && val.includes(idStr)) return true;
        }
      }
      if (item.sharedFields) {
        for (const val of Object.values(item.sharedFields)) {
          if (typeof val === 'string' && val.includes(idStr)) return true;
        }
      }
      if (Array.isArray(item.languages)) {
        for (const lang of item.languages) {
          if (lang.unversionedFields) {
            for (const val of Object.values(lang.unversionedFields)) {
              if (typeof val === 'string' && val.includes(idStr)) return true;
            }
          }
          if (Array.isArray(lang.versions)) {
            for (const v of lang.versions) {
              if (v.fields) {
                for (const val of Object.values(v.fields)) {
                  if (typeof val === 'string' && val.includes(idStr)) return true;
                }
              }
            }
          }
        }
      }
      return false;
    });

    return matchedItems.map((item) => ({
      _id: item._id,
      name: item.name,
      displayName: item.displayName || item.name,
      path: item.path,
      templateId: item.templateId
    }));
  }
}

module.exports = new MediaService();
