module.exports = {
  type: 'Tag Input',
  displayName: 'Tag Input (Thẻ Từ Khóa)',
  category: 'Selection',
  icon: 'ti ti-tags',
  viewSlug: 'tag-input',
  defaultConfig: {
    placeholder: 'Nhập từ khóa và nhấn Enter hoặc phẩy...',
    maxTags: 20,
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
        // Not JSON, treat as comma-separated
      }
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  },
};
