'use strict';

const express = require('express');
const router = express.Router();
const workboxController = require('../../controllers/admin/workboxController');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/summary', (req, res, next) => workboxController.getSummary(req, res, next));
router.get('/items', (req, res, next) => workboxController.getItems(req, res, next));
router.post('/bulk', csrfMiddleware.verifyToken, (req, res, next) => workboxController.executeBulk(req, res, next));

module.exports = router;

