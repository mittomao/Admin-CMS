const express = require('express');
const router = express.Router();
const contentEditorController = require('../../controllers/admin/contentEditorController');
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

// All item API endpoints require authentication
router.use(requireAuth);

// Read operations
router.get('/search', contentEditorController.searchItems);
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

module.exports = router;

