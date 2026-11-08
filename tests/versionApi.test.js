const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const Language = require('../src/models/Language');
const { migrateVersionsAndLanguages } = require('../src/scripts/migrate-to-versions-languages');

describe('GĐ 4: Version & Language API & Partial HTML Endpoints', () => {
  let mongoServer;
  let adminAgent;
  let authorAgent;
  let anonymousAgent;
  let testItem;
  let testTemplate;
  let adminCsrfToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const authorRole = await Role.create({ name: 'Author', isSystem: true });

    const passwordHash = await User.hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
      isActive: true,
    });

    const authorHash = await User.hashPassword('author123');
    await User.create({
      username: 'author',
      email: 'author@treecraft.local',
      fullName: 'Content Author',
      passwordHash: authorHash,
      roles: [authorRole._id],
      isActive: true,
    });

    testTemplate = await Template.create({
      name: 'SampleArticle',
      displayName: 'Sample Article',
      sections: [
        {
          name: 'Main Content',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'Single-Line Text',
              shared: false,
              unversioned: false,
            },
            {
              name: 'sharedNotes',
              title: 'Shared Notes',
              type: 'Single-Line Text',
              shared: true,
              unversioned: false,
            },
          ],
        },
      ],
    });

    // Ensure default languages
    await Language.create({
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
      isDefault: true,
      active: true,
    });
    await Language.create({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      isDefault: false,
      active: true,
    });

    // Create a base item
    testItem = await Item.create({
      name: 'news-item',
      displayName: 'News Item',
      templateId: testTemplate._id,
      path: '/news-item',
      fields: { title: 'First Headline' },
    });

    // Migrate to GĐ 4 structure
    await migrateVersionsAndLanguages({ dryRun: false });

    // Setup authenticated sessions
    adminAgent = request.agent(app);
    const loginRes = await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(302);

    // Extract CSRF token for admin
    const editorPage = await adminAgent.get('/admin/content-editor');
    const match = editorPage.text.match(/name="csrf-token"\s+content="([^"]+)"/);
    adminCsrfToken = match ? match[1] : '';

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
  });

  test('GET /api/languages returns active system languages', async () => {
    const res = await adminAgent.get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((l) => l.code === 'en')).toBe(true);
    expect(res.body.data.some((l) => l.code === 'vi')).toBe(true);
  });

  test('GET /admin/content-editor/item/:id/form?lang=en&version=1 returns partial HTML with language & version controls', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/form?lang=en&version=1`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('itemEditForm');
    expect(res.text).toContain('langDropdownBtn');
    expect(res.text).toContain('versionDropdownBtn');
    expect(res.text).toContain('First Headline');
  });

  test('POST /api/items/:id/versions creates a new version', async () => {
    const res = await adminAgent
      .post(`/api/items/${testItem._id}/versions`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        lang: 'en',
        note: 'Version 2 created by API test',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(2);
  });

  test('GET /admin/content-editor/item/:id/versions returns version history partial', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/versions?lang=en`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('versionHistoryModal');
    expect(res.text).toContain('v2');
    expect(res.text).toContain('v1');
  });

  test('GET /admin/content-editor/item/:id/compare returns visual diff partial', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/compare?lang=en&v1=1&v2=2`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('compareVersionsModal');
    expect(res.text).toContain('compareSelectV1');
    expect(res.text).toContain('compareSelectV2');
  });

  test('GET /api/items/:id/compare returns diff JSON', async () => {
    const res = await adminAgent.get(`/api/items/${testItem._id}/compare?lang=en&v1=1&v2=2`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.v1).toBe(1);
    expect(res.body.data.v2).toBe(2);
    expect(Array.isArray(res.body.data.sections)).toBe(true);
  });

  test('POST /api/items/:id/languages adds a new language translation', async () => {
    const res = await adminAgent
      .post(`/api/items/${testItem._id}/languages`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        lang: 'vi',
        copyFromLang: 'en',
        note: 'Bản dịch tiếng Việt đầu tiên',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.language).toBe('vi');
    expect(res.body.data.version).toBe(1);
  });

  test('POST /api/items/:id/versions/:lang/:version/restore restores a version by creating a new version', async () => {
    const res = await adminAgent
      .post(`/api/items/${testItem._id}/versions/en/1/restore`)
      .set('X-CSRF-Token', adminCsrfToken);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(3); // created as v3
  });

  test('DELETE /api/items/:id/versions/:lang/:version deletes version', async () => {
    const res = await adminAgent
      .delete(`/api/items/${testItem._id}/versions/en/3`)
      .set('X-CSRF-Token', adminCsrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedVersion).toBe(3);
  });

  test('DELETE /api/items/:id/versions/:lang/:version blocks deleting the last remaining version', async () => {
    // English now has v1 and v2. Delete v2.
    await adminAgent
      .delete(`/api/items/${testItem._id}/versions/en/2`)
      .set('X-CSRF-Token', adminCsrfToken);

    // Now v1 is the only remaining version of 'en'. Attempting to delete must return 400.
    const res = await adminAgent
      .delete(`/api/items/${testItem._id}/versions/en/1`)
      .set('X-CSRF-Token', adminCsrfToken);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('phiên bản duy nhất còn lại');
  });

  test('Security: unauthenticated requests are redirected or rejected', async () => {
    const res = await anonymousAgent.get(`/admin/content-editor/item/${testItem._id}/form`);
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('/admin/login');

    const apiRes = await anonymousAgent.get('/api/languages');
    expect(apiRes.status).toBe(401);
  });

  test('GĐ 4.1: GET /admin/content-editor/item/:id/form defaults to vi and does NOT show missing language alert', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/form`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('data-lang="vi"');
    // Ensure the alert message is completely removed
    expect(res.text).not.toContain('chưa có nội dung!');
    expect(res.text).not.toContain('btnCreateMissingLanguageVersion');
  });
});
