'use strict';

const express = require('express');
const router = express.Router();
const publishManagerController = require('../../controllers/admin/publishManagerController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.get('/', requireAuth, (req, res, next) => publishManagerController.renderManager(req, res, next));

module.exports = router;

