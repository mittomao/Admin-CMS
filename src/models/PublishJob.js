const mongoose = require('mongoose');

const publishJobSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['Item', 'Smart', 'Republish', 'Site'],
      default: 'Item',
    },
    rootItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    includeSubitems: {
      type: Boolean,
      default: false,
    },
    includeRelated: {
      type: Boolean,
      default: true,
    },
    languages: [
      {
        type: String,
        default: 'vi',
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Success', 'Failed', 'Cancelled'],
      default: 'Pending',
    },
    total: {
      type: Number,
      default: 0,
    },
    processed: {
      type: Number,
      default: 0,
    },
    currentStep: {
      type: String,
      default: 'Initiating',
    },
    lockToken: {
      type: String,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String,
      default: null,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublishHistory',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'publish_jobs',
    timestamps: true,
  }
);

publishJobSchema.index({ status: 1, createdAt: -1 });
publishJobSchema.index({ lockToken: 1 });

const PublishJob = mongoose.model('PublishJob', publishJobSchema);

module.exports = PublishJob;

