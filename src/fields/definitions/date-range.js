module.exports = {
  type: 'Date Range',
  displayName: 'Date Range (Khoảng ngày)',
  category: 'DateTime',
  icon: 'ti ti-calendar-event',
  viewSlug: 'date-range',
  defaultConfig: {},
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    let obj = val;
    if (typeof val === 'string' && val.trim()) {
      try {
        obj = JSON.parse(val);
      } catch {
        const parts = val.split(' to ');
        obj = { from: parts[0]?.trim(), to: parts[1]?.trim() };
      }
    }
    if (isRequired && (!obj || (!obj.from && !obj.to))) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return { from: '', to: '' };
    if (typeof val === 'object') {
      return {
        from: val.from ? String(val.from).trim() : '',
        to: val.to ? String(val.to).trim() : '',
      };
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (parsed && typeof parsed === 'object') {
          return {
            from: parsed.from ? String(parsed.from).trim() : '',
            to: parsed.to ? String(parsed.to).trim() : '',
          };
        }
      } catch {
        const parts = val.split(' to ');
        return {
          from: parts[0]?.trim() || '',
          to: parts[1]?.trim() || '',
        };
      }
    }
    return { from: '', to: '' };
  },
};

