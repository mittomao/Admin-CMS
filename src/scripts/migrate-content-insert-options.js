/**
 * Database Migration Script:
 * Reset insert options for /content and remove legacy templates (Page, Sample Item) from Folder template.
 *
 * Usage:
 *   node src/scripts/migrate-content-insert-options.js [--dry-run]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');
const Item = require('../models/Item');
const templateService = require('../services/templateService');

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('\n===============================================================');
  console.log(' MIGRATION: RESET /content INSERT OPTIONS TO PROJECT/PAGES');
  console.log('===============================================================');

  if (isDryRun) {
    console.log('>>> RUNNING IN DRY-RUN MODE (No changes will be written to DB) <<<\n');
  }

  console.log('(!) LƯU Ý QUAN TRỌNG:');
  console.log('    Vui lòng đảm bảo bạn đã tạo bản sao lưu Database (mongodump) trước khi thực thi.\n');

  const shouldConnect = mongoose.connection.readyState === 0;
  if (shouldConnect) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/sitecore_cms';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.\n');
  }

  try {
    // 1. Check Folder template
    console.log('--- BƯỚC 1: Kiểm tra Folder template insertOptions ---');
    const folderTpl = await Template.findOne({ name: 'Folder' });
    if (folderTpl) {
      console.log(`Tìm thấy Folder Template: ID = ${folderTpl._id}`);
      const legacyTemplates = await Template.find({
        name: { $in: ['Page', 'Sample Item'] },
      }).lean();
      const legacyIds = new Set(legacyTemplates.map((t) => t._id.toString()));

      const originalCount = (folderTpl.insertOptions || []).length;
      const cleanedInsertOptions = (folderTpl.insertOptions || []).filter(
        (id) => !legacyIds.has(id.toString())
      );

      if (cleanedInsertOptions.length !== originalCount) {
        console.log(`  -> Phát hiện ${originalCount - cleanedInsertOptions.length} template cũ (Page, Sample Item) trong Folder.insertOptions.`);
        if (!isDryRun) {
          folderTpl.insertOptions = cleanedInsertOptions;
          await folderTpl.save();
          console.log('  -> Đã cập nhật Folder.insertOptions loại bỏ Page/Sample Item thành công.');
        } else {
          console.log('  -> [DRY-RUN] Sẽ loại bỏ Page/Sample Item khỏi Folder.insertOptions.');
        }
      } else {
        console.log('  -> Folder.insertOptions đã sạch sẽ (không chứa Page/Sample Item cũ).');
      }
    } else {
      console.log('  -> Không tìm thấy Folder Template.');
    }

    // 1.5 Đồng bộ path & isSystem của Folder Template với Content Tree
    console.log('\n--- BƯỚC 1.5: Đồng bộ vị trí Template Folder (Common) ---');
    if (folderTpl) {
      const folderItem = await Item.findOne({ _id: folderTpl._id, deleted: false });
      if (folderItem && folderItem.path) {
        console.log(`  -> Item cây nội dung của Folder tại: ${folderItem.path}`);
        if (folderTpl.path !== folderItem.path || folderTpl.isSystem !== false) {
          console.log(`  -> Cần cập nhật Template.path từ '${folderTpl.path}' -> '${folderItem.path}', isSystem = false`);
          if (!isDryRun) {
            folderTpl.path = folderItem.path;
            folderTpl.isSystem = false;
            await folderTpl.save();
            console.log('  -> Đã cập nhật Template Folder thành công.');
          } else {
            console.log('  -> [DRY-RUN] Sẽ cập nhật Template Folder.');
          }
        } else {
          console.log('  -> Template Folder đã khớp chính xác với Item cây nội dung.');
        }
      }
    }

    // 2. Kiểm tra node /sitecore/content và Insert Options
    console.log('\n--- BƯỚC 2: Kiểm tra Insert Options cho node /sitecore/content ---');
    const contentNode = await Item.findOne({ path: '/sitecore/content', deleted: false });
    if (!contentNode) {
      console.log('  -> Không tìm thấy node /sitecore/content.');
    } else {
      console.log(`Tìm thấy node /sitecore/content: ID = ${contentNode._id}`);
      const insertOptions = await templateService.getInsertOptions(contentNode._id);
      console.log(`Danh sách Insert Options cho /sitecore/content (${insertOptions.length} templates):`);
      insertOptions.forEach((opt) => {
        console.log(`  - [${opt.name}] (path: ${opt.path || 'N/A'}) - ${opt.displayName || opt.name}`);
      });

      const invalidOptions = insertOptions.filter((opt) => {
        const p = (opt.path || '').toLowerCase();
        return p.includes('/feature/components') || (p.includes('/system') && opt.name !== 'Folder') || (opt.isSystem && opt.name !== 'Folder');
      });

      if (invalidOptions.length > 0) {
        console.warn(`  [CẢNH BÁO] Phát hiện ${invalidOptions.length} template không hợp lệ (Feature/System) trong Insert Options của /content!`);
      } else {
        console.log('  -> TẤT CẢ Insert Options của /sitecore/content đều hợp lệ (thuộc Project/Pages hoặc Common).');
      }
    }

    templateService.invalidateCache();
    console.log('\n>>> MIGRATION COMPLETED SUCCESSFULLY. <<<\n');
  } catch (error) {
    console.error('Lỗi trong quá trình migration:', error);
    throw error;
  } finally {
    if (shouldConnect) {
      await mongoose.disconnect();
      console.log('Đã ngắt kết nối MongoDB.');
    }
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigration };

