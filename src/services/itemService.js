const mongoose = require('mongoose');
const Item = require('../models/Item');
const Template = require('../models/Template');
const { getFieldHandler } = require('../fields');
const templateService = require('./templateService');

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

const itemService = {
  ConflictError,
  ValidationError,

  /**
   * Permission check placeholder (will be fully integrated with ACL in GĐ 6)
   */
  canPerform(user, _item, _action) {
    if (!user) return false;
    // By default in GĐ 2, any authenticated user can view and edit items
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
   * Get an item with resolved inherited template and calculated field values (handling dynamic standard values)
   */
  async getItemWithRenderSchema(id) {
    const item = await this.getById(id);
    if (!item) return null;

    const resolvedTemplate = await templateService.resolveTemplate(item.templateId._id || item.templateId);
    const standardValues = await templateService.resolveStandardValues(item.templateId._id || item.templateId);

    const rawFields = item.fields instanceof Map
      ? Object.fromEntries(item.fields)
      : (item.fields || {});

    // Augment resolved fields with current effective values and standard value flags
    if (resolvedTemplate && resolvedTemplate.sections) {
      for (const sec of resolvedTemplate.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            const fieldId = f._id.toString();
            const fieldName = f.name;

            // Check if explicitly overridden on item
            const hasExplicitValue = rawFields[fieldId] !== undefined || rawFields[fieldName] !== undefined;

            let effectiveValue = '';
            let isUsingStandardValue = false;

            if (hasExplicitValue) {
              effectiveValue = rawFields[fieldId] !== undefined ? rawFields[fieldId] : rawFields[fieldName];
            } else {
              // Dynamic Standard Value inheritance: read from template chain
              if (standardValues[fieldId] !== undefined) {
                effectiveValue = standardValues[fieldId];
                isUsingStandardValue = true;
              } else if (standardValues[fieldName] !== undefined) {
                effectiveValue = standardValues[fieldName];
                isUsingStandardValue = true;
              } else {
                effectiveValue = f.defaultValue !== undefined ? f.defaultValue : '';
              }
            }

            f.effectiveValue = effectiveValue;
            f.isUsingStandardValue = isUsingStandardValue;
            f.hasExplicitValue = hasExplicitValue;
          }
        }
      }
    }

    return {
      item,
      resolvedTemplate,
      standardValues,
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
    const resolvedTemplate = await templateService.resolveTemplate(item.templateId);
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
  async getByPath(path) {
    if (!path) return null;
    return Item.findOne({ path, deleted: false })
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

    const name = this.cleanItemName(rawName);
    const itemDisplayName = (displayName && displayName.trim()) || rawName.trim();

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
    if (template.sections) {
      for (const sec of template.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            fields[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
          }
        }
      }
    }

    const newItem = await Item.create({
      name,
      displayName: itemDisplayName,
      templateId: template._id,
      parentId: parent._id,
      ancestors,
      path: newPath,
      sortOrder,
      fields,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.getById(newItem._id);
  },

  /**
   * Update item fields with Optimistic Locking and field validation
   */
  async updateFields(id, rawFields = {}, expectedUpdatedAt = null, userId = null) {
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

    // 2. Fetch resolved template schema (including inherited fields) to validate and sanitize values
    const resolvedTemplate = await templateService.resolveTemplate(item.templateId);
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

    if (!item.parentId) {
      throw new ValidationError('Cannot rename the root item.');
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

    // Clone fields
    const clonedFields = sourceItem.fields instanceof Map
      ? Object.fromEntries(sourceItem.fields)
      : { ...sourceItem.fields };

    const newItem = await Item.create({
      name: candidateName,
      displayName: candidateDisplayName,
      templateId: sourceItem.templateId,
      parentId: parent._id,
      ancestors,
      path: newPath,
      sortOrder: (sourceItem.sortOrder || 100) + 10,
      fields: clonedFields,
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

    const newChild = await Item.create({
      name: child.name,
      displayName: child.displayName,
      templateId: child.templateId,
      parentId: newParentId,
      ancestors: childAncestors,
      path: childPath,
      sortOrder: child.sortOrder,
      fields: clonedFields,
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

    if (!item.parentId) {
      throw new ValidationError('Cannot move the root item.');
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
    }

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

    if (!item.parentId) {
      throw new ValidationError('Cannot delete the root item.');
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
