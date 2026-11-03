'use strict';

const express = require('express');
const router = express.Router();
const mediaController = require('../../controllers/admin/mediaController');
const { requireAuth } = require('../../middlewares/authMiddleware');

// Media Library Full Page và Modal Picker
router.get('/', requireAuth, (req, res, next) => mediaController.renderMediaLibrary(req, res, next));
router.get('/picker', requireAuth, (req, res, next) => mediaController.renderMediaPickerModal(req, res, next));

module.exports = router;

