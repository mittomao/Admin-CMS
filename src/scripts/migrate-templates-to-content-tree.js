/**
 * Migration Script: Di chuyển toàn bộ Template vào Cây Nội dung (Content Tree)
 * Cấu trúc phân cấp: /root/templates/ (System, Feature/Components, Project/Pages)
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
const branding = require('../config/branding');
const systemIds = require('../config/systemIds');

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
  console.log('MIGRATION: DI CHUYỂN TEMPLATES VÀO CONTENT TREE (/root/templates)');
  console.log(`Chế độ: ${isDryRun ? 'DRY-RUN (CHỈ KIỂM TRA, KHÔNG GHI DB)' : 'THỰC THI THỰC TẾ'}`);
  console.log('===============================================================\n');

  // 1. Root
  const rootNode = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/root'] } });
  if (!rootNode) {
    throw new Error(`Chưa tìm thấy node gốc ${branding.PATHS.ROOT}. Vui lòng chạy seed ban đầu trước.`);
  }

  // 2. Đảm bảo 2 System Template: "Template Folder" và "Template"
  let templateFolderTpl = await Template.findOne({ name: 'Template Folder' });
  if (!templateFolderTpl) {
    console.log('[Tạo Template] Template Folder');
    const fixedFolderTplId = systemIds.getSystemTemplateIdByName('Template Folder');
    if (!isDryRun) {
      templateFolderTpl = await Template.create({
        ...(fixedFolderTplId ? { _id: new mongoose.Types.ObjectId(fixedFolderTplId) } : {}),
        name: 'Template Folder',
        displayName: 'Template Folder',
        icon: 'ti ti-folder',
        isSystem: true,
        description: 'Thư mục phân cấp quản lý Templates',
        sections: [],
      });
    } else {
      templateFolderTpl = new Template({ _id: new mongoose.Types.ObjectId(fixedFolderTplId || undefined), name: 'Template Folder' });
    }
  }

  let templateDefTpl = await Template.findOne({ name: 'Template' });
  if (!templateDefTpl) {
    console.log('[Tạo Template] Template (Definition)');
    const fixedDefTplId = systemIds.getSystemTemplateIdByName('Template');
    if (!isDryRun) {
      templateDefTpl = await Template.create({
        ...(fixedDefTplId ? { _id: new mongoose.Types.ObjectId(fixedDefTplId) } : {}),
        name: 'Template',
        displayName: 'Template',
        icon: 'ti ti-template',
        isSystem: true,
        description: 'Định nghĩa Item Template trong CMS',
        sections: [],
      });
    } else {
      templateDefTpl = new Template({ _id: new mongoose.Types.ObjectId(fixedDefTplId || undefined), name: 'Template' });
    }
  }

  // Helper đảm bảo folder item
  async function ensureFolderItem(folderData) {
    let item = await Item.findOne({ path: folderData.path });
    if (!item) {
      console.log(`[Tạo Thư mục Tree] ${folderData.path}`);
      const fixedId = systemIds.getSystemIdByPath(folderData.path);
      if (!isDryRun) {
        item = await Item.create({
          ...(fixedId ? { _id: new mongoose.Types.ObjectId(fixedId) } : {}),
          ...folderData,
          templateId: templateFolderTpl._id,
          fields: {},
          sharedFields: {},
          languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
          presentation: { shared: { layoutId: null, renderings: [] }, final: [] },
          deleted: false,
        });
      } else {
        item = new Item({ _id: new mongoose.Types.ObjectId(fixedId || undefined), ...folderData });
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

  const isSystemOnly = process.argv.includes('--system-only') || process.env.SEED_SYSTEM_ONLY === 'true';

  // 3. Khởi tạo cây thư mục chuẩn dưới templates root
  const templatesRoot = await ensureFolderItem({
    name: 'templates',
    displayName: 'Templates',
    parentId: rootNode._id,
    ancestors: [rootNode._id],
    path: branding.PATHS.TEMPLATES,
    sortOrder: 400,
    icon: 'ti ti-folder',
  });

  const systemFolder = await ensureFolderItem({
    name: 'System',
    displayName: 'System',
    parentId: templatesRoot._id,
    ancestors: [rootNode._id, templatesRoot._id],
    path: branding.PATHS.SYSTEM_TEMPLATES,
    sortOrder: 200,
    icon: 'ti ti-folder-cog',
  });

  let featureFolder = null;
  let componentsFolder = null;
  let projectFolder = null;
  let pagesFolder = null;

  if (!isSystemOnly) {
    featureFolder = await ensureFolderItem({
      name: 'Feature',
      displayName: 'Feature',
      parentId: templatesRoot._id,
      ancestors: [rootNode._id, templatesRoot._id],
      path: branding.PATHS.FEATURE_TEMPLATES,
      sortOrder: 200,
      icon: 'ti ti-folder-star',
    });

    componentsFolder = await ensureFolderItem({
      name: 'Components',
      displayName: 'Components',
      parentId: featureFolder._id,
      ancestors: [rootNode._id, templatesRoot._id, featureFolder._id],
      path: branding.PATHS.FEATURE_COMPONENTS,
      sortOrder: 100,
      icon: 'ti ti-folder-plus',
    });

    projectFolder = await ensureFolderItem({
      name: 'Project',
      displayName: 'Project',
      parentId: templatesRoot._id,
      ancestors: [rootNode._id, templatesRoot._id],
      path: branding.PATHS.PROJECT_TEMPLATES,
      sortOrder: 300,
      icon: 'ti ti-folder',
    });

    pagesFolder = await ensureFolderItem({
      name: 'Pages',
      displayName: 'Pages',
      parentId: projectFolder._id,
      ancestors: [rootNode._id, templatesRoot._id, projectFolder._id],
      path: branding.PATHS.PROJECT_PAGES,
      sortOrder: 100,
      icon: 'ti ti-folder',
    });
  }

  // 4. Dọn dẹp dummy items cũ dưới templates (nếu không phải là một trong các folder chuẩn)
  const standardFolderIds = [
    templatesRoot?._id?.toString(),
    systemFolder?._id?.toString(),
    featureFolder?._id?.toString(),
    componentsFolder?._id?.toString(),
    projectFolder?._id?.toString(),
    pagesFolder?._id?.toString(),
  ].filter(Boolean);

  const allTemplates = await Template.find({});
  const allTemplateIds = new Set(allTemplates.map((t) => t._id.toString()));

  const existingTreeItems = await Item.find({
    path: { $regex: `^(${branding.PATHS.TEMPLATES}|/root/templates)`, $options: 'i' },
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

  const SYSTEM_TEMPLATE_NAMES = [
    '_BasePage',
    'Standard Template',
    'Page',
    'Sample Item',
    'Template Folder',
    'Template',
    'Layout',
    'Layout Folder',
    'Placeholder',
    'Placeholder Folder',
    'Rendering',
    'Rendering Folder',
  ];

  // 5. Đồng bộ từng Template thành một node Item trong Cây Nội Dung
  let templatesMigrated = 0;
  for (const tpl of allTemplates) {
    if (isSystemOnly && !SYSTEM_TEMPLATE_NAMES.includes(tpl.name)) continue;
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

    const fixedSortOrder = tpl.name === 'Standard Template' ? 50 : (tpl.sortOrder !== undefined ? tpl.sortOrder : (tpl.isSystem ? 10 : 100));

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
          sortOrder: fixedSortOrder,
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
        item.sortOrder = fixedSortOrder;
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

