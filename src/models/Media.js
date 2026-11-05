'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const fileDetailsSchema = new Schema(
  {
    originalName: { type: String, trim: true },
    storagePath: { type: String, required: true },
    thumbnailPath: { type: String, default: null },
    mimeType: { type: String, required: true, index: true },
    fileSize: { type: Number, default: 0 },
    dimensions: {
      width: { type: Number, default: null },
      height: { type: Number, default: null }
    },
    extension: { type: String, trim: true, lowercase: true },
    checksum: { type: String, index: true },
    // Cloudinary Storage extensions
    provider: { type: String, enum: ['local', 'cloudinary'], default: 'local', index: true },
    publicId: { type: String, default: null, index: true },
    secureUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null }
  },
  { _id: false }
);

const mediaSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Media name is required'],
      trim: true,
      maxlength: [200, 'Media name cannot exceed 200 characters']
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [250, 'Display name cannot exceed 250 characters']
    },
    isFolder: {
      type: Boolean,
      default: false,
      index: true
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
      index: true
    },
    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Media'
      }
    ],
    path: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fileDetails: {
      type: fileDetailsSchema,
      default: null
    },
    // altText: lưu theo từng ngôn ngữ (ví dụ { en: "Banner", vi: "Biển hiệu" })
    altText: {
      type: Map,
      of: String,
      default: () => new Map()
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    sortOrder: {
      type: Number,
      default: 100
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'media'
  }
);

// Chỉ mục hỗ trợ tối ưu tìm kiếm và duyệt phân cấp
mediaSchema.index({ parentId: 1, isFolder: 1, isDeleted: 1, sortOrder: 1 });
mediaSchema.index({ ancestors: 1 });
mediaSchema.index({ name: 'text', displayName: 'text' });

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;

