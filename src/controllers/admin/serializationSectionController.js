'use strict';

/**
 * Treecraft CMS - Section-Based YAML Serialization Controller (DEC-053 / Phase 11-Y2)
 * Manages section statuses, reserialize, dry-run previews, and section sync.
 */

const yamlSectionService = require('../../services/yamlSectionService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const { getAllSections, SYNC_EXECUTION_ORDER } = require('../../config/serializationSections');
const logger = require('../../utils/logger');
const { ForbiddenError, ValidationError } = require('../../utils/errors');

// In-memory concurrency locks to prevent overlapping sync/reserialize on the same section
const activeSectionJobs = new Set();

const serializationSectionController = {
  /**
   * GET /api/serialization/sections
   * Returns list of all sections with live status and comparison badges
   */
  async listSections(req, res, next) {
    try {
      const user = req.user || req.session?.user;
      const canRead = await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:read');
      if (!canRead) {
        throw new ForbiddenError('Bạn không có quyền truy cập thông tin Serialization (serialization:read).');
      }

      const allSecs = getAllSections();
      const statusList = [];

      for (const sec of allSecs) {
        const st = await yamlSectionService.getSectionStatus(sec.key);
        st.isLocked = activeSectionJobs.has(sec.key);
        statusList.push(st);
      }

      res.json({
        success: true,
        sections: statusList,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/serialization/sections/:key/reserialize
   * Reserialize a section from DB into YAML files
   */
  async reserialize(req, res, next) {
    const key = (req.params.key || '').toLowerCase().trim();
    try {
      const user = req.user || req.session?.user;
      const canExport =
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:export')) ||
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:reserialize'));

      if (!canExport) {
        throw new ForbiddenError('Bạn không có quyền thực thi Reserialize dữ liệu (serialization:export).');
      }

      if (key === 'all') {
        if (activeSectionJobs.has('all')) {
          throw new ValidationError('Tiến trình Reserialize toàn bộ đang chạy, vui lòng chờ hoàn thành.');
        }
        activeSectionJobs.add('all');

        try {
          const results = [];
          for (const sKey of SYNC_EXECUTION_ORDER) {
            const r = await yamlSectionService.reserializeSection(sKey, {
              pruneOrphans: Boolean(req.body.pruneOrphans),
              user,
            });
            results.push(r);
          }
          return res.json({
            success: true,
            message: 'Đã hoàn thành Reserialize cho tất cả các section.',
            results,
          });
        } finally {
          activeSectionJobs.delete('all');
        }
      }

      if (activeSectionJobs.has(key)) {
        throw new ValidationError(`Tiến trình đang thao tác trên section "${key}", vui lòng chờ hoàn thành.`);
      }

      activeSectionJobs.add(key);
      try {
        const result = await yamlSectionService.reserializeSection(key, {
          pruneOrphans: Boolean(req.body.pruneOrphans),
          user,
        });

        res.json({
          success: true,
          message: `Đã hoàn thành Reserialize section "${key}".`,
          result,
        });
      } finally {
        activeSectionJobs.delete(key);
      }
    } catch (err) {
      logger.error(`[serializationSectionController] Reserialize error for ${key}: ${err.message}`);
      next(err);
    }
  },

  /**
   * POST /api/serialization/sections/:key/sync/dry-run
   * Dry-run preview before executing actual sync
   */
  async dryRun(req, res, next) {
    const key = (req.params.key || '').toLowerCase().trim();
    try {
      const user = req.user || req.session?.user;
      const canSync =
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:import')) ||
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:sync'));

      if (!canSync) {
        throw new ForbiddenError('Bạn không có quyền thực thi Sync dữ liệu (serialization:import).');
      }

      const deleteMissingFields = Boolean(req.body.deleteMissingFields);

      if (key === 'all') {
        const results = [];
        for (const sKey of SYNC_EXECUTION_ORDER) {
          const r = await yamlSectionService.dryRunSyncSection(sKey, {
            mode: req.body.mode,
            deleteMissingFields,
            user,
          });
          results.push(r);
        }
        return res.json({
          success: true,
          isAll: true,
          results,
        });
      }

      const result = await yamlSectionService.dryRunSyncSection(key, {
        mode: req.body.mode,
        deleteMissingFields,
        user,
      });

      res.json({
        success: true,
        result,
      });
    } catch (err) {
      logger.error(`[serializationSectionController] Dry-run error for ${key}: ${err.message}`);
      next(err);
    }
  },

  /**
   * POST /api/serialization/sections/:key/sync
   * Execute actual YAML -> DB sync
   */
  async sync(req, res, next) {
    const key = (req.params.key || '').toLowerCase().trim();
    try {
      const user = req.user || req.session?.user;
      const canSync =
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:import')) ||
        (await itemService.canPerform(user, branding.PATHS.ROOT, 'serialization:sync'));

      if (!canSync) {
        throw new ForbiddenError('Bạn không có quyền thực thi Sync dữ liệu (serialization:import).');
      }

      const { mode, dryRunHash, deleteMissing = false, deleteMissingFields = false, hashes = {} } = req.body;

      if (key === 'all') {
        if (activeSectionJobs.has('all')) {
          throw new ValidationError('Tiến trình Sync toàn bộ đang chạy, vui lòng chờ.');
        }
        activeSectionJobs.add('all');

        try {
          const results = [];
          for (const sKey of SYNC_EXECUTION_ORDER) {
            const sHash = hashes[sKey] || null;
            const r = await yamlSectionService.syncSection(sKey, {
              mode,
              dryRunHash: sHash,
              deleteMissing: Boolean(deleteMissing),
              deleteMissingFields: Boolean(deleteMissingFields),
              user,
            });
            results.push(r);
          }
          return res.json({
            success: true,
            message: 'Đã hoàn thành Sync theo đúng thứ tự phụ thuộc (Template -> Layout -> Rendering -> Content).',
            results,
          });
        } finally {
          activeSectionJobs.delete('all');
        }
      }

      if (activeSectionJobs.has(key)) {
        throw new ValidationError(`Tiến trình đang thao tác trên section "${key}", vui lòng chờ.`);
      }

      activeSectionJobs.add(key);
      try {
        const result = await yamlSectionService.syncSection(key, {
          mode,
          dryRunHash,
          deleteMissing: Boolean(deleteMissing),
          deleteMissingFields: Boolean(deleteMissingFields),
          user,
        });

        res.json({
          success: true,
          message: `Đã hoàn thành Sync dữ liệu cho section "${key}".`,
          result,
        });
      } finally {
        activeSectionJobs.delete(key);
      }
    } catch (err) {
      logger.error(`[serializationSectionController] Sync error for ${key}: ${err.message}`);
      next(err);
    }
  },
};

module.exports = serializationSectionController;

