const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Domain name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'domains',
  }
);

module.exports = mongoose.model('Domain', domainSchema);

