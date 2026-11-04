const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const templateService = require('../src/services/templateService');
const itemService = require('../src/services/itemService');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const { runMigration } = require('../src/scripts/migrate-sample-component-template');

describe('Feature/Components and Project/Pages Insert Options & Standard Template', () => {
  let mongoServer;
  let adminUserId;
  let templateFolderTpl;
  let templateDefTpl;
  let standardTpl;
  let heroBannerTpl;
  let homePageTpl;
  let layoutTpl;
  let componentsFolder;
  let pagesFolder;
  let contentFolder;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    adminUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    templateService.invalidateCache();
    await Item.deleteMany({});
    await Template.deleteMany({});

    // 1. Meta / System Templates
    templateFolderTpl = await Template.create({
      name: 'Template Folder',
      displayName: 'Template Folder',
      icon: 'ti ti-folder',
      isSystem: true,
      path: '/sitecore/templates/System/Template Folder',
      sections: [],
    });

    templateDefTpl = await Template.create({
      name: 'Template',
      displayName: 'Template',
      icon: 'ti ti-template',
      isSystem: true,
      path: '/sitecore/templates/System/Template',
      sections: [],
    });

    standardTpl = await Template.create({
      name: 'Standard Template',
      displayName: 'Standard Template',
      icon: 'ti ti-box',
      isSystem: true,
      description: 'Mẫu component trống để khởi tạo component hoặc page template mới',
      path: '/sitecore/templates/System/Standard Template',
      sections: [],
    });

    heroBannerTpl = await Template.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      isSystem: false,
      path: '/sitecore/templates/Feature/Components/HeroBanner',
      sections: [],
    });

    homePageTpl = await Template.create({
      name: 'Home',
      displayName: 'Home Page Template',
      isSystem: false,
      path: '/sitecore/templates/Project/Pages/Home',
      sections: [],
    });

    layoutTpl = await Template.create({
      name: 'Layout',
      displayName: 'Layout',
      isSystem: true,
      path: '/sitecore/templates/System/Layout',
      sections: [],
    });

    // 2. Tree Folders
    const sitecoreRoot = await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: templateFolderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
      sortOrder: 1,
      createdBy: adminUserId,
    });

    const templatesRoot = await Item.create({
      name: 'templates',
      displayName: 'Templates',
      templateId: templateFolderTpl._id,
      parentId: sitecoreRoot._id,
      ancestors: [sitecoreRoot._id],
      path: '/sitecore/templates',
      sortOrder: 10,
      createdBy: adminUserId,
    });

    const systemFolder = await Item.create({
      name: 'System',
      displayName: 'System',
      templateId: templateFolderTpl._id,
      parentId: templatesRoot._id,
      ancestors: [sitecoreRoot._id, templatesRoot._id],
      path: '/sitecore/templates/System',
      sortOrder: 10,
      createdBy: adminUserId,
    });

    // Standard Template Item in tree
    await Item.create({
      _id: standardTpl._id,
      name: 'Standard Template',
      displayName: 'Standard Template',
      templateId: templateDefTpl._id,
      parentId: systemFolder._id,
      ancestors: [...systemFolder.ancestors, systemFolder._id],
      path: '/sitecore/templates/System/Standard Template',
      sortOrder: 50,
      createdBy: adminUserId,
    });

    const featureFolder = await Item.create({
      name: 'Feature',
      displayName: 'Feature',
      templateId: templateFolderTpl._id,
      parentId: templatesRoot._id,
      ancestors: [sitecoreRoot._id, templatesRoot._id],
      path: '/sitecore/templates/Feature',
      sortOrder: 20,
      createdBy: adminUserId,
    });

    componentsFolder = await Item.create({
      name: 'Components',
      displayName: 'Components',
      templateId: templateFolderTpl._id,
      parentId: featureFolder._id,
      ancestors: [...featureFolder.ancestors, featureFolder._id],
      path: '/sitecore/templates/Feature/Components',
      sortOrder: 10,
      createdBy: adminUserId,
    });

    const projectFolder = await Item.create({
      name: 'Project',
      displayName: 'Project',
      templateId: templateFolderTpl._id,
      parentId: templatesRoot._id,
      ancestors: [sitecoreRoot._id, templatesRoot._id],
      path: '/sitecore/templates/Project',
      sortOrder: 30,
      createdBy: adminUserId,
    });

    pagesFolder = await Item.create({
      name: 'Pages',
      displayName: 'Pages',
      templateId: templateFolderTpl._id,
      parentId: projectFolder._id,
      ancestors: [...projectFolder.ancestors, projectFolder._id],
      path: '/sitecore/templates/Project/Pages',
      sortOrder: 10,
      createdBy: adminUserId,
    });

    contentFolder = await Item.create({
      name: 'content',
      displayName: 'Content',
      templateId: templateFolderTpl._id,
      parentId: sitecoreRoot._id,
      ancestors: [sitecoreRoot._id],
      path: '/sitecore/content',
      sortOrder: 100,
      createdBy: adminUserId,
    });
  });

  describe('1. Insert Options under Feature/Components and Project/Pages', () => {
    it('should only return Folder (Template Folder) and Standard Template on Feature/Components', async () => {
      const options = await templateService.getInsertOptions(componentsFolder._id);
      expect(options).toHaveLength(2);
      const names = options.map((o) => o.name);
      expect(names).toContain('Template Folder');
      expect(names).toContain('Standard Template');
      expect(names).not.toContain('HeroBanner');
      expect(names).not.toContain('Template');

      const folderOption = options.find((o) => o.name === 'Template Folder');
      expect(folderOption.displayName).toBe('Folder');
      const standardOption = options.find((o) => o.name === 'Standard Template');
      expect(standardOption.displayName).toBe('Standard Template');
    });

    it('should only return Folder (Template Folder) and Standard Template on Project/Pages', async () => {
      const options = await templateService.getInsertOptions(pagesFolder._id);
      expect(options).toHaveLength(2);
      const names = options.map((o) => o.name);
      expect(names).toContain('Template Folder');
      expect(names).toContain('Standard Template');
      expect(names).not.toContain('Home');
    });

    it('should also return only Folder and Standard Template on nested subfolders', async () => {
      const subFolder = await itemService.createFromTemplate(
        componentsFolder._id,
        templateFolderTpl._id,
        'Promo',
        'Promo Components',
        adminUserId
      );

      const options = await templateService.getInsertOptions(subFolder._id);
      expect(options).toHaveLength(2);
      const names = options.map((o) => o.name);
      expect(names).toContain('Template Folder');
      expect(names).toContain('Standard Template');
    });

    it('should return empty insert options for template items (cannot have child items created)', async () => {
      // Create a template item under Feature/Components
      const compItem = await itemService.createFromTemplate(
        componentsFolder._id,
        standardTpl._id,
        'BannerCard',
        'Banner Card',
        adminUserId
      );

      const options = await templateService.getInsertOptions(compItem._id);
      expect(options).toEqual([]);

      // Attempting to create child under template item should be rejected
      await expect(
        itemService.createFromTemplate(compItem._id, templateFolderTpl._id, 'child-folder', 'Child Folder', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });
  });

  describe('2. Creating from Standard Template & Template Isolation', () => {
    it('should create an empty, normal Template when created from Standard Template', async () => {
      const newCompItem = await itemService.createFromTemplate(
        componentsFolder._id,
        standardTpl._id,
        'PromoCard',
        'Promo Card Component',
        adminUserId
      );

      expect(newCompItem).toBeDefined();
      expect(newCompItem.name).toBe('promocard');
      expect(newCompItem.path).toBe('/sitecore/templates/Feature/Components/promocard');
      expect((newCompItem.templateId._id || newCompItem.templateId).toString()).toBe(templateDefTpl._id.toString());

      // Verify Template document was created with empty sections
      const tplDoc = await Template.findById(newCompItem._id);
      expect(tplDoc).toBeDefined();
      expect(tplDoc.name).toBe('PromoCard');
      expect(tplDoc.displayName).toBe('Promo Card Component');
      expect(tplDoc.sections).toEqual([]);
      expect(tplDoc.baseTemplates).toEqual([]);
      expect(tplDoc.isSystem).toBe(false);

      // Verify resolveTemplate succeeds on empty template
      const resolved = await templateService.resolveTemplate(tplDoc._id);
      expect(resolved).toBeDefined();
      expect(resolved.sections).toEqual([]);

      // Add a section to this new template
      const updatedTpl = await templateService.addSection(tplDoc._id, { name: 'General' });
      expect(updatedTpl.sections).toHaveLength(1);
      expect(updatedTpl.sections[0].name).toBe('General');

      // Verify it can be picked as componentTemplate for Renderings
      const compTemplates = await templateService.getComponentTemplates();
      const compNames = compTemplates.map((t) => t.name);
      expect(compNames).toContain('PromoCard');
    });

    it('should assign default name New Component in Components and New Page Template in Pages when name is empty', async () => {
      const comp1 = await itemService.createFromTemplate(
        componentsFolder._id,
        standardTpl._id,
        '',
        '',
        adminUserId
      );
      expect(comp1.displayName).toBe('New Component');

      const comp2 = await itemService.createFromTemplate(
        componentsFolder._id,
        standardTpl._id,
        '',
        '',
        adminUserId
      );
      expect(comp2.displayName).toBe('New Component 1');

      const page1 = await itemService.createFromTemplate(
        pagesFolder._id,
        standardTpl._id,
        '',
        '',
        adminUserId
      );
      expect(page1.displayName).toBe('New Page Template');
    });

    it('should reject createFromTemplate under Components/Pages with other templates (HeroBanner, Home, Layout)', async () => {
      await expect(
        itemService.createFromTemplate(componentsFolder._id, heroBannerTpl._id, 'invalid', 'Invalid', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);

      await expect(
        itemService.createFromTemplate(pagesFolder._id, homePageTpl._id, 'invalid2', 'Invalid 2', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);

      await expect(
        itemService.createFromTemplate(componentsFolder._id, layoutTpl._id, 'invalid3', 'Invalid 3', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });
  });

  describe('3. Immutability of Standard Template', () => {
    it('should block renaming Standard Template', async () => {
      await expect(
        itemService.rename(standardTpl._id, 'RenamedStandard', 'Renamed', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });

    it('should block moving Standard Template', async () => {
      await expect(
        itemService.moveTo(standardTpl._id, componentsFolder._id, adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });

    it('should block deleting Standard Template', async () => {
      await expect(
        itemService.delete(standardTpl._id, adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });
  });

  describe('4. Preservation of /content branch behavior', () => {
    it('should not affect /content insert options (returns Project/Pages and Common)', async () => {
      const options = await templateService.getInsertOptions(contentFolder._id);
      const names = options.map((o) => o.name);
      expect(names).toContain('Home');
      expect(names).not.toContain('Standard Template');
      expect(names).not.toContain('HeroBanner');
    });
  });

  describe('5. Migration script idempotency', () => {
    it('should run cleanly and remain idempotent', async () => {
      const result = await runMigration();
      expect(result).toBeDefined();

      const secondRun = await runMigration();
      expect(secondRun).toBeDefined();
    });
  });
});
