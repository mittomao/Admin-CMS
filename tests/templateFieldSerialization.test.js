'use strict';

/**
 * Treecraft CMS - Template Field Definition Serialization Tests (DEC-055 / Phase 11-Y3)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const branding = require('../src/config/branding');
const templateService = require('../src/services/templateService');
const yamlSectionService = require('../src/services/yamlSectionService');
const {
  serializeItemToYaml,
  parseYamlToItem,
} = require('../src/services/yamlItemSerializer');

const TEST_SERIALIZE_DIR = path.join(__dirname, '../test_serialization_fields');

describe('DEC-055 Template Field Definition YAML Serialization & Sync Tests', () => {
  let mongoServer;
  let sampleTemplate;
  let testItem;

  beforeAll(async () => {
    process.env.SERIALIZATION_DIR = 'test_serialization_fields';

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // Create a base template with fields
    sampleTemplate = await Template.create({
      name: 'HeroBannerTest',
      displayName: 'Hero Banner Test',
      path: `${branding.PATHS.TEMPLATES}/HeroBannerTest`,
      description: 'Template for hero test',
      sections: [
        {
          _id: new mongoose.Types.ObjectId('6aeaccf2b200083aee587087'),
          name: 'Hero Data',
          sortOrder: 10,
          fields: [
            {
              _id: new mongoose.Types.ObjectId('6aeaccf2b200083aee587088'),
              name: 'HeroTitle',
              title: 'Hero Title',
              type: 'Single-Line Text',
              required: true,
              defaultValue: 'Default Title',
              sortOrder: 10,
            },
            {
              _id: new mongoose.Types.ObjectId('6aeaccf2b200083aee587089'),
              name: 'HeroDescription',
              title: 'Hero Description',
              type: 'Rich Text',
              required: false,
              sortOrder: 20,
            },
          ],
        },
      ],
      standardValues: new Map([
        ['6aeaccf2b200083aee587088', 'Default Title'],
      ]),
    });

    // Create corresponding template node in Item
    await Item.create({
      _id: sampleTemplate._id,
      name: 'HeroBannerTest',
      displayName: 'Hero Banner Test',
      path: `${branding.PATHS.TEMPLATES}/HeroBannerTest`,
      templateId: sampleTemplate._id,
    });

    // Create a content item using this template
    testItem = await Item.create({
      name: 'TestHeroContent',
      displayName: 'Test Hero Content',
      path: `${branding.PATHS.ROOT}/content/TestHeroContent`,
      templateId: sampleTemplate._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: {
                '6aeaccf2b200083aee587088': 'My Custom Hero Title',
                '6aeaccf2b200083aee587089': '<p>Some description</p>',
              },
            },
          ],
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(TEST_SERIALIZE_DIR)) {
      fs.rmSync(TEST_SERIALIZE_DIR, { recursive: true, force: true });
    }
    delete process.env.SERIALIZATION_DIR;
  });

  describe('1. Schema Coverage & Deterministic Output', () => {
    test('should serialize all field attributes defined in Template model schema', () => {
      const templateItem = {
        _id: sampleTemplate._id,
        name: sampleTemplate.name,
        path: sampleTemplate.path,
      };

      const refMaps = {
        templateMap: new Map([[sampleTemplate._id.toString(), sampleTemplate]]),
        templateSchemaMap: new Map([[sampleTemplate._id.toString(), sampleTemplate.toObject()]]),
      };

      const yamlStr = serializeItemToYaml(templateItem, refMaps);
      expect(yamlStr).toContain('HeroTitle');
      expect(yamlStr).toContain('singleLineText');
      expect(yamlStr).toContain('HeroDescription');
      expect(yamlStr).toContain('richText');
      expect(yamlStr).toContain('sortOrder');
      expect(yamlStr).toContain('required');
      expect(yamlStr).toContain('defaultValue');

      // Verify all key properties of fieldSchema exist in output
      const expectedFieldKeys = ['id', 'name', 'title', 'type', 'required', 'defaultValue', 'shared', 'unversioned', 'sortOrder'];
      for (const key of expectedFieldKeys) {
        expect(yamlStr).toContain(`${key}:`);
      }
    });

    test('should sort sections and fields deterministically by sortOrder then ID', () => {
      const schemaData = {
        name: 'DeterministicTest',
        path: '/root/templates/DeterministicTest',
        sections: [
          {
            id: 'sec-2',
            name: 'Section B',
            sortOrder: 50,
            fields: [
              { id: 'f-2', name: 'FieldB2', type: 'Single-Line Text', sortOrder: 20 },
              { id: 'f-1', name: 'FieldB1', type: 'Single-Line Text', sortOrder: 10 },
            ],
          },
          {
            id: 'sec-1',
            name: 'Section A',
            sortOrder: 10,
            fields: [
              { id: 'f-4', name: 'FieldA2', type: 'Single-Line Text', sortOrder: 5 },
              { id: 'f-3', name: 'FieldA1', type: 'Single-Line Text', sortOrder: 5 },
            ],
          },
        ],
      };

      const yamlStr = serializeItemToYaml(schemaData, {
        templateSchemaMap: new Map([['DeterministicTest', schemaData]]),
      });

      // Section A (sortOrder 10) must appear before Section B (sortOrder 50)
      const secAIndex = yamlStr.indexOf('Section A');
      const secBIndex = yamlStr.indexOf('Section B');
      expect(secAIndex).toBeGreaterThan(-1);
      expect(secBIndex).toBeGreaterThan(-1);
      expect(secAIndex).toBeLessThan(secBIndex);

      // In Section B: FieldB1 (sortOrder 10) must appear before FieldB2 (sortOrder 20)
      const f1Index = yamlStr.indexOf('FieldB1');
      const f2Index = yamlStr.indexOf('FieldB2');
      expect(f1Index).toBeLessThan(f2Index);
    });

    test('round-trip byte determinism: serialize -> parse -> serialize produces identical YAML', () => {
      const templateItem = {
        _id: sampleTemplate._id,
        name: sampleTemplate.name,
        path: sampleTemplate.path,
      };

      const refMaps = {
        templateMap: new Map([[sampleTemplate._id.toString(), sampleTemplate]]),
        templateSchemaMap: new Map([[sampleTemplate._id.toString(), sampleTemplate.toObject()]]),
      };

      const yaml1 = serializeItemToYaml(templateItem, refMaps);
      const parsed = parseYamlToItem(yaml1, 'test.yml');
      const yaml2 = serializeItemToYaml(parsed, {
        templateMap: refMaps.templateMap,
        templateSchemaMap: new Map([[parsed._id || parsed.name, parsed]]),
      });

      expect(yaml1).toBe(yaml2);
    });
  });

  describe('2. Field Type Validation & Reporting', () => {
    test('should reject invalid field type with file and line number in error message', () => {
      const invalidYaml = `
name: BrokenTemplate
path: /root/templates/BrokenTemplate
sections:
  - id: sec-1
    name: Main
    sortOrder: 10
    fields:
      - id: f-1
        name: BadField
        type: completelyUnknownType_xyz
        sortOrder: 10
`;
      expect(() => {
        parseYamlToItem(invalidYaml, 'BrokenTemplate.yml');
      }).toThrow(/\[Field Error\] Kiểu trường "completelyUnknownType_xyz" không tồn tại trong Field Registry/);
    });
  });

  describe('3. Sync & Safe Field Deletion', () => {
    test('should preserve missing fields in DB by default when deleteMissingFields is false', async () => {
      // Prepare YAML without HeroDescription
      const partialYaml = `
_id: ${sampleTemplate._id}
name: HeroBannerTest
path: /root/templates/HeroBannerTest
sections:
  - id: 6aeaccf2b200083aee587087
    name: Hero Data
    sortOrder: 10
    fields:
      - id: 6aeaccf2b200083aee587088
        name: HeroTitle
        title: Hero Title
        type: singleLineText
        sortOrder: 10
`;
      const templateDir = path.join(TEST_SERIALIZE_DIR, 'Templates');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, 'HeroBannerTest.yml'), partialYaml, 'utf8');

      // Dry run with deleteMissingFields: false
      const dryRes = await yamlSectionService.dryRunSyncSection('template', {
        deleteMissingFields: false,
      });

      expect(dryRes.success).toBe(true);
      const keepDiff = dryRes.fieldDiffs.find((d) => d.fieldName === 'HeroDescription');
      expect(keepDiff).toBeDefined();
      expect(keepDiff.action).toBe('keep_missing');
      expect(keepDiff.usageCount).toBe(1); // testItem has content for it!

      // Sync with deleteMissingFields: false
      await yamlSectionService.syncSection('template', {
        deleteMissingFields: false,
      });

      const updatedTpl = await Template.findById(sampleTemplate._id).lean();
      const fields = updatedTpl.sections[0].fields;
      expect(fields.length).toBe(2);
      expect(fields.some((f) => f.name === 'HeroDescription')).toBe(true);
    });

    test('should delete field from template schema when deleteMissingFields is true, but NEVER delete content item data', async () => {
      // Sync with deleteMissingFields: true
      await yamlSectionService.syncSection('template', {
        deleteMissingFields: true,
      });

      // Verify schema has removed HeroDescription
      const updatedTpl = await Template.findById(sampleTemplate._id).lean();
      const fields = updatedTpl.sections[0].fields;
      expect(fields.length).toBe(1);
      expect(fields.some((f) => f.name === 'HeroDescription')).toBe(false);

      // Verify Item in items_master STILL has the data untouched (Safe Schema principle)
      const contentItem = await Item.findById(testItem._id).lean();
      const viFields = contentItem.languages[0].versions[0].fields;
      expect(viFields['6aeaccf2b200083aee587089']).toBe('<p>Some description</p>');
    });
  });

  describe('4. Incompatible Type Transitions', () => {
    test('should block incompatible field type change when items already contain data', async () => {
      // HeroTitle has type Single-Line Text and testItem has data for it.
      // Changing Single-Line Text to Checkbox is NOT in COMPATIBLE_TYPE_TRANSITIONS.
      const incompatibleYaml = `
_id: ${sampleTemplate._id}
name: HeroBannerTest
path: /root/templates/HeroBannerTest
sections:
  - id: 6aeaccf2b200083aee587087
    name: Hero Data
    sortOrder: 10
    fields:
      - id: 6aeaccf2b200083aee587088
        name: HeroTitle
        title: Hero Title
        type: checkbox
        sortOrder: 10
`;
      const templateDir = path.join(TEST_SERIALIZE_DIR, 'Templates');
      fs.writeFileSync(path.join(templateDir, 'HeroBannerTest.yml'), incompatibleYaml, 'utf8');

      // Dry run should detect incompatible transition and flag error
      const dryRes = await yamlSectionService.dryRunSyncSection('template');
      expect(dryRes.success).toBe(false);
      expect(dryRes.errors.length).toBeGreaterThan(0);
      expect(dryRes.errors[0].error).toContain('không tương thích');
      expect(dryRes.errors[0].error).toContain('1 item có dữ liệu');

      // Attempting to sync must throw
      await expect(yamlSectionService.syncSection('template')).rejects.toThrow(/không tương thích/);
    });
  });

  describe('5. Cache Invalidation & Diff Inspection', () => {
    test('should invalidate templateService cache on sync', async () => {
      const spy = jest.spyOn(templateService, 'invalidateCache');

      // Put back valid YAML
      const validYaml = `
_id: ${sampleTemplate._id}
name: HeroBannerTest
path: /root/templates/HeroBannerTest
sections:
  - id: 6aeaccf2b200083aee587087
    name: Hero Data
    sortOrder: 10
    fields:
      - id: 6aeaccf2b200083aee587088
        name: HeroTitle
        title: Hero Title
        type: singleLineText
        sortOrder: 10
`;
      const templateDir = path.join(TEST_SERIALIZE_DIR, 'Templates');
      fs.writeFileSync(path.join(templateDir, 'HeroBannerTest.yml'), validYaml, 'utf8');

      await yamlSectionService.syncSection('template');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('getFieldDiff should return diff metadata cleanly', async () => {
      const diffRes = await yamlSectionService.getFieldDiff('template');
      expect(diffRes).toBeDefined();
      expect(Array.isArray(diffRes.fieldDiffs)).toBe(true);
      expect(diffRes.totalFiles).toBe(1);
    });
  });
});

