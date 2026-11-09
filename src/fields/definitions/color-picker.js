module.exports = {
  type: 'Color Picker',
  displayName: 'Color Picker (Bảng Chọn Màu)',
  category: 'Visual',
  icon: 'ti ti-color-swatch',
  viewSlug: 'color-picker',
  defaultConfig: {
    format: 'hex',
    placeholder: '#000000',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !val.toString().trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && !/^#([0-9A-Fa-f]{3}){1,2}$|^rgba?\(/.test(val)) {
      return `${def.title || def.name} must be a valid hex or rgb color code.`;
    }
    return null;
  },
  sanitize(val) {
    if (val === undefined || val === null) return '';
    return val.toString().trim();
  },
};

