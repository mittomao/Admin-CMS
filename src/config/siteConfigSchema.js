/**
 * Schema & Validator cho site.config.js
 * Định nghĩa các trường hợp lệ của cấu hình Site và ngăn chặn rò rỉ bí mật
 */

const FORBIDDEN_SECRET_KEYS = [
  'password',
  'secret',
  'api_key',
  'apikey',
  'session_secret',
  'token',
  'private_key',
  'mongodb_uri',
  'mongo_uri',
  'cloudinary_api_secret',
];

/**
 * Validate cấu hình site.config.js
 * @param {object} config 
 * @returns {{ valid: boolean, errors: string[], config: object }}
 */
function validateSiteConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {
      valid: false,
      errors: ['Cấu hình site.config.js phải là một object hợp lệ.'],
      config: {},
    };
  }

  // 1. Kiểm tra bí mật (Secrets Protection)
  const keys = Object.keys(config);
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    for (const forbidden of FORBIDDEN_SECRET_KEYS) {
      if (lowerKey.includes(forbidden)) {
        errors.push(`site.config.js KHÔNG ĐƯỢC CHỨA thông tin bảo mật/bí mật: "${key}". Hãy chuyển sang file .env.`);
      }
    }
  }

  // 2. projectName (Bắt buộc)
  if (!config.projectName || typeof config.projectName !== 'string' || !config.projectName.trim()) {
    errors.push('Trường "projectName" là bắt buộc và phải là chuỗi ký tự không rỗng.');
  }

  // 3. rootName (Mặc định 'root')
  const rootName = (config.rootName && typeof config.rootName === 'string')
    ? config.rootName.trim().replace(/^\/+|\/+$/g, '')
    : 'root';

  if (!rootName) {
    errors.push('Trường "rootName" không hợp lệ.');
  }

  // 4. defaultLanguage & languages
  const defaultLanguage = (config.defaultLanguage && typeof config.defaultLanguage === 'string')
    ? config.defaultLanguage.trim().toLowerCase()
    : 'vi';

  let languages = ['vi'];
  if (Array.isArray(config.languages) && config.languages.length > 0) {
    languages = config.languages.map((l) => String(l).trim().toLowerCase()).filter(Boolean);
  } else if (typeof config.languages === 'string') {
    languages = [config.languages.trim().toLowerCase()];
  }
  if (!languages.includes(defaultLanguage)) {
    languages.unshift(defaultLanguage);
  }

  // 5. cloudinaryRootFolder
  let cloudinaryRootFolder = config.cloudinaryRootFolder || 'treecraft';

  // 6. mongoDbMaster & mongoDbWeb
  let mongoDbMaster = config.mongoDbMaster || null;
  let mongoDbWeb = config.mongoDbWeb || null;

  // 7. requiresCore (SemVer)
  const requiresCore = config.requiresCore || '>=1.0.0';

  // 8. starter
  const starter = config.starter || 'corporate';

  // 9. siteApiVersion
  const siteApiVersion = config.siteApiVersion || '1.0.0';

  const normalizedConfig = {
    ...config,
    projectName: config.projectName ? config.projectName.trim() : 'Treecraft Site',
    rootName,
    rootPath: `/${rootName}`,
    defaultLanguage,
    languages,
    cloudinaryRootFolder,
    mongoDbMaster,
    mongoDbWeb,
    requiresCore,
    starter,
    siteApiVersion,
  };

  return {
    valid: errors.length === 0,
    errors,
    config: normalizedConfig,
  };
}

module.exports = {
  validateSiteConfig,
  FORBIDDEN_SECRET_KEYS,
};

