const express = require('express');
const router = express.Router();
const launchpadController = require('../../controllers/admin/launchpadController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.get('/', requireAuth, launchpadController.getLaunchpad);

module.exports = router;
