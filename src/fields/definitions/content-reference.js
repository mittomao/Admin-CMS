module.exports = {
  type: 'Content Reference',
  displayName: 'Content Reference (Tham chiếu Item)',
  category: 'Relationship',
  icon: 'ti ti-hierarchy-2',
  viewSlug: 'content-reference',
  defaultConfig: {
    rootPath: '/root',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    return String(val).trim();
  },
};

