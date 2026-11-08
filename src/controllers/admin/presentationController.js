const presentationService = require('../../services/presentationService');
const itemService = require('../../services/itemService');
const Template = require('../../models/Template');
const logger = require('../../utils/logger');

class PresentationController {
  /**
   * GET /admin/content-editor/item/:id/presentation
   * Renders the partial HTML for Presentation Details Modal (Server-Side EJS Presentation)
   */
  async getPresentationDetailsModal(req, res) {
    try {
      const { id } = req.params;
      const { lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:read'))) {
        return res
          .status(403)
          .send('<div class="alert alert-danger m-3">Bạn không có quyền xem Presentation Details.</div>');
      }

      const details = await presentationService.getPresentationDetails(id, lang, version);

      res.render('admin/content-editor/presentation/details-modal', {
        layout: false,
        ...details,
        user,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
      });
    } catch (error) {
      logger.error(`Error loading presentation details modal: ${error.message}`);
      res
        .status(error.statusCode || 500)
        .send(`<div class="alert alert-danger m-3">Lỗi tải Presentation Details: ${error.message}</div>`);
    }
  }

  /**
   * GET /admin/content-editor/item/:id/presentation/preview
   * Renders preview or inspection modal for Presentation
   */
  async getPreviewJsonModal(req, res) {
    try {
      const { id } = req.params;
      const { lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:read'))) {
        return res
          .status(403)
          .send('<div class="alert alert-danger m-3">Bạn không có quyền xem Presentation Preview.</div>');
      }

      const merged = await presentationService.getFinalPresentation(id, lang, version);

      res.render('admin/content-editor/presentation/preview-json-modal', {
        layout: false,
        merged,
        jsonString: JSON.stringify(merged, null, 2),
      });
    } catch (error) {
      logger.error(`Error loading presentation preview modal: ${error.message}`);
      res
        .status(error.statusCode || 500)
        .send(`<div class="alert alert-danger m-3">Lỗi tải Preview: ${error.message}</div>`);
    }
  }

  /**
   * GET /api/presentation/item/:id hoặc GET /api/items/:id/presentation
   * Returns merged final presentation JSON for an item
   */
  async getPresentationJson(req, res) {
    try {
      const { id } = req.params;
      const { lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:read'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Presentation.' });
      }

      const merged = await presentationService.getFinalPresentation(id, lang, version);

      res.json({
        success: true,
        data: merged,
      });
    } catch (error) {
      logger.error(`API getPresentationJson error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/presentation/item/:id hoặc POST /admin/content-editor/item/:id/presentation
   * Saves presentation configuration (Shared or Final)
   */
  async savePresentation(req, res) {
    try {
      const { id } = req.params;
      const {
        layoutId,
        renderings = [],
        scope = 'shared',
        lang = 'vi',
        version = 1,
        expectedUpdatedAt = null,
      } = req.body;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:write'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền lưu Presentation.' });
      }

      const result = await presentationService.savePresentation(
        id,
        { layoutId, renderings },
        scope,
        {
          lang,
          version,
          expectedUpdatedAt,
          userId: user?.id,
        }
      );

      res.json({
        success: true,
        message: 'Lưu cấu hình Presentation thành công!',
        data: result,
      });
    } catch (error) {
      logger.error(`API savePresentation error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/presentation/item/:id/reset hoặc POST /admin/content-editor/item/:id/presentation/reset
   * Resets presentation to standard template defaults
   */
  async resetPresentation(req, res) {
    try {
      const { id } = req.params;
      const {
        scope = 'all',
        lang = 'vi',
        version = 1,
        expectedUpdatedAt = null,
      } = req.body;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:write'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khôi phục Presentation.' });
      }

      const result = await presentationService.resetToStandard(id, scope, {
        lang,
        version,
        expectedUpdatedAt,
        userId: user?.id,
      });

      res.json({
        success: true,
        message: 'Đã khôi phục Presentation về cấu hình mặc định của Template!',
        data: result,
      });
    } catch (error) {
      logger.error(`API resetPresentation error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/presentation/renderings/allowed
   * Returns list of allowed renderings for a placeholder (with optional includeAll support)
   */
  async getAllowedRenderings(req, res) {
    try {
      const { placeholder = 'maincontent', placeholderId = null, includeAll = 'true' } = req.query;
      const target = placeholderId || placeholder;
      const shouldIncludeAll = includeAll === 'true' || includeAll === true;

      const result = await presentationService.getAllowedRenderings(target, {
        includeAll: shouldIncludeAll,
      });

      if (shouldIncludeAll && result && typeof result === 'object' && result.renderings) {
        const uniqueFolders = Array.from(new Set(result.renderings.map((r) => r.folder).filter(Boolean)));
        return res.json({
          success: true,
          placeholder: target,
          hasRestrictions: result.hasRestrictions,
          total: result.renderings.length,
          allowedCount: result.renderings.filter((r) => r.isAllowed).length,
          folders: ['Tất cả', ...uniqueFolders.sort()],
          data: result.renderings,
        });
      }

      res.json({
        success: true,
        placeholder: target,
        data: result,
      });
    } catch (error) {
      logger.error(`API getAllowedRenderings error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/presentation/usage/:id
   * Checks usage of a layout or rendering before deletion
   */
  async checkUsage(req, res) {
    try {
      const { id } = req.params;
      const usage = await presentationService.getUsage(id);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      logger.error(`API checkUsage error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/templates/:id/standard-presentation
   */
  async getTemplateStandardPresentation(req, res) {
    try {
      const { id } = req.params;
      const template = await Template.findById(id).lean();
      if (!template) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy Template.' });
      }

      res.json({
        success: true,
        data: template.presentation || { layoutId: null, renderings: [] },
      });
    } catch (error) {
      logger.error(`API getTemplateStandardPresentation error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/templates/:id/standard-presentation
   */
  async setTemplateStandardPresentation(req, res) {
    try {
      const { id } = req.params;
      const { layoutId, renderings = [] } = req.body;
      const user = req.session?.user;

      if (!(await itemService.canPerform(user, id, 'presentation:write'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền cấu hình Standard Presentation.' });
      }

      const result = await presentationService.setTemplateStandardPresentation(
        id,
        { layoutId, renderings },
        { userId: user?.id }
      );

      res.json({
        success: true,
        message: 'Lưu Standard Presentation của Template thành công!',
        data: result,
      });
    } catch (error) {
      logger.error(`API setTemplateStandardPresentation error: ${error.message}`);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new PresentationController();
