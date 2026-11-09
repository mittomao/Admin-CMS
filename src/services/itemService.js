const mongoose = require('mongoose');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const User = require('../models/User');
const { getFieldHandler } = require('../fields');
const templateService = require('./templateService');
const versionService = require('./versionService');
const languageService = require('./languageService');
const webItemService = require('./webItemService');
const { resolveItemIcon, getIconUrl } = require('../config/icons');
const branding = require('../config/branding');

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

const PROTECTED_SYSTEM_PATHS = new Set([
  // Standard root paths (branding)
  branding.PATHS.ROOT.toLowerCase(),
  branding.PATHS.CONTENT.toLowerCase(),
  branding.PATHS.MEDIA.toLowerCase(),
  branding.PATHS.SYSTEM.toLowerCase(),
  branding.PATHS.SYSTEM_LANGUAGES.toLowerCase(),
  branding.PATHS.TEMPLATES.toLowerCase(),
  `${branding.PATHS.TEMPLATES}/system/sample component`.toLowerCase(),
  `${branding.PATHS.TEMPLATES}/system/standard template`.toLowerCase(),
  branding.PATHS.LAYOUT.toLowerCase(),
  branding.PATHS.LAYOUTS.toLowerCase(),
  branding.PATHS.PLACEHOLDERS.toLowerCase(),
  branding.PATHS.RENDERINGS.toLowerCase(),
  branding.PATHS.DEVICES.toLowerCase(),
  branding.PATHS.PLACEHOLDER_SETTINGS.toLowerCase(),

  // Legacy paths (backward compatibility)
  '/root',
  '/root/content',
  '/root/media library',
  '/root/system',
  '/root/system/languages',
  '/root/templates',
  '/root/templates/system/sample component',
  '/root/templates/system/standard template',
  '/root/layout',
  '/root/layout/layouts',
  '/root/layout/placeholders',
  '/root/layout/renderings',
  '/root/layout/devices',
  '/root/layout/placeholder settings',
]);

function isProtectedSystemPath(path) {
  if (!path) return false;
  return PROTECTED_SYSTEM_PATHS.has(path.toLowerCase().trim());
}

const itemService = {
  ConflictError,
  ValidationError,
  isProtectedSystemPath,

  /**
   * Permission check gateway (Treecraft Item-Level ACL according to DEC-042 & Phase 7)
   * Keeps exact function signature: canPerform(user, item, action)
   * Handles synchronous resolution for global/admin actions, and async resolution for item ACL.
   */
  canPerform(user, item, action) {
    if (!user) return false;
    const aclService = require('./aclService');
    if (aclService.isAdministrator(user)) return true;
    if (!item) {
      return aclService.evaluateGlobalAction(user, action);
    }
    return aclService.canPerform(user, item, action);
  },

  /**
   * Explain permission determination for Access Viewer (Phase 7)
   */
  async explainPermission(user, item, action) {
    const aclService = require('./aclService');
    return aclService.explainPermission(user, item, action);
  },

  /**
   * Validate and normalize database name (whitelist: 'master' | 'web')
   */
  validateDb(db = 'master') {
    const clean = (db || 'master').toLowerCase().trim();
    if (clean !== 'master' && clean !== 'web') {
      throw new ValidationError(`Cơ sở dữ liệu không hợp lệ [${db}]. Chỉ chấp nhận: 'master', 'web'.`);
    }
    return clean;
  },

  /**
   * Get Repository Model for specific database (GĐ 8.1)
   */
  getItemRepository(db = 'master') {
    const clean = this.validateDb(db);
    return clean === 'web' ? PublishedItem : Item;
  },

  /**
   * Get the root item of the CMS tree (/root or legacy /treecraft)
   */
  async getRoot(db = 'master') {
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);
    let root = await Repo.findOne({
      path: { $in: [branding.PATHS.ROOT, '/root'] },
      isDeleted: { $ne: true },
      deleted: { $ne: true },
    })
      .populate('templateId')
      .lean();

    if (!root) {
      // Fallback: look for item with parentId: null
      root = await Repo.findOne({ parentId: null, isDeleted: { $ne: true }, deleted: { $ne: true } })
        .populate('templateId')
        .lean();
    }
    return root;
  },

  /**
   * Get an item by ID
   */
  async getById(id, db = 'master') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);
    const item = await Repo.findOne({ _id: id, isDeleted: { $ne: true }, deleted: { $ne: true } })
      .populate('templateId')
      .lean();
    if (!item) return null;

    // Provide dual-key access for ease of use in tests, EJS, and APIs
    if (item.fields && item.templateId) {
      const tpl = item.templateId;
      const rawFields = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields || {});
      const enrichedFields = { ...rawFields };

      if (tpl.sections) {
        for (const sec of tpl.sections) {
          if (sec.fields) {
            for (const f of sec.fields) {
              const fieldIdStr = f._id.toString();
              if (rawFields[fieldIdStr] !== undefined && rawFields[f.name] === undefined) {
                enrichedFields[f.name] = rawFields[fieldIdStr];
              }
            }
          }
        }
      }
      item.fields = enrichedFields;
    }
    return item;
  },

  /**
   * Get an item with resolved inherited template and calculated field values
   */
  async getItemWithRenderSchema(id, langCode = null, versionNumber = 1, db = 'master') {
    const cleanDb = this.validateDb(db);
    const defLang = await languageService.getDefault({ store: cleanDb });
    const code = (langCode || defLang.code).toLowerCase().trim();

    // 1. Web Database Mode (Strict Read-Only)
    if (cleanDb === 'web') {
      const item = await this.getById(id, 'web');
      if (!item) return null;

      const languages = Array.isArray(item.languages) ? item.languages : [];
      const langEntry = languages.find((l) => l.code === code) || null;
      const pubVersion = langEntry ? langEntry.publishedVersion : (item.sourceVersion || 1);

      const effectiveTemplate = await templateService.resolveEffectiveTemplate(item, code, pubVersion);
      const resolvedTemplate = effectiveTemplate || (await templateService.resolveTemplate(item.templateId._id || item.templateId));
      const standardValues = effectiveTemplate ? effectiveTemplate.standardValues : (await templateService.resolveStandardValues(item.templateId._id || item.templateId));

      const resolvedResult = await webItemService.resolveFields(item, code);
      const resolvedFields = resolvedResult.fields || {};

      // Augment fields on template
      if (resolvedTemplate && resolvedTemplate.sections) {
        for (const sec of resolvedTemplate.sections) {
          if (sec.fields) {
            for (const f of sec.fields) {
              const fieldId = f._id.toString();
              const fieldName = f.name;

              let effectiveValue = '';
              let hasExplicitValue = false;
              let origin = 'standard';

              if (resolvedFields[fieldId] !== undefined) {
                effectiveValue = resolvedFields[fieldId];
                hasExplicitValue = true;
                origin = 'version';
              } else if (resolvedFields[fieldName] !== undefined) {
                effectiveValue = resolvedFields[fieldName];
                hasExplicitValue = true;
                origin = 'version';
              } else {
                effectiveValue = f.defaultValue !== undefined ? f.defaultValue : '';
              }

              f.effectiveValue = effectiveValue;
              f.isUsingStandardValue = !hasExplicitValue;
              f.hasExplicitValue = hasExplicitValue;
              f.origin = origin;
            }
          }
        }
      }

      const languagesList = languages.map((l) => l.code);
      const versionsList = langEntry ? [{ version: langEntry.publishedVersion }] : [{ version: 1 }];
      const quickInfo = await this.getQuickInfo(item, 'web');
      const componentTemplates = await templateService.getComponentTemplates();

      return {
        item,
        resolvedTemplate,
        standardValues,
        lang: code,
        version: pubVersion,
        versionInfo: {
          version: pubVersion,
          createdAt: langEntry?.publishedAt || item.publishedAt || item.updatedAt,
          updatedAt: langEntry?.publishedAt || item.publishedAt || item.updatedAt,
        },
        languagesList,
        versionsList,
        hasLanguage: Boolean(langEntry),
        hasVersion: Boolean(langEntry),
        componentTemplates,
        quickInfo,
        isReadOnly: true,
        isPublishedOnWeb: true,
        currentDb: 'web',
      };
    }

    // 2. Master Database Mode (Default)
    const item = await this.getById(id, 'master');
    if (!item) return null;

    const effectiveTemplate = await templateService.resolveEffectiveTemplate(item, langCode, versionNumber);
    const resolvedTemplate = effectiveTemplate || (await templateService.resolveTemplate(item.templateId._id || item.templateId));
    const standardValues = effectiveTemplate ? effectiveTemplate.standardValues : (await templateService.resolveStandardValues(item.templateId._id || item.templateId));

    // Resolve multilingual & versioned fields
    const resolvedResult = await versionService.resolveFields(item, langCode, versionNumber);
    const resolvedFields = resolvedResult.fields;
    const origins = resolvedResult.origins;

    // Augment resolved fields with current effective values and standard value flags
    if (resolvedTemplate && resolvedTemplate.sections) {
      for (const sec of resolvedTemplate.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            const fieldId = f._id.toString();
            const fieldName = f.name;

            const origin = origins[fieldId] || origins[fieldName] || 'standard';
            const isUsingStandardValue = origin === 'standard';
            const hasExplicitValue = !isUsingStandardValue;

            let effectiveValue = '';
            if (resolvedFields[fieldId] !== undefined) {
              effectiveValue = resolvedFields[fieldId];
            } else if (resolvedFields[fieldName] !== undefined) {
              effectiveValue = resolvedFields[fieldName];
            } else {
              effectiveValue = f.defaultValue !== undefined ? f.defaultValue : '';
            }

            f.effectiveValue = effectiveValue;
            f.isUsingStandardValue = isUsingStandardValue;
            f.hasExplicitValue = hasExplicitValue;
            f.origin = origin;
          }
        }
      }
    }

    // Retrieve languages and versions lists
    const languagesList = await versionService.listLanguages(item._id);
    const versionsList = await versionService.listVersions(item._id, langCode);

    // Retrieve available component templates for rendering items
    const componentTemplates = await templateService.getComponentTemplates();
    const quickInfo = await this.getQuickInfo(item, 'master');

    return {
      item,
      resolvedTemplate,
      standardValues,
      lang: code,
      version: parseInt(versionNumber, 10) || 1,
      versionInfo: resolvedResult.versionInfo,
      languagesList,
      versionsList,
      hasLanguage: resolvedResult.hasLanguage,
      hasVersion: resolvedResult.hasVersion,
      componentTemplates,
      quickInfo,
      isReadOnly: false,
      currentDb: 'master',
    };
  },

  /**
   * Get Treecraft Quick Info metadata for an item (DEC-037 / DEC-041)
   */
  async getQuickInfo(itemOrId, db = 'master') {
    if (!itemOrId) return null;
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);

    let item = itemOrId;
    if (typeof itemOrId === 'string' || itemOrId instanceof mongoose.Types.ObjectId || !itemOrId.name || !itemOrId.path) {
      item = await Repo.findById(itemOrId).lean();
    }
    if (!item && cleanDb === 'master') {
      // Check if it's a Template document (in case called with template ID)
      const tpl = await Template.findById(itemOrId).lean();
      if (tpl) {
        item = (await Item.findById(tpl._id).lean()) || {
          _id: tpl._id,
          name: tpl.name,
          displayName: tpl.displayName,
          path: tpl.path || `${branding.PATHS.TEMPLATES}/${tpl.name}`,
          templateId: null,
          createdBy: tpl.createdBy,
          createdFrom: tpl.createdFrom || null,
        };
      }
    }
    if (!item) return null;

    const itemIdStr = item._id ? item._id.toString().toUpperCase() : '';
    const formattedItemId = `{${itemIdStr}}`;

    const templateIdToQuery = item.templateId ? (item.templateId._id || item.templateId) : null;
    const createdFromId = item.createdFrom ? (item.createdFrom._id || item.createdFrom) : null;
    const createdById = item.createdBy ? (item.createdBy._id || item.createdBy) : null;
    const publishedById = item.publishedBy ? (item.publishedBy._id || item.publishedBy) : null;

    // Fetch related records in parallel to prevent N+1 queries
    const [templateDoc, sourceItem, ownerUser, publishedByUser] = await Promise.all([
      templateIdToQuery
        ? Template.findById(templateIdToQuery).select('name displayName path').lean()
        : null,
      createdFromId
        ? Item.findById(createdFromId).select('name displayName path').lean()
        : null,
      createdById
        ? User.findById(createdById).select('username domain fullName').lean()
        : null,
      publishedById
        ? User.findById(publishedById).select('username domain fullName').lean()
        : null,
    ]);

    let templatePath = templateDoc ? templateDoc.path : null;
    if (!templatePath && templateIdToQuery) {
      const tplItem = await Item.findById(templateIdToQuery).select('path name displayName').lean();
      if (tplItem) {
        templatePath = tplItem.path;
      }
    }

    const templateIdStr = templateIdToQuery ? templateIdToQuery.toString().toUpperCase() : '';
    const templateName = templateDoc ? (templateDoc.displayName || templateDoc.name) : 'Unknown';

    return {
      itemId: formattedItemId,
      rawId: item._id ? item._id.toString() : '',
      name: item.name,
      displayName: item.displayName || item.name,
      path: item.path,
      database: cleanDb,
      publishedAt: item.publishedAt || null,
      publishedBy: publishedByUser ? `${publishedByUser.domain || branding.DEFAULT_DOMAIN}\\${publishedByUser.username}` : (item.publishedBy ? item.publishedBy.toString() : null),
      sourceVersion: item.sourceVersion || 1,
      template: {
        rawId: templateIdToQuery ? templateIdToQuery.toString() : null,
        id: templateIdStr ? `{${templateIdStr}}` : '',
        name: templateName,
        path: templatePath || `${branding.PATHS.TEMPLATES}/System/Template`,
        fullText: templatePath ? `${templatePath} - {${templateIdStr}}` : (templateIdStr ? `{${templateIdStr}}` : '[unknown]'),
      },
      createdFrom: {
        rawId: sourceItem ? sourceItem._id.toString() : null,
        displayText: sourceItem
          ? `${sourceItem.displayName || sourceItem.name} - {${sourceItem._id.toString().toUpperCase()}}`
          : '[unknown]',
        isUnknown: !sourceItem,
      },
      itemOwner: {
        rawId: ownerUser ? ownerUser._id.toString() : null,
        username: ownerUser ? ownerUser.username : null,
        domain: (ownerUser && ownerUser.domain) || branding.DEFAULT_DOMAIN,
        displayText: ownerUser ? `${ownerUser.domain || branding.DEFAULT_DOMAIN}\\${ownerUser.username}` : '[unknown]',
        isUnknown: !ownerUser,
      },
    };
  },

  /**
   * Reset an item field back to its standard value (removes explicit override)
   */
  async resetFieldToStandardValue(id, fieldId, userId = null) {
    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item) throw new ValidationError('Item not found.');

    const fieldsMap = item.fields instanceof Map
      ? item.fields
      : new Map(Object.entries(item.fields || {}));

    fieldsMap.delete(fieldId.toString());

    // Also remove fieldName key if present
    const resolvedTemplate = (await templateService.resolveEffectiveTemplate(item)) || (await templateService.resolveTemplate(item.templateId));
    const fieldDef = resolvedTemplate?.sections?.flatMap((s) => s.fields)?.find(
      (f) => f._id.toString() === fieldId.toString()
    );
    if (fieldDef) {
      fieldsMap.delete(fieldDef.name);
    }

    item.fields = fieldsMap;
    item.updatedBy = userId;
    await item.save();

    return this.getItemWithRenderSchema(item._id);
  },

  /**
   * Get an item by Path
   */
  async getByPath(rawPath, db = 'master') {
    if (!rawPath) return null;
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);
    let targetPath = rawPath.trim();
    if (targetPath.length > 1 && targetPath.endsWith('/')) {
      targetPath = targetPath.replace(/\/+$/, '');
    }
    if (targetPath === '/') {
      targetPath = branding.PATHS.ROOT;
    }

    // Normalize path aliases for templates
    if (targetPath === '/template' || targetPath === '/templates' || targetPath === '/root/template') {
      targetPath = branding.PATHS.TEMPLATES;
    } else if (targetPath.toLowerCase().startsWith('/template/')) {
      targetPath = branding.PATHS.TEMPLATES + '/' + targetPath.slice('/template/'.length);
    } else if (targetPath.toLowerCase().startsWith('/templates/')) {
      targetPath = branding.PATHS.TEMPLATES + '/' + targetPath.slice('/templates/'.length);
    } else if (targetPath.toLowerCase().startsWith('/root/template/')) {
      targetPath = branding.PATHS.TEMPLATES + '/' + targetPath.slice('/root/template/'.length);
    }

    // Try finding exact targetPath first, with fallback to equivalent root prefix
    let alternativePath = null;
    if (targetPath.toLowerCase().startsWith('/root/')) {
      alternativePath = branding.PATHS.ROOT + targetPath.slice('/root'.length);
    }

    const pathQuery = alternativePath
      ? { $in: [new RegExp(`^${targetPath}$`, 'i'), new RegExp(`^${alternativePath}$`, 'i')] }
      : new RegExp(`^${targetPath}$`, 'i');

    return Repo.findOne({
      path: pathQuery,
      isDeleted: { $ne: true },
      deleted: { $ne: true },
    })
      .populate('templateId')
      .lean();
  },

  /**
   * Get direct children of an item
   */
  async getChildren(parentId, options = {}) {
    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) return [];
    const db = options.db || (typeof options === 'string' ? options : 'master');
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);
    const query = { parentId, isDeleted: { $ne: true }, deleted: { $ne: true } };

    const children = await Repo.find(query)
      .populate('templateId')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (children.length === 0) return [];

    // Check which children have subitems of their own
    const childIds = children.map((c) => c._id);
    const subChildrenCounts = await Repo.aggregate([
      { $match: { parentId: { $in: childIds }, isDeleted: { $ne: true }, deleted: { $ne: true } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    for (const sc of subChildrenCounts) {
      countMap[sc._id.toString()] = sc.count;
    }

    return children.map((c) => ({
      ...c,
      hasChildren: (countMap[c._id.toString()] || 0) > 0,
      childrenCount: countMap[c._id.toString()] || 0,
    }));
  },

  /**
   * Get path breadcrumb trail from root to item
   */
  async getPathBreadcrumb(item, db = 'master') {
    if (!item) return [];
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);

    const trailIds = [...(item.ancestors || []), item._id];
    const items = await Repo.find({ _id: { $in: trailIds } })
      .select('name displayName path templateId')
      .populate('templateId', 'name icon')
      .lean();

    // Preserve ancestors order
    const itemMap = new Map(items.map((i) => [i._id.toString(), i]));
    return trailIds
      .map((id) => itemMap.get(id.toString()))
      .filter(Boolean);
  },

  /**
   * Validate technical name for an item
   */
  cleanItemName(name) {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Item name is required.');
    }
    const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    if (!cleaned) {
      throw new ValidationError('Item name must contain at least one valid alphanumeric character.');
    }
    return cleaned;
  },

  /**
   * Create an item from template
   */
  async createFromTemplate(parentId, templateId, rawName, displayName = '', userId = null) {
    const parent = await Item.findOne({ _id: parentId, deleted: false });
    if (!parent) {
      throw new ValidationError('Parent item not found or has been deleted.');
    }

    const template = await Template.findById(templateId);
    if (!template) {
      throw new ValidationError('Template not found.');
    }

    // Leaf items under presentation cannot have children created manually
    const parentTemplate = await Template.findById(parent.templateId);
    if (parentTemplate && ['Layout', 'Rendering', 'Device', 'Placeholder Settings'].includes(parentTemplate.name)) {
      throw new ValidationError(`Không thể tạo item con dưới ${parentTemplate.name} item.`);
    }

    // Leaf template items cannot have children created
    const parentTplDoc = await Template.findById(parent._id).lean();
    if (parentTplDoc && parentTplDoc.name !== 'Template Folder') {
      throw new ValidationError(`Không thể tạo item con bên trong một Template: '${parent.displayName || parent.name}'.`);
    }

    // Explicit constraint: only Folder and Sample Component allowed under Feature/Components and Project/Pages
    const parentLowerPath = (parent.path || '').toLowerCase().trim();
    const featPath = branding.PATHS.FEATURE_COMPONENTS.toLowerCase();
    const projPath = branding.PATHS.PROJECT_PAGES.toLowerCase();
    const isComponentOrPageBranch =
      parentLowerPath === featPath ||
      parentLowerPath.startsWith(featPath + '/') ||
      parentLowerPath === projPath ||
      parentLowerPath.startsWith(projPath + '/') ||
      parentLowerPath === '/root/templates/feature/components' ||
      parentLowerPath.startsWith('/root/templates/feature/components/') ||
      parentLowerPath === '/root/templates/project/pages' ||
      parentLowerPath.startsWith('/root/templates/project/pages/');

    if (isComponentOrPageBranch) {
      if (!['Template Folder', 'Standard Template', 'Sample Component'].includes(template.name)) {
        throw new ValidationError(`Chỉ cho phép tạo 'Folder' hoặc 'Standard Template' dưới ${parent.path}. Template '${template.name}' không được phép.`);
      }
    }

    // Verify insert options if defined on parent template
    const allowedInsertOptions = await templateService.getInsertOptions(parent._id);
    if (allowedInsertOptions && allowedInsertOptions.length > 0) {
      const isAllowed = allowedInsertOptions.some(
        (opt) => opt._id.toString() === templateId.toString()
      );
      if (!isAllowed) {
        throw new ValidationError(`Template '${template.name}' is not an allowed insert option under '${parent.name}'.`);
      }
    }

    // Explicit constraint: only templates in Project/Pages and Common are allowed under /root/content or /root/content
    const contentPath = branding.PATHS.CONTENT.toLowerCase();
    const isContentBranch = parent.path && (
      parent.path.toLowerCase() === contentPath ||
      parent.path.toLowerCase().startsWith(contentPath + '/') ||
      parent.path.toLowerCase() === '/root/content' ||
      parent.path.toLowerCase().startsWith('/root/content/')
    );
    if (isContentBranch) {
      const tplPath = (template.path || '').toLowerCase();
      let itemTreePath = '';
      const tplItem = await Item.findOne({ _id: template._id, deleted: false }).lean();
      if (tplItem && tplItem.path) {
        itemTreePath = tplItem.path.toLowerCase();
      }

      const isFeatureTpl = tplPath.includes('/templates/feature/components') || itemTreePath.includes('/templates/feature/components');
      const isSystemTpl = (tplPath.includes('/templates/system') || itemTreePath.includes('/templates/system')) &&
                          !itemTreePath.includes('/templates/common') &&
                          !tplPath.includes('/templates/common');

      const hasPathMetadata = !!(tplPath || itemTreePath);
      const isAllowedBranch = !hasPathMetadata ||
        tplPath.includes('/templates/project/pages') ||
        tplPath.includes('/templates/common') ||
        itemTreePath.includes('/templates/project/pages') ||
        itemTreePath.includes('/templates/common') ||
        template.name === 'Folder';

      if (isFeatureTpl || isSystemTpl || (template.isSystem && template.name !== 'Folder') || !isAllowedBranch) {
        throw new ValidationError(`Template '${template.name}' is not allowed under /content. Only templates in Project/Pages and Common can be used.`);
      }
    }

    let finalRawName = rawName;
    let finalDisplayName = displayName;
    if ((template.name === 'Standard Template' || template.name === 'Sample Component') && (!finalRawName || !finalRawName.trim())) {
      const baseDefaultName = parentLowerPath.includes('/templates/feature/components')
        ? 'New Component'
        : 'New Page Template';

      let candidate = baseDefaultName;
      let counter = 1;
      while (await Item.findOne({ parentId: parent._id, name: this.cleanItemName(candidate), deleted: false })) {
        candidate = `${baseDefaultName} ${counter}`;
        counter++;
      }
      finalRawName = candidate;
      finalDisplayName = candidate;
    }

    const name = this.cleanItemName(finalRawName);
    const itemDisplayName = (finalDisplayName && finalDisplayName.trim()) || finalRawName.trim();

    // Sibling uniqueness check
    const existingSibling = await Item.findOne({
      parentId: parent._id,
      name,
      deleted: false,
    });
    if (existingSibling) {
      throw new ValidationError(`An item named '${name}' already exists under '${parent.displayName || parent.name}'.`);
    }

    // Calculate path and ancestors
    const newPath = `${parent.path === '/' ? '' : parent.path}/${name}`;
    const ancestors = [...(parent.ancestors || []), parent._id];

    // Compute sortOrder (place at the end)
    const lastSibling = await Item.findOne({ parentId: parent._id, deleted: false })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const sortOrder = lastSibling && lastSibling.sortOrder ? lastSibling.sortOrder + 100 : 100;

    // Initialize default fields from template definitions
    const fields = {};
    const sharedFields = {};
    const versionedFields = {};

    if (template.sections) {
      for (const sec of template.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            const defaultVal = f.defaultValue !== undefined ? f.defaultValue : '';
            fields[f.name] = defaultVal;
            if (f.shared) {
              sharedFields[f._id.toString()] = defaultVal;
            } else {
              versionedFields[f._id.toString()] = defaultVal;
            }
          }
        }
      }
    }

    // For items created from Standard Template (or Sample Component), templateId on Item refers to Template meta-definition
    let actualTemplateId = template._id;
    if (template.name === 'Standard Template' || template.name === 'Sample Component') {
      const templateDefTpl = await Template.findOne({ name: 'Template' }).lean();
      if (templateDefTpl) actualTemplateId = templateDefTpl._id;
    }

    const defLang = await languageService.getDefault();
    const initialLangCode = defLang.code;

    const newItem = await Item.create({
      name,
      displayName: itemDisplayName,
      templateId: actualTemplateId,
      parentId: parent._id,
      ancestors,
      path: newPath,
      sortOrder,
      fields,
      sharedFields,
      languages: [
        {
          code: initialLangCode,
          unversionedFields: {},
          versions: [
            {
              version: 1,
              fields: versionedFields,
              createdBy: userId,
              updatedBy: userId,
              note: 'Initial version',
            },
          ],
        },
      ],
      presentation: {
        shared: { layoutId: null, renderings: [] },
        final: [],
      },
      createdBy: userId,
      updatedBy: userId,
    });

    // If creating a Template item (via Template definition, Standard Template, or Sample Component), create corresponding Template document
    if (template.name === 'Template' || template.name === 'Standard Template' || template.name === 'Sample Component') {
      const existingTpl = await Template.findById(newItem._id);
      if (!existingTpl) {
        const tplName = templateService.cleanName(finalRawName);
        await Template.create({
          _id: newItem._id,
          name: tplName,
          displayName: newItem.displayName || tplName,
          icon: newItem.icon || 'ti ti-template',
          path: `${parent.path}/${tplName}`,
          isSystem: false,
          baseTemplates: [],
          sections: [],
          standardValues: {},
          insertOptions: [],
        });
      }
    }

    // Apply Standard Values from effective template (including component templates)
    try {
      const effTpl = await templateService.resolveEffectiveTemplate(newItem, initialLangCode, 1);
      if (effTpl && effTpl.standardValues && Object.keys(effTpl.standardValues).length > 0) {
        let modified = false;
        const allFields = effTpl.sections?.flatMap((s) => s.fields) || [];
        const fieldMetaMap = new Map(allFields.map((f) => [f._id.toString(), f]));

        for (const [fId, val] of Object.entries(effTpl.standardValues)) {
          if (val !== undefined && val !== '') {
            const fDef = fieldMetaMap.get(fId);
            if (fDef?.shared) {
              newItem.sharedFields.set(fId, val);
              modified = true;
            } else {
              const v1 = newItem.languages?.[0]?.versions?.[0];
              if (v1 && v1.fields) {
                v1.fields.set(fId, val);
                modified = true;
              }
            }
          }
        }
        if (modified) {
          await newItem.save();
        }
      }
    } catch {
      // Fallback silently if effective resolution fails during creation
    }

    return this.getById(newItem._id);
  },

  /**
   * Update item fields with Optimistic Locking and field validation (supports versioning)
   */
  async updateFields(id, rawFields = {}, expectedUpdatedAt = null, userId = null, langCode = null, versionNumber = null, { user = null } = {}) {
    if (langCode && versionNumber) {
      return versionService.updateFields(id, langCode, versionNumber, rawFields, expectedUpdatedAt, { userId, user });
    }

    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item) {
      throw new ValidationError('Item not found or has been deleted.');
    }

    // 1. Optimistic Locking check
    if (expectedUpdatedAt) {
      const currentIso = item.updatedAt ? new Date(item.updatedAt).toISOString() : null;
      const expectedIso = new Date(expectedUpdatedAt).toISOString();
      if (currentIso && currentIso !== expectedIso) {
        throw new ConflictError(
          'Conflict: This item was modified by another user or session. Please refresh the page before saving.'
        );
      }
    }

    // 2. Fetch resolved effective template schema (including presentation component fields) to validate and sanitize values
    const targetLang = langCode || 'vi';
    const targetVersion = versionNumber || 1;
    const resolvedTemplate = (await templateService.resolveEffectiveTemplate(item, targetLang, targetVersion)) || (await templateService.resolveTemplate(item.templateId));
    if (!resolvedTemplate) {
      throw new ValidationError('Template definition for this item is missing.');
    }

    const fieldDefinitions = new Map();
    if (resolvedTemplate.sections) {
      for (const sec of resolvedTemplate.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            fieldDefinitions.set(f._id.toString(), f);
            fieldDefinitions.set(f.name, f);
            fieldDefinitions.set(f.name.toLowerCase(), f);
          }
        }
      }
    }

    // Special validation for Layout and Rendering items: viewPath must be valid
    const isLayoutItem = item.path?.toLowerCase().startsWith(branding.PATHS.LAYOUTS.toLowerCase()) ||
                         item.path?.toLowerCase().startsWith('/root/layout/layouts') ||
                         resolvedTemplate.name === 'Layout';
    const isRenderingItem = item.path?.toLowerCase().startsWith(branding.PATHS.RENDERINGS.toLowerCase()) ||
                            item.path?.toLowerCase().startsWith('/root/layout/renderings') ||
                            resolvedTemplate.name === 'Rendering';

    if (isLayoutItem || isRenderingItem) {
      let viewPathVal = rawFields['viewPath'];
      if (viewPathVal === undefined) {
        for (const [key, val] of Object.entries(rawFields)) {
          const def = fieldDefinitions.get(key);
          if (def && def.name === 'viewPath') {
            viewPathVal = val;
            break;
          }
        }
      }
      if (viewPathVal !== undefined && viewPathVal !== '') {
        const presentationService = require('./presentationService');
        presentationService.validateViewPath(viewPathVal);
      }
    }

    // Special validation for Rendering items: componentTemplate is required and must be valid
    if (isRenderingItem) {
      let compTplVal = rawFields['componentTemplate'];
      if (!compTplVal) {
        for (const [key, val] of Object.entries(rawFields)) {
          const def = fieldDefinitions.get(key);
          if (def && def.name === 'componentTemplate') {
            compTplVal = val;
            break;
          }
        }
      }
      if (compTplVal !== undefined) {
        await templateService.validateComponentTemplateReference(compTplVal);
      }
    }

    const updatedFields = item.fields instanceof Map
      ? Object.fromEntries(item.fields)
      : (item.fields ? { ...item.fields } : {});
    const validationErrors = {};

    for (const [key, rawValue] of Object.entries(rawFields)) {
      const fieldDef = fieldDefinitions.get(key);
      if (fieldDef) {
        const handler = getFieldHandler(fieldDef.type);
        const error = handler.validate(rawValue, fieldDef);
        if (error) {
          validationErrors[fieldDef.name] = error;
        } else {
          const sanitizedVal = handler.sanitize(rawValue);
          // Store by immutable fieldId (Option 1)
          updatedFields[fieldDef._id.toString()] = sanitizedVal;
          // Clean legacy fieldName key if present to complete migration
          if (updatedFields[fieldDef.name] !== undefined && fieldDef.name !== fieldDef._id.toString()) {
            delete updatedFields[fieldDef.name];
          }
        }
      } else {
        // Unknown or custom field, preserve as string
        updatedFields[key] = rawValue;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Form validation failed.', validationErrors);
    }

    item.fields = updatedFields;
    item.updatedBy = userId;
    await item.save();

    return this.getById(item._id);
  },

  /**
   * Rename an item and update materialized path of entire subtree
   */
  async rename(id, newRawName, newDisplayName = '', userId = null) {
    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item) {
      throw new ValidationError('Item not found.');
    }

    if (!item.parentId || isProtectedSystemPath(item.path)) {
      throw new ValidationError(`Không thể đổi tên node hệ thống: '${item.displayName || item.name}' (${item.path}).`);
    }
    const tplDoc = await Template.findById(item._id).lean();
    if (tplDoc && tplDoc.isSystem) {
      throw new ValidationError(`Không thể đổi tên template hệ thống: '${item.displayName || item.name}'.`);
    }

    const newName = this.cleanItemName(newRawName);
    const parent = await Item.findById(item.parentId);
    if (!parent) {
      throw new ValidationError('Parent item not found.');
    }

    // Check sibling collision if name actually changed
    if (newName !== item.name) {
      const collision = await Item.findOne({
        parentId: parent._id,
        name: newName,
        _id: { $ne: item._id },
        deleted: false,
      });
      if (collision) {
        throw new ValidationError(`An item named '${newName}' already exists under '${parent.name}'.`);
      }
    }

    const oldPath = item.path;
    const newPath = `${parent.path === '/' ? '' : parent.path}/${newName}`;

    item.name = newName;
    if (newDisplayName && newDisplayName.trim()) {
      item.displayName = newDisplayName.trim();
    }
    item.path = newPath;
    item.updatedBy = userId;
    await item.save();

    // If path changed, update all descendants
    if (oldPath !== newPath) {
      const descendants = await Item.find({
        ancestors: item._id,
        deleted: false,
      });

      for (const desc of descendants) {
        if (desc.path.startsWith(oldPath)) {
          desc.path = newPath + desc.path.slice(oldPath.length);
          await desc.save();
        }
      }
    }

    return this.getById(item._id);
  },

  /**
   * Duplicate an item (and optionally all its subitems)
   */
  async duplicate(id, targetParentId = null, userId = null, withSubitems = true) {
    const sourceItem = await Item.findOne({ _id: id, deleted: false }).lean();
    if (!sourceItem) {
      throw new ValidationError('Source item not found.');
    }

    const parentId = targetParentId || sourceItem.parentId;
    if (!parentId) {
      throw new ValidationError('Cannot duplicate the root item without a target parent.');
    }

    const parent = await Item.findOne({ _id: parentId, deleted: false });
    if (!parent) {
      throw new ValidationError('Target parent not found.');
    }

    // Generate unique name: "Copy of {name}", "Copy (2) of {name}", etc.
    let baseName = sourceItem.name.replace(/^copy(-\d+)?-of-/, '');
    let candidateName = `copy-of-${baseName}`;
    let counter = 2;

    while (
      await Item.findOne({
        parentId: parent._id,
        name: candidateName,
        deleted: false,
      })
    ) {
      candidateName = `copy-${counter}-of-${baseName}`;
      counter++;
    }

    const candidateDisplayName = `Copy of ${sourceItem.displayName || sourceItem.name}`;
    const newPath = `${parent.path === '/' ? '' : parent.path}/${candidateName}`;
    const ancestors = [...(parent.ancestors || []), parent._id];

    // Clone fields, sharedFields, languages, and presentation
    const clonedFields = sourceItem.fields instanceof Map
      ? Object.fromEntries(sourceItem.fields)
      : { ...sourceItem.fields };

    const clonedSharedFields = sourceItem.sharedFields instanceof Map
      ? Object.fromEntries(sourceItem.sharedFields)
      : { ...(sourceItem.sharedFields || {}) };

    const clonedLanguages = sourceItem.languages ? JSON.parse(JSON.stringify(sourceItem.languages)) : [];
    const clonedPresentation = sourceItem.presentation ? JSON.parse(JSON.stringify(sourceItem.presentation)) : { shared: { devices: [] }, final: [] };

    const newItem = await Item.create({
      name: candidateName,
      displayName: candidateDisplayName,
      templateId: sourceItem.templateId,
      parentId: parent._id,
      ancestors,
      path: newPath,
      sortOrder: (sourceItem.sortOrder || 100) + 10,
      fields: clonedFields,
      sharedFields: clonedSharedFields,
      languages: clonedLanguages,
      presentation: clonedPresentation,
      createdFrom: sourceItem._id,
      createdBy: userId,
      updatedBy: userId,
    });

    // Recursively duplicate descendants if requested
    if (withSubitems) {
      const directChildren = await Item.find({
        parentId: sourceItem._id,
        deleted: false,
      }).lean();

      for (const child of directChildren) {
        await this._recursiveDuplicate(child, newItem._id, newPath, ancestors, userId);
      }
    }

    return this.getById(newItem._id);
  },

  async _recursiveDuplicate(child, newParentId, newParentPath, parentAncestors, userId) {
    const childPath = `${newParentPath}/${child.name}`;
    const childAncestors = [...parentAncestors, newParentId];
    const clonedFields = child.fields instanceof Map
      ? Object.fromEntries(child.fields)
      : { ...child.fields };
    const clonedSharedFields = child.sharedFields instanceof Map
      ? Object.fromEntries(child.sharedFields)
      : { ...(child.sharedFields || {}) };
    const clonedLanguages = child.languages ? JSON.parse(JSON.stringify(child.languages)) : [];
    const clonedPresentation = child.presentation ? JSON.parse(JSON.stringify(child.presentation)) : { shared: { devices: [] }, final: [] };

    const newChild = await Item.create({
      name: child.name,
      displayName: child.displayName,
      templateId: child.templateId,
      parentId: newParentId,
      ancestors: childAncestors,
      path: childPath,
      sortOrder: child.sortOrder,
      fields: clonedFields,
      sharedFields: clonedSharedFields,
      languages: clonedLanguages,
      presentation: clonedPresentation,
      createdFrom: child._id,
      createdBy: userId,
      updatedBy: userId,
    });

    const subChildren = await Item.find({ parentId: child._id, deleted: false }).lean();
    for (const sub of subChildren) {
      await this._recursiveDuplicate(sub, newChild._id, childPath, childAncestors, userId);
    }
  },

  /**
   * Copy an item into another parent
   */
  async copyTo(id, targetParentId, userId = null) {
    return this.duplicate(id, targetParentId, userId, true);
  },

  /**
   * Move an item to a new parent with cycle detection
   */
  async moveTo(id, targetParentId, userId = null) {
    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item) {
      throw new ValidationError('Item not found.');
    }

    if (!item.parentId || isProtectedSystemPath(item.path)) {
      throw new ValidationError(`Không thể di chuyển node hệ thống: '${item.displayName || item.name}' (${item.path}).`);
    }
    const tplDoc = await Template.findById(item._id).lean();
    if (tplDoc && tplDoc.isSystem) {
      throw new ValidationError(`Không thể di chuyển template hệ thống: '${item.displayName || item.name}'.`);
    }

    if (item._id.toString() === targetParentId.toString()) {
      throw new ValidationError('Cannot move an item into itself.');
    }

    const targetParent = await Item.findOne({ _id: targetParentId, deleted: false });
    if (!targetParent) {
      throw new ValidationError('Target parent not found.');
    }

    // CYCLE DETECTION: target parent cannot have item in its ancestors!
    const targetAncestors = (targetParent.ancestors || []).map((a) => a.toString());
    if (targetAncestors.includes(item._id.toString())) {
      throw new ValidationError('Cannot move an item into one of its own descendants.');
    }

    // Check sibling collision in target parent
    const collision = await Item.findOne({
      parentId: targetParent._id,
      name: item.name,
      _id: { $ne: item._id },
      deleted: false,
    });
    if (collision) {
      throw new ValidationError(
        `An item named '${item.name}' already exists in '${targetParent.displayName || targetParent.name}'.`
      );
    }

    const oldPath = item.path;
    const newPath = `${targetParent.path === '/' ? '' : targetParent.path}/${item.name}`;
    const newAncestors = [...(targetParent.ancestors || []), targetParent._id];

    item.parentId = targetParent._id;
    item.ancestors = newAncestors;
    item.path = newPath;
    item.updatedBy = userId;
    await item.save();

    // Update path and ancestors for all descendants
    const descendants = await Item.find({
      ancestors: item._id,
      deleted: false,
    });

    for (const desc of descendants) {
      // 1. Update path
      if (desc.path.startsWith(oldPath)) {
        desc.path = newPath + desc.path.slice(oldPath.length);
      }
      // 2. Update ancestors: remove elements up to item._id, prepend newAncestors + item._id
      const itemIndexInDesc = desc.ancestors.findIndex(
        (a) => a.toString() === item._id.toString()
      );
      if (itemIndexInDesc !== -1) {
        const remainingAncestors = desc.ancestors.slice(itemIndexInDesc);
        desc.ancestors = [...newAncestors, ...remainingAncestors];
      }
      await desc.save();
      // Keep Template.path in sync if descendant is a template
      await Template.findByIdAndUpdate(desc._id, { path: desc.path });
    }

    // Keep moved item's Template.path in sync if it is a template
    await Template.findByIdAndUpdate(item._id, { path: item.path });

    return this.getById(item._id);
  },

  /**
   * Soft delete an item and all its descendants (GĐ 9 / DEC-044)
   * Enforces reference integrity via referenceService.findReferences
   */
  async delete(id, userId = null, options = {}) {
    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item) {
      throw new ValidationError('Item not found or already deleted.');
    }

    if (!item.parentId || isProtectedSystemPath(item.path)) {
      throw new ValidationError(`Không thể xoá node hệ thống: '${item.displayName || item.name}' (${item.path}).`);
    }
    const tplDoc = await Template.findById(item._id).lean();
    if (tplDoc && tplDoc.isSystem) {
      throw new ValidationError(`Không thể xoá template hệ thống: '${item.displayName || item.name}'.`);
    }

    // Reference integrity check (DEC-044)
    const referenceService = require('./referenceService');
    const refResult = await referenceService.findReferences(item, { includeDescendants: true });

    if (refResult.blockingCount > 0) {
      const messages = refResult.references
        .filter((r) => r.severity === 'BLOCK')
        .map((r) => r.description || r.message)
        .slice(0, 5);
      const extra = refResult.blockingCount > 5 ? ` (và ${refResult.blockingCount - 5} ràng buộc khác)` : '';
      const isTemplateItem = Boolean(tplDoc || item.path?.toLowerCase().includes('/template'));
      const itemTypeLabel = isTemplateItem ? 'template' : 'item';
      const conflictErr = new ConflictError(
        `Không thể xóa ${itemTypeLabel} '${item.displayName || item.name}': Đang có ${refResult.blockingCount} ràng buộc chặn xoá:\n- ${messages.join('\n- ')}${extra}`
      );
      conflictErr.references = refResult.references;
      throw conflictErr;
    }

    if (refResult.warningCount > 0 && !options.confirmWarnings && !options.force) {
      const messages = refResult.references
        .filter((r) => r.severity === 'WARN')
        .map((r) => r.description || r.message)
        .slice(0, 5);
      const extra = refResult.warningCount > 5 ? ` (và ${refResult.warningCount - 5} cảnh báo khác)` : '';
      const warnErr = new ValidationError(
        `Cảnh báo khi xoá '${item.displayName || item.name}': Có ${refResult.warningCount} đối tượng bị ảnh hưởng:\n- ${messages.join('\n- ')}${extra}`,
        { requiresConfirmation: true, references: refResult.references }
      );
      warnErr.requiresConfirmation = true;
      warnErr.references = refResult.references;
      throw warnErr;
    }

    const deletionBatchId = new mongoose.Types.ObjectId().toString();
    const deletedAt = new Date();

    // 1. Soft delete root item
    item.deleted = true;
    item.isDeleted = true;
    item.deletedAt = deletedAt;
    item.deletedBy = userId;
    item.deletedFromPath = item.path;
    item.deletedFromParentId = item.parentId;
    item.deletionBatchId = deletionBatchId;
    item.updatedBy = userId;
    await item.save();

    // 2. Soft delete all descendants
    const descendants = await Item.find({ ancestors: item._id, deleted: false });
    for (const desc of descendants) {
      desc.deleted = true;
      desc.isDeleted = true;
      desc.deletedAt = deletedAt;
      desc.deletedBy = userId;
      desc.deletedFromPath = desc.path;
      desc.deletedFromParentId = desc.parentId;
      desc.deletionBatchId = deletionBatchId;
      desc.updatedBy = userId;
      await desc.save();
    }

    // Invalidate template cache if a template or folder was deleted
    const templateDoc = await Template.findById(item._id);
    if (templateDoc) {
      templateService.invalidateCache();
    }

    const eventBus = require('../utils/eventBus');
    eventBus.emit('item.deleted', {
      item,
      userId,
      deletionBatchId,
      deletedCount: 1 + descendants.length,
      deletedAt,
    });

    return {
      success: true,
      deletedId: item._id,
      deletionBatchId,
      deletedCount: 1 + descendants.length,
    };
  },

  /**
   * Restore a soft-deleted item from Recycle Bin (GĐ 9 / DEC-044)
   */
  async restoreItem(id, userId = null, options = {}) {
    const item = await Item.findOne({ _id: id, $or: [{ deleted: true }, { isDeleted: true }] });
    if (!item) {
      throw new ValidationError('Item không tồn tại trong Thùng rác hoặc đã được khôi phục.');
    }

    // 1. Determine target parent
    let targetParent = null;
    if (options.targetParentId) {
      targetParent = await Item.findOne({ _id: options.targetParentId, deleted: false });
      if (!targetParent) {
        throw new ValidationError('Thư mục / Node cha đích không tồn tại hoặc đã bị xoá.');
      }
    } else {
      const originalParentId = item.deletedFromParentId || item.parentId;
      if (originalParentId) {
        targetParent = await Item.findOne({ _id: originalParentId, deleted: false });
      }
      if (!targetParent) {
        throw new ValidationError(
          `Node cha gốc của '${item.displayName || item.name}' không còn tồn tại hoặc đang nằm trong Thùng rác. Vui lòng chọn vị trí cha đích (targetParentId) để khôi phục.`
        );
      }
    }

    // 2. Handle name collision
    let restoredName = item.name;
    const existingSibling = await Item.findOne({
      parentId: targetParent._id,
      name: restoredName,
      deleted: false,
    });
    if (existingSibling) {
      if (options.renameIfDuplicate !== false) {
        let counter = 1;
        let candidateName = `${item.name} (Restored)`;
        while (await Item.findOne({ parentId: targetParent._id, name: candidateName, deleted: false })) {
          counter++;
          candidateName = `${item.name} (Restored ${counter})`;
        }
        restoredName = candidateName;
      } else {
        throw new ConflictError(`Một item cùng tên '${restoredName}' đã tồn tại dưới '${targetParent.path}'.`);
      }
    }

    // 3. Compute new path & ancestors
    const newPath = targetParent.path === branding.ROOT_PATH ? `${branding.ROOT_PATH}/${restoredName}` : `${targetParent.path}/${restoredName}`;
    const newAncestors = [...(targetParent.ancestors || []), targetParent._id];

    const oldPath = item.path;
    item.name = restoredName;
    item.path = newPath;
    item.parentId = targetParent._id;
    item.ancestors = newAncestors;
    item.deleted = false;
    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = null;
    item.deletedFromPath = null;
    item.deletedFromParentId = null;
    item.deletionBatchId = null;
    item.updatedBy = userId;
    await item.save();

    // 4. Restore descendants if part of the same batch or subtree
    const descendants = await Item.find({
      $and: [
        {
          $or: [
            { ancestors: item._id },
            ...(item.deletionBatchId ? [{ deletionBatchId: item.deletionBatchId, _id: { $ne: item._id } }] : []),
          ],
        },
        { $or: [{ deleted: true }, { isDeleted: true }] },
      ],
    });

    let restoredCount = 1;
    for (const desc of descendants) {
      desc.deleted = false;
      desc.isDeleted = false;
      desc.deletedAt = null;
      desc.deletedBy = null;
      desc.deletedFromPath = null;
      desc.deletedFromParentId = null;
      desc.deletionBatchId = null;
      desc.updatedBy = userId;

      // Recalculate descendant path
      if (desc.path && desc.path.startsWith(oldPath)) {
        desc.path = newPath + desc.path.substring(oldPath.length);
      }
      // Recompute ancestors
      const parentInBatch = await Item.findById(desc.parentId).lean();
      if (parentInBatch) {
        desc.ancestors = [...(parentInBatch.ancestors || []), parentInBatch._id];
      }
      await desc.save();
      restoredCount++;
    }

    // Invalidate template cache if a template or folder was restored
    const templateDoc = await Template.findById(item._id);
    if (templateDoc) {
      templateService.invalidateCache();
    }

    const eventBus = require('../utils/eventBus');
    eventBus.emit('item.restored', {
      item,
      userId,
      restoredCount,
      targetParentId: targetParent._id,
      restoredAt: new Date(),
    });

    return {
      success: true,
      restoredItem: item,
      restoredCount,
    };
  },

  /**
   * Sort siblings (up, down, first, last)
   */
  async sort(id, direction) {
    const item = await Item.findOne({ _id: id, deleted: false });
    if (!item || !item.parentId) {
      throw new ValidationError('Item cannot be sorted.');
    }

    const siblings = await Item.find({
      parentId: item.parentId,
      deleted: false,
    }).sort({ sortOrder: 1, createdAt: 1 });

    const currentIndex = siblings.findIndex((s) => s._id.toString() === item._id.toString());
    if (currentIndex === -1) {
      throw new ValidationError('Item sibling not found.');
    }

    let targetIndex = currentIndex;
    if (direction === 'up') {
      if (currentIndex === 0) return this.getById(item._id); // already at top
      targetIndex = currentIndex - 1;
    } else if (direction === 'down') {
      if (currentIndex === siblings.length - 1) return this.getById(item._id); // already at bottom
      targetIndex = currentIndex + 1;
    } else if (direction === 'first') {
      if (currentIndex === 0) return this.getById(item._id);
      targetIndex = 0;
    } else if (direction === 'last') {
      if (currentIndex === siblings.length - 1) return this.getById(item._id);
      targetIndex = siblings.length - 1;
    } else {
      throw new ValidationError(`Invalid sort direction: ${direction}`);
    }

    // Rearrange array and reassign spaced sortOrders (100, 200, 300...)
    const [movedItem] = siblings.splice(currentIndex, 1);
    siblings.splice(targetIndex, 0, movedItem);

    for (let i = 0; i < siblings.length; i++) {
      siblings[i].sortOrder = (i + 1) * 100;
      await siblings[i].save();
    }

    return this.getById(item._id);
  },

  /**
   * Search items in the content tree by keyword
   */
  async search(query, limit = 20, db = 'master') {
    if (!query || !query.trim()) return [];
    const cleanDb = this.validateDb(db);
    const Repo = this.getItemRepository(cleanDb);

    const q = query.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const items = await Repo.find({
      isDeleted: { $ne: true },
      deleted: { $ne: true },
      $or: [{ name: regex }, { displayName: regex }],
    })
      .select('name displayName path templateId icon sortOrder')
      .populate('templateId', 'name displayName icon')
      .limit(limit)
      .lean();

    return items.map((it) => {
      const iconKey = resolveItemIcon(it, it.templateId);
      return {
        ...it,
        icon: iconKey,
        iconKey,
        iconUrl: getIconUrl(iconKey),
      };
    });
  },

  /**
   * Get Publish Status for a single item (UNPUBLISHED, PUBLISHED, CHANGED)
   */
  async getPublishStatus(itemOrId, langCode = null, _versionNumber = 1) {
    if (!itemOrId) return 'UNPUBLISHED';
    const id = itemOrId._id || itemOrId;
    const masterItem = itemOrId.name ? itemOrId : await Item.findById(id).lean();
    if (!masterItem || masterItem.isDeleted || masterItem.deleted) return 'UNPUBLISHED';

    const webItem = await PublishedItem.findById(id).lean();
    if (!webItem || webItem.isDeleted) return 'UNPUBLISHED';

    const defLang = await languageService.getDefault();
    const code = (langCode || defLang.code).toLowerCase().trim();
    const webLang = (webItem.languages || []).find((l) => l.code === code);
    if (!webLang) return 'UNPUBLISHED';

    // Check version difference
    const masterLang = (masterItem.languages || []).find((l) => l.code === code);
    const masterVersions = masterLang?.versions || [];
    const latestMasterVersion = masterVersions.length > 0
      ? Math.max(...masterVersions.map((v) => v.version))
      : 1;

    if (latestMasterVersion > webLang.publishedVersion) {
      return 'CHANGED';
    }

    if (new Date(masterItem.updatedAt).getTime() > new Date(webItem.updatedAt).getTime() + 1000) {
      return 'CHANGED';
    }

    return 'PUBLISHED';
  },

  /**
   * Get Publish Status Batch for multiple items (optimized with $in)
   */
  async getPublishStatusBatch(ids, langCode = null) {
    if (!Array.isArray(ids) || ids.length === 0) return {};
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return {};

    const [masterItems, webItems] = await Promise.all([
      Item.find({ _id: { $in: validIds } }).select('_id updatedAt languages isDeleted deleted').lean(),
      PublishedItem.find({ _id: { $in: validIds } }).select('_id updatedAt sourceVersion languages isDeleted').lean(),
    ]);

    const defLang = await languageService.getDefault();
    const code = (langCode || defLang.code).toLowerCase().trim();
    const webMap = new Map(webItems.map((w) => [w._id.toString(), w]));
    const statusMap = {};

    for (const m of masterItems) {
      const idStr = m._id.toString();
      const w = webMap.get(idStr);
      if (!w || w.isDeleted) {
        statusMap[idStr] = 'UNPUBLISHED';
        continue;
      }

      const webLang = (w.languages || []).find((l) => l.code === code);
      if (!webLang) {
        statusMap[idStr] = 'UNPUBLISHED';
        continue;
      }

      const masterLang = (m.languages || []).find((l) => l.code === code);
      const masterVersions = masterLang?.versions || [];
      const latestMasterVersion = masterVersions.length > 0
        ? Math.max(...masterVersions.map((v) => v.version))
        : 1;

      if (latestMasterVersion > webLang.publishedVersion) {
        statusMap[idStr] = 'CHANGED';
      } else if (new Date(m.updatedAt).getTime() > new Date(w.updatedAt).getTime() + 1000) {
        statusMap[idStr] = 'CHANGED';
      } else {
        statusMap[idStr] = 'PUBLISHED';
      }
    }

    return statusMap;
  },
};

module.exports = itemService;
