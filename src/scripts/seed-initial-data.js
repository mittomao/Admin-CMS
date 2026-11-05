const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/User');
const Role = require('../models/Role');
const LaunchpadApp = require('../models/LaunchpadApp');
const Template = require('../models/Template');
const Item = require('../models/Item');
const Language = require('../models/Language');

const getMaskedUri = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '');

const seedData = async () => {
  try {
    logger.info(`Connecting to MongoDB at [${getMaskedUri(env.MONGO_URI)}]...`);
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    logger.info('Connected to MongoDB.');

    // 1. Seed Roles
    const rolesConfig = [
      {
        name: 'Administrator',
        description: 'Full administrative access to all CMS capabilities and system settings',
        isSystem: true,
      },
      {
        name: 'Author',
        description: 'Content authoring permissions for drafting and editing items',
        isSystem: true,
      },
      {
        name: 'Editor',
        description: 'Review and publishing permissions for content workflows',
        isSystem: true,
      },
    ];

    const rolesMap = {};
    for (const r of rolesConfig) {
      let role = await Role.findOne({ name: r.name });
      if (!role) {
        role = await Role.create(r);
        logger.info(`Created Role: ${r.name}`);
      } else {
        logger.info(`Role exists: ${r.name}`);
      }
      rolesMap[r.name] = role._id;
    }

    // 2. Seed Default Admin User
    const adminUsername = 'admin';
    let adminUser = await User.findOne({ username: adminUsername });
    if (!adminUser) {
      const passwordHash = await User.hashPassword('admin123');
      adminUser = await User.create({
        username: adminUsername,
        email: 'admin@sitecore.local',
        passwordHash,
        fullName: 'System Administrator',
        avatar: '/img/default-avatar.png',
        roles: [rolesMap['Administrator']],
        isActive: true,
      });
      logger.info('Created default Admin user: admin / admin123');
    } else {
      logger.info('Admin user already exists.');
    }

    // 3. Seed Default Author User
    const authorUsername = 'author';
    let authorUser = await User.findOne({ username: authorUsername });
    if (!authorUser) {
      const passwordHash = await User.hashPassword('author123');
      authorUser = await User.create({
        username: authorUsername,
        email: 'author@sitecore.local',
        passwordHash,
        fullName: 'Content Author',
        avatar: '/img/default-avatar.png',
        roles: [rolesMap['Author']],
        isActive: true,
      });
      logger.info('Created default Author user: author / author123');
    }

    // 4. Seed Launchpad Applications
    const appsConfig = [
      {
        name: 'Content Editor',
        description: 'Manage hierarchical content tree and item fields',
        icon: 'ti ti-article',
        iconBg: 'blue',
        group: 'Content Editing',
        url: '/admin/content-editor',
        sortOrder: 10,
        allowedRoles: [rolesMap['Administrator'], rolesMap['Author'], rolesMap['Editor']],
      },
      {
        name: 'Experience Editor',
        description: 'WYSIWYG live page layout editing',
        icon: 'ti ti-device-desktop',
        iconBg: 'cyan',
        group: 'Content Editing',
        url: '#',
        sortOrder: 20,
        allowedRoles: [rolesMap['Administrator'], rolesMap['Author'], rolesMap['Editor']],
      },
      {
        name: 'Media Library',
        description: 'Manage digital assets, images, and documents',
        icon: 'ti ti-photo',
        iconBg: 'green',
        group: 'Content Editing',
        url: '/admin/media-library',
        sortOrder: 30,
        allowedRoles: [rolesMap['Administrator'], rolesMap['Author'], rolesMap['Editor']],
      },
      {
        name: 'Workbox',
        description: 'Review and approve workflow items awaiting publication',
        icon: 'ti ti-checkbox',
        iconBg: 'indigo',
        group: 'Content Editing',
        url: '#',
        sortOrder: 40,
        allowedRoles: [rolesMap['Administrator'], rolesMap['Author'], rolesMap['Editor']],
      },
      {
        name: 'User Manager',
        description: 'Manage CMS users, credentials, and profile settings',
        icon: 'ti ti-users',
        iconBg: 'teal',
        group: 'Access Management',
        url: '#',
        sortOrder: 10,
        allowedRoles: [rolesMap['Administrator']],
      },
      {
        name: 'Role Manager',
        description: 'Configure roles and operational permissions',
        icon: 'ti ti-shield',
        iconBg: 'azure',
        group: 'Access Management',
        url: '#',
        sortOrder: 20,
        allowedRoles: [rolesMap['Administrator']],
      },
      {
        name: 'Security Editor',
        description: 'Assign item-level access rights and permissions',
        icon: 'ti ti-lock',
        iconBg: 'purple',
        group: 'Access Management',
        url: '#',
        sortOrder: 30,
        allowedRoles: [rolesMap['Administrator']],
      },
      {
        name: 'Access Viewer',
        description: 'Inspect resolved effective permissions across items',
        icon: 'ti ti-eye',
        iconBg: 'orange',
        group: 'Access Management',
        url: '#',
        sortOrder: 40,
        allowedRoles: [rolesMap['Administrator']],
      },
      {
        name: 'Template Manager',
        description: 'Design item templates, sections, and field definitions',
        icon: 'ti ti-layout-grid',
        iconBg: 'red',
        group: 'Control Panel & Maintenance',
        url: '/admin/content-editor?path=/sitecore/templates',
        sortOrder: 10,
        allowedRoles: [rolesMap['Administrator']],
      },
      {
        name: 'Publishing',
        description: 'Publish items from Master to Web delivery database',
        icon: 'ti ti-upload',
        iconBg: 'lime',
        group: 'Control Panel & Maintenance',
        url: '#',
        sortOrder: 20,
        allowedRoles: [rolesMap['Administrator'], rolesMap['Editor']],
      },
      {
        name: 'Audit Log',
        description: 'Track author actions, publish history, and changes',
        icon: 'ti ti-history',
        iconBg: 'amber',
        group: 'Control Panel & Maintenance',
        url: '#',
        sortOrder: 30,
        allowedRoles: [rolesMap['Administrator']],
      },
    ];

    for (const appData of appsConfig) {
      await LaunchpadApp.findOneAndUpdate(
        { name: appData.name },
        appData,
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${appsConfig.length} Launchpad applications.`);

    // 4.1 Seed System Languages (GĐ 4)
    const languagesConfig = [
      {
        code: 'vi',
        name: 'Vietnamese',
        nativeName: 'Tiếng Việt',
        icon: 'ti ti-world',
        isDefault: true,
        active: true,
        sortOrder: 10,
      },
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        icon: 'ti ti-world',
        isDefault: false,
        active: true,
        sortOrder: 20,
      },
    ];

    for (const lang of languagesConfig) {
      await Language.findOneAndUpdate(
        { code: lang.code },
        lang,
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${languagesConfig.length} System Languages (en, vi).`);

    // 5. Seed Core Templates
    const templatesConfig = [
      {
        name: '_BasePage',
        displayName: 'Base Page',
        icon: 'ti ti-template',
        description: 'Base template providing standard SEO metadata for pages',
        isSystem: true,
        sections: [
          {
            name: 'SEO & Metadata',
            sortOrder: 5,
            fields: [
              {
                name: 'metaTitle',
                title: 'Meta Title',
                type: 'Single-Line Text',
                required: false,
                defaultValue: '',
                helpText: 'Search engine title tag',
                sortOrder: 10,
              },
              {
                name: 'metaDescription',
                title: 'Meta Description',
                type: 'Multi-Line Text',
                required: false,
                defaultValue: '',
                helpText: 'Brief summary for search engine snippet',
                sortOrder: 20,
              },
            ],
          },
        ],
      },
      {
        name: 'Standard Template',
        displayName: 'Standard Template',
        icon: 'template',
        isSystem: true,
        description: 'Mẫu component trống để khởi tạo component hoặc page template mới',
        path: '/sitecore/templates/System/Standard Template',
        sections: [],
      },
      {
        name: 'Folder',
        displayName: 'Folder',
        icon: 'folder',
        isSystem: true,
        description: 'A structural folder item to organize other items',
        sections: [
          {
            name: 'Item Info',
            sortOrder: 10,
            fields: [],
          },
        ],
      },
      {
        name: 'Page',
        displayName: 'Page',
        icon: 'page',
        isSystem: false,
        description: 'Standard content page with rich body and metadata',
        sections: [
          {
            name: 'Content',
            sortOrder: 10,
            fields: [
              {
                name: 'title',
                title: 'Title',
                type: 'Single-Line Text',
                required: true,
                defaultValue: '',
                sortOrder: 10,
              },
              {
                name: 'summary',
                title: 'Summary',
                type: 'Multi-Line Text',
                required: false,
                defaultValue: '',
                sortOrder: 20,
              },
              {
                name: 'body',
                title: 'Body Text',
                type: 'Rich Text',
                required: false,
                defaultValue: '',
                sortOrder: 30,
              },
              {
                name: 'image',
                title: 'Main Image',
                type: 'Image',
                required: false,
                defaultValue: '',
                sortOrder: 40,
              },
            ],
          },
          {
            name: 'Publishing & Metadata',
            sortOrder: 20,
            fields: [
              {
                name: 'publishDate',
                title: 'Publish Date',
                type: 'Date',
                required: false,
                defaultValue: '',
                sortOrder: 10,
              },
              {
                name: 'isFeatured',
                title: 'Featured Item',
                type: 'Checkbox',
                required: false,
                defaultValue: false,
                sortOrder: 20,
              },
            ],
          },
        ],
      },
      {
        name: 'Sample Item',
        displayName: 'Sample Item',
        icon: 'ti ti-file-code',
        description: 'A lightweight sample content item',
        sections: [
          {
            name: 'Data',
            sortOrder: 10,
            fields: [
              {
                name: 'title',
                title: 'Title',
                type: 'Single-Line Text',
                required: true,
                defaultValue: '',
                sortOrder: 10,
              },
              {
                name: 'text',
                title: 'Text',
                type: 'Rich Text',
                required: false,
                defaultValue: '',
                sortOrder: 20,
              },
            ],
          },
        ],
      },
      {
        name: 'Media Folder',
        displayName: 'Media Folder',
        icon: 'ti ti-folder',
        isSystem: true,
        description: 'System folder item to organize media assets',
        path: '/sitecore/templates/System/Media Folder',
        sections: [
          {
            name: 'Folder Info',
            sortOrder: 10,
            fields: [],
          },
        ],
      },
      {
        name: 'Image',
        displayName: 'Image',
        icon: 'ti ti-photo',
        isSystem: true,
        description: 'System template for image media item hosted on Cloudinary',
        path: '/sitecore/templates/System/Image',
        sections: [
          {
            name: 'Image Info',
            sortOrder: 10,
            fields: [
              { name: 'publicId', title: 'Cloudinary Public ID', type: 'Single-Line Text', required: true, sortOrder: 10 },
              { name: 'assetId', title: 'Cloudinary Asset ID', type: 'Single-Line Text', required: false, sortOrder: 20 },
              { name: 'format', title: 'Format', type: 'Single-Line Text', required: false, sortOrder: 30 },
              { name: 'extension', title: 'Extension', type: 'Single-Line Text', required: false, sortOrder: 40 },
              { name: 'secureUrl', title: 'Secure URL', type: 'Single-Line Text', required: true, sortOrder: 50 },
              { name: 'fileSize', title: 'File Size (Bytes)', type: 'Number', required: false, sortOrder: 60 },
              { name: 'width', title: 'Width (px)', type: 'Number', required: false, sortOrder: 70 },
              { name: 'height', title: 'Height (px)', type: 'Number', required: false, sortOrder: 80 },
              { name: 'checksum', title: 'SHA-256 Checksum', type: 'Single-Line Text', required: false, sortOrder: 90 },
              { name: 'syncedAt', title: 'Synced At', type: 'Date', required: false, sortOrder: 100 },
            ],
          },
          {
            name: 'Content',
            sortOrder: 20,
            fields: [
              { name: 'altText', title: 'Alt Text', type: 'Single-Line Text', required: false, sortOrder: 10 },
              { name: 'title', title: 'Title', type: 'Single-Line Text', required: false, sortOrder: 20 },
              { name: 'description', title: 'Description', type: 'Multi-Line Text', required: false, sortOrder: 30 },
            ],
          },
        ],
      },
      {
        name: 'File',
        displayName: 'File',
        icon: 'ti ti-file',
        isSystem: true,
        description: 'System template for binary document or raw file hosted on Cloudinary',
        path: '/sitecore/templates/System/File',
        sections: [
          {
            name: 'File Info',
            sortOrder: 10,
            fields: [
              { name: 'publicId', title: 'Cloudinary Public ID', type: 'Single-Line Text', required: true, sortOrder: 10 },
              { name: 'assetId', title: 'Cloudinary Asset ID', type: 'Single-Line Text', required: false, sortOrder: 20 },
              { name: 'format', title: 'Format', type: 'Single-Line Text', required: false, sortOrder: 30 },
              { name: 'extension', title: 'Extension', type: 'Single-Line Text', required: false, sortOrder: 40 },
              { name: 'secureUrl', title: 'Secure URL', type: 'Single-Line Text', required: true, sortOrder: 50 },
              { name: 'fileSize', title: 'File Size (Bytes)', type: 'Number', required: false, sortOrder: 60 },
              { name: 'resourceType', title: 'Resource Type', type: 'Single-Line Text', required: false, defaultValue: 'raw', sortOrder: 70 },
              { name: 'checksum', title: 'SHA-256 Checksum', type: 'Single-Line Text', required: false, sortOrder: 80 },
              { name: 'syncedAt', title: 'Synced At', type: 'Date', required: false, sortOrder: 90 },
            ],
          },
          {
            name: 'Content',
            sortOrder: 20,
            fields: [
              { name: 'title', title: 'Title', type: 'Single-Line Text', required: false, sortOrder: 10 },
              { name: 'description', title: 'Description', type: 'Multi-Line Text', required: false, sortOrder: 20 },
            ],
          },
        ],
      },
    ];

    const templatesMap = {};
    for (const t of templatesConfig) {
      let tpl = await Template.findOne({ name: t.name });
      if (!tpl) {
        tpl = await Template.create(t);
        logger.info(`Created Template: ${t.name}`);
      } else {
        // Update sections/fields to ensure schema is up-to-date
        tpl.displayName = t.displayName;
        tpl.icon = t.icon;
        tpl.description = t.description;
        tpl.sections = t.sections;
        await tpl.save();
        logger.info(`Updated Template: ${t.name}`);
      }
      templatesMap[t.name] = tpl._id;
    }

    // Set base templates and insert options for templates
    const basePageTpl = await Template.findById(templatesMap['_BasePage']);
    let metaTitleFieldId = null;
    if (basePageTpl && basePageTpl.sections[0] && basePageTpl.sections[0].fields[0]) {
      metaTitleFieldId = basePageTpl.sections[0].fields[0]._id.toString();
      basePageTpl.standardValues = {
        [metaTitleFieldId]: 'Default Sitecore XM Page',
      };
      await basePageTpl.save();
    }

    await Template.findByIdAndUpdate(templatesMap['Page'], {
      baseTemplates: [templatesMap['_BasePage']],
      insertOptions: [templatesMap['Page'], templatesMap['Sample Item']],
    });
    await Template.findByIdAndUpdate(templatesMap['Folder'], {
      insertOptions: [templatesMap['Folder']],
    });
    await Template.findByIdAndUpdate(templatesMap['Sample Item'], {
      insertOptions: [templatesMap['Sample Item']],
    });
    await Template.findByIdAndUpdate(templatesMap['Media Folder'], {
      insertOptions: [templatesMap['Media Folder'], templatesMap['Image'], templatesMap['File']],
    });

    // 6. Seed Sitecore Content Tree Root & Core Nodes
    // Root: /sitecore
    let sitecoreRoot = await Item.findOne({ path: '/sitecore', deleted: false });
    if (!sitecoreRoot) {
      sitecoreRoot = await Item.create({
        name: 'sitecore',
        displayName: 'Sitecore',
        templateId: templatesMap['Folder'],
        parentId: null,
        ancestors: [],
        path: '/sitecore',
        sortOrder: 10,
        fields: {},
        sharedFields: {},
        languages: [
          {
            code: 'vi',
            unversionedFields: {},
            versions: [
              {
                version: 1,
                fields: {},
                createdBy: adminUser._id,
                note: 'Phiên bản khởi tạo tiếng Việt',
              },
            ],
          },
        ],
        presentation: {
          shared: { devices: [] },
          final: [],
        },
        createdBy: adminUser._id,
      });
      logger.info('Created Root node: /sitecore');
    }

    // First-level branches under /sitecore:
    // /sitecore/content, /sitecore/layout, /sitecore/media library, /sitecore/templates, /sitecore/system
    const branches = [
      { name: 'content', displayName: 'Content', sortOrder: 100 },
      { name: 'layout', displayName: 'Layout', sortOrder: 200 },
      { name: 'media library', displayName: 'Media Library', sortOrder: 300 },
      { name: 'templates', displayName: 'Templates', sortOrder: 400 },
      { name: 'system', displayName: 'System', sortOrder: 500 },
    ];

    const branchesMap = {};
    for (const b of branches) {
      const bPath = `/sitecore/${b.name}`;
      const targetTemplateId = b.name === 'media library' ? templatesMap['Media Folder'] : templatesMap['Folder'];
      let branchItem = await Item.findOne({ path: bPath, deleted: false });
      if (!branchItem) {
        branchItem = await Item.create({
          name: b.name,
          displayName: b.displayName,
          templateId: targetTemplateId,
          parentId: sitecoreRoot._id,
          ancestors: [sitecoreRoot._id],
          path: bPath,
          sortOrder: b.sortOrder,
          fields: {},
          sharedFields: {},
          languages: [
            {
              code: 'vi',
              unversionedFields: {},
              versions: [
                {
                  version: 1,
                  fields: {},
                  createdBy: adminUser._id,
                  note: 'Phiên bản khởi tạo tiếng Việt',
                },
              ],
            },
          ],
          presentation: {
            shared: { devices: [] },
            final: [],
          },
          createdBy: adminUser._id,
        });
        logger.info(`Created Branch node: ${bPath}`);
      }
      branchesMap[b.name] = branchItem._id;
    }

    // Node /sitecore/content/home
    const homePath = '/sitecore/content/home';
    let homeItem = await Item.findOne({ path: homePath, deleted: false });
    if (!homeItem) {
      homeItem = await Item.create({
        name: 'home',
        displayName: 'Home',
        templateId: templatesMap['Page'],
        parentId: branchesMap['content'],
        ancestors: [sitecoreRoot._id, branchesMap['content']],
        path: homePath,
        sortOrder: 100,
        fields: {
          title: 'Welcome to Sitecore CMS',
          summary: 'A modern Sitecore-like CMS experience with hierarchical tree management.',
          body: '<p>Welcome to your new CMS! You can edit items, create child nodes, and navigate the content tree.</p>',
          isFeatured: true,
          publishDate: new Date().toISOString().split('T')[0],
        },
        sharedFields: {},
        languages: [
          {
            code: 'vi',
            unversionedFields: {},
            versions: [
              {
                version: 1,
                fields: {
                  title: 'Chào mừng bạn đến với Sitecore CMS',
                  summary: 'Trải nghiệm quản trị nội dung phân cấp tương tự Sitecore XM.',
                  body: '<p>Chào mừng bạn đến với hệ thống CMS mới! Bạn có thể chỉnh sửa các item, tạo các node con và điều hướng cây nội dung.</p>',
                  isFeatured: true,
                  publishDate: new Date().toISOString().split('T')[0],
                },
                createdBy: adminUser._id,
                note: 'Phiên bản khởi tạo tiếng Việt',
              },
            ],
          },
          {
            code: 'en',
            unversionedFields: {},
            versions: [
              {
                version: 1,
                fields: {
                  title: 'Welcome to Sitecore CMS',
                  summary: 'A modern Sitecore-like CMS experience with hierarchical tree management.',
                  body: '<p>Welcome to your new CMS! You can edit items, create child nodes, and navigate the content tree.</p>',
                  isFeatured: true,
                  publishDate: new Date().toISOString().split('T')[0],
                },
                createdBy: adminUser._id,
                note: 'Initial Seed Version',
              },
            ],
          },
        ],
        presentation: {
          shared: { devices: [] },
          final: [],
        },
        createdBy: adminUser._id,
      });
      logger.info(`Created Sample Page node: ${homePath}`);
    }

    // 8. Seed Media Library Folders as Items (GĐ 5.1: Mọi Media là Item)
    const mediaLibraryBranch = await Item.findOne({ path: '/sitecore/media library', deleted: false });
    if (mediaLibraryBranch) {
      if (mediaLibraryBranch.templateId.toString() !== templatesMap['Media Folder'].toString()) {
        mediaLibraryBranch.templateId = templatesMap['Media Folder'];
        await mediaLibraryBranch.save();
      }

      const sampleBannersPath = '/sitecore/media library/banners';
      let bannersFolder = await Item.findOne({ path: sampleBannersPath, deleted: false });
      if (!bannersFolder) {
        bannersFolder = await Item.create({
          name: 'banners',
          displayName: 'Banners',
          templateId: templatesMap['Media Folder'],
          parentId: mediaLibraryBranch._id,
          ancestors: [...mediaLibraryBranch.ancestors, mediaLibraryBranch._id],
          path: sampleBannersPath,
          sortOrder: 100,
          fields: {},
          sharedFields: {},
          createdBy: adminUser._id
        });
        logger.info('Created Media Library subfolder Item: Banners');
      }

      const editorUploadsPath = '/sitecore/media library/editor-uploads';
      let editorUploadsFolder = await Item.findOne({ path: editorUploadsPath, deleted: false });
      if (!editorUploadsFolder) {
        editorUploadsFolder = await Item.create({
          name: 'editor-uploads',
          displayName: 'Editor Uploads',
          templateId: templatesMap['Media Folder'],
          parentId: mediaLibraryBranch._id,
          ancestors: [...mediaLibraryBranch.ancestors, mediaLibraryBranch._id],
          path: editorUploadsPath,
          sortOrder: 200,
          fields: {},
          sharedFields: {},
          createdBy: adminUser._id
        });
        logger.info('Created Media Library subfolder Item: Editor Uploads');
      }
    }

    // 9. Seed Presentation System Items (GĐ 6)
    const { seedPresentationData } = require('./seed-presentation-data');
    await seedPresentationData();

    logger.info('Seed completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
