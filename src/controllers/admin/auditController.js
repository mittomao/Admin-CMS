'use strict';

/**
 * Audit Log Controller (GĐ 9 / DEC-045)
 */

const auditService = require('../../services/auditService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const { ForbiddenError, NotFoundError } = require('../../utils/errors');

const auditController = {
  /**
   * GET /admin/audit-log
   * Render Audit Log viewer
   */
  async index(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'audit:read'))) {
        throw new ForbiddenError('Bạn không có quyền xem Nhật ký kiểm toán (audit:read).');
      }

      const { action, username, q, from, to, result, db, page = 1 } = req.query;

      const listData = await auditService.list(
        {
          action,
          username,
          q,
          from,
          to,
          result,
          db,
          page,
          limit: 25,
        },
        req.user
      );

      res.render('admin/audit/viewer', {
        title: `Nhật ký kiểm toán | ${branding.PROJECT_NAME}`,
        pageTitle: 'Nhật ký kiểm toán (Audit Log)',
        logs: listData.logs,
        pagination: {
          page: listData.page,
          totalPages: listData.totalPages,
          total: listData.total,
        },
        filters: {
          action: action || '',
          username: username || '',
          q: q || '',
          from: from || '',
          to: to || '',
          result: result || '',
          db: db || '',
        },
        user: req.user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/audit/:id
   */
  async getDetails(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'audit:read'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem Nhật ký kiểm toán.' });
      }

      const { id } = req.params;
      const log = await auditService.getById(id);
      if (!log) {
        throw new NotFoundError('Bản ghi kiểm toán không tồn tại.');
      }

      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/audit/item/:itemId
   * Item History modal in Content Editor
   */
  async getItemHistory(req, res, next) {
    try {
      const { itemId } = req.params;
      const item = await itemService.getById(itemId);

      if (!(await itemService.canPerform(req.user, item, 'item:read'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch sử của item này.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const data = await auditService.getItemHistory(itemId, { page, limit });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/audit-log/export
   * Export audit log records to CSV
   */
  async exportCsv(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'audit:read'))) {
        throw new ForbiddenError('Bạn không có quyền xuất dữ liệu kiểm toán.');
      }

      const { action, username, q, from, to, result, db } = req.query;
      const csvData = await auditService.exportCsv({
        action,
        username,
        q,
        from,
        to,
        result,
        db,
      });

      const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('\uFEFF' + csvData); // UTF-8 BOM for Excel
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditController;

