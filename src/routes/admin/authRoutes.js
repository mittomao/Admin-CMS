const express = require('express');
const router = express.Router();
const authController = require('../../controllers/admin/authController');
const { guestOnly } = require('../../middlewares/authMiddleware');

router.get('/login', guestOnly, authController.getLogin);
router.post('/login', guestOnly, authController.postLogin);
router.post('/logout', authController.postLogout);
router.get('/logout', authController.postLogout); // Convenient GET fallback

module.exports = router;

