const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const branding = require('./branding');
const sitePaths = require('./sitePaths');

// Ghi nhận các biến có sẵn từ OS process.env để đảm bảo chúng luôn có quyền ưu tiên cao nhất
const osEnvKeys = new Set(Object.keys(process.env));

// 1. Nạp file .env chính từ Site (DEC-056)
const mainEnvPath = sitePaths.getEnvPath();
if (fs.existsSync(mainEnvPath)) {
  const mainConfig = dotenv.parse(fs.readFileSync(mainEnvPath, 'utf8'));
  for (const k in mainConfig) {
    if (!osEnvKeys.has(k)) {
      process.env[k] = mainConfig[k];
    }
  }
}

// 2. Xác định và kiểm tra tính hợp lệ của APP_ENV (Strict 3-Tier Model)
const ALLOWED_ENVIRONMENTS = ['development', 'staging', 'production'];
let appEnv = process.env.APP_ENV ? process.env.APP_ENV.trim() : null;

if (appEnv) {
  if (!ALLOWED_ENVIRONMENTS.includes(appEnv)) {
    throw new Error(
      `[Config Error] Giá trị APP_ENV="${appEnv}" không hợp lệ. ` +
      `Chỉ chấp nhận một trong ba giá trị: ${ALLOWED_ENVIRONMENTS.map((e) => `"${e}"`).join(', ')}. ` +
      `(Không chấp nhận: dev, develop, test, prod, uat).`
    );
  }
} else {
  // Kiểm tra nếu có chuỗi kết nối Cloud MongoDB thì bắt buộc phải chỉ định APP_ENV rõ ràng
  const existingMongoUri = process.env.MONGO_URI || process.env.MONGO_URI_MASTER || '';
  const isCloudUri = existingMongoUri.includes('.mongodb.net') || existingMongoUri.startsWith('mongodb+srv:');
  if (isCloudUri) {
    throw new Error(
      '[Config Error] Phát hiện biến môi trường kết nối Cloud MongoDB nhưng thiếu APP_ENV. ' +
      'Vui lòng thiết lập biến APP_ENV rõ ràng (development, staging, production) trước khi khởi động.'
    );
  }
  // Mặc định là development
  appEnv = 'development';
  process.env.APP_ENV = 'development';
}

// 3. Nạp đè cấu hình theo môi trường (.env.${APP_ENV}) từ Site nếu tồn tại
const overrideEnvPath = sitePaths.getEnvPath(appEnv);
if (fs.existsSync(overrideEnvPath) && overrideEnvPath !== mainEnvPath) {
  const overrideConfig = dotenv.parse(fs.readFileSync(overrideEnvPath, 'utf8'));
  for (const k in overrideConfig) {
    // Chỉ nạp đè nếu biến đó KHÔNG được truyền trực tiếp từ môi trường hệ điều hành
    if (!osEnvKeys.has(k)) {
      process.env[k] = overrideConfig[k];
    }
  }
}

// 4. Đồng bộ NODE_ENV
const isTestMode = process.env.NODE_ENV === 'test';
if (!isTestMode) {
  if (appEnv === 'development') {
    process.env.NODE_ENV = 'development';
  } else if (appEnv === 'staging' || appEnv === 'production') {
    process.env.NODE_ENV = 'production';
  }
}

// 5. Kiểm tra các biến bắt buộc
const requiredEnvVars = ['PORT', 'MONGO_URI'];

if (process.env.STORAGE_PROVIDER === 'cloudinary' && !isTestMode) {
  requiredEnvVars.push('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET');
}

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  throw new Error(
    `[Config Error] Thiếu các biến môi trường bắt buộc: ${missingVars.join(', ')}. ` +
    `Vui lòng kiểm tra file .env hoặc ${overrideEnvFile}.`
  );
}

// 6. Xây dựng và xuất cấu hình chuẩn hoá
const env = {
  APP_ENV: appEnv,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOW_REMOTE_DB_IN_DEV: process.env.ALLOW_REMOTE_DB_IN_DEV === 'true',
  PORT: parseInt(process.env.PORT, 10) || 4000,
  APP_NAME: process.env.APP_NAME || branding.PROJECT_TITLE,
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`,
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
  BASIC_AUTH_ENABLED: process.env.BASIC_AUTH_ENABLED,
  BASIC_AUTH_REALM: process.env.BASIC_AUTH_REALM || branding.PROJECT_NAME,
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
  // Backup & Restore Configuration (GĐ K1 / GĐ E1 / DEC-056: isolated per environment under site/backups)
  BACKUP_DIR: path.resolve(process.env.BACKUP_DIR || path.join(sitePaths.getBackupsDir(), appEnv)),
  BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY || '',
  BACKUP_RETENTION_COUNT: parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10),
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  MONGODUMP_PATH: process.env.MONGODUMP_PATH || 'mongodump',
  MONGORESTORE_PATH: process.env.MONGORESTORE_PATH || 'mongorestore',
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true' || process.env.MAINTENANCE_MODE === '1',
  // Serialization Directory (DEC-054 / DEC-056: defaults to site/serialization)
  SERIALIZATION_DIR: process.env.SERIALIZATION_DIR || sitePaths.getSerializationDir(),
  isDev: appEnv === 'development',
  isStaging: appEnv === 'staging',
  isProd: appEnv === 'production',
};

module.exports = env;
