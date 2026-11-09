#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase 9: Recycle Bin & Audit Log (DEC-044, DEC-045)
 * 
 * Backfills soft-deleted items with recycle bin metadata:
 * - deletedAt, deletedBy, deletedFromPath, deletedFromParentId, deletionBatchId
 * - ensures isDeleted === true is synchronized with deleted === true
 * - ensures Item and AuditLog indexes
 *
 * Usage:
 *   node src/scripts/migrate-phase-09-recycle-bin.js [--dry-run] [--rollback]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

async function runMigration() {
  logger.info(`=== Bắt đầu Migration GĐ 9: Recycle Bin & Audit Log (dryRun: ${isDryRun}, rollback: ${isRollback}) ===`);
  logger.info('[LƯU Ý AN TOÀN] Khuyến nghị tạo bản sao lưu MongoDB (mongodump) trước khi thực hiện migration trên production.');

  await mongoose.connect(env.MONGO_URI, { autoIndex: true });
  logger.info('Connected to MongoDB.');

  if (isRollback) {
    logger.warn('[Rollback] Hoàn tác metadata Recycle Bin GĐ 9...');
    if (!isDryRun) {
      const res = await Item.updateMany(
        {},
        {
          $unset: {
            deletedAt: '',
            deletedBy: '',
            deletedFromPath: '',
            deletedFromParentId: '',
            deletionBatchId: '',
            isDeleted: '',
          },
        }
      );
      logger.info(`Đã gỡ bỏ metadata Recycle Bin khỏi ${res.modifiedCount} items.`);
    } else {
      logger.info('[dryRun] Sẽ gỡ bỏ metadata Recycle Bin khỏi các items.');
    }
    logger.info('=== Rollback GĐ 9 hoàn tất ===');
    await mongoose.disconnect();
    return;
  }

  // 1. Ensure indexes
  logger.info('Đang đồng bộ indexes cho Item và AuditLog...');
  if (!isDryRun) {
    await Item.syncIndexes();
    await AuditLog.syncIndexes();
    logger.info('Indexes đã được đồng bộ.');
  } else {
    logger.info('[dryRun] Sẽ đồng bộ indexes Item và AuditLog.');
  }

  // 2. Find legacy deleted items needing backfill
  const deletedItems = await Item.find({
    $or: [{ deleted: true }, { isDeleted: true }],
  }).lean();

  logger.info(`Tìm thấy ${deletedItems.length} items ở trạng thái xoá mềm.`);

  let updatedCount = 0;
  for (const item of deletedItems) {
    const updates = {};
    let needsUpdate = false;

    if (item.deleted && !item.isDeleted) {
      updates.isDeleted = true;
      needsUpdate = true;
    }
    if (item.isDeleted && !item.deleted) {
      updates.deleted = true;
      needsUpdate = true;
    }
    if (!item.deletedAt) {
      updates.deletedAt = item.updatedAt || item.createdAt || new Date();
      needsUpdate = true;
    }
    if (!item.deletedBy && (item.updatedBy || item.createdBy)) {
      updates.deletedBy = item.updatedBy || item.createdBy;
      needsUpdate = true;
    }
    if (!item.deletedFromPath) {
      updates.deletedFromPath = item.path || '';
      needsUpdate = true;
    }
    if (!item.deletedFromParentId && item.parentId) {
      updates.deletedFromParentId = item.parentId;
      needsUpdate = true;
    }
    if (!item.deletionBatchId) {
      updates.deletionBatchId = new mongoose.Types.ObjectId().toString();
      needsUpdate = true;
    }

    if (needsUpdate) {
      updatedCount++;
      if (!isDryRun) {
        await Item.updateOne({ _id: item._id }, { $set: updates });
      }
    }
  }

  logger.info(`Đã cập nhật metadata Recycle Bin cho ${updatedCount}/${deletedItems.length} items đã xoá mềm.`);
  logger.info('=== Migration GĐ 9 hoàn tất thành công ===');

  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Lỗi khi chạy migration GĐ 9:', err);
      process.exit(1);
    });
}

module.exports = runMigration;

