'use strict';

/**
 * Integration Test Suite for Language API & Admin Endpoints (GĐ L1 / DEC-048)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const languageService = require('../src/services/languageService');

describe('GĐ L1 — Language API & Admin Endpoints Integration Tests', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;
  let adminCsrfToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // 1. Initialize roles & users
    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const editorRole = await Role.create({ name: 'Editor', isSystem: true });

    const passwordHash = await User.hashPassword('Pass123456');

    await User.create({
      username: 'admin_test',
      email: 'admin@treecraft.test',
      fullName: 'Administrator',
      passwordHash,
      roles: [adminRole._id],
    });

    await User.create({
      username: 'editor_test',
      email: 'editor@treecraft.test',
      fullName: 'Editor User',
      passwordHash,
      roles: [editorRole._id],
    });

    // 2. Ensure system structure
    await languageService.ensureSystemStructure();

    // 3. Authenticate agents
    adminAgent = request.agent(app);
    editorAgent = request.agent(app);

    await adminAgent
      .post('/admin/login')
      .send({ username: 'admin_test', password: 'Pass123456' });

    await editorAgent
      .post('/admin/login')
      .send({ username: 'editor_test', password: 'Pass123456' });

    // 4. Fetch CSRF token
    const res = await adminAgent.get('/admin/languages');
    const match = res.text.match(/name="_csrf"\s+value="([^"]+)"/) || res.text.match(/csrfToken\s*=\s*['"]([^'"]+)['"]/);
    adminCsrfToken = match ? match[1] : '';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('1. HTML Shell Endpoint: GET /admin/languages', () => {
    it('allows Administrator to access the Language Manager UI', async () => {
      const res = await adminAgent.get('/admin/languages');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Quản lý Ngôn ngữ');
      expect(res.text).toContain('Language Manager');
    });

    it('denies non-admin (Editor) access with 403 Forbidden', async () => {
      const res = await editorAgent.get('/admin/languages');
      expect(res.status).toBe(403);
    });

    it('redirects unauthenticated users to login page', async () => {
      const res = await request(app).get('/admin/languages');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('/admin/login');
    });
  });

  describe('2. Read Endpoints: GET /api/languages & /:code', () => {
    it('returns JSON list of languages for authenticated users', async () => {
      const res = await adminAgent.get('/api/languages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((l) => l.code === 'vi')).toBe(true);
    });

    it('returns specific language by code', async () => {
      const res = await adminAgent.get('/api/languages/vi');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('vi');
      expect(res.body.data.displayName).toBe('Tiếng Việt');
    });

    it('returns 404 for non-existent language code', async () => {
      const res = await adminAgent.get('/api/languages/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Create & Validate: POST /api/languages', () => {
    it('successfully creates a new language', async () => {
      const res = await adminAgent
        .post('/api/languages')
        .set('CSRF-Token', adminCsrfToken)
        .send({
          code: 'fr-FR',
          displayName: 'French (France)',
          nativeName: 'Français',
          direction: 'ltr',
          fallbackLanguage: 'en',
          sortOrder: 40,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('fr-FR');
      expect(res.body.data.displayName).toBe('French (France)');
    });

    it('rejects invalid BCP 47 code with 400 Bad Request', async () => {
      const res = await adminAgent
        .post('/api/languages')
        .set('CSRF-Token', adminCsrfToken)
        .send({
          code: 'invalid_code!!',
          displayName: 'Invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate language code with 409 Conflict', async () => {
      const res = await adminAgent
        .post('/api/languages')
        .set('CSRF-Token', adminCsrfToken)
        .send({
          code: 'FR-fr',
          displayName: 'Duplicate French',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Update & Immutability: PUT /api/languages/:code', () => {
    it('updates mutable attributes', async () => {
      const res = await adminAgent
        .put('/api/languages/fr-FR')
        .set('CSRF-Token', adminCsrfToken)
        .send({
          displayName: 'French Modern',
          nativeName: 'Français Moderne',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.displayName).toBe('French Modern');
    });

    it('rejects attempts to change the immutable code', async () => {
      const res = await adminAgent
        .put('/api/languages/fr-FR')
        .set('CSRF-Token', adminCsrfToken)
        .send({
          code: 'fr-CA',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Enable, Disable & Default Actions', () => {
    it('disables a non-default language via /disable', async () => {
      const res = await adminAgent
        .post('/api/languages/fr-FR/disable')
        .set('CSRF-Token', adminCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(false);
    });

    it('enables the language back via /enable', async () => {
      const res = await adminAgent
        .post('/api/languages/fr-FR/enable')
        .set('CSRF-Token', adminCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.data.enabled).toBe(true);
    });

    it('cannot disable the system default language', async () => {
      const res = await adminAgent
        .post('/api/languages/vi/disable')
        .set('CSRF-Token', adminCsrfToken);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('changes system default language via POST /api/languages/default', async () => {
      const res = await adminAgent
        .post('/api/languages/default')
        .set('CSRF-Token', adminCsrfToken)
        .send({ code: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Revert back to vi
      await adminAgent
        .post('/api/languages/default')
        .set('CSRF-Token', adminCsrfToken)
        .send({ code: 'vi' });
    });
  });

  describe('6. Reorder, Usage & Safe Deletion', () => {
    it('reorders languages via PUT /api/languages/reorder', async () => {
      const res = await adminAgent
        .put('/api/languages/reorder')
        .set('CSRF-Token', adminCsrfToken)
        .send({ order: ['vi', 'en', 'fr-FR'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('fetches usage stats via GET /api/languages/:code/usage', async () => {
      const res = await adminAgent.get('/api/languages/fr-FR/usage');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data.total).toBe(0);
    });

    it('safely deletes an unused language via DELETE /api/languages/:code', async () => {
      const res = await adminAgent
        .delete('/api/languages/fr-FR')
        .set('CSRF-Token', adminCsrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await adminAgent.get('/api/languages/fr-FR');
      expect(check.status).toBe(404);
    });

    it('rejects delete request without CSRF token (403)', async () => {
      const res = await adminAgent
        .delete('/api/languages/en')
        .set('x-csrf-check', 'true');
      expect(res.status).toBe(403);
    });
  });
});
