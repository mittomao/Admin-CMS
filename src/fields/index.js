const sanitizeHtml = require('sanitize-html');
const fieldRegistry = require('./registry');
const richTextDef = require('./definitions/rich-text');

/**
 * Universal Custom Field System Facade.
 * Re-exports Field Registry, helper lookup functions, and HTML sanitization tools.
 */
const getFieldHandler = (type) => fieldRegistry.get(type);

module.exports = {
  fieldRegistry,
  getFieldHandler,
  sanitizeHtml,
  SANITIZE_OPTIONS: richTextDef.SANITIZE_OPTIONS,
};
