const express = require('express');
const router = express.Router();
const presentationController = require('../../controllers/admin/presentationController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

// Get allowed renderings for placeholder: GET /api/presentation/renderings/allowed
router.get('/renderings/allowed', (req, res, next) =>
  presentationController.getAllowedRenderings(req, res, next)
);

// Alias: GET /api/presentation/renderings
router.get('/renderings', (req, res, next) =>
  presentationController.getAllowedRenderings(req, res, next)
);

// Check usage before deletion: GET /api/presentation/usage/:id
router.get('/usage/:id', (req, res, next) =>
  presentationController.checkUsage(req, res, next)
);

// Item Presentation: GET /api/presentation/item/:id
router.get('/item/:id', (req, res, next) =>
  presentationController.getPresentationJson(req, res, next)
);

// Item Presentation: PUT /api/presentation/item/:id (CSRF protected)
router.put('/item/:id', csrfMiddleware.verifyToken, (req, res, next) =>
  presentationController.savePresentation(req, res, next)
);

// Item Presentation Reset: POST /api/presentation/item/:id/reset (CSRF protected)
router.post('/item/:id/reset', csrfMiddleware.verifyToken, (req, res, next) =>
  presentationController.resetPresentation(req, res, next)
);

// Template Standard Presentation: GET /api/presentation/template/:id/standard
router.get('/template/:id/standard', (req, res, next) =>
  presentationController.getTemplateStandardPresentation(req, res, next)
);

// Template Standard Presentation: PUT /api/presentation/template/:id/standard (CSRF protected)
router.put('/template/:id/standard', csrfMiddleware.verifyToken, (req, res, next) =>
  presentationController.setTemplateStandardPresentation(req, res, next)
);

module.exports = router;
