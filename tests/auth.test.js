const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const LaunchpadApp = require('../src/models/LaunchpadApp');

describe('GĐ 1 - Authentication & Launchpad Tests', () => {
  let mongoServer;
  let adminRole;
  let authorRole;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed roles
    adminRole = await Role.create({
      name: 'Administrator',
      description: 'System Administrator',
      isSystem: true,
    });

    authorRole = await Role.create({
      name: 'Author',
      description: 'Content Author',
      isSystem: true,
    });

    // Seed admin user
    const adminPasswordHash = await User.hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@treecraft.local',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      roles: [adminRole._id],
      isActive: true,
    });

    // Seed author user
    const authorPasswordHash = await User.hashPassword('author123');
    await User.create({
      username: 'author',
      email: 'author@treecraft.local',
      passwordHash: authorPasswordHash,
      fullName: 'Jane Author',
      roles: [authorRole._id],
      isActive: true,
    });

    // Seed test apps
    await LaunchpadApp.create([
      {
        name: 'Content Editor',
        description: 'Edit content tree',
        icon: '📑',
        iconBg: 'blue',
        group: 'Content Editing',
        url: '/admin/content-editor',
        sortOrder: 1,
        allowedRoles: [adminRole._id, authorRole._id],
      },
      {
        name: 'User Manager',
        description: 'Manage users',
        icon: '👥',
        iconBg: 'purple',
        group: 'Access Management',
        url: '#',
        sortOrder: 2,
        allowedRoles: [adminRole._id],
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('GET /admin/login should return 200 with login form', async () => {
    const res = await request(app).get('/admin/login');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Treecraft Content Management');
    expect(res.text).toContain('User name');
    expect(res.text).toContain('Password');
    expect(res.text).toContain('Log in');
  });

  it('GET /admin/launchpad without login should redirect to /admin/login', async () => {
    const res = await request(app).get('/admin/launchpad');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/login');
    expect(res.headers.location).toContain('returnUrl=%2Fadmin%2Flaunchpad');
  });

  it('GET /admin/content-editor without login should redirect to /admin/login', async () => {
    const res = await request(app).get('/admin/content-editor');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/login');
  });

  it('POST /admin/login with incorrect credentials should fail and display error', async () => {
    const res = await request(app)
      .post('/admin/login')
      .type('form')
      .send({
        username: 'admin',
        password: 'wrong_password',
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Invalid username or password');
  });

  it('POST /admin/login with correct admin credentials should set session and redirect to /admin/launchpad', async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post('/admin/login')
      .type('form')
      .send({
        username: 'admin',
        password: 'admin123',
      });

    expect(loginRes.status).toBe(302);
    expect(loginRes.headers.location).toBe('/admin/launchpad');

    // Access protected Launchpad using the authenticated session
    const launchpadRes = await agent.get('/admin/launchpad');
    expect(launchpadRes.status).toBe(200);
    expect(launchpadRes.text).toContain('System Administrator');
    expect(launchpadRes.text).toContain('Content Editor');
    expect(launchpadRes.text).toContain('User Manager'); // Admin can see User Manager

    // Access Content Editor using the authenticated session
    const editorRes = await agent.get('/admin/content-editor');
    expect(editorRes.status).toBe(200);
    expect(editorRes.text).toContain('home');

    // Logout
    const logoutRes = await agent.post('/admin/logout');
    expect(logoutRes.status).toBe(302);
    expect(logoutRes.headers.location).toBe('/admin/login');

    // Accessing Launchpad again should redirect to login
    const afterLogoutRes = await agent.get('/admin/launchpad');
    expect(afterLogoutRes.status).toBe(302);
    expect(afterLogoutRes.headers.location).toContain('/admin/login');
  });

  it('Role filtering: Author should see Content Editor but NOT User Manager', async () => {
    const agent = request.agent(app);

    await agent
      .post('/admin/login')
      .type('form')
      .send({
        username: 'author',
        password: 'author123',
      });

    const launchpadRes = await agent.get('/admin/launchpad');
    expect(launchpadRes.status).toBe(200);
    expect(launchpadRes.text).toContain('Jane Author');
    expect(launchpadRes.text).toContain('Content Editor');
    expect(launchpadRes.text).not.toContain('User Manager'); // Author does not have access
  });
});

