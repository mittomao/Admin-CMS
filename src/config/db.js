const mongoose = require('mongoose');
const env = require('./env');
const dbGuard = require('./dbGuard');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  try {
    // 1. Chốt chặn dbGuard: Xác thực tính an toàn của kết nối trước khi mở socket
    dbGuard.validateConnection(env.MONGO_URI, env.APP_ENV, {
      allowRemoteInDev: env.ALLOW_REMOTE_DB_IN_DEV,
    });

    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info(`MongoDB connection established successfully to [${dbGuard.maskUri(env.MONGO_URI)}].`);
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB connection lost/disconnected.');
    });

    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    });

    // 2. Chốt chặn dbGuard: Xác minh dấu vân tay môi trường (Fingerprint Verification)
    if (mongoose.connection && mongoose.connection.db) {
      await dbGuard.verifyFingerprint(mongoose.connection.db, env.APP_ENV, {
        uri: env.MONGO_URI,
      });
    }
  } catch (error) {
    isConnected = false;
    logger.error(`Failed to connect to MongoDB at [${dbGuard.maskUri(env.MONGO_URI)}]: ${error.message}`);
    // Ném lỗi ra ngoài để server hoặc test suite phát hiện ngay lập tức
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed through app termination.');
  }
};

const getConnectionStatus = () => {
  // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
};
