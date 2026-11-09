'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const serializationService = require('../src/services/serializationService');
const branding = require('../src/config/branding');

describe('GĐ 11 — Serialization Service Unit Tests', () => {
  let mongoServer;
  let testTemplate;
  let rootContentItem;
  let childPageItem;
  let layoutItem;
  let renderingItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await Template.deleteMany({});

    // 1. Seed Template
    testTemplate = await Template.create({
      name: 'SamplePage',
      displayName: 'Sample Page Template',
      path: `${branding.PATHS.TEMPLATES}/SamplePage`,
      sections: [
        {
          name: 'ContentSection',
          fields: [
            { name: 'title', title: 'Page Title', type: 'Single-Line Text' },
            { name: 'body', title: 'Page Body', type: 'Rich Text' },
          ],
        },
      ],
      standardValues: { title: 'Default Title' },
    });

    // 2. Seed Template Item in items_master
    await Item.create({
      _id: testTemplate._id,
      name: 'SamplePage',
      displayName: 'Sample Page Template',
      path: `${branding.PATHS.TEMPLATES}/SamplePage`,
      templateId: testTemplate._id,
    });

    // 3. Seed Layout Item
    layoutItem = await Item.create({
      name: 'DefaultLayout',
      displayName: 'Default Layout',
      path: `${branding.PATHS.LAYOUTS}/DefaultLayout`,
      templateId: testTemplate._id,
      sharedFields: { viewPath: 'site/layouts/default.ejs' },
    });

    // 4. Seed Rendering Item
    renderingItem = await Item.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      path: `${branding.PATHS.RENDERINGS}/HeroBanner`,
      templateId: testTemplate._id,
      sharedFields: { viewPath: 'site/renderings/hero-banner.ejs' },
    });

    // 5. Seed Content Items
    rootContentItem = await Item.create({
      name: 'content',
      displayName: 'Content',
      path: branding.PATHS.CONTENT,
      templateId: testTemplate._id,
    });

    childPageItem = await Item.create({
      name: 'Home',
      displayName: 'Home Page',
      path: `${branding.PATHS.CONTENT}/Home`,
      parentId: rootContentItem._id,
      ancestors: [rootContentItem._id],
      templateId: testTemplate._id,
      sharedFields: { isFeatured: true },
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: { title: 'Trang Chủ', body: 'Nội dung tiếng Việt' },
            },
          ],
        },
      ],
      presentation: {
        shared: {
          layoutId: layoutItem._id,
          renderings: [
            {
              uid: 'uid-1234',
              renderingId: renderingItem._id,
              placeholder: 'maincontent',
              placeholderKey: 'maincontent',
              sortOrder: 10,
            },
          ],
        },
      },
    });
  });

  describe('exportPackage', () => {
    test('Xuất trọn gói đầy đủ tất cả phân vùng dữ liệu', async () => {
      const pkg = await serializationService.exportPackage({
        includeContent: true,
        includeTemplates: true,
        includeLayouts: true,
        includeRenderings: true,
        includePlaceholders: true,
      });

      expect(pkg).toBeTruthy();
      expect(pkg.version).toBe('1.0');
      expect(pkg.stats.totalItems).toBeGreaterThan(0);
      expect(pkg.branches.content.length).toBe(2); // content + Home
      expect(pkg.branches.templates.length).toBe(1);
      expect(pkg.branches.templateDefinitions.length).toBe(1);
      expect(pkg.branches.layouts.length).toBe(1);
      expect(pkg.branches.renderings.length).toBe(1);

      // Verify portable path resolution in presentation
      const homeExport = pkg.branches.content.find((c) => c.name === 'Home');
      expect(homeExport).toBeTruthy();
      expect(homeExport.presentation).toBeTruthy();
      expect(homeExport.presentation.layoutPath).toBe(`${branding.PATHS.LAYOUTS}/DefaultLayout`);
      expect(homeExport.presentation.renderings[0].renderingPath).toBe(`${branding.PATHS.RENDERINGS}/HeroBanner`);
    });

    test('Chỉ xuất phân vùng Content (Selective Export)', async () => {
      const pkg = await serializationService.exportPackage({
        includeContent: true,
        includeTemplates: false,
        includeLayouts: false,
        includeRenderings: false,
        includePlaceholders: false,
      });

      expect(pkg.branches.content.length).toBe(2);
      expect(pkg.branches.templates.length).toBe(0);
      expect(pkg.branches.layouts.length).toBe(0);
      expect(pkg.stats.totalItems).toBe(2);
    });
  });

  describe('exportSingleTree', () => {
    test('Xuất một nhánh cây con độc lập từ Home', async () => {
      const treePkg = await serializationService.exportSingleTree(childPageItem._id);
      expect(treePkg).toBeTruthy();
      expect(treePkg.rootItemPath).toBe(`${branding.PATHS.CONTENT}/Home`);
      expect(treePkg.items.length).toBe(1);
      expect(treePkg.items[0].name).toBe('Home');
    });
  });

  describe('inspectPackage', () => {
    test('Xác thực gói JSON hợp lệ và trả về thống kê số lượng', async () => {
      const pkg = await serializationService.exportPackage();
      const inspection = serializationService.inspectPackage(pkg);

      expect(inspection.isValid).toBe(true);
      expect(inspection.stats.totalItems).toBe(5);
      expect(inspection.warnings.length).toBe(0);
    });

    test('Báo lỗi đối với tệp JSON không hợp lệ hoặc thiếu branches', () => {
      const inspection = serializationService.inspectPackage({ foo: 'bar' });
      expect(inspection.isValid).toBe(false);
      expect(inspection.error).toContain('không đúng định dạng');
    });
  });

  describe('importPackage (4-step ordering & conflict modes)', () => {
    test('Nạp gói vào cơ sở dữ liệu với chế độ OVERWRITE', async () => {
      // 1. Export package
      const pkg = await serializationService.exportPackage();

      // 2. Modify in-memory DB: change title of Home
      childPageItem.languages[0].versions[0].fields.set('title', 'Tựa đề bị đổi');
      await childPageItem.save();

      // 3. Import package with OVERWRITE
      const result = await serializationService.importPackage(pkg, {
        conflictMode: 'OVERWRITE',
      });

      expect(result.success).toBe(true);
      expect(result.stats.totalUpdated).toBeGreaterThan(0);

      // Verify restored content
      const reloadedHome = await Item.findOne({ path: `${branding.PATHS.CONTENT}/Home` });
      expect(reloadedHome.languages[0].versions[0].fields.get('title')).toBe('Trang Chủ');
    });

    test('Chế độ SKIP: Bỏ qua không ghi đè nếu item đã tồn tại', async () => {
      const pkg = await serializationService.exportPackage();

      childPageItem.languages[0].versions[0].fields.set('title', 'Tựa đề mới giữ nguyên');
      await childPageItem.save();

      const result = await serializationService.importPackage(pkg, {
        conflictMode: 'SKIP',
      });

      expect(result.success).toBe(true);
      expect(result.stats.totalSkipped).toBeGreaterThan(0);

      const reloadedHome = await Item.findOne({ path: `${branding.PATHS.CONTENT}/Home` });
      expect(reloadedHome.languages[0].versions[0].fields.get('title')).toBe('Tựa đề mới giữ nguyên');
    });

    test('Chế độ RENAME: Tạo bản sao có hậu tố Copy', async () => {
      const pkg = await serializationService.exportPackage({
        includeContent: true,
        includeTemplates: false,
        includeLayouts: false,
        includeRenderings: false,
        includePlaceholders: false,
      });

      const result = await serializationService.importPackage(pkg, {
        conflictMode: 'RENAME',
        selectedBranches: ['content'],
      });

      expect(result.success).toBe(true);

      const copyItem = await Item.findOne({ path: `${branding.PATHS.CONTENT}/Home - Copy` });
      expect(copyItem).toBeTruthy();
      expect(copyItem.name).toBe('Home - Copy');
    });
  });
});
