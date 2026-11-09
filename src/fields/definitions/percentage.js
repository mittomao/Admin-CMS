module.exports = {
  type: 'Percentage',
  displayName: 'Percentage (Phần trăm %)',
  category: 'Numeric',
  icon: 'ti ti-percentage',
  viewSlug: 'percentage',
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
      const min = def.config?.min ?? def.validation?.min ?? 0;
      const max = def.config?.max ?? def.validation?.max ?? 100;
      if (num < min || num > max) {
        return `${def.title || def.name} must be between ${min} and ${max}.`;
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

