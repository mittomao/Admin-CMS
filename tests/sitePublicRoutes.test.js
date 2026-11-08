const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const PublishedItem = require('../src/models/PublishedItem');
const User = require('../src/models/User');
const Item = require('../src/models/Item');
const renderCache = require('../src/utils/renderCache');

describe('GĐ 10: Public Site HTTP Routes & Delivery Integration Tests', () => {
  let mongoServer;
  let adminCookie;
  let homeMaster;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const dummyTplId = new mongoose.Types.ObjectId();

    // Seed Layout and Renderings in Web & Master
    const layout = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'HomeLayout',
      displayName: 'Home Layout',
      templateId: dummyTplId,
      path: '/root/layout/Layouts/HomeLayout',
      sharedFields: { viewPath: 'layouts/HomeLayout.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });
    await Item.create({
      _id: layout._id,
      name: 'HomeLayout',
      displayName: 'Home Layout',
      templateId: dummyTplId,
      path: '/root/layout/Layouts/HomeLayout',
      fields: new Map([['viewPath', 'layouts/HomeLayout.ejs']]),
      sharedFields: new Map([['viewPath', 'layouts/HomeLayout.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });

    const heroRendering = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: dummyTplId,
      path: '/root/layout/Renderings/HeroBanner',
      sharedFields: { viewPath: 'components/HeroBanner.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });
    await Item.create({
      _id: heroRendering._id,
      name: 'HeroBanner',
      displayName: 'Hero Banner',
      templateId: dummyTplId,
      path: '/root/layout/Renderings/HeroBanner',
      fields: new Map([['viewPath', 'components/HeroBanner.ejs']]),
      sharedFields: new Map([['viewPath', 'components/HeroBanner.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });

    const introRendering = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Introduction',
      displayName: 'Introduction',
      templateId: dummyTplId,
      path: '/root/layout/Renderings/Introduction',
      sharedFields: { viewPath: 'components/Introduction.ejs' },
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });
    await Item.create({
      _id: introRendering._id,
      name: 'Introduction',
      displayName: 'Introduction',
      templateId: dummyTplId,
      path: '/root/layout/Renderings/Introduction',
      fields: new Map([['viewPath', 'components/Introduction.ejs']]),
      sharedFields: new Map([['viewPath', 'components/Introduction.ejs']]),
      languages: [{ code: 'vi', version: 1, fields: new Map() }],
    });

    // Seed Published Pages in Web
    const rootNode = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'root',
      templateId: dummyTplId,
      path: '/root',
      isSystem: true,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    const content = await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'content',
      templateId: dummyTplId,
      parentId: rootNode._id,
      path: '/root/content',
      isSystem: true,
      languages: [{ code: 'vi', publishedVersion: 1 }],
    });

    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'Home',
      displayName: 'Trang Chủ',
      templateId: dummyTplId,
      parentId: content._id,
      path: '/root/content/Home',
      presentation: {
        shared: {
          layoutId: layout._id,
          renderings: [
            {
              uid: 'hero-1',
              renderingId: heroRendering._id,
              placeholderKey: 'maincontent',
              sortOrder: 100,
            },
          ],
        },
      },
      languages: [
        {
          code: 'vi',
          publishedVersion: 1,
          fields: {
            PageTitle: 'Trang Chủ Treecraft',
            HeroTitle: 'Trải Nghiệm Đỉnh Cao',
          },
        },
        {
          code: 'en',
          publishedVersion: 1,
          fields: {
            PageTitle: 'Home Treecraft',
            HeroTitle: 'Ultimate Experience',
          },
        },
      ],
    });

    await PublishedItem.create({
      _id: new mongoose.Types.ObjectId(),
      name: 'About us',
      displayName: 'Về chúng tôi',
      templateId: dummyTplId,
      parentId: content._id,
      path: '/root/content/About us',
      presentation: {
        shared: {
          layoutId: layout._id,
          renderings: [
            {
              uid: 'intro-1',
              renderingId: introRendering._id,
              placeholderKey: 'maincontent',
              sortOrder: 100,
            },
          ],
        },
      },
      languages: [
        {
          code: 'vi',
          publishedVersion: 1,
          fields: {
            PageTitle: 'Về Chúng Tôi',
            IntroHeading: 'Giới Thiệu Đội Ngũ',
          },
        },
      ],
    });

    // Seed Master Page for Preview
    homeMaster = await Item.create({
      name: 'Home',
      displayName: 'Trang Chủ Master',
      templateId: dummyTplId,
      path: '/root/content/Home',
      presentation: {
        shared: {
          layoutId: layout._id,
          renderings: [
            {
              uid: 'hero-master-1',
              renderingId: heroRendering._id,
              placeholderKey: 'maincontent',
              sortOrder: 100,
            },
          ],
        },
      },
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([
                ['PageTitle', 'Trang Chủ Master Preview'],
                ['HeroTitle', 'Tiêu Đề Master Preview'],
              ]),
            },
          ],
        },
      ],
    });

    // Create Admin Role & User
    const Role = require('../src/models/Role');
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'admin', description: 'Administrator' });
    }

    const passwordHash = await User.hashPassword('password123');
    await User.create({
      username: 'admin',
      fullName: 'System Administrator',
      email: 'admin@treecraft.local',
      passwordHash,
      roles: [adminRole._id],
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/admin/login')
      .send({ username: 'admin', password: 'password123' });

    adminCookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(() => {
    renderCache.clear();
  });

  it('GET / should render the published Home page (HTTP 200)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Trải Nghiệm Đỉnh Cao');
    expect(res.headers).toHaveProperty('etag');
  });

  it('GET /about-us should render the published About us page (HTTP 200)', async () => {
    const res = await request(app).get('/about-us');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Giới Thiệu Đội Ngũ');
  });

  it('GET /en/ should render English Home page', async () => {
    const res = await request(app).get('/en/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Ultimate Experience');
  });

  it('GET /robots.txt should return valid robots.txt with sitemap reference', async () => {
    const res = await request(app).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('User-agent: *');
    expect(res.text).toContain('Sitemap:');
  });

  it('GET /sitemap.xml should return valid sitemap XML with published pages', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('<urlset');
    expect(res.text).toContain('<loc>');
  });

  it('GET /unknown-page should return custom 404 HTML view', async () => {
    const res = await request(app).get('/unknown-page');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Lỗi 404');
    expect(res.text).toContain('Không tìm thấy trang');
  });

  it('POST /about-us should return 405 Method Not Allowed with Allow header', async () => {
    const res = await request(app).post('/about-us');
    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain('GET');
  });

  it('Conditional GET with If-None-Match should return 304 Not Modified', async () => {
    const firstRes = await request(app).get('/');
    const etag = firstRes.headers.etag;
    expect(etag).toBeTruthy();

    const secondRes = await request(app)
      .get('/')
      .set('If-None-Match', etag);

    expect(secondRes.status).toBe(304);
  });

  it('GET /admin/preview should render Master Preview with sticky banner for admin', async () => {
    const res = await request(app)
      .get(`/admin/preview?id=${homeMaster._id}&lang=vi`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('id="treecraftPreviewBanner"');
    expect(res.text).toContain('Treecraft Preview Mode');
    expect(res.text).toContain('Tiêu Đề Master Preview');
  });

  it('GET /admin/preview without session should redirect to /admin/login', async () => {
    const res = await request(app).get(`/admin/preview?id=${homeMaster._id}&lang=vi`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/login');
  });
});
