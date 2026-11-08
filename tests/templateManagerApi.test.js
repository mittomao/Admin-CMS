const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');

describe('Template Manager API & SSR Endpoints', () => {
  let mongoServer;
  let agent;
  let baseTemplate;
  let articleTemplate;
  let systemTemplate;
  let rootItem;
  let testItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Role.deleteMany({});
    await Template.deleteMany({});
    await Item.deleteMany({});

    // 1. Roles & Admin User
    const adminRole = await Role.create({
      name: 'Administrator',
      description: 'System admin',
      isSystem: true,
    });

    const passwordHash = await User.hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      passwordHash,
      fullName: 'System Admin',
      roles: [adminRole._id],
      isActive: true,
    });

    // 2. Base Template (_BasePage)
    baseTemplate = await Template.create({
      name: '_BasePage',
      displayName: 'Base Page',
      icon: 'ti ti-file-code',
      sections: [
        {
          name: 'SEO & Metadata',
          fields: [
            { name: 'metaTitle', title: 'Meta Title', type: 'Single-Line Text' },
            { name: 'metaDescription', title: 'Meta Description', type: 'Multi-Line Text' },
          ],
        },
      ],
      standardValues: {
        metaTitle: 'Default Site Title',
      },
    });

    // 3. Article Template inheriting from Base Template
    articleTemplate = await Template.create({
      name: 'Article',
      displayName: 'Article',
      icon: 'ti ti-article',
      baseTemplates: [baseTemplate._id],
      sections: [
        {
          name: 'Article Content',
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: true },
            { name: 'body', title: 'Body', type: 'Rich Text' },
          ],
        },
      ],
      standardValues: {
        title: 'Untitled Article',
      },
    });

    // 4. System Template
    systemTemplate = await Template.create({
      name: 'SystemFolder',
      displayName: 'System Folder',
      icon: 'ti ti-folder-cog',
      isSystem: true,
      sections: [],
    });

    // 5. Items
    rootItem = await Item.create({
      name: 'root',
      displayName: 'root',
      templateId: systemTemplate._id,
      parentId: null,
      ancestors: [],
      path: '/root',
      sortOrder: 10,
    });

    testItem = await Item.create({
      name: 'first-article',
      displayName: 'First Article',
      templateId: articleTemplate._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: '/root/first-article',
      sortOrder: 100,
      fields: {
        title: 'Custom Title Override',
      },
    });

    // 6. Authenticate agent session
    agent = request.agent(app);
    await agent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(302);
  });

  // ==========================================
  // SSR UI Endpoints
  // ==========================================
  test('GET /admin/template-manager redirects 302 to Content Editor templates node', async () => {
    const res = await agent.get('/admin/template-manager').expect(302);
    expect(decodeURIComponent(res.headers.location)).toContain('/admin/content-editor?path=/root/templates');
  });

  test('GET /admin/template-manager/:id redirects 302 to Content Editor with template item', async () => {
    const res = await agent.get(`/admin/template-manager/${articleTemplate._id}`).expect(302);
    expect(res.headers.location).toBe(`/admin/content-editor/${articleTemplate._id}`);
  });

  test('GET /admin/template-manager?legacy=true renders 200 with ribbon and templates', async () => {
    const res = await agent.get('/admin/template-manager?legacy=true').expect(200);
    expect(res.text).toContain('Template Manager');
    expect(res.text).toContain('Article');
    expect(res.text).toContain('Base Page');
    expect(res.text).toContain('id="templateWorkspaceTabs"');
  });

  test('GET /admin/template-manager/:id/builder returns builder partial with sections & fields', async () => {
    const res = await agent
      .get(`/admin/template-manager/${articleTemplate._id}/builder`)
      .expect(200);

    expect(res.text).toContain('Article Content');
    expect(res.text).toContain('title');
    expect(res.text).toContain('body');
  });

  // ==========================================
  // Template CRUD API Endpoints
  // ==========================================
  test('POST /api/templates creates a new template', async () => {
    const res = await agent
      .post('/api/templates')
      .send({
        name: 'ProductPage',
        displayName: 'Product Page',
        icon: 'ti ti-shopping-cart',
        description: 'Template for product details',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('ProductPage');
    expect(res.body.data.displayName).toBe('Product Page');

    const created = await Template.findOne({ name: 'ProductPage' });
    expect(created).not.toBeNull();
  });

  test('POST /api/templates/:id/sections adds a new section', async () => {
    const res = await agent
      .post(`/api/templates/${articleTemplate._id}/sections`)
      .send({ name: 'Publishing Settings' })
      .expect(201);

    expect(res.body.success).toBe(true);
    const updated = await Template.findById(articleTemplate._id);
    expect(updated.sections.some((s) => s.name === 'Publishing Settings')).toBe(true);
  });

  test('POST /api/templates/:id/sections/:sectionId/fields adds a new field', async () => {
    const section = articleTemplate.sections[0];
    const res = await agent
      .post(`/api/templates/${articleTemplate._id}/sections/${section._id}/fields`)
      .send({
        name: 'authorName',
        title: 'Author Name',
        type: 'Single-Line Text',
        required: false,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    const updated = await Template.findById(articleTemplate._id);
    const sec = updated.sections.id(section._id);
    expect(sec.fields.some((f) => f.name === 'authorName')).toBe(true);
  });

  test('PUT /api/templates/:id/base-templates prevents circular inheritance (returns 400)', async () => {
    // Attempting to make BasePage inherit from Article (Cycle: Article -> BasePage -> Article)
    const res = await agent
      .put(`/api/templates/${baseTemplate._id}/base-templates`)
      .send({ baseTemplateIds: [articleTemplate._id.toString()] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/circular|cycle/i);
  });

  test('PUT /api/templates/:id/standard-values updates standard values map', async () => {
    const fieldId = articleTemplate.sections[0].fields[0]._id.toString();
    const res = await agent
      .put(`/api/templates/${articleTemplate._id}/standard-values`)
      .send({
        standardValues: {
          [fieldId]: 'New Default Article Title',
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const updated = await Template.findById(articleTemplate._id);
    expect(updated.standardValues.get(fieldId)).toBe('New Default Article Title');
  });

  test('DELETE /api/templates/:id blocks deleting system template', async () => {
    const res = await agent
      .delete(`/api/templates/${systemTemplate._id}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/system/i);
  });

  test('DELETE /api/templates/:id blocks deleting template used by items', async () => {
    const res = await agent
      .delete(`/api/templates/${articleTemplate._id}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/item/i);
  });

  test('POST /api/items/:id/reset-standard-value resets overridden field', async () => {
    const field = articleTemplate.sections[0].fields.find((f) => f.name === 'title');
    const fieldId = field._id.toString();

    // Verify item initially has overridden title
    expect(testItem.fields.get('title')).toBe('Custom Title Override');

    const res = await agent
      .post(`/api/items/${testItem._id}/reset-standard-value`)
      .send({ fieldId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('reset');

    // After reset, checking item in DB
    const freshItem = await Item.findById(testItem._id);
    expect(freshItem.fields.get(fieldId)).toBeUndefined();
    expect(freshItem.fields.get('title')).toBeUndefined();
  });
});
