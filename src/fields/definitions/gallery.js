module.exports = {
  type: 'Gallery',
  displayName: 'Gallery (Bộ sưu tập ảnh)',
  category: 'Media',
  icon: 'ti ti-photo-plus',
  viewSlug: 'gallery',
  defaultConfig: {
    maxItems: 20,
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
      return val.map((s) => (typeof s === 'object' && s?.url ? s.url : String(s).trim())).filter(Boolean);
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => (typeof s === 'object' && s?.url ? s.url : String(s).trim())).filter(Boolean);
        }
      } catch {
        // Not JSON
      }
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  },
};

