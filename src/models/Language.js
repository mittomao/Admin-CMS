const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // e.g., 'en', 'vi', 'vi-vn'
    },
    name: {
      type: String,
      required: true,
      trim: true, // e.g., 'English', 'Tiếng Việt'
    },
    nativeName: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: 'ti ti-world', // e.g., icon or flag
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
    collection: 'languages',
  }
);

languageSchema.index({ active: 1, sortOrder: 1 });

const Language = mongoose.model('Language', languageSchema);

module.exports = Language;
