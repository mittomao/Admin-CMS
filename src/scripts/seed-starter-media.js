'use strict';

/**
 * Treecraft CMS - Starter Media Seeder (DEC-058 / Phase S-Parity)
 * Seeds sample media library folders and assets with deterministic IDs.
 */

const mongoose = require('mongoose');
const Item = require('../models/Item');
const Template = require('../models/Template');
const branding = require('../config/branding');

const MEDIA_STARTER_ITEMS = [
  {
    _id: new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    path: '/root/media library/home',
    name: 'home',
    displayName: 'Home',
    parentId: new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
    ancestors: [new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'), new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168')],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf88'),
    sortOrder: 100,
    fields: {},
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aec243c99d1f2a97c1ccce9'),
    path: '/root/media library/home/contact',
    name: 'contact',
    displayName: 'Meo-Scottish-Fold.jpg',
    parentId: new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ancestors: [
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'),
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
      new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf90'),
    sortOrder: 200,
    fields: {
      publicId: 'AdminCMS/home/contact',
      assetId: '',
      format: 'jpg',
      extension: 'jpg',
      secureUrl: 'https://res.cloudinary.com/v41qu0lg/image/upload/v1793862655/AdminCMS/home/contact.jpg',
      fileSize: 45033,
      width: 900,
      height: 563,
      checksum: '38cf5960f1adbc9f4fb0c07c36b392fb0ed82229fbd05beb9ef4ecc4b442f7dd',
      syncedAt: '2026-11-05T07:10:55.446Z',
      altText: '',
      title: '',
      description: '',
    },
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aec2ca0cb78ea3edebef16e'),
    path: '/root/media library/home/iphone-18-pro-01',
    name: 'iphone-18-pro-01',
    displayName: 'iphone-18-pro-max-256gb-bang-thanh_75076500.webp',
    parentId: new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ancestors: [
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'),
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
      new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf90'),
    sortOrder: 100,
    fields: {
      publicId: 'AdminCMS/home/iphone-18-pro-01',
      assetId: '',
      format: 'webp',
      extension: 'webp',
      secureUrl: 'https://res.cloudinary.com/v41qu0lg/image/upload/v1793865035/AdminCMS/home/iphone-18-pro-01.webp',
      fileSize: 49458,
      width: 800,
      height: 800,
      checksum: '4933d278086b58feef086a5ac634607b3aba3bd1a09bc34a3105ffa7aeb954d8',
      syncedAt: '2026-11-05T07:50:36.646Z',
      thumbnailUrl: 'https://res.cloudinary.com/v41qu0lg/image/upload/c_fill,h_300,q_auto,w_300/v1793865035/AdminCMS/home/iphone-18-pro-01.webp?_a=BAMAROWQ0',
      version: 1793865035,
    },
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aec3649b336e0da26d5be50'),
    path: '/root/media library/home/test',
    name: 'test',
    displayName: 'iphone-18-pro-01.webp',
    parentId: new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ancestors: [
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'),
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
      new mongoose.Types.ObjectId('6aec140733a39c69cb95ba4e'),
    ],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf90'),
    sortOrder: 300,
    fields: {
      publicId: 'AdminCMS/home/test',
      assetId: '',
      format: 'webp',
      extension: 'webp',
      secureUrl: 'https://res.cloudinary.com/v41qu0lg/image/upload/v1793865296/AdminCMS/home/test.webp',
      fileSize: 9532,
      width: 358,
      height: 358,
      checksum: 'f623b5e81fd442ffec2d239a23df672c383631bfae901c4e1b2c0ba3641f980f',
      syncedAt: '2026-11-05T07:54:57.451Z',
      altText: '',
      title: '',
      description: '',
      thumbnailUrl: 'https://res.cloudinary.com/v41qu0lg/image/upload/c_fill,h_300,q_auto,w_300/v1793865296/AdminCMS/home/test.webp?_a=BAMAROWQ0',
      version: 1793865296,
    },
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee275'),
    path: '/root/media library/test',
    name: 'test',
    displayName: 'Test',
    parentId: new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
    ancestors: [new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'), new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168')],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf88'),
    sortOrder: 100,
    fields: {},
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee278'),
    path: '/root/media library/test/dsc00738_af9f21cb224d45a8bc589260ab581422_master',
    name: 'dsc00738_af9f21cb224d45a8bc589260ab581422_master',
    displayName: 'dsc00738_af9f21cb224d45a8bc589260ab581422_master',
    parentId: new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee275'),
    ancestors: [
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'),
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
      new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee275'),
    ],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf90'),
    sortOrder: 100,
    fields: {},
    sharedFields: {},
  },
  {
    _id: new mongoose.Types.ObjectId('6aedc7a1705103d63fdd9f8b'),
    path: '/root/media library/test/mazda-cx-5-2026-100-7127-17521-7775-7915-1752140017-17521925465871739801497',
    name: 'mazda-cx-5-2026-100-7127-17521-7775-7915-1752140017-17521925465871739801497',
    displayName: 'mazda-cx-5-2026-100-7127-17521-7775-7915-1752140017-17521925465871739801497.webp',
    parentId: new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee275'),
    ancestors: [
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4162'),
      new mongoose.Types.ObjectId('6ae95cc6b1e541e051fd4168'),
      new mongoose.Types.ObjectId('6aec05a079a4d7a0e6eee275'),
    ],
    templateId: new mongoose.Types.ObjectId('6aec052e66a61643d5ccbf90'),
    sortOrder: 100,
    fields: {},
    sharedFields: {},
  },
];

async function seedStarterMedia() {
  const masterColl = mongoose.connection.collection('items_master');
  for (const item of MEDIA_STARTER_ITEMS) {
    const existing = await masterColl.findOne({ _id: item._id });
    if (!existing) {
      await masterColl.insertOne(item);
    }
  }
  console.log(`[seedStarterMedia] Seeded ${MEDIA_STARTER_ITEMS.length} starter media items with exact IDs.`);
}

module.exports = { seedStarterMedia };

