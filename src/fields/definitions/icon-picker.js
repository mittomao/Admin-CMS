module.exports = {
  type: 'Icon Picker',
  displayName: 'Icon Picker (Biểu Tượng Tabler)',
  category: 'Visual',
  icon: 'ti ti-icons',
  viewSlug: 'icon-picker',
  defaultConfig: {
    placeholder: 'e.g. ti ti-home',
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
    return val.toString().trim();
  },
};

