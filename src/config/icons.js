/**
 * Icon Registry - Single Source of Truth for CMS item icons
 */

const branding = require('./branding');

const ICON_REGISTRY = {
  'folder': {
    key: 'folder',
    label: 'Folder',
    file: '/img/icons/folder.svg',
    colorVar: '--color-icon-folder',
    defaultColor: '#f59f00',
  },
  'folder-open': {
    key: 'folder-open',
    label: 'Folder Open',
    file: '/img/icons/folder-open.svg',
    colorVar: '--color-icon-folder',
    defaultColor: '#f59f00',
  },
  'content-root': {
    key: 'content-root',
    label: 'Content Root',
    file: '/img/icons/content-root.svg',
    colorVar: '--color-icon-content',
    defaultColor: '#206bc4',
  },
  'page': {
    key: 'page',
    label: 'Page',
    file: '/img/icons/page.svg',
    colorVar: '--color-icon-page',
    defaultColor: '#4299e1',
  },
  'layout': {
    key: 'layout',
    label: 'Layout',
    file: '/img/icons/layout.svg',
    colorVar: '--color-icon-layout',
    defaultColor: '#6366f1',
  },
  'placeholder': {
    key: 'placeholder',
    label: 'Placeholder',
    file: '/img/icons/placeholder.svg',
    colorVar: '--color-icon-placeholder',
    defaultColor: '#0ca678',
  },
  'rendering': {
    key: 'rendering',
    label: 'Rendering',
    file: '/img/icons/rendering.svg',
    colorVar: '--color-icon-rendering',
    defaultColor: '#ae3ec9',
  },
  'template': {
    key: 'template',
    label: 'Template',
    file: '/img/icons/template.svg',
    colorVar: '--color-icon-template',
    defaultColor: '#d63939',
  },
  'media': {
    key: 'media',
    label: 'Media Library',
    file: '/img/icons/media.svg',
    colorVar: '--color-icon-media',
    defaultColor: '#2fb344',
  },
};

const LEGACY_ICON_MAP = {
  'ti ti-folder': 'folder',
  'ti ti-folder-filled': 'folder',
  'ti ti-folder-open': 'folder-open',
  'ti ti-layout': 'layout',
  'ti ti-layout-grid-add': 'placeholder',
  'ti ti-components': 'rendering',
  'ti ti-template': 'template',
  'ti ti-box': 'template',
  'ti ti-file-text': 'page',
  'ti ti-article': 'page',
};

/**
 * Normalize and validate an icon key (converting legacy strings to canonical registry keys)
 * @param {string} key
 * @returns {string|null}
 */
function normalizeIconKey(key) {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (Object.prototype.hasOwnProperty.call(ICON_REGISTRY, trimmed)) {
    return trimmed;
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_ICON_MAP, trimmed)) {
    return LEGACY_ICON_MAP[trimmed];
  }
  if (/^ti ti-[a-z0-9-]+$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Validate icon key to avoid path traversal and invalid values
 * @param {string} key
 * @returns {boolean}
 */
function isValidIconKey(key) {
  return Boolean(normalizeIconKey(key));
}

/**
 * Check if a template or item represents a Folder
 * @param {Object} item
 * @param {Object} template
 * @returns {boolean}
 */
function isFolderItem(item = null, template = null) {
  const tplName = (template && (template.name || template.displayName)) || '';
  if (
    tplName === 'Folder' ||
    tplName === 'Template Folder' ||
    tplName === 'Layout Folder' ||
    tplName === 'Rendering Folder' ||
    tplName === 'Media Folder' ||
    tplName.toLowerCase().includes('folder')
  ) {
    return true;
  }

  // Check item path or name
  const itemPath = (item && item.path) || '';
  const itemName = (item && (item.displayName || item.name)) || '';
  const folderPaths = [
    branding.PATHS.TEMPLATES,
    `${branding.PATHS.TEMPLATES}/Feature`,
    `${branding.PATHS.TEMPLATES}/Project`,
    `${branding.PATHS.TEMPLATES}/System`,
    `${branding.PATHS.TEMPLATES}/Common`,
    branding.PATHS.LAYOUT,
    branding.PATHS.LAYOUTS,
    branding.PATHS.PLACEHOLDERS,
    branding.PATHS.RENDERINGS,
  ];
  if (folderPaths.includes(itemPath)) {
    // Note: content root is content-root, not regular folder
    return true;
  }

  if (itemName.endsWith('Folder') || itemName === 'Folders') {
    return true;
  }

  return false;
}

/**
 * Resolve icon for an item based on priority rules
 * @param {Object} item - Item mongoose doc or plain object
 * @param {Object} template - Template mongoose doc or plain object
 * @param {Object} [options] - Additional options e.g. { expanded: boolean }
 * @returns {string} iconKey
 */
function resolveItemIcon(item = null, template = null, options = {}) {
  const itemPath = (item && item.path ? item.path.toLowerCase() : '');
  const tplName = template && template.name ? template.name.trim() : '';

  // 1. Root /content is ALWAYS content-root
  if (itemPath === branding.PATHS.CONTENT.toLowerCase()) {
    return 'content-root';
  }

  // 2. Folder items are ALWAYS yellow folder
  if (isFolderItem(item, template)) {
    if (options.expanded) {
      return 'folder-open';
    }
    return 'folder';
  }

  // 3. User chosen icon on item (if valid and not generic fallback)
  if (item && item.icon) {
    const normalized = normalizeIconKey(item.icon);
    if (normalized && normalized !== 'page') {
      return normalized;
    }
  }

  // 4. User chosen icon on template (if valid and not generic fallback)
  if (template && template.icon) {
    const normalized = normalizeIconKey(template.icon);
    if (normalized && normalized !== 'page') {
      return normalized;
    }
  }

  // 5. Default by item type / path
  if (tplName === 'Layout' || itemPath.startsWith(branding.PATHS.LAYOUTS.toLowerCase())) {
    return 'layout';
  }
  if (tplName === 'Placeholder' || itemPath.startsWith(branding.PATHS.PLACEHOLDERS.toLowerCase())) {
    return 'placeholder';
  }
  if (tplName === 'Rendering' || itemPath.startsWith(branding.PATHS.RENDERINGS.toLowerCase())) {
    return 'rendering';
  }
  if (
    tplName === 'Template' ||
    tplName === 'Standard Template' ||
    itemPath.startsWith(branding.PATHS.TEMPLATES.toLowerCase())
  ) {
    return 'template';
  }
  if (itemPath.startsWith(branding.PATHS.MEDIA.toLowerCase())) {
    return 'media';
  }
  if (itemPath.startsWith(branding.PATHS.CONTENT.toLowerCase())) {
    return 'page';
  }

  // 6. General Fallback
  return 'page';
}

/**
 * Get SVG file URL for an icon key
 * @param {string} iconKey
 * @returns {string|null}
 */
function getIconUrl(iconKey) {
  if (!iconKey) return ICON_REGISTRY.page.file;
  const key = iconKey.trim();
  if (Object.prototype.hasOwnProperty.call(ICON_REGISTRY, key)) {
    return ICON_REGISTRY[key].file;
  }
  return null;
}

/**
 * Render safe HTML for an icon
 * @param {string} iconKey
 * @param {number} size
 * @param {string} extraClass
 * @param {string} alt
 * @returns {string}
 */
function renderIconHtml(iconKey, size = 16, extraClass = '', alt = '') {
  const safeSize = Number.isInteger(size) && size > 0 && size <= 128 ? size : 16;
  const safeClass = String(extraClass || '').replace(/[^a-zA-Z0-9 _-]/g, '');
  const safeAlt = String(alt || '').replace(/"/g, '&quot;');

  if (iconKey && typeof iconKey === 'string' && Object.prototype.hasOwnProperty.call(ICON_REGISTRY, iconKey.trim())) {
    const entry = ICON_REGISTRY[iconKey.trim()];
    return `<img src="${entry.file}" class="sc-icon-img ${safeClass}" width="${safeSize}" height="${safeSize}" alt="${safeAlt || entry.label}" />`;
  }

  // Tabler icon font fallback
  if (iconKey && typeof iconKey === 'string' && /^ti ti-[a-z0-9-]+$/.test(iconKey.trim())) {
    const safeIconClass = iconKey.trim();
    return `<i class="${safeIconClass} ${safeClass}" style="font-size: ${safeSize}px; line-height: 1;"></i>`;
  }

  // Fallback to page icon
  const pageEntry = ICON_REGISTRY.page;
  return `<img src="${pageEntry.file}" class="sc-icon-img ${safeClass}" width="${safeSize}" height="${safeSize}" alt="${safeAlt || 'Item'}" />`;
}

module.exports = {
  ICON_REGISTRY,
  LEGACY_ICON_MAP,
  normalizeIconKey,
  isValidIconKey,
  isFolderItem,
  resolveItemIcon,
  getIconUrl,
  renderIconHtml,
};
