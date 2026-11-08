const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const PublishedItem = require('../src/models/PublishedItem');
const Template = require('../src/models/Template');
const Workflow = require('../src/models/Workflow');
const PublishHistory = require('../src/models/PublishHistory');
const publishService = require('../src/services/publishService');
const webItemService = require('../src/services/webItemService');
const workflowService = require('../src/services/workflowService');

describe('publishService & webItemService - Master to Web Publishing', () => {
  let mongoServer;
  let sampleWorkflow;
  let pageTemplate;
  let layoutItem;
  let renderingItem;
  let datasourceItem;
  let pageItem;
  let adminUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    await PublishedItem.deleteMany({});
    await Template.deleteMany({});
    await Workflow.deleteMany({});
    await PublishHistory.deleteMany({});

    sampleWorkflow = await workflowService.ensureDefaultWorkflow();

    adminUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'admin',
      roles: ['Administrator'],
    };

    pageTemplate = await Template.create({
      name: 'Page',
      displayName: 'Page',
      workflowId: sampleWorkflow._id,
      sections: [{ name: 'Content', fields: [] }],
    });

    const standardTemplate = await Template.create({
      name: 'Standard Template',
      displayName: 'Standard Template',
      sections: [],
    });

    // Create Layout item in master
    layoutItem = await Item.create({
      name: 'Main Layout',
      path: '/root/layout/layouts/main-layout',
      templateId: standardTemplate._id,
      fields: new Map([['viewPath', 'layouts/main.ejs']]),
    });

    // Create Rendering item in master
    renderingItem = await Item.create({
      name: 'Hero Component',
      path: '/root/layout/renderings/hero-component',
      templateId: standardTemplate._id,
      fields: new Map([['viewPath', 'components/hero.ejs']]),
    });

    // Create Datasource item in master
    datasourceItem = await Item.create({
      name: 'Hero Content Data',
      path: '/root/content/data/hero-data',
      templateId: standardTemplate._id,
      fields: new Map([['headline', 'Welcome to Treecraft!']]),
    });

    // Create Page item with presentation pointing to layout, rendering & datasource
    pageItem = await Item.create({
      name: 'Home',
      path: '/root/content/home',
      templateId: pageTemplate._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([['title', 'Trang chủ']]),
              workflowState: sampleWorkflow.states.find((s) => s.isFinal)._id, // Already approved
            },
          ],
        },
      ],
      presentation: {
        shared: {
          layoutId: layoutItem._id,
          renderings: [
            {
              uid: 'hero-123',
              renderingId: renderingItem._id,
              datasourceId: datasourceItem._id,
              placeholder: 'maincontent',
              sortOrder: 10,
            },
          ],
        },
      },
    });
  });

  test('Preflight Check should detect unpublished datasource', async () => {
    const preflight = await publishService.preflightCheck(pageItem._id, { includeSubitems: false });
    expect(preflight.warningsCount).toBeGreaterThan(0);
    expect(preflight.warnings.some((w) => w.type === 'UNPUBLISHED_DATASOURCE')).toBe(true);
  });

  test('Publishing approved item should store it in items_web with identical _id and include related presentation', async () => {
    const result = await publishService.publishItem(pageItem._id, {
      mode: 'Item',
      includeSubitems: false,
      includeRelated: true,
      languages: ['vi'],
      user: adminUser,
    });

    expect(result.success).toBe(true);
    expect(result.totalItemsPublished).toBeGreaterThanOrEqual(1);

    // Verify in items_web
    const webDoc = await PublishedItem.findById(pageItem._id);
    expect(webDoc).not.toBeNull();
    expect(webDoc._id.toString()).toBe(pageItem._id.toString());
    expect(webDoc.name).toBe('Home');
    expect(webDoc.path).toBe('/root/content/home');

    // Also layout and rendering should be in items_web because includeRelated = true
    const webLayout = await PublishedItem.findById(layoutItem._id);
    expect(webLayout).not.toBeNull();

    const webRendering = await PublishedItem.findById(renderingItem._id);
    expect(webRendering).not.toBeNull();
  });

  test('Unpublished or Draft items should be skipped by publishService', async () => {
    // Set workflow state back to Draft
    const draftState = sampleWorkflow.states.find((s) => s.isInitial);
    pageItem.languages[0].versions[0].workflowState = draftState._id;
    await pageItem.save();

    const result = await publishService.publishItem(pageItem._id, {
      mode: 'Item',
      includeSubitems: false,
      includeRelated: false,
      languages: ['vi'],
      user: adminUser,
    });

    expect(result.totalItemsPublished).toBe(0);
    const webDoc = await PublishedItem.findById(pageItem._id);
    expect(webDoc).toBeNull();
  });

  test('unpublishItem should remove item from items_web and emit event', async () => {
    // Publish first
    await publishService.publishItem(pageItem._id, {
      mode: 'Item',
      includeRelated: false,
      languages: ['vi'],
      user: adminUser,
    });

    expect(await PublishedItem.findById(pageItem._id)).not.toBeNull();

    // Unpublish
    const unpubResult = await publishService.unpublishItem(pageItem._id, { user: adminUser });
    expect(unpubResult.success).toBe(true);
    expect(unpubResult.unpublishedCount).toBe(1);

    // Verify removed
    expect(await PublishedItem.findById(pageItem._id)).toBeNull();
  });

  test('webItemService methods should retrieve and resolve data from items_web', async () => {
    // Publish item
    await publishService.publishItem(pageItem._id, {
      mode: 'Item',
      includeRelated: true,
      languages: ['vi'],
      user: adminUser,
    });

    // 1. getById
    const byId = await webItemService.getById(pageItem._id);
    expect(byId).not.toBeNull();
    expect(byId.name).toBe('Home');

    // 2. getByPath
    const byPath = await webItemService.getByPath('/root/content/home');
    expect(byPath).not.toBeNull();
    expect(byPath._id.toString()).toBe(pageItem._id.toString());

    // 3. resolveFields
    const resolved = await webItemService.resolveFields(byPath, 'vi');
    expect(resolved.language).toBe('vi');
    expect(resolved.fields.title).toBe('Trang chủ');

    // 4. getFinalPresentation
    const presentation = await webItemService.getFinalPresentation(byPath, 'vi');
    expect(presentation.layoutId.toString()).toBe(layoutItem._id.toString());
    expect(presentation.renderings.length).toBe(1);
    expect(presentation.renderings[0].name).toBe('Hero Component');
  });
});

