module.exports = {
  type: 'Currency',
  displayName: 'Currency (Tiền tệ)',
  category: 'Numeric',
  icon: 'ti ti-currency-dollar',
  viewSlug: 'currency',
  defaultConfig: {
    currencyCode: 'USD',
    symbol: '$',
    precision: 2,
    min: null,
    max: null,
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
      const min = def.config?.min ?? def.validation?.min;
      const max = def.config?.max ?? def.validation?.max;
      if (min !== null && min !== undefined && num < min) {
        return `${def.title || def.name} cannot be less than ${min}.`;
      }
      if (max !== null && max !== undefined && num > max) {
        return `${def.title || def.name} cannot be greater than ${max}.`;
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

