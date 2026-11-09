'use strict';

/**
 * Basic Auth Controller (GĐ B1 / DEC-046)
 * Handles HTML administrative views and JSON API endpoints.
 */

const basicAuthService = require('../../services/basicAuthService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const { ForbiddenError } = require('../../utils/errors');

const basicAuthController = {
  /**
   * GET /admin/basic-auth
   * Render Basic Auth Control Panel view
   */
  async index(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:read');
      if (!canRead) {
        throw new ForbiddenError('Bạn không có quyền truy cập trang cấu hình Basic Auth (basicauth:read).');
      }

      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:manage');
      const config = await basicAuthService.getConfig({ sanitize: true });
      const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');

      res.render('admin/basic-auth/index', {
        title: `Basic Authentication | ${branding.PROJECT_NAME}`,
        pageTitle: 'Cấu hình Basic Authentication',
        config,
        permissions: { canManage },
        isHttps,
        user: req.user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/basic-auth
   */
  async getConfig(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem cấu hình Basic Auth.' });
      }

      const config = await basicAuthService.getConfig({ sanitize: true });
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/basic-auth
   */
  async updateConfig(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thay đổi cấu hình Basic Auth.' });
      }

      const { enabled, realm, excludePaths, ipAllowlist, expectedUpdatedAt } = req.body;
      const updated = await basicAuthService.updateConfig(
        { enabled, realm, excludePaths, ipAllowlist },
        { expectedUpdatedAt, user: req.user }
      );

      res.json({
        success: true,
        message: 'Lưu cấu hình Basic Auth thành công.',
        data: updated,
      });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/basic-auth/users
   */
  async addUser(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm tài khoản Basic Auth.' });
      }

      const { username, password, disabled } = req.body;
      const user = await basicAuthService.addUser(
        { username, password, disabled },
        { user: req.user }
      );

      res.status(201).json({
        success: true,
        message: `Đã thêm tài khoản '${user.username}' thành công.`,
        data: user,
      });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({ success: false, message: err.message });
    }
  },

  /**
   * PUT /api/basic-auth/users/:username
   */
  async updateUser(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa tài khoản Basic Auth.' });
      }

      const { username } = req.params;
      const { password, disabled } = req.body;
      const user = await basicAuthService.updateUser(
        username,
        { password, disabled },
        { user: req.user }
      );

      res.json({
        success: true,
        message: `Cập nhật tài khoản '${user.username}' thành công.`,
        data: user,
      });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /api/basic-auth/users/:username
   */
  async deleteUser(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'basicauth:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tài khoản Basic Auth.' });
      }

      const { username } = req.params;
      await basicAuthService.deleteUser(username, { user: req.user });

      res.json({
        success: true,
        message: `Đã xóa tài khoản '${username}' thành công.`,
      });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({ success: false, message: err.message });
    }
  },
};

module.exports = basicAuthController;

