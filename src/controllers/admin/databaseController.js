const Item = require('../../models/Item');
const PublishedItem = require('../../models/PublishedItem');
const itemService = require('../../services/itemService');
const logger = require('../../utils/logger');
const { ForbiddenError } = require('../../utils/errors');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BRANCHES = [
  { path: '/sitecore/content', name: 'Content' },
  { path: '/sitecore/layout', name: 'Layout' },
  { path: '/sitecore/templates', name: 'Templates' },
  { path: '/sitecore/media library', name: 'Media Library' },
];

const databaseController = {
  /**
   * GET /admin/databases
   * Render Database Manager & Reconciliation Dashboard
   */
  async index(req, res, next) {
    try {
      if (!itemService.canPerform(req.user, null, 'database:compare')) {
        throw new ForbiddenError('Bạn không có quyền truy cập trang quản trị và đối soát Database (database:compare).');
      }

      res.render('admin/databases/index', {
        title: 'Databases Manager & Reconciliation - Sitecore XM',
        currentPath: '/admin/databases',
        activeApp: 'databases',
        branches: BRANCHES,
        layout: 'layouts/shell',
      });
    } catch (err) {
      logger.error(`Error in databaseController.index: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/databases/summary
   * Statistics across Master and Web databases by root branches
   */
  async getSummary(req, res, next) {
    try {
      if (!itemService.canPerform(req.user, null, 'database:compare')) {
        return res.status(403).json({ success: false, message: 'Forbidden: database:compare permission required.' });
      }

      const branchStats = await Promise.all(
        BRANCHES.map(async (b) => {
          const rx = new RegExp(`^${escapeRegex(b.path)}`, 'i');
          const [masterCount, webCount] = await Promise.all([
            Item.countDocuments({ path: rx, deleted: false, isDeleted: { $ne: true } }),
            PublishedItem.countDocuments({ path: rx, isDeleted: { $ne: true } }),
          ]);
          return {
            branch: b.path,
            name: b.name,
            masterCount,
            webCount,
            diff: masterCount - webCount,
          };
        })
      );

      const [totalMaster, totalWeb] = await Promise.all([
        Item.countDocuments({ deleted: false, isDeleted: { $ne: true } }),
        PublishedItem.countDocuments({ isDeleted: { $ne: true } }),
      ]);

      res.json({
        success: true,
        data: {
          branches: branchStats,
          totals: {
            master: totalMaster,
            web: totalWeb,
            diff: totalMaster - totalWeb,
          },
        },
      });
    } catch (err) {
      logger.error(`Error in databaseController.getSummary: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/databases/diff
   * Query differences between Master and Web (missing, orphan, changed)
   */
  async getDiff(req, res, next) {
    try {
      if (!itemService.canPerform(req.user, null, 'database:compare')) {
        return res.status(403).json({ success: false, message: 'Forbidden: database:compare permission required.' });
      }

      const { branch = 'all', type = 'all', page = 1, limit = 20 } = req.query;

      const masterQuery = { deleted: false, isDeleted: { $ne: true } };
      const webQuery = { isDeleted: { $ne: true } };

      if (branch && branch !== 'all') {
        const rx = new RegExp(`^${escapeRegex(branch)}`, 'i');
        masterQuery.path = rx;
        webQuery.path = rx;
      }

      const [masterItems, webItems] = await Promise.all([
        Item.find(masterQuery).select('_id name displayName path updatedAt languages templateId').lean(),
        PublishedItem.find(webQuery).select('_id name displayName path updatedAt languages sourceVersion templateId').lean(),
      ]);

      const masterMap = new Map(masterItems.map((m) => [m._id.toString(), m]));
      const webMap = new Map(webItems.map((w) => [w._id.toString(), w]));

      const missing = [];
      const orphan = [];
      const changed = [];

      for (const m of masterItems) {
        const idStr = m._id.toString();
        const w = webMap.get(idStr);
        if (!w) {
          missing.push({
            _id: m._id,
            name: m.name,
            displayName: m.displayName || m.name,
            path: m.path,
            type: 'missing',
            masterUpdatedAt: m.updatedAt,
            webUpdatedAt: null,
            masterVersion: (m.languages?.[0]?.versions?.length) || 1,
            webVersion: null,
          });
        } else {
          const mDate = new Date(m.updatedAt).getTime();
          const wDate = new Date(w.updatedAt).getTime();
          const mVer = m.languages?.[0]?.versions?.length ? Math.max(...m.languages[0].versions.map((v) => v.version)) : 1;
          const wVer = w.sourceVersion || 1;

          if (mVer > wVer || mDate > wDate + 1000) {
            changed.push({
              _id: m._id,
              name: m.name,
              displayName: m.displayName || m.name,
              path: m.path,
              type: 'changed',
              masterUpdatedAt: m.updatedAt,
              webUpdatedAt: w.updatedAt,
              masterVersion: mVer,
              webVersion: wVer,
            });
          }
        }
      }

      for (const w of webItems) {
        const idStr = w._id.toString();
        if (!masterMap.has(idStr)) {
          orphan.push({
            _id: w._id,
            name: w.name,
            displayName: w.displayName || w.name,
            path: w.path,
            type: 'orphan',
            masterUpdatedAt: null,
            webUpdatedAt: w.updatedAt,
            masterVersion: null,
            webVersion: w.sourceVersion || 1,
          });
        }
      }

      let resultList = [];
      if (type === 'missing') resultList = missing;
      else if (type === 'orphan') resultList = orphan;
      else if (type === 'changed') resultList = changed;
      else resultList = [...missing, ...changed, ...orphan];

      const total = resultList.length;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedItems = resultList.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        data: {
          items: paginatedItems,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
          counts: {
            missing: missing.length,
            changed: changed.length,
            orphan: orphan.length,
            totalDiff: missing.length + changed.length + orphan.length,
          },
        },
      });
    } catch (err) {
      logger.error(`Error in databaseController.getDiff: ${err.message}`);
      next(err);
    }
  },
};

module.exports = databaseController;
