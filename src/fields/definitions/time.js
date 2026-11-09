module.exports = {
  type: 'Time',
  displayName: 'Time (Thời gian)',
  category: 'DateTime',
  icon: 'ti ti-clock',
  viewSlug: 'time',
  defaultConfig: {
    format: 'HH:mm',
    placeholder: 'HH:mm',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && !/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(String(val).trim())) {
      return `${def.title || def.name} must be a valid time in HH:mm format.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    return String(val).trim();
  },
};

