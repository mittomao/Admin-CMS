#!/usr/bin/env node
'use strict';

/**
 * Scheduled / CLI Retention Policy Script for Recycle Bin (DEC-044)
 * Purges soft-deleted items older than RECYCLE_BIN_RETENTION_DAYS
 *
 * Usage:
 *   node src/scripts/purge-expired-recyclebin.js [--dry-run] [--days=30]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const recycleBinService = require('../services/recycleBinService');

const isDryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const retentionDays = daysArg ? parseInt(daysArg.split('=')[1], 10) : env.RECYCLE_BIN_RETENTION_DAYS || 30;

async function run() {
  logger.info(`=== Dọn dẹp Thùng rác hết hạn (Retention: ${retentionDays} ngày, dryRun: ${isDryRun}) ===`);
  logger.info('[LƯU Ý AN TOÀN] Quá trình này sẽ xoá vĩnh viễn dữ liệu. Khuyến nghị sao lưu MongoDB định kỳ.');

  await mongoose.connect(env.MONGO_URI, { autoIndex: true });

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  logger.info(`Thời điểm ngưỡng (cutoff): ${cutoffDate.toISOString()}`);

  const expiredQuery = {
    $or: [{ deleted: true }, { isDeleted: true }],
    deletedAt: { $lt: cutoffDate },
  };

  const expiredCount = await Item.countDocuments(expiredQuery);
  logger.info(`Tìm thấy ${expiredCount} items đã xoá trước ngưỡng ${retentionDays} ngày.`);

  if (expiredCount === 0) {
    logger.info('Không có mục nào trong Thùng rác cần dọn dẹp.');
  } else if (isDryRun) {
    logger.info(`[dryRun] Sẽ xoá vĩnh viễn ${expiredCount} items.`);
  } else {
    const result = await recycleBinService.purgeAll(
      { deletedAt: { $lt: cutoffDate } },
      { user: { username: '[cron-retention]' } }
    );
    logger.info(`Đã xoá vĩnh viễn thành công ${result.totalPurged} items.`);
  }

  await mongoose.disconnect();
  logger.info('=== Kết thúc quá trình dọn dẹp Thùng rác ===');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Lỗi khi chạy dọn dẹp Thùng rác:', err);
      process.exit(1);
    });
}

module.exports = run;

