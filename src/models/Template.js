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
      enum: [
        'Single-Line Text',
        'Multi-Line Text',
        'Rich Text',
        'Checkbox',
        'Date',
        'Number',
        'Droplist',
        'Image',
      ],
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
      type: String,
      default: '',
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
    baseTemplates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    sections: [sectionSchema],
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
    presentation: {
      devices: [devicePresentationSchema],
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
    collection: 'templates',
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.standardValues instanceof Map) {
          ret.standardValues = Object.fromEntries(ret.standardValues);
        }
        if (ret.presentation && Array.isArray(ret.presentation.devices)) {
          ret.presentation.devices.forEach((d) => {
            if (Array.isArray(d.renderings)) {
              d.renderings.forEach((r) => {
                if (r.parameters instanceof Map) {
                  r.parameters = Object.fromEntries(r.parameters);
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
        if (ret.presentation && Array.isArray(ret.presentation.devices)) {
          ret.presentation.devices.forEach((d) => {
            if (Array.isArray(d.renderings)) {
              d.renderings.forEach((r) => {
                if (r.parameters instanceof Map) {
                  r.parameters = Object.fromEntries(r.parameters);
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
templateSchema.index({ isSystem: 1 });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
