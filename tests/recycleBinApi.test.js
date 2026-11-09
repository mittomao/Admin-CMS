'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const branding = require('../src/config/branding');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Language = require('../src/models/Language');

describe('GĐ 9 — Recycle Bin & Audit Log API & Routes', () => {
  let mongoServer;
  let adminAgent;
  let adminUser;
  let testTpl;
  let deletedItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    await Language.create({ code: 'vi', name: 'Vietnamese', isDefault: true, active: true });

    testTpl = await Template.create({
      name: 'TestTemplate',
      displayName: 'Test Template',
      isSystem: false,
      sections: [],
    });

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const passwordHash = await User.hashPassword('adminpass123');
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
    });

    // Login session
    adminAgent = request.agent(app);
    await adminAgent
      .post('/admin/login')
      .send({ username: 'admin', password: 'adminpass123' });

    // Seed test deleted item
    deletedItem = await Item.create({
      name: 'deleted-page',
      displayName: 'Deleted Page',
      path: `${branding.PATHS.CONTENT}/deleted-page`,
      templateId: testTpl._id,
      deleted: true,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminUser._id,
      deletedFromPath: `${branding.PATHS.CONTENT}/deleted-page`,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('GET /admin/recycle-bin renders 200 OK for Administrator', async () => {
    const res = await adminAgent.get('/admin/recycle-bin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Thùng rác (Recycle Bin)');
    expect(res.text).toContain('Deleted Page');
  });

  test('GET /api/recycle-bin/:id returns single item details & parent status', async () => {
    const res = await adminAgent.get(`/api/recycle-bin/${deletedItem._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.item.name).toBe('deleted-page');
    expect(res.body.data.parentStatus).toBeDefined();
  });

  test('GET /admin/audit-log renders 200 OK for Administrator', async () => {
    const res = await adminAgent.get('/admin/audit-log');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Nhật ký Kiểm toán (Audit Log)');
  });

  test('GET /admin/audit-log/export exports CSV with attachment header', async () => {
    const res = await adminAgent.get('/admin/audit-log/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  test('GET /api/items/:id/references returns reference checks', async () => {
    const res = await adminAgent.get(`/api/items/${deletedItem._id}/references`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.references).toBeDefined();
  });

  test('POST /api/recycle-bin/purge/:id returns JSON even without explicit Accept: application/json', async () => {
    const itemToPurge = await Item.create({
      name: 'item-to-purge',
      displayName: 'Item To Purge',
      path: `${branding.PATHS.CONTENT}/item-to-purge`,
      templateId: testTpl._id,
      deleted: true,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminUser._id,
      deletedFromPath: `${branding.PATHS.CONTENT}/item-to-purge`,
    });

    const res = await adminAgent
      .post(`/api/recycle-bin/purge/${itemToPurge._id}`)
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Đã xoá vĩnh viễn');

    const check = await Item.findById(itemToPurge._id);
    expect(check).toBeNull();
  });

  test('POST /api/recycle-bin/restore/:id returns JSON', async () => {
    // Create root content node so restore finds parent
    const contentNode = await Item.create({
      name: 'content',
      displayName: 'Content',
      path: branding.PATHS.CONTENT,
      templateId: testTpl._id,
      deleted: false,
      isDeleted: false,
    });

    const itemToRestore = await Item.create({
      name: 'item-to-restore',
      displayName: 'Item To Restore',
      path: `${branding.PATHS.CONTENT}/item-to-restore`,
      templateId: testTpl._id,
      parentId: contentNode._id,
      deleted: true,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminUser._id,
      deletedFromParentId: contentNode._id,
      deletedFromPath: `${branding.PATHS.CONTENT}/item-to-restore`,
    });

    const res = await adminAgent
      .post(`/api/recycle-bin/restore/${itemToRestore._id}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Khôi phục thành công');

    const check = await Item.findById(itemToRestore._id);
    expect(check.deleted).toBe(false);
  });
});
