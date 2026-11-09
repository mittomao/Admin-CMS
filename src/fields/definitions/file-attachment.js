module.exports = {
  type: 'File Attachment',
  displayName: 'File Attachment (Tệp đính kèm)',
  category: 'Media',
  icon: 'ti ti-file-upload',
  viewSlug: 'file-attachment',
  defaultConfig: {
    allowedExtensions: ['pdf', 'doc', 'docx', 'zip', 'xls', 'xlsx'],
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    return String(val).trim();
  },
};

