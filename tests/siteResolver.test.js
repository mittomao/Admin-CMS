const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const siteResolver = require('../src/services/siteResolver');
const PublishedItem = require('../src/models/PublishedItem');
const { NotFoundError, AppError } = require('../src/utils/errors');

describe('GĐ 10: SiteResolver Unit Tests', () => {
  let mongoServer;
  let aboutItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const dummyTplId = new mongoose.Types.ObjectId();

    // Seed minimal Web Store (items_web)
    const rootNode = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'root',
      displayName: 'root',
      templateId: dummyTplId,
      path: '/root',
      isSystem: true,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    const contentNode = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'content',
      displayName: 'Content',
      templateId: dummyTplId,
      parentId: rootNode._id,
      path: '/root/content',
      isSystem: true,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Home',
      displayName: 'Trang Chủ',
      templateId: dummyTplId,
      parentId: contentNode._id,
      path: '/root/content/Home',
      languages: [
        { code: 'vi', publishedVersion: 1 },
        { code: 'en', publishedVersion: 2 },
      ],
    });

    aboutItem = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'About us',
      displayName: 'Về chúng tôi',
      templateId: dummyTplId,
      parentId: contentNode._id,
      path: '/root/content/About us',
      languages: [
        { code: 'vi', publishedVersion: 1 },
        { code: 'en', publishedVersion: 1 },
      ],
    });

    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Team',
      displayName: 'Đội ngũ',
      templateId: dummyTplId,
      parentId: aboutItem._id,
      path: '/root/content/About us/Team',
      languages: [
        { code: 'vi', publishedVersion: 1 },
      ],
    });

    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'banner',
      displayName: 'Banner Media',
      templateId: dummyTplId,
      parentId: rootNode._id,
      path: '/root/media library/banner',
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('should resolve root "/" to Start Item (/root/content/Home) with default language vi', async () => {
    const res = await siteResolver.resolve('/');
    expect(res).toHaveProperty('item');
    expect(res.item.path).toBe('/root/content/Home');
    expect(res.lang).toBe('vi');
  });

  it('should resolve language prefix "/en" and "/en/" to Home item with lang en', async () => {
    const res = await siteResolver.resolve('/en');
    expect(res.item.path).toBe('/root/content/Home');
    expect(res.lang).toBe('en');
    expect(res.publishedVersion).toBe(2);
  });

  it('should resolve kebab-case segment "/about-us" to "/root/content/About us"', async () => {
    const res = await siteResolver.resolve('/about-us');
    expect(res.item.path).toBe('/root/content/About us');
    expect(res.lang).toBe('vi');
  });

  it('should resolve nested multi-level path "/about-us/team"', async () => {
    const res = await siteResolver.resolve('/about-us/team');
    expect(res.item.path).toBe('/root/content/About us/Team');
    expect(res.lang).toBe('vi');
  });

  it('should resolve English path with prefix "/en/about-us"', async () => {
    const res = await siteResolver.resolve('/en/about-us');
    expect(res.item.path).toBe('/root/content/About us');
    expect(res.lang).toBe('en');
  });

  it('should return 301 redirect for non-root paths ending in trailing slash', async () => {
    const res = await siteResolver.resolve('/about-us/');
    expect(res).toHaveProperty('redirect', '/about-us');
    expect(res).toHaveProperty('statusCode', 301);
  });

  it('should throw NotFoundError for non-existent page URL', async () => {
    await expect(siteResolver.resolve('/non-existent-page')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for language version not published', async () => {
    // subPageItem only has 'vi' published
    await expect(siteResolver.resolve('/en/about-us/team')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for Media Library paths (not public pages)', async () => {
    await expect(siteResolver.resolve('/root/media library/banner')).rejects.toThrow(NotFoundError);
  });

  it('should reject Directory Traversal sequences with AppError', async () => {
    await expect(siteResolver.resolve('/../etc/passwd')).rejects.toThrow(AppError);
  });
});
