module.exports = {
  type: 'Slug',
  displayName: 'Slug / URL Alias',
  category: 'Text',
  icon: 'ti ti-link',
  viewSlug: 'slug',
  defaultConfig: {
    prefix: '/',
    placeholder: 'url-slug-example',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    if (isRequired && (!val || !String(val).trim())) {
      return `${def.title || def.name} is required.`;
    }
    if (val && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(val).trim())) {
      return `${def.title || def.name} must be a valid lowercase slug with hyphens (e.g. my-post-title).`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return '';
    return String(val)
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};

