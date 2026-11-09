'use strict';

/**
 * Serialization Controller (GĐ 11 / DEC-047)
 * Handles administration view (2 Tabs: Export Package & Import Package)
 * and JSON API endpoints with detailed toast feedback.
 */

const serializationService = require('../../services/serializationService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const logger = require('../../utils/logger');
const { ForbiddenError } = require('../../utils/errors');

const serializationController = {
  /**
   * GET /admin/serialization
   * Render the 2-Tab Serialization Admin View
   */
  async index(req, res, next) {
    try {
      const user = req.user || req.session.user;
      const canRead = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:read');
      if (!canRead) {
        throw new ForbiddenError('Bạn không có quyền truy cập ứng dụng Serialization (serialization:read).');
      }

      const canExport = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:export');
      const canImport = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:import');

      res.render('admin/serialization/index', {
        layout: 'layouts/shell',
        title: `Serialization Package Manager | ${branding.PROJECT_NAME}`,
        pageTitle: 'Quản lý Đóng gói & Phục hồi Dữ liệu (Serialization)',
        activeNav: 'serialization',
        permissions: { canExport, canImport },
        paths: branding.PATHS,
        user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/serialization/export-package
   * Generate and download or return JSON multi-branch package
   */
  async exportPackage(req, res, next) {
    try {
      const user = req.user || req.session.user;
      const canExport = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:export');
      if (!canExport) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xuất gói dữ liệu (serialization:export).' });
      }

      const {
        includeContent = true,
        includeTemplates = true,
        includeLayouts = true,
        includeRenderings = true,
        includePlaceholders = true,
        contentRootPath = branding.PATHS.CONTENT || '/root/content',
        format = 'json',
      } = req.body;

      // Verify at least one branch is selected
      const hasAnyBranch =
        includeContent ||
        includeTemplates ||
        includeLayouts ||
        includeRenderings ||
        includePlaceholders;

      if (!hasAnyBranch) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một phân vùng (Content, Templates, Layouts, Renderings hoặc Placeholders) để xuất.',
        });
      }

      const pkg = await serializationService.exportPackage({
        includeContent: Boolean(includeContent),
        includeTemplates: Boolean(includeTemplates),
        includeLayouts: Boolean(includeLayouts),
        includeRenderings: Boolean(includeRenderings),
        includePlaceholders: Boolean(includePlaceholders),
        contentRootPath,
        user,
      });

      // If requested directly as file download
      if (format === 'download' || req.query.download === '1') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `treecraft-package-${timestamp}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(JSON.stringify(pkg, null, 2));
      }

      // Default JSON API response
      return res.json({
        success: true,
        stats: pkg.stats,
        packageData: pkg,
        message: `Đã đóng gói thành công ${pkg.stats.totalItems} items.`,
      });
    } catch (err) {
      logger.error(`[serializationController.exportPackage] Error: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/serialization/export-item
   * Export single item or tree as JSON
   */
  async exportItem(req, res, next) {
    try {
      const user = req.user || req.session.user;
      const canExport = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:export');
      if (!canExport) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xuất dữ liệu (serialization:export).' });
      }

      const { itemId } = req.query;
      if (!itemId) {
        return res.status(400).json({ success: false, message: 'Thiếu itemId.' });
      }

      const pkg = await serializationService.exportSingleTree(itemId, { user });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `treecraft-tree-${timestamp}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(JSON.stringify(pkg, null, 2));
    } catch (err) {
      logger.error(`[serializationController.exportItem] Error: ${err.message}`);
      next(err);
    }
  },

  /**
   * POST /api/serialization/inspect
   * Inspect and validate uploaded package file
   */
  async inspect(req, res, next) {
    try {
      const user = req.user || req.session.user;
      const canRead = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền phân tích gói dữ liệu.' });
      }

      const packageData = req.body.packageData || req.body;
      const inspection = serializationService.inspectPackage(packageData);

      if (!inspection.isValid) {
        return res.status(400).json({
          success: false,
          message: inspection.error,
        });
      }

      return res.json({
        success: true,
        inspection,
        message: `Tệp hợp lệ: Phát hiện ${inspection.stats.totalItems} items sẵn sàng nạp.`,
      });
    } catch (err) {
      logger.error(`[serializationController.inspect] Error: ${err.message}`);
      next(err);
    }
  },

  /**
   * POST /api/serialization/import
   * Execute 4-step safe import
   */
  async importPackage(req, res, next) {
    try {
      const user = req.user || req.session.user;
      const canImport = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:import');
      if (!canImport) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền nhập dữ liệu (serialization:import).' });
      }

      const { packageData, conflictMode = 'OVERWRITE', selectedBranches } = req.body;

      if (!packageData) {
        return res.status(400).json({ success: false, message: 'Thiếu dữ liệu gói packageData để nạp.' });
      }

      const result = await serializationService.importPackage(packageData, {
        conflictMode,
        selectedBranches: Array.isArray(selectedBranches) ? selectedBranches : undefined,
        user,
      });

      return res.json({
        success: true,
        stats: result.stats,
        warnings: result.warnings,
        message: `Nhập dữ liệu hoàn tất! Tạo mới: ${result.stats.totalCreated}, Cập nhật: ${result.stats.totalUpdated}, Bỏ qua: ${result.stats.totalSkipped}.`,
      });
    } catch (err) {
      logger.error(`[serializationController.importPackage] Error: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: err.message || 'Lỗi khi nhập gói dữ liệu.',
      });
    }
  },
};

module.exports = serializationController;
