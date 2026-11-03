const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const Template = require('../src/models/Template');
const Item = require('../src/models/Item');
const Language = require('../src/models/Language');
const itemService = require('../src/services/itemService');
const templateService = require('../src/services/templateService');
const presentationService = require('../src/services/presentationService');
const { seedPresentationData } = require('../src/scripts/seed-presentation-data');

describe('GĐ 6 Bổ sung: Cây Item Layout trong Content Tree & Node Protection', () => {
  let mongoServer;
  let adminAgent;
  let authorAgent;
  let devAgent;
  let authorCsrfToken;
  let devCsrfToken;
  let seedResult;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    const adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    const authorRole = await Role.create({ name: 'Author', isSystem: true });
    const devRole = await Role.create({ name: 'Developer', isSystem: true });

    const passwordHash = await User.hashPassword('pass123');

    await User.create({
      username: 'admin',
      email: 'admin@sitecore.local',
      fullName: 'System Administrator',
      passwordHash,
      roles: [adminRole._id],
    });

    await User.create({
      username: 'author',
      email: 'author@sitecore.local',
      fullName: 'Content Author',
      passwordHash,
      roles: [authorRole._id],
    });

    await User.create({
      username: 'developer',
      email: 'dev@sitecore.local',
      fullName: 'CMS Developer',
      passwordHash,
      roles: [devRole._id],
    });

    await Language.create({ code: 'vi', name: 'Vietnamese', isDefault: true, active: true });
    await Language.create({ code: 'en', name: 'English', isDefault: false, active: true });

    const folderTpl = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      sections: [],
    });

    await Template.create({
      name: 'Page',
      displayName: 'Page',
      sections: [],
    });

    await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: folderTpl._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
    });

    // Run seed
    seedResult = await seedPresentationData();

    // Setup HTTP Agents
    adminAgent = request.agent(app);
    await adminAgent.post('/admin/login').send({ username: 'admin', password: 'pass123' });

    authorAgent = request.agent(app);
    await authorAgent.post('/admin/login').send({ username: 'author', password: 'pass123' });
    const authorPage = await authorAgent.get('/admin/content-editor');
    const authorMatch = authorPage.text.match(/name="csrf-token" content="([^"]+)"/);
    authorCsrfToken = authorMatch ? authorMatch[1] : '';

    devAgent = request.agent(app);
    await devAgent.post('/admin/login').send({ username: 'developer', password: 'pass123' });
    const devPage = await devAgent.get('/admin/content-editor');
    const devMatch = devPage.text.match(/name="csrf-token" content="([^"]+)"/);
    devCsrfToken = devMatch ? devMatch[1] : '';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // ========================================================
  // 1. Cấu trúc cây & Seed Idempotency
  // ========================================================
  test('Seed tạo đúng cấu trúc cây /sitecore/layout (Layouts, Renderings, Feature folder)', async () => {
    const layouts = await Item.findOne({ path: '/sitecore/layout/Layouts' }).populate('templateId');
    expect(layouts).not.toBeNull();
    expect(layouts.templateId.name).toBe('Layout Folder');
    expect(layouts.sortOrder).toBe(100);

    const renderings = await Item.findOne({ path: '/sitecore/layout/Renderings' }).populate('templateId');
    expect(renderings).not.toBeNull();
    expect(renderings.templateId.name).toBe('Rendering Folder');
    expect(renderings.sortOrder).toBe(200);

    const feature = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature' }).populate('templateId');
    expect(feature).not.toBeNull();
    expect(feature.templateId.name).toBe('Rendering Folder');

    const hero = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature/Hero' }).populate('templateId');
    expect(hero).not.toBeNull();
    expect(hero.templateId.name).toBe('Rendering');
  });

  test('Seed chạy lại không tạo trùng item, giữ nguyên ID', async () => {
    const heroBefore = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature/Hero' });
    const countBefore = await Item.countDocuments({ path: { $regex: '^/sitecore/layout' } });

    await seedPresentationData();

    const countAfter = await Item.countDocuments({ path: { $regex: '^/sitecore/layout' } });
    const heroAfter = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature/Hero' });

    expect(countAfter).toBe(countBefore);
    expect(heroAfter._id.toString()).toBe(heroBefore._id.toString());
  });

  // ========================================================
  // 2. Insert Options
  // ========================================================
  test('Insert options: Layouts chỉ cho phép Layout Folder và Layout', async () => {
    const layoutsNode = await Item.findOne({ path: '/sitecore/layout/Layouts' });
    const options = await templateService.getInsertOptions(layoutsNode._id);
    const names = options.map((o) => o.name);

    expect(names).toContain('Layout Folder');
    expect(names).toContain('Layout');
    expect(names).not.toContain('Rendering');
    expect(names).not.toContain('Page');
  });

  test('Insert options: Renderings chỉ cho phép Rendering Folder và Rendering', async () => {
    const renderingsNode = await Item.findOne({ path: '/sitecore/layout/Renderings' });
    const options = await templateService.getInsertOptions(renderingsNode._id);
    const names = options.map((o) => o.name);

    expect(names).toContain('Rendering Folder');
    expect(names).toContain('Rendering');
    expect(names).not.toContain('Layout');
  });

  test('Insert options: Layout item và Rendering item không cho tạo con thủ công', async () => {
    const hero = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature/Hero' });
    const options = await templateService.getInsertOptions(hero._id);
    expect(options).toEqual([]);

    const tpl = await Template.findOne({ name: 'Rendering' });
    await expect(
      itemService.createFromTemplate(hero._id, tpl._id, 'InvalidChild')
    ).rejects.toThrow('Không thể tạo item con dưới Rendering item.');
  });

  // ========================================================
  // 3. Bảo vệ Node Hệ Thống
  // ========================================================
  test('Bảo vệ node hệ thống: chặn xoá node /sitecore/layout, Layouts, Renderings', async () => {
    const layoutNode = await Item.findOne({ path: '/sitecore/layout' });
    await expect(itemService.delete(layoutNode._id)).rejects.toThrow(/Không thể xoá node hệ thống/);

    const layoutsFolder = await Item.findOne({ path: '/sitecore/layout/Layouts' });
    await expect(itemService.delete(layoutsFolder._id)).rejects.toThrow(/Không thể xoá node hệ thống/);

    const renderingsFolder = await Item.findOne({ path: '/sitecore/layout/Renderings' });
    await expect(itemService.delete(renderingsFolder._id)).rejects.toThrow(/Không thể xoá node hệ thống/);
  });

  test('Bảo vệ node hệ thống: chặn đổi tên và di chuyển', async () => {
    const layoutsFolder = await Item.findOne({ path: '/sitecore/layout/Layouts' });
    await expect(itemService.rename(layoutsFolder._id, 'NewLayouts')).rejects.toThrow(/Không thể đổi tên node hệ thống/);

    const root = await Item.findOne({ path: '/sitecore' });
    await expect(itemService.moveTo(layoutsFolder._id, root._id)).rejects.toThrow(/Không thể di chuyển node hệ thống/);
  });

  // ========================================================
  // 4. Chặn xoá component đang dùng & thư mục chứa component đang dùng
  // ========================================================
  test('Chặn xoá component đang dùng và chặn xoá thư mục chứa component đang dùng', async () => {
    const hero = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature/Hero' });
    await expect(itemService.delete(hero._id)).rejects.toThrow(/đang được sử dụng trong/);

    const featureFolder = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature' });
    await expect(itemService.delete(featureFolder._id)).rejects.toThrow(/đang được sử dụng trong/);
  });

  // ========================================================
  // 5. Di chuyển Layout/Rendering giữa các folder không làm gãy tham chiếu
  // ========================================================
  test('Di chuyển Layout/Rendering giữa các folder con không làm gãy tham chiếu', async () => {
    const renderingsFolder = await Item.findOne({ path: '/sitecore/layout/Renderings' });
    const renderingFolderTpl = await Template.findOne({ name: 'Rendering Folder' });
    const renderingTpl = await Template.findOne({ name: 'Rendering' });

    // Tạo thư mục mới dưới Renderings
    const customFolder = await itemService.createFromTemplate(
      renderingsFolder._id,
      renderingFolderTpl._id,
      'Custom'
    );

    // Tạo một Rendering mới trong Feature
    const featureFolder = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature' });
    const bannerRendering = await itemService.createFromTemplate(
      featureFolder._id,
      renderingTpl._id,
      'CustomBanner'
    );

    // Gán vào presentation của một item thử nghiệm
    const folderTpl = await Template.findOne({ name: 'Folder' });
    const pageItem = await Item.create({
      name: 'test-move-page',
      templateId: folderTpl._id,
      parentId: (await Item.findOne({ path: '/sitecore' }))._id,
      ancestors: [(await Item.findOne({ path: '/sitecore' }))._id],
      path: '/sitecore/test-move-page',
      presentation: {
        shared: {
          devices: [
            {
              deviceId: seedResult.defaultDevice._id,
              layoutId: seedResult.mainLayout._id,
              renderings: [
                {
                  uid: 'move-test-uid-1',
                  renderingId: bannerRendering._id,
                  placeholder: 'main',
                  sortOrder: 100,
                },
              ],
            },
          ],
        },
      },
    });

    // Di chuyển bannerRendering từ Feature sang Custom
    await itemService.moveTo(bannerRendering._id, customFolder._id);

    // Xác nhận đường dẫn mới
    const movedBanner = await Item.findById(bannerRendering._id);
    expect(movedBanner.path.toLowerCase()).toBe('/sitecore/layout/renderings/custom/custombanner');

    // Kiểm tra getFinalPresentation vẫn nhận diện bannerRendering
    const finalPres = await presentationService.getFinalPresentation(pageItem._id);
    expect(finalPres.renderings.length).toBe(1);
    expect(finalPres.renderings[0].renderingId.toString()).toBe(bannerRendering._id.toString());
    expect(finalPres.renderings[0].renderingName).toBe('custombanner');
  });

  // ========================================================
  // 6. Validation (validatePresentation)
  // ========================================================
  test('validatePresentation chặn lưu nếu Layout/Rendering không nằm đúng gốc', async () => {
    const folderTpl = await Template.findOne({ name: 'Folder' });
    const outsideItem = await Item.create({
      name: 'FakeComponent',
      templateId: folderTpl._id,
      parentId: (await Item.findOne({ path: '/sitecore' }))._id,
      ancestors: [(await Item.findOne({ path: '/sitecore' }))._id],
      path: '/sitecore/FakeComponent',
    });

    await expect(
      presentationService.validatePresentation({
        layoutId: outsideItem._id.toString(),
      })
    ).rejects.toThrow(/phải nằm dưới cây \/sitecore\/layout\/Layouts/);

    await expect(
      presentationService.validatePresentation({
        renderings: [{ renderingId: outsideItem._id.toString() }],
      })
    ).rejects.toThrow(/phải nằm dưới cây \/sitecore\/layout\/Renderings/);
  });

  // ========================================================
  // 7. Phân Quyền (presentation:write)
  // ========================================================
  test('Phân quyền: Content Author không được tạo/sửa/xoá dưới /sitecore/layout (403)', async () => {
    const featureFolder = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature' });
    const renderingTpl = await Template.findOne({ name: 'Rendering' });

    // Author thử tạo item dưới Feature
    const resCreate = await authorAgent
      .post('/api/items')
      .set('X-CSRF-Token', authorCsrfToken)
      .send({
        parentId: featureFolder._id.toString(),
        templateId: renderingTpl._id.toString(),
        name: 'UnauthorizedBanner',
      });
    expect(resCreate.status).toBe(403);
    expect(resCreate.body.message).toContain('presentation:write');

    // Author thử xoá
    const resDelete = await authorAgent
      .delete(`/api/items/${featureFolder._id}`)
      .set('X-CSRF-Token', authorCsrfToken);
    expect(resDelete.status).toBe(403);
  });

  test('Phân quyền: Developer có quyền tạo và sửa dưới /sitecore/layout', async () => {
    const featureFolder = await Item.findOne({ path: '/sitecore/layout/Renderings/Feature' });
    const renderingTpl = await Template.findOne({ name: 'Rendering' });

    const resCreate = await devAgent
      .post('/api/items')
      .set('X-CSRF-Token', devCsrfToken)
      .send({
        parentId: featureFolder._id.toString(),
        templateId: renderingTpl._id.toString(),
        name: 'DevAllowedBanner',
        displayName: 'Dev Allowed Banner',
      });
    expect(resCreate.status).toBe(201);
    expect(resCreate.body.success).toBe(true);
  });
});
