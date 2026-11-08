const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Workflow = require('../src/models/Workflow');
const WorkflowHistory = require('../src/models/WorkflowHistory');
const workflowService = require('../src/services/workflowService');

describe('workflowService - Workflow Engine', () => {
  let mongoServer;
  let sampleWorkflow;
  let pageTemplate;
  let testItem;
  let adminUser;
  let authorUser;
  let approverUser;

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
    await Template.deleteMany({});
    await Workflow.deleteMany({});
    await WorkflowHistory.deleteMany({});

    // 1. Seed Sample Workflow
    sampleWorkflow = await workflowService.ensureDefaultWorkflow();

    // 2. Mock users
    adminUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'admin',
      fullName: 'System Administrator',
      roles: ['Administrator'],
    };

    authorUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'author',
      fullName: 'Content Author',
      roles: ['Author'],
    };

    approverUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'approver',
      fullName: 'Chief Editor',
      roles: ['Approver'],
    };

    // 3. Create Page template assigning sampleWorkflow
    pageTemplate = await Template.create({
      name: 'Page',
      displayName: 'Page',
      workflowId: sampleWorkflow._id,
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: true },
            { name: 'body', title: 'Body', type: 'Rich Text', required: false },
          ],
        },
      ],
    });

    // 4. Create an Item
    testItem = await Item.create({
      name: 'Test Article',
      path: '/root/content/test-article',
      templateId: pageTemplate._id,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: new Map([
                ['title', 'Tiêu đề bài viết'],
                ['body', '<p>Nội dung</p>'],
              ]),
            },
          ],
        },
      ],
    });
  });

  test('getState should return initial state (Draft) for newly created item', async () => {
    const stateInfo = await workflowService.getState(testItem, 'vi', 1);
    expect(stateInfo).not.toBeNull();
    expect(stateInfo.workflow.name).toBe('Sample Workflow');
    expect(stateInfo.state.name).toBe('Draft');
    expect(stateInfo.isInitial).toBe(true);
    expect(stateInfo.isFinal).toBe(false);
  });

  test('getCommands should filter commands based on user permissions via canPerform', async () => {
    // Author can see 'Submit' command
    const authorCommands = await workflowService.getCommands(testItem, 'vi', 1, authorUser);
    expect(authorCommands.length).toBe(1);
    expect(authorCommands[0].name).toBe('Submit');

    // Admin can see 'Submit' command
    const adminCommands = await workflowService.getCommands(testItem, 'vi', 1, adminUser);
    expect(adminCommands.length).toBe(1);
    expect(adminCommands[0].name).toBe('Submit');
  });

  test('execute: Author executes Submit -> transitions to Awaiting Approval', async () => {
    const result = await workflowService.execute(
      testItem._id,
      'vi',
      1,
      'Submit',
      'Ready for review',
      authorUser
    );

    expect(result.success).toBe(true);
    expect(result.fromState).toBe('Draft');
    expect(result.toState).toBe('Awaiting Approval');

    // Verify item in DB
    const updatedItem = await Item.findById(testItem._id);
    const ver = updatedItem.getVersion('vi', 1);
    expect(ver.workflowState.toString()).toBe(
      sampleWorkflow.states.find((s) => s.name === 'Awaiting Approval')._id.toString()
    );

    // Verify history recorded
    const history = await workflowService.getHistory(testItem._id, 'vi', 1);
    expect(history.length).toBe(1);
    expect(history[0].command.name).toBe('Submit');
    expect(history[0].comment).toBe('Ready for review');
    expect(history[0].username).toBe('author');
  });

  test('execute: Rejection requires comment and Author cannot Approve/Reject', async () => {
    // 1. Move to Awaiting Approval first
    await workflowService.execute(testItem._id, 'vi', 1, 'Submit', 'For review', authorUser);

    // 2. Author tries to Approve -> Should be forbidden
    await expect(
      workflowService.execute(testItem._id, 'vi', 1, 'Approve', '', authorUser)
    ).rejects.toThrow();

    // 3. Approver rejects WITHOUT comment -> Should fail validation
    await expect(
      workflowService.execute(testItem._id, 'vi', 1, 'Reject', '', approverUser)
    ).rejects.toThrow(/bắt buộc phải nhập lý do/i);

    // 4. Approver rejects WITH comment -> Transitions back to Draft
    const rejectResult = await workflowService.execute(
      testItem._id,
      'vi',
      1,
      'Reject',
      'Please fix typo',
      approverUser
    );
    expect(rejectResult.success).toBe(true);
    expect(rejectResult.toState).toBe('Draft');
  });

  test('execute: Optimistic locking detects concurrent edit (409 Conflict)', async () => {
    const staleTime = new Date(Date.now() - 60000); // 1 minute ago
    await expect(
      workflowService.execute(
        testItem._id,
        'vi',
        1,
        'Submit',
        'Check',
        authorUser,
        staleTime
      )
    ).rejects.toThrow();
  });

  test('getItemsByState returns items waiting in Awaiting Approval', async () => {
    // Move testItem to Awaiting Approval
    await workflowService.execute(testItem._id, 'vi', 1, 'Submit', 'Ready', authorUser);

    const awaitingState = sampleWorkflow.states.find((s) => s.name === 'Awaiting Approval');
    const items = await workflowService.getItemsByState(awaitingState._id);

    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Test Article');
    expect(items[0].lang).toBe('vi');
    expect(items[0].version).toBe(1);
  });
});

