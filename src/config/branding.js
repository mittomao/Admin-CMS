'use strict';

/**
 * Treecraft CMS - Branding & System Path Constants (DEC-043 / Phase R1)
 * Single Source of Truth for brand naming and tree root path.
 */

const ROOT_NAME = 'root';
const ROOT_PATH = `/${ROOT_NAME}`;

module.exports = {
  // Brand Identity
  PROJECT_NAME: 'Treecraft',
  PROJECT_TITLE: 'Treecraft CMS',
  PROJECT_DESCRIPTION: 'Treecraft - Hierarchical XM Content Management System',
  DEFAULT_DOMAIN: 'treecraft',
  SESSION_COOKIE_NAME: 'treecraft_session_id',

  // Tree Root
  ROOT_NAME,
  ROOT_PATH,

  // Standard Tree Branches
  PATHS: {
    ROOT: ROOT_PATH,
    CONTENT: `${ROOT_PATH}/content`,
    LAYOUT: `${ROOT_PATH}/layout`,
    LAYOUTS: `${ROOT_PATH}/layout/Layouts`,
    PLACEHOLDERS: `${ROOT_PATH}/layout/Placeholders`,
    RENDERINGS: `${ROOT_PATH}/layout/Renderings`,
    DEVICES: `${ROOT_PATH}/layout/Devices`,
    PLACEHOLDER_SETTINGS: `${ROOT_PATH}/layout/Placeholder Settings`,
    TEMPLATES: `${ROOT_PATH}/templates`,
    FEATURE_TEMPLATES: `${ROOT_PATH}/templates/Feature`,
    FEATURE_COMPONENTS: `${ROOT_PATH}/templates/Feature/Components`,
    PROJECT_TEMPLATES: `${ROOT_PATH}/templates/Project`,
    PROJECT_PAGES: `${ROOT_PATH}/templates/Project/Pages`,
    SYSTEM_TEMPLATES: `${ROOT_PATH}/templates/System`,
    COMMON_TEMPLATES: `${ROOT_PATH}/templates/Common`,
    MEDIA: `${ROOT_PATH}/media library`,
    SYSTEM: `${ROOT_PATH}/system`,
    START_ITEM: `${ROOT_PATH}/content/Home`,
    HOME: `${ROOT_PATH}/content/Home`,
  },

  // Storage
  CLOUDINARY_DEFAULT_ROOT: 'AdminCMS',
};
