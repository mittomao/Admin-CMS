const express = require('express');
const router = express.Router();
const templateManagerController = require('../../controllers/admin/templateManagerController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

// All template API endpoints require authentication
router.use(requireAuth);

// Read Endpoints
router.get('/', templateManagerController.list);
router.get('/:id', templateManagerController.getById);
router.get('/:id/resolved', templateManagerController.getResolved);
router.get('/:id/usage', templateManagerController.getUsage);

// Mutating Endpoints with CSRF Protection
router.post('/', csrfMiddleware.verifyToken, templateManagerController.create);
router.put('/:id', csrfMiddleware.verifyToken, templateManagerController.update);
router.delete('/:id', csrfMiddleware.verifyToken, templateManagerController.delete);
router.post('/:id/duplicate', csrfMiddleware.verifyToken, templateManagerController.duplicate);

// Base Templates, Standard Values & Insert Options
router.put('/:id/base-templates', csrfMiddleware.verifyToken, templateManagerController.setBaseTemplates);
router.put('/:id/standard-values', csrfMiddleware.verifyToken, templateManagerController.setStandardValues);
router.put('/:id/insert-options', csrfMiddleware.verifyToken, templateManagerController.setInsertOptions);

// Sections Management
router.post('/:id/sections', csrfMiddleware.verifyToken, templateManagerController.addSection);
router.put('/:id/sections/reorder', csrfMiddleware.verifyToken, templateManagerController.reorderSections);
router.put('/:id/sections/:sectionId', csrfMiddleware.verifyToken, templateManagerController.updateSection);
router.delete('/:id/sections/:sectionId', csrfMiddleware.verifyToken, templateManagerController.deleteSection);

// Fields Management
router.post('/:id/sections/:sectionId/fields', csrfMiddleware.verifyToken, templateManagerController.addField);
router.put('/:id/sections/:sectionId/fields/reorder', csrfMiddleware.verifyToken, templateManagerController.reorderFields);
router.put('/:id/sections/:sectionId/fields/:fieldId', csrfMiddleware.verifyToken, templateManagerController.updateField);
router.delete('/:id/sections/:sectionId/fields/:fieldId', csrfMiddleware.verifyToken, templateManagerController.deleteField);
router.post('/:id/sections/:sourceSectionId/fields/:fieldId/move', csrfMiddleware.verifyToken, templateManagerController.moveField);

module.exports = router;

