'use strict';

/**
 * Backup & Restore API & UI Routes Test Suite (GĐ K1 / DEC-051)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const backupService = require('../src/services/backupService');
const LocalStorageProvider = require('../src/services/backup/LocalStorageProvider');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const path = require('path');
const os = require('os');
const fsp = require('fs').promises;

describe('GĐ K1 — Backup Admin & API Endpoints', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;
  let testBackupDir;
  let testBackupId;

  beforeAll(async () => {
    testBackupDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-api-test-'));

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    backupService.storage = new LocalStorageProvider(testBackupDir);
    await backupService.init();

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

    // Pre-create 1 backup for testing
    const created = await backupService.createBackup({
      note: 'API test seed',
      type: 'full',
      engine: 'ndjson',
      user: { username: 'admin' },
    });
    testBackupId = created.backupId;
  });

  afterAll(async () => {
    backupService.stopScheduler();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (testBackupDir) {
      await fsp.rm(testBackupDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Authentication & Authorization', () => {
    test('unauthenticated access to /admin/backups redirects to /admin/login', async () => {
      const res = await request(app).get('/admin/backups');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/admin/login');
    });

    test('editor user is forbidden from /api/backups (403)', async () => {
      const res = await editorAgent.get('/api/backups');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('admin user can access /admin/backups HTML view (200)', async () => {
      const res = await adminAgent.get('/admin/backups');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Quản lý Sao lưu & Phục hồi Cơ sở Dữ liệu');
      expect(res.text).toContain(testBackupId);
    });

    test('admin user can retrieve backup list from /api/backups (200 JSON)', async () => {
      const res = await adminAgent.get('/api/backups');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('admin user can retrieve specific backup details (200 JSON)', async () => {
      const res = await adminAgent.get(`/api/backups/${testBackupId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.backupId).toBe(testBackupId);
      expect(res.body.data.manifest).toBeDefined();
    });
  });

  describe('Download Streaming & Path Traversal Guard', () => {
    test('admin can stream download backup as tar.gz', async () => {
      const res = await adminAgent.get(`/api/backups/${testBackupId}/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/gzip');
      expect(res.headers['content-disposition']).toContain(`attachment; filename="${testBackupId}.tar.gz"`);
    });

    test('rejects path traversal attempts on download endpoint', async () => {
      const res = await adminAgent.get('/api/backups/..%2F..%2Fhack/download');
      // Should reject with 400 ValidationError or 404
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  describe('Maintenance Toggle Endpoint', () => {
    test('editor is forbidden from toggling maintenance mode', async () => {
      const res = await editorAgent
        .post('/api/backups/maintenance')
        .send({ enabled: true });
      expect(res.status).toBe(403);
    });

    test('admin can toggle maintenance mode ON and OFF via API', async () => {
      const turnOnRes = await adminAgent
        .post('/api/backups/maintenance')
        .send({ enabled: true, reason: 'API Test Mode' });
      expect(turnOnRes.status).toBe(200);
      expect(turnOnRes.body.success).toBe(true);
      expect(turnOnRes.body.data.enabled).toBe(true);

      const turnOffRes = await adminAgent
        .post('/api/backups/maintenance')
        .send({ enabled: false });
      expect(turnOffRes.status).toBe(200);
      expect(turnOffRes.body.success).toBe(true);
      expect(turnOffRes.body.data.enabled).toBe(false);
    });
  });
});

