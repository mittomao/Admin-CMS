'use strict';

/**
 * Basic Auth Middleware Test Suite (GĐ B1 / DEC-046)
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

describe('GĐ B1 — basicAuthMiddleware (RFC 7617)', () => {
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

    // Create Home item in Web store so GET / returns 200 when authorized
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

  test('1. When Basic Auth is OFF: public site is accessible freely (no 401)', async () => {
    await Setting.create({
      key: 'basicAuth',
      value: { enabled: false },
      updatedBy: 'test',
    });

    const res = await request(app).get('/');
    expect(res.status).not.toBe(401);
  });

  test('2. When Basic Auth is ON: request without Authorization header returns 401 + WWW-Authenticate', async () => {
    // Add user and enable
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true, realm: 'Treecraft UAT' });

    const res = await request(app).get('/');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Basic realm="Treecraft UAT"');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.text).toContain('401 - Yêu Cầu Xác Thực');
  });

  test('3. When Basic Auth is ON: valid credentials return 200 OK + private Cache-Control', async () => {
    await basicAuthService.addUser({ username: 'john_doe', password: 'my:secret:password' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('john_doe:my:secret:password').toString('base64');
    const res = await request(app)
      .get('/')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('private');
  });

  test('4. Case-insensitive username authentication succeeds', async () => {
    await basicAuthService.addUser({ username: 'mhr_admin', password: 'secretpassword123' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('MHR_ADMIN:secretpassword123').toString('base64');
    const res = await request(app)
      .get('/')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(200);
  });

  test('5. Wrong password returns 401', async () => {
    await basicAuthService.addUser({ username: 'alice', password: 'correctpassword' });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('alice:wrongpassword').toString('base64');
    const res = await request(app)
      .get('/')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(401);
  });

  test('6. Disabled user is rejected with 401', async () => {
    await basicAuthService.addUser({ username: 'active_one', password: 'password123' });
    await basicAuthService.addUser({ username: 'disabled_user', password: 'password123', disabled: true });
    await basicAuthService.updateConfig({ enabled: true });

    const token = Buffer.from('disabled_user:password123').toString('base64');
    const res = await request(app)
      .get('/')
      .set('Authorization', `Basic ${token}`);

    expect(res.status).toBe(401);
  });

  test('7. Malformed headers (no colon, non-base64, empty username) return 401', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    // Missing colon
    const noColon = Buffer.from('justausername').toString('base64');
    const res1 = await request(app).get('/').set('Authorization', `Basic ${noColon}`);
    expect(res1.status).toBe(401);

    // Empty username (:password)
    const emptyUser = Buffer.from(':password123').toString('base64');
    const res2 = await request(app).get('/').set('Authorization', `Basic ${emptyUser}`);
    expect(res2.status).toBe(401);

    // Not Basic scheme
    const res3 = await request(app).get('/').set('Authorization', 'Bearer sometoken');
    expect(res3.status).toBe(401);
  });

  test('8. /health and /admin routes are NEVER intercepted by Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const adminRes = await request(app).get('/admin/login');
    expect(adminRes.status).not.toBe(401);
  });

  test('9. excludePaths bypass Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({
      enabled: true,
      excludePaths: ['/health', '/robots.txt', '/about-us'],
    });

    const res = await request(app).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Disallow: /');
  });

  test('10. ipAllowlist bypasses Basic Auth', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({
      enabled: true,
      ipAllowlist: ['127.0.0.1'],
    });

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test('11. Anti-brute-force rate limiting locks out after 5 consecutive failures', async () => {
    await basicAuthService.addUser({ username: 'victim', password: 'correctpassword' });
    await basicAuthService.updateConfig({ enabled: true });

    const badToken = Buffer.from('victim:wrongpass').toString('base64');

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/').set('Authorization', `Basic ${badToken}`);
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked with 429
    const lockRes = await request(app).get('/').set('Authorization', `Basic ${badToken}`);
    expect(lockRes.status).toBe(429);
    expect(lockRes.headers['retry-after']).toBeDefined();
    expect(lockRes.text).toContain('Quá nhiều lần đăng nhập sai');
  });

  test('12. BASIC_AUTH_ENABLED=false env emergency override disables Basic Auth immediately', async () => {
    await basicAuthService.addUser({ username: 'tester', password: 'password123' });
    await basicAuthService.updateConfig({ enabled: true });

    // Set emergency env override
    process.env.BASIC_AUTH_ENABLED = 'false';

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
});
