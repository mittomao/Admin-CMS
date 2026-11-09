module.exports = {
  type: 'Checkbox',
  displayName: 'Checkbox (Boolean)',
  category: 'Selection',
  icon: 'ti ti-square-check',
  viewSlug: 'checkbox',
  defaultConfig: {},
  validate() {
    return null;
  },
  sanitize(val) {
    return val === true || val === 'true' || val === '1' || val === 'on';
  },
};

