const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const renderCache = require('../src/utils/renderCache');

describe('Task 12.E2: System Health, Control Panel & Cache Purge', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should deny unauthorized access to /admin/control-panel', async () => {
    const res = await request(app).get('/admin/control-panel');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/login');
  });

  it('should render Control Panel as an active link on Launchpad and render dashboard', async () => {
    const agent = request.agent(app);

    // Login as admin
    const loginRes = await agent
      .post('/admin/login')
      .type('form')
      .send({
        username: 'admin',
        password: 'admin123',
      });
    expect(loginRes.status).toBe(302);

    // Verify Launchpad has active link to /admin/control-panel
    const launchpadRes = await agent.get('/admin/launchpad');
    expect(launchpadRes.status).toBe(200);
    expect(launchpadRes.text).toContain('href="/admin/control-panel"');
    expect(launchpadRes.text).not.toContain("alert('Control Panel sẽ được phát triển trong các giai đoạn tiếp theo');");

    // Verify /admin/control-panel renders dashboard
    const cpRes = await agent.get('/admin/control-panel');
    expect(cpRes.status).toBe(200);
    expect(cpRes.text).toContain('System Health &amp; Control Panel');
    expect(cpRes.text).toContain('Trạng thái Cơ sở Dữ liệu MongoDB');
    expect(cpRes.text).toContain('Bộ nhớ đệm Render Cache');
  });

  it('should successfully clear render cache via clearCache method and verify state', () => {
    renderCache.set('site:test-item:vi:1', '<html>Test Page</html>');
    expect(renderCache.size()).toBeGreaterThan(0);

    renderCache.clear();
    expect(renderCache.size()).toBe(0);
  });
});
