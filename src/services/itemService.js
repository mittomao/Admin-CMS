const mongoose = require('mongoose');
const Item = require('../models/Item');
const Template = require('../models/Template');
const User = require('../models/User');
const { getFieldHandler } = require('../fields');
const templateService = require('./templateService');
const versionService = require('./versionService');

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
  '/sitecore',
  '/sitecore/content',
  '/sitecore/media library',
  '/sitecore/system',
  '/sitecore/templates',
  '/sitecore/templates/system/sample component',
  '/sitecore/templates/system/standard template',
  '/sitecore/layout',
  '/sitecore/layout/layouts',
  '/sitecore/layout/placeholders',
  '/sitecore/layout/renderings',
  '/sitecore/layout/devices',
  '/sitecore/layout/placeholder settings',
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
   * Permission check placeholder (will be fully integrated with ACL in GĐ 7)
   */
  canPerform(user, item, action) {
    if (!user) return false;
    const userRoles = Array.isArray(user.roles)
      ? user.roles.map((r) => (r.name ? r.name : r.toString()))
      : [];

    const isAdmin = userRoles.includes('Administrator');
    const isDeveloper = userRoles.includes('Developer');
    const isEditor = userRoles.includes('Editor');
    const isAuthor = userRoles.includes('Author');

    if (isAdmin) return true;

    // Check actions on items under /sitecore/layout/
    const isLayoutTreeItem = item && item.path && item.path.toLowerCase().startsWith('/sitecore/layout');
    if (isLayoutTreeItem) {
      if (action === 'item:read' || action === 'presentation:read') {
        return true;
      }
      return isDeveloper;
    }

    if (action === 'presentation:write') {
      return isAdmin || isDeveloper;
    }

    if (action === 'presentation:read') {
      return true;
    }

    if (action === 'version:delete') {
      return isEditor; // Only admin or editor can delete versions
    }

    if (action === 'version:create' || action === 'version:restore') {
      return isAuthor || isEditor;
    }

    return true;
  },

  /**
   * Get the root item of the CMS tree (/sitecore)
   */
  async getRoot() {
    let root = await Item.findOne({ path: '/sitecore', deleted: false })
      .populate('templateId')
      .lean();

    if (!root) {
      // Fallback: look for item with parentId: null
      root = await Item.findOne({ parentId: null, deleted: false })
        .populate('templateId')
        .lean();
    }
    return root;
  },

  /**
   * Get an item by ID
   */
  async getById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const item = await Item.findOne({ _id: id, deleted: false })
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
   * Get an item with resolved inherited template and calculated field values (handling dynamic standard values and versioning)
   */
  async getItemWithRenderSchema(id, langCode = 'vi', versionNumber = 1) {
    const item = await this.getById(id);
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
    const quickInfo = await this.getQuickInfo(item);

    return {
      item,
      resolvedTemplate,
      standardValues,
      lang: (langCode || 'vi').toLowerCase().trim(),
      version: parseInt(versionNumber, 10) || 1,
      versionInfo: resolvedResult.versionInfo,
      languagesList,
      versionsList,
      hasLanguage: resolvedResult.hasLanguage,
      hasVersion: resolvedResult.hasVersion,
      componentTemplates,
      quickInfo,
    };
  },

  /**
   * Get Sitecore Quick Info metadata for an item (DEC-037 / GĐ 6.3)
   */
  async getQuickInfo(itemOrId) {
    if (!itemOrId) return null;

    let item = itemOrId;
    if (typeof itemOrId === 'string' || itemOrId instanceof mongoose.Types.ObjectId || !itemOrId.name || !itemOrId.path) {
      item = await Item.findById(itemOrId).lean();
    }
    if (!item) {
      // Check if it's a Template document (in case called with template ID)
      const tpl = await Template.findById(itemOrId).lean();
      if (tpl) {
        item = (await Item.findById(tpl._id).lean()) || {
          _id: tpl._id,
          name: tpl.name,
          displayName: tpl.displayName,
          path: tpl.path || `/sitecore/templates/${tpl.name}`,
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

    // Fetch related records in parallel to prevent N+1 queries
    const [templateDoc, sourceItem, ownerUser] = await Promise.all([
      templateIdToQuery
        ? Template.findById(templateIdToQuery).select('name displayName path').lean()
        : null,
      createdFromId
        ? Item.findById(createdFromId).select('name displayName path').lean()
        : null,
      createdById
        ? User.findById(createdById).select('username domain fullName').lean()
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
      template: {
        rawId: templateIdToQuery ? templateIdToQuery.toString() : null,
        id: templateIdStr ? `{${templateIdStr}}` : '',
        name: templateName,
        path: templatePath || '/sitecore/templates/System/Template',
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
        domain: (ownerUser && ownerUser.domain) || 'sitecore',
        displayText: ownerUser ? `${ownerUser.domain || 'sitecore'}\\${ownerUser.username}` : '[unknown]',
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
  async getByPath(rawPath) {
    if (!rawPath) return null;
    let targetPath = rawPath.trim();

    // Normalize path aliases for templates
    if (targetPath === '/template' || targetPath === '/templates' || targetPath === '/sitecore/template') {
      targetPath = '/sitecore/templates';
    } else if (targetPath.toLowerCase().startsWith('/template/')) {
      targetPath = '/sitecore/templates/' + targetPath.slice('/template/'.length);
    } else if (targetPath.toLowerCase().startsWith('/templates/')) {
      targetPath = '/sitecore/templates/' + targetPath.slice('/templates/'.length);
    } else if (targetPath.toLowerCase().startsWith('/sitecore/template/')) {
      targetPath = '/sitecore/templates/' + targetPath.slice('/sitecore/template/'.length);
    }

    return Item.findOne({ path: new RegExp(`^${targetPath}$`, 'i'), deleted: false })
      .populate('templateId')
      .lean();
  },

  /**
   * Get direct children of an item
   */
  async getChildren(parentId, _options = {}) {
    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) return [];
    const query = { parentId, deleted: false };

    const children = await Item.find(query)
      .populate('templateId')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (children.length === 0) return [];

    // Check which children have subitems of their own
    const childIds = children.map((c) => c._id);
    const subChildrenCounts = await Item.aggregate([
      { $match: { parentId: { $in: childIds }, deleted: false } },
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
  async getPathBreadcrumb(item) {
    if (!item) return [];
    const trailIds = [...(item.ancestors || []), item._id];
    const items = await Item.find({ _id: { $in: trailIds } })
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
    const isComponentOrPageBranch =
      parentLowerPath === '/sitecore/templates/feature/components' ||
      parentLowerPath.startsWith('/sitecore/templates/feature/components/') ||
      parentLowerPath === '/sitecore/templates/project/pages' ||
      parentLowerPath.startsWith('/sitecore/templates/project/pages/');

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

    // Explicit constraint: only templates in Project/Pages and Common are allowed under /sitecore/content
    const isContentBranch = parent.path && (
      parent.path.toLowerCase() === '/sitecore/content' ||
      parent.path.toLowerCase().startsWith('/sitecore/content/')
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
          code: 'vi',
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
      const effTpl = await templateService.resolveEffectiveTemplate(newItem, 'vi', 1);
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
  async updateFields(id, rawFields = {}, expectedUpdatedAt = null, userId = null, langCode = null, versionNumber = null) {
    if (langCode && versionNumber) {
      return versionService.updateFields(id, langCode, versionNumber, rawFields, expectedUpdatedAt, { userId });
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
    const isLayoutItem = item.path?.toLowerCase().startsWith('/sitecore/layout/layouts') || resolvedTemplate.name === 'Layout';
    const isRenderingItem = item.path?.toLowerCase().startsWith('/sitecore/layout/renderings') || resolvedTemplate.name === 'Rendering';

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
   * Soft delete an item and all its descendants
   */
  async delete(id, userId = null) {
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

    // Check usage if deleting a Layout, Rendering, or Folder containing them
    const presentationService = require('./presentationService');
    const itemsToCheck = await Item.find({
      $or: [{ _id: item._id }, { ancestors: item._id }],
      deleted: false,
    }).populate('templateId').lean();

    for (const target of itemsToCheck) {
      const tplName = target.templateId?.name;
      if (tplName === 'Layout' || tplName === 'Rendering') {
        const usage = await presentationService.getUsage(target._id);
        if (usage.inUse) {
          const tplNames = usage.templates.map((t) => t.displayName || t.name).join(', ');
          const itemPaths = usage.items.map((i) => i.path).join(', ');
          const details = [];
          if (tplNames) details.push(`Template: [${tplNames}]`);
          if (itemPaths) details.push(`Item: [${itemPaths}]`);

          throw new ValidationError(
            `Không thể xóa '${item.name}' vì component '${target.name}' đang được sử dụng trong ${usage.totalUsage} cấu hình Presentation (${details.join('; ')}).`
          );
        }
      }

      // Check usage if deleting a Template item
      const templateDoc = await Template.findById(target._id);
      if (templateDoc) {
        await templateService.delete(target._id);
      }
    }

    item.deleted = true;
    item.updatedBy = userId;
    await item.save();

    // Soft delete all descendants
    await Item.updateMany(
      { ancestors: item._id, deleted: false },
      { $set: { deleted: true, updatedBy: userId } }
    );

    return { success: true, deletedId: item._id };
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
  async search(query, limit = 20) {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    return Item.find({
      deleted: false,
      $or: [{ name: regex }, { displayName: regex }],
    })
      .select('name displayName path templateId sortOrder')
      .populate('templateId', 'name icon')
      .limit(limit)
      .lean();
  },
};

module.exports = itemService;
