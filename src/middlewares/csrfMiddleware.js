const crypto = require('crypto');

/**
 * Lightweight Session-based CSRF Protection Middleware
 * Compliant with Express + EJS architecture
 */
const csrfMiddleware = {
  /**
   * Initializes or refreshes CSRF token for the session and attaches to res.locals
   */
  generateToken(req, res, next) {
    if (req.session) {
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
      }
      res.locals.csrfToken = req.session.csrfToken;
    } else {
      res.locals.csrfToken = '';
    }
    next();
  },

  /**
   * Verifies CSRF token for mutating HTTP requests (POST, PUT, PATCH, DELETE)
   */
  verifyToken(req, res, next) {
    // Skip verification in test environment if configured
    if (process.env.NODE_ENV === 'test' && !req.headers['x-csrf-check']) {
      return next();
    }

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['csrf-token'];
    const tokenFromBody = req.body && req.body._csrf;
    const tokenFromQuery = req.query && req.query._csrf;

    const providedToken = tokenFromHeader || tokenFromBody || tokenFromQuery;
    const sessionToken = req.session ? req.session.csrfToken : null;

    if (!sessionToken || !providedToken || providedToken !== sessionToken) {
      // If request expects JSON / AJAX
      if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing CSRF token.',
          code: 'CSRF_INVALID',
        });
      }

      return res.status(403).render('errors/500', {
        title: '403 - Forbidden',
        message: 'Security validation failed (Invalid or missing CSRF token). Please refresh and try again.',
        error: { status: 403 },
        layout: 'layouts/shell',
      });
    }

    next();
  },
};

module.exports = csrfMiddleware;

