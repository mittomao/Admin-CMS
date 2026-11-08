/**
 * Database Migration Script:
 * Seed and ensure system template 'Standard Template' at /root/templates/System/Standard Template.
 * Automatically migrates existing 'Sample Component' if present.
 *
 * Usage:
 *   node src/scripts/migrate-sample-component-template.js [--dry-run]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');
const Item = require('../models/Item');

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('\n===============================================================');
  console.log(' MIGRATION: SEED / RENAME SYSTEM TEMPLATE [Standard Template]');
  console.log('===============================================================');

  if (isDryRun) {
    console.log('>>> RUNNING IN DRY-RUN MODE (No changes will be written to DB) <<<\n');
  }

  console.log('(!) LƯU Ý QUAN TRỌNG:');
  console.log('    Vui lòng đảm bảo bạn đã tạo bản sao lưu Database (mongodump) trước khi thực thi.\n');

  const shouldConnect = mongoose.connection.readyState === 0;
  if (shouldConnect) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/treecraft_cms';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.\n');
  }

  try {
    // 1. Check or create Template document
    console.log('--- BƯỚC 1: Kiểm tra / Tạo / Đổi tên Template [Standard Template] ---');
    let standardTpl = await Template.findOne({
      $or: [{ name: 'Standard Template' }, { name: 'Sample Component' }],
    });
    const expectedPath = '/root/templates/System/Standard Template';

    if (!standardTpl) {
      console.log('  -> Chưa có template [Standard Template]. Tiến hành tạo mới...');
      if (!isDryRun) {
        standardTpl = await Template.create({
          name: 'Standard Template',
          displayName: 'Standard Template',
          icon: 'ti ti-box',
          isSystem: true,
          description: 'Mẫu component trống để khởi tạo component hoặc page template mới',
          path: expectedPath,
          sections: [],
          baseTemplates: [],
          standardValues: {},
          insertOptions: [],
        });
        console.log(`  -> Đã tạo Template [Standard Template]: ID = ${standardTpl._id}`);
      } else {
        console.log('  -> [DRY-RUN] Sẽ tạo Template [Standard Template].');
        standardTpl = new Template({
          _id: new mongoose.Types.ObjectId(),
          name: 'Standard Template',
          path: expectedPath,
        });
      }
    } else {
      console.log(`  -> Tìm thấy Template: ID = ${standardTpl._id}, Current Name = ${standardTpl.name}`);
      let updated = false;
      if (standardTpl.name !== 'Standard Template') {
        standardTpl.name = 'Standard Template';
        standardTpl.displayName = 'Standard Template';
        updated = true;
      }
      if (standardTpl.path !== expectedPath) {
        standardTpl.path = expectedPath;
        updated = true;
      }
      if (standardTpl.isSystem !== true) {
        standardTpl.isSystem = true;
        updated = true;
      }
      if (updated && !isDryRun) {
        await standardTpl.save();
        console.log('  -> Đã cập nhật tên và thuộc tính cho Template [Standard Template].');
      } else if (updated) {
        console.log('  -> [DRY-RUN] Sẽ cập nhật tên và thuộc tính cho Template [Standard Template].');
      } else {
        console.log('  -> Template [Standard Template] đã hợp lệ.');
      }
    }

    // 2. Check or create Item node in Content Tree
    console.log('\n--- BƯỚC 2: Kiểm tra / Đồng bộ Item [Standard Template] trong Cây Nội Dung ---');
    const systemFolder = await Item.findOne({ path: '/root/templates/System', deleted: false });
    const templateDefTpl = await Template.findOne({ name: 'Template' });

    if (!systemFolder) {
      console.log('  [CẢNH BÁO] Không tìm thấy node thư mục /root/templates/System.');
    } else {
      let standardItem = await Item.findById(standardTpl._id);
      if (!standardItem) {
        console.log('  -> Chưa có Item cây nội dung cho [Standard Template]. Tiến hành tạo...');
        if (!isDryRun) {
          standardItem = await Item.create({
            _id: standardTpl._id,
            name: 'Standard Template',
            displayName: 'Standard Template',
            icon: 'ti ti-box',
            templateId: templateDefTpl ? templateDefTpl._id : standardTpl._id,
            parentId: systemFolder._id,
            ancestors: [...systemFolder.ancestors, systemFolder._id],
            path: expectedPath,
            sortOrder: 50,
            fields: {},
            sharedFields: {},
            languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
            presentation: { shared: { layoutId: null, renderings: [] }, final: [] },
            deleted: false,
          });
          console.log(`  -> Đã tạo Item [Standard Template] tại: ${standardItem.path}`);
        } else {
          console.log(`  -> [DRY-RUN] Sẽ tạo Item [Standard Template] tại: ${expectedPath}`);
        }
      } else {
        console.log(`  -> Tìm thấy Item: ID = ${standardItem._id}, Path = ${standardItem.path}`);
        let itemUpdated = false;
        if (standardItem.name !== 'Standard Template') {
          standardItem.name = 'Standard Template';
          standardItem.displayName = 'Standard Template';
          itemUpdated = true;
        }
        if (standardItem.path !== expectedPath) {
          standardItem.path = expectedPath;
          itemUpdated = true;
        }
        if (standardItem.parentId?.toString() !== systemFolder._id.toString()) {
          standardItem.parentId = systemFolder._id;
          standardItem.ancestors = [...systemFolder.ancestors, systemFolder._id];
          itemUpdated = true;
        }
        if (standardItem.deleted) {
          standardItem.deleted = false;
          itemUpdated = true;
        }
        if (itemUpdated && !isDryRun) {
          await standardItem.save();
          console.log('  -> Đã cập nhật Item [Standard Template] thành công.');
        } else if (itemUpdated) {
          console.log('  -> [DRY-RUN] Sẽ cập nhật Item [Standard Template].');
        } else {
          console.log('  -> Item [Standard Template] đã hợp lệ.');
        }
      }
    }

    console.log('\n>>> MIGRATION COMPLETED SUCCESSFULLY. <<<\n');
    return standardTpl;
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
