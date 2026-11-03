const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredEnvVars = ['PORT', 'NODE_ENV', 'MONGO_URI'];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(
    `[Config Error] Missing mandatory environment variables: ${missingVars.join(', ')}. Please check your .env file.`
  );
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  APP_NAME: process.env.APP_NAME || 'Sitecore XM CMS',
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  MONGO_URI: process.env.MONGO_URI,
  SESSION_SECRET: process.env.SESSION_SECRET || 'default_insecure_session_secret_2026',
  SESSION_NAME: process.env.SESSION_NAME || 'cms_session_id',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;
