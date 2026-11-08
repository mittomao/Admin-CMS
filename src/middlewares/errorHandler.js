const env = require('../config/env');
const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  const isApi = req.originalUrl.startsWith('/api/') || 
    (req.accepts('json') && !req.accepts('html'));

  if (isApi) {
    return res.status(404).json({
      success: false,
      message: `Endpoint ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
    });
  }

  res.status(404).render('errors/404', {
    title: '404 - Item Not Found',
    currentPath: req.originalUrl,
    activeApp: null,
    user: { fullName: 'Treecraft User', username: 'admin' },
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected server error occurred';

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${err.stack || message}`);

  const isApi = req.originalUrl.startsWith('/api/') || 
    (req.accepts('json') && !req.accepts('html'));

  if (isApi) {
    return res.status(statusCode).json({
      success: false,
      message: message,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      ...(env.isDev ? { stack: err.stack } : {}),
    });
  }

  res.status(statusCode).render('errors/500', {
    title: '500 - Server Error',
    statusCode,
    message,
    stack: env.isDev ? err.stack : null,
    currentPath: req.originalUrl,
    activeApp: null,
    user: { fullName: 'Treecraft User', username: 'admin' },
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

