const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Media = require('../src/models/Media');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const { sanitizeRichText, resolveRichText } = require('../src/utils/richTextHelper');

describe('GĐ 5: richTextHelper Unit Tests (Sanitization & Reference Resolution)', () => {
  let mongoServer;
  let testMedia;
  let testItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Tạo Media test
    testMedia = await Media.create({
      name: 'banner.png',
      displayName: 'Banner',
      isFolder: false,
      path: '/root/media library/banner.png',
      fileDetails: {
        storagePath: '2026/11/banner.png',
        mimeType: 'image/png',
        fileSize: 1000
      }
    });

    // Tạo Template & Item test
    const template = await Template.create({
      name: 'TestTemplate',
      displayName: 'Test Template'
    });

    testItem = await Item.create({
      name: 'about-us',
      displayName: 'About Us',
      templateId: template._id,
      path: '/root/content/home/about-us'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('1. should strip malicious script tags, onerror handlers, and unsafe protocols', () => {
    const maliciousHtml = `
      <p>Hello <script>alert("XSS")</script></p>
      <img src="test.jpg" onerror="alert('hack')" data-media-id="507f1f77bcf86cd799439011" />
      <a href="javascript:alert(1)" data-item-id="507f1f77bcf86cd799439012">Dangerous Link</a>
    `;

    const clean = sanitizeRichText(maliciousHtml);

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert("XSS")');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');

    // Should preserve legitimate data attributes
    expect(clean).toContain('data-media-id="507f1f77bcf86cd799439011"');
    expect(clean).toContain('data-item-id="507f1f77bcf86cd799439012"');
  });

  it('2. should resolve data-media-id into official /media/file/:id URL', async () => {
    const inputHtml = `<p><img src="/temp-url/fake.jpg" data-media-id="${testMedia._id}" alt="Banner" /></p>`;
    const resolved = await resolveRichText(inputHtml);

    expect(resolved).toContain(`src="/media/file/${testMedia._id}"`);
    expect(resolved).toContain(`data-media-id="${testMedia._id}"`);
  });

  it('3. should resolve data-item-id into current item materialized path', async () => {
    const inputHtml = `<p>Read more on our <a href="/outdated/link" data-item-id="${testItem._id}">About Us page</a>.</p>`;
    const resolved = await resolveRichText(inputHtml);

    expect(resolved).toContain(`href="${testItem.path}"`);
    expect(resolved).toContain(`data-item-id="${testItem._id}"`);
  });
});
