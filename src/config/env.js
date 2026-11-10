const dotenv = require('dotenv');
const path = require('path');
const branding = require('./branding');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredEnvVars = ['PORT', 'NODE_ENV', 'MONGO_URI'];

// Validate Cloudinary credentials in non-test environments if provider is cloudinary
if (process.env.STORAGE_PROVIDER === 'cloudinary' && process.env.NODE_ENV !== 'test') {
  requiredEnvVars.push('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
}

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(
    `[Config Error] Missing mandatory environment variables: ${missingVars.join(', ')}. Please check your .env file.`
  );
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  APP_NAME: process.env.APP_NAME || branding.PROJECT_TITLE,
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  MONGO_URI: process.env.MONGO_URI,
  SESSION_SECRET: process.env.SESSION_SECRET || 'default_insecure_session_secret_2026',
  SESSION_NAME: process.env.SESSION_NAME || branding.SESSION_COOKIE_NAME,
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'cloudinary',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_ROOT_FOLDER: process.env.CLOUDINARY_ROOT_FOLDER || process.env.CLOUDINARY_API_FOLDER || branding.CLOUDINARY_DEFAULT_ROOT,
  SITE_START_ITEM: process.env.SITE_START_ITEM || branding.PATHS.START_ITEM,
  SITE_CACHE: process.env.SITE_CACHE !== 'false',
  SITE_CACHE_TTL: parseInt(process.env.SITE_CACHE_TTL || '300', 10),
  SITE_CACHE_MAX_ITEMS: parseInt(process.env.SITE_CACHE_MAX_ITEMS || '500', 10),
  RECYCLE_BIN_RETENTION_DAYS: parseInt(process.env.RECYCLE_BIN_RETENTION_DAYS || '30', 10),
  AUDIT_RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
  BASIC_AUTH_ENABLED: process.env.BASIC_AUTH_ENABLED, // 'false' overrides DB to disable
  BASIC_AUTH_REALM: process.env.BASIC_AUTH_REALM || branding.PROJECT_NAME,
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  // Backup & Restore Configuration (GĐ K1)
  BACKUP_DIR: path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'storage', 'backups')),
  BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY || '',
  BACKUP_RETENTION_COUNT: parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10),
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  MONGODUMP_PATH: process.env.MONGODUMP_PATH || 'mongodump',
  MONGORESTORE_PATH: process.env.MONGORESTORE_PATH || 'mongorestore',
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true' || process.env.MAINTENANCE_MODE === '1',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;

