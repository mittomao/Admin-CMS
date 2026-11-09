module.exports = {
  type: 'Image',
  displayName: 'Image (Media Picker)',
  category: 'Media',
  icon: 'ti ti-photo',
  viewSlug: 'image',
  defaultConfig: {
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'],
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
};

