'use strict';

/**
 * initService.js
 * Động cơ khởi tạo dự án mới (treecraft init) theo DEC-056 (GĐ S2)
 * Tạo thư mục site/ hoàn chỉnh từ Starter Template (mặc định corporate)
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const sitePaths = require('../config/sitePaths');
const { validateSiteConfig } = require('../config/siteConfigSchema');

/**
 * Chuyển đổi tên thành slug an toàn cho ID / Tên database
 * @param {string} str 
 * @returns {string}
 */
function slugify(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Đệ quy sao chép thư mục
 */
async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Khởi tạo dự án site mới từ starter
 * @param {object} options
 * @param {string} options.targetDir Thư mục đích cần tạo site (mặc định './site')
 * @param {string} [options.starter='corporate'] Tên starter mẫu
 * @param {string} [options.name] Tên hiển thị của website dự án
 * @param {string} [options.root='root'] Tên node gốc
 * @param {string} [options.dbPrefix] Tiền tố tên database MongoDB
 * @param {string} [options.defaultLanguage='vi'] Ngôn ngữ mặc định
 * @param {string[]} [options.languages=['vi', 'en']] Danh sách ngôn ngữ
 * @param {boolean} [options.force=false] Ghi đè nếu thư mục đích đã tồn tại
 * @param {boolean} [options.skipDb=false] Bỏ qua kết nối và khởi tạo database ban đầu
 */
async function initSite(options = {}) {
  const starterName = options.starter || 'corporate';
  const starterDir = sitePaths.getStarterDir(starterName);

  // 1. Kiểm tra sự tồn tại của Starter
  if (!fs.existsSync(starterDir)) {
    throw new Error(
      `[Treecraft Init Error] Không tìm thấy Starter Template "${starterName}" tại: ${starterDir}`
    );
  }

  // 2. Xác định đường dẫn thư mục đích
  const targetDir = path.resolve(options.targetDir || './site');
  const baseName = path.basename(targetDir);
  const projectName = options.name || options.projectName || (baseName === 'site' ? 'My Treecraft Site' : baseName);
  const rootName = options.root || options.rootName || 'root';
  const dbPrefix = options.dbPrefix || slugify(projectName) || 'treecraft_site';
  const defaultLanguage = options.defaultLanguage || 'vi';
  const languages = Array.isArray(options.languages) && options.languages.length > 0
    ? options.languages
    : ['vi', 'en'];

  // 3. Kiểm tra an toàn thư mục đích
  if (fs.existsSync(targetDir)) {
    const files = await fsp.readdir(targetDir);
    const nonIgnoredFiles = files.filter((f) => f !== '.DS_Store' && f !== '.git');
    if (nonIgnoredFiles.length > 0 && !options.force) {
      throw new Error(
        `[Treecraft Init Error] Thư mục đích "${targetDir}" đã tồn tại và không rỗng.\n` +
        `Để tiếp tục ghi đè, hãy chạy lại lệnh với cờ: --force`
      );
    }
  } else {
    await fsp.mkdir(targetDir, { recursive: true });
  }

  console.log(`\n🚀 [treecraft init] Đang khởi tạo dự án mới: "${projectName}"...`);
  console.log(`📁 Thư mục đích: ${targetDir}`);
  console.log(`📦 Starter mẫu : ${starterName}`);

  // 4. Sao chép tài nguyên từ Starter (views, public, serialization)
  const starterViews = path.join(starterDir, 'views');
  const starterPublic = path.join(starterDir, 'public');
  const starterSerialization = path.join(starterDir, 'serialization');

  if (fs.existsSync(starterViews)) {
    console.log('  ├── Sao chép views EJS...');
    await copyDir(starterViews, path.join(targetDir, 'views'));
  }
  if (fs.existsSync(starterPublic)) {
    console.log('  ├── Sao chép tài nguyên tĩnh public/...');
    await copyDir(starterPublic, path.join(targetDir, 'public'));
  }
  if (fs.existsSync(starterSerialization)) {
    console.log('  ├── Sao chép dữ liệu đồng bộ serialization/...');
    await copyDir(starterSerialization, path.join(targetDir, 'serialization'));
  }

  // Tạo thư mục backups/ và extensions/ rỗng kèm .gitkeep
  await fsp.mkdir(path.join(targetDir, 'backups'), { recursive: true });
  await fsp.writeFile(path.join(targetDir, 'backups', '.gitkeep'), '', 'utf8');

  await fsp.mkdir(path.join(targetDir, 'extensions'), { recursive: true });
  await fsp.writeFile(path.join(targetDir, 'extensions', '.gitkeep'), '', 'utf8');

  // 5. Sinh file cấu hình site.config.js chuẩn schema
  console.log('  ├── Sinh file cấu hình site.config.js...');
  const siteConfigContent = `/**
 * Cấu hình Dự án Site (DEC-056)
 * Khởi tạo tự động bởi lệnh "treecraft init"
 */

module.exports = {
  // Tên hiển thị của website dự án
  projectName: ${JSON.stringify(projectName)},

  // Tên node gốc trong cây phân cấp CMS (mặc định: 'root')
  rootName: ${JSON.stringify(rootName)},

  // Ngôn ngữ mặc định và danh sách ngôn ngữ kích hoạt
  defaultLanguage: ${JSON.stringify(defaultLanguage)},
  languages: ${JSON.stringify(languages)},

  // Thư mục lưu trữ media trên Cloudinary theo từng môi trường
  cloudinaryRootFolder: {
    development: ${JSON.stringify(`${dbPrefix}_dev`)},
    staging: ${JSON.stringify(`${dbPrefix}_staging`)},
    production: ${JSON.stringify(`${dbPrefix}_prod`)},
  },

  // Tên database MongoDB (Master & Web) theo chuẩn DEC-052
  mongoDbMaster: {
    development: ${JSON.stringify(`${dbPrefix}_master`)},
    staging: ${JSON.stringify(`${dbPrefix}_staging_master`)},
    production: ${JSON.stringify(`${dbPrefix}_prod_master`)},
  },
  mongoDbWeb: {
    development: ${JSON.stringify(`${dbPrefix}_web`)},
    staging: ${JSON.stringify(`${dbPrefix}_staging_web`)},
    production: ${JSON.stringify(`${dbPrefix}_prod_web`)},
  },

  // Ràng buộc phiên bản Core tương thích
  requiresCore: '>=1.0.0',

  // Tên bộ mẫu đã dùng để khởi tạo
  starter: ${JSON.stringify(starterName)},

  // Phiên bản cấu hình Site
  siteApiVersion: '1.0.0',
};
`;
  await fsp.writeFile(path.join(targetDir, 'site.config.js'), siteConfigContent, 'utf8');

  // Kiểm tra xác thực tính hợp lệ của file cấu hình vừa sinh
  delete require.cache[require.resolve(path.join(targetDir, 'site.config.js'))];
  const generatedConfig = require(path.join(targetDir, 'site.config.js'));
  const validation = validateSiteConfig(generatedConfig);
  if (!validation.valid) {
    throw new Error(`[Treecraft Init Error] Lỗi sinh site.config.js: ${validation.errors.join(', ')}`);
  }

  // 6. Sinh các file môi trường .env và .env.example kèm mã mật bí mật ngẫu nhiên
  console.log('  ├── Sinh file cấu hình môi trường (.env, .env.development, .env.example)...');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const backupKey = crypto.randomBytes(32).toString('hex');

  // .env.example
  const starterEnvExample = path.join(starterDir, '.env.example');
  if (fs.existsSync(starterEnvExample)) {
    await fsp.copyFile(starterEnvExample, path.join(targetDir, '.env.example'));
  } else {
    const fallbackExample = path.join(sitePaths.getCoreDir(), '.env.example');
    if (fs.existsSync(fallbackExample)) {
      await fsp.copyFile(fallbackExample, path.join(targetDir, '.env.example'));
    }
  }

  // .env.development
  const envDevContent = `# ------------------------------------------------------------------------------
# TREECRAFT CMS - CẤU HÌNH PHÁT TRIỂN (DEVELOPMENT)
# Khởi tạo tự động bởi lệnh "treecraft init"
# ------------------------------------------------------------------------------
APP_ENV=development
NODE_ENV=development
PORT=3000
APP_NAME=${JSON.stringify(projectName)}
APP_URL=http://localhost:3000

# Cơ sở dữ liệu MongoDB Local Docker (DEC-052)
MONGO_URI=mongodb://127.0.0.1:27017/${dbPrefix}_master?replicaSet=rs0
MONGO_URI_WEB=mongodb://127.0.0.1:27017/${dbPrefix}_web?replicaSet=rs0
ALLOW_REMOTE_DB_IN_DEV=false

# Mật mã phiên làm việc và mã hóa sao lưu an toàn (Tự động sinh 32 bytes Hex)
SESSION_SECRET=${sessionSecret}
BACKUP_ENCRYPTION_KEY=${backupKey}

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_ROOT_FOLDER=${dbPrefix}_dev
`;
  await fsp.writeFile(path.join(targetDir, '.env.development'), envDevContent, 'utf8');

  // .env (Base Config)
  await fsp.writeFile(path.join(targetDir, '.env'), envDevContent, 'utf8');

  // 7. Sinh package.json tối giản cho site
  console.log('  ├── Sinh package.json cho dự án Site...');
  const sitePackageJson = {
    name: slugify(projectName) || 'treecraft-site',
    version: '1.0.0',
    private: true,
    description: `${projectName} - Treecraft Website Project`,
    scripts: {
      dev: 'treecraft dev',
      start: 'treecraft start',
      doctor: 'treecraft doctor',
      where: 'treecraft where',
      migrate: 'treecraft migrate',
    },
  };
  await fsp.writeFile(
    path.join(targetDir, 'package.json'),
    JSON.stringify(sitePackageJson, null, 2) + '\n',
    'utf8'
  );

  // 8. Sinh README.md cho site
  console.log('  ├── Sinh tài liệu hướng dẫn README.md...');
  const siteReadmeContent = `# ${projectName} — Treecraft Website Project

Thư mục này chứa toàn bộ mã nguồn và tài nguyên riêng của website dự án theo kiến trúc phân tách Core & Site (DEC-056):
- \`site.config.js\`: Cấu hình nhận diện dự án, database và Cloudinary folder.
- \`views/\`: Các tệp giao diện EJS Server-Side Rendering (layouts, components, partials, errors).
- \`public/\`: Tài nguyên tĩnh CSS, JS, hình ảnh.
- \`serialization/\`: Toàn bộ dữ liệu nội dung, template, rendering phân cấp dạng YAML.
- \`backups/\`: Thư mục chứa các bản sao lưu database (được bỏ qua bởi Git).

## Lệnh Vận Hành Nhanh
\`\`\`bash
# Khởi động chế độ phát triển
npm run dev

# Khởi chạy server production
npm start

# Chẩn đoán kết nối giữa Core và Site
npm run doctor

# Kiểm tra đường dẫn tài nguyên
npm run where
\`\`\`
`;
  await fsp.writeFile(path.join(targetDir, 'README.md'), siteReadmeContent, 'utf8');

  // 9. Khởi tạo DB ban đầu và nạp Starter Serialization (nếu không bật --skip-db)
  if (!options.skipDb) {
    console.log('  ├── Đồng bộ hóa cơ sở dữ liệu ban đầu...');
    try {
      // Cấu hình tạm TREECRAFT_SITE_DIR để các script nạp đúng config của site mới
      const previousSiteDir = process.env.TREECRAFT_SITE_DIR;
      process.env.TREECRAFT_SITE_DIR = targetDir;
      sitePaths.setSiteDir(targetDir);

      // Chạy migration đồng bộ system templates nếu có kết nối mongo
      const syncSystem = require('../scripts/sync-system-templates');
      if (typeof syncSystem.syncSystemTemplates === 'function') {
        await syncSystem.syncSystemTemplates({ quiet: true });
        console.log('  ✅ [DB] Khởi tạo System Templates thành công.');
      }

      // Khôi phục site dir cũ
      if (previousSiteDir) {
        process.env.TREECRAFT_SITE_DIR = previousSiteDir;
        sitePaths.setSiteDir(previousSiteDir);
      } else {
        delete process.env.TREECRAFT_SITE_DIR;
        sitePaths.resetCache();
      }
    } catch (dbErr) {
      console.log(`  ℹ️ [DB] Bỏ qua khởi tạo DB trực tiếp (${dbErr.message}).`);
      console.log('     Bạn có thể khởi tạo database sau khi bật MongoDB bằng lệnh: treecraft migrate');
    }
  } else {
    console.log('  ℹ️ Bỏ qua bước kết nối cơ sở dữ liệu (--skip-db).');
  }

  console.log('\n============================================================');
  console.log(`🎉 KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "${projectName}"!`);
  console.log('============================================================');
  console.log(`\nCác bước tiếp theo:`);
  console.log(`  1. Di chuyển vào thư mục dự án: cd ${path.relative(process.cwd(), targetDir) || '.'}`);
  console.log(`  2. Kiểm tra tính toàn vẹn:      treecraft doctor --site ${targetDir}`);
  console.log(`  3. Khởi động server:            treecraft dev --site ${targetDir}\n`);

  return {
    targetDir,
    projectName,
    rootName,
    dbPrefix,
    starter: starterName,
  };
}

module.exports = {
  initSite,
  slugify,
};

