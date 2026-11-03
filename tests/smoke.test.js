const request = require('supertest');
const app = require('../src/app');

describe('GĐ 0 - Smoke Tests', () => {
  it('GET /health should return 200 and health status JSON', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET / should redirect to /admin/launchpad', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/launchpad');
  });

  it('GET /admin/launchpad should return 200 with Sitecore Launchpad UI', async () => {
    const res = await request(app).get('/admin/launchpad');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Sitecore Launchpad');
    expect(res.text).toContain('Content Editing');
    expect(res.text).toContain('Content Editor');
  });

  it('GET /admin/content-editor should return 200 with Ribbon and 3-pane UI', async () => {
    const res = await request(app).get('/admin/content-editor');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Content Editor');
    expect(res.text).toContain('Ribbon');
    expect(res.text).toContain('sitecore');
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

