const presentationService = require('../../services/presentationService');
const itemService = require('../../services/itemService');
const Item = require('../../models/Item');
const Template = require('../../models/Template');
const logger = require('../../utils/logger');

class PresentationController {
  /**
   * GET /admin/content-editor/item/:id/presentation
   * Renders the partial HTML for Presentation Details Modal
   */
  async getPresentationDetailsModal(req, res) {
    try {
      const { id } = req.params;
      const { device = null, lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:read')) {
        return res.status(403).send('<div class="alert alert-danger m-3">Bạn không có quyền xem Presentation Details.</div>');
      }

      const details = await presentationService.getPresentationDetails(
        id,
        device,
        lang,
        version
      );

      res.render('admin/content-editor/presentation/details-modal', {
        layout: false,
        ...details,
        user,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
      });
    } catch (error) {
      logger.error(`Error loading presentation details modal: ${error.message}`);
      res.status(error.statusCode || 500).send(
        `<div class="alert alert-danger m-3">Lỗi tải Presentation Details: ${error.message}</div>`
      );
    }
  }

  /**
   * GET /admin/content-editor/item/:id/presentation/preview
   * Renders the partial HTML for Preview JSON Modal
   */
  async getPreviewJsonModal(req, res) {
    try {
      const { id } = req.params;
      const { device = null, lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:read')) {
        return res.status(403).send('<div class="alert alert-danger m-3">Bạn không có quyền xem Presentation Preview.</div>');
      }

      const merged = await presentationService.getFinalPresentation(id, device, lang, version);

      res.render('admin/content-editor/presentation/preview-json-modal', {
        layout: false,
        merged,
        jsonString: JSON.stringify(merged, null, 2),
      });
    } catch (error) {
      logger.error(`Error loading presentation preview modal: ${error.message}`);
      res.status(error.statusCode || 500).send(
        `<div class="alert alert-danger m-3">Lỗi tải JSON Preview: ${error.message}</div>`
      );
    }
  }

  /**
   * GET /api/items/:id/presentation
   * Returns merged final presentation JSON for an item
   */
  async getPresentationJson(req, res) {
    try {
      const { id } = req.params;
      const { device = null, lang = 'vi', version = 1 } = req.query;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:read')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Presentation.' });
      }

      const merged = await presentationService.getFinalPresentation(id, device, lang, version);

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
   * PUT /api/items/:id/presentation
   * Saves presentation configuration (Shared or Final)
   */
  async savePresentation(req, res) {
    try {
      const { id } = req.params;
      const {
        deviceId,
        layoutId,
        renderings = [],
        scope = 'shared',
        lang = 'vi',
        version = 1,
        expectedUpdatedAt = null,
      } = req.body;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:write')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền lưu Presentation.' });
      }

      const result = await presentationService.savePresentation(
        id,
        { deviceId, layoutId, renderings },
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
   * POST /api/items/:id/presentation/reset
   * Resets presentation to standard template defaults
   */
  async resetPresentation(req, res) {
    try {
      const { id } = req.params;
      const {
        scope = 'all',
        deviceId = null,
        lang = 'vi',
        version = 1,
        expectedUpdatedAt = null,
      } = req.body;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:write')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khôi phục Presentation.' });
      }

      const result = await presentationService.resetToStandard(id, scope, {
        deviceId,
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
   * GET /api/presentation/renderings
   * Returns list of allowed renderings for a placeholder
   */
  async getAllowedRenderings(req, res) {
    try {
      const { placeholder = 'main' } = req.query;
      const renderings = await presentationService.getAllowedRenderings(placeholder);

      res.json({
        success: true,
        placeholder,
        data: renderings,
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
   * GET /api/presentation/placeholders
   * Returns defined placeholders for a layout
   */
  async getPlaceholdersByLayout(req, res) {
    try {
      const { layoutId } = req.query;
      if (!layoutId) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số layoutId.' });
      }

      const layoutItem = await Item.findById(layoutId).lean();
      if (!layoutItem) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy Layout.' });
      }

      const fields = layoutItem.sharedFields || layoutItem.fields || {};
      const placeholdersRaw = fields.placeholders || '';
      const placeholders = typeof placeholdersRaw === 'string'
        ? placeholdersRaw.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      res.json({
        success: true,
        layoutId,
        placeholders,
      });
    } catch (error) {
      logger.error(`API getPlaceholdersByLayout error: ${error.message}`);
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
        data: template.presentation || { devices: [] },
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
      const { deviceId, layoutId, renderings = [] } = req.body;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'presentation:write')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền cấu hình Standard Presentation.' });
      }

      const result = await presentationService.setTemplateStandardPresentation(
        id,
        { deviceId, layoutId, renderings },
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

