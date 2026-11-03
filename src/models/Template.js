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
    sortOrder: {
      type: Number,
      default: 100,
    },
  },
  { _id: true }
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
  { _id: true }
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
    sections: [sectionSchema],
    insertOptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    // Placeholders for GĐ 3 (Template Manager)
    baseTemplates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
      },
    ],
    standardValues: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'templates',
  }
);

// unique: true on name already creates an index

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
