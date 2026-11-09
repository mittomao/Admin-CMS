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
      default: 'maincontent',
      trim: true,
    },
    placeholderKey: {
      type: String,
      default: 'maincontent',
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

const presentationSchema = new mongoose.Schema(
  {
    layoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
    renderings: [renderingInstanceSchema],
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      default: 'Single-Line Text',
    },
    required: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: '',
    },
    source: {
      type: String,
      default: '',
    },
    shared: {
      type: Boolean,
      default: false,
    },
    unversioned: {
      type: Boolean,
      default: false,
    },
    helpText: {
      type: String,
      default: '',
    },
    validation: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    config: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    visibility: {
      dependsOn: { type: String, default: '' },
      operator: { type: String, default: '' },
      value: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    permissions: {
      readRoles: [{ type: String }],
      writeRoles: [{ type: String }],
      hiddenRoles: [{ type: String }],
    },
    layout: {
      colSpan: { type: Number, default: 12 },
      groupName: { type: String, default: '' },
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
  },
  { _id: true, timestamps: true }
);

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 100,
    },
    fields: [fieldSchema],
  },
  { _id: true, timestamps: true }
);

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: 'ti ti-file-text',
    },
    description: {
      type: String,
      default: '',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    path: {
      type: String,
      trim: true,
      default: '',
    },
    baseTemplates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    sections: [sectionSchema],
    // GĐ 8: Workflow assignment for items instantiated from this template
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      default: null,
    },
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      default: null,
    },
    // Key: fieldId (String of field._id), Value: default value
    standardValues: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    insertOptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    // Standard Presentation (kế thừa bố cục mặc định cho các items tạo từ Template này - GĐ 6)
    presentation: presentationSchema,
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
    collection: 'templates',
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.standardValues instanceof Map) {
          ret.standardValues = Object.fromEntries(ret.standardValues);
        }
        if (ret.presentation && Array.isArray(ret.presentation.renderings)) {
          ret.presentation.renderings.forEach((r) => {
            if (r.parameters instanceof Map) {
              r.parameters = Object.fromEntries(r.parameters);
            }
          });
        }
        if (Array.isArray(ret.sections)) {
          ret.sections.forEach((s) => {
            if (Array.isArray(s.fields)) {
              s.fields.forEach((f) => {
                if (f.config instanceof Map) {
                  f.config = Object.fromEntries(f.config);
                }
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
        if (ret.standardValues instanceof Map) {
          ret.standardValues = Object.fromEntries(ret.standardValues);
        }
        if (ret.presentation && Array.isArray(ret.presentation.renderings)) {
          ret.presentation.renderings.forEach((r) => {
            if (r.parameters instanceof Map) {
              r.parameters = Object.fromEntries(r.parameters);
            }
          });
        }
        if (Array.isArray(ret.sections)) {
          ret.sections.forEach((s) => {
            if (Array.isArray(s.fields)) {
              s.fields.forEach((f) => {
                if (f.config instanceof Map) {
                  f.config = Object.fromEntries(f.config);
                }
              });
            }
          });
        }
        return ret;
      },
    },
  }
);

templateSchema.index({ baseTemplates: 1 });
templateSchema.index({ path: 1 });
templateSchema.index({ isSystem: 1 });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
