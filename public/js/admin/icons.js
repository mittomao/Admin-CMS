/**
 * Client-side Icon Registry & Utilities for Admin CMS
 */
(function (root) {
  'use strict';

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

  function isValidIconKey(key) {
    return Boolean(normalizeIconKey(key));
  }

  function isFolderItem(item, template) {
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

    const itemPath = (item && item.path) || '';
    const itemName = (item && (item.displayName || item.name)) || '';
    const folderPaths = [
      '/root/templates',
      '/root/templates/Feature',
      '/root/templates/Project',
      '/root/templates/System',
      '/root/templates/Common',
      '/root/layout',
      '/root/layout/Layouts',
      '/root/layout/Placeholders',
      '/root/layout/Renderings',
      '/root/templates',
      '/root/templates/Feature',
      '/root/templates/Project',
      '/root/templates/System',
      '/root/templates/Common',
      '/root/layout',
      '/root/layout/Layouts',
      '/root/layout/Placeholders',
      '/root/layout/Renderings',
    ];
    if (folderPaths.includes(itemPath)) {
      return true;
    }

    if (itemName.endsWith('Folder') || itemName === 'Folders') {
      return true;
    }

    return false;
  }

  function resolveItemIcon(item, template, options = {}) {
    const itemPath = (item && item.path ? item.path.toLowerCase() : '');
    const tplName = template && template.name ? template.name.trim() : '';

    if (itemPath === '/root/content' || itemPath === '/root/content') {
      return 'content-root';
    }

    if (isFolderItem(item, template)) {
      if (options.expanded) {
        return 'folder-open';
      }
      return 'folder';
    }

    if (item && item.icon) {
      const normalized = normalizeIconKey(item.icon);
      if (normalized && normalized !== 'page') {
        return normalized;
      }
    }

    if (template && template.icon) {
      const normalized = normalizeIconKey(template.icon);
      if (normalized && normalized !== 'page') {
        return normalized;
      }
    }

    if (tplName === 'Layout' || itemPath.startsWith('/root/layout/layouts') || itemPath.startsWith('/root/layout/layouts')) {
      return 'layout';
    }
    if (tplName === 'Placeholder' || itemPath.startsWith('/root/layout/placeholders') || itemPath.startsWith('/root/layout/placeholders')) {
      return 'placeholder';
    }
    if (tplName === 'Rendering' || itemPath.startsWith('/root/layout/renderings') || itemPath.startsWith('/root/layout/renderings')) {
      return 'rendering';
    }
    if (
      tplName === 'Template' ||
      tplName === 'Standard Template' ||
      itemPath.startsWith('/root/templates') ||
      itemPath.startsWith('/root/templates')
    ) {
      return 'template';
    }
    if (itemPath.startsWith('/root/media library') || itemPath.startsWith('/root/media library')) {
      return 'media';
    }
    if (itemPath.startsWith('/root/content') || itemPath.startsWith('/root/content')) {
      return 'page';
    }

    return 'page';
  }

  function getIconUrl(iconKey) {
    if (!iconKey) return ICON_REGISTRY.page.file;
    const key = iconKey.trim();
    if (Object.prototype.hasOwnProperty.call(ICON_REGISTRY, key)) {
      return ICON_REGISTRY[key].file;
    }
    return null;
  }

  function renderIconHtml(iconKey, size = 16, extraClass = '', alt = '') {
    const safeSize = Number.isInteger(size) && size > 0 && size <= 128 ? size : 16;
    const safeClass = String(extraClass || '').replace(/[^a-zA-Z0-9 _-]/g, '');
    const safeAlt = String(alt || '').replace(/"/g, '&quot;');

    if (iconKey && typeof iconKey === 'string' && Object.prototype.hasOwnProperty.call(ICON_REGISTRY, iconKey.trim())) {
      const entry = ICON_REGISTRY[iconKey.trim()];
      return `<img src="${entry.file}" class="sc-icon-img ${safeClass}" width="${safeSize}" height="${safeSize}" alt="${safeAlt || entry.label}" />`;
    }

    if (iconKey && typeof iconKey === 'string' && /^ti ti-[a-z0-9-]+$/.test(iconKey.trim())) {
      const safeIconClass = iconKey.trim();
      return `<i class="${safeIconClass} ${safeClass}" style="font-size: ${safeSize}px; line-height: 1;"></i>`;
    }

    const pageEntry = ICON_REGISTRY.page;
    return `<img src="${pageEntry.file}" class="sc-icon-img ${safeClass}" width="${safeSize}" height="${safeSize}" alt="${safeAlt || 'Item'}" />`;
  }

  const CMS_ICONS = {
    ICON_REGISTRY,
    LEGACY_ICON_MAP,
    normalizeIconKey,
    isValidIconKey,
    isFolderItem,
    resolveItemIcon,
    getIconUrl,
    renderIconHtml,
  };

  root.CMS_ICONS = CMS_ICONS;
})(typeof window !== 'undefined' ? window : this);
