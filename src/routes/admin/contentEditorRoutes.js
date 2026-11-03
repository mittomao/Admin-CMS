const express = require('express');
const router = express.Router();
const contentEditorController = require('../../controllers/admin/contentEditorController');

// In GĐ 1, authMiddleware will protect this route
router.get('/', contentEditorController.getContentEditor);

module.exports = router;

