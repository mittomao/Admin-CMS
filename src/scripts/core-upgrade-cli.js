#!/usr/bin/env node
/**
 * Treecraft CMS - Core Upgrade & Automated Rollback CLI (Task 12.E3)
 * Quy trình nâng cấp Core an toàn và khôi phục khi gặp sự cố:
 * 1. check   : Kiểm tra tính sẵn sàng trước khi nâng cấp
 * 2. prepare : Tự động tạo bản sao lưu an toàn (pre-upgrade backup) và lưu trạng thái rollback
 * 3. verify  : Xác minh sau khi cập nhật submodule Core (chạy doctor & schema verification)
 * 4. rollback: Tự động khôi phục dữ liệu từ bản sao lưu pre-upgrade nếu phiên bản mới bị lỗi
 */

const fs = require('fs');
const path = require('path');
const sitePaths = require('../config/sitePaths');
const env = require('../config/env');
const backupService = require('../services/backupService');
const runDoctor = require('./doctor');

const STATE_FILE = path.resolve(sitePaths.SITE_DIR, '.core-upgrade-state.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function printBanner() {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${colors.bold}${colors.cyan}TREECRAFT CMS — CORE UPGRADE & ROLLBACK LIFECYCLE${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

async function handleCheck() {
  printBanner();
  console.log(`${colors.bold}1. KIỂM TRA MÔ HÌNH DỰ ÁN & SUBMODULE${colors.reset}`);
  console.log(`- Mô hình: ${sitePaths.isStandaloneMode ? 'Standalone Core' : 'Site Project với Core Submodule'}`);
  console.log(`- Thư mục Site: ${sitePaths.SITE_DIR}`);
  console.log(`- Thư mục Core: ${sitePaths.CORE_DIR}`);

  const immutability = sitePaths.verifyCoreImmutability({ throwOnError: false });
  if (immutability.isClean) {
    console.log(`  ${colors.green}✔ Core sạch sẽ, không có thay đổi untracked.${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠ Cảnh báo: ${immutability.message}${colors.reset}`);
  }

  if (fs.existsSync(STATE_FILE)) {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    console.log(`\n${colors.yellow}[LƯU Ý] Đang có tiến trình nâng cấp chưa hoàn tất ghi nhận tại:${colors.reset}`);
    console.log(`- Backup ID: ${state.backupId}`);
    console.log(`- Thời điểm tạo: ${state.createdAt}`);
    console.log(`- Bạn có thể chạy "npm run core:rollback" để khôi phục hoặc "npm run core:verify" để chốt phiên bản.`);
  } else {
    console.log(`\n${colors.green}Hệ thống sẵn sàng để bắt đầu tiến trình nâng cấp Core!${colors.reset}`);
    console.log(`Chạy lệnh: ${colors.bold}npm run core:prepare${colors.reset}`);
  }
}

async function handlePrepare() {
  printBanner();
  console.log(`${colors.bold}BƯỚC 1: TẠO BẢN SAO LƯU AN TOÀN TRƯỚC NÂNG CẤP (PRE-UPGRADE BACKUP)${colors.reset}`);

  const backupResult = await backupService.createBackup({
    label: 'pre-core-upgrade',
    isAuto: true,
  });

  if (!backupResult.success) {
    console.error(`${colors.red}Tạo bản sao lưu thất bại: ${backupResult.error}${colors.reset}`);
    process.exit(1);
  }

  const state = {
    backupId: backupResult.backupId,
    createdAt: new Date().toISOString(),
    coreDir: sitePaths.CORE_DIR,
    siteDir: sitePaths.SITE_DIR,
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');

  console.log(`\n${colors.green}✔ Tạo bản sao lưu an toàn thành công!${colors.reset}`);
  console.log(`- Backup ID:   ${colors.bold}${backupResult.backupId}${colors.reset}`);
  console.log(`- Kích thước:  ${backupResult.sizeBytes} bytes`);
  console.log(`- File state:  ${STATE_FILE}`);

  console.log(`\n${colors.bold}BƯỚC 2: TIẾN HÀNH CẬP NHẬT SUBMODULE CORE${colors.reset}`);
  console.log(`Bạn có thể thực hiện lệnh sau trên terminal của Site:`);
  console.log(`  ${colors.cyan}git submodule update --remote core${colors.reset}`);
  console.log(`  ${colors.cyan}npm install${colors.reset}`);
  console.log(`Sau đó kiểm tra xác minh bằng lệnh:`);
  console.log(`  ${colors.bold}npm run core:verify${colors.reset}\n`);
}

async function handleVerify() {
  printBanner();
  console.log(`${colors.bold}XÁC MINH TOÀN DIỆN PHIÊN BẢN CORE MỚI${colors.reset}`);

  try {
    await runDoctor();
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log(`\n${colors.green}✔ Đã giải phóng file trạng thái nâng cấp (.core-upgrade-state.json).${colors.reset}`);
    }
    console.log(`\n${colors.green}🎉 NÂNG CẤP CORE HOÀN TẤT THÀNH CÔNG VÀ AN TOÀN!${colors.reset}\n`);
  } catch (err) {
    console.error(`\n${colors.red}✖ Xác minh thất bại: ${err.message}${colors.reset}`);
    console.log(`Nếu phiên bản mới gây lỗi, bạn có thể hoàn tác ngay bằng:`);
    console.log(`  ${colors.bold}npm run core:rollback${colors.reset}\n`);
    process.exit(1);
  }
}

async function handleRollback() {
  printBanner();
  console.log(`${colors.bold}TIẾN TRÌNH KHÔI PHỤC TỰ ĐỘNG (CORE ROLLBACK)${colors.reset}`);

  if (!fs.existsSync(STATE_FILE)) {
    console.error(`${colors.red}Không tìm thấy file trạng thái nâng cấp (.core-upgrade-state.json).${colors.reset}`);
    console.log(`Vui lòng chỉ định Backup ID thủ công qua lệnh: npm run backup:restore <backupId>`);
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  console.log(`- Tìm thấy bản sao lưu an toàn: ${colors.bold}${state.backupId}${colors.reset}`);
  console.log(`- Đang tiến hành khôi phục cơ sở dữ liệu in-place...`);

  const dbGuard = require('../config/dbGuard');
  const targetDbName = dbGuard.extractDatabaseName(env.MONGO_URI);

  const restoreResult = await backupService.restoreBackup(state.backupId, {
    mode: 'in-place',
    force: true,
    confirmDbName: targetDbName,
  });

  if (restoreResult.success) {
    console.log(`\n${colors.green}✔ KHÔI PHỤC DỮ LIỆU THÀNH CÔNG!${colors.reset}`);
    console.log(`- Database: ${restoreResult.targetDb}`);
    console.log(`- Bản ghi phục hồi: ${restoreResult.totalRestored}`);
    console.log(`\n${colors.yellow}LƯU Ý CUỐI: Hãy checkout lại phiên bản Core submodule cũ nếu cần:${colors.reset}`);
    console.log(`  git submodule update --init --recursive\n`);
    fs.unlinkSync(STATE_FILE);
  } else {
    console.error(`\n${colors.red}✖ Khôi phục thất bại: ${restoreResult.error}${colors.reset}`);
    process.exit(1);
  }
}

const command = process.argv[2] || 'check';

switch (command) {
  case 'check':
    handleCheck().catch((e) => console.error(e));
    break;
  case 'prepare':
    handlePrepare().catch((e) => console.error(e));
    break;
  case 'verify':
    handleVerify().catch((e) => console.error(e));
    break;
  case 'rollback':
    handleRollback().catch((e) => console.error(e));
    break;
  default:
    console.log(`Cú pháp: node src/scripts/core-upgrade-cli.js [check|prepare|verify|rollback]`);
    process.exit(1);
}
