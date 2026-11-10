const mongoose = require('mongoose');
const env = require('../config/env');
const dbGuard = require('../config/dbGuard');
const { connectDB } = require('../config/db');
const branding = require('../config/branding');
const Template = require('../models/Template');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');

async function seedSampleSite() {
  console.log('=== KHỞI TẠO DỮ LIỆU MẪU SAMPLE WEBSITE (GĐ 10) ===');

  dbGuard.assertSafeFor('destructive', {
    uri: env.MONGO_URI,
    appEnv: env.APP_ENV,
    scriptName: 'seed-sample-site',
  });

  await connectDB();

  // 1. Ensure Root Nodes
  let rootNode = await Item.findOne({ path: branding.PATHS.ROOT });
  if (!rootNode) {
    rootNode = await Item.create({
      name: branding.ROOT_NAME,
      displayName: branding.ROOT_NAME,
      path: branding.PATHS.ROOT,
      sortOrder: 0,
      isSystem: true,
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  }

  let contentRoot = await Item.findOne({ path: branding.PATHS.CONTENT });
  if (!contentRoot) {
    contentRoot = await Item.create({
      name: 'content',
      displayName: 'Content',
      parentId: rootNode._id,
      ancestors: [rootNode._id],
      path: branding.PATHS.CONTENT,
      sortOrder: 100,
      isSystem: true,
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  }

  // 2. Ensure Layout & Renderings exist
  let homeLayout = await Item.findOne({ path: { $in: [`${branding.PATHS.LAYOUTS}/HomeLayout`] } });
  if (!homeLayout) {
    console.log('[Seed Sample] Chưa tìm thấy HomeLayout, vui lòng chạy npm run seed:presentation trước!');
    // Look up or create minimal layout item
    homeLayout = await Item.create({
      name: 'HomeLayout',
      displayName: 'Home Layout',
      path: `${branding.PATHS.LAYOUTS}/HomeLayout`,
      fields: new Map([['viewPath', 'layouts/HomeLayout.ejs']]),
      sharedFields: new Map([['viewPath', 'layouts/HomeLayout.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  } else {
    // Ensure viewPath is clean
    homeLayout.sharedFields.set('viewPath', 'layouts/HomeLayout.ejs');
    await homeLayout.save();
  }

  let heroBannerRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.RENDERINGS}/HeroBanner`] } });
  if (!heroBannerRendering) {
    heroBannerRendering = await Item.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      path: `${branding.PATHS.RENDERINGS}/HeroBanner`,
      fields: new Map([['viewPath', 'components/HeroBanner.ejs']]),
      sharedFields: new Map([['viewPath', 'components/HeroBanner.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  } else {
    heroBannerRendering.sharedFields.set('viewPath', 'components/HeroBanner.ejs');
    await heroBannerRendering.save();
  }

  let introRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.RENDERINGS}/Introduction`] } });
  if (!introRendering) {
    introRendering = await Item.create({
      name: 'Introduction',
      displayName: 'Introduction',
      path: `${branding.PATHS.RENDERINGS}/Introduction`,
      fields: new Map([['viewPath', 'components/Introduction.ejs']]),
      sharedFields: new Map([['viewPath', 'components/Introduction.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  } else {
    introRendering.sharedFields.set('viewPath', 'components/Introduction.ejs');
    await introRendering.save();
  }

  let imageTextRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.RENDERINGS}/ImageText`] } });
  if (!imageTextRendering) {
    imageTextRendering = await Item.create({
      name: 'ImageText',
      displayName: 'Image Text',
      path: `${branding.PATHS.RENDERINGS}/ImageText`,
      fields: new Map([['viewPath', 'components/ImageText.ejs']]),
      sharedFields: new Map([['viewPath', 'components/ImageText.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });
  } else {
    imageTextRendering.sharedFields.set('viewPath', 'components/ImageText.ejs');
    await imageTextRendering.save();
  }

  // 3. Ensure Templates exist
  let homePageTemplate = await Template.findOne({ name: 'Home Page' });
  if (!homePageTemplate) {
    homePageTemplate = await Template.create({
      name: 'Home Page',
      displayName: 'Home Page Template',
      path: `${branding.PATHS.TEMPLATES}/Project/Pages/Home`,
      icon: 'ti ti-home',
      sections: [
        {
          name: 'Hero Section',
          sortOrder: 100,
          fields: [
            { name: 'PageTitle', title: 'Page Title', type: 'Single-Line Text', sortOrder: 10 },
            { name: 'HeroTitle', title: 'Hero Title', type: 'Single-Line Text', sortOrder: 20 },
            { name: 'HeroDescription', title: 'Hero Description', type: 'Rich Text', sortOrder: 30 },
            { name: 'BackgroundImage', title: 'Background Image', type: 'Image', sortOrder: 40 },
          ],
        },
        {
          name: 'Introduction Section',
          sortOrder: 200,
          fields: [
            { name: 'IntroHeading', title: 'Introduction Heading', type: 'Single-Line Text', sortOrder: 10 },
            { name: 'IntroBody', title: 'Introduction Body', type: 'Rich Text', sortOrder: 20 },
          ],
        },
        {
          name: 'SEO Metadata',
          sortOrder: 300,
          fields: [
            { name: 'MetaDescription', title: 'Meta Description', type: 'Multi-Line Text', sortOrder: 10 },
          ],
        },
      ],
      presentation: {
        layoutId: homeLayout._id,
        renderings: [
          {
            uid: new mongoose.Types.ObjectId().toString(),
            renderingId: heroBannerRendering._id,
            placeholderKey: 'maincontent',
            sortOrder: 100,
          },
          {
            uid: new mongoose.Types.ObjectId().toString(),
            renderingId: introRendering._id,
            placeholderKey: 'maincontent',
            sortOrder: 200,
          },
        ],
      },
    });
  }

  let standardPageTemplate = await Template.findOne({ name: 'Standard Page' });
  if (!standardPageTemplate) {
    standardPageTemplate = await Template.create({
      name: 'Standard Page',
      displayName: 'Standard Page Template',
      path: `${branding.PATHS.TEMPLATES}/Project/Pages/Standard Page`,
      icon: 'ti ti-file-text',
      sections: [
        {
          name: 'Page Content',
          sortOrder: 100,
          fields: [
            { name: 'PageTitle', title: 'Page Title', type: 'Single-Line Text', sortOrder: 10 },
            { name: 'Title', title: 'Content Title', type: 'Single-Line Text', sortOrder: 20 },
            { name: 'IntroHeading', title: 'Intro Heading', type: 'Single-Line Text', sortOrder: 30 },
            { name: 'IntroBody', title: 'Intro Body', type: 'Rich Text', sortOrder: 40 },
            { name: 'Body', title: 'Body Text', type: 'Rich Text', sortOrder: 50 },
            { name: 'Image', title: 'Featured Image', type: 'Image', sortOrder: 60 },
          ],
        },
        {
          name: 'SEO Metadata',
          sortOrder: 200,
          fields: [
            { name: 'MetaDescription', title: 'Meta Description', type: 'Multi-Line Text', sortOrder: 10 },
          ],
        },
      ],
      presentation: {
        layoutId: homeLayout._id,
        renderings: [
          {
            uid: new mongoose.Types.ObjectId().toString(),
            renderingId: introRendering._id,
            placeholderKey: 'maincontent',
            sortOrder: 100,
          },
          {
            uid: new mongoose.Types.ObjectId().toString(),
            renderingId: imageTextRendering._id,
            placeholderKey: 'maincontent',
            sortOrder: 200,
            parameters: { Alignment: 'right' },
          },
        ],
      },
    });
  }

  // 4. Create or Update Home Item
  let homeItem = await Item.findOne({ path: branding.PATHS.HOME });
  const homeFieldsVi = new Map([
    ['PageTitle', 'Trang Chủ | Treecraft Experience Platform'],
    ['HeroTitle', 'Trải Nghiệm Quản Trị Nội Dung Đỉnh Cao'],
    ['HeroDescription', '<p>Hệ thống Monolithic CMS kết xuất <strong>100% Server-Side EJS</strong> cực nhanh, an toàn và tối ưu hóa SEO vượt trội.</p>'],
    ['IntroHeading', 'Chào Mừng Đến Với Hệ Thống Treecraft Monolith'],
    ['IntroBody', '<p>Treecraft tách biệt hoàn hảo giữa không gian soạn thảo biên tập viên (Master Store) và hạ tầng phân phối công khai siêu tốc (Web Store). Mọi trang web được dựng từ các thành phần linh hoạt, phân cấp và có khả năng mở rộng không giới hạn.</p>'],
    ['MetaDescription', 'Trang chủ website chính thức chạy trên Treecraft CMS Node.js Monolith kết xuất SSR EJS.'],
  ]);

  const homeFieldsEn = new Map([
    ['PageTitle', 'Home | Treecraft Experience Platform'],
    ['HeroTitle', 'Ultimate Enterprise Content Management'],
    ['HeroDescription', '<p>High-performance Monolithic CMS rendered <strong>100% Server-Side with EJS</strong>, secure, and SEO optimized.</p>'],
    ['IntroHeading', 'Welcome to Treecraft Monolith Architecture'],
    ['IntroBody', '<p>Treecraft decouples authoring environments (Master Store) from blazing-fast delivery environments (Web Store). Pages are composed of flexible, reusable rendering components.</p>'],
    ['MetaDescription', 'Official homepage running on Treecraft Monolithic CMS.'],
  ]);

  const homePresentation = {
    layoutId: homeLayout._id,
    renderings: [
      {
        uid: new mongoose.Types.ObjectId().toString(),
        renderingId: heroBannerRendering._id,
        placeholderKey: 'maincontent',
        sortOrder: 100,
      },
      {
        uid: new mongoose.Types.ObjectId().toString(),
        renderingId: introRendering._id,
        placeholderKey: 'maincontent',
        sortOrder: 200,
      },
    ],
  };

  if (!homeItem) {
    homeItem = await Item.create({
      name: 'Home',
      displayName: 'Trang Chủ',
      templateId: homePageTemplate._id,
      parentId: contentRoot._id,
      ancestors: [rootNode._id, contentRoot._id],
      path: branding.PATHS.HOME,
      sortOrder: 100,
      presentation: {
        shared: homePresentation,
      },
      languages: [
        { code: 'vi', version: 1, fields: homeFieldsVi },
        { code: 'en', version: 1, fields: homeFieldsEn },
      ],
    });
    console.log(`[Seed Sample] Đã tạo item ${branding.PATHS.HOME}`);
  } else {
    homeItem.presentation = { shared: homePresentation };
    homeItem.templateId = homePageTemplate._id;
    homeItem.languages = [
      { code: 'vi', version: 1, fields: homeFieldsVi },
      { code: 'en', version: 1, fields: homeFieldsEn },
    ];
    await homeItem.save();
    console.log(`[Seed Sample] Đã cập nhật item ${homeItem.path}`);
  }

  // 5. Create or Update About Us Item
  let aboutItem = await Item.findOne({
    $or: [
      { path: `${branding.PATHS.CONTENT}/About us` },
      { path: `${branding.PATHS.CONTENT}/about-us` },
      { path: '/About us' },
      { path: '/about-us' },
    ],
  });

  const aboutFieldsVi = new Map([
    ['PageTitle', 'Về Chúng Tôi | Giới Thiệu Treecraft'],
    ['Title', 'Về Chúng Tôi'],
    ['IntroHeading', 'Sứ Mệnh Xây Dựng Nền Tảng CMS Hiện Đại'],
    ['IntroBody', '<p>Chúng tôi phát triển hệ thống quản trị nội dung linh hoạt, chuẩn phân cấp Treecraft và hoàn toàn tự chủ trong hệ sinh thái Node.js.</p>'],
    ['Body', '<p>Nền tảng giúp doanh nghiệp kết xuất trang web với tốc độ cao, độ trễ tối thiểu, hỗ trợ đa ngôn ngữ và tối ưu hóa SEO tối đa. Nhờ cơ chế EJS Server-Side Rendering và Publish Engine tách Master/Web Store, website công khai luôn đảm bảo tính sẵn sàng cao và an toàn tuyệt đối trước các truy vấn cơ sở dữ liệu nội bộ.</p>'],
    ['Image', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'],
    ['MetaDescription', 'Tìm hiểu về đội ngũ phát triển và sứ mệnh của giải pháp Treecraft Monolith CMS.'],
  ]);

  const aboutFieldsEn = new Map([
    ['PageTitle', 'About Us | Treecraft Introduction'],
    ['Title', 'About Us'],
    ['IntroHeading', 'Building Next-Gen CMS Platform'],
    ['IntroBody', '<p>We build flexible, hierarchical, enterprise-ready content management systems in pure Node.js.</p>'],
    ['Body', '<p>Our platform enables rapid page delivery, minimal TTFB, seamless localization, and optimal search engine indexing. By separating Master and Web stores, the public website is lightning-fast and fully isolated from internal administrative operations.</p>'],
    ['Image', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80'],
    ['MetaDescription', 'Learn about our development team and mission behind Treecraft Monolith CMS.'],
  ]);

  const aboutPresentation = {
    layoutId: homeLayout._id,
    renderings: [
      {
        uid: new mongoose.Types.ObjectId().toString(),
        renderingId: introRendering._id,
        placeholderKey: 'maincontent',
        sortOrder: 100,
      },
      {
        uid: new mongoose.Types.ObjectId().toString(),
        renderingId: imageTextRendering._id,
        placeholderKey: 'maincontent',
        sortOrder: 200,
        parameters: { Alignment: 'right' },
      },
    ],
  };

  if (!aboutItem) {
    aboutItem = await Item.create({
      name: 'About us',
      displayName: 'Về chúng tôi',
      templateId: standardPageTemplate._id,
      parentId: contentRoot._id,
      ancestors: [rootNode._id, contentRoot._id],
      path: `${branding.PATHS.CONTENT}/About us`,
      sortOrder: 200,
      presentation: {
        shared: aboutPresentation,
      },
      languages: [
        { code: 'vi', version: 1, fields: aboutFieldsVi },
        { code: 'en', version: 1, fields: aboutFieldsEn },
      ],
    });
    console.log(`[Seed Sample] Đã tạo item ${branding.PATHS.CONTENT}/About us`);
  } else {
    aboutItem.presentation = { shared: aboutPresentation };
    aboutItem.templateId = standardPageTemplate._id;
    aboutItem.languages = [
      { code: 'vi', version: 1, fields: aboutFieldsVi },
      { code: 'en', version: 1, fields: aboutFieldsEn },
    ];
    await aboutItem.save();
    console.log(`[Seed Sample] Đã cập nhật item ${aboutItem.path}`);
  }

  // 6. Direct Publish to Web Store (PublishedItem)
  console.log('[Seed Sample] Đang xuất bản (Publish) toàn bộ Layouts, Renderings và Pages sang Web Store...');

  const itemsToPublish = [
    rootNode,
    contentRoot,
    homeLayout,
    heroBannerRendering,
    introRendering,
    imageTextRendering,
    homeItem,
    aboutItem,
  ];

  for (const it of itemsToPublish) {
    const rawItem = await Item.findById(it._id).lean();
    if (!rawItem) continue;

    const pubLanguages = (rawItem.languages || []).map((l) => ({
      code: l.code,
      publishedVersion: l.version || 1,
      fields: l.fields instanceof Map ? Object.fromEntries(l.fields) : (l.fields || {}),
      unversionedFields: l.unversionedFields instanceof Map ? Object.fromEntries(l.unversionedFields) : (l.unversionedFields || {}),
      finalLayout: l.finalLayout || {},
    }));

    // If item has no languages yet (e.g. system folder), give default
    if (!pubLanguages.length) {
      pubLanguages.push({
        code: 'vi',
        publishedVersion: 1,
        fields: {},
        unversionedFields: {},
        finalLayout: {},
      });
    }

    await PublishedItem.findOneAndUpdate(
      { _id: rawItem._id },
      {
        _id: rawItem._id,
        name: rawItem.name,
        displayName: rawItem.displayName || rawItem.name,
        parentId: rawItem.parentId || null,
        templateId: rawItem.templateId || null,
        path: rawItem.path,
        sortOrder: rawItem.sortOrder || 100,
        isSystem: Boolean(rawItem.isSystem),
        isDeleted: false,
        fields: rawItem.fields instanceof Map ? Object.fromEntries(rawItem.fields) : (rawItem.fields || {}),
        sharedFields: rawItem.sharedFields instanceof Map ? Object.fromEntries(rawItem.sharedFields) : (rawItem.sharedFields || {}),
        presentation: rawItem.presentation || {},
        languages: pubLanguages,
        publishedAt: new Date(),
        publishedBy: 'system\\admin',
      },
      { upsert: true, new: true }
    );
  }

  for (const it of itemsToPublish) {
    const rawItem = await Item.findById(it._id).lean();
    if (!rawItem) continue;

    const pubLanguages = (rawItem.languages || []).map((l) => ({
      code: l.code,
      publishedVersion: l.version || 1,
      fields: l.fields instanceof Map ? Object.fromEntries(l.fields) : (l.fields || {}),
      unversionedFields: l.unversionedFields instanceof Map ? Object.fromEntries(l.unversionedFields) : (l.unversionedFields || {}),
      finalLayout: l.finalLayout || {},
    }));

    // If item has no languages yet (e.g. system folder), give default
    if (!pubLanguages.length) {
      pubLanguages.push({
        code: 'vi',
        publishedVersion: 1,
        fields: {},
        unversionedFields: {},
        finalLayout: {},
      });
    }

    await PublishedItem.findOneAndUpdate(
      { _id: rawItem._id },
      {
        _id: rawItem._id,
        name: rawItem.name,
        displayName: rawItem.displayName || rawItem.name,
        parentId: rawItem.parentId || null,
        templateId: rawItem.templateId || null,
        path: rawItem.path,
        sortOrder: rawItem.sortOrder || 100,
        isSystem: Boolean(rawItem.isSystem),
        isDeleted: false,
        fields: rawItem.fields instanceof Map ? Object.fromEntries(rawItem.fields) : (rawItem.fields || {}),
        sharedFields: rawItem.sharedFields instanceof Map ? Object.fromEntries(rawItem.sharedFields) : (rawItem.sharedFields || {}),
        presentation: rawItem.presentation || {},
        languages: pubLanguages,
        publishedAt: new Date(),
        publishedBy: 'system\\admin',
      },
      { upsert: true, new: true }
    );
  }

  console.log('=== SEED SAMPLE SITE THÀNH CÔNG ===');
  console.log('Các URL bạn có thể truy cập ngay bây giờ:');
  console.log('  - Trang chủ tiếng Việt:    http://localhost:4000/');
  console.log('  - Về chúng tôi tiếng Việt: http://localhost:4000/about-us');
  console.log('  - Trang chủ tiếng Anh:     http://localhost:4000/en/');
  console.log('  - Về chúng tôi tiếng Anh:  http://localhost:4000/en/about-us');
  console.log('  - Technical SEO robots:    http://localhost:4000/robots.txt');
  console.log('  - Technical SEO sitemap:   http://localhost:4000/sitemap.xml');
  console.log('====================================');

  if (require.main === module) {
    process.exit(0);
  }
}

if (require.main === module) {
  seedSampleSite().catch((err) => {
    console.error('Seed Sample Site failed:', err);
    process.exit(1);
  });
}

module.exports = seedSampleSite;
