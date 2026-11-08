const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
      default: 'sitecore',
    },
    memberOf: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

module.exports = mongoose.model('Role', roleSchema);

