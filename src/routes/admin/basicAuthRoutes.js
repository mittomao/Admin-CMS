'use strict';

const express = require('express');
const router = express.Router();
const basicAuthController = require('../../controllers/admin/basicAuthController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);
router.get('/', basicAuthController.index);

module.exports = router;

