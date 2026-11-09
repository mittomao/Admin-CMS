module.exports = {
  type: 'Toggle Switch',
  displayName: 'Toggle Switch (Bật / Tắt)',
  category: 'Toggle',
  icon: 'ti ti-toggle-right',
  viewSlug: 'toggle-switch',
  defaultConfig: {
    activeLabel: 'Bật',
    inactiveLabel: 'Tắt',
  },
  validate() {
    return null;
  },
  sanitize(val) {
    return val === true || val === 'true' || val === '1' || val === 'on';
  },
};

