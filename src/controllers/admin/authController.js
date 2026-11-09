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
      return res.redirect(redirectTarget);
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

module.exports = {
  getLogin,
  postLogin,
  postLogout,
};

