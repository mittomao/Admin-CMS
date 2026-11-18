const http = require('http');
const app = require('./app');
const env = require('./config/env');
const sitePaths = require('./config/sitePaths');
const dbGuard = require('./config/dbGuard');
const { connectDB, disconnectDB } = require('./config/db');
const backupService = require('./services/backupService');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    // Kiểm tra tính bất biến của Core Submodule (SEC-10 / GĐ 12)
    const coreStatus = sitePaths.verifyCoreImmutability({ throwOnError: env.isProd });
    if (!coreStatus.isClean) {
      logger.warn(`[Core Security] ${coreStatus.message}`);
    }

    // In Banner nhận diện môi trường và cấu hình
    dbGuard.printStartupBanner({
      appEnv: env.APP_ENV,
      uri: env.MONGO_URI,
      port: env.PORT,
      dbName: dbGuard.extractDatabaseName(env.MONGO_URI),
      cloudinaryFolder: env.CLOUDINARY_ROOT_FOLDER,
    });

    // 1. Initialize Database Connection with dbGuard verification
    await connectDB();

    // 2. Start HTTP Server
    server = http.createServer(app);

    // 3. Start background backup scheduler (DEC-051)
    backupService.startScheduler();

    server.listen(env.PORT, () => {
      logger.info('====================================================');
      logger.info(`  ${env.APP_NAME} is running`);
      logger.info(`  Mode: ${env.NODE_ENV}`);
      logger.info(`  URL:  ${env.APP_URL}`);
      logger.info(`  PID:  ${process.pid}`);
      logger.info('====================================================');
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handler (Task 12.D4)
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  app.locals.isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop background cron jobs
  try {
    backupService.stopScheduler();
  } catch (err) {
    logger.warn(`Error stopping backup scheduler: ${err.message}`);
  }

  if (server) {
    // Close idle connections to speed up drain
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      logger.info('Graceful shutdown complete.');
      process.exit(0);
    });

    // Force shutdown after 10s if hanging
    setTimeout(() => {
      logger.error('Force shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}\n${error.stack}`);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

