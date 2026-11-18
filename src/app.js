const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./utils/logger');
const { getConnectionStatus } = require('./config/db');
const mongoose = require('mongoose');
const configureSession = require('./config/session');
const correlationIdMiddleware = require('./middlewares/correlationId');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

// Pre-load and register all Mongoose models
require('./models');

// Admin Routes
const authRoutes = require('./routes/admin/authRoutes');
const launchpadRoutes = require('./routes/admin/launchpadRoutes');
const contentEditorRoutes = require('./routes/admin/contentEditorRoutes');
const templateManagerRoutes = require('./routes/admin/templateManagerRoutes');
const adminMediaRoutes = require('./routes/admin/mediaRoutes');
const itemRoutes = require('./routes/api/itemRoutes');
const templateRoutes = require('./routes/api/templateRoutes');
const languageRoutes = require('./routes/api/languageRoutes');
const apiMediaRoutes = require('./routes/api/mediaRoutes');
const adminPresentationRoutes = require('./routes/admin/presentationRoutes');
const apiPresentationRoutes = require('./routes/api/presentationRoutes');
const adminWorkboxRoutes = require('./routes/admin/workboxRoutes');
const adminPublishRoutes = require('./routes/admin/publishRoutes');
const adminDatabaseRoutes = require('./routes/admin/databaseRoutes');
const apiPublishRoutes = require('./routes/api/publishRoutes');
const apiWorkboxRoutes = require('./routes/api/workboxRoutes');
const apiDatabaseRoutes = require('./routes/api/databaseRoutes');
const adminSecurityRoutes = require('./routes/admin/securityRoutes');
const apiSecurityRoutes = require('./routes/api/securityRoutes');
const adminRecycleBinRoutes = require('./routes/admin/recycleBinRoutes');
const apiRecycleBinRoutes = require('./routes/api/recycleBinRoutes');
const adminAuditRoutes = require('./routes/admin/auditRoutes');
const apiAuditRoutes = require('./routes/api/auditRoutes');
const adminBasicAuthRoutes = require('./routes/admin/basicAuthRoutes');
const apiBasicAuthRoutes = require('./routes/api/basicAuthRoutes');
const adminSerializationRoutes = require('./routes/admin/serializationRoutes');
const apiSerializationRoutes = require('./routes/api/serializationRoutes');
const adminLanguageRoutes = require('./routes/admin/languageRoutes');
const adminBackupRoutes = require('./routes/admin/backupRoutes');
const apiBackupRoutes = require('./routes/api/backupRoutes');
const adminControlPanelRoutes = require('./routes/admin/controlPanelRoutes');
const siteRoutes = require('./routes/site/siteRoutes');
const mediaController = require('./controllers/admin/mediaController');
const contentEditorController = require('./controllers/admin/contentEditorController');
const { requireAuth } = require('./middlewares/authMiddleware');
const csrfMiddleware = require('./middlewares/csrfMiddleware');
const basicAuthMiddleware = require('./middlewares/basicAuthMiddleware');
const maintenanceMiddleware = require('./middlewares/maintenanceMiddleware');

const app = express();
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// 0. Correlation ID Tracking (Task 12.E1)
app.use(correlationIdMiddleware);

// 1. Security Headers (Helmet with segregated CSP for Admin and Public Site - SEC-07)
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed below via segregated middleware
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: env.isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

// Admin CMS CSP (allows Tabler CDN, Google Fonts, TinyMCE)
const adminCspMiddleware = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', '*.cloudinary.com'],
    mediaSrc: ["'self'", 'https://res.cloudinary.com', '*.cloudinary.com'],
    connectSrc: ["'self'", 'https://res.cloudinary.com', 'https://api.cloudinary.com', '*.cloudinary.com'],
  },
});

// Public Site CSP (strict: NO unsafe-eval)
const siteCspMiddleware = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', '*.cloudinary.com'],
    mediaSrc: ["'self'", 'https://res.cloudinary.com', '*.cloudinary.com'],
    connectSrc: ["'self'"],
  },
});

app.use((req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    adminCspMiddleware(req, res, next);
  } else {
    siteCspMiddleware(req, res, next);
  }
});

// 2. HTTP Request Compression & Logging
app.use(compression());
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// 3. Body Parsing & Cookie Handling with payload limits (SEC-08)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// 4. Session Configuration
app.use(configureSession());

// 5. Static Files (DEC-056: Dual Static Mount for Core and Site)
const sitePaths = require('./config/sitePaths');
app.use(express.static(sitePaths.ADMIN_PUBLIC_DIR));
if (!sitePaths.isStandaloneMode && sitePaths.PUBLIC_DIR !== sitePaths.ADMIN_PUBLIC_DIR) {
  app.use(express.static(sitePaths.PUBLIC_DIR));
}

// 6. Template Engine (EJS + Express Layouts)
app.set('view engine', 'ejs');
const viewsDirs = sitePaths.isStandaloneMode
  ? [sitePaths.ADMIN_VIEWS_DIR]
  : [sitePaths.ADMIN_VIEWS_DIR, sitePaths.VIEWS_DIR];
app.set('views', viewsDirs);
app.use(expressLayouts);
app.set('layout', 'layouts/shell');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

const { resolveItemIcon, renderIconHtml, getIconUrl } = require('./config/icons');
const { fieldRegistry } = require('./fields');

// 7. Global Template Variables & CSRF Token
const dbGuard = require('./config/dbGuard');
app.use(csrfMiddleware.generateToken);
app.use((req, res, next) => {
  res.locals.appName = env.APP_NAME;
  res.locals.appEnv = env.APP_ENV;
  res.locals.envBadge = dbGuard.getEnvironmentBadge(env.APP_ENV);
  res.locals.dbName = dbGuard.extractDatabaseName(env.MONGO_URI);
  res.locals.currentPath = req.path;
  res.locals.flashMessages = [];
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  res.locals.resolveItemIcon = resolveItemIcon;
  res.locals.renderIconHtml = renderIconHtml;
  res.locals.getIconUrl = getIconUrl;
  res.locals.fieldRegistry = fieldRegistry;
  next();
});

// 8. Base Routes
// Liveness Probe Endpoint (Task 12.D3)
app.get('/health', (req, res) => {
  if (app.locals.isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      message: 'Server is currently shutting down',
      timestamp: new Date().toISOString(),
    });
  }

  const dbStatus = getConnectionStatus();
  return res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    db: dbStatus,
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe Endpoint (Task 12.D3)
app.get('/ready', async (req, res) => {
  if (app.locals.isShuttingDown) {
    return res.status(503).json({
      status: 'not_ready',
      reason: 'Server is shutting down',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const isDbConnected = getConnectionStatus() === 'connected' && mongoose.connection.readyState === 1;
    if (!isDbConnected || !mongoose.connection.db) {
      return res.status(503).json({
        status: 'not_ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    // Ping MongoDB directly to verify socket responsiveness
    await mongoose.connection.db.admin().ping();

    // Verify key collections are accessible
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    const hasCoreCollections = collectionNames.includes('items_master') || collectionNames.includes('system_settings');

    return res.status(200).json({
      status: 'ready',
      database: {
        status: 'connected',
        name: dbGuard.extractDatabaseName(env.MONGO_URI),
        collectionsCount: collectionNames.length,
        hasCoreCollections,
      },
      maintenance: env.MAINTENANCE_MODE,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Maintenance Mode Middleware (DEC-051 / GĐ K1)
app.use(maintenanceMiddleware);

// 9. Admin App & API Routes
// Public media file serving (kèm alias phòng thủ cho các client gửi relative URL)
app.get([
  '/media/file/:id',
  '/admin/media/file/:id',
  '/admin/content-editor/media/file/:id'
], (req, res, next) => mediaController.serveFile(req, res, next));

// 8. Basic Auth Perimeter Defense for Admin CMS (GĐ B1 / DEC-050)
app.use('/admin', basicAuthMiddleware);

app.use('/admin', authRoutes);
app.get('/admin/preview', requireAuth, (req, res, next) => contentEditorController.previewItem(req, res, next));
app.use('/admin/launchpad', launchpadRoutes);
app.use('/admin/content-editor', contentEditorRoutes);
app.use('/admin/template-manager', templateManagerRoutes);
app.use('/admin/content-editor', adminPresentationRoutes);
app.use('/admin/media-library', adminMediaRoutes);
app.use('/admin/media', adminMediaRoutes);
app.use('/admin/workbox', adminWorkboxRoutes);
app.use('/admin/publish-manager', adminPublishRoutes);
app.use('/admin/databases', adminDatabaseRoutes);
app.use('/admin/security', adminSecurityRoutes);
app.use('/admin/recycle-bin', adminRecycleBinRoutes);
app.use('/admin/audit-log', adminAuditRoutes);
app.use('/admin/basic-auth', adminBasicAuthRoutes);
app.use('/admin/serialization', adminSerializationRoutes);
app.use('/admin/languages', adminLanguageRoutes);
app.use('/admin/backups', adminBackupRoutes);
app.use('/admin/control-panel', adminControlPanelRoutes);
app.use('/api/presentation', apiPresentationRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/media', apiMediaRoutes);
app.use('/api/publish', apiPublishRoutes);
app.use('/api/workbox', apiWorkboxRoutes);
app.use('/api/databases', apiDatabaseRoutes);
app.use('/api/security', apiSecurityRoutes);
app.use('/api/recycle-bin', apiRecycleBinRoutes);
app.use('/api/audit', apiAuditRoutes);
app.use('/api/basic-auth', apiBasicAuthRoutes);
app.use('/api/serialization', apiSerializationRoutes);
app.use('/api/backups', apiBackupRoutes);

// 10. Public Site Renderer (100% Server-Side EJS - DEC-031 / GĐ 10)
app.use('/', siteRoutes);

// 11. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
