'use strict';

/**
 * Audit Service (GĐ 9 / DEC-045)
 * Asynchronous, immutable audit logging via eventBus,
 * sensitive data redaction, diff truncation, and retention pruning.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { getClientIp, getUserAgent } = require('../utils/requestHelper');

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'csrftoken',
  '_csrf',
  'apikey',
  'privatekey',
  'clientsecret',
  'authorization',
]);

class AuditService {
  constructor() {
    this._listenersInitialized = false;
  }

  /**
   * Redact sensitive keys from log details
   */
  sanitizeData(data, depth = 0) {
    if (depth > 6 || !data) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        const hash = crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
        sanitized[key] = `[TRUNCATED: length=${value.length}, sha256=${hash}] ${value.substring(0, 200)}...`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Log an audit action asynchronously
   */
  async log(entry = {}) {
    try {
      const at = entry.at || new Date();
      const userId = entry.userId || (entry.user && (entry.user._id || entry.user.id)) || null;
      const username = entry.username || (entry.user && entry.user.username) || '[system]';
      const ip = entry.ip || (entry.req ? getClientIp(entry.req) : '127.0.0.1');
      const userAgent = entry.userAgent || (entry.req ? getUserAgent(entry.req) : '');
      const action = (entry.action || 'UNKNOWN_ACTION').toUpperCase();

      const details = this.sanitizeData(entry.details || {});

      const doc = new AuditLog({
        at,
        userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
        username,
        ip,
        userAgent,
        action,
        itemId: entry.itemId && mongoose.Types.ObjectId.isValid(entry.itemId) ? new mongoose.Types.ObjectId(entry.itemId) : null,
        itemPath: entry.itemPath || (entry.item && entry.item.path) || '',
        templateId: entry.templateId && mongoose.Types.ObjectId.isValid(entry.templateId) ? new mongoose.Types.ObjectId(entry.templateId) : null,
        lang: entry.lang || null,
        version: entry.version || null,
        db: entry.db === 'web' ? 'web' : 'master',
        details,
        result: entry.result === 'denied' || entry.result === 'error' ? entry.result : 'success',
        correlationId: entry.correlationId || null,
        durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
      });

      await doc.save();
      return doc;
    } catch (err) {
      // Audit logging errors must never disrupt business operations
      logger.error(`[auditService] Failed to write audit log: ${err.message}`, { stack: err.stack });
      return null;
    }
  }

  /**
   * Query audit logs with pagination and filters
   */
  async list(options = {}, _currentUser = null) {
    const {
      action,
      username,
      userId,
      itemId,
      itemPath,
      from,
      to,
      result,
      db,
      q,
      page = 1,
      limit = 20,
      sort = 'at',
      sortDir = -1,
    } = options;

    const query = {};

    if (action) {
      query.action = action.trim().toUpperCase();
    }

    if (username) {
      query.username = new RegExp(username.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      query.itemId = new mongoose.Types.ObjectId(itemId);
    }

    if (itemPath) {
      query.itemPath = new RegExp(itemPath.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    if (result) {
      query.result = result.toLowerCase();
    }

    if (db) {
      query.db = db.toLowerCase();
    }

    if (from || to) {
      query.at = {};
      if (from) {
        query.at.$gte = new Date(from);
      }
      if (to) {
        query.at.$lte = new Date(to);
      }
    }

    if (q && typeof q === 'string' && q.trim()) {
      const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { action: searchRegex },
        { username: searchRegex },
        { itemPath: searchRegex },
        { 'details.summary': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sort || 'at'] = sortDir === 1 || sortDir === 'asc' ? 1 : -1;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'username fullName email')
        .populate('templateId', 'name displayName icon')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get single audit entry by ID
   */
  async getById(id) {
    return AuditLog.findById(id)
      .populate('userId', 'username fullName email')
      .populate('templateId', 'name displayName icon')
      .lean();
  }

  /**
   * Get audit history for a specific item
   */
  async getItemHistory(itemId, options = {}) {
    return this.list({
      ...options,
      itemId,
    });
  }

  /**
   * Export audit logs to RFC 4180 CSV
   */
  async exportCsv(options = {}) {
    const { logs } = await this.list({ ...options, limit: 5000 });

    const headers = [
      'Timestamp (ISO)',
      'Action',
      'User',
      'Result',
      'Item Path',
      'Item ID',
      'Language',
      'Version',
      'Database',
      'IP Address',
      'Summary / Details',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = [headers.map(escapeCsv).join(',')];

    for (const log of logs) {
      const summary = log.details?.summary || (log.details ? JSON.stringify(log.details) : '');
      const row = [
        log.at ? new Date(log.at).toISOString() : '',
        log.action || '',
        log.username || '',
        log.result || '',
        log.itemPath || '',
        log.itemId ? log.itemId.toString() : '',
        log.lang || '',
        log.version || '',
        log.db || 'master',
        log.ip || '',
        summary,
      ];
      rows.push(row.map(escapeCsv).join(','));
    }

    return rows.join('\r\n');
  }

  /**
   * Prune audit logs older than retention days (DEC-045)
   */
  async pruneExpired(retentionDays, isDryRun = false) {
    const days = parseInt(retentionDays, 10) || 90;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const expiredCount = await AuditLog.countDocuments({ at: { $lt: cutoffDate } });

    if (!isDryRun && expiredCount > 0) {
      await AuditLog.deleteMany({ at: { $lt: cutoffDate } });
      await this.log({
        action: 'AUDIT_PRUNE',
        username: '[cron/retention]',
        details: {
          retentionDays: days,
          cutoffDate: cutoffDate.toISOString(),
          prunedCount: expiredCount,
        },
      });
    }

    return {
      retentionDays: days,
      cutoffDate,
      expiredCount,
      isDryRun,
    };
  }

  /**
   * Wire listeners to eventBus
   */
  initEventListeners() {
    if (this._listenersInitialized) return;
    this._listenersInitialized = true;

    // 1. Auth events
    eventBus.on('auth.login', (data) => {
      this.log({
        action: 'AUTH_LOGIN',
        user: data.user,
        req: data.req,
        details: { method: 'password', ip: data.req ? getClientIp(data.req) : '127.0.0.1' },
      });
    });

    eventBus.on('auth.logout', (data) => {
      this.log({
        action: 'AUTH_LOGOUT',
        user: data.user,
        req: data.req,
      });
    });

    eventBus.on('auth.failed', (data) => {
      this.log({
        action: 'AUTH_FAILED',
        username: data.username,
        req: data.req,
        result: 'denied',
        details: { reason: data.error },
      });
    });

    // 2. Item CRUD & lifecycle events
    eventBus.on('item.created', (data) => {
      this.log({
        action: 'ITEM_CREATE',
        user: data.user,
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        templateId: data.item?.templateId,
        details: { name: data.item?.name, parentId: data.item?.parentId },
      });
    });

    eventBus.on('item.updated', (data) => {
      this.log({
        action: 'ITEM_UPDATE',
        user: data.user,
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        lang: data.lang,
        version: data.version,
        details: {
          fields: data.updatedFields,
          summary: `Updated fields: ${(data.updatedFields || []).join(', ')}`,
        },
      });
    });

    eventBus.on('item.renamed', (data) => {
      this.log({
        action: 'ITEM_RENAME',
        user: data.user,
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        details: { oldName: data.oldName, newName: data.newName },
      });
    });

    eventBus.on('item.moved', (data) => {
      this.log({
        action: 'ITEM_MOVE',
        user: data.user,
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        details: { oldPath: data.oldPath, newPath: data.item?.path, newParentId: data.newParentId },
      });
    });

    eventBus.on('item.sorted', (data) => {
      this.log({
        action: 'ITEM_SORT',
        user: data.user,
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        details: { direction: data.direction },
      });
    });

    eventBus.on('item.duplicated', (data) => {
      this.log({
        action: 'ITEM_DUPLICATE',
        user: data.user,
        userId: data.userId,
        itemId: data.newItem?._id,
        itemPath: data.newItem?.path,
        details: { sourceItemId: data.sourceItem?._id, sourcePath: data.sourceItem?.path },
      });
    });

    eventBus.on('item.copied', (data) => {
      this.log({
        action: 'ITEM_COPY',
        user: data.user,
        userId: data.userId,
        itemId: data.newItem?._id,
        itemPath: data.newItem?.path,
        details: { sourceItemId: data.sourceItem?._id, targetParentId: data.targetParentId },
      });
    });

    eventBus.on('item.deleted', (data) => {
      this.log({
        action: 'ITEM_DELETE',
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        details: {
          deletionBatchId: data.deletionBatchId,
          deletedCount: data.deletedCount,
          summary: `Đã đưa vào Thùng rác (${data.deletedCount} items trong nhánh)`,
        },
      });
    });

    eventBus.on('item.restored', (data) => {
      this.log({
        action: 'ITEM_RESTORE',
        userId: data.userId,
        itemId: data.item?._id,
        itemPath: data.item?.path,
        details: {
          restoredCount: data.restoredCount,
          targetParentId: data.targetParentId,
          summary: `Đã khôi phục từ Thùng rác về '${data.item?.path}' (${data.restoredCount} items)`,
        },
      });
    });

    eventBus.on('item.purged', (data) => {
      this.log({
        action: 'ITEM_PURGE',
        user: data.user,
        itemId: data.itemId,
        details: {
          itemName: data.itemName,
          purgedCount: data.purgedCount,
          purgedIds: data.purgedIds,
          summary: `Đã xoá vĩnh viễn (Hard Delete) ${data.purgedCount} items khỏi MongoDB & Web Store`,
        },
      });
    });

    // 3. Versioning events
    eventBus.on('version.added', (data) => {
      this.log({
        action: 'VERSION_CREATE',
        user: data.user,
        userId: data.userId,
        itemId: data.itemId,
        itemPath: data.itemPath,
        lang: data.lang,
        version: data.version,
      });
    });

    eventBus.on('version.deleted', (data) => {
      this.log({
        action: 'VERSION_DELETE',
        user: data.user,
        userId: data.userId,
        itemId: data.itemId,
        itemPath: data.itemPath,
        lang: data.lang,
        version: data.version,
      });
    });

    eventBus.on('version.restored', (data) => {
      this.log({
        action: 'VERSION_RESTORE',
        user: data.user,
        userId: data.userId,
        itemId: data.itemId,
        itemPath: data.itemPath,
        lang: data.lang,
        version: data.version,
      });
    });

    // 4. Workflow & Publishing events
    eventBus.on('workflow.executed', (data) => {
      this.log({
        action: 'WORKFLOW_STATE_CHANGE',
        user: data.user,
        userId: data.userId,
        itemId: data.itemId,
        itemPath: data.itemPath,
        lang: data.lang,
        version: data.version,
        details: {
          command: data.command,
          fromState: data.fromState,
          toState: data.toState,
          comment: data.comment,
        },
      });
    });

    eventBus.on('item.published', (data) => {
      this.log({
        action: 'ITEM_PUBLISH',
        user: data.user,
        itemId: data.itemId,
        itemPath: data.itemPath,
        db: 'web',
        details: {
          publishType: data.publishType,
          languages: data.languages,
          summary: `Đã xuất bản lên Web database (${data.publishType || 'incremental'})`,
        },
      });
    });

    eventBus.on('item.unpublished', (data) => {
      this.log({
        action: 'ITEM_UNPUBLISH',
        user: data.user,
        itemId: data.itemId,
        db: 'web',
        details: {
          reason: data.reason || 'Unpublished',
          summary: 'Đã gỡ bỏ khỏi Web database',
        },
      });
    });

    // 5. Presentation events (GĐ 6 / DEC-040 / DEC-045)
    eventBus.on('presentation.changed', (data) => {
      this.log({
        action: 'ITEM_PRESENTATION_UPDATE',
        user: data.user,
        userId: data.userId,
        itemId: data.itemId,
        itemPath: data.itemPath,
        templateId: data.templateId,
        lang: data.lang,
        version: data.version,
        details: {
          scope: data.scope,
          layoutId: data.layoutId,
          renderingsCount: data.renderingsCount,
          isReset: data.isReset || false,
          summary: data.isReset
            ? `Đã reset presentation về standard presentation`
            : `Đã cập nhật ${data.scope} presentation (layoutId: ${data.layoutId || 'none'}, renderings: ${data.renderingsCount || 0})`,
        },
      });
    });

    // 6. Security & ACL events
    eventBus.on('acl.changed', (data) => {
      this.log({
        action: 'ACL_UPDATE',
        itemId: data.itemId,
        details: { principalId: data.principalId, right: data.right },
      });
    });

    eventBus.on('role.changed', (data) => {
      this.log({
        action: 'ROLE_CHANGE',
        user: data.user,
        details: { roleName: data.roleName, action: data.action },
      });
    });

    eventBus.on('user.changed', (data) => {
      this.log({
        action: 'USER_CHANGE',
        user: data.user,
        details: { targetUsername: data.targetUsername, action: data.action },
      });
    });

    // 7. Template events
    eventBus.on('template.changed', (data) => {
      this.log({
        action: 'TEMPLATE_CHANGE',
        user: data.user,
        itemId: data.templateId,
        details: { name: data.name, action: data.action },
      });
    });

    logger.info('[auditService] Event listeners initialized successfully.');
  }
}

const auditService = new AuditService();
auditService.initEventListeners();

module.exports = auditService;
