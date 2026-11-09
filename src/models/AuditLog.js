const mongoose = require('mongoose');
require('./User');
require('./Template');

/**
 * AuditLog Model (Collection: audit_logs)
 * Immutable log record for user actions, content lifecycle, and system mutations (DEC-045).
 */
const auditLogSchema = new mongoose.Schema(
  {
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    username: {
      type: String,
      trim: true,
      default: '[anonymous]',
    },
    ip: {
      type: String,
      trim: true,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    itemPath: {
      type: String,
      trim: true,
      default: '',
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null,
    },
    lang: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    version: {
      type: Number,
      default: null,
    },
    db: {
      type: String,
      enum: ['master', 'web'],
      default: 'master',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    result: {
      type: String,
      enum: ['success', 'denied', 'error'],
      default: 'success',
      index: true,
    },
    correlationId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: 'audit_logs',
  }
);

// Compound indexes for optimal queries and cursor-based pagination
auditLogSchema.index({ at: -1 });
auditLogSchema.index({ userId: 1, at: -1 });
auditLogSchema.index({ itemId: 1, at: -1 });
auditLogSchema.index({ action: 1, at: -1 });
auditLogSchema.index({ itemPath: 1, at: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
