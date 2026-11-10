const http = require('http');
const app = require('./app');
const env = require('./config/env');
const dbGuard = require('./config/dbGuard');
const { connectDB, disconnectDB } = require('./config/db');
const backupService = require('./services/backupService');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
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

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  backupService.stopScheduler();
  if (server) {
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
    }, 10000);
  } else {
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

