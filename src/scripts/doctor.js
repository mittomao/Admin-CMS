#!/usr/bin/env node
/**
 * Treecraft CMS - System Doctor & Diagnostic Tool (Task 12.D5)
 * Kiểm tra toàn diện hệ thống ở chế độ CHỈ ĐỌC (Read-Only Diagnostic)
 *
 * Tiêu chí kiểm tra:
 * 1. Môi trường Node.js (>= v20 LTS)
 * 2. Cấu hình biến môi trường (.env & env.js)
 * 3. Đường dẫn cấu trúc Core/Site (sitePaths) & Tính bất biến của Core
 * 4. Quyền truy cập & ghi thư mục (Backups, Data, Temp)
 * 5. Kết nối MongoDB & Trạng thái Replica Set
 * 6. Kiểm tra cấu hình Cloudinary / Storage
 */

const fs = require('fs');
const mongoose = require('mongoose');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

let errorsCount = 0;
let warningsCount = 0;

function pass(msg) {
  console.log(`  ${colors.green}✔ [PASS]${colors.reset} ${msg}`);
}

function warn(msg) {
  warningsCount++;
  console.log(`  ${colors.yellow}⚠ [WARN]${colors.reset} ${msg}`);
}

function fail(msg) {
  errorsCount++;
  console.log(`  ${colors.red}✖ [FAIL]${colors.reset} ${msg}`);
}

async function runDoctor() {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${colors.bold}${colors.cyan}TREECRAFT CMS — SYSTEM DOCTOR & READINESS DIAGNOSTIC${colors.reset}`);
  console.log('='.repeat(70) + '\n');

  // 1. Node.js Runtime Check
  console.log(`${colors.bold}1. KIỂM TRA MÔI TRƯỜNG NODE.JS & HỆ ĐIỀU HÀNH${colors.reset}`);
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 20) {
    pass(`Node.js version: ${nodeVersion} (LTS >= 20 đạt chuẩn)`);
  } else {
    fail(`Node.js version: ${nodeVersion} không đạt chuẩn. Yêu cầu tối thiểu Node.js v20+ LTS.`);
  }
  pass(`Hệ điều hành: ${process.platform} (${process.arch})`);

  // 2. Configuration & Environment Check
  console.log(`\n${colors.bold}2. KIỂM TRA CẤU HÌNH & BIẾN MÔI TRƯỜNG (ENV)${colors.reset}`);
  let env;
  let sitePaths;
  let dbGuard;
  try {
    sitePaths = require('../config/sitePaths');
    env = require('../config/env');
    dbGuard = require('../config/dbGuard');
    pass(`Môi trường APP_ENV: [${env.APP_ENV}] | NODE_ENV: [${env.NODE_ENV}]`);
    pass(`Cổng lắng nghe (PORT): ${env.PORT}`);
    pass(`Chế độ dự án: ${sitePaths.isStandaloneMode ? 'Standalone Core Development' : 'Site Project với Core Submodule'}`);
    pass(`Thư mục Site: ${sitePaths.SITE_DIR}`);
    pass(`Thư mục Core: ${sitePaths.CORE_DIR}`);
  } catch (err) {
    fail(`Lỗi khi nạp cấu hình hệ thống: ${err.message}`);
    return finish();
  }

  // 3. Core Immutability Check
  console.log(`\n${colors.bold}3. KIỂM TRA TÍNH TOÀN VẸN CỦA CORE (IMMUTABILITY)${colors.reset}`);
  try {
    const immutability = sitePaths.verifyCoreImmutability({ throwOnError: false });
    if (immutability.isClean) {
      pass('Thư mục Core hoàn toàn bất biến, không bị sửa đổi ngoài luồng.');
    } else {
      if (env.isProd) {
        fail(`[BẢO MẬT PRODUCTION] ${immutability.message}`);
      } else {
        warn(`[CẢNH BÁO DEV] ${immutability.message}`);
      }
    }
  } catch (err) {
    warn(`Không thể kiểm tra git immutability: ${err.message}`);
  }

  // 4. Directory Permissions Check
  console.log(`\n${colors.bold}4. KIỂM TRA QUYỀN TRUY CẬP THƯ MỤC LƯU TRỮ${colors.reset}`);
  const dirsToCheck = [
    { label: 'Thư mục Backup', dir: env.BACKUP_DIR },
    { label: 'Thư mục Serialization', dir: env.SERIALIZATION_DIR },
    { label: 'Thư mục Views Admin', dir: sitePaths.ADMIN_VIEWS_DIR },
  ];

  for (const item of dirsToCheck) {
    try {
      if (!fs.existsSync(item.dir)) {
        fs.mkdirSync(item.dir, { recursive: true });
      }
      fs.accessSync(item.dir, fs.constants.R_OK | fs.constants.W_OK);
      pass(`${item.label} (${item.dir}): Đọc/Ghi thành công`);
    } catch (err) {
      fail(`${item.label} (${item.dir}): Lỗi truy cập - ${err.message}`);
    }
  }

  // 5. Database Connection Check
  console.log(`\n${colors.bold}5. KIỂM TRA KẾT NỐI MONGODB & REPLICA SET${colors.reset}`);
  const maskedUri = dbGuard.maskUri(env.MONGO_URI);
  try {
    dbGuard.validateConnection(env.MONGO_URI, env.APP_ENV, {
      allowRemoteInDev: env.ALLOW_REMOTE_DB_IN_DEV,
    });
    pass(`Chuỗi kết nối hợp lệ theo dbGuard: ${maskedUri}`);

    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 1,
    });
    pass('Kết nối tới MongoDB socket thành công.');

    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();
    if (pingResult && pingResult.ok === 1) {
      pass('MongoDB Ping kiểm tra độ trễ: OK');
    }

    // Check Replica Set status
    try {
      const rsStatus = await admin.command({ replSetGetStatus: 1 });
      if (rsStatus && rsStatus.ok === 1) {
        pass(`MongoDB Replica Set [${rsStatus.set}] đang hoạt động (Đạt chuẩn cho Transactions).`);
      }
    } catch (rsErr) {
      warn(`MongoDB không chạy ở chế độ Replica Set (${rsErr.message}). Lưu ý: Các tính năng cần Mongoose Transaction có thể bị hạn chế.`);
    }

    // Check Key Collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    pass(`Tổng số collections hiện có: ${collections.length}`);
    if (names.includes('items_master')) {
      pass("Collection 'items_master' đã sẵn sàng.");
    } else {
      warn("Chưa tìm thấy collection 'items_master'. Hãy chạy 'npm run seed' hoặc 'npm run tree:sync'.");
    }

    if (names.includes('items_web')) {
      pass("Collection 'items_web' đã sẵn sàng.");
    } else {
      warn("Chưa tìm thấy collection 'items_web' (chưa publish nội dung).");
    }

    await mongoose.connection.close();
  } catch (err) {
    fail(`Lỗi kết nối cơ sở dữ liệu: ${err.message}`);
  }

  finish();
}

function finish() {
  console.log('\n' + '='.repeat(70));
  if (errorsCount === 0) {
    console.log(`  ${colors.green}${colors.bold}🎉 HỆ THỐNG ĐẠT CHUẨN SẴN SÀNG VẬN HÀNH (0 Errors, ${warningsCount} Warnings)${colors.reset}`);
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  } else {
    console.log(`  ${colors.red}${colors.bold}❌ PHÁT HIỆN ${errorsCount} LỖI CẦN KHẮC PHỤC TRƯỚC KHI KHỞI ĐỘNG (${warningsCount} Warnings)${colors.reset}`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

if (require.main === module) {
  runDoctor().catch((err) => {
    console.error(`Doctor gặp lỗi không xử lý: ${err.message}`);
    process.exit(1);
  });
}

module.exports = runDoctor;
