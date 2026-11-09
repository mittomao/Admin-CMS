module.exports = {
  type: 'Droplist',
  displayName: 'Droplist (Select)',
  category: 'Selection',
  icon: 'ti ti-select',
  viewSlug: 'droplist',
  defaultConfig: {
    options: [],
    placeholder: '-- Chọn giá trị --',
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
  getOptions(def = {}) {
    if (def.source) {
      return def.source
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ label: s, value: s }));
    }
    if (Array.isArray(def.config?.options)) {
      return def.config.options.map((opt) => {
        if (typeof opt === 'string') return { label: opt, value: opt };
        return opt;
      });
    }
    return [];
  },
};

