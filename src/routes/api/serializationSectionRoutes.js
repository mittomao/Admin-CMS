'use strict';

const express = require('express');
const router = express.Router();
const serializationSectionController = require('../../controllers/admin/serializationSectionController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

// GET /api/serialization/sections - List sections with live comparison statuses
router.get('/', serializationSectionController.listSections);

// POST /api/serialization/sections/:key/reserialize - Reserialize section(s)
router.post('/:key/reserialize', csrfMiddleware.verifyToken, serializationSectionController.reserialize);

// POST /api/serialization/sections/:key/sync/dry-run - Dry-run preview
router.post('/:key/sync/dry-run', csrfMiddleware.verifyToken, serializationSectionController.dryRun);

// POST /api/serialization/sections/:key/sync - Actual sync
router.post('/:key/sync', csrfMiddleware.verifyToken, serializationSectionController.sync);

module.exports = router;

