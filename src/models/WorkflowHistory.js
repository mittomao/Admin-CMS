const mongoose = require('mongoose');

const workflowHistorySchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
      index: true,
    },
    lang: {
      type: String,
      required: true,
      default: 'vi',
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    fromState: {
      type: mongoose.Schema.Types.Mixed, // ObjectId or Object with id, name
      default: null,
    },
    toState: {
      type: mongoose.Schema.Types.Mixed, // ObjectId or Object with id, name
      required: true,
      index: true,
    },
    command: {
      type: mongoose.Schema.Types.Mixed, // ObjectId or String or Object
      default: null,
    },
    comment: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    username: {
      type: String,
      default: '',
    },
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'workflow_histories',
    timestamps: false,
  }
);

workflowHistorySchema.index({ itemId: 1, lang: 1, version: 1, at: -1 });

const WorkflowHistory = mongoose.model('WorkflowHistory', workflowHistorySchema);

module.exports = WorkflowHistory;

