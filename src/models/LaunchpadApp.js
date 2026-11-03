const mongoose = require('mongoose');

const launchpadAppSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Application name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: '📑',
    },
    iconBg: {
      type: String,
      enum: ['blue', 'green', 'amber', 'purple', 'rose', 'indigo'],
      default: 'blue',
    },
    group: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Application URL is required'],
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    allowedRoles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'launchpad_apps',
  }
);

launchpadAppSchema.index({ group: 1, sortOrder: 1 });

module.exports = mongoose.model('LaunchpadApp', launchpadAppSchema);

