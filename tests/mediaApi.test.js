const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const { setStorageProvider, LocalStorageProvider } = require('../src/services/storage');

describe('GĐ 5: Media Library & File Serving API Endpoints', () => {
  let mongoServer;
  let adminAgent;
  let authorAgent;
  let anonymousAgent;
  let adminCsrfToken;
  let tempStorageDir;

  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    tempStorageDir = path.join(__dirname, 'temp_media_api_storage');
    const testProvider = new LocalStorageProvider(tempStorageDir);
    setStorageProvider(testProvider);

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const authorRole = await Role.create({ name: 'Author', isSystem: true });

    const passwordHash = await User.hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@sitecore.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
      isActive: true
    });

    const authorHash = await User.hashPassword('author123');
    await User.create({
      username: 'author',
      email: 'author@sitecore.local',
      fullName: 'Content Author',
      passwordHash: authorHash,
      roles: [authorRole._id],
      isActive: true
    });

    // Authenticate admin
    adminAgent = request.agent(app);
    const loginRes = await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(302);

    // Extract CSRF token
    const editorPage = await adminAgent.get('/admin/content-editor');
    const match = editorPage.text.match(/name="csrf-token"\s+content="([^"]+)"/);
    adminCsrfToken = match ? match[1] : '';

    // Authenticate author
    authorAgent = request.agent(app);
    await authorAgent
      .post('/admin/login')
      .send({ username: 'author', password: 'author123' });

    anonymousAgent = request.agent(app);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  test('1. GET /admin/media-library requires authentication', async () => {
    const unauthRes = await anonymousAgent.get('/admin/media-library');
    expect(unauthRes.status).toBe(302);
    expect(unauthRes.header.location).toContain('/admin/login');

    const authRes = await adminAgent.get('/admin/media-library');
    expect(authRes.status).toBe(200);
    expect(authRes.text).toContain('Media Library');
  });

  test('2. GET /admin/media/picker returns modal HTML partial', async () => {
    const res = await adminAgent.get('/admin/media/picker');
    expect(res.status).toBe(200);
    expect(res.text).toContain('media-picker-modal');
  });

  test('3. POST /api/media/upload uploads file and returns metadata and location', async () => {
    const res = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', samplePngBuffer, 'banner.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.location).toBeDefined();

    const uploadedId = res.body.files[0]._id;

    // 4. GET /media/file/:id streams the uploaded file publicly
    const streamRes = await anonymousAgent.get(`/media/file/${uploadedId}`);
    expect(streamRes.status).toBe(200);
    expect(streamRes.header['content-type']).toBe('image/png');
    expect(streamRes.header['etag']).toBeDefined();

    // 5. Caching: If-None-Match header returns 304 Not Modified
    const etag = streamRes.header['etag'];
    const cachedRes = await anonymousAgent
      .get(`/media/file/${uploadedId}`)
      .set('If-None-Match', etag);
    expect(cachedRes.status).toBe(304);
  });

  test('6. POST /api/media/upload blocks files with fake extensions (Magic Bytes check)', async () => {
    const fakeBuffer = Buffer.from('<?php echo "fake php script inside png"; ?>', 'utf8');

    const res = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', fakeBuffer, 'malicious.png');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('không thuộc định dạng được hỗ trợ');
  });

  test('7. POST /api/media/folders creates a new folder, and GET lists it', async () => {
    const createRes = await adminAgent
      .post('/api/media/folders')
      .set('CSRF-Token', adminCsrfToken)
      .send({ name: 'Campaign-2026', displayName: 'Campaign 2026' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.folder.path).toBe('/sitecore/media library/campaign-2026');

    const listRes = await adminAgent.get('/api/media/folders');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const hasFolder = listRes.body.folders.some((f) => f.name === 'campaign-2026');
    expect(hasFolder).toBe(true);
  });

  test('8. PUT /api/media/:id updates metadata', async () => {
    // First upload an asset
    const uploadRes = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', samplePngBuffer, 'icon.png');

    const mediaId = uploadRes.body.files[0]._id;

    const updateRes = await adminAgent
      .put(`/api/media/${mediaId}`)
      .set('CSRF-Token', adminCsrfToken)
      .send({
        displayName: 'App Icon',
        altText: { en: 'App Icon English', vi: 'Biểu tượng ứng dụng' }
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.media.displayName).toBe('App Icon');
  });

  test('9. DELETE /api/media/:id soft-deletes media item', async () => {
    const uploadRes = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', samplePngBuffer, 'delete-me.png');

    const mediaId = uploadRes.body.files[0]._id;

    const deleteRes = await adminAgent
      .delete(`/api/media/${mediaId}`)
      .set('CSRF-Token', adminCsrfToken);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify it is no longer listed in active assets
    const listRes = await adminAgent.get('/api/media/assets');
    const exists = listRes.body.assets.some((a) => a._id === mediaId);
    expect(exists).toBe(false);
  });

  test('10. POST /api/media/bulk-delete deletes multiple items', async () => {
    const up1 = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', samplePngBuffer, 'bulk1.png');

    const up2 = await adminAgent
      .post('/api/media/upload')
      .set('CSRF-Token', adminCsrfToken)
      .attach('files', samplePngBuffer, 'bulk2.png');

    const ids = [up1.body.files[0]._id, up2.body.files[0]._id];

    const bulkRes = await adminAgent
      .post('/api/media/bulk-delete')
      .set('CSRF-Token', adminCsrfToken)
      .send({ mediaIds: ids });

    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body.success).toBe(true);
    expect(bulkRes.body.deleted).toBe(2);
  });
});

