'use strict';

const express = require('express');
const router = express.Router();
const auditController = require('../../controllers/admin/auditController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/', auditController.index);
router.get('/export', auditController.exportCsv);

module.exports = router;

