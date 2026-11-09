'use strict';

const express = require('express');
const router = express.Router();
const serializationController = require('../../controllers/admin/serializationController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);
router.get('/', serializationController.index);

module.exports = router;

