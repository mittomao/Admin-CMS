const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Language = require('../src/models/Language');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const versionService = require('../src/services/versionService');
const itemService = require('../src/services/itemService');
const { migrateVersionsAndLanguages } = require('../src/scripts/migrate-to-versions-languages');

describe('GĐ 4: versionService & Migration Tests', () => {
  let mongoServer;
  let testUser;
  let testTemplate;
  let testItem;
  let sharedFieldId;
  let unversionedFieldId;
  let normalFieldId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    testUser = await User.create({
      username: 'version_tester',
      email: 'version_tester@cms.local',
      fullName: 'Version Tester',
      passwordHash: 'dummy',
      roles: [adminRole._id],
    });

    // Create a rich template with: 1 shared field, 1 unversioned field, 1 normal versioned field
    testTemplate = await Template.create({
      name: 'ArticlePage',
      displayName: 'Article Page',
      sections: [
        {
          name: 'Content Section',
          fields: [
            {
              name: 'sharedConfig',
              title: 'Shared Config',
              type: 'Single-Line Text',
              shared: true,
              unversioned: false,
              defaultValue: 'Default Shared',
            },
            {
              name: 'seoKeyword',
              title: 'SEO Keyword',
              type: 'Single-Line Text',
              shared: false,
              unversioned: true,
              defaultValue: 'default, seo',
            },
            {
              name: 'headline',
              title: 'Article Headline',
              type: 'Single-Line Text',
              shared: false,
              unversioned: false,
              defaultValue: 'Default Headline',
            },
          ],
        },
      ],
      standardValues: {},
    });

    sharedFieldId = testTemplate.sections[0].fields[0]._id.toString();
    unversionedFieldId = testTemplate.sections[0].fields[1]._id.toString();
    normalFieldId = testTemplate.sections[0].fields[2]._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await Language.deleteMany({});

    // Ensure system languages
    await Language.create({
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
      isDefault: true,
      active: true,
    });
    await Language.create({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      isDefault: false,
      active: true,
    });

    // Create a base item in legacy format to test migration
    testItem = await Item.create({
      name: 'article-1',
      displayName: 'Article 1',
      templateId: testTemplate._id,
      parentId: null,
      ancestors: [],
      path: '/article-1',
      sortOrder: 100,
      fields: {
        [sharedFieldId]: 'Initial Shared Value',
        [unversionedFieldId]: 'Initial English SEO',
        [normalFieldId]: 'Version 1 Headline',
      },
      createdBy: testUser._id,
    });
  });

  test('Migration: --dry-run mode does not alter documents in database', async () => {
    const dryRunResult = await migrateVersionsAndLanguages({ dryRun: true });
    expect(dryRunResult.itemsScanned).toBe(1);
    expect(dryRunResult.itemsUpdated).toBe(1);

    // Verify item in DB still has no languages array populated
    const rawItem = await Item.findById(testItem._id).lean();
    expect(rawItem.languages.length).toBe(0);
  });

  test('Migration: execution migrates legacy fields into en/v1 and prepares presentation schema', async () => {
    const runResult = await migrateVersionsAndLanguages({ dryRun: false });
    expect(runResult.itemsUpdated).toBe(1);

    const migratedItem = await Item.findById(testItem._id).lean();
    expect(migratedItem.languages.length).toBe(1);
    expect(migratedItem.languages[0].code).toBe('en');
    expect(migratedItem.languages[0].versions.length).toBe(1);
    expect(migratedItem.languages[0].versions[0].version).toBe(1);

    // Check presentation placeholder
    expect(migratedItem.presentation).toBeDefined();
    expect(migratedItem.presentation.shared).toBeDefined();
    expect(migratedItem.presentation.final).toEqual([]);

    // Idempotent test: running migration again does not update or duplicate
    const secondRun = await migrateVersionsAndLanguages({ dryRun: false });
    expect(secondRun.itemsUpdated).toBe(0);
  });

  test('resolveFields: correctly combines Versioned, Unversioned, Shared, and Standard Values', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });

    const item = await Item.findById(testItem._id);
    const resolved = await versionService.resolveFields(item, 'en', 1);

    expect(resolved.fields[normalFieldId]).toBe('Version 1 Headline');
    expect(resolved.fields[unversionedFieldId]).toBe('Initial English SEO');
    expect(resolved.fields[sharedFieldId]).toBe('Initial Shared Value');
    expect(resolved.origins[normalFieldId]).toBe('version');
    expect(resolved.origins[sharedFieldId]).toBe('shared');
    expect(resolved.origins[unversionedFieldId]).toBe('unversioned');
  });

  test('addVersion: clones version 1 fields and copies final presentation devices if present', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });

    // Simulate final presentation on version 1
    const dummyLayoutId = new mongoose.Types.ObjectId();
    await Item.findByIdAndUpdate(testItem._id, {
      $push: {
        'presentation.final': {
          language: 'en',
          version: 1,
          devices: [
            {
              layoutId: dummyLayoutId,
              renderings: [{ uid: 'test-uuid-v4', placeholder: 'main', sortOrder: 100 }],
            },
          ],
        },
      },
    });

    const addResult = await versionService.addVersion(testItem._id, 'en', {
      userId: testUser._id,
      note: 'Added version 2 for review',
    });

    expect(addResult.version).toBe(2);

    // Verify version 2 has copied fields
    const updatedItem = await Item.findById(testItem._id);
    const resolvedV2 = await versionService.resolveFields(updatedItem, 'en', 2);
    expect(resolvedV2.fields[normalFieldId]).toBe('Version 1 Headline');

    // Verify presentation final devices were copied according to DEC-020
    const finalV2 = updatedItem.presentation.final.find((p) => p.language === 'en' && p.version === 2);
    expect(finalV2).toBeDefined();
    expect(finalV2.devices[0].layoutId.toString()).toBe(dummyLayoutId.toString());
  });

  test('updateFields: editing a shared field updates it for all versions and languages', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });
    await versionService.addVersion(testItem._id, 'en', { userId: testUser._id });
    await versionService.addLanguageVersion(testItem._id, 'vi', { copyFromLang: 'en', userId: testUser._id });

    // Update shared field on English Version 2
    await versionService.updateFields(
      testItem._id,
      'en',
      2,
      {
        [sharedFieldId]: 'Globally Updated Shared Value',
      },
      null,
      { userId: testUser._id }
    );

    const reloaded = await Item.findById(testItem._id);

    // English v1 must reflect the shared change
    const resEnV1 = await versionService.resolveFields(reloaded, 'en', 1);
    expect(resEnV1.fields[sharedFieldId]).toBe('Globally Updated Shared Value');

    // Vietnamese v1 must reflect the shared change
    const resViV1 = await versionService.resolveFields(reloaded, 'vi', 1);
    expect(resViV1.fields[sharedFieldId]).toBe('Globally Updated Shared Value');
  });

  test('deleteVersion: successfully deletes non-last version and prevents deleting the last version', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });
    await versionService.addVersion(testItem._id, 'en', { userId: testUser._id });

    // Delete version 2
    const delResult = await versionService.deleteVersion(testItem._id, 'en', 2);
    expect(delResult.deletedVersion).toBe(2);
    expect(delResult.fallbackVersion).toBe(1);

    // Attempting to delete version 1 (now the only remaining version) must fail
    await expect(versionService.deleteVersion(testItem._id, 'en', 1)).rejects.toThrow(
      /phiên bản duy nhất còn lại/
    );
  });

  test('restoreVersion: creates a new version from historical data without overwriting', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });
    // Create v2 and modify normal headline
    await versionService.addVersion(testItem._id, 'en', { userId: testUser._id });
    await versionService.updateFields(
      testItem._id,
      'en',
      2,
      { [normalFieldId]: 'Modified in Version 2' },
      null,
      { userId: testUser._id }
    );

    // Now restore version 1
    const restoreResult = await versionService.restoreVersion(testItem._id, 'en', 1, {
      userId: testUser._id,
    });

    expect(restoreResult.version).toBe(3); // created as v3

    const item = await Item.findById(testItem._id);
    const resV3 = await versionService.resolveFields(item, 'en', 3);
    expect(resV3.fields[normalFieldId]).toBe('Version 1 Headline'); // got v1 content back
  });

  test('compareVersions: generates visual diff between two versions', async () => {
    await migrateVersionsAndLanguages({ dryRun: false });
    await versionService.addVersion(testItem._id, 'en', { userId: testUser._id });
    await versionService.updateFields(
      testItem._id,
      'en',
      2,
      { [normalFieldId]: 'Version 2 Completely New Title' },
      null,
      { userId: testUser._id }
    );

    const diff = await versionService.compareVersions(testItem._id, 'en', 1, 2);
    expect(diff.totalDifferences).toBe(1);

    const normalFieldDiff = diff.sections[0].fields.find((f) => f.fieldId === normalFieldId);
    expect(normalFieldDiff.isDifferent).toBe(true);
    expect(normalFieldDiff.diffHtmlA).toContain('diff-removed');
    expect(normalFieldDiff.diffHtmlB).toContain('diff-added');
  });

  test('duplicate: clones all languages and versions along with presentation', async () => {
    const parentNode = await Item.create({
      name: 'root-parent',
      displayName: 'Root Parent',
      templateId: testTemplate._id,
      path: '/root-parent',
      createdBy: testUser._id,
    });

    await Item.findByIdAndUpdate(testItem._id, { parentId: parentNode._id, ancestors: [parentNode._id] });

    await migrateVersionsAndLanguages({ dryRun: false });
    await versionService.addLanguageVersion(testItem._id, 'vi', { copyFromLang: 'en', userId: testUser._id });

    const duplicated = await itemService.duplicate(testItem._id, null, testUser._id, false);
    expect(duplicated).toBeDefined();

    const dupItem = await Item.findById(duplicated._id).lean();
    expect(dupItem.languages.length).toBe(2);
    expect(dupItem.languages.some((l) => l.code === 'en')).toBe(true);
    expect(dupItem.languages.some((l) => l.code === 'vi')).toBe(true);
    expect(dupItem.presentation).toBeDefined();
  });

  test('GĐ 4.1: Fallback from en to vi and creating vi/1 on first save', async () => {
    // 1. Migrate testItem into en/1 only
    await migrateVersionsAndLanguages({ dryRun: false });

    const item = await Item.findById(testItem._id);
    expect(item.languages.length).toBe(1);
    expect(item.languages[0].code).toBe('en');

    // 2. Resolve fields for Vietnamese 'vi' (which does not exist yet)
    const resolvedVi = await versionService.resolveFields(item, 'vi', 1);
    expect(resolvedVi.hasLanguage).toBe(false);
    expect(resolvedVi.fields[normalFieldId]).toBe('Version 1 Headline'); // fallback from en
    expect(resolvedVi.origins[normalFieldId]).toBe('fallback');
    expect(resolvedVi.fields[sharedFieldId]).toBe('Initial Shared Value');

    // 3. User saves for the first time in 'vi'
    const saveResult = await versionService.updateFields(
      testItem._id,
      'vi',
      1,
      {
        [normalFieldId]: 'Tiêu đề tiếng Việt mới',
      },
      null,
      { userId: testUser._id }
    );

    expect(saveResult.language).toBe('vi');
    expect(saveResult.version).toBe(1);

    // 4. Verify item now has both 'en' and 'vi'
    const updatedItem = await Item.findById(testItem._id);
    expect(updatedItem.languages.length).toBe(2);

    const viLang = updatedItem.languages.find((l) => l.code === 'vi');
    expect(viLang).toBeDefined();
    expect(viLang.versions.length).toBe(1);
    expect(viLang.versions[0].version).toBe(1);
    expect(viLang.versions[0].fields.get(normalFieldId)).toBe('Tiêu đề tiếng Việt mới');

    // English v1 must be preserved untouched
    const enLang = updatedItem.languages.find((l) => l.code === 'en');
    expect(enLang).toBeDefined();
    expect(enLang.versions[0].fields.get(normalFieldId)).toBe('Version 1 Headline');

    // Now resolve vi again: hasLanguage should be true, origin should be 'version'
    const resolvedViAfter = await versionService.resolveFields(updatedItem, 'vi', 1);
    expect(resolvedViAfter.hasLanguage).toBe(true);
    expect(resolvedViAfter.origins[normalFieldId]).toBe('version');
    expect(resolvedViAfter.fields[normalFieldId]).toBe('Tiêu đề tiếng Việt mới');
  });

  test('GĐ 4.1: Functions default to vi when langCode is omitted', async () => {
    // Create an item with vi language using itemService
    const newItem = await itemService.createFromTemplate(
      testItem._id,
      testTemplate._id,
      'vi-default-test',
      'VI Default Test',
      testUser._id
    );

    // listVersions without langCode should return vi versions
    const versions = await versionService.listVersions(newItem._id);
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBe(1);

    // addVersion without langCode should add version to vi
    const newVer = await versionService.addVersion(newItem._id, null, { userId: testUser._id });
    expect(newVer.language).toBe('vi');
    expect(newVer.version).toBe(2);
  });
});
