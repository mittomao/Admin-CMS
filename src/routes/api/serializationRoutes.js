'use strict';

const express = require('express');
const router = express.Router();
const serializationController = require('../../controllers/admin/serializationController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

router.post('/export-package', csrfMiddleware.verifyToken, serializationController.exportPackage);
router.get('/export-item', serializationController.exportItem);
router.post('/inspect', csrfMiddleware.verifyToken, serializationController.inspect);
router.post('/import', csrfMiddleware.verifyToken, serializationController.importPackage);

module.exports = router;

