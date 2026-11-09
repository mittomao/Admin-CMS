module.exports = {
  type: 'Key-Value Map',
  displayName: 'Key-Value Map (Cặp Khóa - Giá trị)',
  category: 'Advanced',
  icon: 'ti ti-table-alias',
  viewSlug: 'key-value-map',
  defaultConfig: {
    keyPlaceholder: 'Khóa (Key)',
    valuePlaceholder: 'Giá trị (Value)',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    let entries = [];
    if (Array.isArray(val)) entries = val;
    else if (val && typeof val === 'object') entries = Object.entries(val);
    else if (typeof val === 'string' && val.trim()) {
      try {
        const parsed = JSON.parse(val);
        entries = Array.isArray(parsed) ? parsed : Object.entries(parsed);
      } catch {
        // Not valid JSON
      }
    }
    if (isRequired && entries.length === 0) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
          key: String(row.key || '').trim(),
          value: String(row.value !== undefined && row.value !== null ? row.value : '').trim(),
        }))
        .filter((row) => row.key !== '');
    }
    if (typeof val === 'object') {
      return Object.entries(val).map(([k, v]) => ({
        key: String(k).trim(),
        value: String(v !== undefined && v !== null ? v : '').trim(),
      }));
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return module.exports.sanitize(parsed);
      } catch {
        return [];
      }
    }
    return [];
  },
};

