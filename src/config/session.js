const session = require('express-session');
const connectMongo = require('connect-mongo');
const env = require('./env');
const logger = require('../utils/logger');

// Support both default and named export of MongoStore across CJS / ESM bundlers
const MongoStore = connectMongo.create
  ? connectMongo
  : connectMongo.default || connectMongo.MongoStore;

const configureSession = () => {
  let store;

  if (process.env.NODE_ENV === 'test') {
    store = new session.MemoryStore();
  } else {
    try {
      store = MongoStore.create({
        mongoUrl: env.MONGO_URI,
        collectionName: 'sessions',
        ttl: Math.floor(env.SESSION_MAX_AGE / 1000),
        touchAfter: 24 * 3600,
      });

      store.on('error', (err) => {
        logger.error(`[Session Store] Error: ${err.message}`);
      });
      logger.info('Session store initialized with MongoDB connection.');
    } catch (error) {
      logger.warn(`[Session Store] Falling back to MemoryStore: ${error.message}`);
      store = new session.MemoryStore();
    }
  }

  return session({
    name: env.SESSION_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: env.isProd,
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE,
    },
  });
};

module.exports = configureSession;
