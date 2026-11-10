'use strict';

const express = require('express');
const router = express.Router();
const backupController = require('../../controllers/admin/backupController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);
router.get('/', backupController.index);

module.exports = router;

