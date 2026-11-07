const request = require('supertest');
const app = require('../src/app');

describe('Smoke Tests', () => {
  it('GET /health should return 200 and health status JSON', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET / should call Public Site Renderer (DEC-031 / GĐ 10)', async () => {
    const res = await request(app).get('/');
    expect([200, 404]).toContain(res.status);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('GET /admin/login should return 200 with Sitecore Login page', async () => {
    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Sitecore Experience Management');
    expect(res.text).toContain('User name');
  });

  it('GET /admin/launchpad without session should redirect to /admin/login', async () => {
    const res = await request(app).get('/admin/launchpad');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/login');
  });

  it('GET /api/unknown-endpoint should return 404 JSON', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });

  it('GET /unknown-page should return 404 HTML view', async () => {
    const res = await request(app).get('/unknown-page');
    expect(res.status).toBe(404);
    expect(res.text).toContain('404');
    expect(res.text).toContain('Item or Page Not Found');
  });
});
