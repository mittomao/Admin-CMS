module.exports = {
  type: 'Markdown',
  displayName: 'Markdown / Code',
  category: 'Text',
  icon: 'ti ti-markdown',
  viewSlug: 'markdown',
  defaultConfig: {
    rows: 8,
    placeholder: 'Nhập nội dung định dạng Markdown hoặc mã nguồn...',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !val.toString().trim())) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (val === undefined || val === null) return '';
    return val.toString();
  },
};

