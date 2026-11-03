const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const itemService = require('../src/services/itemService');

describe('itemService - Content Editor Business Logic', () => {
  let mongoServer;
  let folderTemplate;
  let pageTemplate;
  let rootItem;
  let contentItem;
  let homeItem;

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

    // Seed templates
    folderTemplate = await Template.create({
      name: 'Folder',
      displayName: 'Folder',
      icon: 'ti ti-folder',
      sections: [{ name: 'Folder', fields: [] }],
    });

    pageTemplate = await Template.create({
      name: 'Page',
      displayName: 'Page',
      icon: 'ti ti-file-text',
      sections: [
        {
          name: 'Content',
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: true },
            { name: 'body', title: 'Body', type: 'Rich Text', required: false },
            { name: 'isFeatured', title: 'Featured', type: 'Checkbox', required: false },
            { name: 'count', title: 'Count', type: 'Number', required: false },
          ],
        },
      ],
    });

    folderTemplate.insertOptions = [folderTemplate._id, pageTemplate._id];
    await folderTemplate.save();

    pageTemplate.insertOptions = [pageTemplate._id];
    await pageTemplate.save();

    // Seed tree: /sitecore -> /sitecore/content -> /sitecore/content/home
    rootItem = await Item.create({
      name: 'sitecore',
      displayName: 'Sitecore',
      templateId: folderTemplate._id,
      parentId: null,
      ancestors: [],
      path: '/sitecore',
      sortOrder: 10,
    });

    contentItem = await Item.create({
      name: 'content',
      displayName: 'Content',
      templateId: folderTemplate._id,
      parentId: rootItem._id,
      ancestors: [rootItem._id],
      path: '/sitecore/content',
      sortOrder: 100,
    });

    homeItem = await Item.create({
      name: 'home',
      displayName: 'Home',
      templateId: pageTemplate._id,
      parentId: contentItem._id,
      ancestors: [rootItem._id, contentItem._id],
      path: '/sitecore/content/home',
      sortOrder: 100,
      fields: {
        title: 'Home Page',
        body: '<p>Hello world</p>',
      },
    });
  });

  test('createFromTemplate creates item with correct path and ancestors', async () => {
    const newItem = await itemService.createFromTemplate(
      homeItem._id,
      pageTemplate._id,
      'About Us',
      'About Us'
    );

    expect(newItem).toBeDefined();
    expect(newItem.name).toBe('about-us');
    expect(newItem.displayName).toBe('About Us');
    expect(newItem.path).toBe('/sitecore/content/home/about-us');
    expect(newItem.ancestors.map((a) => a.toString())).toEqual([
      rootItem._id.toString(),
      contentItem._id.toString(),
      homeItem._id.toString(),
    ]);
  });

  test('createFromTemplate rejects duplicate sibling names', async () => {
    await itemService.createFromTemplate(homeItem._id, pageTemplate._id, 'test');
    await expect(
      itemService.createFromTemplate(homeItem._id, pageTemplate._id, 'test')
    ).rejects.toThrow(/already exists/);
  });

  test('createFromTemplate enforces insertOptions', async () => {
    const unallowedTemplate = await Template.create({
      name: 'Special',
      displayName: 'Special',
      sections: [],
    });

    // homeItem template (pageTemplate) only allows pageTemplate
    await expect(
      itemService.createFromTemplate(homeItem._id, unallowedTemplate._id, 'special-item')
    ).rejects.toThrow(/not an allowed insert option/);
  });

  test('updateFields sanitizes Rich Text and strips script tags', async () => {
    const updated = await itemService.updateFields(
      homeItem._id,
      {
        title: 'Updated Title',
        body: '<p>Safe Text</p><script>alert("XSS")</script>',
        isFeatured: 'on',
        count: '42',
      },
      homeItem.updatedAt
    );

    expect(updated.fields.title).toBe('Updated Title');
    expect(updated.fields.body).toBe('<p>Safe Text</p>');
    expect(updated.fields.body).not.toContain('<script>');
    expect(updated.fields.isFeatured).toBe(true);
    expect(updated.fields.count).toBe(42);
  });

  test('updateFields detects Optimistic Locking conflict (409)', async () => {
    const staleDate = new Date(Date.now() - 60000).toISOString();

    await expect(
      itemService.updateFields(homeItem._id, { title: 'New' }, staleDate)
    ).rejects.toThrow(itemService.ConflictError);
  });

  test('rename updates path of self and all descendants', async () => {
    const subItem = await itemService.createFromTemplate(
      homeItem._id,
      pageTemplate._id,
      'sub-page',
      'Sub Page'
    );
    expect(subItem.path).toBe('/sitecore/content/home/sub-page');

    // Rename home -> homepage
    const renamedHome = await itemService.rename(homeItem._id, 'homepage', 'Home Page New');
    expect(renamedHome.path).toBe('/sitecore/content/homepage');

    // Check descendant path updated
    const updatedSub = await itemService.getById(subItem._id);
    expect(updatedSub.path).toBe('/sitecore/content/homepage/sub-page');
  });

  test('duplicate creates copy with unique name and copies subitems', async () => {
    await itemService.createFromTemplate(homeItem._id, pageTemplate._id, 'sub-one', 'Sub One');

    const copy1 = await itemService.duplicate(homeItem._id);
    expect(copy1.name).toBe('copy-of-home');
    expect(copy1.path).toBe('/sitecore/content/copy-of-home');

    // Duplicate again should give copy-2-of-home
    const copy2 = await itemService.duplicate(homeItem._id);
    expect(copy2.name).toBe('copy-2-of-home');

    // Verify subitems were cloned under copy1
    const copyChildren = await itemService.getChildren(copy1._id);
    expect(copyChildren.length).toBe(1);
    expect(copyChildren[0].name).toBe('sub-one');
    expect(copyChildren[0].path).toBe('/sitecore/content/copy-of-home/sub-one');
  });

  test('moveTo blocks cycle (moving item into its own descendant)', async () => {
    const child = await itemService.createFromTemplate(homeItem._id, pageTemplate._id, 'child');
    const grandChild = await itemService.createFromTemplate(child._id, pageTemplate._id, 'grandchild');

    // Attempt to move home into grandChild
    await expect(
      itemService.moveTo(homeItem._id, grandChild._id)
    ).rejects.toThrow(/Cannot move an item into one of its own descendants/);
  });

  test('moveTo updates path and ancestors correctly on valid move', async () => {
    const folder2 = await itemService.createFromTemplate(
      rootItem._id,
      folderTemplate._id,
      'folder-two'
    );

    const movedHome = await itemService.moveTo(homeItem._id, folder2._id);
    expect(movedHome.path).toBe('/sitecore/folder-two/home');
    expect(movedHome.parentId.toString()).toBe(folder2._id.toString());
    expect(movedHome.ancestors.map((a) => a.toString())).toEqual([
      rootItem._id.toString(),
      folder2._id.toString(),
    ]);
  });

  test('delete soft-deletes item and all descendants', async () => {
    const child = await itemService.createFromTemplate(homeItem._id, pageTemplate._id, 'to-delete-child');

    await itemService.delete(homeItem._id);

    const deletedHome = await Item.findById(homeItem._id);
    const deletedChild = await Item.findById(child._id);

    expect(deletedHome.deleted).toBe(true);
    expect(deletedChild.deleted).toBe(true);

    const activeHome = await itemService.getById(homeItem._id);
    expect(activeHome).toBeNull();
  });

  test('sort reorders siblings correctly', async () => {
    await itemService.createFromTemplate(contentItem._id, pageTemplate._id, 'a');
    const itemB = await itemService.createFromTemplate(contentItem._id, pageTemplate._id, 'b');

    // Siblings under content: homeItem, itemA, itemB
    // Move itemB to first
    await itemService.sort(itemB._id, 'first');

    const siblings = await itemService.getChildren(contentItem._id);
    expect(siblings[0]._id.toString()).toBe(itemB._id.toString());
  });
});
