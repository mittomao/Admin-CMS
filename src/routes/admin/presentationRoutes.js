const express = require('express');
const router = express.Router();
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

// Modal Presentation Details Partial HTML
router.get('/item/:id/presentation', (req, res, next) =>
  presentationController.getPresentationDetailsModal(req, res, next)
);

// Save presentation from Content Editor Modal (CSRF protected)
router.post('/item/:id/presentation', csrfMiddleware.verifyToken, (req, res, next) =>
  presentationController.savePresentation(req, res, next)
);

// Reset presentation from Content Editor Modal (CSRF protected)
router.post('/item/:id/presentation/reset', csrfMiddleware.verifyToken, (req, res, next) =>
  presentationController.resetPresentation(req, res, next)
);

// Modal Preview Partial HTML
router.get('/item/:id/presentation/preview', (req, res, next) =>
  presentationController.getPreviewJsonModal(req, res, next)
);

module.exports = router;
