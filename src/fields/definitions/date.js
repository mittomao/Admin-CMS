module.exports = {
  type: 'Date',
  displayName: 'Date',
  category: 'DateTime',
  icon: 'ti ti-calendar',
  viewSlug: 'date',
  defaultConfig: {
    format: 'Y-m-d',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && !val) {
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
};

