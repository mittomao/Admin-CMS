/**
 * clone-from-remote.js
 * Sao chép an toàn 1 chiều từ MongoDB Cloud (Staging hoặc Production) về Local Docker MongoDB
 * Kiến trúc: DEC-052 / Phase E1
 * Usage:
 *   npm run db:clone-from-remote -- --env staging|production [--yes] [--no-anonymize]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const dbGuard = require('../config/dbGuard');
const sitePaths = require('../config/sitePaths');

// Danh sách collection mặc định loại trừ khi clone
const EXCLUDED_COLLECTIONS = ['sessions', 'rate_limits', 'cache'];

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function cloneFromRemote() {
  const args = process.argv.slice(2);
  const skipPrompt = args.includes('--yes') || args.includes('-y');
  const shouldAnonymize = !args.includes('--no-anonymize');

  let sourceEnv = 'staging';
  let sourceUri = null;
  const envArgIdx = args.indexOf('--env');
  if (envArgIdx !== -1 && args[envArgIdx + 1]) {
    sourceEnv = args[envArgIdx + 1].trim();
  }

  const sourceUriIdx = args.indexOf('--source-uri');
  if (sourceUriIdx !== -1 && args[sourceUriIdx + 1]) {
    sourceUri = args[sourceUriIdx + 1].trim();
  }

  const sourceFileIdx = args.indexOf('--source-file');
  let customSourceFile = null;
  if (sourceFileIdx !== -1 && args[sourceFileIdx + 1]) {
    customSourceFile = args[sourceFileIdx + 1].trim();
  }

  // 1. Xác định URI nguồn (từ CLI flag, từ file chỉ định, từ .env.<env>, hoặc fallback từ .env cũ)
  let sourceEnvFile = customSourceFile || `.env.${sourceEnv}`;
  let sourceEnvPath = customSourceFile ? path.resolve(sitePaths.getSiteDir(), customSourceFile) : sitePaths.getEnvPath(sourceEnv);

  if (!sourceUri) {
    if (!fs.existsSync(sourceEnvPath)) {
      // Kiểm tra xem có file .env cũ chứa URI Cloud không
      const legacyPath = sitePaths.getEnvPath();
      if (fs.existsSync(legacyPath)) {
        const legacyConfig = dotenv.parse(fs.readFileSync(legacyPath, 'utf8'));
        if (legacyConfig.MONGO_URI && dbGuard.classifyHost(legacyConfig.MONGO_URI) === 'remote') {
          console.log(`ℹ️ Không tìm thấy "${sourceEnvFile}", tự động sử dụng cấu hình Cloud từ file ".env" cũ.`);
          sourceEnvFile = '.env';
          sourceEnvPath = legacyPath;
          sourceUri = legacyConfig.MONGO_URI;
        }
      }
    }

    if (!sourceUri) {
      if (!fs.existsSync(sourceEnvPath)) {
        console.error(`❌ Không tìm thấy file cấu hình nguồn "${sourceEnvFile}".`);
        console.error(`   Vui lòng tạo file ${sourceEnvFile} chứa MONGO_URI của cụm Cloud cần clone,`);
        console.error(`   hoặc truyền trực tiếp: npm run db:clone-from-remote -- --source-file .env`);
        process.exit(1);
      }

      const sourceConfig = dotenv.parse(fs.readFileSync(sourceEnvPath, 'utf8'));
      sourceUri = sourceConfig.MONGO_URI;
    }
  }

  if (!sourceUri) {
    console.error(`❌ Không tìm thấy biến MONGO_URI trong ${sourceEnvFile}.`);
    process.exit(1);
  }

  // 2. Đọc cấu hình đích từ .env.development
  const devEnvPath = sitePaths.getEnvPath('development');
  if (!fs.existsSync(devEnvPath)) {
    console.error(`❌ Không tìm thấy file cấu hình đích ".env.development" tại: ${devEnvPath}`);
    process.exit(1);
  }

  const devConfig = dotenv.parse(fs.readFileSync(devEnvPath, 'utf8'));
  const destUri = devConfig.MONGO_URI || 'mongodb://127.0.0.1:27017/admin_cms?replicaSet=rs0';

  // 3. CHỐT CHẶN AN TOÀN TUYỆT ĐỐI VỀ MÁY CHỦ ĐÍCH
  const destHostType = dbGuard.classifyHost(destUri);
  if (destHostType === 'remote') {
    console.error(
      '\x1b[31m%s\x1b[0m',
      `[clone-from-remote FATAL] CHẶN LỆNH: Máy chủ đích (${dbGuard.maskUri(destUri)}) là REMOTE!\n` +
      `Lệnh clone CHỈ ĐƯỢC PHÉP ghi vào MongoDB Local (127.0.0.1). Không bao giờ được clone đè lên Remote khác!`
    );
    process.exit(1);
  }

  const sourceMasked = dbGuard.maskUri(sourceUri);
  const destMasked = dbGuard.maskUri(destUri);
  const destDbName = dbGuard.extractDatabaseName(destUri);

  console.log('\n============================================================');
  console.log('  TREECRAFT CMS - SAO CHÉP DỮ LIỆU TỪ CLOUD VỀ LOCAL');
  console.log('============================================================\n');
  console.log(`  Nguồn (Cloud ${sourceEnv.toUpperCase()}) : ${sourceMasked}`);
  console.log(`  Đích (Local Docker)       : ${destMasked}`);
  console.log(`  Database Mục tiêu         : ${destDbName}`);
  console.log(`  Ẩn danh hóa (--anonymize) : ${shouldAnonymize ? 'CÓ (Khuyến nghị)' : 'KHÔNG'}`);
  console.log(`  Loại trừ collections     : ${EXCLUDED_COLLECTIONS.join(', ')}`);
  console.log('\n⚠️ CẢNH BÁO: Dữ liệu hiện tại trong MongoDB Local sẽ bị GHI ĐÈ bằng dữ liệu từ Cloud!\n');

  if (!skipPrompt) {
    const confirm = await promptUser('Bạn có chắc chắn muốn tiếp tục? Gõ "yes" để xác nhận: ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Thao tác đã bị hủy bỏ bởi người dùng.');
      process.exit(0);
    }
  }

  console.log('\n[1/4] Đang kết nối tới máy chủ nguồn (Cloud) và máy chủ đích (Local)...');
  const sourceConn = await mongoose.createConnection(sourceUri, { serverSelectionTimeoutMS: 15000 }).asPromise();
  const destConn = await mongoose.createConnection(destUri, { serverSelectionTimeoutMS: 5000 }).asPromise();

  try {
    const sourceDb = sourceConn.db;
    const destDb = destConn.db;

    // Lấy danh sách collection từ nguồn
    const collections = await sourceDb.listCollections().toArray();
    const targetCols = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.') && !EXCLUDED_COLLECTIONS.includes(name));

    console.log(`[2/4] Phát hiện ${targetCols.length} collections hợp lệ để sao chép.`);

    const devPasswordHash = await bcrypt.hash('adminpass123', 10);
    let totalDocsCloned = 0;

    for (const colName of targetCols) {
      process.stdout.write(`   - Sao chép "${colName}"... `);
      const sourceCol = sourceDb.collection(colName);
      const destCol = destDb.collection(colName);

      const docs = await sourceCol.find({}).toArray();

      // Xóa dữ liệu cũ ở local
      await destCol.deleteMany({});

      if (docs.length > 0) {
        // Áp dụng ẩn danh nếu sao chép collection users
        if (shouldAnonymize && colName === 'users') {
          docs.forEach((u) => {
            if (u.username !== 'admin') {
              u.email = `user_${u._id.toString().slice(-6)}@treecraft.local`;
            }
            // Đặt lại mật khẩu thành 'adminpass123' cho môi trường dev
            u.password = devPasswordHash;
          });
        }

        // Xóa bí mật Basic Auth trong collection settings nếu có
        if (shouldAnonymize && colName === 'settings') {
          docs.forEach((s) => {
            if (s.key === 'basicAuthUsers' || s.key === 'basicAuthCredentials') {
              s.value = [];
            }
          });
        }

        await destCol.insertMany(docs);
        totalDocsCloned += docs.length;
      }

      console.log(`✅ (${docs.length} bản ghi)`);
    }

    // [3/4] Sao chép Indexes (DEC-052)
    console.log('\n[3/4] Sao chép cấu trúc Indexes từ nguồn sang đích...');
    for (const colName of targetCols) {
      try {
        const indexes = await sourceDb.collection(colName).indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse, expireAfterSeconds } = idx;
          const opts = { name };
          if (unique) opts.unique = true;
          if (sparse) opts.sparse = true;
          if (expireAfterSeconds !== undefined) opts.expireAfterSeconds = expireAfterSeconds;

          try {
            await destDb.collection(colName).createIndex(key, opts);
          } catch (idxErr) {
            // Index có thể đã tồn tại
          }
        }
      } catch (err) {
        // Bỏ qua lỗi index nhỏ
      }
    }
    console.log('✅ Đã đồng bộ toàn bộ Indexes.');

    // [4/4] Đóng dấu vân tay môi trường Development cho database Local vừa clone
    console.log('\n[4/4] Đóng dấu vân tay môi trường Development cho Local Database...');
    await dbGuard.stampFingerprint(destDb, 'development', `clone-from-${sourceEnv}`);
    console.log('✅ Đã gắn settings.environmentFingerprint = "development".');

    console.log('\n============================================================');
    console.log('🎉 SAO CHÉP DỮ LIỆU TỪ CLOUD VỀ LOCAL THÀNH CÔNG!');
    console.log(`   - Tổng collections  : ${targetCols.length}`);
    console.log(`   - Tổng bản ghi      : ${totalDocsCloned}`);
    console.log(`   - Mật khẩu Dev User : adminpass123`);
    console.log(`   - Local MongoDB     : ${destMasked}`);
    console.log('============================================================\n');
  } finally {
    await sourceConn.close();
    await destConn.close();
  }
}

if (require.main === module) {
  cloneFromRemote()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Lỗi tiến trình clone:', err.message);
      process.exit(1);
    });
}

module.exports = cloneFromRemote;

