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

describe('GĐ 6: Presentation API & Endpoints', () => {
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
      email: 'admin@sitecore.local',
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
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
    });

    seedResult = await seedPresentationData();

    // Create a page template with standard presentation
    testTemplate = await Template.create({
      name: 'LandingPage',
      displayName: 'Landing Page',
      sections: [],
      presentation: {
        devices: [
          {
            deviceId: seedResult.defaultDevice._id,
            layoutId: seedResult.mainLayout._id,
            renderings: [
              {
                uid: 'std-landing-hero',
                renderingId: seedResult.heroRendering._id,
                placeholder: 'main',
                sortOrder: 100,
                parameters: { theme: 'dark' },
              },
            ],
          },
        ],
      },
    });

    testItem = await Item.create({
      name: 'product-page',
      displayName: 'Product Page',
      templateId: testTemplate._id,
      path: '/sitecore/product-page',
      languages: [
        {
          code: 'vi',
          versions: [{ version: 1, fields: {} }],
        },
      ],
      presentation: {
        shared: { devices: [] },
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

  test('GET /api/items/:id/presentation returns merged presentation JSON', async () => {
    const res = await adminAgent.get(`/api/items/${testItem._id}/presentation?lang=vi&version=1`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.renderings.length).toBe(1);
    expect(res.body.data.renderings[0].uid).toBe('std-landing-hero');
    expect(res.body.data.renderings[0].componentName).toBe('HeroBanner');
  });

  test('PUT /api/items/:id/presentation saves shared presentation configuration', async () => {
    const res = await adminAgent
      .put(`/api/items/${testItem._id}/presentation`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        deviceId: seedResult.defaultDevice._id.toString(),
        layoutId: seedResult.mainLayout._id.toString(),
        scope: 'shared',
        renderings: [
          {
            uid: 'std-landing-hero',
            renderingId: seedResult.heroRendering._id.toString(),
            placeholder: 'main',
            sortOrder: 100,
            parameters: { theme: 'shared-override' },
          },
          {
            uid: 'new-shared-richtext',
            renderingId: seedResult.richTextRendering._id.toString(),
            placeholder: 'main',
            sortOrder: 200,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify merged result
    const verifyRes = await adminAgent.get(`/api/items/${testItem._id}/presentation?lang=vi&version=1`);
    expect(verifyRes.body.data.renderings.length).toBe(2);
    const hero = verifyRes.body.data.renderings.find((r) => r.uid === 'std-landing-hero');
    expect(hero.parameters.theme).toBe('shared-override');
  });

  test('POST /api/items/:id/presentation/reset restores standard template presentation', async () => {
    const res = await adminAgent
      .post(`/api/items/${testItem._id}/presentation/reset`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        scope: 'all',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const verifyRes = await adminAgent.get(`/api/items/${testItem._id}/presentation?lang=vi&version=1`);
    expect(verifyRes.body.data.renderings.length).toBe(1);
    expect(verifyRes.body.data.renderings[0].origin).toBe('standard');
  });

  test('GET /api/presentation/renderings?placeholder=main returns allowed components', async () => {
    const res = await adminAgent.get('/api/presentation/renderings?placeholder=main');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((r) => r.componentName === 'HeroBanner')).toBe(true);
  });

  test('GET /api/presentation/placeholders?layoutId=... returns placeholders of layout', async () => {
    const res = await adminAgent.get(`/api/presentation/placeholders?layoutId=${seedResult.mainLayout._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.placeholders).toContain('header');
    expect(res.body.placeholders).toContain('main');
    expect(res.body.placeholders).toContain('footer');
  });

  test('GET /api/presentation/usage/:id returns usage count', async () => {
    const res = await adminAgent.get(`/api/presentation/usage/${seedResult.heroRendering._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inUse).toBe(true);
    expect(res.body.data.totalUsage).toBeGreaterThan(0);
  });

  test('GET and PUT /api/templates/:id/standard-presentation updates template configuration', async () => {
    const getRes = await adminAgent.get(`/api/templates/${testTemplate._id}/standard-presentation`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);

    const putRes = await adminAgent
      .put(`/api/templates/${testTemplate._id}/standard-presentation`)
      .set('X-CSRF-Token', adminCsrfToken)
      .send({
        deviceId: seedResult.defaultDevice._id.toString(),
        layoutId: seedResult.mainLayout._id.toString(),
        renderings: [
          {
            uid: 'tpl-updated-hero',
            renderingId: seedResult.heroRendering._id.toString(),
            placeholder: 'main',
            sortOrder: 100,
          },
        ],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
  });

  test('Security: unauthenticated requests are blocked', async () => {
    const res = await anonymousAgent.get(`/api/items/${testItem._id}/presentation`);
    expect(res.status).toBe(401);
  });
});

