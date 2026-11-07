const express = require('express');
const router = express.Router();
const databaseController = require('../../controllers/admin/databaseController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/summary', databaseController.getSummary);
router.get('/diff', databaseController.getDiff);

module.exports = router;

