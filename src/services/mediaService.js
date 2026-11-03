'use strict';

const mongoose = require('mongoose');
const Media = require('../models/Media');
const Item = require('../models/Item');
const { getStorageProvider } = require('./storage');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const ROOT_MEDIA_PATH = '/sitecore/media library';

class MediaService {
  /**
   * Khởi tạo hoặc lấy thư mục gốc /sitecore/media library
   */
  async getOrCreateRootFolder(userId = null) {
    let root = await Media.findOne({ path: ROOT_MEDIA_PATH, isDeleted: false });
    if (!root) {
      root = await Media.create({
        name: 'media library',
        displayName: 'Media Library',
        isFolder: true,
        parentId: null,
        ancestors: [],
        path: ROOT_MEDIA_PATH,
        createdBy: userId,
        updatedBy: userId
      });
      logger.info('Created root media library folder.');
    }
    return root;
  }

  /**
   * Lấy thông tin Media theo ID
   */
  async getMediaById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Mã tài nguyên Media không hợp lệ.', 400);
    }
    const media = await Media.findOne({ _id: id, isDeleted: false });
    if (!media) {
      throw new AppError('Không tìm thấy tài nguyên Media.', 404);
    }
    return media;
  }

  /**
   * Tạo thư mục mới trong cây Media Library
   */
  async createFolder({ name, displayName, parentId = null, userId = null }) {
    if (!name || typeof name !== 'string') {
      throw new AppError('Tên thư mục là bắt buộc.', 400);
    }

    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');

    if (!cleanName) {
      throw new AppError('Tên thư mục không hợp lệ.', 400);
    }

    let parent;
    if (!parentId) {
      parent = await this.getOrCreateRootFolder(userId);
    } else {
      parent = await this.getMediaById(parentId);
      if (!parent.isFolder) {
        throw new AppError('Node cha phải là một thư mục.', 400);
      }
    }

    const targetPath = `${parent.path}/${cleanName}`;
    const existing = await Media.findOne({ path: targetPath, isDeleted: false });
    if (existing) {
      throw new AppError(`Thư mục "${cleanName}" đã tồn tại trong thư mục hiện tại.`, 409);
    }

    const ancestors = [...parent.ancestors, parent._id];

    const folder = await Media.create({
      name: cleanName,
      displayName: displayName ? displayName.trim() : cleanName,
      isFolder: true,
      parentId: parent._id,
      ancestors,
      path: targetPath,
      createdBy: userId,
      updatedBy: userId
    });

    return folder;
  }

  /**
   * Lấy cây thư mục (dành cho Sidebar và Treeview)
   */
  async getFolderTree(parentId = null) {
    let resolvedParentId = parentId;
    if (!resolvedParentId) {
      const root = await this.getOrCreateRootFolder();
      resolvedParentId = root._id;
    }

    const subFolders = await Media.find({
      parentId: resolvedParentId,
      isFolder: true,
      isDeleted: false
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return subFolders;
  }

  /**
   * Lấy đường dẫn bánh mì (Breadcrumbs)
   */
  async getBreadcrumbs(folderId) {
    const current = await this.getMediaById(folderId);
    const crumbs = [];

    if (current.ancestors && current.ancestors.length > 0) {
      const ancestorDocs = await Media.find({
        _id: { $in: current.ancestors },
        isDeleted: false
      })
        .select('_id name displayName path')
        .lean();

      // Sắp xếp theo đúng thứ tự mảng ancestors
      const map = new Map(ancestorDocs.map((doc) => [doc._id.toString(), doc]));
      for (const ancId of current.ancestors) {
        const doc = map.get(ancId.toString());
        if (doc) crumbs.push(doc);
      }
    }

    crumbs.push(current);
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
    const query = { isFolder: false, isDeleted: false };

    if (folderId) {
      query.parentId = folderId;
    }

    // Bộ lọc từ khóa tìm kiếm
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { displayName: regex },
        { title: regex },
        { 'fileDetails.originalName': regex }
      ];
    }

    // Bộ lọc định dạng
    if (format && format !== 'all') {
      const fmt = format.toLowerCase().trim();
      if (fmt === 'jpg' || fmt === 'jpeg') {
        query['fileDetails.extension'] = { $in: ['jpg', 'jpeg'] };
      } else {
        query['fileDetails.extension'] = fmt;
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
        sortOptions = { 'fileDetails.fileSize': -1 };
        break;
      case 'bytes_asc':
        sortOptions = { 'fileDetails.fileSize': 1 };
        break;
      case 'created_at_desc':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, assets] = await Promise.all([
      Media.countDocuments(query),
      Media.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'username fullName')
        .lean()
    ]);

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
   * Upload một tệp tin mới vào thư mục Media
   */
  async uploadFile({ file, folderId = null, userId = null }) {
    if (!file || !file.buffer) {
      throw new AppError('Dữ liệu tệp tin không hợp lệ.', 400);
    }

    let parent;
    if (!folderId) {
      parent = await this.getOrCreateRootFolder(userId);
    } else {
      parent = await this.getMediaById(folderId);
      if (!parent.isFolder) {
        throw new AppError('Thư mục lưu trữ đích không hợp lệ.', 400);
      }
    }

    const storageProvider = getStorageProvider();

    // Lưu file nhị phân qua StorageProvider
    const saveResult = await storageProvider.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.detectedMime || file.mimetype
    });

    // Sinh thumbnail nếu là ảnh
    const thumbnailPath = await storageProvider.generateThumbnail(saveResult.storagePath);

    // Đọc kích thước ảnh
    const dimensions = await storageProvider.getImageMetadata(saveResult.storagePath);

    // Chuẩn hóa tên item trong cây
    const ext = file.detectedExt || file.originalname.split('.').pop().toLowerCase();
    const rawBaseName = file.originalname.replace(/\.[^/.]+$/, '').trim();
    const cleanName = rawBaseName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 80);

    const uniqueItemName = `${cleanName}-${Date.now().toString(36)}.${ext}`;
    const targetPath = `${parent.path}/${uniqueItemName}`;
    const ancestors = [...parent.ancestors, parent._id];

    const mediaDoc = await Media.create({
      name: uniqueItemName,
      displayName: file.originalname,
      isFolder: false,
      parentId: parent._id,
      ancestors,
      path: targetPath,
      fileDetails: {
        originalName: file.originalname,
        storagePath: saveResult.storagePath,
        thumbnailPath,
        mimeType: file.detectedMime || file.mimetype,
        fileSize: saveResult.fileSize,
        dimensions: {
          width: dimensions.width,
          height: dimensions.height
        },
        extension: ext,
        checksum: saveResult.checksum
      },
      createdBy: userId,
      updatedBy: userId
    });

    return mediaDoc;
  }

  /**
   * Tìm các tệp tin có cùng checksum trong hệ thống
   */
  async findDuplicates(checksum, excludeId = null) {
    if (!checksum) return [];
    const query = {
      'fileDetails.checksum': checksum,
      isDeleted: false
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return Media.find(query).select('_id name displayName path fileDetails createdAt').lean();
  }

  /**
   * Thay thế tệp tin vật lý của một Media Item có sẵn (giữ nguyên _id và path)
   */
  async replaceFile(mediaId, { file, userId = null }) {
    const media = await this.getMediaById(mediaId);
    if (media.isFolder) {
      throw new AppError('Không thể thay thế tệp tin cho một thư mục.', 400);
    }

    const storageProvider = getStorageProvider();

    // Xóa file cũ trên đĩa
    if (media.fileDetails) {
      await storageProvider.deleteFile(
        media.fileDetails.storagePath,
        media.fileDetails.thumbnailPath
      );
    }

    // Lưu file mới
    const saveResult = await storageProvider.saveFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.detectedMime || file.mimetype
    });

    const thumbnailPath = await storageProvider.generateThumbnail(saveResult.storagePath);
    const dimensions = await storageProvider.getImageMetadata(saveResult.storagePath);
    const ext = file.detectedExt || file.originalname.split('.').pop().toLowerCase();

    media.fileDetails = {
      originalName: file.originalname,
      storagePath: saveResult.storagePath,
      thumbnailPath,
      mimeType: file.detectedMime || file.mimetype,
      fileSize: saveResult.fileSize,
      dimensions: {
        width: dimensions.width,
        height: dimensions.height
      },
      extension: ext,
      checksum: saveResult.checksum
    };
    media.updatedBy = userId;
    media.updatedAt = new Date();

    await media.save();
    return media;
  }

  /**
   * Cập nhật thông tin chi tiết (Alt text theo ngôn ngữ, Title, Description, DisplayName)
   */
  async updateMetadata(mediaId, { altText = {}, title, description, displayName, userId = null }) {
    const media = await this.getMediaById(mediaId);

    if (displayName && displayName.trim()) {
      media.displayName = displayName.trim();
    }
    if (title !== undefined) {
      media.title = title.trim();
    }
    if (description !== undefined) {
      media.description = description.trim();
    }

    // Cập nhật Alt text đa ngôn ngữ
    if (altText && typeof altText === 'object') {
      for (const [lang, val] of Object.entries(altText)) {
        if (typeof val === 'string') {
          media.altText.set(lang, val.trim());
        }
      }
    }

    media.updatedBy = userId;
    media.updatedAt = new Date();

    await media.save();
    return media;
  }

  /**
   * Di chuyển Item hoặc Thư mục Media sang thư mục khác (kèm Cycle Detection)
   */
  async moveMedia(mediaId, targetFolderId, userId = null) {
    const media = await this.getMediaById(mediaId);
    let targetFolder;

    if (!targetFolderId) {
      targetFolder = await this.getOrCreateRootFolder(userId);
    } else {
      targetFolder = await this.getMediaById(targetFolderId);
      if (!targetFolder.isFolder) {
        throw new AppError('Thư mục đích phải là một thư mục.', 400);
      }
    }

    // Chặn di chuyển thư mục vào chính nó hoặc con cháu của nó (Cycle Detection)
    if (media.isFolder) {
      if (media._id.equals(targetFolder._id)) {
        throw new AppError('Không thể di chuyển một thư mục vào chính nó.', 400);
      }
      if (targetFolder.ancestors.some((ancId) => ancId.equals(media._id))) {
        throw new AppError('Không thể di chuyển một thư mục vào thư mục con của nó.', 400);
      }
    }

    const oldPath = media.path;
    const newPath = `${targetFolder.path}/${media.name}`;

    // Kiểm tra trùng path
    const conflict = await Media.findOne({ path: newPath, isDeleted: false });
    if (conflict && !conflict._id.equals(media._id)) {
      throw new AppError(`Tên "${media.name}" đã tồn tại trong thư mục đích.`, 409);
    }

    media.parentId = targetFolder._id;
    media.ancestors = [...targetFolder.ancestors, targetFolder._id];
    media.path = newPath;
    media.updatedBy = userId;
    media.updatedAt = new Date();

    await media.save();

    // Nếu là thư mục, cập nhật đệ quy cho toàn bộ con cháu
    if (media.isFolder) {
      const descendants = await Media.find({ ancestors: media._id });
      for (const desc of descendants) {
        desc.path = desc.path.replace(oldPath, newPath);
        // Cập nhật ancestors
        const idx = desc.ancestors.findIndex((anc) => anc.equals(media._id));
        if (idx !== -1) {
          const afterMedia = desc.ancestors.slice(idx);
          desc.ancestors = [...media.ancestors, ...afterMedia];
        }
        await desc.save();
      }
    }

    return media;
  }

  /**
   * Đổi tên (Rename) thư mục hoặc tệp tin Media
   */
  async renameMedia(mediaId, newName, userId = null) {
    const media = await this.getMediaById(mediaId);

    const cleanName = newName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-');

    if (!cleanName) {
      throw new AppError('Tên mới không hợp lệ.', 400);
    }

    if (cleanName === media.name) {
      return media;
    }

    const parent = media.parentId ? await Media.findById(media.parentId) : null;
    const parentPath = parent ? parent.path : '';
    const newPath = parentPath ? `${parentPath}/${cleanName}` : `/${cleanName}`;

    const conflict = await Media.findOne({ path: newPath, isDeleted: false });
    if (conflict && !conflict._id.equals(media._id)) {
      throw new AppError(`Tên "${cleanName}" đã tồn tại trong thư mục này.`, 409);
    }

    const oldPath = media.path;
    media.name = cleanName;
    media.displayName = newName.trim();
    media.path = newPath;
    media.updatedBy = userId;
    media.updatedAt = new Date();

    await media.save();

    if (media.isFolder) {
      const descendants = await Media.find({ ancestors: media._id });
      for (const desc of descendants) {
        desc.path = desc.path.replace(oldPath, newPath);
        await desc.save();
      }
    }

    return media;
  }

  /**
   * Xóa mềm (Soft-delete) tài nguyên hoặc thư mục
   */
  async deleteMedia(mediaId, userId = null) {
    const media = await this.getMediaById(mediaId);

    if (media.path === ROOT_MEDIA_PATH) {
      throw new AppError('Không được phép xóa thư mục gốc của Media Library.', 400);
    }

    // Nếu là thư mục, kiểm tra xem có con trực tiếp không
    if (media.isFolder) {
      const childCount = await Media.countDocuments({
        parentId: media._id,
        isDeleted: false
      });
      if (childCount > 0) {
        throw new AppError(
          `Thư mục "${media.displayName}" vẫn còn chứa ${childCount} tài nguyên con. Hãy xóa hoặc di chuyển các tài nguyên con trước.`,
          400
        );
      }
    }

    media.isDeleted = true;
    media.deletedAt = new Date();
    media.deletedBy = userId;

    await media.save();
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
        result.deleted++;
      } catch (err) {
        result.errors.push({ id, error: err.message });
      }
    }

    return result;
  }

  /**
   * Kiểm tra quyền thực thi trên Media (tích hợp ACL sơ khởi trước GĐ 7)
   */
  canPerform(user, _media, action) {
    if (!user) return false;
    const userRoles = Array.isArray(user.roles)
      ? user.roles.map((r) => {
          if (typeof r === 'string') return r;
          if (r && r.name) return r.name;
          return r ? r.toString() : '';
        })
      : [];

    const isAdmin =
      userRoles.includes('Administrator') ||
      user.isAdmin === true ||
      (user.username && user.username.toLowerCase().includes('admin'));
    const isEditor = userRoles.includes('Editor');
    const isAuthor =
      userRoles.includes('Author') ||
      (user.username && user.username.toLowerCase().includes('author'));

    if (isAdmin) return true;

    if (action === 'media:delete') {
      return isEditor; // Chỉ Editor và Admin mới có quyền xóa media
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

    // 1. Tìm các Item có trường Image tham chiếu mediaId
    // Trong GĐ 2-4: trường fields hoặc versions[v].fields lưu mediaId
    const items = await Item.find({
      deleted: { $ne: true },
      $or: [
        { 'sharedFields.$*': idStr },
        { 'languages.unversionedFields.$*': idStr },
        { 'languages.versions.fields.$*': idStr },
        { fields: { $regex: idStr } }
      ]
    })
      .select('_id name displayName path templateId')
      .lean();

    return items;
  }
}

module.exports = new MediaService();
