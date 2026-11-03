const express = require('express');
const router = express.Router();
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

// Modal Presentation Details Partial HTML
router.get('/item/:id/presentation', (req, res, next) =>
  presentationController.getPresentationDetailsModal(req, res, next)
);

// Modal Preview JSON Partial HTML
router.get('/item/:id/presentation/preview', (req, res, next) =>
  presentationController.getPreviewJsonModal(req, res, next)
);

module.exports = router;

