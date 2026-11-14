'use strict';

/**
 * initService.js
 * Động cơ khởi tạo dự án mới một bước (treecraft init - One-Step Bootstrap)
 * Tuân thủ DEC-056, DEC-057 (Giai đoạn S2 - Làm lại)
 * Hỗ trợ macOS, Linux, Windows; Idempotent; Kiểm tra tiền điều kiện nghiêm ngặt.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { execSync, spawnSync } = require('child_process');

const sitePaths = require('../config/sitePaths');
const dbGuard = require('../config/dbGuard');

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
 * Đệ quy sao chép thư mục (không ghi đè file đã có nếu skipExisting = true)
 */
async function copyDir(src, dest, options = {}) {
  const { skipExisting = false, dryRun = false } = options;
  if (!dryRun) {
    await fsp.mkdir(dest, { recursive: true });
  }

  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, options);
    } else {
      if (skipExisting && fs.existsSync(destPath)) {
        continue;
      }
      if (!dryRun) {
        await fsp.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Kiểm tra xem một cổng TCP có đang lắng nghe không (ví dụ 127.0.0.1:27017)
 */
function checkPortOpen(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Kiểm tra xem Docker daemon có đang chạy không
 */
function checkDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra xem thư mục có nằm trong một Git repository hay không
 */
function isInsideGitRepo(targetDir) {
  try {
    let curr = path.resolve(targetDir);
    while (curr) {
      if (fs.existsSync(path.join(curr, '.git'))) {
        return true;
      }
      const parent = path.dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sinh mật khẩu mạnh ngẫu nhiên (16 ký tự an toàn)
 */
function generateSecurePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  // Đảm bảo có ít nhất 1 chữ hoa, 1 chữ thường, 1 số
  let pwd = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
  ];

  for (let i = 0; i < 13; i++) {
    pwd.push(all[crypto.randomInt(0, all.length)]);
  }

  // Shuffle
  return pwd.sort(() => crypto.randomInt(-1, 2)).join('');
}

/**
 * BƯỚC 1: Kiểm tra tiền điều kiện (chỉ đọc, không làm biến đổi hệ thống)
 */
async function step1_CheckPreflight(targetDir, options = {}) {
  console.log('  🔍 [Bước 1/8] Kiểm tra tiền điều kiện hệ thống (Preflight Checks)...');

  // 1.1 Kiểm tra phiên bản Node.js
  const nodeVer = process.versions.node;
  const majorVer = parseInt(nodeVer.split('.')[0], 10);
  if (majorVer < 20) {
    throw new Error(
      `[Preflight Error] Phiên bản Node.js không đáp ứng yêu cầu.\n` +
      `  - Hiện tại : v${nodeVer}\n` +
      `  - Yêu cầu  : Node.js >= v20.0.0 LTS (Khuyên dùng v20 hoặc v22).\n` +
      `  Vui lòng nâng cấp Node.js qua nvm hoặc nodejs.org trước khi tiếp tục.`
    );
  }

  // 1.2 Kiểm tra môi trường Git repository
  const repoRoot = path.dirname(targetDir);
  if (!isInsideGitRepo(targetDir) && !isInsideGitRepo(repoRoot)) {
    throw new Error(
      `[Preflight Error] Thư mục hiện tại không nằm trong một Git repository.\n` +
      `  Treecraft yêu cầu dự án được quản lý bằng Git để tích hợp Core qua Submodule.\n` +
      `  Cách xử lý: Chạy lệnh "git init" tại thư mục dự án của bạn trước khi chạy treecraft init.`
    );
  }

  // 1.3 Kiểm tra Core hợp lệ
  const coreDir = sitePaths.getCoreDir();
  const corePkgPath = path.join(coreDir, 'package.json');
  if (!fs.existsSync(corePkgPath)) {
    throw new Error(
      `[Preflight Error] Không tìm thấy package.json của Core tại: ${coreDir}\n` +
      `  Hãy đảm bảo mã nguồn Core đã được tải đầy đủ (ví dụ: git submodule update --init --recursive).`
    );
  }

  // 1.4 Kiểm tra dependencies của Core (node_modules)
  let hasMongoose = false;
  try {
    require.resolve('mongoose', { paths: [coreDir] });
    hasMongoose = true;
  } catch {
    hasMongoose = false;
  }

  if (!hasMongoose && !options.skipDb && !options.dryRun) {
    console.log('  📦 [Preflight] Phát hiện Core chưa được cài đặt node_modules.');
    console.log('     Đang tự động chạy "npm install" trong thư mục Core...');
    try {
      execSync('npm install', { cwd: coreDir, stdio: 'inherit' });
      console.log('  ✅ [Preflight] Đã cài đặt xong dependencies cho Core.');
    } catch (npmErr) {
      throw new Error(
        `[Preflight Error] Không thể tự động chạy "npm install" trong thư mục Core: ${npmErr.message}\n` +
        `  Cách xử lý: Vui lòng mở terminal tại thư mục Core và chạy: cd core && npm install`
      );
    }
  }

  // 1.5 Kiểm tra Starter và quy tắc Single Starter
  const starterName = options.starter || 'corporate';
  if (starterName !== 'corporate') {
    throw new Error(
      `[Preflight Error] Starter "${starterName}" không được hỗ trợ.\n` +
      `  Treecraft hiện tại chỉ hỗ trợ duy nhất starter chuẩn: "corporate".`
    );
  }

  // 1.6 Kiểm tra Docker daemon hoặc MongoDB local (trừ khi có --skip-db)
  if (!options.skipDb) {
    const isDockerUp = checkDockerAvailable();
    const isMongoPortOpen = await checkPortOpen('127.0.0.1', 27017);

    if (!isDockerUp && !isMongoPortOpen && !options.dbUri) {
      throw new Error(
        `[Preflight Error] Không tìm thấy Docker hoặc dịch vụ MongoDB local đang hoạt động.\n\n` +
        `  Treecraft cần MongoDB để lưu trữ dữ liệu CMS. Vui lòng cài đặt và khởi động một trong hai:\n\n` +
        `  1. Docker Desktop (Khuyên dùng cho mọi hệ điều hành):\n` +
        `     - macOS  : brew install --cask docker  (sau đó mở ứng dụng Docker)\n` +
        `     - Windows: Tải và cài đặt từ https://www.docker.com/products/docker-desktop/\n` +
        `     - Linux  : sudo apt-get install docker.io docker-compose-plugin && sudo systemctl start docker\n\n` +
        `  2. MongoDB Community Server độc lập (Port 27017):\n` +
        `     - macOS  : brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community\n` +
        `     - Windows: Tải bản cài đặt MSI từ https://www.mongodb.com/try/download/community\n` +
        `     - Linux  : sudo systemctl start mongod\n\n` +
        `  (Mẹo: Nếu bạn đã có sẵn MongoDB ở cổng khác, hãy truyền cờ: --db-uri <mongodb-uri>\n` +
        `   Hoặc bỏ qua bước kết nối cơ sở dữ liệu bằng cờ: --skip-db)`
      );
    }
  }

  console.log('  ✅ [Bước 1/8] Tiền điều kiện hợp lệ (Node.js, Git, Core, Docker/Mongo).');
}

/**
 * BƯỚC 2: Tạo site/ từ core/starter/corporate (Idempotent, không ghi đè file có sẵn)
 */
async function step2_ScaffoldSiteDirectory(targetDir, options = {}) {
  const isIncremental = fs.existsSync(targetDir) && (await fsp.readdir(targetDir)).length > 0;
  console.log(
    `  📁 [Bước 2/8] Khởi tạo khung thư mục site/ từ starter corporate ${
      isIncremental ? '(Chế độ bổ sung / Incremental)...' : '...'
    }`
  );

  if (options.dryRun) {
    console.log(`     [DRY-RUN] Sẽ sao chép views, public, serialization và sinh cấu hình tại: ${targetDir}`);
    return;
  }

  const starterName = 'corporate';
  const starterDir = sitePaths.getStarterDir(starterName);
  if (!fs.existsSync(starterDir)) {
    throw new Error(`[Init Error] Không tìm thấy starter template tại: ${starterDir}`);
  }

  await fsp.mkdir(targetDir, { recursive: true });

  // 2.1 Sao chép views, public, serialization (không ghi đè file đã có)
  const starterViews = path.join(starterDir, 'views');
  const starterPublic = path.join(starterDir, 'public');
  const starterSerialization = path.join(starterDir, 'serialization');

  if (fs.existsSync(starterViews)) {
    await copyDir(starterViews, path.join(targetDir, 'views'), { skipExisting: true });
  }
  if (fs.existsSync(starterPublic)) {
    await copyDir(starterPublic, path.join(targetDir, 'public'), { skipExisting: true });
  }
  if (fs.existsSync(starterSerialization)) {
    await copyDir(starterSerialization, path.join(targetDir, 'serialization'), { skipExisting: true });
  }

  // Thư mục rỗng backups/ và extensions/
  await fsp.mkdir(path.join(targetDir, 'backups'), { recursive: true });
  await fsp.writeFile(path.join(targetDir, 'backups', '.gitkeep'), '', { flag: 'wx' }).catch(() => {});
  await fsp.mkdir(path.join(targetDir, 'extensions'), { recursive: true });
  await fsp.writeFile(path.join(targetDir, 'extensions', '.gitkeep'), '', { flag: 'wx' }).catch(() => {});

  // 2.2 Sinh file site.config.js (nếu chưa có)
  const siteConfigFile = path.join(targetDir, 'site.config.js');
  if (!fs.existsSync(siteConfigFile)) {
    const siteConfigContent = `/**
 * Cấu hình Dự án Site (DEC-056 / DEC-057)
 * Khởi tạo tự động bởi lệnh "treecraft init"
 */

module.exports = {
  // Tên hiển thị của website dự án
  projectName: ${JSON.stringify(options.projectName)},

  // Tên node gốc trong cây phân cấp CMS (mặc định: 'root')
  rootName: ${JSON.stringify(options.rootName || 'root')},

  // Ngôn ngữ mặc định và danh sách ngôn ngữ kích hoạt
  defaultLanguage: ${JSON.stringify(options.defaultLanguage || 'vi')},
  languages: ${JSON.stringify(options.languages || ['vi', 'en'])},

  // Thư mục lưu trữ media trên Cloudinary theo từng môi trường
  cloudinaryRootFolder: {
    development: ${JSON.stringify(`${options.dbPrefix}_dev`)},
    staging: ${JSON.stringify(`${options.dbPrefix}_staging`)},
    production: ${JSON.stringify(`${options.dbPrefix}_prod`)},
  },

  // Tên database MongoDB (Master & Web) theo chuẩn DEC-052
  mongoDbMaster: {
    development: ${JSON.stringify(`${options.dbPrefix}_master`)},
    staging: ${JSON.stringify(`${options.dbPrefix}_staging_master`)},
    production: ${JSON.stringify(`${options.dbPrefix}_prod_master`)},
  },
  mongoDbWeb: {
    development: ${JSON.stringify(`${options.dbPrefix}_web`)},
    staging: ${JSON.stringify(`${options.dbPrefix}_staging_web`)},
    production: ${JSON.stringify(`${options.dbPrefix}_prod_web`)},
  },

  // Ràng buộc phiên bản Core tương thích
  requiresCore: '>=1.0.0',

  // Tên bộ mẫu đã dùng để khởi tạo
  starter: 'corporate',

  // Phiên bản cấu hình Site
  siteApiVersion: '1.0.0',
};
`;
    await fsp.writeFile(siteConfigFile, siteConfigContent, 'utf8');
  }

  // 2.3 Sinh file .env.development và .env (nếu chưa có)
  const envDevFile = path.join(targetDir, '.env.development');
  if (!fs.existsSync(envDevFile)) {
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    const backupKey = crypto.randomBytes(32).toString('hex');
    const mongoUri = options.dbUri || `mongodb://127.0.0.1:27017/${options.dbPrefix}_master?replicaSet=rs0`;
    const mongoUriWeb = options.dbUriWeb || `mongodb://127.0.0.1:27017/${options.dbPrefix}_web?replicaSet=rs0`;

    const envContent = `# ------------------------------------------------------------------------------
# TREECRAFT CMS - CẤU HÌNH PHÁT TRIỂN (DEVELOPMENT)
# Khởi tạo tự động bởi lệnh "treecraft init" (DEC-057)
# ------------------------------------------------------------------------------
APP_ENV=development
NODE_ENV=development
PORT=4000
APP_NAME=${JSON.stringify(options.projectName)}
APP_URL=http://localhost:4000

# Cơ sở dữ liệu MongoDB Local Docker (DEC-052 / DEC-057)
MONGO_URI=${mongoUri}
MONGO_URI_WEB=${mongoUriWeb}
ALLOW_REMOTE_DB_IN_DEV=false

# Mật mã phiên làm việc và mã hóa sao lưu an toàn (Tự động sinh 32 bytes Hex)
SESSION_SECRET=${sessionSecret}
BACKUP_ENCRYPTION_KEY=${backupKey}

# Cloudinary Storage
# CẢNH BÁO: Ảnh upload sẽ chưa hiển thị được cho tới khi bạn điền đủ thông tin khoá bên dưới:
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_ROOT_FOLDER=${options.dbPrefix}_dev
`;
    await fsp.writeFile(envDevFile, envContent, 'utf8');
    const baseEnvFile = path.join(targetDir, '.env');
    if (!fs.existsSync(baseEnvFile)) {
      await fsp.writeFile(baseEnvFile, envContent, 'utf8');
    }
  }

  // 2.4 Sao chép .env.staging.example và .env.production.example
  const starterStagingEx = path.join(starterDir, '.env.staging.example');
  if (fs.existsSync(starterStagingEx)) {
    await fsp.copyFile(starterStagingEx, path.join(targetDir, '.env.staging.example')).catch(() => {});
  }
  const starterProdEx = path.join(starterDir, '.env.production.example');
  if (fs.existsSync(starterProdEx)) {
    await fsp.copyFile(starterProdEx, path.join(targetDir, '.env.production.example')).catch(() => {});
  }

  // 2.5 Sao chép docker-compose.dev.yml (nếu chưa có)
  const composeDest = path.join(targetDir, 'docker-compose.dev.yml');
  if (!fs.existsSync(composeDest)) {
    const starterCompose = path.join(starterDir, 'docker-compose.dev.yml');
    if (fs.existsSync(starterCompose)) {
      let composeContent = await fsp.readFile(starterCompose, 'utf8');
      composeContent = composeContent.replace(/\$\{COMPOSE_PROJECT_NAME:-treecraft\}/g, options.dbPrefix);
      await fsp.writeFile(composeDest, composeContent, 'utf8');
    }
  }

  // 2.6 Sinh package.json tối giản cho site (nếu chưa có)
  const sitePkgFile = path.join(targetDir, 'package.json');
  if (!fs.existsSync(sitePkgFile)) {
    const sitePkg = {
      name: options.dbPrefix || 'treecraft-site',
      version: '1.0.0',
      private: true,
      description: `${options.projectName} - Treecraft Website Project`,
      scripts: {
        dev: 'treecraft dev',
        start: 'treecraft start',
        doctor: 'treecraft doctor',
        where: 'treecraft where',
        'db:up': 'treecraft db:up',
        'db:down': 'treecraft db:down',
        'db:status': 'treecraft db:status',
      },
    };
    await fsp.writeFile(sitePkgFile, JSON.stringify(sitePkg, null, 2) + '\n', 'utf8');
  }

  // 2.7 Sao chép .gitignore (nếu chưa có)
  const gitignoreFile = path.join(targetDir, '.gitignore');
  if (!fs.existsSync(gitignoreFile)) {
    const starterGitignore = path.join(starterDir, '.gitignore');
    if (fs.existsSync(starterGitignore)) {
      await fsp.copyFile(starterGitignore, gitignoreFile);
    }
  }

  // 2.8 Sinh README.md (nếu chưa có)
  const readmeFile = path.join(targetDir, 'README.md');
  if (!fs.existsSync(readmeFile)) {
    const starterReadme = path.join(starterDir, 'README.md');
    if (fs.existsSync(starterReadme)) {
      await fsp.copyFile(starterReadme, readmeFile);
    }
  }

  console.log('  ✅ [Bước 2/8] Khung thư mục và tệp cấu hình đã sẵn sàng.');
}

/**
 * BƯỚC 3: Dựng MongoDB local (Ưu tiên Docker Compose của site, hoặc kết nối Mongo local đang chạy)
 */
async function step3_BootstrapLocalMongo(targetDir, options = {}) {
  if (options.skipDb) {
    console.log('  ℹ️ [Bước 3/8] Bỏ qua dựng cơ sở dữ liệu MongoDB (--skip-db).');
    return { skipped: true };
  }

  console.log('  🐳 [Bước 3/8] Thiết lập cơ sở dữ liệu MongoDB Local...');

  if (options.dryRun) {
    console.log('     [DRY-RUN] Sẽ kiểm tra hoặc kích hoạt Docker Compose MongoDB trên cổng 27017.');
    return { dryRun: true };
  }

  const composeFile = path.join(targetDir, 'docker-compose.dev.yml');
  const isPort27017Open = await checkPortOpen('127.0.0.1', 27017);

  if (!isPort27017Open && fs.existsSync(composeFile) && checkDockerAvailable()) {
    console.log('     Khởi động container MongoDB qua Docker Compose...');
    const result = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new Error(
        `[Docker Error] Không thể khởi động Docker container MongoDB: ${result.stderr || result.stdout}\n` +
        `  Kiểm tra quyền hoặc chạy thủ công: docker compose -f ${composeFile} up -d`
      );
    }

    // Chờ container khởi động và replica set sẵn sàng (tối đa 40 giây)
    console.log('     Đang chờ MongoDB Replica Set sẵn sàng (tối đa 40s)...');
    let ready = false;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const open = await checkPortOpen('127.0.0.1', 27017);
      if (open) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!ready) {
      throw new Error(
        `[MongoDB Error] Quá thời gian chờ container MongoDB khởi động trên 127.0.0.1:27017.\n` +
        `  Vui lòng kiểm tra log container: docker logs ${options.dbPrefix}-mongo-dev`
      );
    }
  }

  // Kết nối thử qua Mongoose với chốt chặn an toàn dbGuard
  const mongoose = require('mongoose');
  const mongoUri = options.dbUri || `mongodb://127.0.0.1:27017/${options.dbPrefix}_master?replicaSet=rs0`;
  dbGuard.assertSafeFor('destructive', {
    uri: mongoUri,
    appEnv: 'development',
    scriptName: 'treecraft-init',
  });

  process.env.MONGO_URI = mongoUri;
  process.env.APP_ENV = 'development';
  try {
    const env = require('../config/env');
    env.MONGO_URI = mongoUri;
    env.APP_ENV = 'development';
  } catch (_e) {
    // env config will pick up process.env
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('  ✅ [Bước 3/8] Kết nối MongoDB thành công.');
  } catch (connErr) {
    // Thử fallback nếu replicaSet chưa sẵn sàng trên local mongod
    if (mongoUri.includes('replicaSet=rs0')) {
      const fallbackUri = mongoUri.split('?')[0];
      try {
        await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
        console.log('  ✅ [Bước 3/8] Kết nối MongoDB thành công (Standalone mode).');
        process.env.MONGO_URI = fallbackUri;
        try {
          const env = require('../config/env');
          env.MONGO_URI = fallbackUri;
        } catch (_e) {
          // ignore
        }
        return { connected: true, uri: fallbackUri };
      } catch {
        throw new Error(
          `[MongoDB Connect Error] Không thể kết nối tới MongoDB tại: ${mongoUri}\n` +
          `  Chi tiết lỗi: ${connErr.message}\n` +
          `  Hãy đảm bảo dịch vụ MongoDB đã được bật (hoặc chạy: treecraft db:up --site ${targetDir})`
        );
      }
    }
    throw connErr;
  }

  return { connected: true, uri: mongoUri };
}

/**
 * BƯỚC 4: Migrate & Seed hệ thống (System Templates, Roles, Languages, Root items, Launchpad)
 */
async function step4_MigrateAndSeedCore(targetDir, options = {}) {
  if (options.skipDb) return;
  console.log('  🌱 [Bước 4/8] Khởi tạo dữ liệu nền tảng hệ thống (Core Migration & Seeds)...');

  if (options.dryRun) {
    console.log('     [DRY-RUN] Sẽ nạp Roles, System Templates, Ngôn ngữ mặc định, Root Nodes và Launchpad.');
    return;
  }

  const seedData = require('../scripts/seed-initial-data');
  await seedData({ skipAdmin: true });

  console.log('  ✅ [Bước 4/8] Nạp dữ liệu nền tảng hệ thống hoàn tất.');
}

/**
 * BƯỚC 5: Đồng bộ hóa toàn bộ Serialization YAML theo đúng thứ tự topo
 */
async function step5_SyncSerializationSections(targetDir, options = {}) {
  if (options.skipDb) return;
  console.log('  📦 [Bước 5/8] Đồng bộ hóa Serialization YAML (Templates → Layouts → Placeholders → Renderings → Contents)...');

  if (options.dryRun) {
    console.log('     [DRY-RUN] Sẽ thực hiện Dry-run kiểm tra cú pháp và nạp dữ liệu YAML vào database.');
    return;
  }

  const yamlSectionService = require('./yamlSectionService');
  const sectionsToSync = ['template', 'layout', 'placeholder', 'rendering'];
  if (!options.noSample) {
    sectionsToSync.push('content');
  }

  // Bước 5a: Dry-run ngầm trước mọi section
  for (const secKey of sectionsToSync) {
    try {
      const dryResult = await yamlSectionService.dryRunSyncSection(secKey, { quiet: true });
      if (dryResult && dryResult.errors && dryResult.errors.length > 0) {
        const firstErr = dryResult.errors[0];
        throw new Error(
          `[YAML Dry-Run Error] Phát hiện lỗi tại mục "${secKey}":\n` +
          `  - Tệp: ${firstErr.file || 'N/A'}\n` +
          `  - Chi tiết: ${firstErr.message || JSON.stringify(firstErr)}`
        );
      }
    } catch (dryErr) {
      // Bỏ qua cảnh báo thiếu file nếu là section mới
      if (!dryErr.message.includes('không tìm thấy')) {
        throw dryErr;
      }
    }
  }

  // Bước 5b: Ghi thật vào database
  for (const secKey of sectionsToSync) {
    const isContent = secKey === 'content';
    const syncMode = isContent ? 'createOnly' : 'overwrite';
    try {
      await yamlSectionService.syncSection(secKey, {
        mode: syncMode,
        quiet: true,
      });
    } catch (syncErr) {
      console.warn(`     ⚠️ Cảnh báo đồng bộ section ${secKey}: ${syncErr.message}`);
    }
  }

  console.log('  ✅ [Bước 5/8] Đồng bộ cấu trúc và nội dung mẫu hoàn tất.');
}

/**
 * BƯỚC 6: Tạo tài khoản quản trị viên Admin an toàn
 */
async function step6_CreateAdminUser(options = {}) {
  if (options.skipDb) {
    return { username: 'admin', isGenerated: false };
  }

  console.log('  🔑 [Bước 6/8] Thiết lập tài khoản quản trị viên Admin...');

  const User = require('../models/User');
  const Role = require('../models/Role');
  const adminRole = await Role.findOne({ name: 'Administrator' });

  const adminUsername = options.adminUser || 'admin';
  let admin = await User.findOne({ username: adminUsername });

  if (options.dryRun) {
    console.log(`     [DRY-RUN] Sẽ tạo tài khoản "${adminUsername}" với mật khẩu ngẫu nhiên mạnh.`);
    return { username: adminUsername, password: '*** (dry-run) ***', isGenerated: true };
  }

  if (!admin) {
    const rawPassword = generateSecurePassword();
    const passwordHash = await User.hashPassword(rawPassword);

    admin = await User.create({
      username: adminUsername,
      email: `${adminUsername}@treecraft.local`,
      passwordHash,
      fullName: 'System Administrator',
      roles: adminRole ? [adminRole._id] : [],
      isAdmin: true,
      isActive: true,
      mustChangePassword: true, // Bắt buộc đổi ở lần đăng nhập đầu
    });

    return {
      username: adminUsername,
      password: rawPassword,
      isGenerated: true,
    };
  } else {
    // Nếu tài khoản đã có sẵn từ trước trong chế độ incremental
    return {
      username: adminUsername,
      password: null,
      isGenerated: false,
    };
  }
}

/**
 * BƯỚC 7: Xuất bản nội dung mẫu sang Web Database (PublishedItem)
 */
async function step7_PublishSampleContent(options = {}) {
  if (options.skipDb || options.noSample || options.noPublish) {
    console.log('  ℹ️ [Bước 7/8] Bỏ qua xuất bản nội dung mẫu.');
    return;
  }

  console.log('  🚀 [Bước 7/8] Xuất bản (Publish) nội dung mẫu sang Web Store...');

  if (options.dryRun) {
    console.log('     [DRY-RUN] Sẽ kích hoạt publishService cho nhánh /root/content.');
    return;
  }

  try {
    const Item = require('../models/Item');
    const branding = require('../config/branding');
    const publishService = require('./publishService');

    const contentRoot = await Item.findOne({ path: branding.PATHS.CONTENT });
    if (contentRoot) {
      await publishService.publishItem(contentRoot._id, {
        publishSubitems: true,
        bypassWorkflow: true,
        user: { username: options.adminUser || 'admin', isAdmin: true },
      });
      console.log('  ✅ [Bước 7/8] Đã xuất bản trang Home và About Us sang Web DB.');
    } else {
      console.log('     Chưa tìm thấy node /root/content để publish, bỏ qua.');
    }
  } catch (pubErr) {
    console.warn(`     ⚠️ Cảnh báo khi xuất bản nội dung mẫu: ${pubErr.message}`);
  }
}

/**
 * BƯỚC 8: Kiểm tra cuối (Mini Doctor) và in bảng hướng dẫn tiếp theo
 */
async function step8_RunDoctorAndPrintSummary(targetDir, adminCreds, options = {}) {
  console.log('  🩺 [Bước 8/8] Kiểm tra chẩn đoán tính toàn vẹn (Mini Doctor)...');

  let stats = {
    templatesCount: 0,
    renderingsCount: 0,
    layoutsCount: 0,
    contentsCount: 0,
  };

  if (!options.skipDb && !options.dryRun) {
    try {
      const Item = require('../models/Item');
      const branding = require('../config/branding');
      stats.templatesCount = await Item.countDocuments({ path: { $regex: `^${branding.PATHS.TEMPLATES}/` } });
      stats.renderingsCount = await Item.countDocuments({ path: { $regex: `^${branding.PATHS.RENDERINGS}/` } });
      stats.layoutsCount = await Item.countDocuments({ path: { $regex: `^${branding.PATHS.LAYOUTS}/` } });
      stats.contentsCount = await Item.countDocuments({ path: { $regex: `^${branding.PATHS.CONTENT}/` } });
    } catch {
      // Ignored
    }
  }

  console.log('\n============================================================');
  console.log(`🎉 KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "${options.projectName}"!`);
  console.log('============================================================');

  if (!options.skipDb && !options.dryRun) {
    console.log(`📊 Thống kê tài nguyên đã nạp vào CMS:`);
    console.log(`   - Templates   : ${stats.templatesCount} mục`);
    console.log(`   - Layouts     : ${stats.layoutsCount} mục`);
    console.log(`   - Renderings  : ${stats.renderingsCount} mục`);
    console.log(`   - Contents    : ${stats.contentsCount} mục (Home, About Us)`);
  }

  // Khung in mật khẩu Admin an toàn (CHỈ IN MỘT LẦN DUY NHẤT RA CONSOLE)
  if (adminCreds && adminCreds.isGenerated && adminCreds.password) {
    console.log('\n┌────────────────────────────────────────────────────────────┐');
    console.log('│ 🔐 TÀI KHOẢN QUẢN TRỊ VIÊN CMS (CHỈ HIỂN THỊ MỘT LẦN)      │');
    console.log(`│ Tên đăng nhập: ${adminCreds.username.padEnd(44)}│`);
    console.log(`│ Mật khẩu     : ${adminCreds.password.padEnd(44)}│`);
    console.log('│ Lưu ý        : Bạn bắt buộc phải đổi mật khẩu ở lần đăng   │');
    console.log('│                nhập đầu tiên tại: /admin                   │');
    console.log('└────────────────────────────────────────────────────────────┘');
  }

  console.log(`\n👉 Các bước tiếp theo:`);
  console.log(`   1. Khởi chạy máy chủ phát triển (tại thư mục gốc repo):`);
  console.log(`      node core/bin/treecraft.js dev`);
  console.log(`      (Hoặc nếu đang đứng trong thư mục site/: node ../core/bin/treecraft.js dev)`);
  console.log(`   2. Truy cập website công khai:  http://localhost:4000/`);
  console.log(`   3. Đăng nhập trang quản trị:    http://localhost:4000/admin`);
  console.log(`\n⚠️  LƯU Ý QUẢN TRỊ MÃ NGUỒN GIT:`);
  console.log(`   - Hãy commit toàn bộ thư mục site/ vào kho mã nguồn của bạn.`);
  console.log(`   - TUYỆT ĐỐI KHÔNG commit các file chứa mật khẩu bí mật: .env, .env.development\n`);
}

/**
 * Hàm điều phối chính của lệnh `treecraft init`
 */
async function initSite(options = {}) {
  // 1. Phân giải các tham số và thư mục
  const targetDir = path.resolve(options.targetDir || './site');
  const baseName = path.basename(targetDir);
  const repoName = path.basename(path.resolve(targetDir, '..'));
  const projectName = options.name || options.projectName || (baseName === 'site' ? repoName : baseName);
  const rootName = options.root || options.rootName || 'root';
  const dbPrefix = options.dbPrefix || slugify(projectName) || 'treecraft_site';
  const defaultLanguage = options.defaultLanguage || options.lang || 'vi';
  const languages = Array.isArray(options.languages) ? options.languages : ['vi', 'en'];

  const initContext = {
    ...options,
    targetDir,
    projectName,
    rootName,
    dbPrefix,
    defaultLanguage,
    languages,
  };

  console.log(`\n🚀 [treecraft init] Bắt đầu khởi tạo dự án: "${projectName}"...`);
  console.log(`📁 Thư mục đích : ${targetDir}`);
  console.log(`📦 Starter mẫu  : corporate\n`);

  // Lưu lại context vị trí site hiện tại
  const previousSiteDir = process.env.TREECRAFT_SITE_DIR;
  process.env.TREECRAFT_SITE_DIR = targetDir;
  sitePaths.setSiteDir(targetDir);

  try {
    // 8 Bước tuần tự (Dừng ngay khi có lỗi kèm hướng dẫn rõ)
    await step1_CheckPreflight(targetDir, initContext);
    await step2_ScaffoldSiteDirectory(targetDir, initContext);
    await step3_BootstrapLocalMongo(targetDir, initContext);
    await step4_MigrateAndSeedCore(targetDir, initContext);
    await step5_SyncSerializationSections(targetDir, initContext);
    const adminCreds = await step6_CreateAdminUser(initContext);
    await step7_PublishSampleContent(initContext);
    await step8_RunDoctorAndPrintSummary(targetDir, adminCreds, initContext);

    return {
      success: true,
      targetDir,
      projectName,
      dbPrefix,
    };
  } finally {
    // Dọn dẹp / khôi phục context cũ
    if (previousSiteDir) {
      process.env.TREECRAFT_SITE_DIR = previousSiteDir;
      sitePaths.setSiteDir(previousSiteDir);
    } else {
      delete process.env.TREECRAFT_SITE_DIR;
      sitePaths.resetCache();
    }
  }
}

module.exports = {
  initSite,
  slugify,
  generateSecurePassword,
  checkPortOpen,
  checkDockerAvailable,
  isInsideGitRepo,
};
