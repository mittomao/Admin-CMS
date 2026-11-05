'use strict';

const CloudinaryStorageProvider = require('../src/services/storage/CloudinaryStorageProvider');
const cloudinary = require('cloudinary').v2;

jest.mock('cloudinary', () => {
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' })
      },
      url: jest.fn(),
      api: {
        resource: jest.fn().mockResolvedValue({ width: 800, height: 600, format: 'png' })
      }
    }
  };
});

describe('CloudinaryStorageProvider', () => {
  let provider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new CloudinaryStorageProvider({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      folder: 'TestCMS'
    });
  });

  test('initializes with given credentials and configures cloudinary', () => {
    expect(cloudinary.config).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud_name: 'test-cloud',
        api_key: 'test-key',
        api_secret: 'test-secret',
        secure: true
      })
    );
    expect(provider.folder).toBe('TestCMS');
  });

  test('saveFile uploads buffer to Cloudinary and returns formatted details', async () => {
    const mockUploadResult = {
      public_id: 'TestCMS/2026/11/banner_sample_123',
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v12345/TestCMS/2026/11/banner_sample_123.jpg',
      bytes: 1024,
      width: 1200,
      height: 800,
      format: 'jpg',
      resource_type: 'image'
    };

    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      return {
        end: jest.fn((_buffer) => {
          callback(null, mockUploadResult);
        })
      };
    });

    cloudinary.url.mockReturnValue(
      'https://res.cloudinary.com/test-cloud/image/upload/c_fill,h_300,w_300,f_webp,q_auto/TestCMS/2026/11/banner_sample_123'
    );

    const testBuffer = Buffer.from('fake-image-content-for-testing');
    const result = await provider.saveFile({
      buffer: testBuffer,
      originalName: 'banner sample.jpg',
      mimeType: 'image/jpeg'
    });

    expect(result).toBeDefined();
    expect(result.provider).toBe('cloudinary');
    expect(result.publicId).toBe(mockUploadResult.public_id);
    expect(result.secureUrl).toBe(mockUploadResult.secure_url);
    expect(result.storagePath).toBe(mockUploadResult.secure_url);
    expect(result.fileSize).toBe(1024);
    expect(result.dimensions).toEqual({ width: 1200, height: 800, format: 'jpg' });
    expect(result.thumbnailUrl).toContain('c_fill');
    expect(result.checksum).toBeDefined();
  });

  test('generateThumbnail returns Cloudinary transformation URL', async () => {
    cloudinary.url.mockReturnValue('https://res.cloudinary.com/thumb.webp');

    const thumbUrl = await provider.generateThumbnail('sample_public_id', { width: 400, height: 400 });

    expect(cloudinary.url).toHaveBeenCalledWith(
      'sample_public_id',
      expect.objectContaining({
        width: 400,
        height: 400,
        crop: 'fill',
        fetch_format: 'webp'
      })
    );
    expect(thumbUrl).toBe('https://res.cloudinary.com/thumb.webp');
  });

  test('deleteFile calls cloudinary.uploader.destroy with publicId', async () => {
    await provider.deleteFile('some-url', null, 'TestCMS/2026/11/asset_to_delete');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('TestCMS/2026/11/asset_to_delete');
  });
});
