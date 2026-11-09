module.exports = {
  type: 'External Link',
  displayName: 'External Link (Liên Kết Ngoài)',
  category: 'Relation',
  icon: 'ti ti-link',
  viewSlug: 'external-link',
  defaultConfig: {
    allowTargetBlank: true,
    allowNofollow: true,
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    const url = typeof val === 'object' && val !== null ? val.url : val;
    if (isRequired && (!url || !url.toString().trim())) {
      return `${def.title || def.name} URL is required.`;
    }
    return null;
  },
  sanitize(val) {
    if (!val) return { url: '', text: '', target: '_self', nofollow: false };
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            url: String(parsed.url || '').trim(),
            text: String(parsed.text || '').trim(),
            target: parsed.target === '_blank' ? '_blank' : '_self',
            nofollow: Boolean(parsed.nofollow),
          };
        }
      } catch {
        // Plain URL string fallback
        return {
          url: val.trim(),
          text: '',
          target: '_self',
          nofollow: false,
        };
      }
    }
    if (typeof val === 'object' && val !== null) {
      return {
        url: String(val.url || '').trim(),
        text: String(val.text || '').trim(),
        target: val.target === '_blank' ? '_blank' : '_self',
        nofollow: Boolean(val.nofollow),
      };
    }
    return { url: '', text: '', target: '_self', nofollow: false };
  },
};
