const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const Language = require('../src/models/Language');
const { seedPresentationData } = require('../src/scripts/seed-presentation-data');

describe('GĐ 6: Presentation API & Endpoints (Server-Side EJS)', () => {
  let mongoServer;
  let adminAgent;
  let anonymousAgent;
  let testItem;
  let testTemplate;
  let seedResult;
  let adminCsrfToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });

    const passwordHash = await User.hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
      isActive: true,
    });

    // Ensure default languages
    await Language.create({ code: 'vi', name: 'Vietnamese', isDefault: true, active: true });
    await Language.create({ code: 'en', name: 'English', isDefault: false, active: true });

    // Seed root folder
    const folderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      sections: [],
    });

    await Item.create({
      name: 'root',
      displayName: 'root',
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/root',
    });

    seedResult = await seedPresentationData();

    // Create a page template with standard presentation
    testTemplate = await Template.create({
      name: 'LandingPage',
      displayName: 'Landing Page',
      sections: [],
      presentation: {
        layoutId: seedResult.homeLayout._id,
        renderings: [
          {
            uid: 'std-landing-hero',
            renderingId: seedResult.heroBannerRendering._id,
            placeholder: 'maincontent',
            placeholderKey: 'maincontent',
            sortOrder: 100,
            parameters: { theme: 'dark' },
          },
        ],
      },
    });

    testItem = await Item.create({
      name: 'product-page',
      displayName: 'Product Page',
      templateId: testTemplate._id,
      path: '/root/product-page',
      languages: [
        {
          code: 'vi',
          versions: [{ version: 1, fields: {} }],
        },
      ],
      presentation: {
        shared: { layoutId: null, renderings: [] },
        final: [],
      },
    });

    // Authenticate
    adminAgent = request.agent(app);
    const loginRes = await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(302);

    // Extract CSRF token
    const editorPage = await adminAgent.get('/admin/content-editor');
    const match = editorPage.text.match(/name="csrf-token"\s+content="([^"]+)"/);
    adminCsrfToken = match ? match[1] : '';

    anonymousAgent = request.agent(app);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('GET /api/presentation/item/:id returns merged presentation JSON', async () => {
    const res = await adminAgent.get(`/api/presentation/item/${testItem._id}?lang=vi&version=1`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.renderings.length).toBe(1);
    expect(res.body.data.renderings[0].uid).toBe('std-landing-hero');
    expect(res.body.data.renderings[0].name).toBe('HeroBanner');
    expect(res.body.data.renderings[0].viewPath).toBe('site/components/HeroBanner.ejs');
  });

  test('PUT /api/presentation/item/:id saves shared presentation configuration', async () => {
    const res = await adminAgent
      .put(`/api/presentation/item/${testItem._id}`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        layoutId: seedResult.homeLayout._id.toString(),
        scope: 'shared',
        renderings: [
          {
            uid: 'std-landing-hero',
            renderingId: seedResult.heroBannerRendering._id.toString(),
            placeholderKey: 'maincontent',
            sortOrder: 100,
            parameters: { theme: 'shared-override' },
          },
          {
            uid: 'new-shared-intro',
            renderingId: seedResult.introRendering._id.toString(),
            placeholderKey: 'maincontent',
            sortOrder: 200,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify merged result
    const verifyRes = await adminAgent.get(`/api/presentation/item/${testItem._id}?lang=vi&version=1`);
    expect(verifyRes.body.data.renderings.length).toBe(2);
    const hero = verifyRes.body.data.renderings.find((r) => r.uid === 'std-landing-hero');
    expect(hero.parameters.theme).toBe('shared-override');
  });

  test('POST /api/presentation/item/:id/reset restores standard template presentation', async () => {
    const res = await adminAgent
      .post(`/api/presentation/item/${testItem._id}/reset`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        scope: 'all',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const verifyRes = await adminAgent.get(`/api/presentation/item/${testItem._id}?lang=vi&version=1`);
    expect(verifyRes.body.data.renderings.length).toBe(1);
    expect(verifyRes.body.data.renderings[0].origin).toBe('standard');
  });

  test('GET /api/presentation/renderings/allowed?placeholder=maincontent returns allowed components', async () => {
    const res = await adminAgent.get('/api/presentation/renderings/allowed?placeholder=maincontent');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((r) => r.name === 'HeroBanner')).toBe(true);
  });

  test('GET /api/presentation/usage/:id returns usage in templates and items', async () => {
    const res = await adminAgent.get(`/api/presentation/usage/${seedResult.heroBannerRendering._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inUse).toBe(true);
    expect(res.body.data.templates.length).toBeGreaterThan(0);
  });

  test('GET and PUT /api/presentation/template/:id/standard updates template standard presentation', async () => {
    const getRes = await adminAgent.get(`/api/presentation/template/${testTemplate._id}/standard`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);

    const putRes = await adminAgent
      .put(`/api/presentation/template/${testTemplate._id}/standard`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        layoutId: seedResult.homeLayout._id.toString(),
        renderings: [
          {
            uid: 'tpl-updated-hero',
            renderingId: seedResult.heroBannerRendering._id.toString(),
            placeholderKey: 'maincontent',
            sortOrder: 100,
          },
        ],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
  });

  test('GET /admin/content-editor/item/:id/presentation returns modal partial HTML without shell layout', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/presentation`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="presentationDetailsModal"');
    expect(res.text).not.toContain('<!DOCTYPE html>');
    expect(res.text).not.toContain('<html');
  });

  test('GET /admin/content-editor/item/:id/presentation/preview returns preview modal partial HTML without shell layout', async () => {
    const res = await adminAgent.get(`/admin/content-editor/item/${testItem._id}/presentation/preview`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="previewPresentationJsonModal"');
    expect(res.text).not.toContain('<!DOCTYPE html>');
    expect(res.text).not.toContain('<html');
  });

  test('Security: unauthenticated requests are blocked', async () => {
    const res = await anonymousAgent.get(`/api/presentation/item/${testItem._id}`);
    expect(res.status).toBe(401);
  });
});
