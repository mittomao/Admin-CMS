const mongoose = require('mongoose');
const Item = require('../../models/Item');
const PublishedItem = require('../../models/PublishedItem');
const Template = require('../../models/Template');
const MediaManifestHelper = require('./mediaManifestHelper');
const logger = require('../../utils/logger');

class PostRestoreVerifier {
  /**
   * Run full post-restore validation and maintenance tasks
   */
  static async verify(targetDbConnection, mediaManifest = null, options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      passed: true,
      errors: [],
      warnings: [],
      indexRebuilt: false,
      treeIntegrity: null,
      mediaAudit: null,
    };

    try {
      // 1. Rebuild indexes on all registered models
      try {
        await Item.syncIndexes();
        await PublishedItem.syncIndexes();
        await Template.syncIndexes();
        report.indexRebuilt = true;
        logger.info('[PostRestoreVerifier] Successfully synced indexes on core collections');
      } catch (idxErr) {
        report.warnings.push(`Cảnh báo rebuild index: ${idxErr.message}`);
      }

      // 2. Tree hierarchy integrity check
      const orphanCount = await Item.countDocuments({
        parentId: { $ne: null },
        deleted: { $ne: true },
        isDeleted: { $ne: true },
        $expr: {
          $not: {
            $in: ['$parentId', await Item.distinct('_id')],
          },
        },
      });

      const totalItems = await Item.countDocuments({ isDeleted: { $ne: true } });
      const rootItem = await Item.findOne({ path: '/root' });

      report.treeIntegrity = {
        totalItems,
        orphanCount,
        hasRootNode: Boolean(rootItem),
      };

      if (orphanCount > 0) {
        report.passed = false;
        report.errors.push(`Phát hiện ${orphanCount} item mồ côi (parentId không tồn tại trong cây).`);
      }

      if (!rootItem) {
        report.passed = false;
        report.errors.push('Không tìm thấy item gốc chuẩn "/root" sau khi khôi phục.');
      }

      // 3. Media manifest audit
      if (mediaManifest) {
        const mediaAudit = await MediaManifestHelper.verifyMediaManifest(mediaManifest);
        report.mediaAudit = mediaAudit;
        if (mediaAudit.missingCount > 0) {
          report.warnings.push(`Phát hiện ${mediaAudit.missingCount} tài nguyên media có trong manifest nhưng chưa thấy trên kho.`);
        }
      }

      // 4. Invalidate Sessions and Flush Site Cache
      try {
        const db = targetDbConnection || mongoose.connection.db;
        await db.collection('sessions').deleteMany({}).catch(() => {});
        logger.info('[PostRestoreVerifier] Flushed sessions collection');
      } catch (sessErr) {
        report.warnings.push(`Không thể xóa sessions: ${sessErr.message}`);
      }

      // Flush in-memory render cache if service exists
      try {
        const siteResolver = require('../siteResolver');
        if (siteResolver && typeof siteResolver.flushCache === 'function') {
          siteResolver.flushCache();
        }
      } catch {
        // Cache module might not export flushCache, continue
      }

      report.passed = report.errors.length === 0;
      return report;
    } catch (err) {
      logger.error(`[PostRestoreVerifier] Fatal error during verification: ${err.message}`, err);
      report.passed = false;
      report.errors.push(`Lỗi nghiêm trọng khi hậu kiểm tra: ${err.message}`);
      return report;
    }
  }
}

module.exports = PostRestoreVerifier;

