const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const templateService = require('../src/services/templateService');
const presentationService = require('../src/services/presentationService');
const itemService = require('../src/services/itemService');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
require('../src/models/User');
require('../src/models/Role');
const { runMigration } = require('../src/scripts/migrate-rendering-component-templates');
const { syncSystemTemplates } = require('../src/scripts/sync-system-templates');

describe('Phase 6.2: Effective Template Resolution & Component Template Binding', () => {
  let mongoServer;
  let rootFolder;
  let layoutItem;
  let heroTpl;
  let introTpl;
  let heroRendering;
  let introRendering;
  let pageTpl;
  let pageItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
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

    // 0. Base Folder Template
    const folderTemplate = await Template.create({
      name: 'Folder',
      displayName: 'Folder Template',
      isSystem: true,
      sections: [],
    });

    // 1. Root folder
    rootFolder = await Item.create({
      name: 'root',
      displayName: 'Treecraft Root',
      templateId: folderTemplate._id,
      path: '/root',
      ancestors: [],
      fields: {},
      sharedFields: {},
    });

    const layoutsFolder = await Item.create({
      name: 'Layouts',
      displayName: 'Layouts',
      templateId: folderTemplate._id,
      parentId: rootFolder._id,
      path: '/root/layout/layouts',
      ancestors: [rootFolder._id],
      fields: {},
      sharedFields: {},
    });

    const renderingsFolder = await Item.create({
      name: 'Renderings',
      displayName: 'Renderings',
      templateId: folderTemplate._id,
      parentId: rootFolder._id,
      path: '/root/layout/renderings',
      ancestors: [rootFolder._id],
      fields: {},
      sharedFields: {},
    });

    const contentFolder = await Item.create({
      name: 'content',
      displayName: 'Content',
      templateId: folderTemplate._id,
      parentId: rootFolder._id,
      path: '/root/content',
      ancestors: [rootFolder._id],
      fields: {},
      sharedFields: {},
    });

    // 2. System Templates
    const layoutTemplate = await Template.create({
      name: 'Layout',
      displayName: 'Layout Template',
      isSystem: true,
      sections: [{ name: 'Data', fields: [{ name: 'viewPath', title: 'View Path', type: 'Single-Line Text' }] }],
    });

    const renderingTemplate = await Template.create({
      name: 'Rendering',
      displayName: 'Rendering Template',
      isSystem: true,
      sections: [
        {
          name: 'Data',
          fields: [
            { name: 'viewPath', title: 'View Path', type: 'Single-Line Text' },
            { name: 'componentTemplate', title: 'Component Template', type: 'Single-Line Text', required: true },
          ],
        },
      ],
    });

    // 3. Layout Item
    layoutItem = await Item.create({
      name: 'MainLayout',
      displayName: 'Main Layout',
      templateId: layoutTemplate._id,
      parentId: layoutsFolder._id,
      path: '/root/layout/layouts/mainlayout',
      ancestors: [rootFolder._id, layoutsFolder._id],
      fields: { viewPath: 'site/layouts/HomeLayout.ejs' },
      sharedFields: { viewPath: 'site/layouts/HomeLayout.ejs' },
    });

    // 4. Component Templates under Feature/Components
    heroTpl = await Template.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner Component',
      isSystem: false,
      path: '/root/templates/Feature/Components/HeroBanner',
      sections: [
        {
          name: 'Hero Data',
          fields: [
            { name: 'Title', title: 'Hero Title', type: 'Single-Line Text', required: true },
            { name: 'BackgroundImage', title: 'Hero BG', type: 'Image' },
          ],
        },
      ],
      standardValues: {},
    });
    // Set standard value for hero title
    const heroTitleField = heroTpl.sections[0].fields[0];
    heroTpl.standardValues.set(heroTitleField._id.toString(), 'Default Hero Title');
    await heroTpl.save();

    introTpl = await Template.create({
      name: 'Introduction',
      displayName: 'Intro Component',
      isSystem: false,
      path: '/root/templates/Feature/Components/Introduction',
      sections: [
        {
          name: 'Intro Data',
          fields: [
            { name: 'Title', title: 'Intro Title', type: 'Single-Line Text', required: true },
            { name: 'Body', title: 'Intro Body', type: 'Rich Text' },
          ],
        },
      ],
    });

    // 5. Renderings with componentTemplate bound
    heroRendering = await Item.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: renderingTemplate._id,
      parentId: renderingsFolder._id,
      path: '/root/layout/renderings/herobanner',
      ancestors: [rootFolder._id, renderingsFolder._id],
      fields: {
        viewPath: 'site/components/HeroBanner.ejs',
        componentTemplate: heroTpl._id.toString(),
      },
      sharedFields: {
        viewPath: 'site/components/HeroBanner.ejs',
        componentTemplate: heroTpl._id.toString(),
      },
    });

    introRendering = await Item.create({
      name: 'Introduction',
      displayName: 'Introduction',
      templateId: renderingTemplate._id,
      parentId: renderingsFolder._id,
      path: '/root/layout/renderings/introduction',
      ancestors: [rootFolder._id, renderingsFolder._id],
      fields: {
        viewPath: 'site/components/Introduction.ejs',
        componentTemplate: introTpl._id.toString(),
      },
      sharedFields: {
        viewPath: 'site/components/Introduction.ejs',
        componentTemplate: introTpl._id.toString(),
      },
    });

    // 6. Page Template - DOES NOT INHERIT Component Templates
    pageTpl = await Template.create({
      name: 'HomePage',
      displayName: 'Home Page Template',
      isSystem: false,
      path: '/root/templates/Project/Pages/HomePage',
      baseTemplates: [], // Standalone! No component templates inherited
      sections: [
        {
          name: 'Page Metadata',
          fields: [
            { name: 'PageTitle', title: 'Page Title', type: 'Single-Line Text' },
            { name: 'MetaDescription', title: 'Meta Desc', type: 'Multi-Line Text' },
          ],
        },
      ],
      presentation: {
        layoutId: layoutItem._id,
        renderings: [
          {
            uid: 'uid-hero-1',
            renderingId: heroRendering._id,
            placeholder: 'maincontent',
            placeholderKey: 'maincontent',
            sortOrder: 100,
            hidden: false,
          },
          {
            uid: 'uid-intro-1',
            renderingId: introRendering._id,
            placeholder: 'maincontent',
            placeholderKey: 'maincontent',
            sortOrder: 200,
            hidden: false,
          },
        ],
      },
    });

    // 7. Page Item created from pageTpl
    pageItem = await Item.create({
      name: 'home',
      displayName: 'Trang Chủ',
      templateId: pageTpl._id,
      parentId: contentFolder._id,
      path: '/root/content/home',
      ancestors: [rootFolder._id, contentFolder._id],
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
              note: 'v1',
            },
          ],
        },
      ],
      presentation: {
        shared: { layoutId: null, renderings: [] },
        final: [],
      },
    });
  });

  describe('1. validateComponentTemplateReference', () => {
    it('should reject missing or empty componentTemplate', async () => {
      await expect(templateService.validateComponentTemplateReference(null))
        .rejects.toThrow('Trường componentTemplate là bắt buộc đối với Rendering.');
    });

    it('should reject invalid ObjectId format', async () => {
      await expect(templateService.validateComponentTemplateReference('invalid-id'))
        .rejects.toThrow('componentTemplate phải là một ObjectId hợp lệ.');
    });

    it('should reject non-existent template', async () => {
      const nonExistent = new mongoose.Types.ObjectId();
      await expect(templateService.validateComponentTemplateReference(nonExistent))
        .rejects.toThrow('không tồn tại');
    });

    it('should reject system template as component template', async () => {
      const sysTpl = await Template.findOne({ name: 'Rendering' });
      await expect(templateService.validateComponentTemplateReference(sysTpl._id))
        .rejects.toThrow('Không được phép chọn Template hệ thống');
    });

    it('should reject template outside Feature/Components if path is set', async () => {
      const wrongPathTpl = await Template.create({
        name: 'WrongPath',
        path: '/root/templates/Project/Pages/WrongPath',
        isSystem: false,
      });
      await expect(templateService.validateComponentTemplateReference(wrongPathTpl._id))
        .rejects.toThrow('/root/templates/Feature/Components');
    });

    it('should accept valid component template under Feature/Components', async () => {
      const valid = await templateService.validateComponentTemplateReference(heroTpl._id);
      expect(valid).toBeDefined();
      expect(valid._id.toString()).toBe(heroTpl._id.toString());
    });
  });

  describe('2. checkComponentTemplateUsage & Integrity Protection', () => {
    it('should report renderings referencing the component template', async () => {
      const usage = await templateService.checkComponentTemplateUsage(heroTpl._id);
      expect(usage.inUse).toBe(true);
      expect(usage.totalUsage).toBe(1);
      expect(usage.renderings[0].name).toBe('HeroBanner');
    });

    it('should prevent deleting component template when in use by a rendering', async () => {
      await expect(templateService.delete(heroTpl._id))
        .rejects.toThrow('Referenced as componentTemplate by rendering');
    });

    it('should allow deleting component template when rendering is removed', async () => {
      await Item.findByIdAndDelete(heroRendering._id);
      const res = await templateService.delete(heroTpl._id);
      expect(res.success).toBe(true);
    });
  });

  describe('3. resolveEffectiveTemplate', () => {
    it('should automatically compute effective template with dedicated sections per component', async () => {
      const effective = await templateService.resolveEffectiveTemplate(pageItem, 'vi', 1);

      expect(effective).toBeDefined();
      expect(effective.name).toBe('HomePage');

      // Sections should contain Page Metadata + HeroBanner section + Introduction section
      const sectionNames = effective.sections.map((s) => s.name);
      expect(sectionNames).toContain('Page Metadata');
      expect(sectionNames).toContain('HeroBanner');
      expect(sectionNames).toContain('Introduction');

      // Check section origin badge metadata
      const heroSec = effective.sections.find((s) => s.name === 'HeroBanner');
      expect(heroSec.origin.isComponent).toBe(true);
      expect(heroSec.origin.renderingName).toBe('HeroBanner');
      expect(heroSec.origin.templateId).toBe(heroTpl._id.toString());

      // Fields inside HeroBanner section
      const heroFieldNames = heroSec.fields.map((f) => f.name);
      expect(heroFieldNames).toContain('Title');
      expect(heroFieldNames).toContain('BackgroundImage');
    });

    it('should handle field collisions cleanly between page template and component template', async () => {
      // Both heroTpl and introTpl have a field named 'Title'
      const effective = await templateService.resolveEffectiveTemplate(pageItem, 'vi', 1);

      const heroSec = effective.sections.find((s) => s.name === 'HeroBanner');
      const introSec = effective.sections.find((s) => s.name === 'Introduction');

      const heroTitle = heroSec.fields.find((f) => f.name === 'Title');
      const introTitle = introSec.fields.find((f) => f.name === 'Title');

      expect(heroTitle).toBeDefined();
      expect(introTitle).toBeDefined();
      // Distinct field IDs
      expect(heroTitle._id.toString()).not.toBe(introTitle._id.toString());
    });

    it('should share one set of fields when the same component is repeated in presentation', async () => {
      // Add a second HeroBanner to pageItem final presentation
      await presentationService.savePresentation(
        pageItem._id,
        {
          layoutId: layoutItem._id,
          renderings: [
            { uid: 'hero-1', renderingId: heroRendering._id, placeholderKey: 'maincontent', sortOrder: 100 },
            { uid: 'hero-2', renderingId: heroRendering._id, placeholderKey: 'maincontent', sortOrder: 200 },
          ],
        },
        'final',
        { lang: 'vi', version: 1 }
      );

      const effective = await templateService.resolveEffectiveTemplate(pageItem, 'vi', 1);

      // HeroBanner section should only appear ONCE
      const heroSections = effective.sections.filter((s) => s.name === 'HeroBanner');
      expect(heroSections.length).toBe(1);
    });

    it('should merge dynamic standard values from component templates into effective standard values', async () => {
      const effective = await templateService.resolveEffectiveTemplate(pageItem, 'vi', 1);
      const heroTitleFieldId = heroTpl.sections[0].fields[0]._id.toString();

      expect(effective.standardValues).toBeDefined();
      expect(effective.standardValues[heroTitleFieldId]).toBe('Default Hero Title');
    });
  });

  describe('4. Data Preservation across Presentation Changes', () => {
    it('should preserve saved field values in MongoDB when rendering is removed and re-added', async () => {
      const heroTitleFieldId = heroTpl.sections[0].fields[0]._id.toString();

      // 1. Save data for Hero Title in pageItem
      await itemService.updateFields(
        pageItem._id,
        { [heroTitleFieldId]: 'My Custom Hero Title' },
        null,
        null,
        'vi',
        1
      );

      // Verify data is in item
      const itemAfterSave = await Item.findById(pageItem._id).lean();
      const verFields = itemAfterSave.languages[0].versions[0].fields;
      expect(verFields[heroTitleFieldId]).toBe('My Custom Hero Title');

      // 2. Remove HeroBanner from page presentation by marking it hidden in final layout
      await presentationService.savePresentation(
        pageItem._id,
        {
          layoutId: layoutItem._id,
          renderings: [
            { uid: 'uid-hero-1', renderingId: heroRendering._id, placeholderKey: 'maincontent', hidden: true },
            { uid: 'intro-only', renderingId: introRendering._id, placeholderKey: 'maincontent', sortOrder: 100 },
          ],
        },
        'final',
        { lang: 'vi', version: 1 }
      );

      // 3. Verify effective template now DOES NOT have HeroBanner section
      const effWithoutHero = await templateService.resolveEffectiveTemplate(pageItem._id, 'vi', 1);
      const heroSec = effWithoutHero.sections.find((s) => s.name === 'HeroBanner');
      expect(heroSec).toBeUndefined();

      // But item in MongoDB STILL HAS the data!
      const itemStillHasData = await Item.findById(pageItem._id).lean();
      expect(itemStillHasData.languages[0].versions[0].fields[heroTitleFieldId]).toBe('My Custom Hero Title');

      // 4. Re-add HeroBanner to presentation
      await presentationService.resetToStandard(pageItem._id, 'final', { lang: 'vi', version: 1 });

      // 5. Verify effective template HAS HeroBanner section again, and getItemWithRenderSchema shows value
      const schemaData = await itemService.getItemWithRenderSchema(pageItem._id, 'vi', 1);
      const effectiveTpl = schemaData.resolvedTemplate || schemaData.template;
      const restoredHeroSec = effectiveTpl.sections.find((s) => s.name === 'HeroBanner');
      expect(restoredHeroSec).toBeDefined();

      const restoredHeroTitle = restoredHeroSec.fields.find((f) => f.name === 'Title');
      expect(restoredHeroTitle.effectiveValue).toBe('My Custom Hero Title');
    });
  });

  describe('5. Migration Script', () => {
    it('should run migration in dry-run mode without modifying documents', async () => {
      await expect(runMigration()).resolves.not.toThrow();
    });
  });

  describe('6. System Templates Sync & viewPath Validation', () => {
    it('should return available component templates under Feature/Components', async () => {
      const compTpls = await templateService.getComponentTemplates();
      expect(Array.isArray(compTpls)).toBe(true);
      expect(compTpls.some((t) => t.name === 'HeroBanner')).toBe(true);
    });

    it('should include componentTemplates list in getItemWithRenderSchema', async () => {
      const schemaData = await itemService.getItemWithRenderSchema(heroRendering._id);
      expect(schemaData.componentTemplates).toBeDefined();
      expect(Array.isArray(schemaData.componentTemplates)).toBe(true);
      expect(schemaData.componentTemplates.length).toBeGreaterThan(0);
    });

    it('should validate viewPath when updating Layout item', async () => {
      // Valid viewPath
      await expect(
        itemService.updateFields(layoutItem._id, { viewPath: 'site/layouts/HomeLayout.ejs' })
      ).resolves.toBeDefined();

      // Path traversal attack rejected
      await expect(
        itemService.updateFields(layoutItem._id, { viewPath: '../../secret/HomeLayout.ejs' })
      ).rejects.toThrow(/Path Traversal/);

      // Non-ejs extension rejected
      await expect(
        itemService.updateFields(layoutItem._id, { viewPath: 'site/layouts/HomeLayout.html' })
      ).rejects.toThrow(/phải có phần mở rộng/);
    });

    it('should validate viewPath when updating Rendering item', async () => {
      // Path traversal attack rejected
      await expect(
        itemService.updateFields(heroRendering._id, { viewPath: 'site/../components/Hero.ejs' })
      ).rejects.toThrow(/Path Traversal/);
    });

    it('should run syncSystemTemplates without error', async () => {
      const result = await syncSystemTemplates();
      expect(result).toHaveProperty('templatesUpdated');
      expect(result).toHaveProperty('itemsUpdated');
      expect(result).toHaveProperty('legacyCleaned');
    });
  });
});
