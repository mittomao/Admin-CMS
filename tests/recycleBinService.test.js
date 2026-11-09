'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const branding = require('../src/config/branding');
const Item = require('../src/models/Item');
const PublishedItem = require('../src/models/PublishedItem');
const Template = require('../src/models/Template');
const User = require('../src/models/User');
const itemService = require('../src/services/itemService');
const recycleBinService = require('../src/services/recycleBinService');
const { setStorageProvider } = require('../src/services/storage');

describe('GĐ 9 — recycleBinService (DEC-044)', () => {
  let mongoServer;
  let testUser;
  let testTemplate;
  let contentFolder;
  let pageItem;
  let subItem;
  let mockStorage;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    testTemplate = await Template.create({
      name: 'TestTemplate',
      displayName: 'Test Template',
      isSystem: false,
      sections: [],
    });

    testUser = await User.create({
      username: 'editor_user',
      email: 'editor@treecraft.local',
      fullName: 'Content Editor',
      passwordHash: 'hash',
    });

    // Mock storage provider
    mockStorage = {
      deleteFile: jest.fn().mockResolvedValue(true),
      deleteResources: jest.fn().mockResolvedValue({ deleted: {} }),
    };
    setStorageProvider(mockStorage);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await PublishedItem.deleteMany({});

    contentFolder = await Item.create({
      name: 'content',
      path: branding.PATHS.CONTENT,
      parentId: null,
      templateId: testTemplate._id,
      ancestors: [],
      deleted: false,
    });

    pageItem = await Item.create({
      name: 'blog',
      displayName: 'Blog',
      path: `${branding.PATHS.CONTENT}/blog`,
      parentId: contentFolder._id,
      templateId: testTemplate._id,
      ancestors: [contentFolder._id],
      deleted: false,
    });

    subItem = await Item.create({
      name: 'post-1',
      displayName: 'Post 1',
      path: `${branding.PATHS.CONTENT}/blog/post-1`,
      parentId: pageItem._id,
      templateId: testTemplate._id,
      ancestors: [contentFolder._id, pageItem._id],
      deleted: false,
    });
  });

  test('itemService.delete thực hiện soft-delete cả nhánh và gán chung deletionBatchId', async () => {
    const res = await itemService.delete(pageItem._id, testUser._id);
    expect(res.success).toBe(true);
    expect(res.deletedCount).toBe(2);

    const checkParent = await Item.findById(pageItem._id);
    expect(checkParent.deleted).toBe(true);
    expect(checkParent.isDeleted).toBe(true);
    expect(checkParent.deletedAt).toBeInstanceOf(Date);
    expect(checkParent.deletedBy.toString()).toBe(testUser._id.toString());
    expect(checkParent.deletionBatchId).toBeTruthy();

    const checkChild = await Item.findById(subItem._id);
    expect(checkChild.deleted).toBe(true);
    expect(checkChild.deletionBatchId).toBe(checkParent.deletionBatchId);
  });

  test('recycleBinService.list phân trang và tìm kiếm theo q', async () => {
    await itemService.delete(pageItem._id, testUser._id);

    const listAll = await recycleBinService.list({ page: 1, limit: 10 });
    expect(listAll.total).toBe(2);
    expect(listAll.items.length).toBe(2);

    const listSearch = await recycleBinService.list({ q: 'post-1' });
    expect(listSearch.total).toBe(1);
    expect(listSearch.items[0].name).toBe('post-1');
  });

  test('recycleBinService.restore khôi phục đúng vị trí cũ khi cha còn sống', async () => {
    await itemService.delete(subItem._id, testUser._id);

    const restoreRes = await recycleBinService.restore(subItem._id, { user: testUser });
    expect(restoreRes.success).toBe(true);

    const restored = await Item.findById(subItem._id);
    expect(restored.deleted).toBe(false);
    expect(restored.deletedAt).toBeNull();
    expect(restored.path).toBe(`${branding.PATHS.CONTENT}/blog/post-1`);
  });

  test('recycleBinService.restore tự động đổi tên hậu tố khi xảy ra va chạm tên trùng', async () => {
    await itemService.delete(subItem._id, testUser._id);

    // Tạo một item mới cùng tên 'post-1' dưới blog
    await Item.create({
      name: 'post-1',
      path: `${branding.PATHS.CONTENT}/blog/post-1`,
      parentId: pageItem._id,
      templateId: testTemplate._id,
      deleted: false,
    });

    const restoreRes = await recycleBinService.restore(subItem._id, {
      user: testUser,
      renameIfDuplicate: true,
    });
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredItem.name).toBe('post-1 (Restored)');
  });

  test('recycleBinService.purge xóa vĩnh viễn khỏi MongoDB, Web Store và dọn dẹp Cloudinary', async () => {
    // Thêm một item media vào thùng rác
    const mediaItem = await Item.create({
      name: 'banner.jpg',
      path: `${branding.PATHS.MEDIA}/banner.jpg`,
      parentId: contentFolder._id,
      templateId: testTemplate._id,
      deleted: true,
      isDeleted: true,
      deletedAt: new Date(),
      sharedFields: { publicId: 'samples/banner_123' },
    });

    // Xuất bản trên web
    await PublishedItem.create({
      _id: mediaItem._id,
      name: mediaItem.name,
      path: mediaItem.path,
      templateId: testTemplate._id,
      isDeleted: false,
    });

    const purgeRes = await recycleBinService.purge(mediaItem._id, { user: testUser });
    expect(purgeRes.success).toBe(true);

    // Không còn trong Item
    const checkDb = await Item.findById(mediaItem._id);
    expect(checkDb).toBeNull();

    // Không còn trong Web Store
    const checkWeb = await PublishedItem.findById(mediaItem._id);
    expect(checkWeb).toBeNull();

    // Đã gọi storageProvider.deleteFile dọn Cloudinary
    expect(mockStorage.deleteFile).toHaveBeenCalledWith(null, null, 'samples/banner_123');
  });
});
