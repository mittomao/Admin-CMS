const mongoose = require('mongoose');

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
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret.standardValues instanceof Map) {
          ret.standardValues = Object.fromEntries(ret.standardValues);
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
