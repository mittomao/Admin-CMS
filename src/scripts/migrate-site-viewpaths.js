/**
 * migrate-site-viewpaths.js
 * Chuẩn hóa các đường dẫn viewPath trong database Master và Web theo DEC-056 (GĐ S1).
 * Loại bỏ tiền tố cứng "site/", "views/site/", "src/views/site/" thành đường dẫn tương đối trong site/views/
 *
 * Hỗ trợ cờ:
 *   --dry-run: Chỉ quét và báo cáo số lượng, không thay đổi DB
 *   --yes: Bỏ qua bước xác nhận
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const dbGuard = require('../config/dbGuard');
const backupService = require('../services/backupService');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');

function normalizeViewPath(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  let p = raw.trim().replace(/\\/g, '/');
  if (p.startsWith('/')) p = p.substring(1);
  if (p.startsWith('src/views/site/')) p = p.substring(15);
  if (p.startsWith('views/site/')) p = p.substring(11);
  if (p.startsWith('site/')) p = p.substring(5);
  return p;
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('\n============================================================');
  console.log(`  MIGRATION: CHUẨN HOÁ VIEWPATH THEO DEC-056 ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log('============================================================\n');

  await connectDB();

  if (!isDryRun) {
    console.log('📦 Tự động tạo bản sao lưu an toàn (GĐ K1) trước khi migration...');
    try {
      const backup = await backupService.createBackup({
        type: 'full',
        notes: 'Auto-backup before migrate-site-viewpaths (Phase S1)',
      });
      console.log(`✅ Đã tạo sao lưu thành công: ID "${backup.backupId}"\n`);
    } catch (err) {
      console.error(`❌ Không thể tạo sao lưu tự động: ${err.message}`);
      console.error('Migration bị hủy để đảm bảo an toàn dữ liệu.');
      await disconnectDB();
      process.exit(1);
    }
  }

  let totalScanned = 0;
  let totalUpdated = 0;

  const models = [
    { name: 'Master Store (items_master)', model: Item },
    { name: 'Web Store (items_web)', model: PublishedItem },
  ];

  for (const { name, model } of models) {
    console.log(`🔍 Đang quét collection: ${name}...`);
    const cursor = model.find({}).cursor();

    for await (const doc of cursor) {
      totalScanned++;
      let modified = false;

      // 1. Kiểm tra sharedFields.viewPath
      if (doc.sharedFields && typeof doc.sharedFields === 'object') {
        const val = doc.sharedFields.get ? doc.sharedFields.get('viewPath') : doc.sharedFields.viewPath;
        if (val) {
          const norm = normalizeViewPath(val);
          if (norm !== val) {
            if (doc.sharedFields.set) {
              doc.sharedFields.set('viewPath', norm);
            } else {
              doc.sharedFields.viewPath = norm;
            }
            modified = true;
          }
        }
      }

      // 2. Kiểm tra fields.viewPath
      if (doc.fields && typeof doc.fields === 'object') {
        const val = doc.fields.get ? doc.fields.get('viewPath') : doc.fields.viewPath;
        if (val) {
          const norm = normalizeViewPath(val);
          if (norm !== val) {
            if (doc.fields.set) {
              doc.fields.set('viewPath', norm);
            } else {
              doc.fields.viewPath = norm;
            }
            modified = true;
          }
        }
      }

      // 3. Kiểm tra presentation.finalLayout hoặc renderings
      if (doc.presentation && doc.presentation.finalLayout && Array.isArray(doc.presentation.finalLayout.renderings)) {
        for (const r of doc.presentation.finalLayout.renderings) {
          if (r.viewPath) {
            const norm = normalizeViewPath(r.viewPath);
            if (norm !== r.viewPath) {
              r.viewPath = norm;
              modified = true;
            }
          }
        }
      }

      if (modified) {
        totalUpdated++;
        console.log(`  📝 [${name}] Item "${doc.name}" (${doc.path || doc._id}) cần chuẩn hóa viewPath.`);
        if (!isDryRun) {
          await doc.save();
        }
      }
    }
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Tổng số item đã quét   : ${totalScanned}`);
  console.log(`Tổng số item chuẩn hóa : ${totalUpdated}`);
  console.log(`Chế độ                 : ${isDryRun ? 'DRY RUN (Không lưu)' : 'COMPLETED (Đã lưu)'}`);
  console.log('------------------------------------------------------------\n');

  await disconnectDB();
}

if (require.main === module) {
  run().catch((err) => {
    console.error(`❌ Migration thất bại: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { normalizeViewPath, run };

