'use strict';

const Template = require('../models/Template');
const logger = require('../utils/logger');
const branding = require('../config/branding');

let cachedTemplates = null;

const MEDIA_TEMPLATES = {
  MEDIA_FOLDER: 'Media Folder',
  IMAGE: 'Image',
  FILE: 'File'
};

/**
 * Đảm bảo 3 System Templates cho Media Item tồn tại trong CSDL
 */
async function ensureMediaTemplates() {
  if (cachedTemplates) {
    return cachedTemplates;
  }

  const templatesDefs = [
    {
      name: MEDIA_TEMPLATES.MEDIA_FOLDER,
      displayName: 'Media Folder',
      icon: 'ti ti-folder',
      isSystem: true,
      description: 'System folder item to organize media assets',
      path: `${branding.PATHS.SYSTEM_TEMPLATES}/Media Folder`,
      sections: [
        {
          name: 'Folder Info',
          sortOrder: 10,
          fields: []
        }
      ]
    },
    {
      name: MEDIA_TEMPLATES.IMAGE,
      displayName: 'Image',
      icon: 'ti ti-photo',
      isSystem: true,
      description: 'System template for image media item hosted on Cloudinary',
      path: `${branding.PATHS.SYSTEM_TEMPLATES}/Image`,
      sections: [
        {
          name: 'Image Info',
          sortOrder: 10,
          fields: [
            { name: 'publicId', title: 'Cloudinary Public ID', type: 'Single-Line Text', required: true, sortOrder: 10 },
            { name: 'assetId', title: 'Cloudinary Asset ID', type: 'Single-Line Text', required: false, sortOrder: 20 },
            { name: 'format', title: 'Format', type: 'Single-Line Text', required: false, sortOrder: 30 },
            { name: 'extension', title: 'Extension', type: 'Single-Line Text', required: false, sortOrder: 40 },
            { name: 'secureUrl', title: 'Secure URL', type: 'Single-Line Text', required: true, sortOrder: 50 },
            { name: 'fileSize', title: 'File Size (Bytes)', type: 'Number', required: false, sortOrder: 60 },
            { name: 'width', title: 'Width (px)', type: 'Number', required: false, sortOrder: 70 },
            { name: 'height', title: 'Height (px)', type: 'Number', required: false, sortOrder: 80 },
            { name: 'checksum', title: 'SHA-256 Checksum', type: 'Single-Line Text', required: false, sortOrder: 90 },
            { name: 'syncedAt', title: 'Synced At', type: 'Date', required: false, sortOrder: 100 }
          ]
        },
        {
          name: 'Content',
          sortOrder: 20,
          fields: [
            { name: 'altText', title: 'Alt Text', type: 'Single-Line Text', required: false, sortOrder: 10 },
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: false, sortOrder: 20 },
            { name: 'description', title: 'Description', type: 'Multi-Line Text', required: false, sortOrder: 30 }
          ]
        }
      ]
    },
    {
      name: MEDIA_TEMPLATES.FILE,
      displayName: 'File',
      icon: 'ti ti-file',
      isSystem: true,
      description: 'System template for binary document or raw file hosted on Cloudinary',
      path: `${branding.PATHS.SYSTEM_TEMPLATES}/File`,
      sections: [
        {
          name: 'File Info',
          sortOrder: 10,
          fields: [
            { name: 'publicId', title: 'Cloudinary Public ID', type: 'Single-Line Text', required: true, sortOrder: 10 },
            { name: 'assetId', title: 'Cloudinary Asset ID', type: 'Single-Line Text', required: false, sortOrder: 20 },
            { name: 'format', title: 'Format', type: 'Single-Line Text', required: false, sortOrder: 30 },
            { name: 'extension', title: 'Extension', type: 'Single-Line Text', required: false, sortOrder: 40 },
            { name: 'secureUrl', title: 'Secure URL', type: 'Single-Line Text', required: true, sortOrder: 50 },
            { name: 'fileSize', title: 'File Size (Bytes)', type: 'Number', required: false, sortOrder: 60 },
            { name: 'resourceType', title: 'Resource Type', type: 'Single-Line Text', required: false, defaultValue: 'raw', sortOrder: 70 },
            { name: 'checksum', title: 'SHA-256 Checksum', type: 'Single-Line Text', required: false, sortOrder: 80 },
            { name: 'syncedAt', title: 'Synced At', type: 'Date', required: false, sortOrder: 90 }
          ]
        },
        {
          name: 'Content',
          sortOrder: 20,
          fields: [
            { name: 'title', title: 'Title', type: 'Single-Line Text', required: false, sortOrder: 10 },
            { name: 'description', title: 'Description', type: 'Multi-Line Text', required: false, sortOrder: 20 }
          ]
        }
      ]
    }
  ];

  const map = {};
  for (const def of templatesDefs) {
    let tpl = await Template.findOne({ name: def.name });
    if (!tpl) {
      tpl = await Template.create(def);
      logger.info(`[mediaTemplateService] Created System Template: ${def.name}`);
    } else {
      let changed = false;
      if (tpl.displayName !== def.displayName) { tpl.displayName = def.displayName; changed = true; }
      if (tpl.icon !== def.icon) { tpl.icon = def.icon; changed = true; }
      if (tpl.isSystem !== true) { tpl.isSystem = true; changed = true; }
      if (changed) await tpl.save();
    }
    map[def.name] = tpl;
  }

  // Cấu hình insertOptions cho Media Folder
  const folderTpl = map[MEDIA_TEMPLATES.MEDIA_FOLDER];
  if (folderTpl) {
    folderTpl.insertOptions = [
      map[MEDIA_TEMPLATES.MEDIA_FOLDER]._id,
      map[MEDIA_TEMPLATES.IMAGE]._id,
      map[MEDIA_TEMPLATES.FILE]._id
    ];
    await folderTpl.save();
  }

  cachedTemplates = map;
  return map;
}

/**
 * Xóa cache template
 */
function invalidateCache() {
  cachedTemplates = null;
}

module.exports = {
  MEDIA_TEMPLATES,
  ensureMediaTemplates,
  invalidateCache
};

