'use strict';

/**
 * Maintenance Mode & Middleware Test Suite (GĐ K1 / DEC-051)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const maintenanceService = require('../src/services/maintenanceService');
const PublishedItem = require('../src/models/PublishedItem');
const branding = require('../src/config/branding');

describe('GĐ K1 — Maintenance Mode Middleware (HTTP 503 & Admin Lock)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // Create home item for public site
    const dummyId = new mongoose.Types.ObjectId();
    const dummyTplId = new mongoose.Types.ObjectId();
    await PublishedItem.create({
      _id: dummyId,
      name: 'home',
      templateId: dummyTplId,
      path: branding.PATHS.HOME,
      languages: [{ code: 'vi', publishedVersion: 1 }],
      isDeleted: false,
    });
  });

  afterAll(async () => {
    await maintenanceService.setMaintenanceMode(false).catch(() => {});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('When Maintenance Mode is OFF', () => {
    beforeEach(async () => {
      await maintenanceService.setMaintenanceMode(false);
    });

    test('public site request is served without 503', async () => {
      const res = await request(app).get('/');
      expect(res.status).not.toBe(503);
    });

    test('health check returns 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  describe('When Maintenance Mode is ON', () => {
    beforeEach(async () => {
      await maintenanceService.setMaintenanceMode(true, 'Test nâng cấp cơ sở dữ liệu');
    });

    afterEach(async () => {
      await maintenanceService.setMaintenanceMode(false);
    });

    test('public site request returns HTTP 503 with Retry-After header', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(503);
      expect(res.headers['retry-after']).toBe('300');
      expect(res.text).toContain('Hệ thống đang bảo trì');
    });

    test('admin mutating POST request returns HTTP 503 JSON', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Should Be Blocked' });

      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('code', 'MAINTENANCE_MODE');
      expect(res.body.success).toBe(false);
    });

    test('whitelisted route /admin/login is accessible during maintenance', async () => {
      const res = await request(app).get('/admin/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Treecraft Content Management');
    });

    test('whitelisted route /api/backups is accessible during maintenance (not blocked by 503)', async () => {
      // /api/backups requires auth so without auth it returns 302 or 401/403, NOT 503!
      const res = await request(app).get('/api/backups');
      expect(res.status).not.toBe(503);
    });
  });
});
