module.exports = {
  type: 'Date Time',
  displayName: 'Date Time (Ngày và Giờ)',
  category: 'DateTime',
  icon: 'ti ti-calendar-time',
  viewSlug: 'date-time',
  defaultConfig: {
    format: 'YYYY-MM-DDTHH:mm',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && Number.isNaN(Date.parse(val))) {
      return `${def.title || def.name} must be a valid date and time.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  },
};

