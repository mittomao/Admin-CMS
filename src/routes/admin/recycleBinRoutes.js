'use strict';

const express = require('express');
const router = express.Router();
const recycleBinController = require('../../controllers/admin/recycleBinController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

router.get('/', recycleBinController.index);
router.post('/restore/:id', csrfMiddleware.verifyToken, recycleBinController.restoreItem);
router.post('/purge/:id', csrfMiddleware.verifyToken, recycleBinController.purgeItem);
router.post('/purge-all', csrfMiddleware.verifyToken, recycleBinController.purgeAll);

module.exports = router;

