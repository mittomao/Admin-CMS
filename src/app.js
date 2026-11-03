const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const logger = require('./utils/logger');
const { getConnectionStatus } = require('./config/db');
const configureSession = require('./config/session');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

// Pre-load and register all Mongoose models
require('./models');

// Admin Routes
const authRoutes = require('./routes/admin/authRoutes');
const launchpadRoutes = require('./routes/admin/launchpadRoutes');
const contentEditorRoutes = require('./routes/admin/contentEditorRoutes');
const itemRoutes = require('./routes/api/itemRoutes');
const csrfMiddleware = require('./middlewares/csrfMiddleware');

const app = express();

// 1. Security Headers (Helmet with relaxed CSP for local assets, Tabler CDN & Google Fonts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

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

// 3. Body Parsing & Cookie Handling
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Session Configuration
app.use(configureSession());

// 5. Static Files
app.use(express.static(path.join(__dirname, '../public')));

// 6. Template Engine (EJS + Express Layouts)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/shell');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// 7. Global Template Variables & CSRF Token
app.use(csrfMiddleware.generateToken);
app.use((req, res, next) => {
  res.locals.appName = env.APP_NAME;
  res.locals.currentPath = req.path;
  res.locals.flashMessages = [];
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});

// 8. Base Routes
// Health Check Endpoint
app.get('/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({
    status: 'ok',
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Root Redirect to Launchpad
app.get('/', (req, res) => {
  res.redirect('/admin/launchpad');
});

// 9. Admin App & API Routes
app.use('/admin', authRoutes);
app.use('/admin/launchpad', launchpadRoutes);
app.use('/admin/content-editor', contentEditorRoutes);
app.use('/api/items', itemRoutes);

// 10. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
