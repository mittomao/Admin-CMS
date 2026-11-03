const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
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
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
    path: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    // Dynamic fields mapping: keyed by immutable fieldId (string), with fallback to fieldName for legacy data
    fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Soft delete flag
    deleted: {
      type: Boolean,
      default: false,
    },
    // Ready for GĐ 4 (Multilingual / Versions)
    languages: [
      {
        code: { type: String, default: 'en' },
        versions: [
          {
            version: { type: Number, default: 1 },
            fields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
            updatedAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'items_master',
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.fields instanceof Map) {
          ret.fields = Object.fromEntries(ret.fields);
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.fields instanceof Map) {
          ret.fields = Object.fromEntries(ret.fields);
        }
        return ret;
      },
    },
  }
);

// Indexes for high performance hierarchical queries
itemSchema.index({ parentId: 1, sortOrder: 1, deleted: 1 });
itemSchema.index({ path: 1, deleted: 1 });
itemSchema.index({ ancestors: 1 });
itemSchema.index({ templateId: 1 });
itemSchema.index({ deleted: 1 });
itemSchema.index({ name: 'text', displayName: 'text' });

/**
 * Instance helper to get a field's value checking fieldId first, then fieldName
 */
itemSchema.methods.getFieldValue = function (fieldId, fieldName) {
  if (!this.fields) return undefined;
  const map = this.fields instanceof Map ? this.fields : new Map(Object.entries(this.fields));
  if (fieldId && map.has(fieldId.toString())) {
    return map.get(fieldId.toString());
  }
  if (fieldName && map.has(fieldName)) {
    return map.get(fieldName);
  }
  return undefined;
};

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
