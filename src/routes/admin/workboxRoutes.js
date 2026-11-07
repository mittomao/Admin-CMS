'use strict';

const express = require('express');
const router = express.Router();
const workboxController = require('../../controllers/admin/workboxController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.get('/', requireAuth, (req, res, next) => workboxController.renderWorkbox(req, res, next));
router.get('/state/:stateId', requireAuth, (req, res, next) => workboxController.renderWorkbox(req, res, next));

module.exports = router;

