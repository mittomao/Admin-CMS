const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const templateService = require('../src/services/templateService');

describe('templateService - Template Engine & Inheritance', () => {
  let mongoServer;

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
    await Template.deleteMany({});
    await Item.deleteMany({});
  });

  test('resolveTemplate merges multi-level base templates and tracks origin', async () => {
    // Level 1: _SeoBase
    const seoBase = await Template.create({
      name: '_SeoBase',
      displayName: 'SEO Base',
      sections: [
        {
          name: 'Metadata',
          fields: [
            { name: 'metaTitle', title: 'Meta Title', type: 'Single-Line Text' },
            { name: 'metaDescription', title: 'Meta Description', type: 'Multi-Line Text' },
          ],
        },
      ],
    });

    // Level 2: _ContentBase inherits _SeoBase
    const contentBase = await Template.create({
      name: '_ContentBase',
      displayName: 'Content Base',
      baseTemplates: [seoBase._id],
      sections: [
        {
          name: 'Content',
          fields: [{ name: 'summary', title: 'Summary', type: 'Multi-Line Text' }],
        },
      ],
    });

    // Level 3: LandingPage inherits _ContentBase
    const landingPage = await Template.create({
      name: 'LandingPage',
      displayName: 'Landing Page',
      baseTemplates: [contentBase._id],
      sections: [
        {
          name: 'Content',
          fields: [{ name: 'headline', title: 'Main Headline', type: 'Single-Line Text' }],
        },
        {
          name: 'Design',
          fields: [{ name: 'heroImage', title: 'Hero Image', type: 'Image' }],
        },
      ],
    });

    const resolved = await templateService.resolveTemplate(landingPage._id);

    expect(resolved).toBeDefined();
    // Sections should be merged: Metadata, Content, Design
    const sectionNames = resolved.sections.map((s) => s.name);
    expect(sectionNames).toContain('Metadata');
    expect(sectionNames).toContain('Content');
    expect(sectionNames).toContain('Design');

    // Section "Content" should contain both 'summary' (from base) and 'headline' (from child)
    const contentSec = resolved.sections.find((s) => s.name === 'Content');
    expect(contentSec.fields.length).toBe(2);

    const summaryField = contentSec.fields.find((f) => f.name === 'summary');
    expect(summaryField.origin.isInherited).toBe(true);
    expect(summaryField.origin.templateName).toBe('Content Base');

    const headlineField = contentSec.fields.find((f) => f.name === 'headline');
    expect(headlineField.origin.isInherited).toBe(false);
  });

  test('resolveTemplate allows child field to override base template field', async () => {
    const base = await Template.create({
      name: '_Base',
      sections: [
        {
          name: 'General',
          fields: [{ name: 'title', title: 'Base Title', type: 'Single-Line Text', required: false }],
        },
      ],
    });

    const child = await Template.create({
      name: 'Child',
      baseTemplates: [base._id],
      sections: [
        {
          name: 'General',
          fields: [{ name: 'title', title: 'Child Title Overridden', type: 'Single-Line Text', required: true }],
        },
      ],
    });

    const resolved = await templateService.resolveTemplate(child._id);
    const genSec = resolved.sections.find((s) => s.name === 'General');
    expect(genSec.fields.length).toBe(1);
    expect(genSec.fields[0].title).toBe('Child Title Overridden');
    expect(genSec.fields[0].required).toBe(true);
    expect(genSec.fields[0].origin.isInherited).toBe(false);
  });

  test('resolveTemplate detects circular inheritance and throws error', async () => {
    const tplA = await Template.create({ name: 'TplA', sections: [] });
    const tplB = await Template.create({ name: 'TplB', baseTemplates: [tplA._id], sections: [] });

    // Close the cycle: A -> B -> A
    tplA.baseTemplates = [tplB._id];
    await tplA.save();

    await expect(templateService.resolveTemplate(tplA._id)).rejects.toThrow(
      /Circular inheritance detected/
    );
  });

  test('setBaseTemplates prevents creating circular inheritance', async () => {
    const tplA = await Template.create({ name: 'TplA', sections: [] });
    const tplB = await Template.create({ name: 'TplB', baseTemplates: [tplA._id], sections: [] });

    // Attempting to set B as base of A should throw before saving
    await expect(templateService.setBaseTemplates(tplA._id, [tplB._id])).rejects.toThrow(
      /Circular inheritance detected/
    );
  });

  test('resolveStandardValues merges values along inheritance chain', async () => {
    const base = await Template.create({
      name: '_BaseStd',
      sections: [
        {
          name: 'Meta',
          fields: [{ name: 'author', title: 'Author', type: 'Single-Line Text' }],
        },
      ],
    });
    const authorFieldId = base.sections[0].fields[0]._id.toString();
    base.standardValues = { [authorFieldId]: 'Default Treecraft Author' };
    await base.save();

    const child = await Template.create({
      name: 'ChildStd',
      baseTemplates: [base._id],
      sections: [
        {
          name: 'Meta',
          fields: [{ name: 'copyright', title: 'Copyright', type: 'Single-Line Text' }],
        },
      ],
    });
    const copyFieldId = child.sections[0].fields[0]._id.toString();
    child.standardValues = { [copyFieldId]: '2026 CMS Corp' };
    await child.save();

    const stdValues = await templateService.resolveStandardValues(child._id);
    expect(stdValues[authorFieldId]).toBe('Default Treecraft Author');
    expect(stdValues[copyFieldId]).toBe('2026 CMS Corp');
  });

  test('delete blocks deleting system templates', async () => {
    const sysTpl = await Template.create({
      name: 'SystemFolder',
      isSystem: true,
      sections: [],
    });

    await expect(templateService.delete(sysTpl._id)).rejects.toThrow(/Cannot delete system template/);
  });

  test('delete blocks deleting templates used by content items', async () => {
    const tpl = await Template.create({ name: 'ArticleTpl', isSystem: false, sections: [] });
    await Item.create({
      name: 'sample-article',
      templateId: tpl._id,
      path: '/root/sample-article',
    });

    await expect(templateService.delete(tpl._id)).rejects.toThrow(/content item\(s\) are using this template/);
  });

  test('delete blocks deleting templates inherited by other templates', async () => {
    const baseTpl = await Template.create({ name: '_BasePageTpl', isSystem: false, sections: [] });
    await Template.create({ name: 'ChildPageTpl', baseTemplates: [baseTpl._id], sections: [] });

    await expect(templateService.delete(baseTpl._id)).rejects.toThrow(/Inherited by template/);
  });

  test('updateField blocks incompatible field type transitions if items exist', async () => {
    const tpl = await Template.create({
      name: 'EventTpl',
      sections: [
        {
          name: 'Event',
          fields: [{ name: 'eventDate', title: 'Date', type: 'Date' }],
        },
      ],
    });
    const fieldId = tpl.sections[0].fields[0]._id;

    // Create item using this template
    await Item.create({
      name: 'annual-event',
      templateId: tpl._id,
      path: '/root/annual-event',
    });

    // Incompatible transition: Date -> Checkbox
    await expect(
      templateService.updateField(tpl._id, tpl.sections[0]._id, fieldId, { type: 'Checkbox' })
    ).rejects.toThrow(/Incompatible type change/);
  });

  test('resolveEffectiveTemplateForTemplate derives component fields from Standard Presentation (DEC-036)', async () => {
    // 1. Create component template
    const heroCompTpl = await Template.create({
      name: 'HeroBannerComp',
      displayName: 'Hero Banner Component',
      sections: [
        {
          name: 'Hero Data',
          fields: [
            { name: 'HeroTitle', title: 'Hero Title', type: 'Single-Line Text', required: true },
            { name: 'HeroImage', title: 'Hero Image', type: 'Image' },
          ],
        },
      ],
    });

    // 2. Create Rendering Template and Item
    const renderingTpl = await Template.create({
      name: 'Rendering',
      displayName: 'Rendering',
      isSystem: true,
      sections: [],
    });

    const heroRenderingItem = await Item.create({
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: renderingTpl._id,
      path: '/root/layout/Renderings/Feature/HeroBanner',
      sharedFields: {
        viewPath: 'site/components/HeroBanner.ejs',
        componentTemplate: heroCompTpl._id.toString(),
      },
    });

    // 3. Create Page Template with standard presentation
    const pageTpl = await Template.create({
      name: 'AboutUsPageTemplate',
      displayName: 'About Us Page Template',
      sections: [],
      presentation: {
        layoutId: null,
        renderings: [
          {
            uid: 'test-rendering-uid-1',
            renderingId: heroRenderingItem._id,
            placeholder: 'maincontent',
            placeholderKey: 'maincontent',
            sortOrder: 100,
          },
        ],
      },
    });

    // 4. Resolve effective template for template
    const resolved = await templateService.resolveEffectiveTemplateForTemplate(pageTpl._id);

    expect(resolved).toBeDefined();
    expect(resolved.componentTemplates.length).toBe(1);
    expect(resolved.componentTemplates[0].name).toBe('HeroBannerComp');
    expect(resolved.componentSections.length).toBe(1);
    expect(resolved.componentSections[0].fields.length).toBe(2);
    expect(resolved.componentSections[0].fields.map((f) => f.name)).toEqual(['HeroTitle', 'HeroImage']);
    expect(resolved.componentSections[0].fields[0].origin.isComponent).toBe(true);
    expect(resolved.componentSections[0].fields[0].origin.isFromPresentation).toBe(true);
  });
});
