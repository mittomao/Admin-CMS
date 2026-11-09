'use strict';

const express = require('express');
const router = express.Router();
const auditController = require('../../controllers/admin/auditController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/item/:itemId', auditController.getItemHistory);
router.get('/:id', auditController.getDetails);

module.exports = router;

