#!/usr/bin/env node

/**
 * Treecraft CMS CLI Binary (v1.0.0)
 * Điểm vào dòng lệnh duy nhất của hệ sinh thái Treecraft
 * Hỗ trợ các lệnh: init, start, dev, where, doctor, db:up, db:down, db:status, seed, migrate
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const sitePaths = require('../src/config/sitePaths');

const rawArgs = process.argv.slice(2);

// Trích xuất cờ toàn cục --site trước khi điều hướng lệnh
let explicitSiteDir = null;
const filteredArgs = [];
for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--site' && i + 1 < rawArgs.length) {
    explicitSiteDir = rawArgs[++i];
  } else if (arg.startsWith('--site=')) {
    explicitSiteDir = arg.slice(7);
  } else {
    filteredArgs.push(arg);
  }
}

if (explicitSiteDir) {
  sitePaths.setSiteDir(explicitSiteDir);
}

const command = filteredArgs[0] || 'help';
const args = filteredArgs;

async function handleWhere() {
  console.log('\n============================================================');
  console.log('  TREECRAFT CMS - THÔNG TIN ĐƯỜNG DẪN HỆ THỐNG');
  console.log('============================================================');
  console.log(`Core Engine Dir : ${sitePaths.getCoreDir()}`);
  try {
    const siteDir = sitePaths.getSiteDir();
    console.log(`Site Dir        : ${siteDir}`);
    console.log(`Views Dir       : ${sitePaths.getViewsDir()}`);
    console.log(`Public Dir      : ${sitePaths.getPublicDir()}`);
    console.log(`Serialization   : ${sitePaths.getSerializationDir()}`);
    console.log(`Backups Dir     : ${sitePaths.getBackupsDir()}`);
    console.log(`Env File        : ${sitePaths.getEnvPath()}`);

    const cfg = sitePaths.getSiteConfig();
    console.log(`Project Name    : ${cfg.projectName}`);
    console.log(`Root Name       : ${cfg.rootName} (${cfg.rootPath})`);
  } catch (err) {
    console.log(`Site Dir        : [Chưa tìm thấy / Lỗi: ${err.message}]`);
  }
  console.log(`Node Version    : ${process.version}`);
  console.log(`Process PID     : ${process.pid}`);
  console.log('============================================================\n');
}

async function handleDoctor() {
  console.log('\n============================================================');
  console.log('  TREECRAFT CMS - KIỂM TRA CHẨN ĐOÁN (DOCTOR)');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function report(label, isOk, detail = '') {
    if (isOk) {
      console.log(`  ✅ [PASS] ${label} ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${label} ${detail}`);
      failed++;
    }
  }

  // 1. Kiểm tra Core
  const coreDir = sitePaths.getCoreDir();
  report('Thư mục Core tồn tại', fs.existsSync(coreDir), `(${coreDir})`);
  report(
    'Thư mục Core có src/ và views/',
    fs.existsSync(path.join(coreDir, 'src')) && fs.existsSync(sitePaths.getCoreAdminViewsDir())
  );
  report('Thư mục Starter mẫu corporate', fs.existsSync(sitePaths.getStarterDir('corporate')));

  // 2. Kiểm tra Site
  let siteDir;
  try {
    siteDir = sitePaths.getSiteDir();
    report('Phân giải thư mục Site', true, `(${siteDir})`);
  } catch (err) {
    report('Phân giải thư mục Site', false, `: ${err.message}`);
  }

  if (siteDir && fs.existsSync(siteDir)) {
    // 3. Kiểm tra cấu hình site.config.js
    try {
      const cfg = sitePaths.getSiteConfig();
      report('Cấu hình site.config.js hợp lệ', true, `(Project: "${cfg.projectName}", Root: "${cfg.rootPath}")`);
    } catch (err) {
      report('Cấu hình site.config.js hợp lệ', false, `: ${err.message}`);
    }

    // 4. Kiểm tra các thư mục con bắt buộc
    report('Thư mục views/', fs.existsSync(sitePaths.getViewsDir()));
    report('Thư mục public/', fs.existsSync(sitePaths.getPublicDir()));
    report('Thư mục serialization/', fs.existsSync(sitePaths.getSerializationDir()));
    report('Thư mục backups/', fs.existsSync(sitePaths.getBackupsDir()));

    // 5. Kiểm tra file môi trường .env
    const envPath = sitePaths.getEnvPath();
    report('File cấu hình môi trường .env', fs.existsSync(envPath), `(${envPath})`);
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Kết quả: ${passed} bài kiểm tra đạt, ${failed} bài kiểm tra thất bại.`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

async function handleInit() {
  const initService = require('../src/services/initService');

  let targetDir = './site';
  let starter = 'corporate';
  let name = null;
  let root = 'root';
  let dbPrefix = null;
  let defaultLanguage = 'vi';
  let force = false;
  let skipDb = false;
  let dbUri = null;
  let adminUser = 'admin';
  let noSample = false;
  let noPublish = false;
  let dryRun = false;

  const remainingArgs = args.slice(1);
  for (let i = 0; i < remainingArgs.length; i++) {
    const a = remainingArgs[i];
    if (a === '--starter' && i + 1 < remainingArgs.length) {
      starter = remainingArgs[++i];
    } else if (a.startsWith('--starter=')) {
      starter = a.slice(10);
    } else if (a === '--name' && i + 1 < remainingArgs.length) {
      name = remainingArgs[++i];
    } else if (a.startsWith('--name=')) {
      name = a.slice(7);
    } else if (a === '--root' && i + 1 < remainingArgs.length) {
      root = remainingArgs[++i];
    } else if (a.startsWith('--root=')) {
      root = a.slice(7);
    } else if (a === '--db-prefix' && i + 1 < remainingArgs.length) {
      dbPrefix = remainingArgs[++i];
    } else if (a.startsWith('--db-prefix=')) {
      dbPrefix = a.slice(12);
    } else if (a === '--lang' && i + 1 < remainingArgs.length) {
      defaultLanguage = remainingArgs[++i];
    } else if (a.startsWith('--lang=')) {
      defaultLanguage = a.slice(7);
    } else if (a === '--db-uri' && i + 1 < remainingArgs.length) {
      dbUri = remainingArgs[++i];
    } else if (a.startsWith('--db-uri=')) {
      dbUri = a.slice(9);
    } else if (a === '--admin-user' && i + 1 < remainingArgs.length) {
      adminUser = remainingArgs[++i];
    } else if (a.startsWith('--admin-user=')) {
      adminUser = a.slice(13);
    } else if (a === '--force' || a === '-f') {
      force = true;
    } else if (a === '--skip-db') {
      skipDb = true;
    } else if (a === '--no-sample') {
      noSample = true;
    } else if (a === '--no-publish') {
      noPublish = true;
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (!a.startsWith('-')) {
      targetDir = a;
    }
  }

  try {
    await initService.initSite({
      targetDir,
      starter,
      name,
      root,
      dbPrefix,
      defaultLanguage,
      force,
      skipDb,
      dbUri,
      adminUser,
      noSample,
      noPublish,
      dryRun,
    });
  } catch (err) {
    console.error(`\n❌ [treecraft init] Khởi tạo thất bại: ${err.message}\n`);
    process.exit(1);
  }
}

function handleDbCommand(subCommand) {
  let siteDir = null;
  try {
    siteDir = sitePaths.getSiteDir();
  } catch {
    siteDir = path.resolve('./site');
  }

  const composeFile = path.join(siteDir, 'docker-compose.dev.yml');
  if (!fs.existsSync(composeFile)) {
    console.error(`❌ [Treecraft CLI] Không tìm thấy file docker-compose.dev.yml tại: ${composeFile}`);
    console.error(`   Vui lòng khởi tạo site trước bằng lệnh: treecraft init`);
    process.exit(1);
  }

  console.log(`\n🐳 [Treecraft Docker] Thực thi "docker compose ${subCommand.join(' ')}" cho Site tại: ${siteDir}`);
  const result = spawnSync('docker', ['compose', '-f', composeFile, ...subCommand], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function handleStart() {
  require('../src/server');
}

async function handleDev() {
  process.env.NODE_ENV = 'development';
  process.env.APP_ENV = process.env.APP_ENV || 'development';
  require('../src/server');
}

async function handleMigrate() {
  console.log('\n[Treecraft CLI] Bắt đầu chạy các bước Migration & Đồng bộ hệ thống...');
  try {
    require('../src/scripts/sync-system-templates');
    console.log('[Treecraft CLI] ✅ Đồng bộ System Templates hoàn tất.');
  } catch (err) {
    console.error(`[Treecraft CLI] ❌ Lỗi khi chạy migration: ${err.message}`);
    process.exit(1);
  }
}

async function handleSeed() {
  console.log('\n[Treecraft CLI] Bắt đầu khởi tạo dữ liệu mặc định (Seed Data) cho Site...');
  try {
    const seedData = require('../src/scripts/seed-initial-data');
    await seedData();
  } catch (err) {
    console.error(`\n❌ [Treecraft CLI] Lỗi khi seed database: ${err.message}`);
    process.exit(1);
  }
}

function handleHelp() {
  console.log(`
Treecraft CMS CLI (v1.0.0)
Sử dụng: treecraft <lệnh> [tùy chọn]

Các lệnh khả dụng:
  init [thư_mục]      Khởi tạo thư mục dự án site mới một bước từ starter mẫu (mặc định: corporate)
                      Tùy chọn: --name <tên_site>, --db-prefix <prefix>, --lang <vi|en>,
                                --db-uri <uri>, --admin-user <user>, --force, --skip-db,
                                --no-sample, --no-publish, --dry-run
  start               Khởi động ứng dụng Treecraft Web & Admin Server (Production)
  dev                 Khởi động server ở chế độ phát triển (Development)
  where               Hiển thị chi tiết đường dẫn Core và Site đang nạp
  doctor              Chẩn đoán tính toàn vẹn giữa Core và Site
  db:up               Khởi động container Docker MongoDB của site (up -d)
  db:down             Dừng container Docker MongoDB của site (down)
  db:status           Xem trạng thái container Docker MongoDB của site (ps)
  seed                Khởi tạo dữ liệu cơ bản cho DB local (Users, Roles, Admin)
  migrate             Chạy các migration hệ thống cần thiết
  help                Hiển thị trợ giúp này

Tùy chọn chung:
  --site <đường_dẫn>  Chỉ định thư mục dự án site/ cần nạp
  --help, -h          Hiển thị hướng dẫn sử dụng
`);
}

// Điều hướng lệnh
switch (command.toLowerCase()) {
  case 'init':
    handleInit();
    break;
  case 'start':
    handleStart();
    break;
  case 'dev':
    handleDev();
    break;
  case 'where':
    handleWhere();
    break;
  case 'doctor':
    handleDoctor();
    break;
  case 'db:up':
    handleDbCommand(['up', '-d']);
    break;
  case 'db:down':
    handleDbCommand(['down']);
    break;
  case 'db:status':
    handleDbCommand(['ps']);
    break;
  case 'seed':
    handleSeed();
    break;
  case 'migrate':
    handleMigrate();
    break;
  case 'help':
  case '--help':
  case '-h':
    handleHelp();
    break;
  default:
    console.error(`[Treecraft CLI] Lệnh không hợp lệ: "${command}"`);
    handleHelp();
    process.exit(1);
}
