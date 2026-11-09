#!/usr/bin/env node
'use strict';

/**
 * Scheduled / CLI Retention Policy Script for Audit Logs (DEC-045)
 * Prunes audit log records older than AUDIT_RETENTION_DAYS
 *
 * Usage:
 *   node src/scripts/prune-expired-audit-logs.js [--dry-run] [--days=90]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const auditService = require('../services/auditService');

const isDryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const retentionDays = daysArg ? parseInt(daysArg.split('=')[1], 10) : env.AUDIT_RETENTION_DAYS || 90;

async function run() {
  logger.info(`=== Tỉa gọn Nhật ký kiểm toán hết hạn (Retention: ${retentionDays} ngày, dryRun: ${isDryRun}) ===`);
  logger.info('[LƯU Ý AN TOÀN] Khuyến nghị xuất lưu trữ (export/archive) Audit Log trước khi thực hiện dọn dẹp.');

  await mongoose.connect(env.MONGO_URI, { autoIndex: true });

  const result = await auditService.pruneExpired(retentionDays, isDryRun);

  if (isDryRun) {
    logger.info(`[dryRun] Ngưỡng cutoff: ${result.cutoffDate.toISOString()}. Sẽ tỉa bỏ ${result.expiredCount} bản ghi.`);
  } else {
    logger.info(`Đã tỉa bỏ thành công ${result.expiredCount} bản ghi kiểm toán trước ngày ${result.cutoffDate.toISOString()}.`);
  }

  await mongoose.disconnect();
  logger.info('=== Kết thúc quá trình tỉa gọn Nhật ký kiểm toán ===');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Lỗi khi tỉa gọn Nhật ký kiểm toán:', err);
      process.exit(1);
    });
}

module.exports = run;

