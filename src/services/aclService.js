const mongoose = require('mongoose');
const AccessControl = require('../models/AccessControl');
const Item = require('../models/Item');
const Role = require('../models/Role');
const User = require('../models/User');
const eventBus = require('../utils/eventBus');
const { RIGHTS, ACTIONS, mapActionToRight } = require('../config/permissions');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const branding = require('../config/branding');

class AclService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 120 * 1000; // 120 seconds TTL
    this.maxCacheSize = 2000;

    this.registerEventListeners();
  }

  /**
   * Register event listeners for immediate cache invalidation
   */
  registerEventListeners() {
    const clearRelated = () => {
      this.clearCache();
    };

    eventBus.on('acl.changed', clearRelated);
    eventBus.on('role.changed', clearRelated);
    eventBus.on('user.changed', clearRelated);
    eventBus.on('item.moved', clearRelated);
    eventBus.on('item.deleted', clearRelated);
    eventBus.on('item.created', clearRelated);
  }

  /**
   * Clear in-memory ACL cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Create cache key
   */
  getCacheKey(userId, itemId, rightOrAction) {
    const u = userId ? userId.toString() : 'anon';
    const i = itemId ? itemId.toString() : 'root';
    return `${u}:${i}:${rightOrAction}`;
  }

  /**
   * Check if user is an Administrator (bypass)
   */
  isAdministrator(user) {
    if (!user) return false;
    if (user.isAdmin === true) return true;
    const roleNames = [
      ...(Array.isArray(user.roleNames) ? user.roleNames : []),
      ...(Array.isArray(user.roles) ? user.roles.map((r) => (r.name ? r.name : r.toString())) : []),
    ];
    return roleNames.some((r) => {
      const lower = (r || '').toLowerCase();
      return lower === 'administrator' || lower === 'admin';
    });
  }

  /**
   * Resolve all principal IDs for a user (user ID + direct roles + nested inherited roles)
   * Prevents circular loops with a visited set.
   * @param {object} user
   * @returns {Promise<{ userPrincipalId: mongoose.Types.ObjectId, rolePrincipalIds: Array<mongoose.Types.ObjectId> }>}
   */
  async resolveUserPrincipals(user) {
    if (!user || (!user._id && !user.id)) {
      return { userPrincipalId: null, rolePrincipalIds: [] };
    }

    const userId = user._id || user.id;
    const userPrincipalId = new mongoose.Types.ObjectId(userId);

    // Collect direct role IDs
    const rawRoles = Array.isArray(user.roles) ? user.roles : [];
    const directRoleIds = rawRoles
      .map((r) => (r._id ? r._id : r))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Resolve nested roles via memberOf traversal (DFS/BFS with cycle guard)
    const allRoleIds = new Set(directRoleIds.map((id) => id.toString()));
    const queue = [...directRoleIds];

    // Support role names if user has roleNames or strings in roles array
    const roleNames = [
      ...(Array.isArray(user.roleNames) ? user.roleNames : []),
      ...rawRoles.filter((r) => typeof r === 'string' && !mongoose.Types.ObjectId.isValid(r)),
      ...rawRoles.filter((r) => r && r.name).map((r) => r.name),
    ];
    if (roleNames.length > 0) {
      try {
        const namedRoles = await Role.find({ name: { $in: roleNames } }).select('_id').lean();
        for (const nr of namedRoles) {
          const strId = nr._id.toString();
          if (!allRoleIds.has(strId)) {
            allRoleIds.add(strId);
            queue.push(nr._id);
          }
        }
      } catch (err) {
        logger.warn(`[AclService] Error finding named roles: ${err.message}`);
      }
    }

    while (queue.length > 0) {
      const currentRoleId = queue.shift();
      try {
        const roleDoc = await Role.findById(currentRoleId).select('memberOf').lean();
        if (roleDoc && Array.isArray(roleDoc.memberOf)) {
          for (const parentRoleId of roleDoc.memberOf) {
            const strId = parentRoleId.toString();
            if (!allRoleIds.has(strId)) {
              allRoleIds.add(strId);
              queue.push(new mongoose.Types.ObjectId(parentRoleId));
            }
          }
        }
      } catch (err) {
        logger.warn(`[AclService] Error expanding nested role ${currentRoleId}: ${err.message}`);
      }
    }

    const rolePrincipalIds = Array.from(allRoleIds).map((id) => new mongoose.Types.ObjectId(id));

    return {
      userPrincipalId,
      rolePrincipalIds,
    };
  }

  /**
   * Load item and its ancestors array
   * @param {string|mongoose.Types.ObjectId|object} itemOrId
   * @returns {Promise<object|null>}
   */
  async resolveItemWithAncestors(itemOrId) {
    if (!itemOrId) return null;

    if (typeof itemOrId === 'object' && itemOrId._id && Array.isArray(itemOrId.ancestors)) {
      return itemOrId;
    }

    const id = itemOrId._id || itemOrId.id || itemOrId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    return Item.findOne({ _id: id, deleted: { $ne: true } })
      .select('_id name displayName path ancestors parentId')
      .lean();
  }

  /**
   * Calculate effective permissions for all rights on a specific item for a given user or role
   * Follows DEC-042:
   * 1. Traverse from item up ancestors.
   * 2. Explicit rules on item win over inherited rules from ancestors.
   * 3. At the same level: User rule wins over Role rule.
   * 4. Among roles at the same level: Deny wins over Allow.
   * 5. Default: Deny (unless Administrator).
   *
   * @param {string|mongoose.Types.ObjectId|object} itemOrId
   * @param {object} user
   * @returns {Promise<object>} Map of right -> { isAllowed: boolean, access: 'allow'|'deny', origin: 'explicit'|'inherited'|'default', entry: object|null, level: number }
   */
  async getEffectivePermissions(itemOrId, user) {
    const item = await this.resolveItemWithAncestors(itemOrId);
    if (!item) {
      throw new NotFoundError('Item not found for permission evaluation');
    }

    const standardRights = Object.values(RIGHTS);
    const result = {};

    // 1. Administrator always has all rights allowed
    if (this.isAdministrator(user)) {
      for (const r of standardRights) {
        result[r] = {
          isAllowed: true,
          access: 'allow',
          origin: 'administrator',
          entry: null,
          level: 0,
          reason: 'Administrator role has unconditional full access to all items.',
        };
      }
      return result;
    }

    if (!user) {
      for (const r of standardRights) {
        result[r] = {
          isAllowed: false,
          access: 'deny',
          origin: 'default',
          entry: null,
          level: -1,
          reason: 'Unauthenticated user denied by default.',
        };
      }
      return result;
    }

    // 2. Resolve user principals
    const { userPrincipalId, rolePrincipalIds } = await this.resolveUserPrincipals(user);
    const allPrincipalIds = [userPrincipalId, ...rolePrincipalIds].filter(Boolean);

    // 3. Chain of items from target item up to Root: [item._id, ...reversed(ancestors)]
    const targetItemId = new mongoose.Types.ObjectId(item._id);
    const ancestorIds = Array.isArray(item.ancestors)
      ? [...item.ancestors].reverse().map((id) => new mongoose.Types.ObjectId(id))
      : [];
    const itemChain = [targetItemId, ...ancestorIds];
    const itemLevelMap = new Map();
    itemChain.forEach((id, idx) => {
      itemLevelMap.set(id.toString(), idx); // 0 = target item, 1 = parent, 2 = grand-parent...
    });

    // 4. Fetch all relevant ACL entries for this item and its ancestors in ONE single query
    const rawEntries = await AccessControl.find({
      itemId: { $in: itemChain },
      principalId: { $in: allPrincipalIds },
    }).lean();

    // Group entries by right
    const entriesByRight = new Map();
    for (const entry of rawEntries) {
      const r = entry.right.toLowerCase();
      if (!entriesByRight.has(r)) {
        entriesByRight.set(r, []);
      }
      entriesByRight.get(r).push(entry);
    }

    // Evaluate each right
    for (const r of standardRights) {
      const rules = entriesByRight.get(r) || [];
      result[r] = this.evaluateRulesForRight(r, rules, itemLevelMap, userPrincipalId, rolePrincipalIds);
    }

    return result;
  }

  /**
   * Internal evaluator for a single right given matching rules
   */
  evaluateRulesForRight(right, rules, itemLevelMap, userPrincipalId, _rolePrincipalIds) {
    if (!rules || rules.length === 0) {
      return {
        isAllowed: false,
        access: 'deny',
        origin: 'default',
        entry: null,
        level: -1,
        reason: 'No matching ACL rules found. Default Deny applied.',
      };
    }

    // Filter rules by inheritance applicability:
    // - At level 0 (target item): rule must have inheritance in ['thisItem', 'both']
    // - At level > 0 (ancestor): rule must have inheritance in ['descendants', 'both']
    const applicableRules = rules.filter((rule) => {
      const level = itemLevelMap.get(rule.itemId.toString());
      if (level === undefined) return false;
      if (level === 0) {
        return rule.inheritance === 'thisItem' || rule.inheritance === 'both';
      }
      return rule.inheritance === 'descendants' || rule.inheritance === 'both';
    });

    if (applicableRules.length === 0) {
      return {
        isAllowed: false,
        access: 'deny',
        origin: 'default',
        entry: null,
        level: -1,
        reason: 'Rules exist on tree but inheritance does not apply to this node. Default Deny applied.',
      };
    }

    // Sort rules by closest level (0 is closest, then 1, 2...)
    applicableRules.sort((a, b) => {
      const levelA = itemLevelMap.get(a.itemId.toString()) || 0;
      const levelB = itemLevelMap.get(b.itemId.toString()) || 0;
      return levelA - levelB;
    });

    const closestLevel = itemLevelMap.get(applicableRules[0].itemId.toString());
    const rulesAtClosestLevel = applicableRules.filter(
      (r) => itemLevelMap.get(r.itemId.toString()) === closestLevel
    );

    // Rule Resolution at closest level:
    // 1. User rule wins over Role rule
    const userRules = rulesAtClosestLevel.filter(
      (r) => r.principalType === 'user' && r.principalId.toString() === userPrincipalId.toString()
    );
    if (userRules.length > 0) {
      // Deny wins if both exist
      const hasDeny = userRules.some((r) => r.access === 'deny');
      const winningRule = hasDeny ? userRules.find((r) => r.access === 'deny') : userRules[0];
      const isAllowed = winningRule.access === 'allow';
      return {
        isAllowed,
        access: winningRule.access,
        origin: closestLevel === 0 ? 'explicit' : 'inherited',
        entry: winningRule,
        level: closestLevel,
        reason: `${closestLevel === 0 ? 'Explicit' : 'Inherited'} user-level rule decided ${winningRule.access.toUpperCase()}.`,
      };
    }

    // 2. Role rules at this level: Deny wins over Allow
    const roleRules = rulesAtClosestLevel.filter((r) => r.principalType === 'role');
    const hasDeny = roleRules.some((r) => r.access === 'deny');
    if (hasDeny) {
      const winningRule = roleRules.find((r) => r.access === 'deny');
      return {
        isAllowed: false,
        access: 'deny',
        origin: closestLevel === 0 ? 'explicit' : 'inherited',
        entry: winningRule,
        level: closestLevel,
        reason: `${closestLevel === 0 ? 'Explicit' : 'Inherited'} role rule DENY wins over allow.`,
      };
    }

    // All are Allow
    const winningRule = roleRules[0];
    return {
      isAllowed: true,
      access: 'allow',
      origin: closestLevel === 0 ? 'explicit' : 'inherited',
      entry: winningRule,
      level: closestLevel,
      reason: `${closestLevel === 0 ? 'Explicit' : 'Inherited'} role rule ALLOW applied.`,
    };
  }

  /**
   * Explain permission resolution details for a specific action on an item (Access Viewer)
   * @param {object} user
   * @param {string|mongoose.Types.ObjectId|object} itemOrId
   * @param {string} action
   * @returns {Promise<object>}
   */
  async explainPermission(user, itemOrId, action) {
    const right = mapActionToRight(action);
    const item = await this.resolveItemWithAncestors(itemOrId);
    if (!item) {
      return {
        isAllowed: false,
        right,
        action,
        decision: 'deny',
        reason: 'Item not found.',
        entry: null,
      };
    }

    const effective = await this.getEffectivePermissions(item, user);
    const evaluation = effective[right] || {
      isAllowed: false,
      access: 'deny',
      origin: 'default',
      reason: `Right "${right}" not explicitly evaluated. Default Deny.`,
      entry: null,
    };

    return {
      isAllowed: evaluation.isAllowed,
      right,
      action,
      decision: evaluation.access,
      access: evaluation.access,
      origin: evaluation.origin,
      level: evaluation.level,
      reason: evaluation.reason,
      entry: evaluation.entry,
      item: {
        _id: item._id,
        name: item.name,
        path: item.path,
      },
    };
  }

  /**
   * Main permission check gateway: canPerform(user, item, action)
   * Resolves ACL tree inheritance, roles, and action rights (DEC-042).
   * @param {object} user
   * @param {string|mongoose.Types.ObjectId|object|null} itemOrId
   * @param {string} action
   * @returns {Promise<boolean>}
   */
  async canPerform(user, itemOrId, action) {
    if (!user) return false;

    // Administrator bypass
    if (this.isAdministrator(user)) return true;

    if (!action) return false;
    const cleanAction = action.trim();
    const right = mapActionToRight(cleanAction);

    // Global / System Level Actions (item is null or action is platform-wide)
    if (!itemOrId) {
      return this.evaluateGlobalAction(user, cleanAction);
    }

    const item = await this.resolveItemWithAncestors(itemOrId);
    if (!item) return false;

    // Cache check
    const cacheKey = this.getCacheKey(user._id || user.id, item._id, cleanAction);
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      if (Date.now() - entry.time < this.cacheTtlMs) {
        return entry.isAllowed;
      }
      this.cache.delete(cacheKey);
    }

    // Special item tree protections (DEC-032 / Layout tree permissions)
    const layoutPath = branding.PATHS.LAYOUT.toLowerCase();
    const isLayoutTree = item.path && (item.path.toLowerCase().startsWith(layoutPath) || item.path.toLowerCase().startsWith('/root/layout'));
    if (isLayoutTree) {
      const roleNames = [
        ...(Array.isArray(user.roleNames) ? user.roleNames : []),
        ...(Array.isArray(user.roles) ? user.roles.map((r) => (r.name ? r.name : r.toString())) : []),
      ];
      const isDeveloper = roleNames.some((r) => r.toLowerCase() === 'developer');

      if (right === RIGHTS.READ || right === RIGHTS.PRESENTATION_READ) {
        return true;
      }
      if (
        right === RIGHTS.WRITE ||
        right === RIGHTS.DELETE ||
        right === RIGHTS.CREATE ||
        right === RIGHTS.RENAME ||
        right === RIGHTS.PRESENTATION_WRITE
      ) {
        return isDeveloper;
      }
    }

    // Evaluate item permissions
    const effective = await this.getEffectivePermissions(item, user);
    const evalResult = effective[right] || (action.startsWith('workflow:execute') ? effective[RIGHTS.WORKFLOW_EXECUTE] : null);
    let isAllowed = Boolean(evalResult && evalResult.isAllowed);

    // Backward compatibility: If no matching rule was found (origin === 'default' or undefined) and action is workflow or database action
    if (!evalResult || evalResult.origin === 'default') {
      if (action.startsWith('workflow:execute') || action.startsWith('database:') || action === 'workflow:read') {
        isAllowed = this.evaluateGlobalAction(user, action);
      }
    }

    // Save in cache (limit size)
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, { isAllowed, time: Date.now() });

    return isAllowed;
  }

  /**
   * Evaluate system/global actions when no specific item is provided
   */
  evaluateGlobalAction(user, action) {
    const roleNames = [
      ...(Array.isArray(user.roleNames) ? user.roleNames : []),
      ...(Array.isArray(user.roles) ? user.roles.map((r) => (r.name ? r.name : r.toString())) : []),
    ];
    const isApprover = roleNames.includes('Approver');
    const isEditor = roleNames.includes('Editor');
    const isAuthor = roleNames.includes('Author');
    const isDeveloper = roleNames.includes('Developer');

    switch (action) {
      case ACTIONS.DATABASE_WEB_READ:
      case ACTIONS.DATABASE_COMPARE:
        return isApprover; // Admins already bypassed above

      case ACTIONS.PUBLISH_MANAGE:
        return false; // Only Administrator

      case ACTIONS.WORKBOX_READ:
        return isApprover || isEditor || isAuthor;

      case ACTIONS.WORKBOX_BULK:
        return isApprover;

      case ACTIONS.WORKFLOW_MANAGE:
        return isDeveloper;

      case ACTIONS.SECURITY_MANAGE:
      case ACTIONS.SECURITY_USER_MANAGE:
      case ACTIONS.SECURITY_ROLE_MANAGE:
      case ACTIONS.BASICAUTH_READ:
      case ACTIONS.BASICAUTH_MANAGE:
      case ACTIONS.SERIALIZATION_READ:
      case ACTIONS.SERIALIZATION_EXPORT:
      case ACTIONS.SERIALIZATION_IMPORT:
        return false; // Only Administrator

      case ACTIONS.MEDIA_READ:
        return true;

      case ACTIONS.MEDIA_WRITE:
      case ACTIONS.MEDIA_UPLOAD:
        return isAuthor || isEditor || isApprover || isDeveloper;

      case ACTIONS.MEDIA_DELETE:
        return isEditor || isApprover || isDeveloper;

      case ACTIONS.MEDIA_SYNC:
        return isDeveloper;

      case ACTIONS.RECYCLEBIN_READ:
        return isAuthor || isEditor || isApprover || isDeveloper;

      case ACTIONS.RECYCLEBIN_RESTORE:
        return isEditor || isApprover || isDeveloper;

      case ACTIONS.RECYCLEBIN_PURGE:
        return isApprover || isDeveloper;

      case ACTIONS.AUDIT_READ:
        return isApprover || isDeveloper;

      case 'workflow:read':
        return true;

      default:
        if (typeof action === 'string' && action.startsWith('workflow:execute')) {
          const parts = action.split(':');
          const cmdName = (parts[2] || '').toLowerCase();
          if (cmdName === 'submit') {
            return isAuthor || isEditor || isApprover;
          }
          return isApprover;
        }
        return false;
    }
  }

  /**
   * Batch filter for items that a user can read (No N+1 problem!).
   * Loads all ancestors and ACL rules in a single MongoDB query.
   * @param {object} user
   * @param {Array<object>} items
   * @returns {Promise<Array<object>>}
   */
  async filterReadable(user, items) {
    if (!user || !Array.isArray(items) || items.length === 0) return [];
    if (this.isAdministrator(user)) return items;

    const { userPrincipalId, rolePrincipalIds } = await this.resolveUserPrincipals(user);
    const allPrincipalIds = [userPrincipalId, ...rolePrincipalIds].filter(Boolean);

    // Collect all item IDs and all their ancestor IDs
    const allIds = new Set();
    for (const it of items) {
      if (it && it._id) {
        allIds.add(it._id.toString());
        if (Array.isArray(it.ancestors)) {
          it.ancestors.forEach((a) => allIds.add(a.toString()));
        }
      }
    }

    if (allIds.size === 0) return [];

    // Query all ACL entries for any of these items in ONE single DB query
    const objectIds = Array.from(allIds).map((id) => new mongoose.Types.ObjectId(id));
    const allAclEntries = await AccessControl.find({
      itemId: { $in: objectIds },
      principalId: { $in: allPrincipalIds },
      right: RIGHTS.READ,
    }).lean();

    // Group rules by itemId
    const rulesByItemId = new Map();
    for (const entry of allAclEntries) {
      const iId = entry.itemId.toString();
      if (!rulesByItemId.has(iId)) {
        rulesByItemId.set(iId, []);
      }
      rulesByItemId.get(iId).push(entry);
    }

    // Evaluate in-memory for each item
    const readable = [];
    for (const it of items) {
      const targetItemId = it._id.toString();
      const ancestors = Array.isArray(it.ancestors) ? [...it.ancestors].reverse() : [];
      const itemChain = [targetItemId, ...ancestors.map((a) => a.toString())];

      const itemLevelMap = new Map();
      itemChain.forEach((id, idx) => itemLevelMap.set(id, idx));

      // Gather rules along this item's specific chain
      const itemRules = [];
      for (const id of itemChain) {
        const rules = rulesByItemId.get(id);
        if (rules) {
          itemRules.push(...rules);
        }
      }

      const evalResult = this.evaluateRulesForRight(
        RIGHTS.READ,
        itemRules,
        itemLevelMap,
        userPrincipalId,
        rolePrincipalIds
      );

      if (evalResult.isAllowed) {
        readable.push(it);
      }
    }

    return readable;
  }

  /**
   * Get all ACL entries explicitly assigned to an item
   * @param {string|mongoose.Types.ObjectId} itemId
   * @returns {Promise<Array<object>>}
   */
  async getEntriesForItem(itemId) {
    if (!itemId) return [];
    return AccessControl.find({ itemId })
      .populate('principalId')
      .sort({ principalType: 1, right: 1 })
      .lean();
  }

  /**
   * Set or update an ACL entry on an item (requires 'administer' permission)
   * Enforces self-lockout prevention.
   */
  async setEntry({ itemId, principalType, principalId, right, access, inheritance = 'both', user }) {
    if (!itemId || !principalType || !principalId || !right || !access) {
      throw new ValidationError('Missing required parameters to set ACL entry');
    }

    // Permission check: actor must have 'administer' on this item
    const hasAdminister = await this.canPerform(user, itemId, ACTIONS.SECURITY_ACL_MANAGE);
    if (!hasAdminister) {
      throw new ForbiddenError('You do not have "administer" right to change permissions on this item.');
    }

    // Self-lockout prevention check
    const isSelfUser = principalType === 'user' && (user._id || user.id).toString() === principalId.toString();
    if (isSelfUser && right === RIGHTS.ADMINISTER && access === 'deny' && !this.isAdministrator(user)) {
      throw new ForbiddenError('Cannot self-lockout: You cannot assign Deny administer to yourself.');
    }

    const cleanRight = right.trim().toLowerCase();
    const filter = {
      itemId: new mongoose.Types.ObjectId(itemId),
      principalType,
      principalId: new mongoose.Types.ObjectId(principalId),
      right: cleanRight,
    };

    const updateDoc = {
      ...filter,
      access,
      inheritance,
    };

    const result = await AccessControl.findOneAndUpdate(filter, { $set: updateDoc }, { upsert: true, new: true });
    this.clearCache();
    eventBus.emit('acl.changed', { itemId, principalId, right: cleanRight });

    return result;
  }

  /**
   * Remove a specific ACL entry (reverting to inheritance for this principal & right)
   */
  async removeEntry(entryId, user) {
    const entry = await AccessControl.findById(entryId);
    if (!entry) throw new NotFoundError('ACL rule entry not found');

    const hasAdminister = await this.canPerform(user, entry.itemId, ACTIONS.SECURITY_ACL_MANAGE);
    if (!hasAdminister) {
      throw new ForbiddenError('You do not have "administer" right to modify permissions on this item.');
    }

    await AccessControl.findByIdAndDelete(entryId);
    this.clearCache();
    eventBus.emit('acl.changed', { itemId: entry.itemId, right: entry.right });

    return { success: true };
  }

  /**
   * Reset all direct ACL entries on an item to inherit entirely from parent
   */
  async resetToInherited(itemId, user) {
    const hasAdminister = await this.canPerform(user, itemId, ACTIONS.SECURITY_ACL_RESET);
    if (!hasAdminister) {
      throw new ForbiddenError('You do not have "administer" right to reset permissions on this item.');
    }

    const deleted = await AccessControl.deleteMany({ itemId });
    this.clearCache();
    eventBus.emit('acl.changed', { itemId });

    return { success: true, count: deleted.deletedCount };
  }

  /**
   * Get detailed permission matrix for Security Editor on an item
   * Returns explicit entries plus calculated inherited status for each principal and right
   * @param {string|mongoose.Types.ObjectId} itemId
   * @param {string} [principalType]
   * @param {string} [principalId]
   */
  async getAclMatrix(itemId, principalType = null, principalId = null) {
    const item = await this.resolveItemWithAncestors(itemId);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    // Standard rights evaluated in Security Editor
    const rightsList = [
      RIGHTS.READ,
      RIGHTS.WRITE,
      RIGHTS.CREATE,
      RIGHTS.RENAME,
      RIGHTS.DELETE,
      RIGHTS.PUBLISH,
      RIGHTS.ADMINISTER,
    ];

    // Find all direct rules on this item
    const directRules = await AccessControl.find({ itemId: item._id }).lean();

    // If specific principal is requested, evaluate only for that principal
    // Otherwise gather all principals that have rules on this item or ancestors
    const itemChain = [item._id.toString(), ...(item.ancestors || []).map((a) => a.toString()).reverse()];
    const allChainRules = await AccessControl.find({ itemId: { $in: itemChain } }).lean();

    // Group principals
    const principalsMap = new Map();
    for (const r of allChainRules) {
      const key = `${r.principalType}:${r.principalId.toString()}`;
      if (!principalsMap.has(key)) {
        principalsMap.set(key, { principalType: r.principalType, principalId: r.principalId.toString() });
      }
    }

    if (principalType && principalId) {
      const key = `${principalType}:${principalId.toString()}`;
      principalsMap.set(key, { principalType, principalId: principalId.toString() });
    }

    // Populate principal details
    const matrix = [];
    for (const p of principalsMap.values()) {
      let principalDoc = null;
      if (p.principalType === 'user') {
        principalDoc = await User.findById(p.principalId).select('username fullName displayName domain').lean();
      } else {
        principalDoc = await Role.findById(p.principalId).select('name domain description').lean();
      }

      if (!principalDoc) continue;

      const rightsMatrix = {};
      for (const r of rightsList) {
        // Find explicit direct rule on this item
        const direct = directRules.find(
          (dr) =>
            dr.principalType === p.principalType &&
            dr.principalId.toString() === p.principalId &&
            dr.right === r
        );

        if (direct) {
          rightsMatrix[r] = {
            state: direct.access, // 'allow' or 'deny'
            isDirect: true,
            inheritance: direct.inheritance,
            entryId: direct._id,
            origin: 'thisItem',
          };
        } else {
          // Check inheritance from ancestors
          let inheritedState = 'inherit';
          let originItemId = null;
          let entryId = null;

          for (let i = 1; i < itemChain.length; i++) {
            const ancestorId = itemChain[i];
            const ancestorRule = allChainRules.find(
              (ar) =>
                ar.itemId.toString() === ancestorId &&
                ar.principalType === p.principalType &&
                ar.principalId.toString() === p.principalId &&
                ar.right === r &&
                (ar.inheritance === 'descendants' || ar.inheritance === 'both')
            );

            if (ancestorRule) {
              inheritedState = ancestorRule.access;
              originItemId = ancestorId;
              entryId = ancestorRule._id;
              break;
            }
          }

          rightsMatrix[r] = {
            state: inheritedState, // 'allow', 'deny', or 'inherit'
            isDirect: false,
            inheritance: 'inherited',
            originItemId,
            entryId,
          };
        }
      }

      matrix.push({
        principal: {
          type: p.principalType,
          id: p.principalId,
          name: principalDoc.name || principalDoc.username,
          displayName: principalDoc.displayName || principalDoc.fullName || principalDoc.name,
          domain: principalDoc.domain || branding.DEFAULT_DOMAIN,
        },
        rights: rightsMatrix,
      });
    }

    return {
      itemId: item._id,
      path: item.path,
      rightsList,
      matrix,
    };
  }
}

module.exports = new AclService();
