'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const branding = require('../src/config/branding');

const TEST_SERIALIZATION_DIR = path.join(__dirname, '../test_serialization_api');

describe('GĐ 11-Y2 — Section-Based YAML Sync Admin & API Tests', () => {
  let mongoServer;
  let adminAgent;
  let editorAgent;
  let testTemplate;

  beforeAll(async () => {
    process.env.SERIALIZATION_DIR = 'test_serialization_api';

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

    testTemplate = await Template.create({
      name: 'ApiArticle',
      displayName: 'API Article Template',
      path: `${branding.PATHS.TEMPLATES}/ApiArticle`,
      sections: [],
    });

    await Item.create({
      _id: testTemplate._id,
      name: 'ApiArticle',
      displayName: 'API Article Template',
      path: `${branding.PATHS.TEMPLATES}/ApiArticle`,
      templateId: testTemplate._id,
    });

    await Item.create({
      name: 'Welcome',
      displayName: 'Welcome Page',
      path: `${branding.PATHS.CONTENT}/Welcome`,
      templateId: testTemplate._id,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(TEST_SERIALIZATION_DIR)) {
      fs.rmSync(TEST_SERIALIZATION_DIR, { recursive: true, force: true });
    }
    delete process.env.SERIALIZATION_DIR;
  });

  describe('1. View /admin/serialization with 3 Tabs', () => {
    test('Administrator sees Tab 3 "YAML Sync" and all 3 tabs', async () => {
      const res = await adminAgent.get('/admin/serialization');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Xuất Gói (Export Package)');
      expect(res.text).toContain('Nhập Gói (Import Package)');
      expect(res.text).toContain('YAML Sync');
      expect(res.text).toContain('tab-yaml-sync');
      expect(res.text).toContain('yamlSectionsList');
      expect(res.text).toContain('yamlSyncModal');
    });
  });

  describe('2. API /api/serialization/sections', () => {
    test('GET /api/serialization/sections returns list of 4 sections with comparison stats', async () => {
      const res = await adminAgent.get('/api/serialization/sections');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.sections)).toBe(true);
      expect(res.body.sections.length).toBe(5);

      const keys = res.body.sections.map((s) => s.key);
      expect(keys).toContain('template');
      expect(keys).toContain('layout');
      expect(keys).toContain('placeholder');
      expect(keys).toContain('rendering');
      expect(keys).toContain('content');
    });

    test('POST /api/serialization/sections/:key/reserialize executes reserialize', async () => {
      const res = await adminAgent
        .post('/api/serialization/sections/template/reserialize')
        .send({ pruneOrphans: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toBeTruthy();
      expect(res.body.result.totalItems).toBeGreaterThanOrEqual(1);
    });

    test('POST /api/serialization/sections/:key/sync/dry-run returns hash and analysis', async () => {
      const res = await adminAgent
        .post('/api/serialization/sections/template/sync/dry-run')
        .send({ mode: 'overwrite' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toBeTruthy();
      expect(res.body.result.hash).toBeTruthy();
      expect(res.body.result.totalFiles).toBeGreaterThanOrEqual(1);
    });

    test('POST /api/serialization/sections/:key/sync executes sync into DB', async () => {
      // 1. Dry run to get hash
      const dryRes = await adminAgent
        .post('/api/serialization/sections/template/sync/dry-run')
        .send({ mode: 'overwrite' });

      const hash = dryRes.body.result.hash;

      // 2. Sync with valid hash
      const syncRes = await adminAgent
        .post('/api/serialization/sections/template/sync')
        .send({ mode: 'overwrite', dryRunHash: hash });

      expect(syncRes.status).toBe(200);
      expect(syncRes.body.success).toBe(true);
      expect(syncRes.body.result.totalFiles).toBeGreaterThanOrEqual(1);
    });

    test('Non-admin without permission is forbidden (403)', async () => {
      const res = await editorAgent
        .post('/api/serialization/sections/template/reserialize')
        .send({});

      expect(res.status).toBe(403);
    });
  });
});

