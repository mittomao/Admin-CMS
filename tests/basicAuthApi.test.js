'use strict';

/**
 * Basic Auth Admin & API Test Suite (GĐ B1 / DEC-046)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const basicAuthService = require('../src/services/basicAuthService');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Setting = require('../src/models/Setting');

describe('GĐ B1 — Basic Auth Admin & API Endpoints', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;

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
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    basicAuthService.invalidateCache();
    await Setting.deleteMany({});
  });

  test('1. Non-admin user without basicauth:read receives 403 on GET /api/basic-auth and /admin/basic-auth', async () => {
    const apiRes = await editorAgent.get('/api/basic-auth');
    expect(apiRes.status).toBe(403);

    const viewRes = await editorAgent.get('/admin/basic-auth');
    expect(viewRes.status).toBe(403);
  });

  test('2. Administrator can view /admin/basic-auth (200 OK)', async () => {
    const res = await adminAgent.get('/admin/basic-auth');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Cấu hình Basic Authentication');
    expect(res.text).toContain('Tài khoản Truy cập');
  });

  test('3. GET /api/basic-auth returns config and NEVER leaks passwordHash', async () => {
    await basicAuthService.addUser({ username: 'testuser', password: 'secretpassword123' });

    const res = await adminAgent.get('/api/basic-auth');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.length).toBe(1);
    expect(res.body.data.users[0].username).toBe('testuser');
    expect(res.body.data.users[0].passwordHash).toBeUndefined();
  });

  test('4. Enabling Basic Auth when 0 active users exist is rejected (400)', async () => {
    const res = await adminAgent
      .put('/api/basic-auth')
      .send({ enabled: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('chưa có tài khoản người dùng hoạt động');
  });

  test('5. POST /api/basic-auth/users creates a new user', async () => {
    const res = await adminAgent
      .post('/api/basic-auth/users')
      .send({ username: 'uat_tester', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('uat_tester');
    expect(res.body.data.disabled).toBe(false);

    // Duplicate username check
    const dupRes = await adminAgent
      .post('/api/basic-auth/users')
      .send({ username: 'uat_tester', password: 'password123' });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toContain('đã tồn tại');
  });

  test('6. Invalid usernames (< 3 chars, special chars) are rejected (400)', async () => {
    const res = await adminAgent
      .post('/api/basic-auth/users')
      .send({ username: 'ab', password: 'password123' });

    expect(res.status).toBe(400);
  });

  test('7. PUT /api/basic-auth/users/:username updates password and toggles lock', async () => {
    await basicAuthService.addUser({ username: 'user_to_edit', password: 'oldpassword123' });

    // Change password
    const pwdRes = await adminAgent
      .put('/api/basic-auth/users/user_to_edit')
      .send({ password: 'newpassword123' });

    expect(pwdRes.status).toBe(200);
    expect(pwdRes.body.success).toBe(true);

    // Verify authentication with new password
    const authOk = await basicAuthService.authenticate('user_to_edit', 'newpassword123');
    expect(authOk).toBe(true);

    const authOld = await basicAuthService.authenticate('user_to_edit', 'oldpassword123');
    expect(authOld).toBe(false);
  });

  test('8. Blocking or deleting last active user while enabled is rejected (400)', async () => {
    await basicAuthService.addUser({ username: 'sole_user', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    // Attempt to disable
    const disableRes = await adminAgent
      .put('/api/basic-auth/users/sole_user')
      .send({ disabled: true });

    expect(disableRes.status).toBe(400);
    expect(disableRes.body.message).toContain('Không thể khóa tài khoản hoạt động cuối cùng');

    // Attempt to delete
    const deleteRes = await adminAgent
      .delete('/api/basic-auth/users/sole_user');

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.message).toContain('Không thể xóa tài khoản hoạt động cuối cùng');
  });

  test('9. Optimistic locking: PUT /api/basic-auth with stale expectedUpdatedAt returns 409', async () => {
    await basicAuthService.addUser({ username: 'user1', password: 'password123' });
    await basicAuthService.getConfig();

    // Mismatched timestamp
    const res = await adminAgent
      .put('/api/basic-auth')
      .send({
        realm: 'New Realm',
        expectedUpdatedAt: new Date(Date.now() - 100000).toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Cấu hình Basic Auth đã được cập nhật bởi một quản trị viên khác');
  });

  test('10. Technical SEO: /robots.txt dynamic response based on Basic Auth state', async () => {
    // Disabled state
    await Setting.create({ key: 'basicAuth', value: { enabled: false } });
    const offRes = await request(app).get('/robots.txt');
    expect(offRes.status).toBe(200);
    expect(offRes.text).toContain('Allow: /');

    // Enabled state
    await basicAuthService.addUser({ username: 'user1', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    const onRes = await request(app).get('/robots.txt');
    expect(onRes.status).toBe(200);
    expect(onRes.text).toContain('User-agent: *');
    expect(onRes.text).toContain('Disallow: /');
  });
});
