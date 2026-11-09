module.exports = {
  type: 'Field Group',
  displayName: 'Field Group (Khung Gom Nhóm)',
  category: 'Layout',
  icon: 'ti ti-layout-grid',
  viewSlug: 'field-group',
  defaultConfig: {
    style: 'card', // 'card' | 'accordion' | 'borderless'
    collapsible: true,
    collapsed: false,
  },
  validate() {
    return null;
  },
  sanitize(val) {
    if (typeof val === 'object' && val !== null) return val;
    return {};
  },
};

