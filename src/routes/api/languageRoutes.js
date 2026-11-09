'use strict';

/**
 * Treecraft CMS - Language API Routes (GĐ L1 / DEC-048)
 */

const express = require('express');
const router = express.Router();
const languageController = require('../../controllers/admin/languageController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

// Query endpoints
router.get('/', languageController.listApi);
router.get('/:code/usage', languageController.getUsageApi);
router.get('/:code', languageController.getByCodeApi);

// Mutation endpoints (protected by CSRF)
router.post('/', csrfMiddleware.verifyToken, languageController.createApi);
router.put('/reorder', csrfMiddleware.verifyToken, languageController.reorderApi);
router.post('/default', csrfMiddleware.verifyToken, languageController.setDefaultApi);
router.put('/:code', csrfMiddleware.verifyToken, languageController.updateApi);
router.post('/:code/enable', csrfMiddleware.verifyToken, languageController.toggleEnableApi);
router.post('/:code/disable', csrfMiddleware.verifyToken, languageController.toggleEnableApi);
router.delete('/:code', csrfMiddleware.verifyToken, languageController.deleteApi);

module.exports = router;
