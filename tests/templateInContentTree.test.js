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

describe('Refactor: Templates in Content Tree & Removal of Standalone Template Manager', () => {
  let mongoServer;
  let adminAgent;
  let adminUser;
  let heroBannerTpl;
  let homePageTpl;

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

    // Root /root
    const rootFolderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      icon: 'ti ti-folder',
      isSystem: true,
      sections: [],
    });

    await Item.create({
      name: branding.ROOT_NAME,
      displayName: branding.ROOT_NAME,
      templateId: rootFolderTpl._id,
      parentId: null,
      ancestors: [],
      path: branding.ROOT_PATH,
      sortOrder: 1,
      fields: {},
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
      deleted: false,
    });

    // Create sample templates
    heroBannerTpl = await Template.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      icon: 'ti ti-ad-2',
      isSystem: false,
      sections: [
        {
          name: 'Hero Data',
          fields: [
            {
              name: 'Title',
              title: 'Title',
              type: 'Single-Line Text',
              required: true,
            },
          ],
        },
      ],
      baseTemplates: [],
      standardValues: {},
      insertOptions: [],
    });

    homePageTpl = await Template.create({
      name: 'Home',
      displayName: 'Home Page',
      icon: 'ti ti-home',
      isSystem: false,
      sections: [],
      baseTemplates: [],
      standardValues: {},
      insertOptions: [],
    });

    // Run migration to create Content Tree nodes for templates
    await migrateTemplatesToContentTree();

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
  // 1. Path Resolution & Aliasing (/template -> /root/templates)
  // ==========================================
  describe('1. Path Resolution & Aliases', () => {
    it('should resolve /root/templates node', async () => {
      const node = await itemService.getByPath(branding.PATHS.TEMPLATES);
      expect(node).toBeDefined();
      expect(node.name).toBe('templates');
    });

    it('should resolve /template alias to /root/templates', async () => {
      const node = await itemService.getByPath('/template');
      expect(node).toBeDefined();
      expect(node.path).toBe(branding.PATHS.TEMPLATES);
    });

    it('should resolve /templates alias to /root/templates', async () => {
      const node = await itemService.getByPath('/templates');
      expect(node).toBeDefined();
      expect(node.path).toBe(branding.PATHS.TEMPLATES);
    });

    it('should resolve child template path via alias: /template/Feature/Components/HeroBanner', async () => {
      const node = await itemService.getByPath('/template/Feature/Components/HeroBanner');
      expect(node).toBeDefined();
      expect(node._id.toString()).toBe(heroBannerTpl._id.toString());
      expect(node.name).toBe('HeroBanner');
    });
  });

  // ==========================================
  // 2. Content Tree Hierarchy for Templates
  // ==========================================
  describe('2. Content Tree Hierarchy', () => {
    it('should have standard folders under /root/templates', async () => {
      const rootNode = await itemService.getByPath(branding.PATHS.TEMPLATES);
      const children = await itemService.getChildren(rootNode._id);
      const names = children.map((c) => c.name);

      expect(names).toContain('System');
      expect(names).toContain('Feature');
      expect(names).toContain('Project');
    });

    it('should place HeroBanner under /root/templates/Feature/Components', async () => {
      const heroItem = await Item.findById(heroBannerTpl._id);
      expect(heroItem).toBeDefined();
      expect(heroItem.path).toBe(`${branding.PATHS.TEMPLATES}/Feature/Components/HeroBanner`);
      expect(heroItem.displayName).toBe('Hero Banner');
    });

    it('should place Home under /root/templates/Project/Pages', async () => {
      const homeItem = await Item.findById(homePageTpl._id);
      expect(homeItem).toBeDefined();
      expect(homeItem.path).toBe(`${branding.PATHS.TEMPLATES}/Project/Pages/Home`);
    });
  });

  // ==========================================
  // 3. Content Editor Template Workspace View
  // ==========================================
  describe('3. Template Designer in Content Editor', () => {
    it('GET /admin/content-editor/:id renders Template Designer workspace for a template item', async () => {
      const res = await adminAgent.get(`/admin/content-editor/${heroBannerTpl._id}`).expect(200);
      expect(res.text).toContain('id="templateEditorWrapper"');
      expect(res.text).toContain('Hero Banner');
      expect(res.text).toContain('id="templateWorkspaceTabs"');
      expect(res.text).toContain('data-tab="builder"');
      expect(res.text).toContain('data-tab="inheritance"');
      expect(res.text).toContain('data-tab="standard-values"');
      expect(res.text).toContain('data-tab="insert-options"');
      expect(res.text).toContain('data-tab="usage"');
    });

    it('GET /admin/content-editor/item/:id/form partial returns Template Designer workspace for a template item', async () => {
      const res = await adminAgent
        .get(`/admin/content-editor/item/${heroBannerTpl._id}/form`)
        .expect(200);

      expect(res.text).toContain('id="templateEditorWrapper"');
      expect(res.text).toContain('Hero Banner');
      expect(res.text).toContain('id="templateWorkspaceTabs"');
    });

    it('GET /admin/content-editor/item/:id/form partial returns normal item form for a regular content item', async () => {
      // Create a regular content item under /root/content
      const contentItem = await Item.create({
        name: 'test-article',
        displayName: 'Test Article',
        templateId: heroBannerTpl._id,
        parentId: null,
        ancestors: [],
        path: `${branding.PATHS.CONTENT}/test-article`,
        fields: { Title: 'Sample Article Title' },
        languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
        deleted: false,
      });

      const res = await adminAgent
        .get(`/admin/content-editor/item/${contentItem._id}/form`)
        .expect(200);

      expect(res.text).toContain('id="itemEditForm"');
      expect(res.text).not.toContain('id="templateEditorWrapper"');
    });
  });

  // ==========================================
  // 4. Standalone Template Manager Redirection
  // ==========================================
  describe('4. Standalone Template Manager Redirection', () => {
    it('GET /admin/template-manager redirects to /admin/content-editor?path=/root/templates', async () => {
      const res = await adminAgent.get('/admin/template-manager').expect(302);
      expect(res.headers.location).toContain(`/admin/content-editor?path=${encodeURIComponent(branding.PATHS.TEMPLATES)}`);
    });

    it('GET /admin/template-manager/:id redirects to /admin/content-editor/:id', async () => {
      const res = await adminAgent.get(`/admin/template-manager/${heroBannerTpl._id}`).expect(302);
      expect(res.headers.location).toBe(`/admin/content-editor/${heroBannerTpl._id}`);
    });
  });

  // ==========================================
  // 5. Template Creation & Deletion Synchronization
  // ==========================================
  describe('5. Template Synchronization on CRUD', () => {
    it('should create Template document when inserting a Template item in tree', async () => {
      await Template.create({
        name: 'Standard Template',
        displayName: 'Standard Template',
        icon: 'ti ti-box',
        isSystem: true,
        sections: [],
      });

      const standardTpl = await Template.findOne({ name: 'Standard Template' });
      const componentsFolder = await itemService.getByPath(`${branding.PATHS.TEMPLATES}/Feature/Components`);

      const newItem = await itemService.createFromTemplate(
        componentsFolder._id,
        standardTpl._id,
        'PromoCard',
        'Promo Card Component',
        adminUser._id
      );

      expect(newItem).toBeDefined();
      expect(newItem.path).toBe(`${branding.PATHS.TEMPLATES}/Feature/Components/promocard`);

      // Verify corresponding Template document is created
      const newTpl = await Template.findById(newItem._id);
      expect(newTpl).toBeDefined();
      expect(newTpl.name).toBe('PromoCard');
      expect(newTpl.displayName).toBe('Promo Card Component');
      expect(newTpl.path).toBe(`${branding.PATHS.TEMPLATES}/Feature/Components/PromoCard`);
    });

    it('should prevent deleting template when in use', async () => {
      // Create an item using heroBannerTpl
      await Item.create({
        name: 'promo-1',
        displayName: 'Promo 1',
        templateId: heroBannerTpl._id,
        parentId: null,
        ancestors: [],
        path: `${branding.PATHS.CONTENT}/promo-1`,
        fields: {},
        languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
        deleted: false,
      });

      const heroItem = await Item.findById(heroBannerTpl._id);
      await expect(itemService.delete(heroItem._id)).rejects.toThrow(/delete template|xóa template/i);
    });
  });
});
