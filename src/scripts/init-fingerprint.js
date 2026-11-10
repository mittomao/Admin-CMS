/**
 * init-fingerprint.js
 * Gắn nhãn dấu vân tay môi trường (environmentFingerprint) vào collection 'settings'
 * Kiến trúc: DEC-052 / Phase E1
 * Usage:
 *   node src/scripts/init-fingerprint.js [--env development|staging|production] [--force]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const dbGuard = require('../config/dbGuard');

async function initFingerprint() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  let targetEnv = env.APP_ENV;

  const envArgIdx = args.indexOf('--env');
  if (envArgIdx !== -1 && args[envArgIdx + 1]) {
    targetEnv = args[envArgIdx + 1].trim();
  }

  if (!['development', 'staging', 'production'].includes(targetEnv)) {
    console.error(`❌ Môi trường "${targetEnv}" không hợp lệ. Chỉ chấp nhận: development, staging, production.`);
    process.exit(1);
  }

  const uri = env.MONGO_URI;
  const maskedUri = dbGuard.maskUri(uri);
  const hostType = dbGuard.classifyHost(uri);

  console.log('\n============================================================');
  console.log('  TREECRAFT CMS - KHỞI TẠO DẤU VÂN TAY MÔI TRƯỜNG');
  console.log('============================================================\n');
  console.log(`  Môi trường cần đóng dấu : [ ${targetEnv.toUpperCase()} ]`);
  console.log(`  Database Mục tiêu       : ${maskedUri} (${hostType.toUpperCase()})`);

  if (hostType === 'remote' && targetEnv === 'development') {
    console.error(`❌ LỖI AN TOÀN: Không được phép đóng dấu môi trường "development" lên máy chủ Remote!`);
    process.exit(1);
  }

  console.log('\nĐang kết nối tới MongoDB...');
  const conn = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10000,
  }).asPromise();

  try {
    const db = conn.db;
    const existing = await db.collection('settings').findOne({ key: 'environmentFingerprint' });

    if (existing && existing.value) {
      console.log(`\n⚠️ Database đã có dấu vân tay từ trước:`);
      console.log(`   - Môi trường ghi nhận : ${existing.value.appEnv}`);
      console.log(`   - Người thực hiện     : ${existing.value.taggedBy}`);
      console.log(`   - Thời gian gắn       : ${existing.value.taggedAt}`);

      if (existing.value.appEnv === targetEnv) {
        console.log(`\n✅ Dấu vân tay đã khớp chính xác với môi trường [${targetEnv}]. Không cần cập nhật.`);
        await conn.close();
        return;
      }

      if (!force) {
        console.error(`\n❌ CẢNH BÁO: Dấu vân tay hiện tại khác với môi trường yêu cầu! Thêm cờ --force để ghi đè.`);
        process.exit(1);
      }
    }

    console.log(`\nĐang tiến hành đóng dấu vân tay [${targetEnv}]...`);
    await dbGuard.stampFingerprint(db, targetEnv, `manual-cli:${process.env.USER || 'admin'}`);
    console.log(`🎉 ĐÓNG DẤU VÂN TAY THÀNH CÔNG CHO MÔI TRƯỜNG [${targetEnv.toUpperCase()}]!\n`);
  } finally {
    await conn.close();
  }
}

if (require.main === module) {
  initFingerprint()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Lỗi khởi tạo dấu vân tay:', err.message);
      process.exit(1);
    });
}

module.exports = initFingerprint;

