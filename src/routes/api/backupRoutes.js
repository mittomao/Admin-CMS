'use strict';

const express = require('express');
const router = express.Router();
const backupController = require('../../controllers/admin/backupController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

router.get('/', backupController.apiList);
router.post('/', csrfMiddleware.verifyToken, backupController.apiCreate);
router.post('/prune', csrfMiddleware.verifyToken, backupController.apiPrune);
router.post('/maintenance', csrfMiddleware.verifyToken, backupController.apiToggleMaintenance);

router.get('/:id', backupController.apiGet);
router.post('/:id/verify', csrfMiddleware.verifyToken, backupController.apiVerify);
router.get('/:id/download', backupController.apiDownload);
router.post('/:id/restore', csrfMiddleware.verifyToken, backupController.apiRestore);
router.delete('/:id', csrfMiddleware.verifyToken, backupController.apiDelete);

module.exports = router;

