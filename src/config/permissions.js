/**
 * CMS Action Permission Constants (DEC-039 / Phase 8)
 * Single source of truth for all action identifiers checked via canPerform(user, item, action).
 */

const ACTIONS = {
  // Item Operations
  ITEM_READ: 'item:read',
  ITEM_WRITE: 'item:write',
  ITEM_CREATE: 'item:create',
  ITEM_DELETE: 'item:delete',
  ITEM_PUBLISH: 'item:publish',
  ITEM_UNPUBLISH: 'item:unpublish',

  // Version Operations
  VERSION_CREATE: 'version:create',
  VERSION_DELETE: 'version:delete',
  VERSION_RESTORE: 'version:restore',

  // Presentation Operations
  PRESENTATION_READ: 'presentation:read',
  PRESENTATION_WRITE: 'presentation:write',

  // Workflow Operations
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_EXECUTE: 'workflow:execute', // Prefix or specific command: workflow:execute:<commandIdOrName>
  WORKFLOW_MANAGE: 'workflow:manage',

  // Workbox Operations
  WORKBOX_READ: 'workbox:read',
  WORKBOX_BULK: 'workbox:bulk',

  // Publishing Engine Operations
  PUBLISH_MANAGE: 'publish:manage', // Open Publish Manager, Site publish, Republish All

  // Media Operations
  MEDIA_READ: 'media:read',
  MEDIA_WRITE: 'media:write',
  MEDIA_UPLOAD: 'media:upload',
  MEDIA_DELETE: 'media:delete',
  MEDIA_SYNC: 'media:sync',

  // Database Switcher & Compare Operations (GĐ 8.1)
  DATABASE_WEB_READ: 'database:web:read',
  DATABASE_COMPARE: 'database:compare',
};

module.exports = {
  ACTIONS,
};

