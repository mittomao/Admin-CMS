'use strict';

/**
 * Backup & Restore Controller (GĐ K1 / DEC-051)
 * Administrative page and JSON API endpoints.
 */

const { spawn } = require('child_process');
const backupService = require('../../services/backupService');
const maintenanceService = require('../../services/maintenanceService');
const itemService = require('../../services/itemService');
const branding = require('../../config/branding');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { ForbiddenError, ValidationError } = require('../../utils/errors');

const backupController = {
  /**
   * GET /admin/backups
   * Renders the Backup & Restore Admin UI
   */
  async index(req, res, next) {
    try {
      const user = req.user;
      const canRead = await itemService.canPerform(user, branding.PATHS.ROOT, 'backup:read');
      if (!canRead) {
        throw new ForbiddenError('Bạn không có quyền truy cập chức năng Sao lưu & Phục hồi (backup:read).');
      }

      const [canCreate, canRestore, canDelete, canDownload, canManageMaintenance] = await Promise.all([
        itemService.canPerform(user, branding.PATHS.ROOT, 'backup:create'),
        itemService.canPerform(user, branding.PATHS.ROOT, 'backup:restore'),
        itemService.canPerform(user, branding.PATHS.ROOT, 'backup:delete'),
        itemService.canPerform(user, branding.PATHS.ROOT, 'backup:download'),
        itemService.canPerform(user, branding.PATHS.ROOT, 'maintenance:manage'),
      ]);

      const backups = await backupService.listBackups();
      const isMaintenance = await maintenanceService.isMaintenanceMode();
      const canMongodump = await backupService.mongodumpEngine.isAvailable();

      res.render('admin/backup/index', {
        title: `Backup & Restore | ${branding.PROJECT_NAME}`,
        pageTitle: 'Quản lý Sao lưu & Phục hồi Cơ sở Dữ liệu',
        backups,
        isMaintenance,
        canMongodump,
        currentDb: env.MONGO_URI.split('/').pop().split('?')[0] || 'admin_cms',
        retentionCount: env.BACKUP_RETENTION_COUNT || 7,
        retentionDays: env.BACKUP_RETENTION_DAYS || 30,
        hasEncryptionKey: Boolean(env.BACKUP_ENCRYPTION_KEY),
        permissions: {
          canRead,
          canCreate,
          canRestore,
          canDelete,
          canDownload,
          canManageMaintenance,
        },
        user,
        csrfToken: res.locals.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/backups
   */
  async apiList(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Không có quyền xem danh sách bản sao lưu.' });
      }
      const backups = await backupService.listBackups();
      res.json({ success: true, data: backups });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/backups/:id
   */
  async apiGet(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập thông tin bản sao lưu.' });
      }
      const details = await backupService.getBackupDetails(req.params.id);
      res.json({ success: true, data: details });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/backups
   * Create backup
   */
  async apiCreate(req, res, next) {
    try {
      const canCreate = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:create');
      if (!canCreate) {
        return res.status(403).json({ success: false, message: 'Không có quyền tạo bản sao lưu (backup:create).' });
      }

      const { note, type, excludeAuditLogs, engine } = req.body || {};
      const result = await backupService.createBackup({
        note,
        type: type || 'full',
        excludeAuditLogs: Boolean(excludeAuditLogs),
        engine,
        user: req.user,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo bản sao lưu thành công.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/backups/:id/verify
   * Verify backup integrity
   */
  async apiVerify(req, res, next) {
    try {
      const canRead = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:read');
      if (!canRead) {
        return res.status(403).json({ success: false, message: 'Không có quyền kiểm tra toàn vẹn bản sao lưu.' });
      }

      const report = await backupService.verifyBackup(req.params.id);
      res.json({
        success: true,
        message: report.passed ? 'Bản sao lưu hợp lệ, toàn vẹn dữ liệu.' : 'Phát hiện lỗi sai lệch toàn vẹn dữ liệu!',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/backups/:id/download
   * Stream backup archive to client
   */
  async apiDownload(req, res, next) {
    try {
      const canDownload = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:download');
      if (!canDownload) {
        throw new ForbiddenError('Không có quyền tải xuống bản sao lưu (backup:download).');
      }

      const backupId = req.params.id;
      const backupDir = await backupService.storage.getBackupDir(backupId);

      // Verify backup exists
      const manifestExists = await backupService.storage.fileExists(backupId, 'manifest.json');
      if (!manifestExists) {
        throw new ValidationError(`Không tìm thấy bản sao lưu: ${backupId}`);
      }

      const filename = `${backupId}.tar.gz`;
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Spawn native tar to stream compressed folder
      const tarProcess = spawn('tar', ['-czf', '-', '-C', backupDir, '.']);

      tarProcess.stdout.pipe(res);

      tarProcess.stderr.on('data', (data) => {
        logger.warn(`[BackupDownload] tar stderr: ${data.toString()}`);
      });

      tarProcess.on('error', (err) => {
        logger.error(`[BackupDownload] tar execution error: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Lỗi nén tệp tải xuống.' });
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/backups/:id/restore
   * Restore database from backup
   */
  async apiRestore(req, res, next) {
    try {
      const canRestore = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:restore');
      if (!canRestore) {
        return res.status(403).json({ success: false, message: 'Không có quyền khôi phục cơ sở dữ liệu (backup:restore).' });
      }

      const backupId = req.params.id;
      const { mode, targetDb, confirmDbName, dryRun, collections } = req.body || {};

      const result = await backupService.restoreBackup(backupId, {
        mode: mode || 'target-db',
        targetDb,
        confirmDbName,
        dryRun: Boolean(dryRun),
        collections: Array.isArray(collections) ? collections : null,
        user: req.user,
      });

      res.json({
        success: true,
        message: dryRun
          ? 'Kiểm tra mô phỏng (dry-run) thành công.'
          : 'Khôi phục cơ sở dữ liệu thành công.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/backups/:id
   */
  async apiDelete(req, res, next) {
    try {
      const canDelete = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:delete');
      if (!canDelete) {
        return res.status(403).json({ success: false, message: 'Không có quyền xóa bản sao lưu (backup:delete).' });
      }

      await backupService.deleteBackup(req.params.id);
      res.json({
        success: true,
        message: 'Đã xóa bản sao lưu thành công.',
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/backups/prune
   */
  async apiPrune(req, res, next) {
    try {
      const canDelete = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'backup:delete');
      if (!canDelete) {
        return res.status(403).json({ success: false, message: 'Không có quyền thực hiện dọn dẹp (backup:delete).' });
      }

      const { dryRun, retentionCount, retentionDays } = req.body || {};
      const result = await backupService.pruneBackups({
        dryRun: Boolean(dryRun),
        retentionCount: retentionCount ? Number(retentionCount) : undefined,
        retentionDays: retentionDays ? Number(retentionDays) : undefined,
      });

      res.json({
        success: true,
        message: result.dryRun ? 'Đã kiểm tra mô phỏng dọn dẹp.' : 'Dọn dẹp bản sao lưu cũ hoàn tất.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/maintenance
   * Toggle maintenance mode
   */
  async apiToggleMaintenance(req, res, next) {
    try {
      const canManage = await itemService.canPerform(req.user, branding.PATHS.ROOT, 'maintenance:manage');
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Không có quyền thay đổi trạng thái Chế độ Bảo trì (maintenance:manage).' });
      }

      const { enabled, reason } = req.body || {};
      const status = await maintenanceService.setMaintenanceMode(
        Boolean(enabled),
        reason || 'Bảo trì hệ thống phục vụ nâng cấp / khôi phục dữ liệu',
        req.user
      );

      res.json({
        success: true,
        message: status.enabled ? 'Đã kích hoạt Chế độ Bảo trì (HTTP 503).' : 'Đã tắt Chế độ Bảo trì.',
        data: status,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = backupController;

