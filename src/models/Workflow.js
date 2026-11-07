const mongoose = require('mongoose');

const workflowActionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    actionType: {
      type: String,
      enum: ['autoPublish', 'validate', 'notify', 'lockItem', 'custom'],
      default: 'autoPublish',
    },
    parameters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
  },
  { _id: true }
);

const workflowCommandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    targetStateId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    requireComment: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    actions: [workflowActionSchema],
  },
  { _id: true }
);

const workflowStateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    isInitial: {
      type: Boolean,
      default: false,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    commands: [workflowCommandSchema],
  },
  { _id: true }
);

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    initialStateId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    states: [workflowStateSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

workflowSchema.index({ name: 1 });
workflowSchema.index({ itemId: 1 });

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;

