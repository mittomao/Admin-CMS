'use strict';

/**
 * Treecraft CMS - Serialization Sections Configuration (DEC-053 / Phase 11-Y2)
 * Single Source of Truth for section definitions, branch mapping, relative folders,
 * default sync modes, and dependency graph.
 */

const branding = require('./branding');

const SECTIONS = {
  template: {
    key: 'template',
    dir: 'Templates',
    folder: 'Templates',
    label: 'Templates',
    description: 'Các mẫu cấu trúc dữ liệu, sections, trường động và Standard Values',
    roots: [branding.PATHS.TEMPLATES || '/root/templates'],
    defaultMode: 'overwrite',
    dependsOn: [],
    includeSystemTemplates: false,
    excludeRoots: [branding.PATHS.SYSTEM_TEMPLATES || '/root/templates/System'],
    icon: 'ti ti-template',
    color: 'blue',
  },
  rendering: {
    key: 'rendering',
    dir: 'Renderings',
    folder: 'Renderings',
    label: 'Renderings',
    description: 'Các component hiển thị, viewPath EJS và liên kết componentTemplate',
    roots: [branding.PATHS.RENDERINGS || '/root/layout/Renderings'],
    defaultMode: 'overwrite',
    dependsOn: ['template'],
    icon: 'ti ti-components',
    color: 'cyan',
  },
  layout: {
    key: 'layout',
    dir: 'Layouts',
    folder: 'Layouts',
    label: 'Layouts',
    description: 'Các định nghĩa Master Layout EJS view',
    roots: [branding.PATHS.LAYOUTS || '/root/layout/Layouts'],
    defaultMode: 'overwrite',
    dependsOn: ['template'],
    icon: 'ti ti-layout-board',
    color: 'purple',
  },
  placeholder: {
    key: 'placeholder',
    dir: 'Placeholders',
    folder: 'Placeholders',
    label: 'Placeholders',
    description: 'Các khoá vùng chứa Placeholders trong Layout',
    roots: [branding.PATHS.PLACEHOLDERS || '/root/layout/Placeholders'],
    defaultMode: 'overwrite',
    dependsOn: ['template'],
    icon: 'ti ti-box-model',
    color: 'indigo',
  },
  content: {
    key: 'content',
    dir: 'Contents',
    folder: 'Contents',
    label: 'Contents',
    description: 'Cây trang nội dung, bài viết, phiên bản ngôn ngữ và dữ liệu trường',
    roots: [branding.PATHS.CONTENT || '/root/content'],
    defaultMode: 'createOnly',
    dependsOn: ['template', 'layout', 'rendering', 'placeholder'],
    icon: 'ti ti-file-text',
    color: 'emerald',
  },
};

/**
 * Topologically sorted execution order for Syncing multiple sections
 */
const SYNC_EXECUTION_ORDER = ['template', 'layout', 'placeholder', 'rendering', 'content'];

/**
 * Topologically sorted execution order for Reserializing multiple sections
 */
const RESERIALIZE_EXECUTION_ORDER = ['template', 'layout', 'placeholder', 'rendering', 'content'];

/**
 * Key aliases for tolerant lookup (plural, singular, case-insensitive)
 */
const KEY_ALIASES = {
  template: 'template',
  templates: 'template',
  rendering: 'rendering',
  renderings: 'rendering',
  layout: 'layout',
  layouts: 'layout',
  placeholder: 'placeholder',
  placeholders: 'placeholder',
  content: 'content',
  contents: 'content',
};

/**
 * Get section configuration by key
 * @param {string} key
 * @returns {Object|null}
 */
function getSection(key) {
  if (!key || typeof key !== 'string') return null;
  const normalizedKey = key.toLowerCase().trim();
  const canonicalKey = KEY_ALIASES[normalizedKey] || normalizedKey;
  return SECTIONS[canonicalKey] || null;
}

/**
 * Get all section configurations
 * @returns {Array<Object>}
 */
function getAllSections() {
  return SYNC_EXECUTION_ORDER.map((k) => SECTIONS[k]);
}

/**
 * Find which section an item path belongs to
 * @param {string} itemPath
 * @returns {Object|null}
 */
function findSectionByItemPath(itemPath) {
  if (!itemPath || typeof itemPath !== 'string') return null;
  const cleanPath = itemPath.trim();

  // Check in order
  for (const key of SYNC_EXECUTION_ORDER) {
    const section = SECTIONS[key];
    for (const root of section.roots) {
      if (cleanPath === root || cleanPath.startsWith(`${root}/`)) {
        // If template, check if excluded (e.g. System)
        if (section.excludeRoots && !section.includeSystemTemplates) {
          const isExcluded = section.excludeRoots.some(
            (exc) => cleanPath === exc || cleanPath.startsWith(`${exc}/`)
          );
          if (isExcluded) return null;
        }
        return section;
      }
    }
  }
  return null;
}

module.exports = {
  SECTIONS,
  SYNC_EXECUTION_ORDER,
  RESERIALIZE_EXECUTION_ORDER,
  getSection,
  getAllSections,
  findSectionByItemPath,
};

