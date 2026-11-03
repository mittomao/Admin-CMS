'use strict';

const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const Media = require('../models/Media');
const Item = require('../models/Item');

/**
 * Whitelist các thẻ và thuộc tính HTML được phép cho Rich Text
 */
const RICH_TEXT_SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe',
    'img', 'span', 'figure', 'figcaption'
  ],
  allowedAttributes: {
    '*': ['class', 'style', 'title', 'id'],
    a: ['href', 'name', 'target', 'rel', 'data-item-id'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'data-media-id', 'style'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'style']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data']
  }
};

/**
 * Làm sạch mã HTML Rich Text tại tầng server chống Stored XSS
 * @param {string} html
 * @returns {string}
 */
function sanitizeRichText(html) {
  if (!html || typeof html !== 'string') return '';
  return sanitizeHtml(html, RICH_TEXT_SANITIZE_OPTIONS);
}

/**
 * Phân giải tham chiếu Media & Item nội bộ trong Rich Text HTML
 * Cung cấp cho Preview và Headless Delivery API / Layout Service (GĐ 10)
 * @param {string} html
 * @param {Object} options
 * @param {string} options.lang - Mã ngôn ngữ (ví dụ: 'en', 'vi')
 * @returns {Promise<string>}
 */
async function resolveRichText(html, _options = {}) {
  if (!html || typeof html !== 'string') return '';

  let sanitized = sanitizeRichText(html);

  // 1. Phân giải các thẻ <img> có data-media-id=":id"
  const mediaMatches = [...sanitized.matchAll(/<img[^>]*data-media-id=["']([a-f\d]{24})["'][^>]*>/gi)];
  if (mediaMatches.length > 0) {
    const mediaIds = [...new Set(mediaMatches.map((m) => m[1]))];
    const objectIds = mediaIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const mediaDocs = await Media.find({
      _id: { $in: objectIds },
      isDeleted: false
    }).lean();

    const mediaMap = new Map(mediaDocs.map((doc) => [doc._id.toString(), doc]));

    for (const match of mediaMatches) {
      const fullImgTag = match[0];
      const mediaId = match[1];
      const media = mediaMap.get(mediaId);

      if (media) {
        const fileUrl = `/media/file/${media._id}`;
        // Cập nhật lại src thành URL chuẩn
        let updatedTag = fullImgTag.replace(/src=["'][^"']*["']/i, `src="${fileUrl}"`);
        sanitized = sanitized.replace(fullImgTag, updatedTag);
      }
    }
  }

  // 2. Phân giải các thẻ <a> có data-item-id=":id"
  const itemMatches = [...sanitized.matchAll(/<a[^>]*data-item-id=["']([a-f\d]{24})["'][^>]*>/gi)];
  if (itemMatches.length > 0) {
    const itemIds = [...new Set(itemMatches.map((m) => m[1]))];
    const objectIds = itemIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const itemDocs = await Item.find({
      _id: { $in: objectIds },
      deleted: { $ne: true }
    })
      .select('_id path displayName name')
      .lean();

    const itemMap = new Map(itemDocs.map((doc) => [doc._id.toString(), doc]));

    for (const match of itemMatches) {
      const fullLinkTag = match[0];
      const itemId = match[1];
      const item = itemMap.get(itemId);

      if (item && item.path) {
        // Cập nhật href thành path hiện tại của item
        let updatedTag;
        if (/href=["'][^"']*["']/i.test(fullLinkTag)) {
          updatedTag = fullLinkTag.replace(/href=["'][^"']*["']/i, `href="${item.path}"`);
        } else {
          updatedTag = fullLinkTag.replace('<a', `<a href="${item.path}"`);
        }
        sanitized = sanitized.replace(fullLinkTag, updatedTag);
      }
    }
  }

  return sanitized;
}

module.exports = {
  sanitizeRichText,
  resolveRichText,
  RICH_TEXT_SANITIZE_OPTIONS
};
