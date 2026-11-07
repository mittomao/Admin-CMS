const mongoose = require('mongoose');

const publishHistorySchema = new mongoose.Schema(
  {
    publishType: {
      type: String,
      enum: ['Item', 'Smart', 'Republish', 'Site'],
      default: 'Item',
    },
    sourceDatabase: {
      type: String,
      default: 'master',
    },
    targetDatabase: {
      type: String,
      default: 'web',
    },
    rootItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    totalItemsProcessed: {
      type: Number,
      default: 0,
    },
    totalItemsPublished: {
      type: Number,
      default: 0,
    },
    languages: [
      {
        type: String,
        default: 'vi',
      },
    ],
    status: {
      type: String,
      enum: ['InProgress', 'Success', 'Failed', 'Cancelled'],
      default: 'InProgress',
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    logDetails: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
        },
        path: String,
        action: String,
        details: String,
      },
    ],
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    collection: 'publish_histories',
    timestamps: true,
  }
);

publishHistorySchema.index({ startedAt: -1 });
publishHistorySchema.index({ status: 1 });
publishHistorySchema.index({ rootItemId: 1 });

const PublishHistory = mongoose.model('PublishHistory', publishHistorySchema);

module.exports = PublishHistory;

