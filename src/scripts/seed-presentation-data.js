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
    if (data.sections && (data.isSystem || !tpl.sections || tpl.sections.length === 0)) {
      tpl.sections = data.sections;
      updated = true;
    }
    if (data.displayName && tpl.displayName !== data.displayName) {
      tpl.displayName = data.displayName;
      updated = true;
    }
    if (data.description && tpl.description !== data.description) {
      tpl.description = data.description;
      updated = true;
    }
    if (data.path && tpl.path !== data.path) {
      tpl.path = data.path;
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
    if (data.baseTemplates && Array.isArray(data.baseTemplates)) {
      tpl.baseTemplates = data.baseTemplates;
      updated = true;
    }
    if (data.insertOptions && Array.isArray(data.insertOptions)) {
      tpl.insertOptions = data.insertOptions;
      updated = true;
    }
    if (data.presentation !== undefined) {
      tpl.presentation = data.presentation;
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
  let item = await Item.findOne({ path: data.path });

  if (!item && data.name && data.templateId) {
    item = await Item.findOne({
      name: data.name,
      templateId: data.templateId,
      path: { $regex: new RegExp('^/sitecore/layout', 'i') },
      deleted: false,
    });
  }

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
    if (data.fields) {
      if (item.fields instanceof Map) {
        Object.entries(data.fields).forEach(([k, v]) => item.fields.set(k, v));
      } else {
        item.fields = data.fields;
      }
      updated = true;
    }
    if (data.sharedFields) {
      if (item.sharedFields instanceof Map) {
        Object.entries(data.sharedFields).forEach(([k, v]) => item.sharedFields.set(k, v));
      } else {
        item.sharedFields = data.sharedFields;
      }
      updated = true;
    }
    if (data.presentation !== undefined) {
      item.presentation = data.presentation;
      updated = true;
    }
    if (updated) {
      if (dryRun) {
        logger.info(`[DRY-RUN] Sẽ cập nhật Item: ${data.path}`);
      } else {
        await item.save();
        logger.info(`[Presentation Seed] Updated/Relocated Item: ${data.path} (ID: ${item._id})`);
      }
    }
  }
  return item;
}

/**
 * Main seeding function for GĐ 6 Presentation (100% Server-Side EJS SSR)
 */
async function seedPresentationData(options = {}) {
  isDryRunMode = Boolean(options.dryRun);
  const dryRun = isDryRunMode;
  logger.info(`=== BẮT ĐẦU SEED HỆ THỐNG PRESENTATION EJS SSR (GĐ 6)${dryRun ? ' [DRY-RUN]' : ''} ===`);

  // 1. Root items & Folder template
  const sitecoreRoot = await Item.findOne({ path: '/sitecore' });
  if (!sitecoreRoot) {
    throw new Error('Chưa tìm thấy /sitecore root item. Vui lòng chạy seed ban đầu trước.');
  }

  const folderTemplate = await Template.findOne({ name: 'Folder' });
  if (!folderTemplate) {
    throw new Error('Chưa tìm thấy template Folder. Vui lòng chạy seed ban đầu trước.');
  }

  // 2. Tạo các System Templates cho Presentation EJS
  const layoutFolderTemplate = await ensureTemplate({
    name: 'Layout Folder',
    displayName: 'Layout Folder',
    icon: 'ti ti-folder',
    isSystem: true,
    description: 'Thư mục phân cấp chứa Layout',
    sections: [],
    insertOptions: [],
  });

  const placeholderFolderTemplate = await ensureTemplate({
    name: 'Placeholder Folder',
    displayName: 'Placeholder Folder',
    icon: 'ti ti-folder',
    isSystem: true,
    description: 'Thư mục phân cấp chứa Placeholder',
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

  const layoutTemplate = await ensureTemplate({
    name: 'Layout',
    displayName: 'Layout',
    icon: 'ti ti-layout',
    isSystem: true,
    description: 'Layout Page Server-Side EJS',
    sections: [
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
    ],
  });

  const placeholderTemplate = await ensureTemplate({
    name: 'Placeholder',
    displayName: 'Placeholder',
    icon: 'ti ti-layout-grid-add',
    isSystem: true,
    description: 'Placeholder giữ chỗ cho Rendering trên Layout',
    sections: [
      {
        name: 'Placeholder Data',
        sortOrder: 100,
        fields: [
          {
            name: 'placeholderKey',
            title: 'Placeholder Key',
            type: 'Single-Line Text',
            required: true,
            sortOrder: 10,
            helpText: 'Khóa định danh placeholder (ví dụ: header, maincontent, footer)',
          },
          {
            name: 'allowedRenderings',
            title: 'Allowed Renderings',
            type: 'Multi-Line Text',
            sortOrder: 20,
            helpText: 'Danh sách ID Rendering được phép chèn, phân tách bởi dấu phẩy (rỗng = cho phép tất cả)',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'Single-Line Text',
            sortOrder: 30,
          },
        ],
      },
    ],
  });

  const renderingTemplate = await ensureTemplate({
    name: 'Rendering',
    displayName: 'Rendering',
    icon: 'ti ti-components',
    isSystem: true,
    description: 'Rendering Component kết xuất bằng EJS phía server',
    sections: [
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
            title: 'Component Template ID',
            type: 'Single-Line Text',
            required: true,
            sortOrder: 20,
            source: '/sitecore/templates/Feature/Components',
            helpText: 'ID của template định nghĩa fields của component dưới Feature/Components',
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
            defaultValue: 'ti ti-box',
            sortOrder: 40,
          },
        ],
      },
    ],
  });

  // Thiết lập Insert Options cho Presentation Templates
  layoutFolderTemplate.insertOptions = [layoutFolderTemplate._id, layoutTemplate._id];
  placeholderFolderTemplate.insertOptions = [placeholderFolderTemplate._id, placeholderTemplate._id];
  renderingFolderTemplate.insertOptions = [renderingFolderTemplate._id, renderingTemplate._id];
  layoutTemplate.insertOptions = [];
  placeholderTemplate.insertOptions = [];
  renderingTemplate.insertOptions = [];

  if (!dryRun) {
    await layoutFolderTemplate.save();
    await placeholderFolderTemplate.save();
    await renderingFolderTemplate.save();
  }

  // 3. Khởi tạo /sitecore/layout Root và Dọn dẹp cấu trúc cũ
  const layoutRoot = await ensureItem({
    name: 'layout',
    displayName: 'Layout',
    templateId: folderTemplate._id,
    parentId: sitecoreRoot._id,
    ancestors: [sitecoreRoot._id],
    path: '/sitecore/layout',
    sortOrder: 300,
    fields: {},
  });

  if (!dryRun) {
    // Dọn dẹp các node cũ Devices và Placeholder Settings nếu có
    await Item.deleteMany({
      path: { $regex: new RegExp('^/sitecore/layout/(Devices|Placeholder Settings)($|/)', 'i') },
    });
    // Xóa template Device và Placeholder Settings cũ nếu còn
    await Template.deleteMany({ name: { $in: ['Device', 'Placeholder Settings'] } });
    logger.info('[Presentation Seed] Đã dọn dẹp các node cũ Devices & Placeholder Settings.');
  }

  // 4. Khởi tạo 3 Nhánh Thư mục Cốt lõi
  const layoutsFolder = await ensureItem({
    name: 'Layouts',
    displayName: 'Layouts',
    templateId: layoutFolderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Layouts',
    sortOrder: 100,
    fields: {},
  });

  const placeholdersFolder = await ensureItem({
    name: 'Placeholders',
    displayName: 'Placeholders',
    templateId: placeholderFolderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Placeholders',
    sortOrder: 200,
    fields: {},
  });

  const renderingsFolder = await ensureItem({
    name: 'Renderings',
    displayName: 'Renderings',
    templateId: renderingFolderTemplate._id,
    parentId: layoutRoot._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id],
    path: '/sitecore/layout/Renderings',
    sortOrder: 300,
    fields: {},
  });

  // Dọn dẹp các legacy items cũ từ thời kỳ Headless React (nếu có)
  const legacyItems = await Item.find({
    path: { $in: ['/sitecore/layout/Layouts/MainLayout', '/sitecore/layout/Renderings/Feature'] },
  });
  for (const legacy of legacyItems) {
    // Xóa item và các con nếu có
    await Item.deleteMany({ ancestors: legacy._id });
    await Item.deleteOne({ _id: legacy._id });
    logger.info(`[Presentation Seed] Đã dọn dẹp legacy item: ${legacy.path}`);
  }

  // 5. Seed Items trong 3 nhánh
  // 5.1. Layouts
  const homeLayout = await ensureItem({
    name: 'HomeLayout',
    displayName: 'Home Layout',
    templateId: layoutTemplate._id,
    parentId: layoutsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, layoutsFolder._id],
    path: '/sitecore/layout/Layouts/HomeLayout',
    sortOrder: 100,
    fields: {
      viewPath: 'site/layouts/HomeLayout.ejs',
    },
    sharedFields: {
      viewPath: 'site/layouts/HomeLayout.ejs',
    },
  });

  // 5.2. Renderings
  const heroBannerRendering = await ensureItem({
    name: 'HeroBanner',
    displayName: 'Hero Banner',
    templateId: renderingTemplate._id,
    parentId: renderingsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],
    path: '/sitecore/layout/Renderings/HeroBanner',
    sortOrder: 100,
    fields: {
      viewPath: 'site/components/HeroBanner.ejs',
      icon: 'ti ti-ad-2',
    },
    sharedFields: {
      viewPath: 'site/components/HeroBanner.ejs',
      icon: 'ti ti-ad-2',
    },
  });

  const introRendering = await ensureItem({
    name: 'Introduction',
    displayName: 'Introduction',
    templateId: renderingTemplate._id,
    parentId: renderingsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],
    path: '/sitecore/layout/Renderings/Introduction',
    sortOrder: 200,
    fields: {
      viewPath: 'site/components/Introduction.ejs',
      icon: 'ti ti-file-description',
    },
    sharedFields: {
      viewPath: 'site/components/Introduction.ejs',
      icon: 'ti ti-file-description',
    },
  });

  const imageTextRendering = await ensureItem({
    name: 'ImageText',
    displayName: 'Image Text',
    templateId: renderingTemplate._id,
    parentId: renderingsFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],
    path: '/sitecore/layout/Renderings/ImageText',
    sortOrder: 300,
    fields: {
      viewPath: 'site/components/ImageText.ejs',
      icon: 'ti ti-photo',
    },
    sharedFields: {
      viewPath: 'site/components/ImageText.ejs',
      icon: 'ti ti-photo',
    },
  });

  // 5.3. Placeholders
  await ensureItem({
    name: 'header',
    displayName: 'Header',
    templateId: placeholderTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholders/header',
    sortOrder: 100,
    fields: {
      placeholderKey: 'header',
      allowedRenderings: '',
      description: 'Phần đầu trang web',
    },
    sharedFields: {
      placeholderKey: 'header',
      allowedRenderings: '',
      description: 'Phần đầu trang web',
    },
  });

  const allowedMainRenderings = [heroBannerRendering._id, introRendering._id, imageTextRendering._id]
    .map((id) => id.toString())
    .join(',');

  const maincontentPlaceholder = await ensureItem({
    name: 'maincontent',
    displayName: 'Main Content',
    templateId: placeholderTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholders/maincontent',
    sortOrder: 200,
    fields: {
      placeholderKey: 'maincontent',
      allowedRenderings: allowedMainRenderings,
      description: 'Nội dung chính giữa trang web',
    },
    sharedFields: {
      placeholderKey: 'maincontent',
      allowedRenderings: allowedMainRenderings,
      description: 'Nội dung chính giữa trang web',
    },
  });

  await ensureItem({
    name: 'footer',
    displayName: 'Footer',
    templateId: placeholderTemplate._id,
    parentId: placeholdersFolder._id,
    ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],
    path: '/sitecore/layout/Placeholders/footer',
    sortOrder: 300,
    fields: {
      placeholderKey: 'footer',
      allowedRenderings: '',
      description: 'Phần chân trang web',
    },
    sharedFields: {
      placeholderKey: 'footer',
      allowedRenderings: '',
      description: 'Phần chân trang web',
    },
  });

  // 6. Khởi tạo Component Templates (Feature/Components)
  const heroBannerTemplate = await ensureTemplate({
    name: 'HeroBanner',
    displayName: 'Hero Banner Component',
    icon: 'ti ti-ad-2',
    isSystem: false,
    path: '/sitecore/templates/Feature/Components/HeroBanner',
    description: 'Template dữ liệu cho component HeroBanner',
    sections: [
      {
        name: 'Hero Data',
        sortOrder: 100,
        fields: [
          { name: 'HeroTitle', title: 'Hero Title', type: 'Single-Line Text', required: true, sortOrder: 10 },
          { name: 'HeroDescription', title: 'Hero Description', type: 'Rich Text', sortOrder: 20 },
          { name: 'BackgroundImage', title: 'Background Image', type: 'Image', sortOrder: 30 },
        ],
      },
    ],
  });

  const introTemplate = await ensureTemplate({
    name: 'Introduction',
    displayName: 'Introduction Component',
    icon: 'ti ti-file-description',
    isSystem: false,
    path: '/sitecore/templates/Feature/Components/Introduction',
    description: 'Template dữ liệu cho component Introduction',
    sections: [
      {
        name: 'Intro Data',
        sortOrder: 100,
        fields: [
          { name: 'IntroHeading', title: 'Introduction Heading', type: 'Single-Line Text', required: true, sortOrder: 10 },
          { name: 'IntroBody', title: 'Introduction Body', type: 'Rich Text', sortOrder: 20 },
        ],
      },
    ],
  });

  const imageTextTemplate = await ensureTemplate({
    name: 'ImageText',
    displayName: 'Image & Text Component',
    icon: 'ti ti-photo',
    isSystem: false,
    path: '/sitecore/templates/Feature/Components/ImageText',
    description: 'Template dữ liệu cho component ImageText',
    sections: [
      {
        name: 'Content Data',
        sortOrder: 100,
        fields: [
          { name: 'Image', title: 'Illustration Image', type: 'Image', sortOrder: 10 },
          { name: 'Title', title: 'Title', type: 'Single-Line Text', required: true, sortOrder: 20 },
          { name: 'Body', title: 'Body Content', type: 'Rich Text', sortOrder: 30 },
          { name: 'Alignment', title: 'Image Alignment (left/right)', type: 'Single-Line Text', defaultValue: 'left', sortOrder: 40 },
        ],
      },
    ],
  });

  // Gán componentTemplate ID cho renderings
  if (heroBannerRendering.fields instanceof Map) {
    heroBannerRendering.fields.set('componentTemplate', heroBannerTemplate._id.toString());
  } else {
    heroBannerRendering.set('fields.componentTemplate', heroBannerTemplate._id.toString());
  }
  if (introRendering.fields instanceof Map) {
    introRendering.fields.set('componentTemplate', introTemplate._id.toString());
  } else {
    introRendering.set('fields.componentTemplate', introTemplate._id.toString());
  }
  if (imageTextRendering.fields instanceof Map) {
    imageTextRendering.fields.set('componentTemplate', imageTextTemplate._id.toString());
  } else {
    imageTextRendering.set('fields.componentTemplate', imageTextTemplate._id.toString());
  }
  if (!dryRun) {
    await heroBannerRendering.save();
    await introRendering.save();
    await imageTextRendering.save();
  }

  // 7. Khởi tạo Page Templates (Project/Pages) độc lập (không kế thừa Component Templates)
  const homePageTemplate = await ensureTemplate({
    name: 'Home',
    displayName: 'Home Page Template',
    icon: 'ti ti-home',
    isSystem: false,
    path: '/sitecore/templates/Project/Pages/Home',
    description: 'Page Template cho Trang Chủ',
    baseTemplates: [],
    sections: [],
    presentation: {
      layoutId: homeLayout._id,
      renderings: [
        {
          uid: 'hero-std-uid-0000-0000-000000000001',
          renderingId: heroBannerRendering._id,
          placeholder: 'maincontent',
          placeholderKey: 'maincontent',
          sortOrder: 100,
          datasourceId: null,
          parameters: {},
          hidden: false,
        },
        {
          uid: 'intro-std-uid-0000-0000-000000000002',
          renderingId: introRendering._id,
          placeholder: 'maincontent',
          placeholderKey: 'maincontent',
          sortOrder: 200,
          datasourceId: null,
          parameters: {},
          hidden: false,
        },
        {
          uid: 'imgtxt-std-uid-0000-0000-000000000003',
          renderingId: imageTextRendering._id,
          placeholder: 'maincontent',
          placeholderKey: 'maincontent',
          sortOrder: 300,
          datasourceId: null,
          parameters: {},
          hidden: false,
        },
      ],
    },
  });

  const aboutUsPageTemplate = await ensureTemplate({
    name: 'AboutUs',
    displayName: 'About Us Page Template',
    icon: 'ti ti-info-circle',
    isSystem: false,
    path: '/sitecore/templates/Project/Pages/AboutUs',
    description: 'Page Template cho Trang Giới Thiệu',
    baseTemplates: [],
    sections: [],
    presentation: {
      layoutId: homeLayout._id,
      renderings: [
        {
          uid: 'intro-about-uid-0000-0000-000000000001',
          renderingId: introRendering._id,
          placeholder: 'maincontent',
          placeholderKey: 'maincontent',
          sortOrder: 100,
          datasourceId: null,
          parameters: {},
          hidden: false,
        },
        {
          uid: 'imgtxt-about-uid-0000-0000-000000000002',
          renderingId: imageTextRendering._id,
          placeholder: 'maincontent',
          placeholderKey: 'maincontent',
          sortOrder: 200,
          datasourceId: null,
          parameters: {},
          hidden: false,
        },
      ],
    },
  });

  // 8. Seed Content Items mẫu: Home và About-Us
  const contentRoot = await Item.findOne({ path: '/sitecore/content' });
  if (contentRoot) {
    await ensureItem({
      name: 'Home',
      displayName: 'Home',
      templateId: homePageTemplate._id,
      parentId: contentRoot._id,
      ancestors: [sitecoreRoot._id, contentRoot._id],
      path: '/sitecore/content/Home',
      sortOrder: 100,
      fields: {
        HeroTitle: 'Trang Chủ Antigravity CMS',
        HeroDescription: '<p>Hệ thống CMS quản trị nội dung phân cấp kiến trúc Server-Side EJS SSR.</p>',
        IntroHeading: 'Giới thiệu giải pháp',
        IntroBody: '<p>CMS kết hợp sức mạnh giữa mô hình Sitecore XM và hiệu năng vượt trội của Express EJS.</p>',
        Title: 'Kiến trúc linh hoạt',
        Body: '<p>Quản lý Layout, Placeholders và Renderings trực quan với kéo thả SortableJS.</p>',
      },
      sharedFields: {
        HeroTitle: 'Trang Chủ Antigravity CMS',
      },
    });

    await ensureItem({
      name: 'About-Us',
      displayName: 'About Us',
      templateId: aboutUsPageTemplate._id,
      parentId: contentRoot._id,
      ancestors: [sitecoreRoot._id, contentRoot._id],
      path: '/sitecore/content/About-Us',
      sortOrder: 200,
      fields: {
        IntroHeading: 'Về chúng tôi',
        IntroBody: '<p>Chúng tôi cung cấp giải pháp quản trị nội dung hiện đại cho doanh nghiệp.</p>',
        Title: 'Đội ngũ phát triển',
        Body: '<p>Đội ngũ kỹ sư tận tâm với triết lý sản phẩm tối giản, an toàn và tin cậy.</p>',
      },
      sharedFields: {
        IntroHeading: 'Về chúng tôi',
      },
    });
  }

  // Đồng bộ toàn bộ Template vào Cây Nội Dung (/sitecore/templates)
  const { migrateTemplatesToContentTree } = require('./migrate-templates-to-content-tree');
  await migrateTemplatesToContentTree();

  logger.info(`=== HOÀN TẤT SEED HỆ THỐNG PRESENTATION THÀNH CÔNG${dryRun ? ' [DRY-RUN]' : ''} ===`);
  return {
    layoutFolderTemplate,
    placeholderFolderTemplate,
    renderingFolderTemplate,
    layoutTemplate,
    placeholderTemplate,
    renderingTemplate,
    layoutRoot,
    layoutsFolder,
    placeholdersFolder,
    renderingsFolder,
    homeLayout,
    heroBannerRendering,
    introRendering,
    imageTextRendering,
    maincontentPlaceholder,
    heroBannerTemplate,
    introTemplate,
    imageTextTemplate,
    homePageTemplate,
    aboutUsPageTemplate,
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
