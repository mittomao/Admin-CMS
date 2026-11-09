const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const Language = require('../src/models/Language');
const User = require('../src/models/User');
const Role = require('../src/models/Role');
const versionService = require('../src/services/versionService');

describe('Universal Custom Field System - Field-Level ACL (Phase F3)', () => {
  let mongoServer;
  let adminRole;
  let editorRole;
  let authorRole;
  let adminUser;
  let editorUser;
  let authorUser;
  let aclTemplate;
  let testItem;
  let openFieldId;
  let editorOnlyFieldId;
  let adminOnlyFieldId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    adminRole = await Role.create({ name: 'Administrator', isSystem: true });
    editorRole = await Role.create({ name: 'Editor', isSystem: false });
    authorRole = await Role.create({ name: 'Author', isSystem: false });

    adminUser = await User.create({
      username: 'acl_admin',
      email: 'admin@treecraft.local',
      fullName: 'Admin User',
      passwordHash: 'dummy',
      roles: [adminRole._id],
    });

    editorUser = await User.create({
      username: 'acl_editor',
      email: 'editor@treecraft.local',
      fullName: 'Editor User',
      passwordHash: 'dummy',
      roles: [editorRole._id],
    });

    authorUser = await User.create({
      username: 'acl_author',
      email: 'author@treecraft.local',
      fullName: 'Author User',
      passwordHash: 'dummy',
      roles: [authorRole._id],
    });

    await Language.create({ code: 'en', name: 'English', isDefault: true, active: true, order: 1 });

    aclTemplate = await Template.create({
      name: 'AclTestTemplate',
      displayName: 'ACL Test Template',
      sections: [
        {
          name: 'General',
          fields: [
            {
              name: 'openField',
              title: 'Open Field',
              type: 'Single-Line Text',
              defaultValue: 'initial open',
            },
            {
              name: 'editorOnlyField',
              title: 'Editor Only Field',
              type: 'Single-Line Text',
              defaultValue: 'initial editor',
              permissions: {
                writeRoles: ['Editor', 'Administrator'],
                hiddenRoles: [],
              },
            },
            {
              name: 'adminOnlyField',
              title: 'Admin Only Field',
              type: 'Single-Line Text',
              defaultValue: 'initial admin',
              permissions: {
                writeRoles: ['Administrator'],
                hiddenRoles: ['Author'],
              },
            },
          ],
        },
      ],
    });

    openFieldId = aclTemplate.sections[0].fields[0]._id.toString();
    editorOnlyFieldId = aclTemplate.sections[0].fields[1]._id.toString();
    adminOnlyFieldId = aclTemplate.sections[0].fields[2]._id.toString();

    // Create item with initial values
    testItem = await Item.create({
      name: 'AclItem',
      displayName: 'ACL Item',
      templateId: aclTemplate._id,
      parentId: null,
      ancestors: [],
      path: '/AclItem',
      sortOrder: 100,
      createdBy: adminUser._id,
      languages: [
        {
          code: 'en',
          versions: [
            {
              version: 1,
              fields: new Map([
                [openFieldId, 'initial open'],
                [editorOnlyFieldId, 'initial editor'],
                [adminOnlyFieldId, 'initial admin'],
              ]),
            },
          ],
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('allows Editor to update openField and editorOnlyField, but drops adminOnlyField change', async () => {
    const user = await User.findById(editorUser._id).populate('roles');

    const updatePayload = {
      openField: 'updated by editor',
      editorOnlyField: 'updated editor field by editor',
      adminOnlyField: 'hacked by editor',
    };

    await versionService.updateFields(
      testItem._id,
      'en',
      1,
      updatePayload,
      null,
      { userId: user._id, user }
    );

    const reloaded = await Item.findById(testItem._id);
    const resolved = await versionService.resolveFields(reloaded, 'en', 1);

    expect(resolved.fields[openFieldId]).toBe('updated by editor');
    expect(resolved.fields[editorOnlyFieldId]).toBe('updated editor field by editor');
    // adminOnlyField was dropped because Editor is not in writeRoles: ['Administrator']
    expect(resolved.fields[adminOnlyFieldId]).toBe('initial admin');
  });

  it('drops both editorOnlyField and adminOnlyField for Author user', async () => {
    const user = await User.findById(authorUser._id).populate('roles');

    const updatePayload = {
      openField: 'updated by author',
      editorOnlyField: 'hacked by author',
      adminOnlyField: 'hacked admin by author',
    };

    await versionService.updateFields(
      testItem._id,
      'en',
      1,
      updatePayload,
      null,
      { userId: user._id, user }
    );

    const reloaded = await Item.findById(testItem._id);
    const resolved = await versionService.resolveFields(reloaded, 'en', 1);

    expect(resolved.fields[openFieldId]).toBe('updated by author');
    expect(resolved.fields[editorOnlyFieldId]).toBe('updated editor field by editor'); // unchanged
    expect(resolved.fields[adminOnlyFieldId]).toBe('initial admin'); // unchanged
  });

  it('allows Administrator to update all fields regardless of writeRoles', async () => {
    const user = await User.findById(adminUser._id).populate('roles');

    const updatePayload = {
      openField: 'updated by admin',
      editorOnlyField: 'updated editor by admin',
      adminOnlyField: 'updated admin by admin',
    };

    await versionService.updateFields(
      testItem._id,
      'en',
      1,
      updatePayload,
      null,
      { userId: user._id, user }
    );

    const reloaded = await Item.findById(testItem._id);
    const resolved = await versionService.resolveFields(reloaded, 'en', 1);

    expect(resolved.fields[openFieldId]).toBe('updated by admin');
    expect(resolved.fields[editorOnlyFieldId]).toBe('updated editor by admin');
    expect(resolved.fields[adminOnlyFieldId]).toBe('updated admin by admin');
  });
});
