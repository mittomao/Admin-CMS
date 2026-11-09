module.exports = {
  type: 'Multi-Line Text',
  displayName: 'Multi-Line Text',
  category: 'Text',
  icon: 'ti ti-align-left',
  viewSlug: 'multi-line-text',
  defaultConfig: {
    rows: 3,
    placeholder: '',
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

