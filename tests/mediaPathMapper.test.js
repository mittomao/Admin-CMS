'use strict';

const {
  sanitizeItemName,
  sanitizeFolderPath,
  itemPathToCloudinary,
  cloudinaryToItemPath,
  ROOT_MEDIA_PATH
} = require('../src/utils/mediaPathMapper');

describe('GĐ 5.1: mediaPathMapper Unit Tests', () => {
  describe('1. sanitizeItemName', () => {
    test('cleans Vietnamese accents and special characters into kebab-case', () => {
      expect(sanitizeItemName('Ảnh Biển Đẹp 2026!')).toBe('anh-bien-dep-2026');
      expect(sanitizeItemName('   Đà Nẵng_City---Tour   ')).toBe('da-nang_city-tour');
    });

    test('strips file extension from original filename', () => {
      expect(sanitizeItemName('hero-banner.jpg')).toBe('hero-banner');
      expect(sanitizeItemName('annual-report.2026.pdf')).toBe('annual-report-2026');
      expect(sanitizeItemName('avatar.sample.png')).toBe('avatar-sample');
    });

    test('handles empty or invalid inputs safely', () => {
      expect(sanitizeItemName('')).toBe('unnamed');
      expect(sanitizeItemName(null)).toBe('unnamed');
      expect(sanitizeItemName('---')).toBe('item');
    });
  });

  describe('2. sanitizeFolderPath', () => {
    test('cleans each segment of folder path', () => {
      expect(sanitizeFolderPath('Chiến Dịch/Mùa Hè 2026')).toBe('chien-dich/mua-he-2026');
      expect(sanitizeFolderPath('/Banners//Hero/')).toBe('banners/hero');
    });
  });

  describe('3. itemPathToCloudinary', () => {
    test('maps item path to Cloudinary public_id and asset_folder without extension for images', () => {
      const res = itemPathToCloudinary({
        itemPath: '/sitecore/media library/Banners/Hero/summer-sale',
        isRaw: false,
        ext: 'jpg'
      });

      expect(res.assetFolder).toBe('AdminCMS/banners/hero');
      expect(res.publicId).toBe('AdminCMS/banners/hero/summer-sale');
      expect(res.itemName).toBe('summer-sale');
      expect(res.itemPath).toBe('/sitecore/media library/banners/hero/summer-sale');
    });

    test('maps item path directly under root media library', () => {
      const res = itemPathToCloudinary({
        itemPath: '/sitecore/media library/logo-main',
        isRaw: false,
        ext: 'png'
      });

      expect(res.assetFolder).toBe('AdminCMS');
      expect(res.publicId).toBe('AdminCMS/logo-main');
      expect(res.itemName).toBe('logo-main');
      expect(res.itemPath).toBe('/sitecore/media library/logo-main');
    });

    test('appends extension to public_id when isRaw is true for documents', () => {
      const res = itemPathToCloudinary({
        itemPath: '/sitecore/media library/Documents/Financial/q4-report',
        isRaw: true,
        ext: 'pdf'
      });

      expect(res.assetFolder).toBe('AdminCMS/documents/financial');
      expect(res.publicId).toBe('AdminCMS/documents/financial/q4-report.pdf');
      expect(res.itemName).toBe('q4-report');
    });

    test('respects custom rootFolder parameter', () => {
      const res = itemPathToCloudinary({
        itemPath: '/sitecore/media library/Home/hero',
        rootFolder: 'CustomRoot'
      });

      expect(res.assetFolder).toBe('CustomRoot/home');
      expect(res.publicId).toBe('CustomRoot/home/hero');
    });
  });

  describe('4. cloudinaryToItemPath', () => {
    test('maps path-based publicId to CMS item path and strips extension', () => {
      const res = cloudinaryToItemPath({
        publicId: 'AdminCMS/Banners/Hero/summer-sale',
        format: 'jpg',
        resourceType: 'image'
      });

      expect(res.itemPath).toBe('/sitecore/media library/banners/hero/summer-sale');
      expect(res.parentPath).toBe('/sitecore/media library/banners/hero');
      expect(res.itemName).toBe('summer-sale');
      expect(res.extension).toBe('jpg');
    });

    test('handles Dynamic Folder Mode with assetFolder provided', () => {
      const res = cloudinaryToItemPath({
        publicId: 'dsc00738_master',
        assetFolder: 'AdminCMS/Test/Events',
        format: 'webp',
        resourceType: 'image'
      });

      expect(res.itemPath).toBe('/sitecore/media library/test/events/dsc00738_master');
      expect(res.parentPath).toBe('/sitecore/media library/test/events');
      expect(res.itemName).toBe('dsc00738_master');
      expect(res.extension).toBe('webp');
    });

    test('handles raw file with extension in publicId', () => {
      const res = cloudinaryToItemPath({
        publicId: 'AdminCMS/Docs/annual_report.pdf',
        resourceType: 'raw'
      });

      expect(res.itemPath).toBe('/sitecore/media library/docs/annual_report');
      expect(res.itemName).toBe('annual_report');
      expect(res.extension).toBe('pdf');
    });
  });

  describe('5. Two-way roundtrip consistency', () => {
    test('itemPath -> Cloudinary -> itemPath preserves path identity', () => {
      const originalPath = `${ROOT_MEDIA_PATH}/campaigns/summer-2026/promo-banner`;
      const cloud = itemPathToCloudinary({ itemPath: originalPath });
      const roundtrip = cloudinaryToItemPath({
        publicId: cloud.publicId,
        assetFolder: cloud.assetFolder,
        format: 'webp'
      });

      expect(roundtrip.itemPath).toBe(originalPath);
      expect(roundtrip.itemName).toBe('promo-banner');
    });
  });
});

