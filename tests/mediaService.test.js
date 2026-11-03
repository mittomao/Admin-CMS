const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Media = require('../src/models/Media');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const mediaService = require('../src/services/mediaService');
const { setStorageProvider, LocalStorageProvider } = require('../src/services/storage');

describe('GĐ 5: mediaService Unit & Integration Tests', () => {
  let mongoServer;
  let adminUser;
  let authorUser;
  let tempStorageDir;

  // 1x1 transparent PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    tempStorageDir = path.join(__dirname, 'temp_media_storage');
    const testProvider = new LocalStorageProvider(tempStorageDir);
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
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  it('1. should create or return the root media library folder', async () => {
    const root = await mediaService.getOrCreateRootFolder(adminUser._id);
    expect(root).toBeDefined();
    expect(root.path).toBe('/sitecore/media library');
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
    expect(folder.path).toBe('/sitecore/media library/banners');
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
    expect(movedB.path).toBe('/sitecore/media library/folder-a/folder-b');

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

    const check1 = await Media.findById(file1._id);
    expect(check1.isDeleted).toBe(true);
  });

  it('10. should correctly enforce canPerform permissions', () => {
    expect(mediaService.canPerform(adminUser, null, 'media:read')).toBe(true);
    expect(mediaService.canPerform(adminUser, null, 'media:delete')).toBe(true);

    // Author cannot delete media
    expect(mediaService.canPerform(authorUser, null, 'media:read')).toBe(true);
    expect(mediaService.canPerform(authorUser, null, 'media:upload')).toBe(true);
    expect(mediaService.canPerform(authorUser, null, 'media:delete')).toBe(false);
  });
});
