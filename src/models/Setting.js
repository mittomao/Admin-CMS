'use strict';

const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  }
);

module.exports = mongoose.model('Setting', settingSchema);

