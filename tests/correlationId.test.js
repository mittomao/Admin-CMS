const request = require('supertest');
const app = require('../src/app');

describe('Task 12.E1: Correlation ID & Logger Hardening', () => {
  it('should generate X-Correlation-ID header if not provided', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.headers['x-correlation-id'].length).toBeGreaterThan(10);
  });

  it('should echo back existing X-Correlation-ID header from upstream proxy', async () => {
    const customId = 'custom-request-uuid-12345';
    const res = await request(app)
      .get('/health')
      .set('X-Correlation-ID', customId);
    expect(res.headers['x-correlation-id']).toBe(customId);
  });
});
