const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const siteRenderer = require('../src/services/siteRenderer');
const renderCache = require('../src/utils/renderCache');
const eventBus = require('../src/utils/eventBus');
const PublishedItem = require('../src/models/PublishedItem');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const { AppError, NotFoundError } = require('../src/utils/errors');

describe('GĐ 10: SiteRenderer Unit Tests', () => {
  let mongoServer;
  let layoutItem;
  let heroRenderingItem;
  let introRenderingItem;
  let testPublishedPage;
  let testMasterPage;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const dummyTplId = new mongoose.Types.ObjectId();
    await Template.create({
      _id: dummyTplId,
      name: 'PageTemplate',
      path: '/sitecore/templates/Project/Pages/Home',
      sections: [],
    });

    // 1. Create Layout Item in Web
    layoutItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'HomeLayout',
      displayName: 'Home Layout',
      templateId: dummyTplId,
      path: '/sitecore/layout/Layouts/HomeLayout',
      sharedFields: { viewPath: 'layouts/HomeLayout.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    // 2. Create Rendering Items in Web
    heroRenderingItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: dummyTplId,
      path: '/sitecore/layout/Renderings/HeroBanner',
      sharedFields: { viewPath: 'components/HeroBanner.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    introRenderingItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Introduction',
      displayName: 'Introduction',
      templateId: dummyTplId,
      path: '/sitecore/layout/Renderings/Introduction',
      sharedFields: { viewPath: 'components/Introduction.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    // 3. Create Published Page in Web
    testPublishedPage = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Home',
      displayName: 'Trang Chủ',
      templateId: dummyTplId,
      path: '/sitecore/content/Home',
      presentation: {
        shared: {
          layoutId: layoutItem._id,
          renderings: [
            {
              uid: 'hero-uid-1',
              renderingId: heroRenderingItem._id,
              placeholderKey: 'maincontent',
              sortOrder: 100,
            },
            {
              uid: 'intro-uid-2',
              renderingId: introRenderingItem._id,
              placeholderKey: 'maincontent',
              sortOrder: 200,
            },
          ],
        },
      },
      languages: [
        {
          code: 'vi',
          publishedVersion: 1,
          fields: {
            PageTitle: 'Trang Chủ Test',
            HeroTitle: 'Tiêu Đề Hero Test',
            HeroDescription: '<p>Nội dung mô tả Hero Banner</p>',
            IntroHeading: 'Tiêu Đề Giới Thiệu Test',
            IntroBody: '<p>Nội dung phần giới thiệu</p>',
          },
        },
      ],
    });

    // 4. Create Master Page for Preview
    testMasterPage = await Item.create({
      name: 'Home',
      displayName: 'Trang Chủ Master',
      templateId: dummyTplId,
      path: '/sitecore/content/Home',
      presentation: {
        shared: {
          layoutId: layoutItem._id,
          renderings: [
            {
              uid: 'hero-uid-1',
              renderingId: heroRenderingItem._id,
              placeholderKey: 'maincontent',
              sortOrder: 100,
            },
          ],
        },
      },
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([
                ['PageTitle', 'Trang Chủ Master Preview'],
                ['HeroTitle', 'Tiêu Đề Master Preview'],
              ]),
            },
          ],
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(() => {
    renderCache.clear();
  });

  describe('1. ViewPath Security Whitelist (DEC-033)', () => {
    it('should allow valid view paths inside src/views/site', () => {
      const p1 = siteRenderer.resolveSafeViewPath('layouts/HomeLayout.ejs');
      expect(p1).toContain('src/views/site/layouts/HomeLayout.ejs');

      const p2 = siteRenderer.resolveSafeViewPath('site/layouts/HomeLayout.ejs');
      expect(p2).toContain('src/views/site/layouts/HomeLayout.ejs');
    });

    it('should reject Path Traversal with 403 Forbidden', () => {
      expect(() => {
        siteRenderer.resolveSafeViewPath('../admin/auth/login.ejs');
      }).toThrow(AppError);
    });

    it('should throw NotFoundError for non-existent view files', () => {
      expect(() => {
        siteRenderer.resolveSafeViewPath('components/NonExistentComponent.ejs');
      }).toThrow(NotFoundError);
    });
  });

  describe('2. Page Rendering & Placeholders', () => {
    it('should render layout and assigned renderings in correct order', async () => {
      const result = await siteRenderer.render(testPublishedPage, 'vi');
      expect(result).toHaveProperty('html');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('Tiêu Đề Hero Test');
      expect(result.html).toContain('Tiêu Đề Giới Thiệu Test');
      expect(result.fromCache).toBe(false);
      expect(result.etag).toBeTruthy();
    });

    it('should serve subsequent requests from in-memory cache', async () => {
      const first = await siteRenderer.render(testPublishedPage, 'vi');
      expect(first.fromCache).toBe(false);

      const second = await siteRenderer.render(testPublishedPage, 'vi');
      expect(second.fromCache).toBe(true);
      expect(second.etag).toBe(first.etag);
      expect(second.html).toBe(first.html);
    });

    it('should automatically invalidate cache on item.published Event Bus event', async () => {
      await siteRenderer.render(testPublishedPage, 'vi');
      expect(renderCache.size()).toBe(1);

      eventBus.emit('item.published', { itemId: testPublishedPage._id });
      expect(renderCache.size()).toBe(0);

      const next = await siteRenderer.render(testPublishedPage, 'vi');
      expect(next.fromCache).toBe(false);
    });
  });

  describe('3. Admin Preview Mode', () => {
    it('should render page with Preview Banner and Master data', async () => {
      const result = await siteRenderer.render(testMasterPage, 'vi', { isPreview: true });
      expect(result.html).toContain('id="sitecorePreviewBanner"');
      expect(result.html).toContain('Sitecore XM Preview Mode');
      expect(result.html).toContain('Master Store');
      expect(result.fromCache).toBe(false);
    });
  });
});
