module.exports = {
  type: 'Number',
  displayName: 'Number',
  category: 'Numeric',
  icon: 'ti ti-numbers',
  viewSlug: 'number',
  defaultConfig: {
    min: null,
    max: null,
    step: 1,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (val === undefined || val === null || val === '')) {
      return `${def.title || def.name} is required.`;
    }
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (isNaN(num)) {
        return `${def.title || def.name} must be a valid number.`;
      }
      const min = def.validation?.min ?? def.config?.min;
      if (min !== null && min !== undefined && num < min) {
        return `${def.title || def.name} must be at least ${min}.`;
      }
      const max = def.validation?.max ?? def.config?.max;
      if (max !== null && max !== undefined && num > max) {
        return `${def.title || def.name} must not exceed ${max}.`;
      }
    }
    return null;
  },
  sanitize(val) {
    if (val === undefined || val === null || val === '') return null;
    return Number(val);
  },
};

