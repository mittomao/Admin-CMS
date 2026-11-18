const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');

describe('Task 12.D3: Liveness & Readiness Probes (/health & /ready)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
  });

  afterAll(async () => {
    app.locals.isShuttingDown = false;
    await mongoose.disconnect();
  });

  describe('GET /health (Liveness Probe)', () => {
    it('should return 200 OK with server uptime and status: ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return 503 Service Unavailable when server is shutting down', async () => {
      app.locals.isShuttingDown = true;
      const res = await request(app).get('/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('shutting_down');
      app.locals.isShuttingDown = false;
    });
  });

  describe('GET /ready (Readiness Probe)', () => {
    it('should return 200 OK when database is connected and active', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBeDefined();
      expect(res.body.database.status).toBe('connected');
      expect(typeof res.body.database.collectionsCount).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return 503 when server is shutting down', async () => {
      app.locals.isShuttingDown = true;
      const res = await request(app).get('/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      app.locals.isShuttingDown = false;
    });
  });
});
