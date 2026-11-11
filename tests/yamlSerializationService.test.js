'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const branding = require('../src/config/branding');
const yamlSectionService = require('../src/services/yamlSectionService');
const {
  serializeItemToYaml,
  parseYamlToItem,
  writeItemFileIfChanged,
} = require('../src/services/yamlItemSerializer');
const {
  resolveSectionDir,
  itemPathToRelativeFile,
  relativeFileToItemPath,
  ensureDirExists,
} = require('../src/config/serializationPaths');

const TEST_SERIALIZATION_DIR = path.join(__dirname, '../test_serialization');

describe('GĐ 11-Y2 — YAML Serialization & Section Sync Service Tests', () => {
  let mongoServer;
  let testTemplate;
  let testContentItem;
  let testLayoutItem;
  let testRenderingItem;

  beforeAll(async () => {
    process.env.SERIALIZATION_DIR = 'test_serialization';

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    // Clean up test serialization directory
    if (fs.existsSync(TEST_SERIALIZATION_DIR)) {
      fs.rmSync(TEST_SERIALIZATION_DIR, { recursive: true, force: true });
    }
    delete process.env.SERIALIZATION_DIR;
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await Template.deleteMany({});

    if (fs.existsSync(TEST_SERIALIZATION_DIR)) {
      fs.rmSync(TEST_SERIALIZATION_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_SERIALIZATION_DIR, { recursive: true });

    // Seed Template
    testTemplate = await Template.create({
      name: 'BlogArticle',
      displayName: 'Blog Article Template',
      path: `${branding.PATHS.TEMPLATES}/BlogArticle`,
      sections: [
        {
          name: 'General',
          fields: [
            { name: 'headline', title: 'Headline', type: 'Single-Line Text' },
            { name: 'author', title: 'Author', type: 'Single-Line Text' },
          ],
        },
      ],
    });

    // Seed Template Item
    await Item.create({
      _id: testTemplate._id,
      name: 'BlogArticle',
      displayName: 'Blog Article Template',
      path: `${branding.PATHS.TEMPLATES}/BlogArticle`,
      templateId: testTemplate._id,
    });

    // Seed Layout Item
    testLayoutItem = await Item.create({
      name: 'MainLayout',
      displayName: 'Main Master Layout',
      path: `${branding.PATHS.LAYOUTS}/MainLayout`,
      templateId: testTemplate._id,
    });

    // Seed Rendering Item
    testRenderingItem = await Item.create({
      name: 'ArticleHeader',
      displayName: 'Article Header Component',
      path: `${branding.PATHS.RENDERINGS}/ArticleHeader`,
      templateId: testTemplate._id,
    });

    // Seed Content Items
    testContentItem = await Item.create({
      name: 'Home',
      displayName: 'Home Page',
      path: `${branding.PATHS.CONTENT}/Home`,
      templateId: testTemplate._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([
                ['headline', 'Trang Chủ Treecraft'],
                ['author', 'Admin'],
              ]),
            },
          ],
        },
      ],
      presentation: {
        final: {
          layoutId: testLayoutItem._id,
          renderings: [
            {
              uid: 'r1-uid-456',
              renderingId: testRenderingItem._id,
              placeholder: 'main-content',
              sortOrder: 1,
            },
          ],
        },
      },
    });

    await Item.create({
      name: 'About',
      displayName: 'Giới Thiệu',
      path: `${branding.PATHS.CONTENT}/Home/About`,
      parentId: testContentItem._id,
      templateId: testTemplate._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([
                ['headline', 'Về Chúng Tôi'],
              ]),
            },
          ],
        },
      ],
    });
  });

  describe('1. Deterministic YAML Serializer & Path Resolution', () => {
    it('serializes item to deterministic YAML with sorted keys', () => {
      const yamlStr = serializeItemToYaml(testContentItem);
      expect(typeof yamlStr).toBe('string');
      expect(yamlStr).toContain('name: Home');
      expect(yamlStr).toContain('path: /root/content/Home');
      expect(yamlStr).toContain('code: vi');
      expect(yamlStr).toContain('headline: Trang Chủ Treecraft');

      // Key order check: _id should appear before name, name before path
      const idxId = yamlStr.indexOf('_id:');
      const idxName = yamlStr.indexOf('name:');
      const idxPath = yamlStr.indexOf('path:');
      expect(idxId).toBeLessThan(idxName);
      expect(idxName).toBeLessThan(idxPath);
    });

    it('translates item paths to relative file paths and vice versa', () => {
      // Content item (DEC-054 layout: Home/About/About.yml)
      const relFile = itemPathToRelativeFile('content', '/root/content/Home/About');
      expect(relFile).toBe('Home/About/About.yml');
      const roundTrip = relativeFileToItemPath('content', relFile);
      expect(roundTrip).toBe('/root/content/Home/About');

      // Layout item (DEC-054 layout: MainLayout/MainLayout.yml)
      const relLayout = itemPathToRelativeFile('layout', '/root/layout/Layouts/MainLayout');
      expect(relLayout).toBe('MainLayout/MainLayout.yml');
      const roundTripLayout = relativeFileToItemPath('layout', relLayout);
      expect(roundTripLayout).toBe('/root/layout/Layouts/MainLayout');
    });

    it('parses valid YAML and rejects dangerous aliases or tags', () => {
      const validYaml = `
_id: "507f1f77bcf86cd799439011"
name: "TestItem"
path: "/root/content/TestItem"
`;
      const parsed = parseYamlToItem(validYaml, 'test.yml');
      expect(parsed.name).toBe('TestItem');
      expect(parsed.path).toBe('/root/content/TestItem');

      // Rejects missing name
      expect(() => parseYamlToItem(`path: "/root/test"`, 'err.yml')).toThrow('Missing or invalid "name"');
    });

    it('preserves mtime when writing identical content', () => {
      const testFile = path.join(TEST_SERIALIZATION_DIR, 'test-mtime.yml');
      const content = 'name: Hello\npath: /root/content/Hello\n';

      const firstWrite = writeItemFileIfChanged(testFile, content);
      expect(firstWrite.written).toBe(true);
      expect(firstWrite.isNew).toBe(true);

      const mtime1 = fs.statSync(testFile).mtimeMs;

      // Write identical content
      const secondWrite = writeItemFileIfChanged(testFile, content);
      expect(secondWrite.written).toBe(false);
      expect(secondWrite.isNew).toBe(false);

      const mtime2 = fs.statSync(testFile).mtimeMs;
      expect(mtime1).toBe(mtime2); // Exactly preserved!
    });
  });

  describe('2. Reserialize Section & Orphan Detection', () => {
    it('reserializes template section only into Templates/', async () => {
      const res = await yamlSectionService.reserializeSection('template');
      expect(res.success).toBe(true);
      expect(res.totalItems).toBe(1);
      expect(res.created).toBe(1);

      const templateDir = resolveSectionDir('template');
      expect(fs.existsSync(path.join(templateDir, 'BlogArticle/BlogArticle.yml'))).toBe(true);
      // Content dir should not exist yet
      const contentDir = resolveSectionDir('content');
      expect(fs.existsSync(path.join(contentDir, 'Home/Home.yml'))).toBe(false);
      // Global manifest check
      expect(fs.existsSync(path.join(TEST_SERIALIZATION_DIR, 'serialization.manifest.yml'))).toBe(true);
    });

    it('detects orphan files and prunes them when pruneOrphans is enabled', async () => {
      await yamlSectionService.reserializeSection('content');
      const contentDir = resolveSectionDir('content');

      // Create a fake orphan file
      const orphanFile = path.join(contentDir, 'OrphanedOldPost.yml');
      fs.writeFileSync(orphanFile, 'name: Orphan\npath: /root/content/Orphan\n');

      // Reserialize without pruning -> reports orphan
      const checkRes = await yamlSectionService.reserializeSection('content', { pruneOrphans: false });
      expect(checkRes.orphans.length).toBe(1);
      expect(checkRes.orphans[0]).toContain('OrphanedOldPost.yml');
      expect(fs.existsSync(orphanFile)).toBe(true);

      // Reserialize with pruning -> deletes orphan
      const pruneRes = await yamlSectionService.reserializeSection('content', { pruneOrphans: true });
      expect(pruneRes.orphans.length).toBe(1);
      expect(fs.existsSync(orphanFile)).toBe(false);
    });
  });

  describe('3. Dry-Run & Sync Execution', () => {
    it('performs dry-run with hash computation and detects missing template dependencies', async () => {
      // 1. Reserialize content
      await yamlSectionService.reserializeSection('content');

      // 2. Delete template from DB to simulate missing dependency
      await Template.deleteMany({});

      // 3. Dry-run content sync
      const dryRun = await yamlSectionService.dryRunSyncSection('content', { mode: 'createOnly' });
      expect(dryRun.success).toBe(true);
      expect(dryRun.totalFiles).toBe(2);
      expect(dryRun.missingDependencies.length).toBeGreaterThan(0);
      expect(dryRun.hash).toBeTruthy();
    });

    it('rejects sync if directory files change after dry-run (hash mismatch)', async () => {
      await yamlSectionService.reserializeSection('template');
      await yamlSectionService.dryRunSyncSection('template');

      // Tamper with dryRunHash
      await expect(
        yamlSectionService.syncSection('template', {
          dryRunHash: 'invalid-fake-hash',
        })
      ).rejects.toThrow('đã bị thay đổi sau khi chạy Dry-Run');
    });

    it('rejects sync if YAML item has path escaping section roots', async () => {
      const templateDir = resolveSectionDir('template');
      ensureDirExists(templateDir);

      // Write malicious file claiming to be in /root/system
      const evilFile = path.join(templateDir, 'Evil.yml');
      fs.writeFileSync(
        evilFile,
        `name: "Evil"\npath: "/root/system/hack"\n`
      );

      await expect(
        yamlSectionService.syncSection('template', { mode: 'overwrite' })
      ).rejects.toThrow('nằm ngoài phạm vi section "template"');
    });

    it('syncs items with createOnly mode (skips existing) and overwrite mode (updates existing)', async () => {
      // Reserialize content
      await yamlSectionService.reserializeSection('content');

      // Modify Home item in DB
      await Item.updateOne(
        { path: `${branding.PATHS.CONTENT}/Home` },
        { displayName: 'Modified In DB' }
      );

      // Sync in createOnly mode -> should SKIP existing
      const resSkip = await yamlSectionService.syncSection('content', { mode: 'createOnly' });
      expect(resSkip.skipped).toBe(2);

      const itemAfterSkip = await Item.findOne({ path: `${branding.PATHS.CONTENT}/Home` });
      expect(itemAfterSkip.displayName).toBe('Modified In DB'); // Kept unchanged!

      // Sync in overwrite mode -> should OVERWRITE existing
      const resOverwrite = await yamlSectionService.syncSection('content', { mode: 'overwrite' });
      expect(resOverwrite.updated).toBe(2);

      const itemAfterOverwrite = await Item.findOne({ path: `${branding.PATHS.CONTENT}/Home` });
      expect(itemAfterOverwrite.displayName).toBe('Home Page'); // Restored from YAML!
    });
  });
});

