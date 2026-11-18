'use strict';

/**
 * Treecraft CMS - Branding & System Path Constants (DEC-043 / DEC-056 / Phase S)
 * Single Source of Truth for brand naming and tree root path.
 * Wraps siteConfig for brand identity while preserving immutable tree root constants.
 */

const sitePaths = require('./sitePaths');
const siteConfig = sitePaths.resolveSiteConfig();

const ROOT_NAME = 'root';
const ROOT_PATH = `/${ROOT_NAME}`;

const projectName = siteConfig.name || 'Treecraft';
const projectTitle = siteConfig.title || (siteConfig.name ? `${siteConfig.name} CMS` : 'Treecraft CMS');
const projectDescription = siteConfig.description || 'Treecraft - Hierarchical XM Content Management System';
const defaultDomain = siteConfig.domain || (siteConfig.slug ? `${siteConfig.slug}.local` : 'treecraft');
const sessionCookieName = siteConfig.sessionCookie || 'treecraft_session_id';

module.exports = {
  // Brand Identity (Configurable via site.config.js)
  PROJECT_NAME: projectName,
  PROJECT_TITLE: projectTitle,
  PROJECT_DESCRIPTION: projectDescription,
  DEFAULT_DOMAIN: defaultDomain,
  SESSION_COOKIE_NAME: sessionCookieName,

  // Tree Root (Immutable System Invariant)
  ROOT_NAME,
  ROOT_PATH,

  // Standard Tree Branches (Immutable System Invariant)
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
    SYSTEM_LANGUAGES: `${ROOT_PATH}/system/Languages`,
    START_ITEM: `${ROOT_PATH}/content/Home`,
    HOME: `${ROOT_PATH}/content/Home`,
  },

  // Storage
  CLOUDINARY_DEFAULT_ROOT: 'AdminCMS',
};
