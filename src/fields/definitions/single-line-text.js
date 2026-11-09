module.exports = {
  type: 'Single-Line Text',
  displayName: 'Single-Line Text',
  category: 'Text',
  icon: 'ti ti-input-text',
  viewSlug: 'single-line-text',
  defaultConfig: {
    placeholder: '',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !val.toString().trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && def.validation?.regex) {
      try {
        const regex = new RegExp(def.validation.regex);
        if (!regex.test(val)) {
          return def.validation.customErrorMessage || `${def.title || def.name} does not match required pattern.`;
        }
      } catch {
        // invalid regex, ignore
      }
    }
    return null;
  },
  sanitize(val) {
    if (val === undefined || val === null) return '';
    return val.toString().trim();
  },
};
