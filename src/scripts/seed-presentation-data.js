const mongoose = require('mongoose');
const Template = require('../models/Template');
const Item = require('../models/Item');
const logger = require('../utils/logger');

let isDryRunMode = false;

/**
 * Helper to ensure a template exists by name (idempotent & dry-run capable)
 */
async function ensureTemplate(data) {
  const dryRun = isDryRunMode;
  let tpl = await Template.findOne({ name: data.name });
  if (!tpl) {
    if (dryRun) {
      logger.info(`[DRY-RUN] Sẽ tạo Template: ${data.name}`);
      return new Template({ _id: new mongoose.Types.ObjectId(), ...data });
    }
    tpl = await Template.create(data);
    logger.info(`[Presentation Seed] Created Template: ${data.name}`);
  } else {
    let updated = false;
    // Update sections if needed
    if (data.sections && (!tpl.sections || tpl.sections.length === 0)) {
      tpl.sections = data.sections;
      updated = true;
    }
    if (data.icon && tpl.icon !== data.icon) {
      tpl.icon = data.icon;
      updated = true;
    }
    if (data.isSystem !== undefined && tpl.isSystem !== data.isSystem) {
      tpl.isSystem = data.isSystem;
      updated = true;
    }
    if (data.insertOptions && Array.isArray(data.insertOptions)) {
      tpl.insertOptions = data.insertOptions;
      updated = true;
    }
    if (updated) {
      if (dryRun) {
        logger.info(`[DRY-RUN] Sẽ cập nhật Template: ${data.name}`);
      } else {
        await tpl.save();
      }
    }
  }
  return tpl;
}

/**
 * Helper to ensure an item exists by path or name+template (idempotent, relocatable & dry-run capable)
 */
async function ensureItem(data) {
  const dryRun = isDryRunMode;
  // 1. Try finding by current target path
  let item = await Item.findOne({ path: data.path });

  // 2. If not found by new path, check if it exists by name + templateId under /sitecore/layout
  if (!item && data.name && data.templateId) {
    item = await Item.findOne({
      name: data.name,
      templateId: data.templateId,
      path: { $regex: new RegExp('^/sitecore/layout', 'i') },
      deleted: false,
    });
  }

  // 3. Or if it's a folder under /sitecore/layout with the same name and parentId
  if (!item && data.name && data.parentId) {
    item = await Item.findOne({ name: data.name, parentId: data.parentId, deleted: false });
  }

  if (!item) {
    if (dryRun) {
      logger.info(`[DRY-RUN] Sẽ tạo Item: ${data.path}`);
      return new Item({ _id: new mongoose.Types.ObjectId(), ...data });
    }
    item = await Item.create(data);
    logger.info(`[Presentation Seed] Created Item: ${data.path}`);
  } else {
    let updated = false;
    if (item.path !== data.path) {
      item.path = data.path;
      updated = true;
    }
    if (data.parentId && item.parentId?.toString() !== data.parentId?.toString()) {
      item.parentId = data.parentId;
      updated = true;
    }
    if (data.ancestors && JSON.stringify(item.ancestors) !== JSON.stringify(data.ancestors)) {
      item.ancestors = data.ancestors;
      updated = true;
    }
    if (data.sortOrder !== undefined && item.sortOrder !== data.sortOrder) {
      item.sortOrder = data.sortOrder;
      updated = true;
    }
    if (data.templateId && item.templateId?.toString() !== data.templateId?.toString()) {
      item.templateId = data.templateId;
      updated = true;
    }
    if (data.displayName && item.displayName !== data.displayName) {
      item.displayName = data.displayName;
      updated = true;
    }
    if (data.fields) {
      item.fields = data.fields;
      updated = true;
    }
    if (data.sharedFields) {
      item.sharedFields = data.sharedFields;
      updated = true;
    }
    if (updated) {
      if (dryRun) {
        logger.info(`[DRY-RUN] Sẽ cập nhật/di chuyển Item: ${data.path} (ID: ${item._id})`);
      } else {
        await item.save();
        logger.info(`[Presentation Seed] Updated/Relocated Item: ${data.path} (ID: ${item._id})`);
      }
    }
  }
  return item;
}

/**
 * Main seeding function for GĐ 6 Presentation
 */
async function seedPresentationData(options = {}) {
  isDryRunMode = Boolean(options.dryRun);
  const dryRun = isDryRunMode;
  logger.info(`=== BẮT ĐẦU SEED HỆ THỐNG PRESENTATION (GĐ 6)${dryRun ? ' [DRY-RUN]' : ''} ===`);

  // 1. Tìm hoặc lấy root item (/sitecore)
  const sitecoreRoot = await Item.findOne({ path: '/sitecore' });
  if (!sitecoreRoot) {
    throw new Error('Chưa tìm thấy /sitecore root item. Vui lòng chạy seed ban đầu trước.');
  }

  // Lấy template Folder
  const folderTemplate = await Template.findOne({ name: 'Folder' });
  if (!folderTemplate) {
    throw new Error('Chưa tìm thấy template Folder. Vui lòng chạy seed ban đầu trước.');
  }

  // 2. Tạo các System Templates cho Presentation
  const layoutFolderTemplate = await ensureTemplate({
    name: 'Layout Folder',
    displayName: 'Layout Folder',
    icon: 'ti ti-folder',
    isSystem: true,
    description: 'Thư mục phân cấp chứa Layout',
    sections: [],
    insertOptions: [],
  });

  const renderingFolderTemplate = await ensureTemplate({
    name: 'Rendering Folder',
    displayName: 'Rendering Folder',
    icon: 'ti ti-folder',
    isSystem: true,
    description: 'Thư mục phân cấp chứa Rendering',
    sections: [],
    insertOptions: [],
  });

  const deviceTemplate = await ensureTemplate({
    name: 'Device',
    displayName: 'Device',
    icon: 'ti ti-device-desktop',
    isSystem: true,
    description: 'Thiết bị hiển thị Presentation (Default, Mobile...)',
    sections: [
      {
        name: 'Device Settings',
        sortOrder: 100,
        fields: [
          { name: 'name', title: 'Device Name', type: 'Single-Line Text', required: true, sortOrder: 10 },
          { name: 'isDefault', title: 'Is Default Device', type: 'Checkbox', defaultValue: false, sortOrder: 20 },
          { name: 'userAgentRegex', title: 'User Agent Pattern', type: 'Single-Line Text', sortOrder: 30 },
          { name: 'fallbackDeviceId', title: 'Fallback Device ID', type: 'Single-Line Text', sortOrder: 40 },
        ],
      },
    ],
  });

  const layoutTemplate = await ensureTemplate({
    name: 'Layout',
    displayName: 'Layout',
    icon: 'ti ti-layout',
    isSystem: true,
    description: 'Layout Component trong React Frontend (MainLayout, BlankLayout...)',
    sections: [
      {
        name: 'Layout Settings',
        sortOrder: 100,
        fields: [
          { name: 'componentName', title: 'React Component Name', type: 'Single-Line Text', required: true, sortOrder: 10 },
          { name: 'placeholders', title: 'Defined Placeholders', type: 'Multi-Line Text', sortOrder: 20, helpText: 'Danh sách placeholder keys cách nhau bởi dấu phẩy (header, main, footer)' },
        ],
      },
    ],
  });

  const renderingTemplate = await ensureTemplate({
    name: 'Rendering',
    displayName: 'Rendering',
    icon: 'ti ti-components',
    isSystem: true,
    description: 'Rendering Component ánh xạ với React component frontend',
    sections: [
      {
        name: 'Rendering Data',
        sortOrder: 100,
        fields: [
          { name: 'componentName', title: 'React Component Name', type: 'Single-Line Text', required: true, sortOrder: 10 },
          { name: 'icon', title: 'Tabler Icon', type: 'Single-Line Text', defaultValue: 'ti ti-box', sortOrder: 20 },
          { name: 'datasourceTemplate', title: 'Allowed Datasource Template', type: 'Single-Line Text', sortOrder: 30 },
          { name: 'datasourceLocation', title: 'Datasource Root Location', type: 'Single-Line Text', sortOrder: 40 },
          { name: 'parametersTemplate', title: 'Parameters Template', type: 'Single-Line Text', sortOrder: 50 },
          { name: 'placeholders', title: 'Nested Placeholders', type: 'Multi-Line Text', sortOrder: 60 },
        ],
      },
    ],
  });

  const placeholderSettingsTemplate = await ensureTemplate({
    name: 'Placeholder Settings',
    displayName: 'Placeholder Settings',
    icon: 'ti ti-layout-grid-add',
    isSystem: true,
    description: 'Cấu hình quyền chèn Rendering vào từng Placeholder',
    sections: [
      {
        name: 'Placeholder Configuration',
        sortOrder: 100,
        fields: [
          { name: 'placeholderKey', title: 'Placeholder Key', type: 'Single-Line Text', required: true, sortOrder: 10, helpText: 'Ví dụ: main, header, column-{*}' },
          { name: 'allowedRenderings', title: 'Allowed Renderings', type: 'Multi-Line Text', sortOrder: 20, helpText: 'Danh sách ID hoặc Tên Rendering được phép chèn' },
          { name: 'description', title: 'Description', type: 'Single-Line Text', sortOrder: 30 },
        ],
      },
    ],
  });

  // Cập nhật Insert Options cho các System Template của Presentation
  layoutFolderTemplate.insertOptions = [layoutFolderTemplate._id, layoutTemplate._id];
  renderingFolderTemplate.insertOptions = [renderingFolderTemplate._id, renderingTemplate._id];
  layoutTemplate.insertOptions = [];
  renderingTemplate.insertOptions = [];

  if (!dryRun) {
    await layoutFolderTemplate.save();
    await renderingFolderTemplate.save();
    await layoutTemplate.save();
    await renderingTemplate.save();
  } else {
    logger.info('[DRY-RUN] Sẽ cập nhật Insert Options cho Layout Folder, Rendering Folder, Layout, Rendering');
  }

  // 3. Tạo cấu trúc thư mục dưới /sitecore/layout/
  const layoutRoot = await ensureItem({
    name: 'layout',
    displayName: 'Layout',
    templateId: folderTemplate._id,
    parentId: sitecoreRoot._id,
    ancestors: [sitecoreRoot._id],
    path: '/sitecore/layout',
    sortOrder: 200,
  });

  const layoutsFolder = await ensureItem({
    name: 'Layouts',
    displayName: 'Layouts',
    templateId: layoutFolderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Layouts',
    sortOrder: 100,
  });

  const renderingsFolder = await ensureItem({
    name: 'Renderings',
    displayName: 'Renderings',
    templateId: renderingFolderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Renderings',
    sortOrder: 200,
  });

  const devicesFolder = await ensureItem({
    name: 'Devices',
    displayName: 'Devices',
    templateId: folderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Devices',
    sortOrder: 300,
  });

  const placeholdersFolder = await ensureItem({
    name: 'Placeholder Settings',
    displayName: 'Placeholder Settings',
    templateId: folderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Placeholder Settings',
    sortOrder: 400,
  });

  // Feature Folder chứa các rendering mẫu dưới Renderings
  const featureFolder = await ensureItem({
    name: 'Feature',
    displayName: 'Feature Renderings',
    templateId: renderingFolderTemplate._id,
    parentId: renderingsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],
    path: '/sitecore/layout/Renderings/Feature',
    sortOrder: 100,
  });

  // 4. Tạo các Devices mẫu
  const defaultDevice = await ensureItem({
    name: 'Default',
    displayName: 'Default Device',
    templateId: deviceTemplate._id,
    parentId: devicesFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, devicesFolder._id],
    path: '/sitecore/layout/Devices/Default',
    sortOrder: 100,
    fields: {
      name: 'Default',
      isDefault: true,
    },
    sharedFields: {
      name: 'Default',
      isDefault: true,
    },
  });

  const mobileDevice = await ensureItem({
    name: 'Mobile',
    displayName: 'Mobile Device',
    templateId: deviceTemplate._id,
    parentId: devicesFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, devicesFolder._id],
    path: '/sitecore/layout/Devices/Mobile',
    sortOrder: 200,
    fields: {
      name: 'Mobile',
      isDefault: false,
      userAgentRegex: 'Mobile|Android|iPhone',
      fallbackDeviceId: defaultDevice._id.toString(),
    },
    sharedFields: {
      name: 'Mobile',
      isDefault: false,
      userAgentRegex: 'Mobile|Android|iPhone',
      fallbackDeviceId: defaultDevice._id.toString(),
    },
  });

  // 5. Tạo Layout mẫu: MainLayout
  const mainLayout = await ensureItem({
    name: 'MainLayout',
    displayName: 'Main Layout',
    templateId: layoutTemplate._id,
    parentId: layoutsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, layoutsFolder._id],
    path: '/sitecore/layout/Layouts/MainLayout',
    sortOrder: 100,
    fields: {
      componentName: 'MainLayout',
      placeholders: 'header, main, footer, content',
    },
    sharedFields: {
      componentName: 'MainLayout',
      placeholders: 'header, main, footer, content',
    },
  });

  // 6. Tạo các Renderings mẫu (đặt trong thư mục Feature)
  const heroRendering = await ensureItem({
    name: 'Hero',
    displayName: 'Hero Banner',
    templateId: renderingTemplate._id,
    parentId: featureFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id, featureFolder._id],
    path: '/sitecore/layout/Renderings/Feature/Hero',
    sortOrder: 100,
    fields: {
      componentName: 'HeroBanner',
      icon: 'ti ti-star',
      placeholders: '',
    },
    sharedFields: {
      componentName: 'HeroBanner',
      icon: 'ti ti-star',
      placeholders: '',
    },
  });

  const richTextRendering = await ensureItem({
    name: 'RichText',
    displayName: 'Rich Text Content',
    templateId: renderingTemplate._id,
    parentId: featureFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id, featureFolder._id],
    path: '/sitecore/layout/Renderings/Feature/RichText',
    sortOrder: 200,
    fields: {
      componentName: 'RichTextContent',
      icon: 'ti ti-file-text',
      placeholders: '',
    },
    sharedFields: {
      componentName: 'RichTextContent',
      icon: 'ti ti-file-text',
      placeholders: '',
    },
  });

  const promoRendering = await ensureItem({
    name: 'Promo',
    displayName: 'Promo Card',
    templateId: renderingTemplate._id,
    parentId: featureFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id, featureFolder._id],
    path: '/sitecore/layout/Renderings/Feature/Promo',
    sortOrder: 300,
    fields: {
      componentName: 'PromoCard',
      icon: 'ti ti-tag',
      placeholders: '',
    },
    sharedFields: {
      componentName: 'PromoCard',
      icon: 'ti ti-tag',
      placeholders: '',
    },
  });

  const navRendering = await ensureItem({
    name: 'Navigation',
    displayName: 'Site Navigation',
    templateId: renderingTemplate._id,
    parentId: featureFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id, featureFolder._id],
    path: '/sitecore/layout/Renderings/Feature/Navigation',
    sortOrder: 400,
    fields: {
      componentName: 'SiteNavigation',
      icon: 'ti ti-menu-2',
      placeholders: '',
    },
    sharedFields: {
      componentName: 'SiteNavigation',
      icon: 'ti ti-menu-2',
      placeholders: '',
    },
  });

  // 7. Tạo các Placeholder Settings mẫu
  await ensureItem({
    name: 'header',
    displayName: 'Header Placeholder',
    templateId: placeholderSettingsTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholder Settings/header',
    sortOrder: 100,
    fields: {
      placeholderKey: 'header',
      allowedRenderings: navRendering._id.toString(),
      description: 'Phần đầu trang (Navigation, Topbar)',
    },
    sharedFields: {
      placeholderKey: 'header',
      allowedRenderings: navRendering._id.toString(),
      description: 'Phần đầu trang (Navigation, Topbar)',
    },
  });

  await ensureItem({
    name: 'main',
    displayName: 'Main Placeholder',
    templateId: placeholderSettingsTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholder Settings/main',
    sortOrder: 200,
    fields: {
      placeholderKey: 'main',
      allowedRenderings: [heroRendering._id, richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Nội dung trung tâm trang (Hero, RichText, Promo)',
    },
    sharedFields: {
      placeholderKey: 'main',
      allowedRenderings: [heroRendering._id, richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Nội dung trung tâm trang (Hero, RichText, Promo)',
    },
  });

  await ensureItem({
    name: 'footer',
    displayName: 'Footer Placeholder',
    templateId: placeholderSettingsTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholder Settings/footer',
    sortOrder: 300,
    fields: {
      placeholderKey: 'footer',
      allowedRenderings: [navRendering._id, richTextRendering._id].map((id) => id.toString()).join(','),
      description: 'Chân trang',
    },
    sharedFields: {
      placeholderKey: 'footer',
      allowedRenderings: [navRendering._id, richTextRendering._id].map((id) => id.toString()).join(','),
      description: 'Chân trang',
    },
  });

  await ensureItem({
    name: 'content',
    displayName: 'Content Placeholder',
    templateId: placeholderSettingsTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholder Settings/content',
    sortOrder: 400,
    fields: {
      placeholderKey: 'content',
      allowedRenderings: [richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Vùng nội dung phụ trợ',
    },
    sharedFields: {
      placeholderKey: 'content',
      allowedRenderings: [richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Vùng nội dung phụ trợ',
    },
  });

  // Placeholder key động với Wildcard (DEC-022)
  await ensureItem({
    name: 'column-wildcard',
    displayName: 'Column Dynamic Placeholder',
    templateId: placeholderSettingsTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholder Settings/column-wildcard',
    sortOrder: 500,
    fields: {
      placeholderKey: 'column-{*}',
      allowedRenderings: [richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Cột lưới động (column-1, column-2, column-left...)',
    },
    sharedFields: {
      placeholderKey: 'column-{*}',
      allowedRenderings: [richTextRendering._id, promoRendering._id].map((id) => id.toString()).join(','),
      description: 'Cột lưới động (column-1, column-2, column-left...)',
    },
  });

  // 8. Gán Standard Presentation mẫu cho Template `Page`
  const pageTemplate = await Template.findOne({ name: 'Page' });
  if (pageTemplate) {
    pageTemplate.presentation = {
      devices: [
        {
          deviceId: defaultDevice._id,
          layoutId: mainLayout._id,
          renderings: [
            {
              uid: 'hero-std-uid-1000-0000-000000000001',
              renderingId: heroRendering._id,
              placeholder: 'main',
              sortOrder: 100,
              datasourceId: null,
              parameters: { theme: 'light' },
              hidden: false,
            },
            {
              uid: 'richtext-std-uid-2000-0000-000000000002',
              renderingId: richTextRendering._id,
              placeholder: 'main',
              sortOrder: 200,
              datasourceId: null,
              parameters: {},
              hidden: false,
            },
          ],
        },
      ],
    };
    if (!dryRun) {
      await pageTemplate.save();
      logger.info('[Presentation Seed] Configured Standard Presentation on Page Template');
    } else {
      logger.info('[DRY-RUN] Sẽ cấu hình Standard Presentation trên Page Template');
    }
  }

  logger.info(`=== HOÀN TẤT SEED HỆ THỐNG PRESENTATION THÀNH CÔNG${dryRun ? ' [DRY-RUN]' : ''} ===`);
  return {
    layoutFolderTemplate,
    renderingFolderTemplate,
    deviceTemplate,
    layoutTemplate,
    renderingTemplate,
    placeholderSettingsTemplate,
    layoutRoot,
    layoutsFolder,
    renderingsFolder,
    devicesFolder,
    placeholdersFolder,
    featureFolder,
    defaultDevice,
    mobileDevice,
    mainLayout,
    heroRendering,
    richTextRendering,
    promoRendering,
    navRendering,
  };
}

module.exports = { seedPresentationData };

if (require.main === module) {
  const env = require('../config/env');
  const mongoUri = env.MONGO_URI;
  const isDryRun = process.argv.includes('--dry-run');

  logger.warn('========================================================================');
  logger.warn('[CẢNH BÁO SAO LƯU DỮ LIỆU]: Trước khi chạy seed trên production/staging:');
  logger.warn('1. Tạo bản backup database: mongodump --uri="<mongo_uri>" --out=./backup');
  logger.warn('2. Cách rollback nếu cần: mongorestore --uri="<mongo_uri>" --drop ./backup');
  logger.warn('========================================================================');

  mongoose
    .connect(mongoUri)
    .then(async () => {
      await seedPresentationData({ dryRun: isDryRun });
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Error during presentation seeding:', err);
      process.exit(1);
    });
}
