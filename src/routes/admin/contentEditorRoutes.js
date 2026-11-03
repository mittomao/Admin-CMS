const express = require('express');
const router = express.Router();
const contentEditorController = require('../../controllers/admin/contentEditorController');
const { requireAuth } = require('../../middlewares/authMiddleware');

// Full page EJS Views
router.get('/', requireAuth, contentEditorController.index);
router.get('/:id', requireAuth, contentEditorController.index);

// Partial HTML EJS Fragments for AJAX Workspace swapping
router.get('/item/:id/form', requireAuth, contentEditorController.getItemFormPartial);
router.get('/item/:id/folder-view', requireAuth, contentEditorController.getItemFolderViewPartial);
router.get('/item/:id/insert-options', requireAuth, contentEditorController.getInsertOptions);

module.exports = router;
