const express = require('express');
const router = express.Router();
const securityController = require('../../controllers/admin/securityController');
const { requireAuth } = require('../../middlewares/authMiddleware');

// User Manager UI
router.get('/users', requireAuth, securityController.renderUsers);

// Role Manager UI
router.get('/roles', requireAuth, securityController.renderRoles);

// Access Viewer UI
router.get('/access-viewer', requireAuth, securityController.renderAccessViewer);

// Security Editor Standalone UI
router.get('/security-editor', requireAuth, securityController.renderSecurityEditor);

module.exports = router;

