const mongoose = require('mongoose');
const Template = require('../models/Template');
const Item = require('../models/Item');

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

// In-memory cache for resolved templates
const resolvedTemplateCache = new Map();

// Compatible field type transitions when items already have data
const COMPATIBLE_TYPE_TRANSITIONS = {
  'Single-Line Text': ['Multi-Line Text', 'Rich Text'],
  'Multi-Line Text': ['Single-Line Text', 'Rich Text'],
  'Rich Text': ['Multi-Line Text'],
  'Number': ['Single-Line Text'],
  'Date': ['Single-Line Text'],
  'Checkbox': ['Single-Line Text'],
  'Droplist': ['Single-Line Text'],
  'Image': ['Single-Line Text'],
};

const templateService = {
  ConflictError,
  ValidationError,

  /**
   * Clear in-memory resolved template cache
   */
  invalidateCache() {
    resolvedTemplateCache.clear();
  },

  /**
   * Permission check placeholder for Template resources
   */
  canPerform(user, _template, _action) {
    if (!user) return false;
    return true;
  },

  /**
   * Get template by ID without inheritance resolution
   */
  async getById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Template.findById(id)
      .populate('baseTemplates', 'name displayName icon')
      .populate('insertOptions', 'name displayName icon description')
      .lean();
  },

  /**
   * List all templates
   */
  async list() {
    return Template.find()
      .populate('baseTemplates', 'name displayName icon')
      .sort({ isSystem: -1, name: 1 })
      .lean();
  },

  /**
   * Clean technical name for template, section, or field
   */
  cleanName(name) {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Name is required.');
    }
    const cleaned = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
    if (!cleaned) {
      throw new ValidationError('Name must contain valid alphanumeric characters.');
    }
    return cleaned;
  },

  /**
   * Recursively resolve template inheritance hierarchy.
   * Merges sections and fields: Base templates (deepest first) -> current template.
   * Detects circular inheritance and depth limits.
   */
  async resolveTemplate(templateId, visited = new Set(), depth = 0) {
    if (!templateId) return null;
    const idStr = templateId.toString();

    if (depth > 10) {
      throw new ValidationError('Maximum template inheritance depth (10 levels) exceeded.');
    }

    if (visited.has(idStr)) {
      throw new ValidationError(`Circular inheritance detected in template hierarchy involving ID [${idStr}].`);
    }

    // Check cache
    if (depth === 0 && resolvedTemplateCache.has(idStr)) {
      return JSON.parse(JSON.stringify(resolvedTemplateCache.get(idStr)));
    }

    const template = await Template.findById(idStr).lean();
    if (!template) {
      throw new ValidationError(`Template [${idStr}] not found.`);
    }

    const currentVisited = new Set(visited);
    currentVisited.add(idStr);

    // 1. Recursively resolve all base templates
    const resolvedBaseTemplates = [];
    if (template.baseTemplates && template.baseTemplates.length > 0) {
      for (const baseId of template.baseTemplates) {
        const resolvedBase = await this.resolveTemplate(baseId, currentVisited, depth + 1);
        if (resolvedBase) {
          resolvedBaseTemplates.push(resolvedBase);
        }
      }
    }

    // 2. Merge sections and fields
    // Structure: Map of normalizedSectionName -> { id, name, sortOrder, fields: Map(fieldName -> fieldObj) }
    const sectionMap = new Map();

    const mergeSection = (sec, originTpl, isInherited) => {
      const secKey = sec.name.trim().toLowerCase();
      if (!sectionMap.has(secKey)) {
        sectionMap.set(secKey, {
          _id: sec._id ? sec._id.toString() : new mongoose.Types.ObjectId().toString(),
          name: sec.name.trim(),
          sortOrder: sec.sortOrder || 100,
          fields: new Map(),
          origin: {
            templateId: originTpl._id.toString(),
            templateName: originTpl.displayName || originTpl.name,
            isInherited,
          },
        });
      }

      const currentSection = sectionMap.get(secKey);
      if (!isInherited) {
        // Child template takes precedence for section name & sortOrder
        currentSection.name = sec.name.trim();
        if (sec.sortOrder !== undefined) currentSection.sortOrder = sec.sortOrder;
      }

      if (sec.fields) {
        for (const f of sec.fields) {
          const fieldKey = f.name.trim().toLowerCase();
          // Child field overrides base field if keys match
          currentSection.fields.set(fieldKey, {
            _id: f._id ? f._id.toString() : new mongoose.Types.ObjectId().toString(),
            name: f.name.trim(),
            title: f.title || f.name,
            type: f.type || 'Single-Line Text',
            required: Boolean(f.required),
            defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
            source: f.source || '',
            shared: Boolean(f.shared),
            unversioned: Boolean(f.unversioned),
            helpText: f.helpText || '',
            validation: f.validation || '',
            sortOrder: f.sortOrder || 100,
            origin: {
              templateId: originTpl._id.toString(),
              templateName: originTpl.displayName || originTpl.name,
              isInherited,
            },
          });
        }
      }
    };

    // Merge base templates first
    for (const baseTpl of resolvedBaseTemplates) {
      if (baseTpl.sections) {
        for (const sec of baseTpl.sections) {
          mergeSection(sec, baseTpl, true);
        }
      }
    }

    // Merge current template
    if (template.sections) {
      for (const sec of template.sections) {
        mergeSection(sec, template, false);
      }
    }

    // Convert sectionMap back to array with sorted fields
    const mergedSections = Array.from(sectionMap.values())
      .map((sec) => ({
        _id: sec._id,
        name: sec.name,
        sortOrder: sec.sortOrder,
        origin: sec.origin,
        fields: Array.from(sec.fields.values()).sort((a, b) => (a.sortOrder || 100) - (b.sortOrder || 100)),
      }))
      .sort((a, b) => (a.sortOrder || 100) - (b.sortOrder || 100));

    // 3. Resolve Standard Values across inheritance chain
    const resolvedStandardValues = {};
    for (const baseTpl of resolvedBaseTemplates) {
      if (baseTpl.standardValues) {
        Object.assign(resolvedStandardValues, baseTpl.standardValues);
      }
    }
    const currentStdValues = template.standardValues instanceof Map
      ? Object.fromEntries(template.standardValues)
      : (template.standardValues || {});
    Object.assign(resolvedStandardValues, currentStdValues);

    const result = {
      ...template,
      sections: mergedSections,
      standardValues: resolvedStandardValues,
      baseTemplates: resolvedBaseTemplates.map((b) => ({
        _id: b._id,
        name: b.name,
        displayName: b.displayName,
        icon: b.icon,
      })),
    };

    if (depth === 0) {
      resolvedTemplateCache.set(idStr, JSON.parse(JSON.stringify(result)));
    }

    return result;
  },

  /**
   * Resolve standard values for a template (merges base template values)
   */
  async resolveStandardValues(templateId) {
    const resolved = await this.resolveTemplate(templateId);
    return resolved ? resolved.standardValues : {};
  },

  /**
   * Get effective insert options for an item or template.
   * Inherits from base templates if current template has no insert options configured.
   */
  async getInsertOptions(itemIdOrTemplateId) {
    if (!itemIdOrTemplateId) return [];

    let templateId = itemIdOrTemplateId;
    let item = null;
    // Check if passed argument is an itemId
    if (mongoose.Types.ObjectId.isValid(itemIdOrTemplateId)) {
      item = await Item.findById(itemIdOrTemplateId).lean();
      if (item && item.templateId) {
        templateId = item.templateId;
      }
    }

    // Special insert options for specific system nodes by path
    if (item && item.path) {
      const p = item.path.toLowerCase().trim();
      if (p === '/sitecore/layout/devices') {
        return Template.find({ name: 'Device' }).select('name displayName icon description').lean();
      }
      if (p === '/sitecore/layout/placeholder settings') {
        return Template.find({ name: 'Placeholder Settings' }).select('name displayName icon description').lean();
      }
    }

    const resolved = await this.resolveTemplate(templateId);
    if (!resolved) {
      return Template.find().select('name displayName icon description').sort({ name: 1 }).lean();
    }

    // Leaf items under presentation cannot have children created manually
    if (['Layout', 'Rendering', 'Device', 'Placeholder Settings'].includes(resolved.name)) {
      return [];
    }

    // If current template defines insert options, use them
    if (resolved.insertOptions && resolved.insertOptions.length > 0) {
      return Template.find({ _id: { $in: resolved.insertOptions } })
        .select('name displayName icon description')
        .sort({ name: 1 })
        .lean();
    }

    // Default fallback: return all templates
    return Template.find().select('name displayName icon description').sort({ name: 1 }).lean();
  },

  /**
   * Check usage of a template: items using it + templates inheriting from it
   */
  async getUsage(templateId) {
    const id = templateId.toString();

    const itemsCount = await Item.countDocuments({ templateId: id, deleted: false });
    const sampleItems = await Item.find({ templateId: id, deleted: false })
      .select('name displayName path updatedAt')
      .limit(10)
      .lean();

    const inheritingTemplates = await Template.find({ baseTemplates: id })
      .select('name displayName icon')
      .lean();

    return {
      templateId: id,
      itemsCount,
      sampleItems,
      inheritingTemplates,
      canDelete: itemsCount === 0 && inheritingTemplates.length === 0,
    };
  },

  /**
   * Create a new template
   */
  async create(data, userId = null) {
    const name = this.cleanName(data.name);
    const existing = await Template.findOne({ name });
    if (existing) {
      throw new ValidationError(`A template named '${name}' already exists.`);
    }

    const newTemplate = await Template.create({
      name,
      displayName: data.displayName ? data.displayName.trim() : name,
      icon: data.icon || 'ti ti-file-text',
      description: data.description || '',
      isSystem: Boolean(data.isSystem),
      baseTemplates: data.baseTemplates || [],
      sections: data.sections || [
        {
          name: 'Data',
          sortOrder: 10,
          fields: [],
        },
      ],
      insertOptions: data.insertOptions || [],
      standardValues: data.standardValues || {},
      createdBy: userId,
      updatedBy: userId,
    });

    this.invalidateCache();
    return this.getById(newTemplate._id);
  },

  /**
   * Update template metadata with optimistic locking
   */
  async update(id, data, expectedUpdatedAt = null, userId = null) {
    const template = await Template.findById(id);
    if (!template) {
      throw new ValidationError('Template not found.');
    }

    // Optimistic locking check
    if (expectedUpdatedAt) {
      const currentIso = template.updatedAt ? new Date(template.updatedAt).toISOString() : null;
      const expectedIso = new Date(expectedUpdatedAt).toISOString();
      if (currentIso && currentIso !== expectedIso) {
        throw new ConflictError(
          'Conflict: Template was modified by another session. Please reload to review changes.'
        );
      }
    }

    if (data.name && data.name !== template.name) {
      if (template.isSystem) {
        throw new ValidationError('Cannot rename a system template.');
      }
      const newName = this.cleanName(data.name);
      const existing = await Template.findOne({ name: newName, _id: { $ne: template._id } });
      if (existing) {
        throw new ValidationError(`Template '${newName}' already exists.`);
      }
      template.name = newName;
    }

    if (data.displayName !== undefined) template.displayName = data.displayName.trim();
    if (data.icon !== undefined) template.icon = data.icon.trim();
    if (data.description !== undefined) template.description = data.description.trim();

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Safe delete template
   */
  async delete(id) {
    const template = await Template.findById(id);
    if (!template) {
      throw new ValidationError('Template not found.');
    }

    if (template.isSystem) {
      throw new ValidationError(`Cannot delete system template '${template.displayName || template.name}'.`);
    }

    const usage = await this.getUsage(id);
    if (!usage.canDelete) {
      const reasons = [];
      if (usage.itemsCount > 0) {
        reasons.push(`${usage.itemsCount} content item(s) are using this template`);
      }
      if (usage.inheritingTemplates.length > 0) {
        reasons.push(
          `Inherited by template(s): ${usage.inheritingTemplates.map((t) => t.displayName || t.name).join(', ')}`
        );
      }
      throw new ValidationError(`Cannot delete template: ${reasons.join('; ')}.`);
    }

    await Template.findByIdAndDelete(id);
    this.invalidateCache();

    return { success: true, deletedId: id };
  },

  /**
   * Duplicate template
   */
  async duplicate(id, userId = null) {
    const source = await Template.findById(id).lean();
    if (!source) {
      throw new ValidationError('Source template not found.');
    }

    let baseName = source.name.replace(/^copy(-\d+)?-of-/, '');
    let candidateName = `copy-of-${baseName}`;
    let counter = 2;

    while (await Template.findOne({ name: candidateName })) {
      candidateName = `copy-${counter}-of-${baseName}`;
      counter++;
    }

    // Duplicate sections and fields with new IDs
    const clonedSections = (source.sections || []).map((sec) => ({
      name: sec.name,
      sortOrder: sec.sortOrder,
      fields: (sec.fields || []).map((f) => ({
        name: f.name,
        title: f.title,
        type: f.type,
        required: f.required,
        defaultValue: f.defaultValue,
        source: f.source,
        shared: f.shared,
        unversioned: f.unversioned,
        helpText: f.helpText,
        validation: f.validation,
        sortOrder: f.sortOrder,
      })),
    }));

    const copy = await Template.create({
      name: candidateName,
      displayName: `Copy of ${source.displayName || source.name}`,
      icon: source.icon,
      description: source.description,
      isSystem: false,
      baseTemplates: source.baseTemplates || [],
      sections: clonedSections,
      insertOptions: source.insertOptions || [],
      standardValues: source.standardValues || {},
      createdBy: userId,
      updatedBy: userId,
    });

    this.invalidateCache();
    return this.getById(copy._id);
  },

  /**
   * Add section to template
   */
  async addSection(templateId, sectionData, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const name = sectionData.name ? sectionData.name.trim() : '';
    if (!name) throw new ValidationError('Section name is required.');

    // Check duplicate section name within this template
    const duplicate = template.sections.some(
      (s) => s.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      throw new ValidationError(`A section named '${name}' already exists in this template.`);
    }

    const lastSortOrder = template.sections.length > 0
      ? Math.max(...template.sections.map((s) => s.sortOrder || 100))
      : 0;

    template.sections.push({
      name,
      sortOrder: lastSortOrder + 10,
      fields: [],
    });

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Update section name / sortOrder
   */
  async updateSection(templateId, sectionId, sectionData, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    if (sectionData.name) {
      const newName = sectionData.name.trim();
      const duplicate = template.sections.some(
        (s) => s._id.toString() !== sectionId.toString() && s.name.trim().toLowerCase() === newName.toLowerCase()
      );
      if (duplicate) {
        throw new ValidationError(`Another section named '${newName}' already exists.`);
      }
      section.name = newName;
    }

    if (sectionData.sortOrder !== undefined) {
      section.sortOrder = Number(sectionData.sortOrder);
    }

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Delete section
   */
  async deleteSection(templateId, sectionId, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    template.sections.pull(sectionId);
    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Reorder sections
   */
  async reorderSections(templateId, sectionIds, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    for (let i = 0; i < sectionIds.length; i++) {
      const sec = template.sections.id(sectionIds[i]);
      if (sec) {
        sec.sortOrder = (i + 1) * 10;
      }
    }

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Add field to section
   */
  async addField(templateId, sectionId, fieldData, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    const name = this.cleanName(fieldData.name);
    const title = fieldData.title ? fieldData.title.trim() : fieldData.name;

    // Check duplicate field name within resolved template
    const resolved = await this.resolveTemplate(templateId);
    const existingField = resolved?.sections?.flatMap((s) => s.fields)?.find(
      (f) => f.name.toLowerCase() === name.toLowerCase()
    );
    if (existingField && !existingField.origin.isInherited) {
      throw new ValidationError(`A field named '${name}' already exists in this template.`);
    }

    const lastSortOrder = section.fields.length > 0
      ? Math.max(...section.fields.map((f) => f.sortOrder || 100))
      : 0;

    section.fields.push({
      name,
      title,
      type: fieldData.type || 'Single-Line Text',
      required: Boolean(fieldData.required),
      defaultValue: fieldData.defaultValue || '',
      source: fieldData.source || '',
      shared: Boolean(fieldData.shared),
      unversioned: Boolean(fieldData.unversioned),
      helpText: fieldData.helpText || '',
      validation: fieldData.validation || '',
      sortOrder: lastSortOrder + 10,
    });

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Update field definition with type compatibility validation
   */
  async updateField(templateId, sectionId, fieldId, fieldData, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    const field = section.fields.id(fieldId);
    if (!field) throw new ValidationError('Field not found.');

    // 1. Check type compatibility if changed
    if (fieldData.type && fieldData.type !== field.type) {
      const allowed = COMPATIBLE_TYPE_TRANSITIONS[field.type] || [];
      if (!allowed.includes(fieldData.type)) {
        const usage = await this.getUsage(templateId);
        if (usage.itemsCount > 0) {
          throw new ValidationError(
            `Incompatible type change: Cannot change '${field.type}' to '${fieldData.type}' because ${usage.itemsCount} content item(s) already exist using this template.`
          );
        }
      }
      field.type = fieldData.type;
    }

    if (fieldData.name && fieldData.name !== field.name) {
      field.name = this.cleanName(fieldData.name);
    }

    if (fieldData.title !== undefined) field.title = fieldData.title.trim();
    if (fieldData.required !== undefined) field.required = Boolean(fieldData.required);
    if (fieldData.defaultValue !== undefined) field.defaultValue = fieldData.defaultValue;
    if (fieldData.source !== undefined) field.source = fieldData.source.trim();
    if (fieldData.shared !== undefined) field.shared = Boolean(fieldData.shared);
    if (fieldData.unversioned !== undefined) field.unversioned = Boolean(fieldData.unversioned);
    if (fieldData.helpText !== undefined) field.helpText = fieldData.helpText.trim();
    if (fieldData.validation !== undefined) field.validation = fieldData.validation.trim();

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Delete field from section
   */
  async deleteField(templateId, sectionId, fieldId, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    section.fields.pull(fieldId);
    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Reorder fields within a section
   */
  async reorderFields(templateId, sectionId, fieldIds, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const section = template.sections.id(sectionId);
    if (!section) throw new ValidationError('Section not found.');

    for (let i = 0; i < fieldIds.length; i++) {
      const f = section.fields.id(fieldIds[i]);
      if (f) {
        f.sortOrder = (i + 1) * 10;
      }
    }

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Move field between sections
   */
  async moveField(templateId, sourceSectionId, targetSectionId, fieldId, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    const sourceSection = template.sections.id(sourceSectionId);
    const targetSection = template.sections.id(targetSectionId);

    if (!sourceSection || !targetSection) {
      throw new ValidationError('Source or target section not found.');
    }

    const field = sourceSection.fields.id(fieldId);
    if (!field) throw new ValidationError('Field not found in source section.');

    // Clone field into target
    const fieldObj = field.toObject();
    sourceSection.fields.pull(fieldId);
    targetSection.fields.push(fieldObj);

    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Configure base templates with cycle detection
   */
  async setBaseTemplates(templateId, baseTemplateIds = [], userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    // Prevent inheriting self
    const cleanIds = baseTemplateIds.filter((id) => id && id.toString() !== templateId.toString());

    // Cycle detection check: dry-run resolveTemplate
    for (const baseId of cleanIds) {
      const visited = new Set([templateId.toString()]);
      await this.resolveTemplate(baseId, visited);
    }

    template.baseTemplates = cleanIds;
    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Configure standard values for a template
   */
  async setStandardValues(templateId, values = {}, expectedUpdatedAt = null, userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    if (expectedUpdatedAt) {
      const currentIso = template.updatedAt ? new Date(template.updatedAt).toISOString() : null;
      const expectedIso = new Date(expectedUpdatedAt).toISOString();
      if (currentIso && currentIso !== expectedIso) {
        throw new ConflictError('Conflict: Template was modified by another session.');
      }
    }

    // Values is map of fieldId -> value
    template.standardValues = values;
    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },

  /**
   * Configure insert options for a template
   */
  async setInsertOptions(templateId, insertOptionIds = [], userId = null) {
    const template = await Template.findById(templateId);
    if (!template) throw new ValidationError('Template not found.');

    template.insertOptions = insertOptionIds;
    template.updatedBy = userId;
    await template.save();

    this.invalidateCache();
    return this.getById(template._id);
  },
};

module.exports = templateService;
