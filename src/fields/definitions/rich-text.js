const sanitizeHtml = require('sanitize-html');

const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'class'],
    '*': ['class', 'style', 'id', 'data-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
};

module.exports = {
  type: 'Rich Text',
  displayName: 'Rich Text (HTML WYSIWYG)',
  category: 'Text',
  icon: 'ti ti-typography',
  viewSlug: 'rich-text',
  defaultConfig: {
    height: 350,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !val.toString().replace(/<[^>]*>/g, '').trim())) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    // Chuẩn hóa mọi relative media URLs thành URL gốc tuyệt đối (/media/file/:id)
    const normalized = val.toString().replace(
      /(src=["'])(?:\.\.\/|\/admin\/|\/admin\/content-editor\/)*media\/file\/([a-f\d]{24})/gi,
      '$1/media/file/$2'
    );
    return sanitizeHtml(normalized, SANITIZE_OPTIONS);
  },
  SANITIZE_OPTIONS,
};

