const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Language = require('../src/models/Language');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const presentationService = require('../src/services/presentationService');
const { seedPresentationData } = require('../src/scripts/seed-presentation-data');

describe('GĐ 6: presentationService Unit Tests', () => {
  let mongoServer;
  let testUser;
  let testTemplate;
  let testItem;
  let seedResult;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    testUser = await User.create({
      username: 'pres_tester',
      email: 'pres_tester@cms.local',
      fullName: 'Presentation Tester',
      passwordHash: 'dummy',
      roles: [adminRole._id],
    });

    // Seed default languages
    await Language.create({ code: 'vi', name: 'Vietnamese', isDefault: true, active: true });
    await Language.create({ code: 'en', name: 'English', isDefault: false, active: true });

    // Seed root folder
    const folderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      sections: [],
    });

    await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
    });

    // Run presentation seeds
    seedResult = await seedPresentationData();

    // Create a custom article template with standard presentation
    testTemplate = await Template.create({
      name: 'ArticlePageWithPres',
      displayName: 'Article Page with Presentation',
      sections: [],
      presentation: {
        devices: [
          {
            deviceId: seedResult.defaultDevice._id,
            layoutId: seedResult.mainLayout._id,
            renderings: [
              {
                uid: 'std-hero-0001',
                renderingId: seedResult.heroRendering._id,
                placeholder: 'main',
                sortOrder: 100,
                datasourceId: null,
                parameters: { theme: 'dark' },
                hidden: false,
              },
              {
                uid: 'std-richtext-0002',
                renderingId: seedResult.richTextRendering._id,
                placeholder: 'main',
                sortOrder: 200,
                datasourceId: null,
                parameters: {},
                hidden: false,
              },
            ],
          },
        ],
      },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Create an item using testTemplate
    testItem = await Item.create({
      name: 'test-article',
      displayName: 'Test Article',
      templateId: testTemplate._id,
      path: '/sitecore/test-article',
      languages: [
        {
          code: 'vi',
          versions: [{ version: 1, fields: {} }],
        },
        {
          code: 'en',
          versions: [{ version: 1, fields: {} }],
        },
      ],
      presentation: {
        shared: { devices: [] },
        final: [],
      },
      createdBy: testUser._id,
    });
  });

  afterEach(async () => {
    await Item.deleteOne({ _id: testItem._id });
  });

  test('DEC-022: Dynamic Placeholder matching (exact, wildcard, and nested)', async () => {
    // Exact match
    const exactMain = await presentationService.matchPlaceholderSettings('main');
    expect(exactMain).toBeDefined();
    expect(exactMain.placeholderKey).toBe('main');

    // Wildcard match (column-{*})
    const wild1 = await presentationService.matchPlaceholderSettings('column-1');
    expect(wild1).toBeDefined();
    expect(wild1.placeholderKey).toBe('column-{*}');

    const wildLeft = await presentationService.matchPlaceholderSettings('column-left');
    expect(wildLeft).toBeDefined();
    expect(wildLeft.placeholderKey).toBe('column-{*}');

    // Nested match
    const nested = await presentationService.matchPlaceholderSettings('/main/column-right');
    expect(nested).toBeDefined();
    expect(nested.placeholderKey).toBe('column-{*}');
  });

  test('getFinalPresentation: inherits directly from Template Standard Presentation when no overrides exist', async () => {
    const finalPres = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'vi',
      1
    );

    expect(finalPres).toBeDefined();
    expect(finalPres.layoutId.toString()).toBe(seedResult.mainLayout._id.toString());
    expect(finalPres.renderings.length).toBe(2);

    const r1 = finalPres.renderings[0];
    expect(r1.uid).toBe('std-hero-0001');
    expect(r1.componentName).toBe('HeroBanner');
    expect(r1.origin).toBe('standard');
    expect(r1.parameters.theme).toBe('dark');

    const r2 = finalPres.renderings[1];
    expect(r2.uid).toBe('std-richtext-0002');
    expect(r2.componentName).toBe('RichTextContent');
    expect(r2.origin).toBe('standard');
  });

  test('getFinalPresentation: Shared Layout delta overrides standard rendering parameters and order', async () => {
    // Override std-hero-0001 parameters and sortOrder in Shared layout
    await presentationService.savePresentation(
      testItem._id,
      {
        deviceId: seedResult.defaultDevice._id,
        layoutId: seedResult.mainLayout._id,
        renderings: [
          {
            uid: 'std-hero-0001',
            renderingId: seedResult.heroRendering._id,
            placeholder: 'main',
            sortOrder: 500, // pushed to bottom
            parameters: { theme: 'blue-override' },
          },
          {
            uid: 'shared-promo-9999',
            renderingId: seedResult.promoRendering._id,
            placeholder: 'content',
            sortOrder: 100,
            parameters: { badge: 'Hot' },
          },
        ],
      },
      'shared',
      { userId: testUser._id }
    );

    const merged = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'vi',
      1
    );

    // Total should now be 3 (2 standard, 1 of which overridden, plus 1 new shared)
    expect(merged.renderings.length).toBe(3);

    const hero = merged.renderings.find((r) => r.uid === 'std-hero-0001');
    expect(hero.parameters.theme).toBe('blue-override');
    expect(hero.sortOrder).toBe(500);
    expect(hero.origin).toBe('shared');

    const promo = merged.renderings.find((r) => r.uid === 'shared-promo-9999');
    expect(promo).toBeDefined();
    expect(promo.placeholder).toBe('content');
    expect(promo.origin).toBe('shared');

    // Rich text was not overridden in shared, so it remains origin standard
    const richText = merged.renderings.find((r) => r.uid === 'std-richtext-0002');
    expect(richText.origin).toBe('standard');
  });

  test('getFinalPresentation: Shared Layout can hide a rendering from standard', async () => {
    await presentationService.savePresentation(
      testItem._id,
      {
        deviceId: seedResult.defaultDevice._id,
        layoutId: seedResult.mainLayout._id,
        renderings: [
          {
            uid: 'std-hero-0001',
            renderingId: seedResult.heroRendering._id,
            placeholder: 'main',
            hidden: true, // hide hero
          },
        ],
      },
      'shared',
      { userId: testUser._id }
    );

    const merged = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'vi',
      1
    );

    // Hero is hidden, only richText should remain
    expect(merged.renderings.length).toBe(1);
    expect(merged.renderings[0].uid).toBe('std-richtext-0002');
  });

  test('Final Layout: overrides specifically for language and version', async () => {
    // English v1 has Promo rendering in main placeholder
    await presentationService.savePresentation(
      testItem._id,
      {
        deviceId: seedResult.defaultDevice._id,
        layoutId: seedResult.mainLayout._id,
        renderings: [
          {
            uid: 'en-v1-promo-001',
            renderingId: seedResult.promoRendering._id,
            placeholder: 'main',
            sortOrder: 150,
            parameters: { langTag: 'EN-ONLY' },
          },
        ],
      },
      'final',
      { lang: 'en', version: 1, userId: testUser._id }
    );

    // English v1 must have Promo
    const enMerged = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'en',
      1
    );
    expect(enMerged.renderings.some((r) => r.uid === 'en-v1-promo-001')).toBe(true);

    // Vietnamese v1 must NOT have en-v1-promo-001
    const viMerged = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'vi',
      1
    );
    expect(viMerged.renderings.some((r) => r.uid === 'en-v1-promo-001')).toBe(false);
  });

  test('Optimistic Locking: rejects save with ConflictError (409) if expectedUpdatedAt is stale', async () => {
    const staleDate = new Date('2020-01-01');

    await expect(
      presentationService.savePresentation(
        testItem._id,
        {
          deviceId: seedResult.defaultDevice._id,
          layoutId: seedResult.mainLayout._id,
          renderings: [],
        },
        'shared',
        { expectedUpdatedAt: staleDate.toISOString(), userId: testUser._id }
      )
    ).rejects.toThrow(presentationService.ConflictError);
  });

  test('resetToStandard: removes overrides and returns item to standard template presentation', async () => {
    // Add overrides
    await presentationService.savePresentation(
      testItem._id,
      {
        deviceId: seedResult.defaultDevice._id,
        layoutId: seedResult.mainLayout._id,
        renderings: [
          {
            uid: 'custom-promo',
            renderingId: seedResult.promoRendering._id,
            placeholder: 'main',
            sortOrder: 10,
          },
        ],
      },
      'shared',
      { userId: testUser._id }
    );

    // Reset shared
    await presentationService.resetToStandard(testItem._id, 'shared', {
      deviceId: seedResult.defaultDevice._id,
      userId: testUser._id,
    });

    const resetMerged = await presentationService.getFinalPresentation(
      testItem._id,
      seedResult.defaultDevice._id,
      'vi',
      1
    );

    // Should only have standard 2 renderings
    expect(resetMerged.renderings.length).toBe(2);
    expect(resetMerged.renderings.every((r) => r.origin === 'standard')).toBe(true);
  });

  test('Integrity check: getUsage detects templates and items using layout or rendering', async () => {
    const heroUsage = await presentationService.getUsage(seedResult.heroRendering._id);
    expect(heroUsage.inUse).toBe(true);
    expect(heroUsage.templates.length).toBeGreaterThan(0);

    const unusedId = new mongoose.Types.ObjectId();
    const unusedUsage = await presentationService.getUsage(unusedId);
    expect(unusedUsage.inUse).toBe(false);
    expect(unusedUsage.totalUsage).toBe(0);
  });
});

