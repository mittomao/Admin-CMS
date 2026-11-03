const sanitizeHtml = require('sanitize-html');

/**
 * Standard sanitize options for Rich Text fields to prevent XSS.
 * Allows common formatting and structural HTML tags while stripping scripts, iframes, inline event handlers.
 */
const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'class'],
    '*': ['class', 'style', 'id', 'data-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
};

const fieldRegistry = {
  'Single-Line Text': {
    name: 'Single-Line Text',
    validate(val, def) {
      if (def.required && (!val || !val.toString().trim())) {
        return `${def.title || def.name} is required.`;
      }
      return null;
    },
    sanitize(val) {
      if (val === undefined || val === null) return '';
      return val.toString().trim();
    },
  },

  'Multi-Line Text': {
    name: 'Multi-Line Text',
    validate(val, def) {
      if (def.required && (!val || !val.toString().trim())) {
        return `${def.title || def.name} is required.`;
      }
      return null;
    },
    sanitize(val) {
      if (val === undefined || val === null) return '';
      return val.toString();
    },
  },

  'Rich Text': {
    name: 'Rich Text',
    validate(val, def) {
      if (def.required && (!val || !val.toString().replace(/<[^>]*>/g, '').trim())) {
        return `${def.title || def.name} is required.`;
      }
      return null;
    },
    sanitize(val) {
      if (!val) return '';
      return sanitizeHtml(val.toString(), SANITIZE_OPTIONS);
    },
  },

  Checkbox: {
    name: 'Checkbox',
    validate() {
      return null;
    },
    sanitize(val) {
      return val === true || val === 'true' || val === '1' || val === 'on';
    },
  },

  Date: {
    name: 'Date',
    validate(val, def) {
      if (def.required && !val) {
        return `${def.title || def.name} is required.`;
      }
      if (val && isNaN(Date.parse(val))) {
        return `${def.title || def.name} must be a valid date.`;
      }
      return null;
    },
    sanitize(val) {
      if (!val) return '';
      return val.toString().trim();
    },
  },

  Number: {
    name: 'Number',
    validate(val, def) {
      if (def.required && (val === undefined || val === null || val === '')) {
        return `${def.title || def.name} is required.`;
      }
      if (val !== undefined && val !== null && val !== '' && isNaN(Number(val))) {
        return `${def.title || def.name} must be a valid number.`;
      }
      return null;
    },
    sanitize(val) {
      if (val === undefined || val === null || val === '') return null;
      return Number(val);
    },
  },

  Droplist: {
    name: 'Droplist',
    validate(val, def) {
      if (def.required && (!val || !val.toString().trim())) {
        return `${def.title || def.name} is required.`;
      }
      return null;
    },
    sanitize(val) {
      if (val === undefined || val === null) return '';
      return val.toString().trim();
    },
    getOptions(def) {
      if (!def.source) return [];
      return def.source
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    },
  },

  Image: {
    name: 'Image',
    validate(val, def) {
      if (def.required && (!val || !val.toString().trim())) {
        return `${def.title || def.name} is required.`;
      }
      return null;
    },
    sanitize(val) {
      if (val === undefined || val === null) return '';
      return val.toString().trim();
    },
  },
};

const getFieldHandler = (type) => fieldRegistry[type] || fieldRegistry['Single-Line Text'];

module.exports = {
  fieldRegistry,
  getFieldHandler,
  sanitizeHtml,
};

