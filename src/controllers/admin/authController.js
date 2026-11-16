const authService = require('../../services/authService');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const branding = require('../../config/branding');

const getLogin = (req, res) => {
  res.render('admin/auth/login', {
    layout: 'layouts/auth',
    title: `${branding.PROJECT_NAME} Login`,
    returnUrl: req.query.returnUrl || '/admin/launchpad',
    error: null,
    username: '',
  });
};

const eventBus = require('../../utils/eventBus');

const postLogin = async (req, res) => {
  const { username, password, returnUrl } = req.body;
  const redirectTarget = returnUrl && returnUrl.startsWith('/admin') ? returnUrl : '/admin/launchpad';

  try {
    const { user } = await authService.login(username, password);

    req.session.user = user;
    req.session.save((err) => {
      if (err) {
        logger.error(`Session save error: ${err.message}`);
        return res.render('admin/auth/login', {
          layout: 'layouts/auth',
          title: `${branding.PROJECT_NAME} Login`,
          returnUrl: redirectTarget,
          error: 'An error occurred during session creation. Please try again.',
          username: username || '',
        });
      }

      eventBus.emit('auth.login', { user, req });
      logger.info(`User [${user.username}] logged in successfully.`);
      const finalRedirect = user.mustChangePassword ? '/admin/change-password' : redirectTarget;
      return res.redirect(finalRedirect);
    });
  } catch (error) {
    eventBus.emit('auth.failed', { username, req, error: error.message });
    logger.warn(`Failed login attempt for [${username}]: ${error.message}`);
    return res.render('admin/auth/login', {
      layout: 'layouts/auth',
      title: `${branding.PROJECT_NAME} Login`,
      returnUrl: redirectTarget,
      error: error.message,
      username: username || '',
    });
  }
};

const postLogout = (req, res) => {
  const user = req.session && req.session.user ? req.session.user : null;
  const username = user ? user.username : 'Unknown';

  if (req.session) {
    eventBus.emit('auth.logout', { user, req });
    req.session.destroy((err) => {
      if (err) {
        logger.error(`Error destroying session for ${username}: ${err.message}`);
      }
      res.clearCookie(env.SESSION_NAME);
      logger.info(`User [${username}] logged out.`);
      return res.redirect('/admin/login');
    });
  } else {
    return res.redirect('/admin/login');
  }
};

const getChangePassword = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }
  return res.render('admin/auth/change-password', {
    layout: 'layouts/auth',
    title: `${branding.PROJECT_NAME} - Đổi Mật Khẩu Khởi Tạo`,
    error: null,
    user: req.session.user,
  });
};

const postChangePassword = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  const { newPassword, confirmPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.render('admin/auth/change-password', {
      layout: 'layouts/auth',
      title: `${branding.PROJECT_NAME} - Đổi Mật Khẩu Khởi Tạo`,
      error: 'Mật khẩu mới phải có tối thiểu 8 ký tự.',
      user: req.session.user,
    });
  }

  if (newPassword !== confirmPassword) {
    return res.render('admin/auth/change-password', {
      layout: 'layouts/auth',
      title: `${branding.PROJECT_NAME} - Đổi Mật Khẩu Khởi Tạo`,
      error: 'Xác nhận mật khẩu mới không trùng khớp.',
      user: req.session.user,
    });
  }

  try {
    const User = require('../../models/User');
    const userDoc = await User.findById(req.session.user._id);
    if (!userDoc) {
      return res.redirect('/admin/login');
    }

    userDoc.passwordHash = await User.hashPassword(newPassword);
    userDoc.mustChangePassword = false;
    await userDoc.save();

    req.session.user.mustChangePassword = false;
    req.session.save((err) => {
      if (err) {
        logger.error(`Session save error after change password: ${err.message}`);
      }
      logger.info(`User [${userDoc.username}] changed initial password successfully.`);
      return res.redirect('/admin/launchpad');
    });
  } catch (err) {
    return res.render('admin/auth/change-password', {
      layout: 'layouts/auth',
      title: `${branding.PROJECT_NAME} - Đổi Mật Khẩu Khởi Tạo`,
      error: `Không thể đổi mật khẩu: ${err.message}`,
      user: req.session.user,
    });
  }
};

module.exports = {
  getLogin,
  postLogin,
  postLogout,
  getChangePassword,
  postChangePassword,
};

