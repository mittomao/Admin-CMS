const express = require('express');
const router = express.Router();
const templateManagerController = require('../../controllers/admin/templateManagerController');
const { requireAuth } = require('../../middlewares/authMiddleware');

// All Template Manager routes require authentication
router.use(requireAuth);

// Full Page SSR Views
router.get('/', templateManagerController.index);
router.get('/:id', templateManagerController.index);

// Partial HTML for Tab Swapping
router.get('/:id/builder', templateManagerController.getBuilderPartial);
router.get('/:id/standard-values', templateManagerController.getStandardValuesPartial);
router.get('/:id/insert-options', templateManagerController.getInsertOptionsPartial);
router.get('/:id/inheritance', templateManagerController.getInheritancePartial);
router.get('/:id/usage', templateManagerController.getUsagePartial);
router.get('/:id/preview', templateManagerController.getPreviewPartial);

module.exports = router;

