const express = require('express');
const router = express.Router();
const controlPanelController = require('../../controllers/admin/controlPanelController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.get('/', requireAuth, controlPanelController.index);
router.post('/clear-cache', requireAuth, csrfMiddleware.verifyToken, controlPanelController.clearCache);

module.exports = router;
