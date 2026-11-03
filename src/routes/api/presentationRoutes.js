const express = require('express');
const router = express.Router();
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

// Get allowed renderings for placeholder: GET /api/presentation/renderings
router.get('/renderings', (req, res, next) =>
  presentationController.getAllowedRenderings(req, res, next)
);

// Get placeholders defined by layout: GET /api/presentation/placeholders
router.get('/placeholders', (req, res, next) =>
  presentationController.getPlaceholdersByLayout(req, res, next)
);

// Check usage before deletion: GET /api/presentation/usage/:id
router.get('/usage/:id', (req, res, next) =>
  presentationController.checkUsage(req, res, next)
);

module.exports = router;
