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
  validateWindowsPath,
  itemPathToRelativeFile,
  relativeFileToItemPath,
  resolveSectionDir,
  resolveGlobalManifestPath,
} = require('../src/config/serializationPaths');

const TEST_DIR = path.join(__dirname, '../test_shortened_layout');

describe('DEC-054 Shortened Serialization Layout & Windows Path Safety Tests', () => {
  let mongoServer;
  let testTemplate;

  beforeAll(async () => {
    process.env.SERIALIZATION_DIR = 'test_shortened_layout';

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    testTemplate = await Template.create({
      name: 'ProductPage',
      displayName: 'Product Page Template',
      path: `${branding.PATHS.TEMPLATES}/ProductPage`,
      sections: [{ name: 'Details', fields: [{ name: 'sku', title: 'SKU', type: 'Single-Line Text' }] }],
    });

    await Item.create({
      _id: testTemplate._id,
      name: 'ProductPage',
      displayName: 'Product Page Template',
      path: `${branding.PATHS.TEMPLATES}/ProductPage`,
      templateId: testTemplate._id,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    delete process.env.SERIALIZATION_DIR;
  });

  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  describe('1. Windows MAX_PATH & Character Validation', () => {
    it('detects and warns when path length exceeds 240 chars', () => {
      const longPath = 'D:\\Project\\Personal\\' + 'a'.repeat(230) + '\\file.yml';
      const check = validateWindowsPath(longPath);
      expect(check.valid).toBe(true);
      expect(check.warning).toContain('tiệm cận giới hạn Windows MAX_PATH');
    });

    it('rejects path when length exceeds 260 chars', () => {
      const tooLongPath = 'D:\\Project\\Personal\\' + 'a'.repeat(250) + '\\file.yml';
      const check = validateWindowsPath(tooLongPath);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('vượt quá giới hạn Windows MAX_PATH');
    });

    it('rejects paths with forbidden Windows characters (< > : " | ? *)', () => {
      const badCharPath = path.join(TEST_DIR, 'Templates', 'Invalid<Name>', 'Item.yml');
      const check = validateWindowsPath(badCharPath);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('chứa ký tự cấm trên Windows');
    });

    it('accepts safe Windows paths with standard characters', () => {
      const safePath = path.join(TEST_DIR, 'Templates', 'Feature', 'Components', 'HeroBanner', 'HeroBanner.yml');
      const check = validateWindowsPath(safePath);
      expect(check.valid).toBe(true);
      expect(check.error).toBeUndefined();
    });
  });

  describe('2. Shortened Relative File Paths (DEC-054 Specification)', () => {
    it('maps section root item without creating redundant subfolder', () => {
      const rel = itemPathToRelativeFile('template', '/root/templates');
      expect(rel).toBe('Templates.yml');
      const back = relativeFileToItemPath('template', rel);
      expect(back).toBe('/root/templates');
    });

    it('maps deeply nested item to <relative>/<Name>.yml structure', () => {
      const itemPath = '/root/templates/Feature/Components/HeroBanner';
      const rel = itemPathToRelativeFile('template', itemPath);
      expect(rel).toBe('Feature/Components/HeroBanner/HeroBanner.yml');

      const roundTrip = relativeFileToItemPath('template', rel);
      expect(roundTrip).toBe(itemPath);
    });

    it('maps Content item with shortened relative path', () => {
      const itemPath = '/root/content/Products/Electronics/Laptop';
      const rel = itemPathToRelativeFile('content', itemPath);
      expect(rel).toBe('Products/Electronics/Laptop/Laptop.yml');

      const roundTrip = relativeFileToItemPath('content', rel);
      expect(roundTrip).toBe(itemPath);
    });
  });

  describe('3. Round-trip: Reserialize -> Clean DB -> Sync -> Reserialize Identical', () => {
    it('achieves byte-identical round-trip serialization', async () => {
      // 1. First reserialize
      await yamlSectionService.reserializeSection('template');
      const templateDir = resolveSectionDir('template');
      const generatedFile = path.join(templateDir, 'ProductPage', 'ProductPage.yml');
      expect(fs.existsSync(generatedFile)).toBe(true);
      const firstBytes = fs.readFileSync(generatedFile, 'utf8');

      // Global manifest check
      const manifestPath = resolveGlobalManifestPath();
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      expect(manifestContent).toContain('layoutVersion: 2');

      // 2. Wipe DB items
      await Item.deleteMany({});
      const beforeSyncCount = await Item.countDocuments({});
      expect(beforeSyncCount).toBe(0);

      // 3. Sync from YAML back into clean DB
      const syncRes = await yamlSectionService.syncSection('template', { mode: 'overwrite' });
      expect(syncRes.created).toBe(1);

      const restoredItem = await Item.findOne({ path: `${branding.PATHS.TEMPLATES}/ProductPage` });
      expect(restoredItem).toBeTruthy();
      expect(restoredItem.name).toBe('ProductPage');

      // 4. Second reserialize: should be 100% byte-identical
      const reserializeAgain = await yamlSectionService.reserializeSection('template');
      expect(reserializeAgain.unchanged).toBe(1);
      const secondBytes = fs.readFileSync(generatedFile, 'utf8');
      expect(secondBytes).toBe(firstBytes);
    });
  });
});
