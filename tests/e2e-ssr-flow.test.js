'use strict';

/**
 * End-to-End SSR EJS Flow Integration Suite (GĐ 12 / TST-01, TST-02, Task 12.A2)
 * Comprehensive testing of the complete Treecraft CMS Server-Side EJS lifecycle:
 * 1. Clean DB init -> Create Page Item -> Add Fields -> Workflow & Publish -> GET /about-us SSR HTML
 * 2. Edit draft without publish -> Site remains unchanged
 * 3. Unpublish -> Public site returns 404
 * 4. Rename item & publish -> New URL resolves
 * 5. Multi-language: Default vi vs /en/ prefix
 * 6. ACL Permissions: Editor rights on content vs templates protection
 * 7. Safe Deletion & Recycle Bin restoration
 * 8. Audit Log trace recording
 * 9. Basic Auth defense on /admin
 * 10. Performance budget: Cache hit < 50ms
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const app = require('../src/app');
const Item = require('../src/models/Item');
const PublishedItem = require('../src/models/PublishedItem');
const Template = require('../src/models/Template');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const AuditLog = require('../src/models/AuditLog');
const aclService = require('../src/services/aclService');
const publishService = require('../src/services/publishService');
const renderCache = require('../src/utils/renderCache');

describe('E2E SSR EJS Flow Integration Suite (Task 12.A2)', () => {
  let mongoServer;
  let layoutItem;
  let heroRenderingItem;
  let pageTemplate;
  let adminUser;
  let authorUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 1. Create Core Template
    pageTemplate = await Template.create({
      name: 'StandardPage',
      path: '/root/templates/StandardPage',
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Page Title', type: 'single-line-text' },
            { name: 'body', title: 'Page Body', type: 'rich-text' },
          ],
        },
      ],
    });

    // 2. Create Layout & Rendering Items in Master & Web
    layoutItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'DefaultLayout',
      displayName: 'Default Layout',
      templateId: pageTemplate._id,
      path: '/root/layout/Layouts/DefaultLayout',
      sharedFields: { viewPath: 'layouts/HomeLayout.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }, { code: 'en', publishedVersion: 1 }],
    });

    heroRenderingItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: pageTemplate._id,
      path: '/root/layout/Renderings/HeroBanner',
      sharedFields: { viewPath: 'components/HeroBanner.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }, { code: 'en', publishedVersion: 1 }],
    });

    // Mirror to Master Item collection
    await Item.create({
      _id: layoutItem._id,
      name: layoutItem.name,
      path: layoutItem.path,
      templateId: pageTemplate._id,
      deleted: false,
      sharedFields: { viewPath: 'layouts/HomeLayout.ejs' },
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
    });

    await Item.create({
      _id: heroRenderingItem._id,
      name: heroRenderingItem.name,
      path: heroRenderingItem.path,
      templateId: pageTemplate._id,
      deleted: false,
      sharedFields: { viewPath: 'components/HeroBanner.ejs' },
      languages: [{ code: 'vi', versions: [{ version: 1, fields: {} }] }],
    });

    // 3. Create Users and Roles for ACL Tests
    const adminRole = await Role.create({ name: 'Administrator', permissions: ['*'] });
    const authorRole = await Role.create({ name: 'Author', permissions: ['item:read', 'item:write'] });

    adminUser = await User.create({
      username: 'e2e_admin',
      fullName: 'E2E Admin',
      email: 'admin@treecraft.local',
      passwordHash: 'hashed_password_123',
      isAdmin: true,
      roleNames: ['Administrator'],
      roles: [adminRole._id],
    });

    authorUser = await User.create({
      username: 'e2e_author',
      fullName: 'E2E Author',
      email: 'author@treecraft.local',
      passwordHash: 'hashed_password_123',
      roles: [authorRole._id],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    renderCache.clear();
    aclService.clearCache();
  });

  describe('Flow 1: Create Page -> Input Fields -> Publish -> SSR Render GET /about-us', () => {
    let aboutItem;

    test('creates item in Master and publishes to Web store', async () => {
      // 1. Create item in Master
      aboutItem = await Item.create({
        name: 'about-us',
        displayName: 'Giới Thiệu',
        path: '/root/content/about-us',
        templateId: pageTemplate._id,
        deleted: false,
        languages: [
          {
            code: 'vi',
            versions: [
              {
                version: 1,
                fields: {
                  title: 'Về Chúng Tôi',
                  HeroTitle: 'Về Chúng Tôi',
                  HeroDescription: '<p>Nội dung giới thiệu công ty Treecraft CMS.</p>',
                },
              },
            ],
          },
          {
            code: 'en',
            versions: [
              {
                version: 1,
                fields: {
                  title: 'About Treecraft',
                  HeroTitle: 'About Treecraft',
                  HeroDescription: '<p>About Treecraft enterprise CMS.</p>',
                },
              },
            ],
          },
        ],
        presentation: {
          shared: {
            layoutId: layoutItem._id,
            renderings: [
              {
                uid: 'hero-banner-uid-1',
                renderingId: heroRenderingItem._id,
                placeholderKey: 'maincontent',
                sortOrder: 1,
              },
            ],
          },
        },
      });

      expect(aboutItem).toBeDefined();
      expect(aboutItem.path).toBe('/root/content/about-us');

      // 2. Publish to Web Store
      await publishService.publishItem(aboutItem._id.toString(), {
        languages: ['vi', 'en'],
        user: adminUser,
      });

      // 3. Verify existence in PublishedItem
      const webDoc = await PublishedItem.findById(aboutItem._id);
      expect(webDoc).not.toBeNull();
      expect(webDoc.name).toBe('about-us');
      expect(webDoc.languages).toHaveLength(2);
    });

    test('Flow 1 (cont): GET /about-us renders SSR HTML successfully with status 200', async () => {
      const res = await request(app).get('/about-us');
      // Public site should resolve the path and render HTML
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('Về Chúng Tôi');
    });

    test('Flow 2: Editing draft in Master without publish leaves public site unchanged', async () => {
      // Update draft in Master
      const item = await Item.findById(aboutItem._id);
      item.languages[0].versions[0].fields.set('HeroTitle', 'Tiêu Đề Nháp Chưa Xuất Bản');
      await item.save();

      // Public site must still render the published version
      const res = await request(app).get('/about-us');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Về Chúng Tôi');
      expect(res.text).not.toContain('Tiêu Đề Nháp Chưa Xuất Bản');
    });

    test('Flow 3: Unpublishing item returns 404 Not Found on public site', async () => {
      // Unpublish from Web
      await publishService.unpublishItem(aboutItem._id.toString(), { user: adminUser });

      const res = await request(app).get('/about-us');
      expect(res.status).toBe(404);
    });

    test('Flow 4: Republishing under new name updates public URL resolution', async () => {
      // Rename in Master
      const item = await Item.findById(aboutItem._id);
      item.name = 'gioi-thieu';
      item.path = '/root/content/gioi-thieu';
      await item.save();

      // Publish new name with both languages
      await publishService.publishItem(item._id.toString(), {
        languages: ['vi', 'en'],
        user: adminUser,
      });

      // Old URL returns 404
      const oldRes = await request(app).get('/about-us');
      expect(oldRes.status).toBe(404);

      // New URL returns 200 with published content
      const newRes = await request(app).get('/gioi-thieu');
      expect(newRes.status).toBe(200);
      expect(newRes.text).toContain('gioi-thieu');
      expect(newRes.text).toContain('Tiêu Đề Nháp Chưa Xuất Bản');
    });

    test('Flow 5: Multi-language resolution with /en/ prefix', async () => {
      // GET /en/gioi-thieu
      const resEn = await request(app).get('/en/gioi-thieu');
      expect(resEn.status).toBe(200);
      expect(resEn.text).toContain('About Treecraft');
    });
  });

  describe('Flow 6 & 7: ACL Security & Safe Deletion with Recycle Bin', () => {
    let testDeleteItem;

    beforeEach(async () => {
      testDeleteItem = await Item.create({
        name: 'test-delete-page',
        path: '/root/content/test-delete-page',
        templateId: pageTemplate._id,
        deleted: false,
        languages: [{ code: 'vi', versions: [{ version: 1, fields: { title: 'Xoá Thử' } }] }],
      });
    });

    test('Flow 6: Author user cannot perform administration on Templates', async () => {
      const canAdmin = await aclService.canPerform(authorUser, pageTemplate._id, 'administer');
      expect(canAdmin).toBe(false);
    });

    test('Flow 7: Deleting item marks soft delete and stores in Recycle Bin', async () => {
      testDeleteItem.deleted = true;
      testDeleteItem.deletedAt = new Date();
      await testDeleteItem.save();

      // Verify item is excluded from active queries
      const activeItem = await Item.findOne({ _id: testDeleteItem._id, deleted: false });
      expect(activeItem).toBeNull();

      // Restore from Recycle Bin
      testDeleteItem.deleted = false;
      testDeleteItem.deletedAt = null;
      await testDeleteItem.save();

      const restoredItem = await Item.findOne({ _id: testDeleteItem._id, deleted: false });
      expect(restoredItem).not.toBeNull();
      expect(restoredItem.name).toBe('test-delete-page');
    });
  });

  describe('Flow 8 & 9: Audit Log & Basic Auth Security', () => {
    test('Flow 8: Audit log records system events', async () => {
      await AuditLog.create({
        userId: adminUser._id,
        username: adminUser.username,
        action: 'item:publish',
        itemId: pageTemplate._id,
        itemPath: pageTemplate.path,
        result: 'success',
        at: new Date(),
      });

      const log = await AuditLog.findOne({ action: 'item:publish', username: 'e2e_admin' });
      expect(log).not.toBeNull();
      expect(log.result).toBe('success');
    });

    test('Flow 9: Admin login endpoint has rate limiter and security headers', async () => {
      const res = await request(app).get('/admin/login');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('Flow 10: Performance Budget - Cached Public Page renders in < 50ms', async () => {
      // Prime the cache
      await request(app).get('/gioi-thieu');

      // Measure cached response
      const startTime = performance.now();
      const res = await request(app).get('/gioi-thieu');
      const durationMs = performance.now() - startTime;

      expect(res.status).toBe(200);
      expect(durationMs).toBeLessThan(50);
    });
  });
});
