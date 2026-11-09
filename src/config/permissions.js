/**
 * CMS Action Permission & ACL Rights Constants (DEC-039, DEC-042 / Phase 7 & 8)
 * Single source of truth for all action identifiers and ACL rights.
 */

const RIGHTS = {
  READ: 'read',
  WRITE: 'write',
  CREATE: 'create',
  RENAME: 'rename',
  DELETE: 'delete',
  PUBLISH: 'publish',
  ADMINISTER: 'administer',
  PRESENTATION_READ: 'presentation:read',
  PRESENTATION_WRITE: 'presentation:write',
  WORKFLOW_EXECUTE: 'workflow:execute',
};

const ACTIONS = {
  // Item Operations
  ITEM_READ: 'item:read',
  ITEM_WRITE: 'item:write',
  ITEM_CREATE: 'item:create',
  ITEM_RENAME: 'item:rename',
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

  // Security Operations (Phase 7)
  SECURITY_MANAGE: 'security:manage',
  SECURITY_ACCESS_VIEW: 'security:access:view',
  SECURITY_ACL_MANAGE: 'security:acl:manage',
  SECURITY_ACL_RESET: 'security:acl:reset',
  SECURITY_USER_MANAGE: 'security:user:manage',
  SECURITY_ROLE_MANAGE: 'security:role:manage',

  // Media Operations
  MEDIA_READ: 'media:read',
  MEDIA_WRITE: 'media:write',
  MEDIA_UPLOAD: 'media:upload',
  MEDIA_DELETE: 'media:delete',
  MEDIA_SYNC: 'media:sync',

  // Database Switcher & Compare Operations (GĐ 8.1)
  DATABASE_WEB_READ: 'database:web:read',
  DATABASE_COMPARE: 'database:compare',

  // Recycle Bin & Audit Operations (GĐ 9)
  RECYCLEBIN_READ: 'recyclebin:read',
  RECYCLEBIN_RESTORE: 'recyclebin:restore',
  RECYCLEBIN_PURGE: 'recyclebin:purge',
  AUDIT_READ: 'audit:read',

  // Basic Auth Operations (GĐ B1)
  BASICAUTH_READ: 'basicauth:read',
  BASICAUTH_MANAGE: 'basicauth:manage',
};

/**
 * Mapping table from high-level action to required item-level ACL right.
 */
const ACTION_TO_RIGHT = {
  [ACTIONS.ITEM_READ]: RIGHTS.READ,
  [ACTIONS.ITEM_WRITE]: RIGHTS.WRITE,
  [ACTIONS.ITEM_CREATE]: RIGHTS.CREATE,
  [ACTIONS.ITEM_RENAME]: RIGHTS.RENAME,
  [ACTIONS.ITEM_DELETE]: RIGHTS.DELETE,
  [ACTIONS.ITEM_PUBLISH]: RIGHTS.PUBLISH,
  [ACTIONS.ITEM_UNPUBLISH]: RIGHTS.PUBLISH,

  [ACTIONS.VERSION_CREATE]: RIGHTS.WRITE,
  [ACTIONS.VERSION_RESTORE]: RIGHTS.WRITE,
  [ACTIONS.VERSION_DELETE]: RIGHTS.DELETE,

  [ACTIONS.PRESENTATION_READ]: RIGHTS.PRESENTATION_READ,
  [ACTIONS.PRESENTATION_WRITE]: RIGHTS.PRESENTATION_WRITE,

  [ACTIONS.WORKFLOW_READ]: RIGHTS.READ,

  [ACTIONS.SECURITY_ACL_MANAGE]: RIGHTS.ADMINISTER,
  [ACTIONS.SECURITY_ACL_RESET]: RIGHTS.ADMINISTER,
};

/**
 * Resolve required right for a given action string.
 * @param {string} action
 * @returns {string} corresponding right (or the action itself if already a basic right)
 */
function mapActionToRight(action) {
  if (!action || typeof action !== 'string') return RIGHTS.READ;
  const clean = action.trim();
  if (ACTION_TO_RIGHT[clean]) {
    return ACTION_TO_RIGHT[clean];
  }
  if (clean.startsWith('workflow:execute')) {
    return clean; // Specific command right: workflow:execute:<cmd> or general workflow:execute
  }
  // If action directly equals a right name
  const allRights = Object.values(RIGHTS);
  if (allRights.includes(clean)) {
    return clean;
  }
  return clean;
}

module.exports = {
  RIGHTS,
  ACTIONS,
  ACTION_TO_RIGHT,
  mapActionToRight,
};
