'use strict';

/**
 * Treecraft CMS - Language Controller (GĐ L1 / DEC-048)
 * Handles administrative HTML views and JSON API endpoints for Language Management.
 */

const languageService = require('../../services/languageService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const { ForbiddenError, ValidationError } = require('../../utils/errors');

const languageController = {
  /**
   * GET /admin/languages
   * Render Language Manager administrative UI
   */
  async index(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:read');
      if (!canRead) {
        throw new ForbiddenError('Bạn không có quyền truy cập trang Quản lý Ngôn ngữ (language:read).');
      }

      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      const languages = await languageService.list({ enabledOnly: false });
      const defaultLang = await languageService.getDefault();

      // Retrieve usage counts for each language
      const languagesWithUsage = await Promise.all(
        languages.map(async (lang) => {
          const usage = await languageService.getUsage(lang.code);
          return {
            ...lang,
            usage,
          };
        })
      );

      res.render('admin/languages/index', {
        title: `Quản lý Ngôn ngữ | ${branding.PROJECT_NAME}`,
        pageTitle: 'Quản lý Ngôn ngữ (Language Manager)',
        languages: languagesWithUsage,
        defaultLanguage: defaultLang,
        permissions: { canManage },
        user: req.user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/languages
   * List languages in JSON format (supports ?enabledOnly=true|false)
   */
  async listApi(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem danh sách ngôn ngữ.' });
      }

      const enabledOnly = req.query.enabledOnly !== 'false';
      const store = req.query.db === 'web' ? 'web' : 'master';
      const languages = await languageService.list({ enabledOnly, store });

      res.json({ success: true, data: languages });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/languages/:code
   * Get single language by code
   */
  async getByCodeApi(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông tin ngôn ngữ.' });
      }

      const lang = await languageService.getByCode(req.params.code);
      if (!lang) {
        return res.status(404).json({ success: false, message: `Không tìm thấy ngôn ngữ "${req.params.code}".` });
      }

      const usage = await languageService.getUsage(lang.code);
      res.json({ success: true, data: { ...lang, usage } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/languages
   * Create a new language item
   */
  async createApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo ngôn ngữ mới (language:manage).' });
      }

      const created = await languageService.create(req.body, { userId: req.user?._id });
      res.status(201).json({
        success: true,
        message: `Tạo mới ngôn ngữ "${created.code}" thành công.`,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/languages/:code
   * Update language metadata
   */
  async updateApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa ngôn ngữ (language:manage).' });
      }

      const expectedUpdatedAt = req.body.expectedUpdatedAt || req.headers['x-expected-updated-at'];
      const updated = await languageService.update(req.params.code, req.body, {
        userId: req.user?._id,
        expectedUpdatedAt,
      });

      res.json({
        success: true,
        message: `Cập nhật ngôn ngữ "${updated.code}" thành công.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/languages/:code/enable
   * POST /api/languages/:code/disable
   */
  async toggleEnableApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền bật/tắt ngôn ngữ.' });
      }

      const enabled = req.path.endsWith('/enable');
      const updated = await languageService.setEnabled(req.params.code, enabled, {
        userId: req.user?._id,
      });

      res.json({
        success: true,
        message: `${enabled ? 'Kích hoạt' : 'Vô hiệu hóa'} ngôn ngữ "${updated.code}" thành công.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/languages/default
   * Change system default language
   */
  async setDefaultApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thay đổi ngôn ngữ mặc định hệ thống.' });
      }

      const { code } = req.body;
      if (!code) {
        throw new ValidationError('Vui lòng chỉ định mã ngôn ngữ cần đặt làm mặc định.');
      }

      const result = await languageService.setDefault(code, { userId: req.user?._id });
      res.json({
        success: true,
        message: `Đã thiết lập ngôn ngữ mặc định toàn hệ thống là "${result.defaultLanguage}".`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/languages/reorder
   * Reorder languages
   */
  async reorderApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền sắp xếp thứ tự ngôn ngữ.' });
      }

      const orderedCodes = req.body.orderedCodes || req.body.order;
      const list = await languageService.reorder(orderedCodes, { userId: req.user?._id });

      res.json({
        success: true,
        message: 'Cập nhật thứ tự hiển thị ngôn ngữ thành công.',
        data: list,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/languages/:code
   * Safely delete a language
   */
  async deleteApi(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa ngôn ngữ (language:manage).' });
      }

      await languageService.delete(req.params.code, { userId: req.user?._id });
      res.json({
        success: true,
        message: `Đã xóa vĩnh viễn ngôn ngữ "${req.params.code}".`,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/languages/:code/usage
   * Get usage stats for a language
   */
  async getUsageApi(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'language:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông số sử dụng ngôn ngữ.' });
      }

      const usage = await languageService.getUsage(req.params.code);
      res.json({ success: true, data: usage });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = languageController;
