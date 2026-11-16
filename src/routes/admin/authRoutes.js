const express = require('express');
const router = express.Router();
const authController = require('../../controllers/admin/authController');
const { guestOnly } = require('../../middlewares/authMiddleware');

// Chuyển hướng thông minh tại gốc /admin
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.mustChangePassword) {
      return res.redirect('/admin/change-password');
    }
    return res.redirect('/admin/launchpad');
  }
  return res.redirect('/admin/login');
});

router.get('/login', guestOnly, authController.getLogin);
router.post('/login', guestOnly, authController.postLogin);
router.post('/logout', authController.postLogout);
router.get('/logout', authController.postLogout); // Convenient GET fallback
router.get('/change-password', authController.getChangePassword);
router.post('/change-password', authController.postChangePassword);

module.exports = router;

