module.exports = {
  type: 'Radio Group',
  displayName: 'Radio Group (Chọn một)',
  category: 'Selection',
  icon: 'ti ti-circle-dot',
  viewSlug: 'radio-group',
  defaultConfig: {
    options: [],
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  },
};

