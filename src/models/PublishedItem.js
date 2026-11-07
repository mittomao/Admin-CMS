const mongoose = require('mongoose');

/**
 * PublishedItem Model (Collection: items_web)
 * Read-only store for public website delivery (Site Renderer - GĐ 10)
 * Maintains identical _id and tree materialized path from items_master.
 */
const publishedLanguageVersionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    publishedVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    unversionedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    finalLayout: {
      layoutId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      renderings: [
        {
          uid: { type: String, required: true },
          renderingId: { type: mongoose.Schema.Types.ObjectId, default: null },
          placeholder: { type: String, default: 'maincontent' },
          placeholderKey: { type: String, default: 'maincontent' },
          sortOrder: { type: Number, default: 100 },
          datasourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
          parameters: { type: Map, of: mongoose.Schema.Types.Mixed, default: () => new Map() },
          hidden: { type: Boolean, default: false },
        },
      ],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const publishedItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublishedItem',
      default: null,
    },
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PublishedItem',
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
    fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    sharedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    languages: [publishedLanguageVersionSchema],
    presentation: {
      shared: {
        layoutId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        renderings: [
          {
            uid: { type: String, required: true },
            renderingId: { type: mongoose.Schema.Types.ObjectId, default: null },
            placeholder: { type: String, default: 'maincontent' },
            placeholderKey: { type: String, default: 'maincontent' },
            sortOrder: { type: Number, default: 100 },
            datasourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
            parameters: { type: Map, of: mongoose.Schema.Types.Mixed, default: () => new Map() },
            hidden: { type: Boolean, default: false },
          },
        ],
      },
    },
    sourceVersion: {
      type: Number,
      default: 1,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'items_web',
    timestamps: true,
  }
);

// Indexes optimizing Public Site Renderer (GĐ 10) queries
publishedItemSchema.index({ path: 1 }, { unique: true });
publishedItemSchema.index({ parentId: 1, sortOrder: 1, isDeleted: 1 });
publishedItemSchema.index({ ancestors: 1 });
publishedItemSchema.index({ templateId: 1 });
publishedItemSchema.index({ 'languages.code': 1 });

/**
 * Instance helper to get a field value from published item
 */
publishedItemSchema.methods.getFieldValue = function (fieldId, fieldName, langCode = 'vi') {
  const code = (langCode || 'vi').toLowerCase();
  const langEntry = this.languages.find((l) => l.code === code);

  // 1. Check versioned fields of published language
  if (langEntry && langEntry.fields) {
    const vMap = langEntry.fields instanceof Map ? langEntry.fields : new Map(Object.entries(langEntry.fields));
    if (fieldId && vMap.has(fieldId.toString())) return vMap.get(fieldId.toString());
    if (fieldName && vMap.has(fieldName)) return vMap.get(fieldName);
  }

  // 2. Check unversioned fields
  if (langEntry && langEntry.unversionedFields) {
    const uMap = langEntry.unversionedFields instanceof Map ? langEntry.unversionedFields : new Map(Object.entries(langEntry.unversionedFields));
    if (fieldId && uMap.has(fieldId.toString())) return uMap.get(fieldId.toString());
    if (fieldName && uMap.has(fieldName)) return uMap.get(fieldName);
  }

  // 3. Check shared fields
  if (this.sharedFields) {
    const sMap = this.sharedFields instanceof Map ? this.sharedFields : new Map(Object.entries(this.sharedFields));
    if (fieldId && sMap.has(fieldId.toString())) return sMap.get(fieldId.toString());
    if (fieldName && sMap.has(fieldName)) return sMap.get(fieldName);
  }

  // 4. Check base fields
  if (this.fields) {
    const fMap = this.fields instanceof Map ? this.fields : new Map(Object.entries(this.fields));
    if (fieldId && fMap.has(fieldId.toString())) return fMap.get(fieldId.toString());
    if (fieldName && fMap.has(fieldName)) return fMap.get(fieldName);
  }

  return undefined;
};

const PublishedItem = mongoose.model('PublishedItem', publishedItemSchema);

module.exports = PublishedItem;

