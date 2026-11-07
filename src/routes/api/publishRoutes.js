'use strict';

const express = require('express');
const router = express.Router();
const publishManagerController = require('../../controllers/admin/publishManagerController');
const publishService = require('../../services/publishService');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.post('/', csrfMiddleware.verifyToken, (req, res, next) => publishManagerController.triggerPublish(req, res, next));
router.get('/preflight', (req, res, next) => publishManagerController.preflightCheck(req, res, next));
router.get('/jobs', (req, res, next) => publishManagerController.listJobs(req, res, next));
router.get('/jobs/:id', (req, res, next) => publishManagerController.getJob(req, res, next));
router.post('/jobs/:id/cancel', csrfMiddleware.verifyToken, (req, res, next) => publishManagerController.cancelJob(req, res, next));
router.get('/history', (req, res, next) => publishManagerController.listHistory(req, res, next));

router.post('/cleanup', csrfMiddleware.verifyToken, async (req, res, next) => {
  try {
    const result = await publishService.cleanupWeb();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

