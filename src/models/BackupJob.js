const mongoose = require('mongoose');

const backupJobSchema = new mongoose.Schema(
  {
    backupId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['backup', 'restore', 'verify', 'prune'],
      default: 'backup',
    },
    type: {
      type: String,
      enum: ['full', 'pre-restore', 'master-only', 'web-only'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Success', 'Failed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    lockToken: {
      type: String,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    totalCollections: {
      type: Number,
      default: 0,
    },
    processedCollections: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    currentStep: {
      type: String,
      default: 'Initiating',
    },
    archivePath: {
      type: String,
      default: null,
    },
    relativeArchivePath: {
      type: String,
      default: null,
    },
    checksum: {
      type: String,
      default: null,
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    engine: {
      type: String,
      enum: ['mongodump', 'ndjson'],
      default: 'mongodump',
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    options: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    manifest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    mediaManifest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    initiatedByUsername: {
      type: String,
      default: 'system',
    },
    note: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active job queries & locking
backupJobSchema.index({ status: 1, mode: 1 });
backupJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BackupJob', backupJobSchema);

