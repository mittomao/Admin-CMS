'use strict';

/**
 * Basic Auth Middleware Test Suite (GĐ B1 / DEC-050)
 * Validates HTTP Basic Authentication protecting Admin CMS & Admin APIs,
 * while ensuring the public website remains 100% open and unintercepted.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const basicAuthService = require('../src/services/basicAuthService');
const basicAuthMiddleware = require('../src/middlewares/basicAuthMiddleware');
const Setting = require('../src/models/Setting');
const PublishedItem = require('../src/models/PublishedItem');
const branding = require('../src/config/branding');

describe('GĐ B1 — basicAuthMiddleware (RFC 7617 for Admin CMS & APIs)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const dummyTplId = new mongoose.Types.ObjectId();
    const rootId = new mongoose.Types.ObjectId();
    const contentId = new mongoose.Types.ObjectId();

    await PublishedItem.create({
      _id: rootId,
      name: 'root',
      templateId: dummyTplId,
      path: branding.PATHS.ROOT,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    await PublishedItem.create({
      _id: contentId,
      name: 'content',
      templateId: dummyTplId,
      parentId: rootId,
      path: branding.PATHS.CONTENT,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    // Create Home item in Web store so GET / returns 200
    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Home',
      templateId: dummyTplId,
      parentId: contentId,
      path: branding.PATHS.HOME,
      isDeleted: false,
      publishedAt: new Date(),
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });
  });

  afterAll(async () => {
    delete process.env.BASIC_AUTH_ENABLED;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    delete process.env.BASIC_AUTH_ENABLED;
    basicAuthMiddleware.clearRateLimitStore();
    basicAuthService.invalidateCache();
    await Setting.deleteMany({});
  });

  test('1. When Basic Auth is OFF: both Public site and Admin are accessible without Basic Auth', async () => {
    await Setting.create({
      key: 'basicAuth',
      value: { enabled: false },
      updatedBy: 'test',
    });

    const publicRes = await request(app).get('/');
    expect(publicRes.status).not.toBe(401);

    const adminRes = await request(app).get('/admin/login');
    expect(adminRes.status).not.toBe(401);
    expect(adminRes.headers['www-authenticate']).toBeUndefined();
  });

  test('2. When Basic Auth is ON: Public website is NEVER intercepted by Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'admin_sec', password: 'SecPassword123' });
    await basicAuthService.updateConfig({ enabled: true, realm: 'Treecraft Admin Access' });

    // Public website requests (/) must NEVER be blocked by Basic Auth
    const publicRes = await request(app).get('/');
    expect(publicRes.status).not.toBe(401);
    expect(publicRes.headers['www-authenticate']).toBeUndefined();

    // Technical SEO robots.txt is accessible without Basic Auth
    const robotsRes = await request(app).get('/robots.txt');
    expect(robotsRes.status).toBe(200);
    expect(robotsRes.text).toContain('Allow: /');
  });

  test('3. When Basic Auth is ON: Request to /admin without credentials returns 401 + WWW-Authenticate', async () => {
    await basicAuthService.addUser({ username: 'admin_sec', password: 'SecPassword123' });
    await basicAuthService.updateConfig({ enabled: true, realm: 'Treecraft Admin Access' });

    const adminRes = await request(app).get('/admin/login');
    expect(adminRes.status).toBe(401);
    expect(adminRes.headers['www-authenticate']).toContain('Basic realm="Treecraft Admin Access"');
    expect(adminRes.headers['cache-control']).toContain('no-store');
    expect(adminRes.text).toContain('401 - Yêu Cầu Xác Thực Quản Trị');
  });

  test('4. When Basic Auth is ON: Internal APIs (/api) are protected by application auth and not blocked by Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'admin_sec', password: 'SecPassword123' });
    await basicAuthService.updateConfig({ enabled: true, realm: 'Treecraft Admin Access' });

    // Request to /api/languages without basic auth is not intercepted by Basic Auth
    const apiRes = await request(app).get('/api/languages');
    expect(apiRes.headers['www-authenticate']).toBeUndefined();
  });

  test('5. Valid Basic Auth credentials allow access to /admin/login', async () => {
    await basicAuthService.addUser({ username: 'john_admin', password: 'my:admin:pass' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('john_admin:my:admin:pass').toString('base64');
    const res = await request(app)
      .get('/admin/login')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('private');
  });

  test('6. Case-insensitive username authentication succeeds', async () => {
    await basicAuthService.addUser({ username: 'super_admin', password: 'secretpassword123' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('SUPER_ADMIN:secretpassword123').toString('base64');
    const res = await request(app)
      .get('/admin/login')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(200);
  });

  test('7. Wrong password returns 401', async () => {
    await basicAuthService.addUser({ username: 'alice', password: 'correctpassword' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('alice:wrongpassword').toString('base64');
    const res = await request(app)
      .get('/admin/login')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(401);
  });

  test('8. Disabled user is rejected with 401', async () => {
    await basicAuthService.addUser({ username: 'active_one', password: 'password123' });
    await basicAuthService.addUser({ username: 'disabled_user', password: 'password123', disabled: true });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('disabled_user:password123').toString('base64');
    const res = await request(app)
      .get('/admin/login')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(401);
  });

  test('9. Malformed headers (no colon, non-base64, empty username) return 401', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    // Missing colon
    const noColon = Buffer.from('justausername').toString('base64');
    const res1 = await request(app).get('/admin/login').set('Authorization', `Basic ${noColon}`);
    expect(res1.status).toBe(401);

    // Empty username (:password)
    const emptyUser = Buffer.from(':password123').toString('base64');
    const res2 = await request(app).get('/admin/login').set('Authorization', `Basic ${emptyUser}`);
    expect(res2.status).toBe(401);

    // Not Basic scheme
    const res3 = await request(app).get('/admin/login').set('Authorization', 'Bearer sometoken');
    expect(res3.status).toBe(401);
  });

  test('10. /health endpoint is NEVER intercepted by Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
  });

  test('11. ipAllowlist bypasses Basic Auth on Admin CMS', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({
      enabled: true,
      ipAllowlist: ['127.0.0.1'],
    });

    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
  });

  test('12. Anti-brute-force rate limiting locks out after 5 consecutive failures', async () => {
    await basicAuthService.addUser({ username: 'victim', password: 'correctpassword' });
    await basicAuthService.updateConfig({ enabled: true });

    const badToken = Buffer.from('victim:wrongpass').toString('base64');

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/admin/login').set('Authorization', `Basic ${badToken}`);
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked with 429
    const lockRes = await request(app).get('/admin/login').set('Authorization', `Basic ${badToken}`);
    expect(lockRes.status).toBe(429);
    expect(lockRes.headers['retry-after']).toBeDefined();
    expect(lockRes.text).toContain('Quá nhiều lần đăng nhập sai');
  });

  test('13. BASIC_AUTH_ENABLED=false env emergency override disables Basic Auth immediately', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    // Set emergency env override
    process.env.BASIC_AUTH_ENABLED = 'false';

    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
  });
});
