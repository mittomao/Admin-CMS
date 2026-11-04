/**
 * Database Migration Script for Phase 6.2:
 * Associate Renderings with Component Templates & Detach Component Templates from Page Templates baseTemplates.
 *
 * Usage:
 *   node src/scripts/migrate-rendering-component-templates.js [--dry-run] [--rollback]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Template = require('../models/Template');
const Item = require('../models/Item');

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

async function runMigration() {
  console.log('\n===============================================================');
  console.log(' MIGRATION: RENDERING COMPONENT TEMPLATES & EFFECTIVE RESOLUTION');
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
    // 1. Quét Component Templates dưới Feature/Components
    console.log('--- BƯỚC 1: Quét Component Templates ---');
    const compTemplates = await Template.find({
      isSystem: false,
      $or: [
        { path: { $regex: '^/sitecore/templates/Feature/Components', $options: 'i' } },
        { name: { $in: ['HeroBanner', 'Introduction', 'ImageText'] } },
      ],
    }).lean();

    console.log(`Tìm thấy ${compTemplates.length} Component Template(s):`);
    const compTplMapByName = new Map();
    const compTplIds = new Set();
    compTemplates.forEach((t) => {
      console.log(`  - [${t.name}] ID: ${t._id} | Display: ${t.displayName || t.name}`);
      compTplMapByName.set(t.name.toLowerCase().replace(/[^a-z0-9]/g, ''), t._id);
      compTplIds.add(t._id.toString());
    });

    // 2. Quét Renderings và liên kết componentTemplate
    console.log('\n--- BƯỚC 2: Kiểm tra & Gán componentTemplate cho Renderings ---');
    const renderingTemplate = await Template.findOne({ name: 'Rendering' }).lean();
    const renderingQuery = {
      deleted: false,
      $or: [
        { path: { $regex: '^/sitecore/layout/renderings', $options: 'i' } },
        ...(renderingTemplate ? [{ templateId: renderingTemplate._id }] : []),
      ],
    };

    const renderings = await Item.find(renderingQuery);
    console.log(`Tìm thấy ${renderings.length} Rendering item(s):`);

    let updatedRenderingsCount = 0;
    const unmatchedRenderings = [];

    for (const r of renderings) {
      const currentCompTpl = r.fields?.get?.('componentTemplate') || r.fields?.componentTemplate ||
        r.sharedFields?.get?.('componentTemplate') || r.sharedFields?.componentTemplate;

      if (isRollback) {
        // Rollback: clear componentTemplate
        if (currentCompTpl) {
          console.log(`  [ROLLBACK] Gỡ componentTemplate khỏi rendering: ${r.name}`);
          if (!isDryRun) {
            r.fields.delete('componentTemplate');
            r.sharedFields.delete('componentTemplate');
            await r.save();
          }
        }
        continue;
      }

      if (currentCompTpl && compTplIds.has(currentCompTpl.toString())) {
        console.log(`  [OK] Rendering "${r.name}" đã được gán componentTemplate: ${currentCompTpl}`);
        continue;
      }

      // Khớp theo tên
      const normalizedName = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedTplId = compTplMapByName.get(normalizedName);

      if (matchedTplId) {
        console.log(`  [UPDATE] Khớp rendering "${r.name}" -> Template ID: ${matchedTplId}`);
        if (!isDryRun) {
          if (r.fields instanceof Map) {
            r.fields.set('componentTemplate', matchedTplId.toString());
          } else {
            r.set('fields.componentTemplate', matchedTplId.toString());
          }
          if (r.sharedFields instanceof Map) {
            r.sharedFields.set('componentTemplate', matchedTplId.toString());
          } else {
            r.set('sharedFields.componentTemplate', matchedTplId.toString());
          }
          await r.save();
        }
        updatedRenderingsCount++;
      } else {
        console.warn(`  [WARN] Không khớp được Component Template nào cho rendering: "${r.name}" (ID: ${r._id})`);
        unmatchedRenderings.push({ id: r._id, name: r.name, path: r.path });
      }
    }

    if (unmatchedRenderings.length > 0) {
      console.log(`\n(!) CẢNH BÁO: Có ${unmatchedRenderings.length} rendering(s) chưa khớp được:`);
      unmatchedRenderings.forEach((u) => console.log(`    - ${u.name} (ID: ${u.id}, Path: ${u.path})`));
      console.log('    Quản trị viên cần tự gán componentTemplate thủ công trong Content Editor.');
    }

    // 3. Gỡ các Component Template ra khỏi baseTemplates của Page Templates
    console.log('\n--- BƯỚC 3: Gỡ Component Templates khỏi Page Templates (baseTemplates) ---');
    const pageTemplates = await Template.find({
      isSystem: false,
      $or: [
        { path: { $regex: '^/sitecore/templates/Project/Pages', $options: 'i' } },
        { name: { $in: ['Home', 'AboutUs', 'About us', 'About-Us'] } },
      ],
    });

    let modifiedPageTemplatesCount = 0;
    for (const pt of pageTemplates) {
      const origBaseCount = (pt.baseTemplates || []).length;
      if (origBaseCount === 0) continue;

      const filteredBases = (pt.baseTemplates || []).filter((baseId) => !compTplIds.has(baseId.toString()));

      if (filteredBases.length !== origBaseCount) {
        const removedCount = origBaseCount - filteredBases.length;
        console.log(`  [DETACH] Page Template "${pt.name}": Đã loại bỏ ${removedCount} Component Template(s) khỏi baseTemplates`);
        if (!isDryRun) {
          pt.baseTemplates = filteredBases;
          await pt.save();
        }
        modifiedPageTemplatesCount++;
      } else {
        console.log(`  [OK] Page Template "${pt.name}" không kế thừa component template nào.`);
      }
    }

    // 4. Kiểm tra tính toàn vẹn dữ liệu của các Page Items
    console.log('\n--- BƯỚC 4: Kiểm tra Toàn vẹn Dữ liệu Items ---');
    const sampleItems = await Item.find({
      deleted: false,
      path: { $in: ['/sitecore/content/home', '/sitecore/content/about-us'] },
    });

    for (const item of sampleItems) {
      const fieldsCount = item.fields ? (item.fields.size || Object.keys(item.fields).length) : 0;
      console.log(`  Item "${item.path}": Bảo toàn ${fieldsCount} giá trị trường trong cơ sở dữ liệu.`);
    }

    console.log('\n===============================================================');
    console.log(' KẾT QUẢ MIGRATION:');
    console.log(`  - Renderings được cập nhật: ${updatedRenderingsCount}`);
    console.log(`  - Page Templates được tách base: ${modifiedPageTemplatesCount}`);
    console.log(`  - Chế độ Dry-Run: ${isDryRun ? 'CÓ (Không ghi DB)' : 'KHÔNG (Đã ghi DB)'}`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('Lỗi trong quá trình migration:', err);
    process.exitCode = 1;
  } finally {
    if (shouldConnect) {
      await mongoose.disconnect();
      console.log('Đã ngắt kết nối MongoDB.');
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
