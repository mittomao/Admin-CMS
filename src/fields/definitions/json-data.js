module.exports = {
  type: 'JSON Data',
  displayName: 'JSON Data (Dữ liệu có cấu trúc)',
  category: 'Advanced',
  icon: 'ti ti-code',
  viewSlug: 'json-data',
  defaultConfig: {
    placeholder: '{\n  "key": "value"\n}',
    indent: 2,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && typeof val === 'string' && val.trim()) {
      try {
        JSON.parse(val);
      } catch (err) {
        return `${def.title || def.name} must be valid JSON: ${err.message}`;
      }
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return '';
      }
    }
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val).trim();
    }
  },
};

