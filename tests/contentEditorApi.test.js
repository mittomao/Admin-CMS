const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');

describe('Content Editor API & SSR Endpoints', () => {
  let mongoServer;
  let agent;
  let folderTemplate;
  let pageTemplate;
  let rootItem;
  let homeItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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
      email: 'admin@sitecore.local',
      passwordHash,
      fullName: 'System Admin',
      roles: [adminRole._id],
      isActive: true,
    });

    // 2. Templates
    folderTemplate = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      icon: 'ti ti-folder',
      sections: [{ name: 'Folder Info', fields: [] }],
    });

    pageTemplate = await Template.create({
      name: 'Page',
      displayName: 'Page',
      icon: 'ti ti-file-text',
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: true },
            { name: 'summary', title: 'Summary', type: 'Multi-Line Text', required: false },
            { name: 'body', title: 'Body', type: 'Rich Text', required: false },
          ],
        },
      ],
    });

    folderTemplate.insertOptions = [folderTemplate._id, pageTemplate._id];
    await folderTemplate.save();

    pageTemplate.insertOptions = [pageTemplate._id];
    await pageTemplate.save();

    // 3. Items
    rootItem = await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: folderTemplate._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
      sortOrder: 10,
    });

    homeItem = await Item.create({
      name: 'home',
      displayName: 'Home',
      templateId: pageTemplate._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: '/sitecore/home',
      sortOrder: 100,
      fields: {
        title: 'Home Page',
        summary: 'Welcome to our site',
      },
    });

    // 4. Authenticate agent session
    agent = request.agent(app);
    await agent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(302);
  });

  test('GET /admin/content-editor renders 200 with Ribbon and Tree', async () => {
    const res = await agent.get(`/admin/content-editor/${homeItem._id}`).expect(200);
    expect(res.text).toContain('Content Editor');
    expect(res.text).toContain('id="contentTree"');
    expect(res.text).toContain('id="ribbonTabs"');
    expect(res.text).toContain('Home Page');
  });

  test('GET /admin/content-editor/item/:id/form returns partial HTML', async () => {
    const res = await agent
      .get(`/admin/content-editor/item/${homeItem._id}/form`)
      .expect(200);

    expect(res.text).toContain('id="itemEditForm"');
    expect(res.text).toContain('name="fields[title]"');
    expect(res.text).toContain('Home Page');
  });

  test('GET /admin/content-editor/item/:id/folder-view returns child items', async () => {
    const res = await agent
      .get(`/admin/content-editor/item/${rootItem._id}/folder-view`)
      .expect(200);

    expect(res.text).toContain('Sitecore');
    expect(res.text).toContain('Home');
  });

  test('GET /api/items/root/children returns Fancytree node for root', async () => {
    const res = await agent.get('/api/items/root/children').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Sitecore');
    expect(res.body[0].lazy).toBe(true);
  });

  test('GET /api/items/:id/children returns children nodes', async () => {
    const res = await agent.get(`/api/items/${rootItem._id}/children`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Home');
  });

  test('GET /api/items/search?q=home returns matching item', async () => {
    const res = await agent.get('/api/items/search?q=home').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toBe('home');
  });

  test('POST /api/items creates child item and returns Fancytree node', async () => {
    const res = await agent
      .post('/api/items')
      .send({
        parentId: homeItem._id,
        templateId: pageTemplate._id,
        name: 'contact',
        displayName: 'Contact Us',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('contact');
    expect(res.body.data.path).toBe('/sitecore/home/contact');
    expect(res.body.node.title).toBe('Contact Us');
  });

  test('PUT /api/items/:id/fields updates fields successfully', async () => {
    const res = await agent
      .put(`/api/items/${homeItem._id}/fields`)
      .send({
        fields: {
          title: 'Brand New Title',
          summary: 'Updated summary',
          body: '<p>Content</p>',
        },
        expectedUpdatedAt: homeItem.updatedAt.toISOString(),
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fields.title).toBe('Brand New Title');
  });

  test('POST /api/items/:id/rename renames item', async () => {
    const res = await agent
      .post(`/api/items/${homeItem._id}/rename`)
      .send({
        name: 'new-home',
        displayName: 'New Home Display',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('new-home');
    expect(res.body.data.displayName).toBe('New Home Display');
    expect(res.body.data.path).toBe('/sitecore/new-home');
  });

  test('POST /api/items/:id/sort reorders items', async () => {
    // Create second child under root
    await Item.create({
      name: 'media',
      displayName: 'Media',
      templateId: folderTemplate._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: '/sitecore/media',
      sortOrder: 200,
    });

    const res = await agent
      .post(`/api/items/${homeItem._id}/sort`)
      .send({ direction: 'down' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/items/:id soft-deletes item', async () => {
    const res = await agent.delete(`/api/items/${homeItem._id}`).expect(200);
    expect(res.body.success).toBe(true);

    const deleted = await Item.findById(homeItem._id);
    expect(deleted.deleted).toBe(true);
  });
});
