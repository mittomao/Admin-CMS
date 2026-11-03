const express = require('express');
const router = express.Router();
const launchpadController = require('../../controllers/admin/launchpadController');

// In GĐ 1, authMiddleware will protect this route
router.get('/', launchpadController.getLaunchpad);

module.exports = router;

