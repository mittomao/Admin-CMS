/**
 * Authentication & Authorization Middlewares
 */

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    res.locals.user = req.session.user;
    return next();
  }

  const isApi = req.originalUrl.startsWith('/api/') || 
    (req.accepts('json') && !req.accepts('html'));

  if (isApi) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED',
    });
  }

  const returnUrl = encodeURIComponent(req.originalUrl);
  return res.redirect(`/admin/login?returnUrl=${returnUrl}`);
};

// Middleware to redirect logged-in users away from auth pages (login)
const guestOnly = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/admin/launchpad');
  }
  next();
};

// Middleware to check specific role membership
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).redirect('/admin/login');
    }

    const hasRole = req.user.roleNames && req.user.roleNames.some((r) => 
      allowedRoles.includes(r) || r.toLowerCase() === 'administrator'
    );

    if (!hasRole) {
      const isApi = req.originalUrl.startsWith('/api/') || 
        (req.accepts('json') && !req.accepts('html'));

      if (isApi) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.',
          code: 'FORBIDDEN',
        });
      }

      return res.status(403).render('errors/500', {
        title: '403 - Access Denied',
        statusCode: 403,
        message: 'You do not have sufficient permissions to access this application.',
        currentPath: req.originalUrl,
        activeApp: null,
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  guestOnly,
  requireRole,
};

