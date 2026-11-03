const mongoose = require('mongoose');

const renderingInstanceSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true, // UUID v4
    },
    renderingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    placeholder: {
      type: String,
      default: 'main',
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    datasourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    parameters: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const devicePresentationSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    layoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    renderings: [renderingInstanceSchema],
  },
  { _id: false }
);

const itemVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const itemLanguageSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'vi',
    },
    unversionedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    versions: [itemVersionSchema],
  },
  { _id: true }
);

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
    // Dynamic fields mapping (legacy/fallback from GĐ 2 & 3)
    fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Cấp độ 1: Shared Fields (dùng chung cho mọi ngôn ngữ và mọi version)
    sharedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Cấp độ 2 & 3: Đa ngôn ngữ và đa phiên bản (GĐ 4)
    languages: [itemLanguageSchema],
    // Cấu hình Headless Presentation (chừa sẵn schema cho GĐ 6 theo DEC-020 & DEC-021)
    presentation: {
      shared: {
        devices: [devicePresentationSchema],
      },
      final: [
        {
          language: { type: String, lowercase: true, trim: true },
          version: { type: Number },
          devices: [devicePresentationSchema],
        },
      ],
    },
    // Soft delete flag
    deleted: {
      type: Boolean,
      default: false,
    },
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
        const mapToObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m || {});
        if (ret.fields) ret.fields = mapToObj(ret.fields);
        if (ret.sharedFields) ret.sharedFields = mapToObj(ret.sharedFields);
        if (Array.isArray(ret.languages)) {
          ret.languages.forEach((lang) => {
            if (lang.unversionedFields) lang.unversionedFields = mapToObj(lang.unversionedFields);
            if (Array.isArray(lang.versions)) {
              lang.versions.forEach((v) => {
                if (v.fields) v.fields = mapToObj(v.fields);
              });
            }
          });
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        const mapToObj = (m) => (m instanceof Map ? Object.fromEntries(m) : m || {});
        if (ret.fields) ret.fields = mapToObj(ret.fields);
        if (ret.sharedFields) ret.sharedFields = mapToObj(ret.sharedFields);
        if (Array.isArray(ret.languages)) {
          ret.languages.forEach((lang) => {
            if (lang.unversionedFields) lang.unversionedFields = mapToObj(lang.unversionedFields);
            if (Array.isArray(lang.versions)) {
              lang.versions.forEach((v) => {
                if (v.fields) v.fields = mapToObj(v.fields);
              });
            }
          });
        }
        return ret;
      },
    },
  }
);

// Indexes for high performance hierarchical and multilingual queries
itemSchema.index({ parentId: 1, sortOrder: 1, deleted: 1 });
itemSchema.index({ path: 1, deleted: 1 });
itemSchema.index({ ancestors: 1 });
itemSchema.index({ templateId: 1 });
itemSchema.index({ deleted: 1 });
itemSchema.index({ name: 'text', displayName: 'text' });
itemSchema.index({ 'languages.code': 1 });
itemSchema.index({ 'languages.versions.version': 1 });
itemSchema.index({ _id: 1, 'languages.code': 1, 'languages.versions.version': 1 });

/**
 * Instance helper to get a field's value checking fieldId first, then fieldName (legacy support)
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

/**
 * Get language entry
 */
itemSchema.methods.getLanguage = function (langCode = 'vi') {
  if (!this.languages || !this.languages.length) return null;
  const code = (langCode || 'vi').toLowerCase().trim();
  return this.languages.find((l) => l.code === code) || null;
};

/**
 * Get version entry
 */
itemSchema.methods.getVersion = function (langCode = 'vi', versionNumber = 1) {
  const lang = this.getLanguage(langCode);
  if (!lang || !lang.versions || !lang.versions.length) return null;
  const vNum = parseInt(versionNumber, 10) || 1;
  return lang.versions.find((v) => v.version === vNum) || null;
};

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
