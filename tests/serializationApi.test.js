'use strict';

/**
 * Serialization Admin & API Integration Test Suite (GĐ 11 / DEC-047)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const branding = require('../src/config/branding');

describe('GĐ 11 — Serialization Admin & API Integration Tests', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;
  let testTemplate;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const editorRole = await Role.create({ name: 'Editor', isSystem: true });

    const passwordHash = await User.hashPassword('adminpass123');

    await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
    });

    await User.create({
      username: 'editor_user',
      email: 'editor@treecraft.local',
      fullName: 'Content Editor',
      passwordHash,
      roles: [editorRole._id],
    });

    adminAgent = request.agent(app);
    await adminAgent.post('/admin/login').send({ username: 'admin', password: 'adminpass123' });

    editorAgent = request.agent(app);
    await editorAgent.post('/admin/login').send({ username: 'editor_user', password: 'adminpass123' });

    // Seed test data
    testTemplate = await Template.create({
      name: 'ApiTestPage',
      displayName: 'API Test Page',
      path: `${branding.PATHS.TEMPLATES}/ApiTestPage`,
      sections: [],
    });

    await Item.create({
      name: 'TestArticle',
      displayName: 'Test Article',
      path: `${branding.PATHS.CONTENT}/TestArticle`,
      templateId: testTemplate._id,
      sharedFields: { summary: 'Testing API' },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /admin/serialization', () => {
    test('Administrator truy cập thành công và thấy giao diện 2 Tab', async () => {
      const res = await adminAgent.get('/admin/serialization');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Quản lý Đóng gói & Phục hồi Dữ liệu');
      expect(res.text).toContain('Xuất Gói (Export Package)');
      expect(res.text).toContain('Nhập Gói (Import Package)');
      expect(res.text).toContain('toastContainer');
    });

    test('Người dùng không có quyền bị từ chối truy cập (403 Forbidden)', async () => {
      const res = await editorAgent.get('/admin/serialization');
      expect(res.status).toBe(403);
    });

    test('Chưa đăng nhập bị chuyển hướng đến /admin/login', async () => {
      const res = await request(app).get('/admin/serialization');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/admin/login');
    });
  });

  describe('POST /api/serialization/export-package', () => {
    test('Xuất gói thành công trả về thống kê và dữ liệu JSON', async () => {
      const res = await adminAgent
        .post('/api/serialization/export-package')
        .send({
          includeContent: true,
          includeTemplates: true,
          includeLayouts: true,
          includeRenderings: true,
          includePlaceholders: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeTruthy();
      expect(res.body.packageData).toBeTruthy();
      expect(res.body.stats.contentCount).toBeGreaterThanOrEqual(1);
    });

    test('Báo lỗi 400 nếu không chọn phân vùng nào', async () => {
      const res = await adminAgent
        .post('/api/serialization/export-package')
        .send({
          includeContent: false,
          includeTemplates: false,
          includeLayouts: false,
          includeRenderings: false,
          includePlaceholders: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('chọn ít nhất một phân vùng');
    });
  });

  describe('POST /api/serialization/inspect', () => {
    test('Phân tích gói JSON hợp lệ trả về inspection report', async () => {
      const exportRes = await adminAgent
        .post('/api/serialization/export-package')
        .send({ includeContent: true });

      const res = await adminAgent
        .post('/api/serialization/inspect')
        .send({ packageData: exportRes.body.packageData });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.inspection.isValid).toBe(true);
      expect(res.body.inspection.stats.totalItems).toBeGreaterThan(0);
    });

    test('Báo lỗi 400 nếu gói dữ liệu không đúng format', async () => {
      const res = await adminAgent
        .post('/api/serialization/inspect')
        .send({ packageData: { invalid: true } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/serialization/import', () => {
    test('Nhập gói dữ liệu thành công trả về kết quả cho Toast', async () => {
      const exportRes = await adminAgent
        .post('/api/serialization/export-package')
        .send({ includeContent: true });

      const res = await adminAgent
        .post('/api/serialization/import')
        .send({
          packageData: exportRes.body.packageData,
          conflictMode: 'OVERWRITE',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeTruthy();
      expect(res.body.stats.totalUpdated + res.body.stats.totalCreated).toBeGreaterThan(0);
      expect(res.body.message).toContain('Nhập dữ liệu hoàn tất!');
    });

    test('Editor không có quyền import bị chặn (403)', async () => {
      const res = await editorAgent
        .post('/api/serialization/import')
        .send({ packageData: {} });

      expect(res.status).toBe(403);
    });
  });
});
