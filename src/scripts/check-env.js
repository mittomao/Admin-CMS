/**
 * check-env.js
 * Kiểm tra tính toàn vẹn của cấu hình môi trường (.env.example và .env / override)
 * Kiến trúc: DEC-052 (Single .env.example & Base .env Layering)
 * Usage: npm run check:env
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dbGuard = require('../config/dbGuard');

function runCheckEnv() {
  console.log('\n============================================================');
  console.log('  TREECRAFT CMS - KIỂM TRA CẤU HÌNH MÔI TRƯỜNG');
  console.log('============================================================\n');

  const sitePaths = require('../config/sitePaths');
  const siteDir = sitePaths.getSiteDir();
  const examplePath = fs.existsSync(path.join(siteDir, '.env.example'))
    ? path.join(siteDir, '.env.example')
    : path.join(sitePaths.getCoreDir(), '.env.example');

  // 1. Kiểm tra sự tồn tại của file mẫu duy nhất .env.example
  if (!fs.existsSync(examplePath)) {
    console.error('❌ Thiếu file mẫu bắt buộc: .env.example');
    process.exit(1);
  }
  console.log('✅ Tìm thấy file mẫu chuẩn hóa: .env.example');

  const exampleConfig = dotenv.parse(fs.readFileSync(examplePath, 'utf8'));
  const exampleKeys = Object.keys(exampleConfig);
  console.log(`📋 Tổng số khóa cấu hình định nghĩa trong .env.example: ${exampleKeys.length} khóa.`);

  // 2. Kiểm tra file cấu hình chính .env
  const mainEnvPath = sitePaths.getEnvPath();
  if (!fs.existsSync(mainEnvPath)) {
    console.error(`❌ Chưa có file cấu hình chính ".env" tại: ${mainEnvPath}`);
    console.error('   Vui lòng tạo file này từ .env.example');
    process.exit(1);
  }
  console.log('✅ Tìm thấy file cấu hình chính: .env');

  const mainConfig = dotenv.parse(fs.readFileSync(mainEnvPath, 'utf8'));
  let effectiveConfig = { ...mainConfig };

  // 3. Kiểm tra xem có file ghi đè theo môi trường không (.env.${APP_ENV})
  const appEnv = (process.env.APP_ENV || mainConfig.APP_ENV || 'development').trim();
  const overrideFile = `.env.${appEnv}`;
  const overridePath = sitePaths.getEnvPath(appEnv);

  if (fs.existsSync(overridePath)) {
    console.log(`ℹ️ Phát hiện file ghi đè môi trường: "${overrideFile}". Áp dụng layer override...`);
    const overrideConfig = dotenv.parse(fs.readFileSync(overridePath, 'utf8'));
    effectiveConfig = { ...effectiveConfig, ...overrideConfig };
  } else {
    console.log(`ℹ️ Không có file ghi đè riêng "${overrideFile}". Toàn bộ cấu hình nạp từ ".env".`);
  }

  // 4. Kiểm tra các khóa cốt lõi bắt buộc
  const mandatoryKeys = ['APP_ENV', 'PORT', 'MONGO_URI', 'SESSION_SECRET'];
  const missingMandatory = mandatoryKeys.filter((k) => !effectiveConfig[k]);

  if (missingMandatory.length > 0) {
    console.error(`❌ Cấu hình thiếu các khóa bắt buộc: ${missingMandatory.join(', ')}`);
    process.exit(1);
  }

  // 5. Kiểm tra chốt chặn an toàn dbGuard
  const rawUri = effectiveConfig.MONGO_URI || '';
  const hostType = dbGuard.classifyHost(rawUri);
  const maskedUri = dbGuard.maskUri(rawUri);
  const dbName = dbGuard.extractDatabaseName(rawUri);

  console.log(`\n🔍 Trạng thái Môi trường Hoạt động:`);
  console.log(`   - Môi trường (APP_ENV): ${appEnv.toUpperCase()}`);
  console.log(`   - Tên database đích   : ${dbName}`);
  console.log(`   - Loại máy chủ DB      : ${hostType.toUpperCase()}`);
  console.log(`   - Kết nối MongoDB     : ${maskedUri}`);
  console.log(`   - Thư mục Serialization: ${effectiveConfig.SERIALIZATION_DIR || 'Serialization'}`);

  // Kiểm tra quy tắc an toàn
  if (appEnv === 'development' && hostType === 'remote') {
    if (effectiveConfig.ALLOW_REMOTE_DB_IN_DEV !== 'true') {
      console.error(
        `\n❌ [dbGuard] LỖI AN TOÀN: APP_ENV=development nhưng MONGO_URI trỏ tới Remote (${maskedUri}) ` +
        `mà không có cờ ALLOW_REMOTE_DB_IN_DEV=true!`
      );
      process.exit(1);
    } else {
      console.warn(`\n⚠️ [dbGuard] CẢNH BÁO: Đang cho phép kết nối Remote trong môi trường Development.`);
    }
  } else if (appEnv === 'production' && hostType === 'local') {
    console.error(`\n❌ [dbGuard] LỖI AN TOÀN: APP_ENV=production nhưng MONGO_URI trỏ tới Local (${maskedUri})!`);
    process.exit(1);
  } else {
    console.log(`✅ Chốt chặn dbGuard: HỢP LỆ VÀ AN TOÀN.`);
  }

  console.log('\n🎉 KIỂM TRA MÔI TRƯỜNG THÀNH CÔNG!\n');
}

if (require.main === module) {
  runCheckEnv();
}

module.exports = runCheckEnv;
