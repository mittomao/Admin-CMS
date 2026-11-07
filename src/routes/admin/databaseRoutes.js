const express = require('express');
const router = express.Router();
const databaseController = require('../../controllers/admin/databaseController');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.use(requireAuth);

router.get('/', databaseController.index);

module.exports = router;

