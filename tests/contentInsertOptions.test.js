const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const templateService = require('../src/services/templateService');
const itemService = require('../src/services/itemService');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const { runMigration } = require('../src/scripts/migrate-content-insert-options');

describe('Content Insert Options & Project/Pages + Common Templates', () => {
  let mongoServer;
  let adminUserId;
  let folderTpl;
  let contentNode;
  let homeTpl;
  let aboutTpl;
  let heroCompTpl;
  let systemTpl;

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

    // 1. Templates
    folderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      isSystem: false,
      path: '/sitecore/templates/Common/Folder',
      sections: [],
      insertOptions: [],
    });

    systemTpl = await Template.create({
      name: 'SystemSetting',
      displayName: 'System Setting',
      isSystem: true,
      path: '/sitecore/templates/System/SystemSetting',
      sections: [],
    });

    heroCompTpl = await Template.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      isSystem: false,
      path: '/sitecore/templates/Feature/Components/HeroBanner',
      sections: [],
    });

    homeTpl = await Template.create({
      name: 'Home',
      displayName: 'Home Page Template',
      isSystem: false,
      path: '/sitecore/templates/Project/Pages/Home',
      sections: [],
      insertOptions: [],
    });

    aboutTpl = await Template.create({
      name: 'AboutUs',
      displayName: 'About Us Page Template',
      isSystem: false,
      path: '/sitecore/templates/Project/Pages/AboutUs',
      sections: [],
      insertOptions: [],
    });

    // 2. Content Node
    contentNode = await Item.create({
      name: 'content',
      displayName: 'Content',
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore/content',
      sortOrder: 100,
      createdBy: adminUserId,
      languages: [{ code: 'vi', versions: [{ version: 1, createdBy: adminUserId }] }],
    });
  });

  describe('1. Insert options resolution on /sitecore/content', () => {
    it('should list Project/Pages templates and Common templates (Folder) and exclude Feature/Components and System', async () => {
      const options = await templateService.getInsertOptions(contentNode._id);
      expect(options).toHaveLength(3);
      const names = options.map((o) => o.name);
      expect(names).toContain('Home');
      expect(names).toContain('AboutUs');
      expect(names).toContain('Folder');
      expect(names).not.toContain('HeroBanner');
      expect(names).not.toContain('SystemSetting');
    });

    it('should dynamically include new templates added in nested subfolders of Project/Pages', async () => {
      // Create nested template: /sitecore/templates/Project/Pages/Blog/Article
      await Template.create({
        name: 'Article',
        displayName: 'Article Page Template',
        isSystem: false,
        path: '/sitecore/templates/Project/Pages/Blog/Article',
        sections: [],
      });

      const options = await templateService.getInsertOptions(contentNode._id);
      expect(options).toHaveLength(4);
      const names = options.map((o) => o.name);
      expect(names).toContain('Article');
      expect(names).toContain('Home');
      expect(names).toContain('AboutUs');
      expect(names).toContain('Folder');
    });

    it('should dynamically include new templates added in Common', async () => {
      await Template.create({
        name: 'ContentFolder',
        displayName: 'Content Folder',
        isSystem: false,
        path: '/sitecore/templates/Common/ContentFolder',
        sections: [],
      });

      const options = await templateService.getInsertOptions(contentNode._id);
      const names = options.map((o) => o.name);
      expect(names).toContain('ContentFolder');
    });

    it('should return empty list when no templates exist in Project/Pages or Common', async () => {
      // Create a node with a template that is not in Common/Project
      contentNode.templateId = systemTpl._id;
      await contentNode.save();

      await Template.deleteMany({
        $or: [
          { path: { $regex: '^/sitecore/templates/Project/Pages', $options: 'i' } },
          { path: { $regex: '^/sitecore/templates/Common', $options: 'i' } },
        ],
      });

      const options = await templateService.getInsertOptions(contentNode._id);
      expect(options).toEqual([]);
    });
  });

  describe('2. Insert options resolution for child items under /sitecore/content', () => {
    it('should fall back to Project/Pages + Common templates if child item has empty insertOptions', async () => {
      const homeItem = await Item.create({
        name: 'home',
        displayName: 'Home',
        templateId: homeTpl._id,
        parentId: contentNode._id,
        ancestors: [contentNode._id],
        path: '/sitecore/content/home',
        sortOrder: 10,
        createdBy: adminUserId,
        languages: [{ code: 'vi', versions: [{ version: 1, createdBy: adminUserId }] }],
      });

      const options = await templateService.getInsertOptions(homeItem._id);
      expect(options).toHaveLength(3);
      const names = options.map((o) => o.name);
      expect(names).toContain('Home');
      expect(names).toContain('AboutUs');
      expect(names).toContain('Folder');
      expect(names).not.toContain('HeroBanner');
    });

    it('should prioritize custom insertOptions if configured on template', async () => {
      homeTpl.insertOptions = [aboutTpl._id];
      await homeTpl.save();
      templateService.invalidateCache();

      const homeItem = await Item.create({
        name: 'home',
        displayName: 'Home',
        templateId: homeTpl._id,
        parentId: contentNode._id,
        ancestors: [contentNode._id],
        path: '/sitecore/content/home',
        sortOrder: 10,
        createdBy: adminUserId,
        languages: [{ code: 'vi', versions: [{ version: 1, createdBy: adminUserId }] }],
      });

      const options = await templateService.getInsertOptions(homeItem._id);
      expect(options).toHaveLength(1);
      expect(options[0].name).toBe('AboutUs');
    });
  });

  describe('3. Validation during item creation under /sitecore/content', () => {
    it('should allow creating page item under /content with a Project/Pages template', async () => {
      const newItem = await itemService.createFromTemplate(contentNode._id, homeTpl._id, 'landing-page', 'Landing Page', adminUserId);
      expect(newItem).toBeDefined();
      expect(newItem.name).toBe('landing-page');
      expect(newItem.path).toBe('/sitecore/content/landing-page');
    });

    it('should allow creating folder item under /content with Common Folder template', async () => {
      const newFolder = await itemService.createFromTemplate(contentNode._id, folderTpl._id, 'news', 'News Section', adminUserId);
      expect(newFolder).toBeDefined();
      expect(newFolder.name).toBe('news');
      expect(newFolder.path).toBe('/sitecore/content/news');
    });

    it('should reject creating item under /content with a Feature/Components template', async () => {
      await expect(
        itemService.createFromTemplate(contentNode._id, heroCompTpl._id, 'hero-item', 'Hero Item', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });

    it('should reject creating item under /content with a System template', async () => {
      await expect(
        itemService.createFromTemplate(contentNode._id, systemTpl._id, 'sys-item', 'System Item', adminUserId)
      ).rejects.toThrow(itemService.ValidationError);
    });
  });

  describe('4. moveTo syncs Template.path', () => {
    it('should update Template.path when a template item is moved to another parent folder', async () => {
      // Create template item in tree
      const commonFolderItem = await Item.create({
        name: 'Common',
        displayName: 'Common',
        templateId: folderTpl._id,
        parentId: null,
        ancestors: [],
        path: '/sitecore/templates/Common',
        sortOrder: 10,
        createdBy: adminUserId,
      });

      const projectFolderItem = await Item.create({
        name: 'Project',
        displayName: 'Project',
        templateId: folderTpl._id,
        parentId: null,
        ancestors: [],
        path: '/sitecore/templates/Project',
        sortOrder: 20,
        createdBy: adminUserId,
      });

      const customTpl = await Template.create({
        name: 'CustomTpl',
        displayName: 'Custom Template',
        isSystem: false,
        path: '/sitecore/templates/Common/CustomTpl',
        sections: [],
      });

      const customItem = await Item.create({
        _id: customTpl._id,
        name: 'CustomTpl',
        displayName: 'Custom Template',
        templateId: folderTpl._id,
        parentId: commonFolderItem._id,
        ancestors: [commonFolderItem._id],
        path: '/sitecore/templates/Common/CustomTpl',
        sortOrder: 10,
        createdBy: adminUserId,
      });

      // Move from Common to Project
      await itemService.moveTo(customItem._id, projectFolderItem._id, adminUserId);

      const updatedTpl = await Template.findById(customTpl._id);
      expect(updatedTpl.path).toBe('/sitecore/templates/Project/CustomTpl');
    });
  });

  describe('5. Migration script idempotency and Common sync', () => {
    it('should clean legacy Page/Sample Item from Folder.insertOptions and sync Common Folder', async () => {
      const pageTpl = await Template.create({
        name: 'Page',
        displayName: 'Page',
        isSystem: true,
      });
      folderTpl.insertOptions = [folderTpl._id, pageTpl._id];
      await folderTpl.save();

      // Create item for folderTpl in /sitecore/templates/Common/Folder
      await Item.create({
        _id: folderTpl._id,
        name: 'Folder',
        displayName: 'Folder',
        templateId: systemTpl._id,
        path: '/sitecore/templates/Common/Folder',
        parentId: contentNode._id,
        ancestors: [contentNode._id],
        createdBy: adminUserId,
      });

      // First run
      await runMigration();
      const updatedFolder = await Template.findById(folderTpl._id);
      expect(updatedFolder.insertOptions.map((id) => id.toString())).not.toContain(pageTpl._id.toString());
      expect(updatedFolder.path).toBe('/sitecore/templates/Common/Folder');
      expect(updatedFolder.isSystem).toBe(false);

      // Second run (idempotent)
      await runMigration();
      const secondCheck = await Template.findById(folderTpl._id);
      expect(secondCheck.insertOptions.map((id) => id.toString())).not.toContain(pageTpl._id.toString());
    });
  });
});
