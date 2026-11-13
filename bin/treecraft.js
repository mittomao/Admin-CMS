#!/usr/bin/env node
'use strict';

/**
 * Treecraft CLI Entrypoint (DEC-056)
 * Quản trị và khởi chạy hệ thống Treecraft Core & Site
 */

const path = require('path');
const fs = require('fs');

// Phân tích tham số dòng lệnh
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Xử lý cờ --site nếu có trước khi nạp các module khác
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--site' && i + 1 < args.length) {
    process.env.TREECRAFT_SITE_DIR = path.resolve(args[i + 1]);
    break;
  }
  if (args[i].startsWith('--site=')) {
    process.env.TREECRAFT_SITE_DIR = path.resolve(args[i].slice(7));
    break;
  }
}

const sitePaths = require('../src/config/sitePaths');

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
  report('Thư mục Core có src/ và views/', fs.existsSync(path.join(coreDir, 'src')) && fs.existsSync(sitePaths.getCoreAdminViewsDir()));
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
    } else if (a === '--force' || a === '-f') {
      force = true;
    } else if (a === '--skip-db') {
      skipDb = true;
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
    });
  } catch (err) {
    console.error(`\n❌ [treecraft init] Khởi tạo thất bại: ${err.message}\n`);
    process.exit(1);
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

function handleHelp() {
  console.log(`
Treecraft CMS CLI (v1.0.0)
Sử dụng: treecraft <lệnh> [tùy chọn]

Các lệnh khả dụng:
  init [thư_mục]      Khởi tạo thư mục dự án site mới từ starter mẫu (mặc định: corporate)
                      Tùy chọn: --starter <tên>, --name <tên_site>, --db-prefix <prefix>,
                                --lang <vi|en>, --force, --skip-db
  start               Khởi động ứng dụng Treecraft Web & Admin Server
  dev                 Khởi động server ở chế độ phát triển (development)
  where               Hiển thị chi tiết đường dẫn Core và Site đang nạp
  doctor              Chẩn đoán tính toàn vẹn giữa Core và Site
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

