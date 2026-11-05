'use strict';

/**
 * Migration Script: Di chuyển Media từ Local Storage sang Cloudinary
 *
 * Cách chạy:
 *   node scripts/migrate-media-to-cloudinary.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Media = require('../src/models/Media');
const LocalStorageProvider = require('../src/services/storage/LocalStorageProvider');
const CloudinaryStorageProvider = require('../src/services/storage/CloudinaryStorageProvider');

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== MIGRATION MEDIA TO CLOUDINARY ${isDryRun ? '(DRY RUN)' : ''} ===`);

  if (!process.env.MONGO_URI) {
    console.error('Lỗi: Chưa cấu hình biến môi trường MONGO_URI.');
    process.exit(1);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Lỗi: Chưa cấu hình đầy đủ Cloudinary credentials trong .env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Đã kết nối MongoDB.');

  const localProvider = new LocalStorageProvider();
  const cloudProvider = new CloudinaryStorageProvider();

  const query = {
    isFolder: false,
    isDeleted: false,
    $or: [
      { 'fileDetails.provider': 'local' },
      { 'fileDetails.provider': { $exists: false } },
      { 'fileDetails.provider': null }
    ]
  };

  const mediaList = await Media.find(query);
  console.log(`Tìm thấy ${mediaList.length} tài nguyên media cần xử lý.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const media of mediaList) {
    if (!media.fileDetails || !media.fileDetails.storagePath) {
      console.log(`[Bỏ qua] Media ${media.name} (${media._id}) không có thông tin fileDetails.`);
      skippedCount++;
      continue;
    }

    try {
      const localFilePath = localProvider.resolveSafePath(media.fileDetails.storagePath);
      if (!fs.existsSync(localFilePath)) {
        console.warn(`[Cảnh báo] File vật lý không tồn tại trên đĩa: ${localFilePath}`);
        skippedCount++;
        continue;
      }

      console.log(`[Đang xử lý] ${media.name} (${media.fileDetails.fileSize} bytes) -> Cloudinary...`);

      if (isDryRun) {
        console.log(`  -> [Dry-run] Sẽ upload ${media.fileDetails.originalName} lên Cloudinary.`);
        migratedCount++;
        continue;
      }

      const buffer = await fs.promises.readFile(localFilePath);
      const saveResult = await cloudProvider.saveFile({
        buffer,
        originalName: media.fileDetails.originalName || media.name,
        mimeType: media.fileDetails.mimeType
      });

      media.fileDetails.provider = 'cloudinary';
      media.fileDetails.publicId = saveResult.publicId;
      media.fileDetails.secureUrl = saveResult.secureUrl;
      media.fileDetails.thumbnailUrl = saveResult.thumbnailUrl;
      media.fileDetails.storagePath = saveResult.secureUrl;
      if (saveResult.dimensions) {
        media.fileDetails.dimensions = {
          width: saveResult.dimensions.width || media.fileDetails.dimensions?.width,
          height: saveResult.dimensions.height || media.fileDetails.dimensions?.height
        };
      }

      await media.save();
      console.log(`  -> [Thành công] Uploaded: ${saveResult.secureUrl}`);
      migratedCount++;
    } catch (err) {
      console.error(`  -> [Lỗi] Không thể migrate media ${media._id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('=== KẾT QUẢ MIGRATION ===');
  console.log(`- Đã chuyển đổi: ${migratedCount}`);
  console.log(`- Bỏ qua: ${skippedCount}`);
  console.log(`- Lỗi: ${errorCount}`);

  await mongoose.disconnect();
  console.log('Đã ngắt kết nối MongoDB.');
}

run().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});

