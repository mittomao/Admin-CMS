#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../src/models/Item');
const Media = require('../src/models/Media');
const { ensureMediaTemplates, MEDIA_TEMPLATES } = require('../src/services/mediaTemplateService');
const mediaPathMapper = require('../src/utils/mediaPathMapper');
const logger = require('../src/utils/logger');

async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');

  console.log('====================================================');
  console.log(' Migration: Legacy Media Collection -> CMS Items');
  console.log(` Mode: ${dryRun ? 'DRY-RUN (Simulated)' : rollback ? 'ROLLBACK' : 'LIVE MIGRATION'}`);
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sitecore_cms';
  await mongoose.connect(mongoUri);
  logger.info('Connected to MongoDB.');

  const templates = await ensureMediaTemplates();
  const folderTpl = templates[MEDIA_TEMPLATES.MEDIA_FOLDER];
  const imageTpl = templates[MEDIA_TEMPLATES.IMAGE];
  const fileTpl = templates[MEDIA_TEMPLATES.FILE];

  if (rollback) {
    console.log('Rolling back: Deleting items created under /sitecore/media library from legacy media...');
    const result = await Item.deleteMany({
      path: { $regex: '^/sitecore/media library/' },
      'sharedFields.migratedFromMedia': true
    });
    console.log(`Rollback completed: Removed ${result.deletedCount} migrated items.`);
    await mongoose.disconnect();
    return;
  }

  // 1. Lấy tất cả bản ghi legacy Media
  const legacyRecords = await Media.find({ isDeleted: false }).sort({ ancestors: 1, createdAt: 1 }).lean();
  console.log(`Found ${legacyRecords.length} legacy Media records to evaluate.`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const record of legacyRecords) {
    try {
      // Bỏ qua root node nếu đã có
      if (record.path === '/sitecore/media library') {
        let existingRoot = await Item.findOne({ path: '/sitecore/media library', deleted: false });
        if (existingRoot && existingRoot.templateId.toString() !== folderTpl._id.toString()) {
          if (!dryRun) {
            existingRoot.templateId = folderTpl._id;
            await existingRoot.save();
          }
        }
        continue;
      }

      // Kiểm tra xem Item đã tồn tại với _id này hoặc path này chưa
      const existingItem = await Item.findOne({
        $or: [{ _id: record._id }, { path: record.path }]
      });

      if (existingItem) {
        skippedCount += 1;
        continue;
      }

      const isFolder = record.isFolder === true;
      const isImg = !isFolder && (
        record.fileDetails?.mimeType?.startsWith('image/') ||
        ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes((record.fileDetails?.extension || '').toLowerCase())
      );
      const targetTemplateId = isFolder ? folderTpl._id : (isImg ? imageTpl._id : fileTpl._id);

      // Chuẩn hóa tên Item không kèm đuôi file
      const rawName = record.name || record.displayName || 'unnamed';
      const cleanItemName = isFolder ? mediaPathMapper.sanitizeItemName(rawName) : mediaPathMapper.sanitizeItemName(record.fileDetails?.originalName || rawName);

      // Xác định parentId trong items_master
      let parentId = record.parentId;
      if (parentId) {
        const parentItem = await Item.findById(parentId);
        if (!parentItem) {
          // Fallback về root media library
          const rootItem = await Item.findOne({ path: '/sitecore/media library' });
          parentId = rootItem ? rootItem._id : null;
        }
      }

      const itemData = {
        _id: record._id, // Giữ nguyên ObjectId cũ để bảo toàn link
        name: cleanItemName,
        displayName: record.displayName || record.name,
        templateId: targetTemplateId,
        parentId: parentId,
        ancestors: record.ancestors || [],
        path: record.path,
        fields: {},
        sharedFields: {
          migratedFromMedia: true,
          publicId: record.fileDetails?.publicId || '',
          secureUrl: record.fileDetails?.secureUrl || record.fileDetails?.storagePath || '',
          format: record.fileDetails?.extension || '',
          extension: record.fileDetails?.extension || '',
          fileSize: record.fileDetails?.fileSize || 0,
          width: record.fileDetails?.dimensions?.width || null,
          height: record.fileDetails?.dimensions?.height || null,
          checksum: record.fileDetails?.checksum || '',
          resourceType: isImg ? 'image' : 'raw',
          syncedAt: new Date()
        },
        languages: [
          {
            code: 'vi',
            unversionedFields: {},
            versions: [
              {
                version: 1,
                fields: {
                  altText: (record.altText && typeof record.altText === 'object') ? (record.altText.vi || record.altText.en || '') : '',
                  title: record.displayName || record.name,
                  description: ''
                },
                createdBy: record.createdBy
              }
            ]
          }
        ],
        createdBy: record.createdBy,
        updatedBy: record.updatedBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      };

      if (!dryRun) {
        await Item.create(itemData);
      }
      createdCount += 1;
    } catch (err) {
      errorCount += 1;
      console.error(`Error migrating record ${record._id} (${record.name}):`, err.message);
    }
  }

  console.log('\n---------------- MIGRATION SUMMARY ----------------');
  console.log(` Created Items: ${createdCount}`);
  console.log(` Skipped Items (Already exist): ${skippedCount}`);
  console.log(` Errors: ${errorCount}`);
  console.log('---------------------------------------------------\n');

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});

