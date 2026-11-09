module.exports = {
  type: 'Checkbox List',
  displayName: 'Checkbox List (Chọn nhiều)',
  category: 'Selection',
  icon: 'ti ti-checkbox',
  viewSlug: 'checkbox-list',
  defaultConfig: {
    options: [],
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    const items = Array.isArray(val) ? val : (val ? String(val).split(',').map((s) => s.trim()).filter(Boolean) : []);
    if (isRequired && items.length === 0) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch {
        // Not JSON
      }
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  },
};

