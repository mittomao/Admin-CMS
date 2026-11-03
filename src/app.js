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
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

// Admin Routes
const launchpadRoutes = require('./routes/admin/launchpadRoutes');
const contentEditorRoutes = require('./routes/admin/contentEditorRoutes');

const app = express();

// 1. Security Headers (Helmet with relaxed CSP for local assets & inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
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

// 4. Static Files
app.use(express.static(path.join(__dirname, '../public')));

// 5. Template Engine (EJS + Express Layouts)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/shell');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// 6. Global Template Variables
app.use((req, res, next) => {
  res.locals.appName = env.APP_NAME;
  res.locals.currentPath = req.path;
  res.locals.flashMessages = [];
  next();
});

// 7. Base Routes
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

// 8. Admin App Routes
app.use('/admin/launchpad', launchpadRoutes);
app.use('/admin/content-editor', contentEditorRoutes);

// 9. Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

