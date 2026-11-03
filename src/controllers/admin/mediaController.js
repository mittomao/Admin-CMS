'use strict';

const mediaService = require('../../services/mediaService');
const { getStorageProvider } = require('../../services/storage');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

class MediaController {
  /**
   * Render giao diện ứng dụng Media Library độc lập
   */
  async renderMediaLibrary(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền truy cập Media Library.', 403);
      }

      const root = await mediaService.getOrCreateRootFolder(req.user?._id);

      res.render('admin/media/library', {
        title: 'Media Library',
        layout: 'layouts/shell',
        user: req.user,
        rootFolder: root,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        currentApp: 'media-library'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Render partial modal Media Picker
   */
  async renderMediaPickerModal(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền truy cập Media Picker.', 403);
      }

      const root = await mediaService.getOrCreateRootFolder(req.user?._id);

      res.render('admin/media/modals/media-picker-modal', {
        layout: false,
        rootFolder: root,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phục vụ stream tệp tin ra ngoài (File Serving Endpoint)
   * GET /media/file/:id?thumb=1&w=300&h=300
   */
  async serveFile(req, res, next) {
    try {
      const { id } = req.params;
      const isThumb = req.query.thumb === '1' || req.query.thumb === 'true';

      const media = await mediaService.getMediaById(id);
      if (media.isFolder || !media.fileDetails) {
        throw new AppError('Tài nguyên không phải là tệp tin hợp lệ.', 404);
      }

      const storageProvider = getStorageProvider();
      let targetPath = media.fileDetails.storagePath;
      let contentType = media.fileDetails.mimeType;

      if (isThumb && media.fileDetails.thumbnailPath) {
        targetPath = media.fileDetails.thumbnailPath;
        contentType = 'image/webp';
      }

      // Kiểm tra ETag để hỗ trợ caching 304 Not Modified
      const etag = `"${media.fileDetails.checksum || id}"`;
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('ETag', etag);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(media.fileDetails.originalName || media.name)}"`
      );

      const stream = storageProvider.getReadStream(targetPath, isThumb);
      stream.on('error', (err) => {
        logger.error(`Error streaming file ${targetPath}: ${err.message}`);
        if (!res.headersSent) {
          res.status(404).send('File not found on storage.');
        }
      });

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Lấy danh sách cây thư mục con
   * GET /api/media/folders?parent=...
   */
  async apiGetFolders(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền xem thư mục media.', 403);
      }

      const parentId = req.query.parent || null;
      const folders = await mediaService.getFolderTree(parentId);

      res.json({
        success: true,
        folders
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Tạo thư mục mới
   * POST /api/media/folders
   */
  async apiCreateFolder(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:write')) {
        throw new AppError('Bạn không có quyền tạo thư mục.', 403);
      }

      const { name, displayName, parentId } = req.body;
      const folder = await mediaService.createFolder({
        name,
        displayName,
        parentId,
        userId: req.user?._id
      });

      res.status(201).json({
        success: true,
        folder
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Lấy danh sách tài nguyên trong thư mục
   * GET /api/media/assets?folderId=...&page=...&limit=...
   */
  async apiGetAssets(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền xem tài nguyên media.', 403);
      }

      const { folderId, page, limit, format, sort, q } = req.query;
      const result = await mediaService.listAssets({
        folderId,
        page,
        limit,
        format,
        sort,
        q
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Lấy thông tin chi tiết một Media Item
   * GET /api/media/:id
   */
  async apiGetMediaDetails(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền xem tài nguyên media.', 403);
      }

      const media = await mediaService.getMediaById(req.params.id);
      res.json({
        success: true,
        media
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Upload một hoặc nhiều tệp tin
   * POST /api/media/upload
   */
  async apiUpload(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:upload')) {
        throw new AppError('Bạn không có quyền tải lên tệp tin.', 403);
      }

      const files = [];
      if (req.file) {
        files.push(req.file);
      } else if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else {
          for (const key of Object.keys(req.files)) {
            files.push(...req.files[key]);
          }
        }
      }

      if (files.length === 0) {
        throw new AppError('Vui lòng chọn ít nhất một tệp tin để tải lên.', 400);
      }

      const folderId = req.body.folderId || req.query.folderId || null;
      const uploadedDocs = [];

      for (const file of files) {
        const doc = await mediaService.uploadFile({
          file,
          folderId,
          userId: req.user?._id
        });
        uploadedDocs.push(doc);
      }

      const firstDoc = uploadedDocs[0];
      const location = `/media/file/${firstDoc._id}`;

      // Response tương thích đồng thời cả TinyMCE location và MediaBrowser
      res.status(201).json({
        success: true,
        location,
        url: location,
        files: uploadedDocs.map((doc) => ({
          _id: doc._id,
          name: doc.name,
          displayName: doc.displayName,
          url: `/media/file/${doc._id}`,
          thumbnailUrl: doc.fileDetails?.thumbnailPath
            ? `/media/file/${doc._id}?thumb=1`
            : `/media/file/${doc._id}`,
          fileDetails: doc.fileDetails
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Thay thế tệp tin
   * POST /api/media/:id/replace
   */
  async apiReplace(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:write')) {
        throw new AppError('Bạn không có quyền thay thế tệp tin.', 403);
      }

      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        throw new AppError('Vui lòng chọn tệp tin mới để thay thế.', 400);
      }

      const updated = await mediaService.replaceFile(req.params.id, {
        file,
        userId: req.user?._id
      });

      res.json({
        success: true,
        media: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Cập nhật siêu dữ liệu (Alt text theo ngôn ngữ, Title, Description, DisplayName)
   * PUT /api/media/:id
   */
  async apiUpdateMetadata(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:write')) {
        throw new AppError('Bạn không có quyền chỉnh sửa siêu dữ liệu.', 403);
      }

      const { altText, title, description, displayName } = req.body;
      const updated = await mediaService.updateMetadata(req.params.id, {
        altText,
        title,
        description,
        displayName,
        userId: req.user?._id
      });

      res.json({
        success: true,
        media: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Di chuyển Media hoặc Thư mục
   * POST /api/media/:id/move
   */
  async apiMove(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:write')) {
        throw new AppError('Bạn không có quyền di chuyển tài nguyên.', 403);
      }

      const { targetFolderId } = req.body;
      const updated = await mediaService.moveMedia(
        req.params.id,
        targetFolderId,
        req.user?._id
      );

      res.json({
        success: true,
        media: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Đổi tên Media hoặc Thư mục
   * POST /api/media/:id/rename
   */
  async apiRename(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:write')) {
        throw new AppError('Bạn không có quyền đổi tên tài nguyên.', 403);
      }

      const { newName } = req.body;
      const updated = await mediaService.renameMedia(
        req.params.id,
        newName,
        req.user?._id
      );

      res.json({
        success: true,
        media: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Xóa mềm một Media
   * DELETE /api/media/:id
   */
  async apiDelete(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:delete')) {
        throw new AppError('Bạn không có quyền xóa tài nguyên.', 403);
      }

      const result = await mediaService.deleteMedia(req.params.id, req.user?._id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Xóa hàng loạt nhiều Media
   * POST /api/media/bulk-delete
   */
  async apiBulkDelete(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:delete')) {
        throw new AppError('Bạn không có quyền xóa tài nguyên hàng loạt.', 403);
      }

      const { mediaIds } = req.body;
      const result = await mediaService.bulkDelete(mediaIds, req.user?._id);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * API: Tra cứu nơi sử dụng (Usage)
   * GET /api/media/:id/usage
   */
  async apiGetUsage(req, res, next) {
    try {
      if (!mediaService.canPerform(req.user, null, 'media:read')) {
        throw new AppError('Bạn không có quyền tra cứu nơi sử dụng tài nguyên.', 403);
      }

      const items = await mediaService.getUsage(req.params.id);
      res.json({
        success: true,
        usage: items
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MediaController();

