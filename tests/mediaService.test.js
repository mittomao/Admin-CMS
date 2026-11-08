const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Item = require('../src/models/Item');
const mediaService = require('../src/services/mediaService');
const { ensureMediaTemplates, MEDIA_TEMPLATES } = require('../src/services/mediaTemplateService');
const { setStorageProvider } = require('../src/services/storage');

class MockCloudinaryProvider {
  constructor() {
    this.cloudName = 'test-cloud';
    this.folder = 'TestCMS';
  }
  async saveFile({ buffer, originalName, _mimeType = '', folder = null }) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const publicId = `${folder ? folder + '/' : ''}${Date.now()}_${originalName.replace(/\.[^/.]+$/, '')}`;
    const secureUrl = `https://res.cloudinary.com/test-cloud/image/upload/${publicId}.png`;
    return {
      storagePath: secureUrl,
      fileSize: buffer.length,
      checksum: hash,
      provider: 'cloudinary',
      publicId,
      secureUrl,
      thumbnailUrl: `https://res.cloudinary.com/test-cloud/image/upload/c_fill,h_300,w_300/${publicId}.webp`,
      dimensions: { width: 1, height: 1, format: 'png' }
    };
  }
  async generateThumbnail(publicId) {
    return `https://res.cloudinary.com/test-cloud/image/upload/c_fill,h_300,w_300/${publicId}.webp`;
  }
  async getImageMetadata(_publicId) {
    return { width: 1, height: 1, format: 'png' };
  }
  getReadStream() {
    const { PassThrough } = require('stream');
    const pt = new PassThrough();
    process.nextTick(() => pt.end(Buffer.from('fake-bytes')));
    return pt;
  }
  async deleteFile() {
    return { result: 'ok' };
  }
  async deleteResources(publicIds) {
    const del = {};
    for (const id of publicIds) del[id] = 'deleted';
    return { deleted: del };
  }
  async getAllFolders() {
    return [{ name: 'TestCMS', path: 'TestCMS' }];
  }
  async getSubFolders() {
    return [];
  }
  async createFolder(folderPath) {
    return { success: true, path: folderPath };
  }
  async deleteFolder(folderPath) {
    return { success: true, path: folderPath };
  }
  async getMediaAssets() {
    return { assets: [], total_count: 0 };
  }
}

describe('GĐ 5: mediaService Unit & Integration Tests', () => {
  let mongoServer;
  let adminUser;
  let authorUser;

  // 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const testProvider = new MockCloudinaryProvider();
    setStorageProvider(testProvider);

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const authorRole = await Role.create({ name: 'Author', isSystem: true });

    adminUser = await User.create({
      username: 'media_admin',
      email: 'admin@media.local',
      fullName: 'Media Admin',
      passwordHash: 'dummy',
      roles: [adminRole._id]
    });
    adminUser.roles = [adminRole];

    authorUser = await User.create({
      username: 'media_author',
      email: 'author@media.local',
      fullName: 'Media Author',
      passwordHash: 'dummy',
      roles: [authorRole._id]
    });
    authorUser.roles = [authorRole];
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('1. should create or return the root media library folder', async () => {
    const root = await mediaService.getOrCreateRootFolder(adminUser._id);
    expect(root).toBeDefined();
    expect(root.path).toBe('/root/media library');
    expect(root.isFolder).toBe(true);

    const sameRoot = await mediaService.getOrCreateRootFolder(adminUser._id);
    expect(sameRoot._id.toString()).toBe(root._id.toString());
  });

  it('2. should create a subfolder and prevent duplicate folder names in the same parent', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const folder = await mediaService.createFolder({
      name: 'Banners',
      displayName: 'Website Banners',
      parentId: root._id,
      userId: adminUser._id
    });

    expect(folder).toBeDefined();
    expect(folder.name).toBe('banners');
    expect(folder.path).toBe('/root/media library/banners');
    expect(folder.ancestors).toHaveLength(1);
    expect(folder.ancestors[0].toString()).toBe(root._id.toString());

    // Duplicate creation should throw 409
    await expect(
      mediaService.createFolder({
        name: 'Banners',
        parentId: root._id,
        userId: adminUser._id
      })
    ).rejects.toThrow('đã tồn tại');
  });

  it('3. should upload a file, compute checksum, read dimensions and generate thumbnail', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const mockFile = {
      buffer: samplePngBuffer,
      originalname: 'pixel.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const mediaDoc = await mediaService.uploadFile({
      file: mockFile,
      folderId: root._id,
      userId: adminUser._id
    });

    expect(mediaDoc).toBeDefined();
    expect(mediaDoc.isFolder).toBe(false);
    expect(mediaDoc.fileDetails).toBeDefined();
    expect(mediaDoc.fileDetails.mimeType).toBe('image/png');
    expect(mediaDoc.fileDetails.fileSize).toBe(samplePngBuffer.length);
    expect(mediaDoc.fileDetails.checksum).toBeDefined();
    expect(mediaDoc.fileDetails.dimensions.width).toBe(1);
    expect(mediaDoc.fileDetails.dimensions.height).toBe(1);
    expect(mediaDoc.fileDetails.thumbnailPath).toBeDefined();
  });

  it('4. should detect duplicate files using checksum', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const mockFile = {
      buffer: samplePngBuffer,
      originalname: 'pixel_dup.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const doc2 = await mediaService.uploadFile({
      file: mockFile,
      folderId: root._id,
      userId: adminUser._id
    });

    const duplicates = await mediaService.findDuplicates(doc2.fileDetails.checksum);
    expect(duplicates.length).toBeGreaterThanOrEqual(2);
  });

  it('5. should replace file content while preserving original document ID', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const originalFile = {
      buffer: samplePngBuffer,
      originalname: 'initial.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const initialDoc = await mediaService.uploadFile({
      file: originalFile,
      folderId: root._id,
      userId: adminUser._id
    });

    // Replace with same buffer
    const replacementFile = {
      buffer: samplePngBuffer,
      originalname: 'replaced.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const replacedDoc = await mediaService.replaceFile(initialDoc._id, {
      file: replacementFile,
      userId: adminUser._id
    });

    expect(replacedDoc._id.toString()).toBe(initialDoc._id.toString());
    expect(replacedDoc.fileDetails.originalName).toBe('replaced.png');
  });

  it('5b. should upload file to an empty media item created from template in Content Editor', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const templates = await ensureMediaTemplates();
    const imageTpl = templates[MEDIA_TEMPLATES.IMAGE];

    // Create an empty item like in Content Editor "Insert Item"
    const emptyItem = await Item.create({
      name: 'contact-banner',
      displayName: 'contact-banner',
      templateId: imageTpl._id,
      parentId: root._id,
      ancestors: [...(root.ancestors || []), root._id],
      path: `${root.path}/contact-banner`,
      fields: {},
      sharedFields: {},
      languages: [
        {
          code: 'vi',
          unversionedFields: {},
          versions: [{ version: 1, fields: { title: 'contact-banner' } }]
        }
      ]
    });

    const fileToUpload = {
      buffer: samplePngBuffer,
      originalname: 'banner-uploaded.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const uploadedDoc = await mediaService.replaceFile(emptyItem._id, {
      file: fileToUpload,
      userId: adminUser._id
    });

    expect(uploadedDoc._id.toString()).toBe(emptyItem._id.toString());
    expect(uploadedDoc.fileDetails.originalName).toBe('banner-uploaded.png');
    expect(uploadedDoc.fileDetails.secureUrl).toBeTruthy();
  });

  it('6. should update multilingual altText, title and description', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const file = {
      buffer: samplePngBuffer,
      originalname: 'hero.png',
      detectedMime: 'image/png',
      detectedExt: 'png'
    };

    const doc = await mediaService.uploadFile({
      file,
      folderId: root._id,
      userId: adminUser._id
    });

    const updated = await mediaService.updateMetadata(doc._id, {
      displayName: 'Hero Banner Updated',
      title: 'Hero Title',
      description: 'Hero Description',
      altText: {
        en: 'Corporate hero banner',
        vi: 'Biển quảng cáo tập đoàn'
      },
      userId: adminUser._id
    });

    expect(updated.displayName).toBe('Hero Banner Updated');
    expect(updated.title).toBe('Hero Title');
    expect(updated.altText.get('en')).toBe('Corporate hero banner');
    expect(updated.altText.get('vi')).toBe('Biển quảng cáo tập đoàn');
  });

  it('7. should move folder with cycle detection and update paths recursively', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const folderA = await mediaService.createFolder({
      name: 'Folder-A',
      parentId: root._id,
      userId: adminUser._id
    });

    const folderB = await mediaService.createFolder({
      name: 'Folder-B',
      parentId: root._id,
      userId: adminUser._id
    });

    // Move Folder B into Folder A
    const movedB = await mediaService.moveMedia(folderB._id, folderA._id, adminUser._id);
    expect(movedB.parentId.toString()).toBe(folderA._id.toString());
    expect(movedB.path).toBe('/root/media library/folder-a/folder-b');

    // Cycle detection: Cannot move Folder A into its child Folder B
    await expect(mediaService.moveMedia(folderA._id, folderB._id, adminUser._id)).rejects.toThrow(
      'Không thể di chuyển một thư mục vào thư mục con của nó'
    );
  });

  it('8. should prevent deleting the root folder or a folder with existing children', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    await expect(mediaService.deleteMedia(root._id, adminUser._id)).rejects.toThrow(
      'Không được phép xóa thư mục gốc'
    );

    const parentFolder = await mediaService.createFolder({
      name: 'Parent-With-Child',
      parentId: root._id,
      userId: adminUser._id
    });

    await mediaService.createFolder({
      name: 'Child-Folder',
      parentId: parentFolder._id,
      userId: adminUser._id
    });

    // Cannot delete parent while child exists
    await expect(mediaService.deleteMedia(parentFolder._id, adminUser._id)).rejects.toThrow(
      'vẫn còn chứa'
    );
  });

  it('9. should perform bulk delete on multiple media items', async () => {
    const root = await mediaService.getOrCreateRootFolder();
    const file1 = await mediaService.uploadFile({
      file: { buffer: samplePngBuffer, originalname: 'b1.png', detectedMime: 'image/png' },
      folderId: root._id,
      userId: adminUser._id
    });

    const file2 = await mediaService.uploadFile({
      file: { buffer: samplePngBuffer, originalname: 'b2.png', detectedMime: 'image/png' },
      folderId: root._id,
      userId: adminUser._id
    });

    const result = await mediaService.bulkDelete([file1._id, file2._id], adminUser._id);
    expect(result.deleted).toBe(2);

    const Item = require('../src/models/Item');
    const check1 = await Item.findById(file1._id);
    expect(check1.deleted).toBe(true);
  });

  it('10. should correctly enforce canPerform permissions', () => {
    expect(mediaService.canPerform(adminUser, null, 'media:read')).toBe(true);
    expect(mediaService.canPerform(adminUser, null, 'media:delete')).toBe(true);

    // Author cannot delete media
    expect(mediaService.canPerform(authorUser, null, 'media:read')).toBe(true);
    expect(mediaService.canPerform(authorUser, null, 'media:upload')).toBe(true);
    expect(mediaService.canPerform(authorUser, null, 'media:delete')).toBe(false);
  });

  it('11. should query usage of media in content items without $regex error on Map fields', async () => {
    const Item = require('../src/models/Item');
    const mediaId = new mongoose.Types.ObjectId();

    await Item.create({
      name: 'home-page',
      path: '/root/content/home-page',
      templateId: new mongoose.Types.ObjectId(),
      fields: {
        heroImage: mediaId.toString(),
        description: `<p><img src="/media/file/${mediaId.toString()}"></p>`
      }
    });

    const usage = await mediaService.getUsage(mediaId);
    expect(usage).toBeDefined();
    expect(Array.isArray(usage)).toBe(true);
    expect(usage.length).toBe(1);
    expect(usage[0].name).toBe('home-page');
  });
});
