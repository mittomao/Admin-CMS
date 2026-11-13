'use strict';

/**
 * Treecraft CMS - Branding & System Path Constants (DEC-043 / DEC-056)
 * Facade Adapter: Đọc cấu hình từ sitePaths.getSiteConfig(), giữ nguyên 100% chữ ký export
 * để đảm bảo tương thích hoàn toàn với tất cả các module đang import.
 */

const sitePaths = require('./sitePaths');

function getConfig() {
  try {
    return sitePaths.getSiteConfig() || {};
  } catch {
    return {
      projectName: 'Treecraft',
      rootName: 'root',
      rootPath: '/root',
      cloudinaryRootFolder: 'AdminCMS',
    };
  }
}

const branding = {
  // Brand Identity
  get PROJECT_NAME() {
    return getConfig().projectName || 'Treecraft';
  },
  get PROJECT_TITLE() {
    return `${this.PROJECT_NAME} CMS`;
  },
  get PROJECT_DESCRIPTION() {
    return `${this.PROJECT_NAME} - Hierarchical XM Content Management System`;
  },
  DEFAULT_DOMAIN: 'treecraft',
  SESSION_COOKIE_NAME: 'treecraft_session_id',

  // Tree Root
  get ROOT_NAME() {
    return getConfig().rootName || 'root';
  },
  get ROOT_PATH() {
    return `/${this.ROOT_NAME}`;
  },

  // Standard Tree Branches (Dynamic Getters dựa trên ROOT_PATH)
  get PATHS() {
    const root = this.ROOT_PATH;
    return {
      ROOT: root,
      CONTENT: `${root}/content`,
      LAYOUT: `${root}/layout`,
      LAYOUTS: `${root}/layout/Layouts`,
      PLACEHOLDERS: `${root}/layout/Placeholders`,
      RENDERINGS: `${root}/layout/Renderings`,
      DEVICES: `${root}/layout/Devices`,
      PLACEHOLDER_SETTINGS: `${root}/layout/Placeholder Settings`,
      TEMPLATES: `${root}/templates`,
      FEATURE_TEMPLATES: `${root}/templates/Feature`,
      FEATURE_COMPONENTS: `${root}/templates/Feature/Components`,
      PROJECT_TEMPLATES: `${root}/templates/Project`,
      PROJECT_PAGES: `${root}/templates/Project/Pages`,
      SYSTEM_TEMPLATES: `${root}/templates/System`,
      COMMON_TEMPLATES: `${root}/templates/Common`,
      MEDIA: `${root}/media library`,
      SYSTEM: `${root}/system`,
      SYSTEM_LANGUAGES: `${root}/system/Languages`,
      START_ITEM: `${root}/content/Home`,
      HOME: `${root}/content/Home`,
    };
  },

  // Storage
  get CLOUDINARY_DEFAULT_ROOT() {
    const cfg = getConfig();
    if (typeof cfg.cloudinaryRootFolder === 'string') {
      return cfg.cloudinaryRootFolder;
    }
    if (cfg.cloudinaryRootFolder && typeof cfg.cloudinaryRootFolder === 'object') {
      return cfg.cloudinaryRootFolder.development || cfg.cloudinaryRootFolder.production || 'AdminCMS';
    }
    return 'AdminCMS';
  },

  getBranding() {
    return {
      projectName: this.PROJECT_NAME,
      projectTitle: this.PROJECT_TITLE,
      projectDescription: this.PROJECT_DESCRIPTION,
      rootName: this.ROOT_NAME,
      rootPath: this.ROOT_PATH,
      paths: this.PATHS,
    };
  },
};

module.exports = branding;
