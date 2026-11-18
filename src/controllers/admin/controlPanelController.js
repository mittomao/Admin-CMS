const os = require('os');
const mongoose = require('mongoose');
const env = require('../../config/env');
const dbGuard = require('../../config/dbGuard');
const branding = require('../../config/branding');
const sitePaths = require('../../config/sitePaths');
const renderCache = require('../../utils/renderCache');
const logger = require('../../utils/logger');
const Item = require('../../models/Item');
const PublishedItem = require('../../models/PublishedItem');

function formatBytes(bytes) {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

const controlPanelController = {
  /**
   * GET /admin/control-panel
   * Display System Health, Hardware metrics, Database metrics, Cache status
   */
  async index(req, res, next) {
    try {
      // 1. Process & Memory Metrics
      const memUsage = process.memoryUsage();
      const totalSystemMem = os.totalmem();
      const freeSystemMem = os.freemem();
      const usedSystemMem = totalSystemMem - freeSystemMem;

      const memoryStats = {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        systemMemPercent: Math.round((usedSystemMem / totalSystemMem) * 100),
      };

      const systemStats = {
        nodeVersion: process.version,
        platform: `${process.platform} (${process.arch})`,
        uptime: formatUptime(process.uptime()),
        pid: process.pid,
        appEnv: env.APP_ENV,
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        isStandalone: sitePaths.isStandaloneMode,
        siteDir: sitePaths.SITE_DIR,
      };

      // 2. Database Status
      const isConnected = mongoose.connection.readyState === 1;
      let dbStats = {
        status: isConnected ? 'connected' : 'disconnected',
        name: dbGuard.extractDatabaseName(env.MONGO_URI),
        maskedUri: dbGuard.maskUri(env.MONGO_URI),
        masterCount: 0,
        webCount: 0,
        collectionsCount: 0,
        replicaSet: 'N/A',
      };

      if (isConnected && mongoose.connection.db) {
        try {
          const [masterCount, webCount, collections] = await Promise.all([
            Item.countDocuments().catch(() => 0),
            PublishedItem.countDocuments().catch(() => 0),
            mongoose.connection.db.listCollections().toArray().catch(() => []),
          ]);

          dbStats.masterCount = masterCount;
          dbStats.webCount = webCount;
          dbStats.collectionsCount = collections.length;

          // Check replica set
          try {
            const admin = mongoose.connection.db.admin();
            const rs = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
            if (rs && rs.set) {
              dbStats.replicaSet = rs.set;
            }
          } catch {
            dbStats.replicaSet = 'Single Node (No RS)';
          }
        } catch (dbErr) {
          logger.warn(`Failed to collect full DB stats: ${dbErr.message}`);
        }
      }

      // 3. Render Cache Status
      const cacheStats = {
        enabled: renderCache.enabled,
        currentSize: renderCache.size(),
        maxItems: renderCache.maxItems,
        ttlSeconds: renderCache.ttl / 1000,
        usagePercent: Math.round((renderCache.size() / renderCache.maxItems) * 100),
      };

      res.render('admin/control-panel/index', {
        title: `System Health & Control Panel - ${branding.PROJECT_NAME}`,
        currentPath: '/admin/control-panel',
        activeApp: 'control-panel',
        systemStats,
        memoryStats,
        dbStats,
        cacheStats,
        layout: 'layouts/shell',
      });
    } catch (err) {
      logger.error(`Error in controlPanelController.index: ${err.message}`);
      next(err);
    }
  },

  /**
   * POST /admin/control-panel/clear-cache
   * Purge Public Site Render Cache
   */
  async clearCache(req, res, next) {
    try {
      const prevSize = renderCache.size();
      renderCache.clear();
      logger.info(`[ControlPanel] Administrator purged site render cache (${prevSize} entries removed)`);

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, message: `Đã làm sạch toàn bộ bộ nhớ đệm (${prevSize} trang).` });
      }

      return res.redirect('/admin/control-panel?cleared=true');
    } catch (err) {
      logger.error(`Error in controlPanelController.clearCache: ${err.message}`);
      next(err);
    }
  },
};

module.exports = controlPanelController;
