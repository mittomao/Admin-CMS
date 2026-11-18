'use strict';

/**
 * Performance Budget & Benchmark Test Suite (GĐ 12 / PER-01, PER-02, TST-04)
 * Enforces strict performance budgets:
 * - Tree node lazy loading < 300ms for 1,000 children
 * - Public Site render cache response < 50ms
 * - Content Editor form resolution < 500ms
 * - RenderCache LRU capacity & invalidation
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const itemService = require('../src/services/itemService');
const templateService = require('../src/services/templateService');
const renderCache = require('../src/utils/renderCache');

describe('Performance Budget & Benchmark Test Suite (PER-01, PER-02, TST-04)', () => {
  let mongoServer;
  let rootItem;
  let testTemplate;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Setup base template
    testTemplate = await Template.create({
      name: 'BenchmarkPage',
      path: '/root/templates/BenchmarkPage',
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Title', type: 'single-line-text' },
            { name: 'description', title: 'Description', type: 'multi-line-text' },
          ],
        },
      ],
    });

    rootItem = await Item.create({
      name: 'BenchmarkRoot',
      path: '/root/benchmark',
      templateId: testTemplate._id,
      deleted: false,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: {
                title: 'Root Benchmark',
                description: 'Root Description',
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
  });

  describe('PER-01 & TST-04: Tree Children Query Performance Budget', () => {
    test('loads 1,000 child nodes under 300ms budget', async () => {
      // 1. Bulk insert 1,000 children
      const docs = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({
          name: `child_${i}`,
          path: `/root/benchmark/child_${i}`,
          parentId: rootItem._id,
          sortOrder: i,
          templateId: testTemplate._id,
          deleted: false,
          languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
        });
      }
      await Item.insertMany(docs);

      // 2. Measure query time
      const startTime = performance.now();
      const children = await itemService.getChildren(rootItem._id.toString(), { db: 'master' });
      const durationMs = performance.now() - startTime;

      expect(children).toHaveLength(1000);
      // Performance Budget: < 300ms
      expect(durationMs).toBeLessThan(300);
    });
  });

  describe('PER-02: Public Site RenderCache & LRU Limits', () => {
    beforeEach(() => {
      renderCache.clear();
    });

    test('cache hit responds in less than 50ms budget', () => {
      const key = renderCache.createKey('item123', 'vi', 1);
      renderCache.set(key, '<html><body>Benchmark Content</body></html>');

      const startTime = performance.now();
      const cached = renderCache.get(key);
      const durationMs = performance.now() - startTime;

      expect(cached).toBeDefined();
      expect(cached.html).toContain('Benchmark Content');
      // Performance Budget: Cache hit < 50ms (typically < 1ms)
      expect(durationMs).toBeLessThan(50);
    });

    test('enforces maxItems LRU boundary (500 items max)', () => {
      renderCache.maxItems = 500;

      // Insert 550 items into cache
      for (let i = 0; i < 550; i++) {
        const key = `site:item_${i}:vi:1`;
        renderCache.set(key, `<html><body>Content ${i}</body></html>`);
      }

      // Should not exceed 500 items
      expect(renderCache.size()).toBeLessThanOrEqual(500);

      // Oldest keys should have been evicted
      const firstKey = 'site:item_0:vi:1';
      expect(renderCache.get(firstKey)).toBeNull();

      // Newest key should be present
      const newestKey = 'site:item_549:vi:1';
      expect(renderCache.get(newestKey)).not.toBeNull();
    });

    test('invalidates cache correctly when item is updated', () => {
      const key1 = renderCache.createKey('item_target', 'vi', 1);
      const key2 = renderCache.createKey('item_target', 'en', 1);
      const keyOther = renderCache.createKey('item_other', 'vi', 1);

      renderCache.set(key1, 'html vi');
      renderCache.set(key2, 'html en');
      renderCache.set(keyOther, 'html other');

      expect(renderCache.size()).toBe(3);

      renderCache.invalidateItem('item_target');

      expect(renderCache.get(key1)).toBeNull();
      expect(renderCache.get(key2)).toBeNull();
      expect(renderCache.get(keyOther)).not.toBeNull();
    });
  });

  describe('PER-01: Content Editor Form Resolution Budget', () => {
    test('resolves template and effective fields under 500ms budget', async () => {
      const startTime = performance.now();
      const resolved = await templateService.resolveTemplate(testTemplate._id);
      const durationMs = performance.now() - startTime;

      expect(resolved).toBeDefined();
      expect(resolved.name).toBe('BenchmarkPage');
      // Performance Budget: < 500ms
      expect(durationMs).toBeLessThan(500);
    });
  });
});
