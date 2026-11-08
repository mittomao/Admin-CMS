const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const AccessControl = require('../src/models/AccessControl');
const aclService = require('../src/services/aclService');
const roleService = require('../src/services/roleService');
const { RIGHTS, ACTIONS } = require('../src/config/permissions');

describe('AclService & Permission Resolution (Sitecore XM &bull; DEC-042)', () => {
  let mongoServer;
  let adminRole, editorRole, authorRole, subEditorRole;
  let adminUser, editorUser, authorUser;
  let rootNode, contentNode, homeNode, articleNode;
  let dummyTemplate;

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
    await Role.deleteMany({});
    await User.deleteMany({});
    await AccessControl.deleteMany({});
    aclService.clearCache();

    dummyTemplate = await Template.create({
      name: 'Sample Template',
      path: '/sitecore/templates/sample',
      sections: [],
    });

    // 1. Roles
    adminRole = await Role.create({ name: 'Administrator', domain: 'sitecore', isSystem: true });
    editorRole = await Role.create({ name: 'Editor', domain: 'sitecore', isSystem: true });
    authorRole = await Role.create({ name: 'Author', domain: 'sitecore', isSystem: true });
    subEditorRole = await Role.create({
      name: 'SubEditor',
      domain: 'sitecore',
      memberOf: [editorRole._id],
    });

    // 2. Users
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@sitecore.test',
      passwordHash: 'hash',
      fullName: 'System Administrator',
      roles: [adminRole._id],
      isAdmin: true,
      isDisabled: false,
    });

    editorUser = await User.create({
      username: 'editor_jane',
      email: 'jane@sitecore.test',
      passwordHash: 'hash',
      fullName: 'Jane Editor',
      roles: [editorRole._id],
      isAdmin: false,
      isDisabled: false,
    });

    authorUser = await User.create({
      username: 'author_bob',
      email: 'bob@sitecore.test',
      passwordHash: 'hash',
      fullName: 'Bob Author',
      roles: [authorRole._id],
      isAdmin: false,
      isDisabled: false,
    });

    // 3. Tree Hierarchy: root -> content -> home -> article
    rootNode = await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      path: '/sitecore',
      templateId: dummyTemplate._id,
      parentId: null,
      ancestors: [],
    });

    contentNode = await Item.create({
      name: 'content',
      displayName: 'Content',
      path: '/sitecore/content',
      templateId: dummyTemplate._id,
      parentId: rootNode._id,
      ancestors: [rootNode._id],
    });

    homeNode = await Item.create({
      name: 'home',
      displayName: 'Home',
      path: '/sitecore/content/home',
      templateId: dummyTemplate._id,
      parentId: contentNode._id,
      ancestors: [rootNode._id, contentNode._id],
    });

    articleNode = await Item.create({
      name: 'news-1',
      displayName: 'Latest News',
      path: '/sitecore/content/home/news-1',
      templateId: dummyTemplate._id,
      parentId: homeNode._id,
      ancestors: [rootNode._id, contentNode._id, homeNode._id],
    });
  });

  test('1. Administrator has unconditional full access to all items and rights', async () => {
    const rights = Object.values(RIGHTS);
    for (const r of rights) {
      const allowed = await aclService.canPerform(adminUser, articleNode, `item:${r}`);
      expect(allowed).toBe(true);
    }
  });

  test('2. Default Deny: without rules, non-admin user is denied access', async () => {
    const canRead = await aclService.canPerform(authorUser, articleNode, ACTIONS.ITEM_READ);
    expect(canRead).toBe(false);
  });

  test('3. Distance / Level rule: Explicit rule on child item wins over inherited rule from parent', async () => {
    // Parent (/sitecore/content/home) has DENY write for Editor role (scope: both)
    await AccessControl.create({
      itemId: homeNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.WRITE,
      access: 'deny',
      inheritance: 'both',
    });

    // Child (/sitecore/content/home/news-1) has explicit ALLOW write for Editor role
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.WRITE,
      access: 'allow',
      inheritance: 'thisItem',
    });

    // Child must be ALLOW because child is distance 0 (closer)
    const canWriteChild = await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_WRITE);
    expect(canWriteChild).toBe(true);

    // Parent must be DENY because direct rule on parent is deny
    const canWriteParent = await aclService.canPerform(editorUser, homeNode, ACTIONS.ITEM_WRITE);
    expect(canWriteParent).toBe(false);
  });

  test('4. Same Level: User rule overrides Role rule', async () => {
    // On articleNode: Role Editor has DENY write
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.WRITE,
      access: 'deny',
      inheritance: 'thisItem',
    });

    // On articleNode: User editorUser has explicit ALLOW write
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'user',
      principalId: editorUser._id,
      right: RIGHTS.WRITE,
      access: 'allow',
      inheritance: 'thisItem',
    });

    const canWrite = await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_WRITE);
    expect(canWrite).toBe(true);
  });

  test('5. Same Level (among roles): Deny wins over Allow', async () => {
    // User has both editorRole and authorRole
    editorUser.roles = [editorRole._id, authorRole._id];
    await editorUser.save();

    // Editor role has ALLOW read
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'thisItem',
    });

    // Author role has DENY read
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: authorRole._id,
      right: RIGHTS.READ,
      access: 'deny',
      inheritance: 'thisItem',
    });

    const canRead = await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_READ);
    expect(canRead).toBe(false);
  });

  test('6. Scope Inheritance: thisItem does NOT apply to descendants, descendants applies only to children', async () => {
    // 6a. thisItem scope on homeNode
    await AccessControl.create({
      itemId: homeNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'thisItem',
    });

    expect(await aclService.canPerform(editorUser, homeNode, ACTIONS.ITEM_READ)).toBe(true);
    // articleNode must NOT inherit thisItem rule
    expect(await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_READ)).toBe(false);

    // 6b. descendants scope on homeNode
    await AccessControl.deleteMany({});
    aclService.clearCache();

    await AccessControl.create({
      itemId: homeNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'descendants',
    });

    // homeNode itself does not receive descendants rule
    expect(await aclService.canPerform(editorUser, homeNode, ACTIONS.ITEM_READ)).toBe(false);
    // articleNode receives it!
    expect(await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_READ)).toBe(true);
  });

  test('7. Role Inheritance (memberOf): nested roles transitively inherit permissions', async () => {
    const subEditorUser = await User.create({
      username: 'sub_editor',
      email: 'sub@sitecore.test',
      passwordHash: 'hash',
      fullName: 'Sub Editor',
      roles: [subEditorRole._id], // SubEditor is memberOf Editor
      isDisabled: false,
    });

    // Editor role is granted read on homeNode (both)
    await AccessControl.create({
      itemId: homeNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'both',
    });

    // subEditorUser should have read on homeNode via role inheritance!
    const canReadHome = await aclService.canPerform(subEditorUser, homeNode, ACTIONS.ITEM_READ);
    expect(canReadHome).toBe(true);
  });

  test('8. Role Cycle Detection: roleService prevents circular role inheritance', async () => {
    // SubEditor is already memberOf Editor.
    // Try to make Editor memberOf SubEditor -> should detect cycle!
    const hasCycle = await roleService.detectCycle(editorRole._id, [subEditorRole._id]);
    expect(hasCycle).toBe(true);

    // Try to make a role inherit itself
    const selfCycle = await roleService.detectCycle(editorRole._id, [editorRole._id]);
    expect(selfCycle).toBe(true);
  });

  test('9. Self-lockout Prevention: user cannot assign Deny administer to self', async () => {
    // First grant editorUser administer on articleNode so they have permission to change ACL
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'user',
      principalId: editorUser._id,
      right: RIGHTS.ADMINISTER,
      access: 'allow',
      inheritance: 'thisItem',
    });

    await expect(
      aclService.setEntry({
        itemId: articleNode._id,
        principalType: 'user',
        principalId: editorUser._id,
        right: RIGHTS.ADMINISTER,
        access: 'deny',
        inheritance: 'thisItem',
        user: editorUser,
      })
    ).rejects.toThrow('Cannot self-lockout');
  });

  test('10. Cache invalidation on ACL change', async () => {
    // Initially deny
    expect(await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_READ)).toBe(false);

    // Grant access via setEntry (actor is adminUser)
    await aclService.setEntry({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'thisItem',
      user: adminUser,
    });

    // Should immediately reflect allow without stale cache
    expect(await aclService.canPerform(editorUser, articleNode, ACTIONS.ITEM_READ)).toBe(true);
  });

  test('11. explainPermission returns detailed decision reasoning', async () => {
    await AccessControl.create({
      itemId: homeNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.PUBLISH,
      access: 'allow',
      inheritance: 'both',
    });

    const explanation = await aclService.explainPermission(editorUser, articleNode, ACTIONS.ITEM_PUBLISH);
    expect(explanation.isAllowed).toBe(true);
    expect(explanation.access).toBe('allow');
    expect(explanation.origin).toBe('inherited');
    expect(explanation.reason).toContain('Inherited');
  });

  test('12. batch filterReadable avoids N+1 queries and filters list correctly', async () => {
    await AccessControl.create({
      itemId: articleNode._id,
      principalType: 'role',
      principalId: editorRole._id,
      right: RIGHTS.READ,
      access: 'allow',
      inheritance: 'thisItem',
    });

    const allItems = [homeNode.toObject(), articleNode.toObject()];
    const readable = await aclService.filterReadable(editorUser, allItems);

    expect(readable).toHaveLength(1);
    expect(readable[0]._id.toString()).toBe(articleNode._id.toString());
  });

  test('13. Launchpad groups Access Management apps with active URLs and Security Editor is accessible', async () => {
    const launchpadController = require('../src/controllers/admin/launchpadController');
    const securityController = require('../src/controllers/admin/securityController');

    let renderedView = null;
    let renderedData = null;
    const mockRes = {
      render: (view, data) => {
        renderedView = view;
        renderedData = data;
      },
      status: () => mockRes,
    };

    await launchpadController.getLaunchpad({ user: adminUser }, mockRes);
    const accessApps = renderedData.groupedApps['Access Management'];
    expect(accessApps).toBeDefined();
    expect(accessApps.length).toBeGreaterThanOrEqual(4);

    const appMap = Object.fromEntries(accessApps.map((a) => [a.name, a]));
    expect(appMap['User Manager'].url).toBe('/admin/security/users');
    expect(appMap['User Manager'].isStub).toBe(false);
    expect(appMap['Role Manager'].url).toBe('/admin/security/roles');
    expect(appMap['Role Manager'].isStub).toBe(false);
    expect(appMap['Security Editor'].url).toBe('/admin/security/security-editor');
    expect(appMap['Security Editor'].isStub).toBe(false);
    expect(appMap['Access Viewer'].url).toBe('/admin/security/access-viewer');
    expect(appMap['Access Viewer'].isStub).toBe(false);

    // Test Security Editor controller
    await securityController.renderSecurityEditor({ user: adminUser, query: {} }, mockRes, () => {});
    expect(renderedView).toBe('admin/security/security-editor');
    expect(renderedData.activeApp).toBe('security-editor');
  });
});
