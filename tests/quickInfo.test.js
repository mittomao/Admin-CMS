const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const branding = require('../src/config/branding');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const Language = require('../src/models/Language');
const itemService = require('../src/services/itemService');
const { migrateTemplatesToContentTree } = require('../src/scripts/migrate-templates-to-content-tree');

describe('GĐ 6.3 — Quick Info Section in Content Editor (DEC-037)', () => {
  let mongoServer;
  let adminAgent;
  let adminUser;
  let folderTpl;
  let pageTpl;
  let layoutTpl;
  let renderingTpl;
  let placeholderTpl;
  let homeItem;
  let layoutItem;
  let renderingItem;
  let placeholderItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const passwordHash = await User.hashPassword('pass123');
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
    });

    await Language.create({ code: 'vi', name: 'Vietnamese', isDefault: true, active: true });

    // 1. Templates
    folderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      icon: 'ti ti-folder',
      path: `${branding.PATHS.TEMPLATES}/System/Folder`,
      isSystem: true,
      sections: [],
    });

    pageTpl = await Template.create({
      name: 'HomePage',
      displayName: 'Home Page Template',
      icon: 'ti ti-home',
      path: `${branding.PATHS.TEMPLATES}/Project/Pages/HomePage`,
      isSystem: false,
      sections: [
        {
          name: 'Content',
          fields: [
            {
              name: 'Title',
              title: 'Title',
              type: 'Single-Line Text',
            },
          ],
        },
      ],
    });

    layoutTpl = await Template.create({
      name: 'Layout',
      displayName: 'Layout Definition',
      icon: 'ti ti-layout',
      path: `${branding.PATHS.TEMPLATES}/System/Layout`,
      isSystem: true,
      sections: [],
    });

    renderingTpl = await Template.create({
      name: 'Rendering',
      displayName: 'Rendering Definition',
      icon: 'ti ti-puzzle',
      path: `${branding.PATHS.TEMPLATES}/System/Rendering`,
      isSystem: true,
      sections: [],
    });

    placeholderTpl = await Template.create({
      name: 'Placeholder',
      displayName: 'Placeholder Definition',
      icon: 'ti ti-box',
      path: `${branding.PATHS.TEMPLATES}/System/Placeholder`,
      isSystem: true,
      sections: [],
    });

    // 2. Base tree structure
    const rootItem = await Item.create({
      name: branding.ROOT_NAME,
      displayName: branding.ROOT_NAME,
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: branding.ROOT_PATH,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    const contentFolder = await Item.create({
      name: 'content',
      displayName: 'Content',
      templateId: folderTpl._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: branding.PATHS.CONTENT,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    homeItem = await Item.create({
      name: 'home',
      displayName: 'Home',
      templateId: pageTpl._id,
      parentId: contentFolder._id,
      ancestors: [rootItem._id, contentFolder._id],
      path: `${branding.PATHS.CONTENT}/home`,
      createdBy: adminUser._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: { Title: 'Trang Chủ' },
              createdBy: adminUser._id,
            },
          ],
        },
      ],
      deleted: false,
    });

    // Presentation tree
    const layoutFolder = await Item.create({
      name: 'layout',
      displayName: 'Layout',
      templateId: folderTpl._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: branding.PATHS.LAYOUT,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    const layoutsSub = await Item.create({
      name: 'Layouts',
      displayName: 'Layouts',
      templateId: folderTpl._id,
      parentId: layoutFolder._id,
      ancestors: [rootItem._id, layoutFolder._id],
      path: `${branding.PATHS.LAYOUT}/Layouts`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    layoutItem = await Item.create({
      name: 'HomeLayout',
      displayName: 'Home Layout',
      templateId: layoutTpl._id,
      parentId: layoutsSub._id,
      ancestors: [rootItem._id, layoutFolder._id, layoutsSub._id],
      path: `${branding.PATHS.LAYOUT}/Layouts/HomeLayout`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    const renderingsSub = await Item.create({
      name: 'Renderings',
      displayName: 'Renderings',
      templateId: folderTpl._id,
      parentId: layoutFolder._id,
      ancestors: [rootItem._id, layoutFolder._id],
      path: `${branding.PATHS.LAYOUT}/Renderings`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    renderingItem = await Item.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: renderingTpl._id,
      parentId: renderingsSub._id,
      ancestors: [rootItem._id, layoutFolder._id, renderingsSub._id],
      path: `${branding.PATHS.LAYOUT}/Renderings/HeroBanner`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    const placeholdersSub = await Item.create({
      name: 'Placeholders',
      displayName: 'Placeholders',
      templateId: folderTpl._id,
      parentId: layoutFolder._id,
      ancestors: [rootItem._id, layoutFolder._id],
      path: `${branding.PATHS.LAYOUT}/Placeholders`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    placeholderItem = await Item.create({
      name: 'maincontent',
      displayName: 'Main Content',
      templateId: placeholderTpl._id,
      parentId: placeholdersSub._id,
      ancestors: [rootItem._id, layoutFolder._id, placeholdersSub._id],
      path: `${branding.PATHS.LAYOUT}/Placeholders/maincontent`,
      createdBy: adminUser._id,
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    // Run migration to sync templates into Content Tree
    await migrateTemplatesToContentTree();

    // Authenticate admin agent
    adminAgent = request.agent(app);
    await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'pass123' })
      .expect(302);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // ==========================================
  // 1. Service Layer Tests (getQuickInfo)
  // ==========================================
  describe('1. itemService.getQuickInfo', () => {
    it('should return correct 6-item metadata object for Content item', async () => {
      const qi = await itemService.getQuickInfo(homeItem._id);
      expect(qi).toBeDefined();

      // Row 1: Item ID
      expect(qi.itemId).toBe(`{${homeItem._id.toString().toUpperCase()}}`);

      // Row 2: Item name
      expect(qi.name).toBe('home');

      // Row 3: Item path
      expect(qi.path).toBe(`${branding.PATHS.CONTENT}/home`);

      // Row 4: Template
      expect(qi.template).toBeDefined();
      expect(qi.template.id).toBe(`{${pageTpl._id.toString().toUpperCase()}}`);
      expect(qi.template.path).toBe(`${branding.PATHS.TEMPLATES}/Project/Pages/HomePage`);

      // Row 5: Created from (null initially -> [unknown])
      expect(qi.createdFrom.isUnknown).toBe(true);
      expect(qi.createdFrom.displayText).toBe('[unknown]');

      // Row 6: Item owner
      expect(qi.itemOwner.isUnknown).toBe(false);
      expect(qi.itemOwner.displayText).toBe(`${branding.DEFAULT_DOMAIN}\\admin`);
    });

    it('should return correct metadata for Presentation items (Layout, Rendering, Placeholder)', async () => {
      const layoutQi = await itemService.getQuickInfo(layoutItem._id);
      expect(layoutQi.path).toBe(`${branding.PATHS.LAYOUT}/Layouts/HomeLayout`);
      expect(layoutQi.template.path).toBe(`${branding.PATHS.TEMPLATES}/System/Layout`);

      const renderingQi = await itemService.getQuickInfo(renderingItem._id);
      expect(renderingQi.path).toBe(`${branding.PATHS.LAYOUT}/Renderings/HeroBanner`);
      expect(renderingQi.template.path).toBe(`${branding.PATHS.TEMPLATES}/System/Rendering`);

      const placeholderQi = await itemService.getQuickInfo(placeholderItem._id);
      expect(placeholderQi.path).toBe(`${branding.PATHS.LAYOUT}/Placeholders/maincontent`);
      expect(placeholderQi.template.path).toBe(`${branding.PATHS.TEMPLATES}/System/Placeholder`);
    });

    it('should return correct metadata for a Template item', async () => {
      const tplQi = await itemService.getQuickInfo(pageTpl._id);
      expect(tplQi).toBeDefined();
      expect(tplQi.itemId).toBe(`{${pageTpl._id.toString().toUpperCase()}}`);
      expect(tplQi.name).toBe('HomePage');
      expect(tplQi.path).toBe(`${branding.PATHS.TEMPLATES}/Project/Pages/HomePage`);
    });

    it('should fallback to [unknown] when createdBy or createdFrom are not present', async () => {
      const anonymousItem = await Item.create({
        name: 'orphan-item',
        displayName: 'Orphan Item',
        templateId: folderTpl._id,
        parentId: homeItem._id,
        ancestors: [...homeItem.ancestors, homeItem._id],
        path: `${branding.PATHS.CONTENT}/home/orphan-item`,
        createdBy: null,
        createdFrom: null,
        languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
        deleted: false,
      });

      const qi = await itemService.getQuickInfo(anonymousItem._id);
      expect(qi.createdFrom.displayText).toBe('[unknown]');
      expect(qi.itemOwner.displayText).toBe('[unknown]');
    });
  });

  // ==========================================
  // 2. Duplicate / Copy Source Tracking
  // ==========================================
  describe('2. Duplicate & Copy tracking (createdFrom)', () => {
    it('should track createdFrom when item is duplicated', async () => {
      const duplicatedItem = await itemService.duplicate(
        homeItem._id,
        null,
        adminUser._id,
        false
      );

      expect(duplicatedItem).toBeDefined();
      expect(duplicatedItem.createdFrom).toBeDefined();
      expect(duplicatedItem.createdFrom.toString()).toBe(homeItem._id.toString());

      const qi = await itemService.getQuickInfo(duplicatedItem._id);
      expect(qi.createdFrom.isUnknown).toBe(false);
      expect(qi.createdFrom.displayText).toContain('Home');
      expect(qi.createdFrom.displayText).toContain(homeItem._id.toString().toUpperCase());
    });

    it('should track createdFrom when item is copied to another parent', async () => {
      const copiedItem = await itemService.copyTo(
        homeItem._id,
        homeItem.parentId,
        adminUser._id
      );

      expect(copiedItem).toBeDefined();
      expect(copiedItem.createdFrom.toString()).toBe(homeItem._id.toString());
    });
  });

  // ==========================================
  // 3. UI Partial Render Tests (/form)
  // ==========================================
  describe('3. Content Editor Form Partial with Quick Info', () => {
    it('should render Quick Info at top of item form with all 6 lines for Content item', async () => {
      const res = await adminAgent
        .get(`/admin/content-editor/item/${homeItem._id}/form`)
        .expect(200);

      const html = res.text;
      // Section header & bar
      expect(html).toContain('id="scQuickInfoSection"');
      expect(html).toContain('class="sc-section-bar"');
      expect(html).toContain('Quick Info');
      expect(html).toContain('class="sc-quick-info-body"');

      // 6 Lines in order
      expect(html).toContain('Item ID:');
      expect(html).toContain(`{${homeItem._id.toString().toUpperCase()}}`);
      expect(html).toContain('Item name:');
      expect(html).toContain('home');
      expect(html).toContain('Item path:');
      expect(html).toContain(`${branding.PATHS.CONTENT}/home`);
      expect(html).toContain('Template:');
      expect(html).toContain(`${branding.PATHS.TEMPLATES}/Project/Pages/HomePage`);
      expect(html).toContain('Created from:');
      expect(html).toContain('[unknown]');
      expect(html).toContain('Item owner:');
      expect(html).toContain(`${branding.DEFAULT_DOMAIN}\\admin`);

      // Copy buttons
      expect(html).toContain('title="Copy Item ID"');
      expect(html).toContain('title="Copy Item Path"');
    });

    it('should render Quick Info in Template Designer workspace', async () => {
      const res = await adminAgent
        .get(`/admin/content-editor/item/${pageTpl._id}/form`)
        .expect(200);

      const html = res.text;
      expect(html).toContain('id="scQuickInfoSection"');
      expect(html).toContain('Quick Info');
      expect(html).toContain('Item ID:');
      expect(html).toContain(`{${pageTpl._id.toString().toUpperCase()}}`);
      expect(html).toContain('Item name:');
      expect(html).toContain('HomePage');
    });

    it('should escape HTML characters safely in Quick Info values', async () => {
      const xssItem = await Item.create({
        name: 'xss-item',
        displayName: 'Evil <script>alert(1)</script>',
        templateId: folderTpl._id,
        parentId: homeItem._id,
        ancestors: [...homeItem.ancestors, homeItem._id],
        path: `${branding.PATHS.CONTENT}/home/xss-item`,
        createdBy: adminUser._id,
        languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
        deleted: false,
      });

      const res = await adminAgent
        .get(`/admin/content-editor/item/${xssItem._id}/form`)
        .expect(200);

      // Raw script tag must NOT be present unescaped
      expect(res.text).not.toContain('<script>alert(1)</script>');
    });
  });

  // ==========================================
  // 4. JSON API Endpoint (GET /api/items/:id/quick-info)
  // ==========================================
  describe('4. JSON API Endpoint GET /api/items/:id/quick-info', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get(`/api/items/${homeItem._id}/quick-info`)
        .expect(401);
    });

    it('should return 200 with JSON quick info data when authenticated', async () => {
      const res = await adminAgent
        .get(`/api/items/${homeItem._id}/quick-info`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.itemId).toBe(`{${homeItem._id.toString().toUpperCase()}}`);
      expect(res.body.data.path).toBe(`${branding.PATHS.CONTENT}/home`);
      expect(res.body.data.itemOwner.displayText).toBe(`${branding.DEFAULT_DOMAIN}\\admin`);
    });

    it('should return 404 for non-existent item id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await adminAgent
        .get(`/api/items/${fakeId}/quick-info`)
        .expect(404);
    });
  });
});
