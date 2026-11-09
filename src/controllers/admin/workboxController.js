const workboxService = require('../../services/workboxService');
const itemService = require('../../services/itemService');
const languageService = require('../../services/languageService');
const logger = require('../../utils/logger');

const workboxController = {
  /**
   * Render Workbox UI
   * GET /admin/workbox
   */
  async renderWorkbox(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'workbox:read'))) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền truy cập ứng dụng Workbox.',
          currentPath: req.originalUrl,
          activeApp: 'workbox',
          user: req.user,
        });
      }

      const summary = await workboxService.getWorkboxSummary(req.user);

      // Determine selected state
      let selectedStateId = req.params.stateId || req.query.stateId || null;
      let selectedState = null;
      let selectedWorkflow = null;

      if (!selectedStateId) {
        // Pick first state that has items, or first state overall
        for (const wf of summary) {
          const stateWithItems = wf.states.find((s) => s.itemCount > 0);
          if (stateWithItems) {
            selectedStateId = stateWithItems.id;
            selectedState = stateWithItems;
            selectedWorkflow = wf;
            break;
          }
        }
        if (!selectedStateId && summary[0]?.states[0]) {
          selectedStateId = summary[0].states[0].id;
          selectedState = summary[0].states[0];
          selectedWorkflow = summary[0];
        }
      } else {
        for (const wf of summary) {
          const matched = wf.states.find((s) => s.id === selectedStateId);
          if (matched) {
            selectedState = matched;
            selectedWorkflow = wf;
            break;
          }
        }
      }

      const itemsData = selectedStateId
        ? await workboxService.getWorkboxItems(selectedStateId, req.query, req.user)
        : { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };

      const canBulk = await itemService.canPerform(req.user, null, 'workbox:bulk');
      const languages = await languageService.list({ enabledOnly: true });

      res.render('admin/workbox/index', {
        title: 'Workbox - Phê duyệt Nội dung',
        layout: 'layouts/shell',
        activeApp: 'workbox',
        user: req.user,
        workflows: summary,
        selectedStateId,
        selectedState,
        selectedWorkflow,
        itemsData,
        languages,
        query: req.query,
        canBulk,
        csrfToken: req.session?.csrfToken || res.locals?.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      logger.error(`[WorkboxController] Error rendering workbox: ${err.message}`, err);
      next(err);
    }
  },

  /**
   * API: Get summary counts
   * GET /api/workbox/summary
   */
  async getSummary(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'workbox:read'))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const summary = await workboxService.getWorkboxSummary(req.user);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: Get items for a state
   * GET /api/workbox/items
   */
  async getItems(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, 'workbox:read'))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { stateId } = req.query;
      if (!stateId) {
        return res.status(400).json({ success: false, message: 'stateId is required' });
      }
      const data = await workboxService.getWorkboxItems(stateId, req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: Execute bulk workflow command
   * POST /api/workbox/bulk
   */
  async executeBulk(req, res, next) {
    try {
      const { stateId, command, items, comment } = req.body;
      if (!stateId || !command || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp stateId, command và danh sách items cần thao tác.',
        });
      }

      const result = await workboxService.executeBulk(stateId, command, items, comment, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = workboxController;
