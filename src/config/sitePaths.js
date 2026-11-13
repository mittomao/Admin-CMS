/**
 * Module Trung tâm Phân giải Đường dẫn (Single Source of Path Resolution)
 * Giải quyết mọi đường dẫn tài nguyên của Site và Core theo DEC-056.
 * Tuyệt đối không phụ thuộc vào process.cwd() hoặc vị trí cố định của Core.
 */

const path = require('path');
const fs = require('fs');
const { validateSiteConfig } = require('./siteConfigSchema');

let _cachedSiteDir = null;
let _cachedSiteConfig = null;

/**
 * Trích xuất cờ --site từ process.argv nếu có
 * Hỗ trợ cú pháp: --site /path/to/site hoặc --site=/path/to/site
 */
function extractSiteArg() {
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--site' && i + 1 < argv.length) {
      return argv[i + 1];
    }
    if (arg.startsWith('--site=')) {
      return arg.slice(7);
    }
  }
  return null;
}

/**
 * Tìm ngược lên cây thư mục từ một thư mục bắt đầu để tìm site.config.js
 * @param {string} startDir
 * @returns {string|null}
 */
function findUpSiteConfig(startDir) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir && currentDir !== root) {
    const candidateConfig = path.join(currentDir, 'site.config.js');
    if (fs.existsSync(candidateConfig)) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return null;
}

/**
 * Lấy đường dẫn gốc của Core engine (bất biến)
 * Luôn phân giải qua __dirname, không dùng process.cwd()
 */
function getCoreDir() {
  return path.resolve(__dirname, '../..');
}

/**
 * Phân giải thư mục SITE_DIR theo thứ tự ưu tiên (DEC-056)
 * 1. CLI option --site <path>
 * 2. Environment variable TREECRAFT_SITE_DIR
 * 3. Tìm ngược lên cây thư mục từ process.cwd() thấy site.config.js
 * 4. Thư mục site/ nằm cạnh core/ (sibling) hoặc ./site trong core (monolith/dev)
 * @param {object} [options]
 * @returns {string} Đường dẫn tuyệt đối tới thư mục site
 */
function resolveSiteDir(options = {}) {
  if (options.forceReload) {
    _cachedSiteDir = null;
    _cachedSiteConfig = null;
  }

  if (_cachedSiteDir && !options.customPath) {
    return _cachedSiteDir;
  }

  // 0. Custom path truyền trực tiếp qua options
  if (options.customPath) {
    const resolved = path.resolve(options.customPath);
    if (fs.existsSync(resolved)) {
      _cachedSiteDir = resolved;
      return resolved;
    }
    throw new Error(`[Treecraft] Thư mục site chỉ định không tồn tại: ${resolved}`);
  }

  // 1. Tham số dòng lệnh CLI --site <path>
  const cliSite = extractSiteArg();
  if (cliSite) {
    const resolved = path.resolve(cliSite);
    if (fs.existsSync(resolved)) {
      _cachedSiteDir = resolved;
      return resolved;
    }
    throw new Error(`[Treecraft] Thư mục site chỉ định qua --site không tồn tại: ${resolved}`);
  }

  // 2. Biến môi trường TREECRAFT_SITE_DIR
  if (process.env.TREECRAFT_SITE_DIR) {
    const resolved = path.resolve(process.env.TREECRAFT_SITE_DIR);
    if (fs.existsSync(resolved)) {
      _cachedSiteDir = resolved;
      return resolved;
    }
    throw new Error(`[Treecraft] Thư mục TREECRAFT_SITE_DIR không tồn tại: ${resolved}`);
  }

  // 3. Tìm ngược từ process.cwd() thấy site.config.js
  const upwardFound = findUpSiteConfig(process.cwd());
  if (upwardFound) {
    _cachedSiteDir = upwardFound;
    return upwardFound;
  }

  // 4. Thư mục site/ nằm cạnh core/ (sibling)
  const coreDir = getCoreDir();
  const siblingSite = path.resolve(coreDir, '../site');
  if (fs.existsSync(path.join(siblingSite, 'site.config.js')) || fs.existsSync(siblingSite)) {
    _cachedSiteDir = siblingSite;
    return siblingSite;
  }

  // 5. Thư mục ./site nằm trong core (hỗ trợ chuyển đổi monolith & dev)
  const nestedSite = path.resolve(coreDir, 'site');
  if (fs.existsSync(nestedSite)) {
    _cachedSiteDir = nestedSite;
    return nestedSite;
  }

  // 6. Fallback về coreDir nếu đang trong quá trình chuyển đổi và có file cấu hình / env tại gốc
  if (fs.existsSync(path.join(coreDir, 'site.config.js')) || fs.existsSync(path.join(coreDir, '.env'))) {
    _cachedSiteDir = coreDir;
    return coreDir;
  }

  // Không tìm thấy thư mục site hợp lệ
  throw new Error(
    `[Treecraft Error] Không tìm thấy thư mục dự án (site/) hợp lệ!\n` +
    `Treecraft yêu cầu một thư mục site chứa site.config.js.\n` +
    `Cách khắc phục:\n` +
    `  1. Khởi tạo site mới bằng lệnh: npx treecraft init [tên_thư_mục]\n` +
    `  2. Hoặc chỉ định đường dẫn site: treecraft start --site <đường_dẫn_site>\n` +
    `  3. Hoặc đặt biến môi trường: export TREECRAFT_SITE_DIR=<đường_dẫn_site>`
  );
}

/**
 * Lấy đường dẫn tuyệt đối tới SITE_DIR
 */
function getSiteDir() {
  return resolveSiteDir();
}

/**
 * Ghi đè đường dẫn SITE_DIR (chỉ dùng cho testing hoặc script)
 */
function setSiteDir(sitePath) {
  _cachedSiteDir = path.resolve(sitePath);
  _cachedSiteConfig = null;
  return _cachedSiteDir;
}

/**
 * Reset cache (dùng trong unit test)
 */
function resetCache() {
  _cachedSiteDir = null;
  _cachedSiteConfig = null;
}

/**
 * Lấy đường dẫn file cấu hình site.config.js
 */
function getSiteConfigPath() {
  return path.join(getSiteDir(), 'site.config.js');
}

/**
 * Đọc và validate file cấu hình site.config.js
 * @returns {object} Cấu hình site đã chuẩn hóa
 */
function getSiteConfig() {
  if (_cachedSiteConfig) {
    return _cachedSiteConfig;
  }

  const configPath = getSiteConfigPath();
  if (!fs.existsSync(configPath)) {
    // Nếu chưa có file site.config.js nhưng thư mục site tồn tại (ví dụ giai đoạn khởi tạo/chuyển đổi)
    // Tự sinh cấu hình fallback mặc định
    const fallbackConfig = {
      projectName: 'Treecraft Site',
      rootName: 'root',
      rootPath: '/root',
      defaultLanguage: 'vi',
      languages: ['vi'],
      cloudinaryRootFolder: 'treecraft',
      mongoDbMaster: null,
      mongoDbWeb: null,
      requiresCore: '>=1.0.0',
      starter: 'corporate',
      siteApiVersion: '1.0.0',
    };
    _cachedSiteConfig = fallbackConfig;
    return fallbackConfig;
  }

  // Xóa cache require để hỗ trợ reload khi cần
  delete require.cache[require.resolve(configPath)];
  const rawConfig = require(configPath);
  const validation = validateSiteConfig(rawConfig);

  if (!validation.valid) {
    throw new Error(
      `[Treecraft Configuration Error] Tệp cấu hình "${configPath}" không hợp lệ:\n` +
      validation.errors.map((err) => `  - ${err}`).join('\n')
    );
  }

  _cachedSiteConfig = validation.config;
  return _cachedSiteConfig;
}

/**
 * Đường dẫn thư mục Views của Site
 */
function getViewsDir() {
  return path.join(getSiteDir(), 'views');
}

/**
 * Đường dẫn thư mục Public tĩnh của Site
 */
function getPublicDir() {
  return path.join(getSiteDir(), 'public');
}

/**
 * Đường dẫn thư mục Serialization của Site
 */
function getSerializationDir() {
  return path.join(getSiteDir(), 'serialization');
}

/**
 * Đường dẫn thư mục Backups của Site
 */
function getBackupsDir() {
  return path.join(getSiteDir(), 'backups');
}

/**
 * Đường dẫn thư mục Extensions của Site
 */
function getExtensionsDir() {
  return path.join(getSiteDir(), 'extensions');
}

/**
 * Đường dẫn file .env của Site theo APP_ENV
 * @param {string} [appEnv] development, staging, production
 */
function getEnvPath(appEnv) {
  try {
    const siteDir = getSiteDir();
    if (appEnv) {
      const envSpecific = path.join(siteDir, `.env.${appEnv}`);
      if (fs.existsSync(envSpecific)) {
        return envSpecific;
      }
    }

    const defaultEnv = path.join(siteDir, '.env');
    if (fs.existsSync(defaultEnv)) {
      return defaultEnv;
    }
  } catch {
    // Ignore and fallback to core
  }

  // Fallback nếu đang ở chế độ chuyển đổi và file .env vẫn ở root core
  const coreDir = getCoreDir();
  if (appEnv) {
    const coreEnv = path.join(coreDir, `.env.${appEnv}`);
    if (fs.existsSync(coreEnv)) return coreEnv;
  }
  return path.join(coreDir, '.env');
}

/**
 * Đường dẫn thư mục Starter mẫu trong Core
 * @param {string} [starterName='corporate']
 */
function getStarterDir(starterName = 'corporate') {
  return path.join(getCoreDir(), 'starter', starterName);
}

/**
 * Đường dẫn Views Admin của Core CMS
 */
function getCoreAdminViewsDir() {
  return path.join(getCoreDir(), 'src', 'views', 'admin');
}

/**
 * Đường dẫn Public Assets của Core Admin CMS
 */
function getCoreAdminPublicDir() {
  return path.join(getCoreDir(), 'public');
}

module.exports = {
  getCoreDir,
  resolveSiteDir,
  getSiteDir,
  setSiteDir,
  resetCache,
  getSiteConfigPath,
  getSiteConfigFile: getSiteConfigPath,
  getSiteConfig,
  getViewsDir,
  getPublicDir,
  getSerializationDir,
  getBackupsDir,
  getExtensionsDir,
  getEnvPath,
  getStarterDir,
  getCoreAdminViewsDir,
  getCoreAdminPublicDir,
};
