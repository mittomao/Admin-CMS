'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const branding = require('../src/config/branding');
const Item = require('../src/models/Item');
const PublishedItem = require('../src/models/PublishedItem');
const Template = require('../src/models/Template');
const referenceService = require('../src/services/referenceService');

describe('GĐ 9 — referenceService (DEC-044 Reference Integrity)', () => {
  let mongoServer;
  let layoutItem;
  let renderingItem;
  let pageTemplate;
  let sampleItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // Create system templates
    const systemTpl = await Template.create({
      name: 'System',
      displayName: 'System',
      isSystem: true,
      sections: [],
    });

    const layoutTpl = await Template.create({
      name: 'Layout',
      displayName: 'Layout',
      isSystem: true,
      sections: [],
    });

    const renderingTpl = await Template.create({
      name: 'Rendering',
      displayName: 'Rendering',
      isSystem: true,
      sections: [],
    });

    // Create system roots
    await Item.create({
      name: 'root',
      path: branding.PATHS.ROOT,
      parentId: null,
      templateId: systemTpl._id,
      deleted: false,
    });

    const layoutRoot = await Item.create({
      name: 'layout',
      path: branding.PATHS.LAYOUT,
      parentId: null,
      templateId: systemTpl._id,
      deleted: false,
    });

    // Create a Layout item
    layoutItem = await Item.create({
      name: 'MainLayout',
      path: `${branding.PATHS.LAYOUTS}/MainLayout`,
      parentId: layoutRoot._id,
      templateId: layoutTpl._id,
      deleted: false,
    });

    // Create a Rendering item
    renderingItem = await Item.create({
      name: 'HeroBanner',
      path: `${branding.PATHS.RENDERINGS}/HeroBanner`,
      parentId: layoutRoot._id,
      templateId: renderingTpl._id,
      deleted: false,
    });

    // Create a template referencing this layout
    pageTemplate = await Template.create({
      name: 'ArticlePage',
      displayName: 'Article Page',
      isSystem: false,
      sections: [],
      presentation: {
        layoutId: layoutItem._id,
        renderings: [
          {
            uid: 'uid-hero-1',
            renderingId: renderingItem._id,
            placeholderKey: 'main',
            sortOrder: 1,
          },
        ],
      },
    });

    // Create an item instantiated from pageTemplate
    sampleItem = await Item.create({
      name: 'test-article',
      path: `${branding.PATHS.CONTENT}/test-article`,
      templateId: pageTemplate._id,
      deleted: false,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Phát hiện và CHẶN (BLOCK) xóa node hệ thống (/root, /root/content...)', async () => {
    const rootItem = await Item.findOne({ path: branding.PATHS.ROOT });
    const result = await referenceService.findReferences(rootItem);
    expect(result.canDelete).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
    expect(result.references.some((r) => r.referenceType === 'SYSTEM_NODE' && r.severity === 'BLOCK')).toBe(true);
  });

  test('Phát hiện và CHẶN (BLOCK) xóa Layout đang được sử dụng trong Template Presentation', async () => {
    const result = await referenceService.findReferences(layoutItem);
    expect(result.canDelete).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
    expect(result.references.some((r) => r.referenceType === 'LAYOUT' && r.severity === 'BLOCK')).toBe(true);
  });

  test('Phát hiện và CHẶN (BLOCK) xóa Rendering đang được sử dụng trong Template Presentation', async () => {
    const result = await referenceService.findReferences(renderingItem);
    expect(result.canDelete).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
    expect(result.references.some((r) => r.referenceType === 'RENDERING' && r.severity === 'BLOCK')).toBe(true);
  });

  test('Phát hiện và CHẶN (BLOCK) xóa Template đang có Item khởi tạo (Template Instance)', async () => {
    const result = await referenceService.findReferences(pageTemplate._id);
    expect(result.canDelete).toBe(false);
    expect(result.blockingCount).toBeGreaterThan(0);
    expect(result.references.some((r) => r.referenceType === 'TEMPLATE_INSTANCE' && r.severity === 'BLOCK')).toBe(true);
  });

  test('Phát hiện CẢNH BÁO (WARN) khi xóa item đã được xuất bản lên Web database', async () => {
    await PublishedItem.create({
      _id: sampleItem._id,
      name: sampleItem.name,
      path: sampleItem.path,
      templateId: pageTemplate._id,
      isDeleted: false,
      publishedAt: new Date(),
    });

    const result = await referenceService.findReferences(sampleItem);
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.references.some((r) => r.referenceType === 'WEB_PUBLISHED' && r.severity === 'WARN')).toBe(true);
  });
});
