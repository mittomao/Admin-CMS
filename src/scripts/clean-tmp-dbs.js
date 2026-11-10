/**
 * clean-tmp-dbs.js
 * Quét và dọn dẹp các database tạm mồ côi (admin_cms_tmp_*) sinh ra trong quá trình chạy test
 * Kiến trúc: DEC-052 / Phase E1
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const dbGuard = require('../config/dbGuard');
const logger = require('../utils/logger');

async function cleanTmpDatabases() {
  const targetUri = process.env.TEST_MONGO_URI || env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const hostType = dbGuard.classifyHost(targetUri);

  if (hostType === 'remote') {
    console.error(
      '\x1b[31m%s\x1b[0m',
      `[clean-tmp FATAL] Từ chối thực thi trên máy chủ Remote (${dbGuard.maskUri(targetUri)}). ` +
      `Lệnh này chỉ được chạy trên MongoDB Local để dọn database tạm test!`
    );
    process.exit(1);
  }

  console.log(`[db:clean-tmp] Đang kết nối tới ${dbGuard.maskUri(targetUri)}...`);

  const connection = await mongoose.createConnection(targetUri, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  try {
    const adminDb = connection.db.admin();
    const dbsResult = await adminDb.listDatabases();
    const allDbs = dbsResult.databases || [];

    // Chỉ tìm các DB có tiền tố/hậu tố tmp an toàn
    const tmpDbs = allDbs.filter((d) => d.name.startsWith('admin_cms_tmp_') || d.name.includes('_tmp_'));

    if (tmpDbs.length === 0) {
      console.log('✅ Không tìm thấy database tạm nào cần dọn dẹp. Hệ thống sạch sẽ!');
      await connection.close();
      return;
    }

    console.log(`🧹 Phát hiện ${tmpDbs.length} database tạm test cần dọn dẹp:`);
    for (const d of tmpDbs) {
      console.log(`   - Đang xóa: ${d.name} (${Math.round((d.sizeOnDisk || 0) / 1024)} KB)...`);
      await connection.client.db(d.name).dropDatabase();
      console.log(`     ✅ Đã xóa ${d.name}`);
    }

    console.log(`\n🎉 Dọn dẹp hoàn tất! Đã xóa thành công ${tmpDbs.length} database tạm.`);
  } finally {
    await connection.close();
  }
}

if (require.main === module) {
  cleanTmpDatabases()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[clean-tmp ERROR]:', err.message);
      process.exit(1);
    });
}

module.exports = cleanTmpDatabases;

