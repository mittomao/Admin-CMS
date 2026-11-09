module.exports = {
  type: 'Video Embed',
  displayName: 'Video Embed (Nhúng Video)',
  category: 'Media',
  icon: 'ti ti-video',
  viewSlug: 'video-embed',
  defaultConfig: {
    placeholder: 'https://www.youtube.com/watch?v=... hoặc Vimeo URL',
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

