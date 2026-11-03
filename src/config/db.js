const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connection established successfully.');
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
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    isConnected = false;
    logger.error(`Failed to connect to MongoDB at ${env.MONGO_URI}: ${error.message}`);
    if (env.isProd) {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  if (isConnected) {
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

