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

      logger.info(`User [${user.username}] logged in successfully.`);
      return res.redirect(redirectTarget);
    });
  } catch (error) {
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
  const username = req.session && req.session.user ? req.session.user.username : 'Unknown';

  if (req.session) {
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

module.exports = {
  getLogin,
  postLogin,
  postLogout,
};

