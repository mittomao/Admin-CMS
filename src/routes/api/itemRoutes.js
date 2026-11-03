const express = require('express');
const router = express.Router();
const contentEditorController = require('../../controllers/admin/contentEditorController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

// All item API endpoints require authentication
router.use(requireAuth);

// Read operations
router.get('/search', contentEditorController.searchItems);
router.get('/:id/children', contentEditorController.getTreeNodes);

// Mutating operations with CSRF protection
router.post('/', csrfMiddleware.verifyToken, contentEditorController.createItem);
router.put('/:id/fields', csrfMiddleware.verifyToken, contentEditorController.updateFields);
router.post('/:id/rename', csrfMiddleware.verifyToken, contentEditorController.renameItem);
router.post('/:id/duplicate', csrfMiddleware.verifyToken, contentEditorController.duplicateItem);
router.post('/:id/copy', csrfMiddleware.verifyToken, contentEditorController.copyItem);
router.post('/:id/move', csrfMiddleware.verifyToken, contentEditorController.moveItem);
router.post('/:id/sort', csrfMiddleware.verifyToken, contentEditorController.sortItem);
router.delete('/:id', csrfMiddleware.verifyToken, contentEditorController.deleteItem);

module.exports = router;

