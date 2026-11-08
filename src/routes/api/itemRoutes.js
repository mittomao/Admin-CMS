const express = require('express');
const router = express.Router();
const contentEditorController = require('../../controllers/admin/contentEditorController');
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');
const itemService = require('../../services/itemService');
const workflowService = require('../../services/workflowService');
const publishService = require('../../services/publishService');
const PublishedItem = require('../../models/PublishedItem');

// All item API endpoints require authentication
router.use(requireAuth);

// Database validation and write protection guard (GĐ 8.1)
router.use((req, res, next) => {
  try {
    const rawDb = req.query.db || (req.body && req.body.db);
    if (rawDb) {
      itemService.validateDb(rawDb);
    }

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(req.method)) {
      const db = (req.query.db || (req.body && req.body.db) || 'master').toLowerCase().trim();
      if (db === 'web') {
        return res.status(403).json({
          success: false,
          message: 'Web database là kho dữ liệu chỉ đọc (Strict Read-Only). Không được phép chỉnh sửa trực tiếp.',
        });
      }
    }
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Read operations
router.get('/search', contentEditorController.searchItems);
router.get('/publish-status-batch', async (req, res, next) => {
  try {
    const rawIds = req.query.ids || '';
    const ids = Array.isArray(rawIds)
      ? rawIds
      : rawIds.split(',').map((s) => s.trim()).filter(Boolean);
    const lang = req.query.lang || 'vi';
    const statusMap = await itemService.getPublishStatusBatch(ids, lang);
    res.json({ success: true, data: statusMap });
  } catch (err) {
    next(err);
  }
});
router.get('/:id/quick-info', contentEditorController.getItemQuickInfo);
router.get('/:id/children', contentEditorController.getTreeNodes);
router.get('/:id/languages', contentEditorController.getItemLanguages);
router.get('/:id/versions', contentEditorController.getItemVersions);
router.get('/:id/compare', contentEditorController.compareVersions);
router.get('/:id/presentation', presentationController.getPresentationJson);

// Mutating operations with CSRF protection
router.post('/', csrfMiddleware.verifyToken, contentEditorController.createItem);
router.put('/:id/fields', csrfMiddleware.verifyToken, contentEditorController.updateFields);
router.post('/:id/rename', csrfMiddleware.verifyToken, contentEditorController.renameItem);
router.post('/:id/duplicate', csrfMiddleware.verifyToken, contentEditorController.duplicateItem);
router.post('/:id/copy', csrfMiddleware.verifyToken, contentEditorController.copyItem);
router.post('/:id/move', csrfMiddleware.verifyToken, contentEditorController.moveItem);
router.post('/:id/sort', csrfMiddleware.verifyToken, contentEditorController.sortItem);
router.post('/:id/reset-standard-value', csrfMiddleware.verifyToken, contentEditorController.resetFieldStandardValue);
router.delete('/:id', csrfMiddleware.verifyToken, contentEditorController.deleteItem);

// Version & Language mutations (GĐ 4)
router.post('/:id/versions', csrfMiddleware.verifyToken, contentEditorController.addVersion);
router.post('/:id/languages', csrfMiddleware.verifyToken, contentEditorController.addLanguage);
router.delete('/:id/versions/:lang/:version', csrfMiddleware.verifyToken, contentEditorController.deleteVersion);
router.post('/:id/versions/:lang/:version/restore', csrfMiddleware.verifyToken, contentEditorController.restoreVersion);

// Presentation operations (GĐ 6)
router.put('/:id/presentation', csrfMiddleware.verifyToken, presentationController.savePresentation);
router.post('/:id/presentation/reset', csrfMiddleware.verifyToken, presentationController.resetPresentation);

// Workflow operations (GĐ 8)
router.get('/:id/workflow', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang = 'vi', version = 1 } = req.query;
    const stateInfo = await workflowService.getState(id, lang, parseInt(version, 10));
    const commands = await workflowService.getCommands(id, lang, parseInt(version, 10), req.user);
    res.json({ success: true, data: { stateInfo, commands } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/workflow/execute', csrfMiddleware.verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang = 'vi', version = 1, command, comment = '', expectedUpdatedAt } = req.body;
    const result = await workflowService.execute(id, lang, parseInt(version, 10), command, comment, req.user, expectedUpdatedAt);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/workflow/history', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lang, version } = req.query;
    const history = await workflowService.getHistory(id, lang, version ? parseInt(version, 10) : null);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// Publishing operations (GĐ 8)
router.post('/:id/unpublish', csrfMiddleware.verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await itemService.getById(id);
    if (!(await itemService.canPerform(req.user, item, 'item:unpublish'))) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền gỡ bỏ item khỏi Web (item:unpublish).' });
    }
    const result = await publishService.unpublishItem(id, {
      includeSubitems: Boolean(req.body.includeSubitems),
      user: req.user,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/publish-status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const webDoc = await PublishedItem.findById(id).lean();
    res.json({
      success: true,
      data: {
        isPublished: Boolean(webDoc && !webDoc.isDeleted),
        publishedAt: webDoc?.publishedAt || null,
        sourceVersion: webDoc?.sourceVersion || null,
        languages: webDoc?.languages?.map((l) => ({ code: l.code, version: l.publishedVersion })) || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

