'use strict';

/**
 * Treecraft CMS - Language Admin Routes (GĐ L1 / DEC-048)
 */

const express = require('express');
const router = express.Router();
const languageController = require('../../controllers/admin/languageController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);
router.get('/', languageController.index);

module.exports = router;

