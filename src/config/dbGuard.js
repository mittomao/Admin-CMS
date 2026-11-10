/**
 * dbGuard - Trung tâm kiểm soát an toàn kết nối và chốt chặn môi trường Database
 * Kiến trúc: DEC-052 (Tách môi trường Database Local / Cloud và Chốt chặn an toàn)
 * Dự án: Treecraft CMS
 */

const { URL } = require('url');

/**
 * Phân loại máy chủ MongoDB thành 'local' hoặc 'remote'
 * @param {string} uri Chuỗi kết nối MongoDB
 * @returns {'local' | 'remote'}
 */
function classifyHost(uri) {
  if (!uri || typeof uri !== 'string') return 'remote';

  const trimmed = uri.trim();

  // mongodb+srv luôn là remote (DNS seed list trên Cloud/Atlas)
  if (trimmed.startsWith('mongodb+srv:')) {
    return 'remote';
  }

  try {
    // Trích xuất phần host từ mongodb://
    // Chuỗi có dạng: mongodb://[user:pass@]host1[:port1][,host2[:port2]]/dbName...
    const withoutProtocol = trimmed.replace(/^mongodb:\/\//, '');
    const withoutAuth = withoutProtocol.includes('@')
      ? withoutProtocol.split('@')[1]
      : withoutProtocol;
    const hostAndPortPart = withoutAuth.split('/')[0].split('?')[0];
    const hosts = hostAndPortPart.split(',').map((h) => h.split(':')[0].toLowerCase().trim());

    const isAllLocal = hosts.every((host) => {
      return (
        host === '127.0.0.1' ||
        host === 'localhost' ||
        host === '::1' ||
        host === 'mongo' || // Docker compose service name
        host.startsWith('127.0.0.') ||
        host.endsWith('.local')
      );
    });

    return isAllLocal ? 'local' : 'remote';
  } catch (err) {
    return 'remote';
  }
}

/**
 * Trích xuất tên database từ URI MongoDB
 * @param {string} uri Chuỗi kết nối MongoDB
 * @returns {string} Tên database hoặc 'admin_cms' mặc định
 */
function extractDatabaseName(uri) {
  if (!uri || typeof uri !== 'string') return 'admin_cms';
  try {
    const withoutQuery = uri.split('?')[0];
    const lastSlash = withoutQuery.lastIndexOf('/');
    if (lastSlash !== -1 && lastSlash < withoutQuery.length - 1) {
      const db = withoutQuery.substring(lastSlash + 1);
      if (db && !db.includes('@') && !db.includes(':')) {
        return db;
      }
    }
  } catch (err) {
    // fallback
  }
  return 'admin_cms';
}

/**
 * Che giấu thông tin nhạy cảm (mật khẩu, một phần host) để ghi log an toàn
 * @param {string} uri Chuỗi kết nối MongoDB
 * @returns {string} Chuỗi URI đã được che giấu
 */
function maskUri(uri) {
  if (!uri || typeof uri !== 'string') return '[empty-uri]';

  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/g, '//$1:****@');
  } catch (err) {
    return '[masked-uri]';
  }
}

/**
 * Kiểm tra tính hợp lệ của kết nối dựa trên APP_ENV và phân loại host
 * @param {string} uri Chuỗi kết nối MongoDB
 * @param {'development' | 'staging' | 'production'} appEnv Môi trường ứng dụng
 * @param {Object} [options]
 * @param {boolean} [options.allowRemoteInDev=false]
 */
function validateConnection(uri, appEnv, options = {}) {
  const hostType = classifyHost(uri);
  const masked = maskUri(uri);
  const allowRemoteInDev = options.allowRemoteInDev === true;

  if (appEnv === 'development') {
    if (hostType === 'remote') {
      if (!allowRemoteInDev) {
        throw new Error(
          `[dbGuard FATAL] Chặn kết nối: Môi trường "development" không được phép kết nối tới database Remote/Cloud (${masked}).\n` +
          `Để đảm bảo an toàn tuyệt đối, vui lòng khởi động MongoDB Docker local:\n` +
          `  npm run db:up\n` +
          `Nếu bạn thật sự cần kết nối tạm thời tới Cloud trong môi trường dev, hãy đặt:\n` +
          `  ALLOW_REMOTE_DB_IN_DEV=true trong file .env.development`
        );
      } else {
        console.warn(
          '\x1b[41m\x1b[37m%s\x1b[0m',
          `[dbGuard CẢNH BÁO NGUY HIỂM] Môi trường "development" ĐANG KẾT NỐI TỚI DATABASE REMOTE/CLOUD (${masked}). ` +
          `Mọi thao tác ghi/xóa có thể tác động trực tiếp đến dữ liệu Cloud!`
        );
      }
    }
  } else if (appEnv === 'production') {
    if (hostType === 'local') {
      throw new Error(
        `[dbGuard FATAL] Chặn kết nối: Môi trường "production" không được phép kết nối tới MongoDB Local (${masked}). ` +
        `Vui lòng cấu hình cụm Cloud MongoDB chính thức trong .env.production.`
      );
    }
  } else if (appEnv === 'staging') {
    if (hostType === 'local') {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        `[dbGuard CẢNH BÁO] Môi trường "staging" đang kết nối tới MongoDB Local (${masked}). Khuyến nghị dùng staging cloud cluster.`
      );
    }
  }

  return { hostType, masked };
}

/**
 * Xác minh dấu vân tay môi trường trong collection 'settings'
 * @param {Object} db Native Mongo Db instance (hoặc mongoose.connection.db)
 * @param {'development' | 'staging' | 'production'} appEnv Môi trường hiện tại
 * @param {Object} [options]
 */
async function verifyFingerprint(db, appEnv, options = {}) {
  if (!db || typeof db.collection !== 'function') return null;

  try {
    const doc = await db.collection('settings').findOne({ key: 'environmentFingerprint' });
    if (doc && doc.value) {
      const recordedEnv = doc.value.appEnv;
      if (recordedEnv && recordedEnv !== appEnv) {
        throw new Error(
          `[dbGuard MISMATCH] Database hiện tại đã được đóng dấu môi trường "${recordedEnv}" ` +
          `(gắn bởi ${doc.value.taggedBy || 'unknown'} lúc ${doc.value.taggedAt || 'unknown'}), ` +
          `nhưng ứng dụng đang chạy với APP_ENV="${appEnv}". ` +
          `Khởi động bị TỪ CHỐI để ngăn ngừa nhầm lẫn dữ liệu giữa các môi trường!`
        );
      }
      return doc.value;
    }

    // Chưa có dấu vân tay:
    const hostType = classifyHost(options.uri || '');
    if (appEnv === 'development' && hostType === 'local') {
      // Tự động đóng dấu cho local dev DB mới
      await stampFingerprint(db, 'development', 'system:auto-init');
      return { appEnv: 'development', autoTagged: true };
    } else {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        `[dbGuard CẢNH BÁO] Database chưa có dấu vân tay môi trường (settings.environmentFingerprint). ` +
        `Khuyến nghị chạy "npm run db:init-fingerprint" để xác thực môi trường.`
      );
      return null;
    }
  } catch (err) {
    if (err.message && err.message.includes('[dbGuard MISMATCH]')) {
      throw err;
    }
    // Gặp lỗi khác (ví dụ collection chưa tồn tại trong DB mới), bỏ qua
    return null;
  }
}

/**
 * Đóng dấu vân tay môi trường vào collection 'settings'
 * @param {Object} db Native Mongo Db instance
 * @param {'development' | 'staging' | 'production'} appEnv
 * @param {string} [taggedBy='system']
 */
async function stampFingerprint(db, appEnv, taggedBy = 'system') {
  if (!db || typeof db.collection !== 'function') return;

  const now = new Date();
  await db.collection('settings').updateOne(
    { key: 'environmentFingerprint' },
    {
      $set: {
        key: 'environmentFingerprint',
        value: {
          appEnv,
          projectName: 'Treecraft',
          taggedAt: now,
          taggedBy,
        },
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

/**
 * Chốt chặn các thao tác nhạy cảm / phá hủy dữ liệu (seed, reset, migration, restore)
 * @param {'destructive' | 'migration' | 'restore'} actionType
 * @param {Object} context
 * @param {string} context.uri
 * @param {'development' | 'staging' | 'production'} context.appEnv
 * @param {string} context.scriptName
 * @param {boolean} [context.confirmedRemote=false]
 */
function assertSafeFor(actionType, context = {}) {
  const { uri, appEnv, scriptName = 'script', confirmedRemote = false } = context;
  const hostType = classifyHost(uri || '');
  const masked = maskUri(uri || '');

  if (actionType === 'destructive') {
    // Các lệnh phá hủy dữ liệu: seed:reset, db:reset-local, v.v.
    if (hostType === 'remote') {
      throw new Error(
        `[dbGuard DESTRUCTIVE BLOCK] Lệnh "${scriptName}" có tính chất PHÁ HỦY / XÓA TOÀN BỘ dữ liệu ` +
        `và BỊ CẤM TUYỆT ĐỐI trên máy chủ Remote/Cloud (${masked})!\n` +
        `Lệnh này CHỈ được phép chạy trên MongoDB Local (127.0.0.1).`
      );
    }
    if (appEnv === 'production') {
      throw new Error(
        `[dbGuard DESTRUCTIVE BLOCK] Lệnh "${scriptName}" BỊ CẤM TUYỆT ĐỐI trong môi trường "production"!`
      );
    }
  } else if (actionType === 'restore' || actionType === 'migration') {
    if (hostType === 'remote' && !confirmedRemote) {
      throw new Error(
        `[dbGuard GUARD] Lệnh "${scriptName}" tác động lên database Remote/Cloud (${masked}). ` +
        `Để tiếp tục, bạn phải truyền cờ xác nhận tường minh --confirm-remote hoặc biến CONFIRM_REMOTE_ACTION=true.`
      );
    }
  }
}

/**
 * Trả về thông tin hiển thị Badge môi trường trên thanh công cụ Admin
 * @param {'development' | 'staging' | 'production'} appEnv
 */
function getEnvironmentBadge(appEnv) {
  switch (appEnv) {
    case 'development':
      return {
        name: 'development',
        label: 'DEV (LOCAL)',
        shortLabel: 'DEV',
        badgeClass: 'badge-env-dev',
        bgHex: '#10b981', // Emerald 500
        textHex: '#ffffff',
        borderHex: '#059669',
        isLocal: true,
      };
    case 'staging':
      return {
        name: 'staging',
        label: 'STAGING (CLOUD)',
        shortLabel: 'STAGING',
        badgeClass: 'badge-env-staging',
        bgHex: '#f59e0b', // Amber 500
        textHex: '#1e293b',
        borderHex: '#d97706',
        isLocal: false,
      };
    case 'production':
      return {
        name: 'production',
        label: 'PRODUCTION',
        shortLabel: 'PROD',
        badgeClass: 'badge-env-prod',
        bgHex: '#e11d48', // Rose 600
        textHex: '#ffffff',
        borderHex: '#be123c',
        isLocal: false,
      };
    default:
      return {
        name: appEnv || 'unknown',
        label: (appEnv || 'UNKNOWN').toUpperCase(),
        shortLabel: (appEnv || 'UNK').toUpperCase(),
        badgeClass: 'badge-env-unknown',
        bgHex: '#64748b',
        textHex: '#ffffff',
        borderHex: '#475569',
        isLocal: false,
      };
  }
}

/**
 * In Banner khởi động đẹp mắt và rõ ràng trên Terminal
 * @param {Object} params
 */
function printStartupBanner(params = {}) {
  const {
    appEnv = 'development',
    uri = '',
    port = 4000,
    dbName = 'admin_cms',
    cloudinaryFolder = 'AdminCMS-dev',
  } = params;

  const hostType = classifyHost(uri);
  const masked = maskUri(uri);
  const badge = getEnvironmentBadge(appEnv);

  const envColorCode =
    appEnv === 'development'
      ? '\x1b[32m' // Green
      : appEnv === 'staging'
      ? '\x1b[33m' // Yellow
      : '\x1b[31m'; // Red
  const resetCode = '\x1b[0m';
  const boldCode = '\x1b[1m';
  const cyanCode = '\x1b[36m';

  console.log('\n' + '='.repeat(68));
  console.log(`  ${boldCode}TREECRAFT CMS${resetCode} — Enterprise Hierarchical Content Management`);
  console.log('='.repeat(68));
  console.log(`  Môi trường (APP_ENV)   : ${envColorCode}${boldCode}[ ${badge.label} ]${resetCode}`);
  console.log(`  Cổng lắng nghe (PORT)  : ${cyanCode}http://localhost:${port}${resetCode}`);
  console.log(`  Database Mục tiêu      : ${boldCode}${dbName}${resetCode} (${hostType.toUpperCase()})`);
  console.log(`  MongoDB Connection     : ${masked}`);
  console.log(`  Cloudinary Phân vùng   : ${cloudinaryFolder}`);
  console.log(`  Chốt chặn dbGuard      : ${'\x1b[32m'}ĐANG KÍCH HOẠT (ACTIVE)${resetCode}`);
  console.log('='.repeat(68) + '\n');
}

module.exports = {
  classifyHost,
  extractDatabaseName,
  maskUri,
  validateConnection,
  verifyFingerprint,
  stampFingerprint,
  assertSafeFor,
  getEnvironmentBadge,
  printStartupBanner,
};

