'use strict';

/**
 * Recycle Bin Controller (GĐ 9 / DEC-044)
 */

const recycleBinService = require('../../services/recycleBinService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const { ForbiddenError } = require('../../utils/errors');

const isApiOrJson = (req) => {
  return Boolean(
    req.xhr ||
    req.originalUrl?.startsWith('/api/') ||
    req.baseUrl?.startsWith('/api') ||
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json')
  );
};

const recycleBinController = {
  /**
   * GET /admin/recycle-bin
   * Render Recycle Bin viewer page
   */
  async index(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'recyclebin:read'))) {
        throw new ForbiddenError('Bạn không có quyền truy cập Thùng rác (recyclebin:read).');
      }

      const { q, deletedBy, from, to, page = 1 } = req.query;
      const listData = await recycleBinService.list({
        q,
        deletedBy,
        from,
        to,
        page,
        limit: 20,
      });

      const canRestore = await itemService.canPerform(req.user, null, 'recyclebin:restore');
      const canPurge = await itemService.canPerform(req.user, null, 'recyclebin:purge');

      res.render('admin/recycle-bin/index', {
        title: `Thùng rác | ${branding.PROJECT_NAME}`,
        pageTitle: 'Thùng rác (Recycle Bin)',
        items: listData.items,
        pagination: {
          page: listData.page,
          totalPages: listData.totalPages,
          total: listData.total,
        },
        filters: { q: q || '', from: from || '', to: to || '' },
        permissions: { canRestore, canPurge },
        user: req.user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/recycle-bin/:id
   * Get single item details & references
   */
  async getItemDetails(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'recyclebin:read'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông tin Thùng rác.' });
      }

      const { id } = req.params;
      const data = await recycleBinService.getById(id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/recycle-bin/restore/:id
   */
  async restoreItem(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'recyclebin:restore'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khôi phục dữ liệu từ Thùng rác.' });
      }

      const { id } = req.params;
      const { targetParentId, renameIfDuplicate = true } = req.body;

      const result = await recycleBinService.restore(id, {
        targetParentId,
        renameIfDuplicate: Boolean(renameIfDuplicate),
        user: req.user,
      });

      if (isApiOrJson(req)) {
        return res.json({
          success: true,
          message: `Khôi phục thành công '${result.restoredItem?.displayName || result.restoredItem?.name}' (${result.restoredCount} items).`,
          data: result,
        });
      }

      res.redirect('/admin/recycle-bin');
    } catch (err) {
      if (isApiOrJson(req)) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * POST /api/recycle-bin/purge/:id
   */
  async purgeItem(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'recyclebin:purge'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá vĩnh viễn (purge) khỏi hệ thống.' });
      }

      const { id } = req.params;
      const result = await recycleBinService.purge(id, { user: req.user });

      if (isApiOrJson(req)) {
        return res.json({
          success: true,
          message: `Đã xoá vĩnh viễn ${result.purgedCount} items khỏi cơ sở dữ liệu và Web Store.`,
          data: result,
        });
      }

      res.redirect('/admin/recycle-bin');
    } catch (err) {
      if (isApiOrJson(req)) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * POST /api/recycle-bin/purge-all
   */
  async purgeAll(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'recyclebin:purge'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá sạch Thùng rác.' });
      }

      const result = await recycleBinService.purgeAll({}, { user: req.user });

      if (isApiOrJson(req)) {
        return res.json({
          success: true,
          message: `Đã dọn dẹp sạch toàn bộ Thùng rác (${result.totalPurged} items).`,
          data: result,
        });
      }

      res.redirect('/admin/recycle-bin');
    } catch (err) {
      if (isApiOrJson(req)) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  },
};

module.exports = recycleBinController;
