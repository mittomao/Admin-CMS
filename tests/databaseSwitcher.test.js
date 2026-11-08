const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const PublishedItem = require('../src/models/PublishedItem');
const itemService = require('../src/services/itemService');

describe('GĐ 8.1 - Database Switcher Master/Web & Reconciliation', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;
  let adminUser;
  let editorUser;
  let folderTemplate;
  let pageTemplate;
  let masterRoot;
  let webRoot;
  let publishedPage;
  let unpublishedPage;
  let orphanPage;

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
    await PublishedItem.deleteMany({});

    // Roles
    const adminRole = await Role.create({
      name: 'Administrator',
      description: 'System admin',
      isSystem: true,
    });
    const editorRole = await Role.create({
      name: 'Editor',
      description: 'Content editor',
      isSystem: true,
    });

    // Admin User
    const passwordHash = await User.hashPassword('admin123');
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      passwordHash,
      fullName: 'System Admin',
      roles: [adminRole._id],
      isActive: true,
    });
    adminUser = await User.findById(adminUser._id).populate('roles');

    // Editor User
    editorUser = await User.create({
      username: 'editor',
      email: 'editor@treecraft.local',
      passwordHash,
      fullName: 'Content Editor',
      roles: [editorRole._id],
      isActive: true,
    });
    editorUser = await User.findById(editorUser._id).populate('roles');

    // Templates
    folderTemplate = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      icon: 'ti ti-folder',
      sections: [{ name: 'Folder Info', fields: [] }],
    });

    pageTemplate = await Template.create({
      name: 'Sample Page',
      displayName: 'Sample Page',
      icon: 'ti ti-file',
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text' },
          ],
        },
      ],
    });

    // Master Tree: /root -> /root/content -> publishedPage & unpublishedPage
    masterRoot = await Item.create({
      name: 'root',
      displayName: 'root',
      path: '/root',
      templateId: folderTemplate._id,
      parentId: null,
      ancestors: [],
      languages: [{ code: 'vi', versions: [{ version: 1, fields: new Map() }] }],
      deleted: false,
    });

    const masterContent = await Item.create({
      name: 'content',
      displayName: 'Content',
      path: '/root/content',
      templateId: folderTemplate._id,
      parentId: masterRoot._id,
      ancestors: [masterRoot._id],
      languages: [{ code: 'vi', versions: [{ version: 1, fields: new Map() }] }],
      deleted: false,
    });

    publishedPage = await Item.create({
      name: 'published-page',
      displayName: 'Published Page',
      path: '/root/content/published-page',
      templateId: pageTemplate._id,
      parentId: masterContent._id,
      ancestors: [masterRoot._id, masterContent._id],
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([['title', 'Published Title']]),
            },
          ],
        },
      ],
      updatedAt: new Date('2026-01-01T10:00:00Z'),
      deleted: false,
    });

    unpublishedPage = await Item.create({
      name: 'draft-page',
      displayName: 'Draft Page',
      path: '/root/content/draft-page',
      templateId: pageTemplate._id,
      parentId: masterContent._id,
      ancestors: [masterRoot._id, masterContent._id],
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([['title', 'Draft Title']]),
            },
          ],
        },
      ],
      deleted: false,
    });

    // Web Tree (items_web): only /root, /root/content, publishedPage, and orphanPage
    webRoot = await PublishedItem.create({
      _id: masterRoot._id,
      name: masterRoot.name,
      displayName: masterRoot.displayName,
      path: masterRoot.path,
      templateId: folderTemplate._id,
      parentId: null,
      ancestors: [],
      sourceVersion: 1,
      isDeleted: false,
    });

    await PublishedItem.create({
      _id: masterContent._id,
      name: masterContent.name,
      displayName: masterContent.displayName,
      path: masterContent.path,
      templateId: folderTemplate._id,
      parentId: webRoot._id,
      ancestors: [webRoot._id],
      sourceVersion: 1,
      isDeleted: false,
    });

    await PublishedItem.create({
      _id: publishedPage._id,
      name: publishedPage.name,
      displayName: publishedPage.displayName,
      path: publishedPage.path,
      templateId: pageTemplate._id,
      parentId: masterContent._id,
      ancestors: [webRoot._id, masterContent._id],
      fields: new Map([['title', 'Published Title Web']]),
      languages: [{ code: 'vi', publishedVersion: 1 }],
      sourceVersion: 1,
      publishedAt: new Date('2026-01-01T10:00:00Z'),
      publishedBy: adminUser._id,
      updatedAt: new Date('2026-01-01T10:00:00Z'),
      isDeleted: false,
    });

    orphanPage = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'orphan-page',
      displayName: 'Orphan Page',
      path: '/root/content/orphan-page',
      templateId: pageTemplate._id,
      parentId: masterContent._id,
      ancestors: [webRoot._id, masterContent._id],
      fields: new Map([['title', 'Orphan in Web']]),
      languages: [{ code: 'vi', publishedVersion: 1 }],
      sourceVersion: 1,
      publishedAt: new Date('2026-01-01T10:00:00Z'),
      publishedBy: adminUser._id,
      isDeleted: false,
    });

    // Login agents
    adminAgent = request.agent(app);
    await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'admin123' });

    editorAgent = request.agent(app);
    await editorAgent
      .post('/admin/login')
      .send({ username: 'editor', password: 'admin123' });
  });

  describe('1. Whitelist validation & Repository Abstraction', () => {
    test('validateDb accepts master and web (case insensitive)', () => {
      expect(itemService.validateDb('master')).toBe('master');
      expect(itemService.validateDb('MASTER')).toBe('master');
      expect(itemService.validateDb('web')).toBe('web');
      expect(itemService.validateDb('WEB ')).toBe('web');
      expect(itemService.validateDb(null)).toBe('master');
      expect(itemService.validateDb(undefined)).toBe('master');
    });

    test('validateDb rejects unauthorized or unknown database names', () => {
      expect(() => itemService.validateDb('core')).toThrow(/không hợp lệ/);
      expect(() => itemService.validateDb('hack_db')).toThrow(/không hợp lệ/);
    });

    test('getItemRepository returns corresponding Mongoose model', () => {
      expect(itemService.getItemRepository('master')).toBe(Item);
      expect(itemService.getItemRepository('web')).toBe(PublishedItem);
    });
  });

  describe('2. Server-side Guard Against Writes to Web DB', () => {
    test('Mutation endpoint rejects ?db=web with 403 Forbidden', async () => {
      const res = await adminAgent
        .put(`/api/items/${publishedPage._id}/fields?db=web`)
        .send({ fields: { title: 'Hacked Title' } });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Web database là kho dữ liệu chỉ đọc');
    });

    test('Mutation endpoint rejects invalid ?db=hack with 400 Bad Request', async () => {
      const res = await adminAgent
        .put(`/api/items/${publishedPage._id}/fields?db=hack`)
        .send({ fields: { title: 'Hack' } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('không hợp lệ');
    });
  });

  describe('3. Tree & Form in Web Read-Only Mode', () => {
    test('Tree in Web mode only shows published items', async () => {
      const res = await adminAgent.get(`/api/items/${masterRoot._id}/children?db=web`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const contentNode = res.body.find((n) => n.title === 'Content');
      expect(contentNode).toBeDefined();

      const childrenRes = await adminAgent.get(`/api/items/${contentNode.key}/children?db=web`);
      expect(childrenRes.status).toBe(200);
      const childTitles = childrenRes.body.map((n) => n.title);
      expect(childTitles).toContain('Published Page');
      expect(childTitles).toContain('Orphan Page');
      expect(childTitles).not.toContain('Draft Page'); // Draft not published!
    });

    test('Form in Web mode renders read-only banner and disabled fields', async () => {
      const res = await adminAgent.get(`/admin/content-editor/item/${publishedPage._id}/form?db=web`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Đang xem WEB database (chỉ đọc)');
      expect(res.text).toContain('Open in Master');
      expect(res.text).toContain('<fieldset class="border-0 p-0 m-0 card-body p-3 overflow-auto flex-fill" style="max-height: calc(100vh - 280px);" disabled>');
    });

    test('Form in Web mode for unpublished item renders friendly Master redirect banner', async () => {
      const res = await adminAgent.get(`/admin/content-editor/item/${unpublishedPage._id}/form?db=web`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Item chưa được xuất bản lên Web');
      expect(res.text).toContain('Mở trên Master Database');
    });

    test('Orphan item on Web displays Orphan warning badge', async () => {
      const res = await adminAgent.get(`/admin/content-editor/item/${orphanPage._id}/form?db=web`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('MỒ CÔI (ORPHAN)');
    });
  });

  describe('4. Publish Status Calculation & Batch API', () => {
    test('getPublishStatus returns UNPUBLISHED, PUBLISHED, or CHANGED', async () => {
      // 1. Unpublished page
      const statusUnpub = await itemService.getPublishStatus(unpublishedPage);
      expect(statusUnpub).toBe('UNPUBLISHED');

      // 2. Published synced page
      const statusPub = await itemService.getPublishStatus(publishedPage);
      expect(statusPub).toBe('PUBLISHED');

      // 3. Changed page (version 2 added in master after publish)
      await Item.updateOne(
        { _id: publishedPage._id },
        {
          $push: {
            'languages.0.versions': {
              version: 2,
              fields: new Map([['title', 'Version 2 Title']]),
            },
          },
          $set: { updatedAt: new Date(Date.now() + 50000) },
        }
      );
      const statusChanged = await itemService.getPublishStatus(publishedPage._id);
      expect(statusChanged).toBe('CHANGED');
    });

    test('GET /api/items/publish-status-batch returns status map for requested IDs', async () => {
      const ids = [publishedPage._id.toString(), unpublishedPage._id.toString()].join(',');
      const res = await adminAgent.get(`/api/items/publish-status-batch?ids=${ids}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[unpublishedPage._id.toString()]).toBe('UNPUBLISHED');
      expect(res.body.data[publishedPage._id.toString()]).toBeDefined();
    });
  });

  describe('5. Database Manager Dashboard & Diff APIs', () => {
    test('GET /api/databases/summary returns statistics per branch and totals', async () => {
      const res = await adminAgent.get('/api/databases/summary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.branches).toBeDefined();
      expect(res.body.data.totals.master).toBeGreaterThan(0);
      expect(res.body.data.totals.web).toBeGreaterThan(0);
    });

    test('GET /api/databases/diff categorizes missing, changed, and orphan items', async () => {
      const res = await adminAgent.get('/api/databases/diff');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { items, counts } = res.body.data;
      expect(counts.missing).toBeGreaterThanOrEqual(1); // draft-page
      expect(counts.orphan).toBeGreaterThanOrEqual(1); // orphan-page
      expect(items.some((i) => i.name === 'draft-page' && i.type === 'missing')).toBe(true);
      expect(items.some((i) => i.name === 'orphan-page' && i.type === 'orphan')).toBe(true);
    });

    test('GET /admin/databases renders reconciliation dashboard HTML', async () => {
      const res = await adminAgent.get('/admin/databases');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Database Manager & Đối soát Dữ liệu');
      expect(res.text).toContain('Master Database');
      expect(res.text).toContain('Web Store');
    });
  });

  describe('6. Permissions & Security Checks', () => {
    test('Approver / Admin has database:web:read and database:compare; Editor is denied', async () => {
      expect(itemService.canPerform(adminUser, null, 'database:web:read')).toBe(true);
      expect(itemService.canPerform(adminUser, null, 'database:compare')).toBe(true);

      expect(itemService.canPerform(editorUser, null, 'database:web:read')).toBe(false);
      expect(itemService.canPerform(editorUser, null, 'database:compare')).toBe(false);

      const resEditor = await editorAgent.get('/admin/databases');
      expect(resEditor.status).toBe(403);
    });
  });
});

