const mongoose = require('mongoose');

/**
 * AccessControl Model (Collection: access_control_lists)
 * Represents an individual access rule on an Item (DEC-042 / Phase 7).
 */
const accessControlSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item ID is required'],
      index: true,
    },
    principalType: {
      type: String,
      enum: ['user', 'role'],
      required: [true, 'Principal type (user or role) is required'],
    },
    principalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Principal ID is required'],
    },
    right: {
      type: String,
      required: [true, 'Right name is required'],
      trim: true,
      lowercase: true,
    },
    access: {
      type: String,
      enum: ['allow', 'deny'],
      required: [true, 'Access decision (allow or deny) is required'],
    },
    inheritance: {
      type: String,
      enum: ['thisItem', 'descendants', 'both'],
      default: 'both',
    },
  },
  {
    timestamps: true,
    collection: 'access_control_lists',
  }
);

// Unique rule per (item, principalType, principalId, right)
accessControlSchema.index(
  { itemId: 1, principalType: 1, principalId: 1, right: 1 },
  { unique: true }
);

// Fast lookups by principal
accessControlSchema.index({ principalType: 1, principalId: 1 });

module.exports = mongoose.model('AccessControl', accessControlSchema);

