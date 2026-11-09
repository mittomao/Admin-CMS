module.exports = {
  type: 'Range Slider',
  displayName: 'Range Slider (Thanh trượt)',
  category: 'Numeric',
  icon: 'ti ti-adjustments-horizontal',
  viewSlug: 'range-slider',
  defaultConfig: {
    min: 0,
    max: 100,
    step: 1,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (val === null || val === undefined || val === '')) {
      return `${def.title || def.name} is required.`;
    }
    if (val !== null && val !== undefined && val !== '') {
      const num = Number(val);
      if (Number.isNaN(num)) {
        return `${def.title || def.name} must be a valid number.`;
      }
    }
    return null;
  },
  sanitize(val) {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  },
};

