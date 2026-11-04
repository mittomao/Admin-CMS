/**
 * Migration Script: Di chuyển toàn bộ Template vào Cây Nội dung (Content Tree)
 * Cấu trúc phân cấp: /sitecore/templates/ (System, Feature/Components, Project/Pages)
 *
 * Cách chạy:
 *   node src/scripts/migrate-templates-to-content-tree.js --dry-run
 *   node src/scripts/migrate-templates-to-content-tree.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Template = require('../models/Template');
const Item = require('../models/Item');

const isDryRun = process.argv.includes('--dry-run');

async function migrateTemplatesToContentTree() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Không tìm thấy biến môi trường MONGO_URI');
  }

  const shouldDisconnect = mongoose.connection.readyState === 0;
  if (shouldDisconnect) {
    await mongoose.connect(uri);
  }

  console.log('===============================================================');
  console.log('MIGRATION: DI CHUYỂN TEMPLATES VÀO CONTENT TREE (/sitecore/templates)');
  console.log(`Chế độ: ${isDryRun ? 'DRY-RUN (CHỈ KIỂM TRA, KHÔNG GHI DB)' : 'THỰC THI THỰC TẾ'}`);
  console.log('===============================================================\n');

  // 1. Root /sitecore
  const sitecoreRoot = await Item.findOne({ path: '/sitecore' });
  if (!sitecoreRoot) {
    throw new Error('Chưa tìm thấy node gốc /sitecore. Vui lòng chạy seed ban đầu trước.');
  }

  // 2. Đảm bảo 2 System Template: "Template Folder" và "Template"
  let templateFolderTpl = await Template.findOne({ name: 'Template Folder' });
  if (!templateFolderTpl) {
    console.log('[Tạo Template] Template Folder');
    if (!isDryRun) {
      templateFolderTpl = await Template.create({
        name: 'Template Folder',
        displayName: 'Template Folder',
        icon: 'ti ti-folder',
        isSystem: true,
        description: 'Thư mục phân cấp quản lý Templates',
        sections: [],
      });
    } else {
      templateFolderTpl = new Template({ _id: new mongoose.Types.ObjectId(), name: 'Template Folder' });
    }
  }

  let templateDefTpl = await Template.findOne({ name: 'Template' });
  if (!templateDefTpl) {
    console.log('[Tạo Template] Template (Definition)');
    if (!isDryRun) {
      templateDefTpl = await Template.create({
        name: 'Template',
        displayName: 'Template',
        icon: 'ti ti-template',
        isSystem: true,
        description: 'Định nghĩa Item Template trong CMS',
        sections: [],
      });
    } else {
      templateDefTpl = new Template({ _id: new mongoose.Types.ObjectId(), name: 'Template' });
    }
  }

  // Helper đảm bảo folder item
  async function ensureFolderItem(folderData) {
    let item = await Item.findOne({ path: folderData.path });
    if (!item) {
      console.log(`[Tạo Thư mục Tree] ${folderData.path}`);
      if (!isDryRun) {
        item = await Item.create({
          ...folderData,
          templateId: templateFolderTpl._id,
          fields: {},
          sharedFields: {},
          languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
          presentation: { shared: { layoutId: null, renderings: [] }, final: [] },
          deleted: false,
        });
      } else {
        item = new Item({ _id: new mongoose.Types.ObjectId(), ...folderData });
      }
    } else {
      let updated = false;
      if (item.deleted) {
        item.deleted = false;
        updated = true;
      }
      if (item.templateId?.toString() !== templateFolderTpl._id.toString()) {
        item.templateId = templateFolderTpl._id;
        updated = true;
      }
      if (item.displayName !== folderData.displayName) {
        item.displayName = folderData.displayName;
        updated = true;
      }
      if (updated && !isDryRun) {
        await item.save();
      }
    }
    return item;
  }

  // 3. Khởi tạo cây thư mục chuẩn dưới /sitecore/templates
  const templatesRoot = await ensureFolderItem({
    name: 'templates',
    displayName: 'Templates',
    parentId: sitecoreRoot._id,
    ancestors: [sitecoreRoot._id],
    path: '/sitecore/templates',
    sortOrder: 400,
    icon: 'ti ti-folder',
  });

  const systemFolder = await ensureFolderItem({
    name: 'System',
    displayName: 'System',
    parentId: templatesRoot._id,
    ancestors: [sitecoreRoot._id, templatesRoot._id],
    path: '/sitecore/templates/System',
    sortOrder: 100,
    icon: 'ti ti-folder-cog',
  });

  const featureFolder = await ensureFolderItem({
    name: 'Feature',
    displayName: 'Feature',
    parentId: templatesRoot._id,
    ancestors: [sitecoreRoot._id, templatesRoot._id],
    path: '/sitecore/templates/Feature',
    sortOrder: 200,
    icon: 'ti ti-folder-star',
  });

  const componentsFolder = await ensureFolderItem({
    name: 'Components',
    displayName: 'Components',
    parentId: featureFolder._id,
    ancestors: [sitecoreRoot._id, templatesRoot._id, featureFolder._id],
    path: '/sitecore/templates/Feature/Components',
    sortOrder: 100,
    icon: 'ti ti-folder-plus',
  });

  const projectFolder = await ensureFolderItem({
    name: 'Project',
    displayName: 'Project',
    parentId: templatesRoot._id,
    ancestors: [sitecoreRoot._id, templatesRoot._id],
    path: '/sitecore/templates/Project',
    sortOrder: 300,
    icon: 'ti ti-folder',
  });

  const pagesFolder = await ensureFolderItem({
    name: 'Pages',
    displayName: 'Pages',
    parentId: projectFolder._id,
    ancestors: [sitecoreRoot._id, templatesRoot._id, projectFolder._id],
    path: '/sitecore/templates/Project/Pages',
    sortOrder: 100,
    icon: 'ti ti-folder',
  });

  // 4. Dọn dẹp dummy items cũ dưới /sitecore/templates (nếu không phải là một trong các folder chuẩn)
  const standardFolderIds = [
    templatesRoot._id.toString(),
    systemFolder._id.toString(),
    featureFolder._id.toString(),
    componentsFolder._id.toString(),
    projectFolder._id.toString(),
    pagesFolder._id.toString(),
  ];

  const allTemplates = await Template.find({});
  const allTemplateIds = new Set(allTemplates.map((t) => t._id.toString()));

  const existingTreeItems = await Item.find({
    path: { $regex: '^/sitecore/templates', $options: 'i' },
  });

  let dummyCleaned = 0;
  for (const it of existingTreeItems) {
    const idStr = it._id.toString();
    if (!standardFolderIds.includes(idStr) && !allTemplateIds.has(idStr)) {
      console.log(`[Dọn dẹp Dummy Item] ${it.path} (ID: ${it._id})`);
      if (!isDryRun) {
        await Item.deleteMany({ ancestors: it._id });
        await Item.deleteOne({ _id: it._id });
      }
      dummyCleaned++;
    }
  }

  // 5. Đồng bộ từng Template thành một node Item trong Cây Nội Dung
  let templatesMigrated = 0;
  for (const tpl of allTemplates) {
    let targetFolder = systemFolder;

    // Phân loại template theo nhánh thư mục
    if (['HeroBanner', 'Introduction', 'ImageText'].includes(tpl.name) ||
        (tpl.path && tpl.path.toLowerCase().includes('/feature/components'))) {
      targetFolder = componentsFolder;
    } else if (['Home', 'AboutUs'].includes(tpl.name) ||
               (tpl.path && tpl.path.toLowerCase().includes('/project/pages'))) {
      targetFolder = pagesFolder;
    } else {
      targetFolder = systemFolder;
    }

    const expectedPath = `${targetFolder.path}/${tpl.name}`;
    console.log(`[Đồng bộ Template] ${tpl.name} -> ${expectedPath}`);

    if (!isDryRun) {
      let item = await Item.findById(tpl._id);
      if (!item) {
        // Tạo mới item với cùng ID của Template
        item = new Item({
          _id: tpl._id,
          name: tpl.name,
          displayName: tpl.displayName || tpl.name,
          icon: tpl.icon || (tpl.isSystem ? 'ti ti-file-code' : 'ti ti-template'),
          templateId: templateDefTpl._id,
          parentId: targetFolder._id,
          ancestors: [...targetFolder.ancestors, targetFolder._id],
          path: expectedPath,
          sortOrder: tpl.isSystem ? 10 : 100,
          fields: {},
          sharedFields: {},
          languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
          presentation: { shared: { layoutId: null, renderings: [] }, final: [] },
          deleted: false,
        });
        await item.save();
      } else {
        // Cập nhật thuộc tính của item
        item.name = tpl.name;
        item.displayName = tpl.displayName || tpl.name;
        item.icon = tpl.icon || (tpl.isSystem ? 'ti ti-file-code' : 'ti ti-template');
        item.templateId = templateDefTpl._id;
        item.parentId = targetFolder._id;
        item.ancestors = [...targetFolder.ancestors, targetFolder._id];
        item.path = expectedPath;
        item.deleted = false;
        await item.save();
      }

      // Cập nhật path trên tài liệu Template
      tpl.path = expectedPath;
      await tpl.save();
    }
    templatesMigrated++;
  }

  console.log('\n===============================================================');
  console.log('KẾT QUẢ MIGRATION:');
  console.log(`  - Templates đã chuyển vào Content Tree: ${templatesMigrated}`);
  console.log(`  - Dummy Nodes cũ đã dọn dẹp:           ${dummyCleaned}`);
  console.log(`  - Chế độ: ${isDryRun ? 'DRY-RUN (Chưa ghi DB)' : 'ĐÃ GHI DATABASE THÀNH CÔNG'}`);
  console.log('===============================================================\n');

  if (shouldDisconnect) {
    await mongoose.disconnect();
  }

  return { templatesMigrated, dummyCleaned };
}

if (require.main === module) {
  migrateTemplatesToContentTree()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Lỗi migration:', err);
      process.exit(1);
    });
}

module.exports = { migrateTemplatesToContentTree };

