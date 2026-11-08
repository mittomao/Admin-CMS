/**
 * Script đồng bộ hóa trực tiếp các System Template (Layout, Rendering, Placeholder)
 * và dọn dẹp các artifact legacy thời kỳ React trong cơ sở dữ liệu.
 *
 * Cách chạy:
 *   node src/scripts/sync-system-templates.js --dry-run   (chạy thử, không ghi DB)
 *   node src/scripts/sync-system-templates.js             (thực thi trực tiếp)
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Template = require('../models/Template');
const Item = require('../models/Item');
const branding = require('../config/branding');

const isDryRun = process.argv.includes('--dry-run');

async function syncSystemTemplates() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Không tìm thấy cấu hình MONGO_URI trong file .env');
  }

  const shouldDisconnect = mongoose.connection.readyState === 0;
  if (shouldDisconnect) {
    await mongoose.connect(uri);
  }

  console.log('===============================================================');
  console.log(`ĐỒNG BỘ SYSTEM TEMPLATES CHO SERVER-SIDE EJS PRESENTATION`);
  console.log(`Chế độ: ${isDryRun ? 'DRY-RUN (CHỈ KIỂM TRA, KHÔNG GHI DB)' : 'THỰC THI THỰC TẾ'}`);
  console.log('===============================================================\n');

  let templatesUpdated = 0;
  let itemsUpdated = 0;
  let legacyCleaned = 0;

  // 1. Cập nhật System Template "Layout"
  const layoutTemplate = await Template.findOne({ name: 'Layout' });
  if (layoutTemplate) {
    const layoutSections = [
      {
        name: 'Layout Data',
        sortOrder: 100,
        fields: [
          {
            name: 'viewPath',
            title: 'EJS View Path',
            type: 'Single-Line Text',
            required: true,
            sortOrder: 10,
            helpText: 'Đường dẫn view EJS tương đối từ src/views (ví dụ: site/layouts/HomeLayout.ejs)',
          },
        ],
      },
    ];

    console.log(`[Layout Template] Đang cập nhật sections:`);
    console.log(`  - Section: Layout Data`);
    console.log(`  - Field: viewPath (Single-Line Text, required: true)`);

    if (!isDryRun) {
      layoutTemplate.sections = layoutSections;
      layoutTemplate.displayName = 'Layout';
      layoutTemplate.description = 'Layout Page Server-Side EJS';
      layoutTemplate.isSystem = true;
      layoutTemplate.icon = 'ti ti-layout';
      await layoutTemplate.save();
    }
    templatesUpdated++;
  } else {
    console.log(`[CẢNH BÁO] Không tìm thấy Template 'Layout'`);
  }

  // 2. Cập nhật System Template "Rendering"
  const renderingTemplate = await Template.findOne({ name: 'Rendering' });
  if (renderingTemplate) {
    const renderingSections = [
      {
        name: 'Rendering Data',
        sortOrder: 100,
        fields: [
          {
            name: 'viewPath',
            title: 'EJS View Path',
            type: 'Single-Line Text',
            required: true,
            sortOrder: 10,
            helpText: 'Đường dẫn view EJS tương đối từ src/views (ví dụ: site/components/HeroBanner.ejs)',
          },
          {
            name: 'componentTemplate',
            title: 'Component Template',
            type: 'Single-Line Text',
            required: true,
            sortOrder: 20,
            source: `${branding.PATHS.TEMPLATES}/Feature/Components`,
            helpText: 'Template định nghĩa fields của component dưới Feature/Components',
          },
          {
            name: 'parametersTemplate',
            title: 'Parameters Template',
            type: 'Single-Line Text',
            sortOrder: 30,
          },
          {
            name: 'icon',
            title: 'Tabler Icon',
            type: 'Single-Line Text',
            sortOrder: 40,
            defaultValue: 'ti ti-box',
          },
        ],
      },
    ];

    console.log(`\n[Rendering Template] Đang cập nhật sections:`);
    console.log(`  - Section: Rendering Data`);
    console.log(`  - Field: viewPath (Single-Line Text, required: true)`);
    console.log(`  - Field: componentTemplate (Single-Line Text, required: true)`);
    console.log(`  - Field: parametersTemplate (Single-Line Text)`);
    console.log(`  - Field: icon (Single-Line Text)`);

    if (!isDryRun) {
      renderingTemplate.sections = renderingSections;
      renderingTemplate.displayName = 'Rendering';
      renderingTemplate.description = 'Rendering Component kết xuất bằng EJS phía server';
      renderingTemplate.isSystem = true;
      renderingTemplate.icon = 'ti ti-components';
      await renderingTemplate.save();
    }
    templatesUpdated++;
  } else {
    console.log(`[CẢNH BÁO] Không tìm thấy Template 'Rendering'`);
  }

  // 3. Tìm các Component Template để map ID cho các Rendering hiện có
  const heroBannerTpl = await Template.findOne({ name: 'HeroBanner' });
  const introTpl = await Template.findOne({ name: 'Introduction' });
  const imageTextTpl = await Template.findOne({ name: 'ImageText' });

  // 4. Đồng bộ các Rendering items hiện có
  const renderingItemsConfig = [
    { name: 'HeroBanner', viewPath: 'site/components/HeroBanner.ejs', icon: 'ti ti-ad-2', compTpl: heroBannerTpl?._id },
    { name: 'Introduction', viewPath: 'site/components/Introduction.ejs', icon: 'ti ti-file-description', compTpl: introTpl?._id },
    { name: 'ImageText', viewPath: 'site/components/ImageText.ejs', icon: 'ti ti-photo', compTpl: imageTextTpl?._id },
  ];

  for (const rConf of renderingItemsConfig) {
    const item = await Item.findOne({ name: rConf.name, path: { $regex: '^/Renderings' } });
    if (item) {
      let changed = false;
      if (item.fields instanceof Map) {
        if (!item.fields.get('viewPath') || item.fields.get('viewPath') !== rConf.viewPath) {
          item.fields.set('viewPath', rConf.viewPath);
          changed = true;
        }
        if (rConf.compTpl && (!item.fields.get('componentTemplate') || item.fields.get('componentTemplate') !== rConf.compTpl.toString())) {
          item.fields.set('componentTemplate', rConf.compTpl.toString());
          changed = true;
        }
        if (!item.fields.get('icon') || item.fields.get('icon') !== rConf.icon) {
          item.fields.set('icon', rConf.icon);
          changed = true;
        }
      } else {
        item.fields = item.fields || {};
        if (item.fields.viewPath !== rConf.viewPath) {
          item.fields.viewPath = rConf.viewPath;
          changed = true;
        }
        if (rConf.compTpl && item.fields.componentTemplate !== rConf.compTpl.toString()) {
          item.fields.componentTemplate = rConf.compTpl.toString();
          changed = true;
        }
        if (item.fields.icon !== rConf.icon) {
          item.fields.icon = rConf.icon;
          changed = true;
        }
      }

      // Shared fields
      if (item.sharedFields instanceof Map) {
        if (item.sharedFields.get('viewPath') !== rConf.viewPath) {
          item.sharedFields.set('viewPath', rConf.viewPath);
          changed = true;
        }
        if (rConf.compTpl && item.sharedFields.get('componentTemplate') !== rConf.compTpl.toString()) {
          item.sharedFields.set('componentTemplate', rConf.compTpl.toString());
          changed = true;
        }
      }

      if (changed) {
        console.log(`[Rendering Item] Cập nhật fields cho: ${item.path}`);
        if (!isDryRun) {
          await item.save();
        }
        itemsUpdated++;
      }
    }
  }

  // 5. Đồng bộ Layout Item "HomeLayout"
  const homeLayoutItem = await Item.findOne({ name: 'HomeLayout', path: { $regex: '^/Layouts' } });
  if (homeLayoutItem) {
    let changed = false;
    const viewPath = 'site/layouts/HomeLayout.ejs';
    if (homeLayoutItem.fields instanceof Map) {
      if (homeLayoutItem.fields.get('viewPath') !== viewPath) {
        homeLayoutItem.fields.set('viewPath', viewPath);
        changed = true;
      }
    } else {
      homeLayoutItem.fields = homeLayoutItem.fields || {};
      if (homeLayoutItem.fields.viewPath !== viewPath) {
        homeLayoutItem.fields.viewPath = viewPath;
        changed = true;
      }
    }
    if (changed) {
      console.log(`[Layout Item] Cập nhật viewPath cho: ${homeLayoutItem.path}`);
      if (!isDryRun) {
        await homeLayoutItem.save();
      }
      itemsUpdated++;
    }
  }

  // 6. Dọn dẹp legacy items cũ thời kỳ React
  const legacyPaths = [
    '/Layouts/MainLayout',
    '/Renderings/Feature',
  ];

  for (const lPath of legacyPaths) {
    const legacyItem = await Item.findOne({ path: lPath });
    if (legacyItem) {
      console.log(`[Dọn dẹp Legacy] Tìm thấy node không còn dùng: ${lPath}`);
      if (!isDryRun) {
        await Item.deleteMany({ ancestors: legacyItem._id });
        await Item.deleteOne({ _id: legacyItem._id });
      }
      legacyCleaned++;
    }
  }

  console.log('\n===============================================================');
  console.log('KẾT QUẢ ĐỒNG BỘ:');
  console.log(`  - System Templates đã cập nhật: ${templatesUpdated}`);
  console.log(`  - Items được bổ sung fields:    ${itemsUpdated}`);
  console.log(`  - Legacy Items đã dọn dẹp:      ${legacyCleaned}`);
  console.log(`  - Chế độ: ${isDryRun ? 'DRY-RUN (Chưa ghi DB)' : 'ĐÃ GHI DATABASE THÀNH CÔNG'}`);
  console.log('===============================================================\n');

  if (shouldDisconnect) {
    await mongoose.disconnect();
  }

  return { templatesUpdated, itemsUpdated, legacyCleaned };
}

if (require.main === module) {
  syncSystemTemplates()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Lỗi đồng bộ:', err);
      process.exit(1);
    });
}

module.exports = { syncSystemTemplates };
