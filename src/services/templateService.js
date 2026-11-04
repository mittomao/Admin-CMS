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

// In-memory cache for resolved templates and effective templates
const resolvedTemplateCache = new Map();
const effectiveTemplateCache = new Map();

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
   * Clear in-memory resolved template and effective template caches
   */
  invalidateCache() {
    resolvedTemplateCache.clear();
    effectiveTemplateCache.clear();
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

    // Leaf items under presentation and template items cannot have children created manually
    if (['Layout', 'Rendering', 'Device', 'Placeholder Settings', 'Template', 'Standard Template', 'Sample Component'].includes(resolved.name)) {
      return [];
    }

    if (item) {
      const isTemplateDefItem = await Template.findById(item._id).lean();
      if (isTemplateDefItem && isTemplateDefItem.name !== 'Template Folder') {
        return [];
      }
    }

    // Special rule for Feature/Components and Project/Pages branches (and nested folders)
    if (item && item.path) {
      const p = item.path.toLowerCase().trim();
      const isComponentOrPageFolder =
        p === '/sitecore/templates/feature/components' ||
        p.startsWith('/sitecore/templates/feature/components/') ||
        p === '/sitecore/templates/project/pages' ||
        p.startsWith('/sitecore/templates/project/pages/');

      if (isComponentOrPageFolder) {
        const templateFolder = await Template.findOne({ name: 'Template Folder' })
          .select('name displayName icon description path isSystem')
          .lean();
        const standardTemplate = await Template.findOne({
          $or: [{ name: 'Standard Template' }, { name: 'Sample Component' }],
        })
          .select('name displayName icon description path isSystem')
          .lean();

        const options = [];
        if (templateFolder) {
          options.push({
            ...templateFolder,
            displayName: 'Folder',
          });
        }
        if (standardTemplate) {
          options.push({
            ...standardTemplate,
            displayName: 'Standard Template',
          });
        }
        return options;
      }
    }

    // Check if target is /sitecore/content or a page under /sitecore/content
    const isContentBranch = item && item.path && (
      item.path.toLowerCase() === '/sitecore/content' ||
      item.path.toLowerCase().startsWith('/sitecore/content/')
    );

    const isPageTemplate = resolved.path && resolved.path.toLowerCase().includes('/project/pages');
    const isCommonTemplate = (resolved.name === 'Folder') || (resolved.path && resolved.path.toLowerCase().includes('/templates/common'));

    if (isContentBranch || isPageTemplate || isCommonTemplate) {
      // 1. Root /sitecore/content always allows inserting page templates from Project/Pages and common templates from Common
      if (item && item.path && item.path.toLowerCase() === '/sitecore/content') {
        return this.getContentInsertTemplates();
      }

      // 2. If a specific page or common template defines custom insert options, prioritize them
      if (resolved.insertOptions && resolved.insertOptions.length > 0) {
        const configured = await Template.find({
          _id: { $in: resolved.insertOptions },
          isSystem: { $ne: true },
        })
          .select('name displayName icon description path')
          .sort({ displayName: 1, name: 1 })
          .lean();

        if (configured && configured.length > 0) {
          return configured;
        }
      }

      // 3. Fallback rule for /content branch: dynamic templates from Project/Pages and Common
      return this.getContentInsertTemplates();
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
   * Get all templates allowed for content creation under /sitecore/content:
   * - Page Templates located under /sitecore/templates/Project/Pages (recursive)
   * - Common Templates located under /sitecore/templates/Common (recursive, e.g. Folder)
   * Excludes structural template folders and System templates.
   */
  async getContentInsertTemplates() {
    const allowedPathRegex = '^/sitecore/templates/(project/pages|common)';

    // 1. Search Template documents by path
    const templatesByPath = await Template.find({
      path: { $regex: allowedPathRegex, $options: 'i' },
      name: { $nin: ['Template Folder', 'Layout Folder', 'Rendering Folder', 'Placeholder Folder'] },
      isSystem: { $ne: true },
    })
      .select('name displayName icon description path isSystem')
      .lean();

    // 2. Search via Item tree under /sitecore/templates/(project/pages|common)
    const treeItems = await Item.find({
      path: { $regex: allowedPathRegex, $options: 'i' },
      deleted: false,
    }).lean();

    const candidateIds = treeItems
      .filter((it) => {
        const nameLower = (it.name || '').toLowerCase();
        if (nameLower === 'pages' || nameLower === 'common') return false;
        if (nameLower === 'template folder') return false;
        return true;
      })
      .map((it) => it._id);

    let templatesByTree = [];
    if (candidateIds.length > 0) {
      templatesByTree = await Template.find({
        _id: { $in: candidateIds },
        name: { $nin: ['Template Folder', 'Layout Folder', 'Rendering Folder', 'Placeholder Folder'] },
        isSystem: { $ne: true },
      })
        .select('name displayName icon description path isSystem')
        .lean();
    }

    // 3. Special check for Folder template:
    // If Folder template exists, and either its path or its Item path is under common, include it
    let folderTplDoc = null;
    const folderTpl = await Template.findOne({ name: 'Folder' })
      .select('name displayName icon description path isSystem')
      .lean();
    if (folderTpl) {
      const p = (folderTpl.path || '').toLowerCase();
      const folderItem = await Item.findOne({ _id: folderTpl._id, deleted: false }).lean();
      const itemPath = (folderItem?.path || '').toLowerCase();
      if (p.includes('/common') || itemPath.includes('/common')) {
        folderTplDoc = folderTpl;
      }
    }

    // Combine and deduplicate
    const map = new Map();
    for (const t of templatesByPath) {
      map.set(t._id.toString(), t);
    }
    for (const t of templatesByTree) {
      map.set(t._id.toString(), t);
    }
    if (folderTplDoc) {
      map.set(folderTplDoc._id.toString(), folderTplDoc);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
    return list;
  },

  /**
   * Get all page templates located under /sitecore/templates/Project/Pages (recursive)
   * Excludes folders and system templates
   */
  async getPageTemplates() {
    return this.getContentInsertTemplates();
  },

  /**
   * Check if a component template is used by any rendering item
   */
  async checkComponentTemplateUsage(templateId) {
    if (!templateId) return { inUse: false, renderings: [], totalUsage: 0 };
    const idStr = templateId.toString();

    const renderings = await Item.find({
      deleted: false,
      $or: [
        { 'fields.componentTemplate': idStr },
        { 'sharedFields.componentTemplate': idStr },
      ],
    })
      .select('name displayName path fields sharedFields')
      .lean();

    return {
      inUse: renderings.length > 0,
      renderings: renderings.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        displayName: r.displayName || r.name,
        path: r.path,
      })),
      totalUsage: renderings.length,
    };
  },

  /**
   * Check usage of a template: items using it + templates inheriting from it + renderings using it as componentTemplate
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

    const compUsage = await this.checkComponentTemplateUsage(id);
    const referencingRenderings = compUsage.renderings;

    return {
      templateId: id,
      itemsCount,
      sampleItems,
      inheritingTemplates,
      referencingRenderings,
      canDelete: itemsCount === 0 && inheritingTemplates.length === 0 && referencingRenderings.length === 0,
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
      if (usage.referencingRenderings && usage.referencingRenderings.length > 0) {
        reasons.push(
          `Referenced as componentTemplate by rendering(s): ${usage.referencingRenderings.map((r) => r.displayName || r.name).join(', ')}`
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

  /**
   * Validate a component template reference
   */
  async validateComponentTemplateReference(componentTemplateId) {
    if (!componentTemplateId) {
      throw new ValidationError('Trường componentTemplate là bắt buộc đối với Rendering.');
    }
    const idStr = componentTemplateId.toString().trim();
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      throw new ValidationError('componentTemplate phải là một ObjectId hợp lệ.');
    }

    const tpl = await Template.findById(idStr).lean();
    if (!tpl) {
      throw new ValidationError(`Component Template với ID [${idStr}] không tồn tại.`);
    }

    if (tpl.isSystem) {
      throw new ValidationError('Không được phép chọn Template hệ thống làm componentTemplate.');
    }

    // Check path if set, must belong to /sitecore/templates/Feature/Components (case insensitive)
    if (tpl.path && !tpl.path.toLowerCase().startsWith('/sitecore/templates/feature/components')) {
      throw new ValidationError('Component Template phải nằm dưới thư mục /sitecore/templates/Feature/Components.');
    }

    return tpl;
  },

  /**
   * List all valid component templates under /sitecore/templates/Feature/Components
   */
  async getComponentTemplates() {
    const templates = await Template.find({
      $or: [
        { path: { $regex: '^/sitecore/templates/Feature/Components', $options: 'i' } },
        { name: { $in: ['HeroBanner', 'Introduction', 'ImageText'] } },
      ],
      isSystem: { $ne: true },
    })
      .select('_id name displayName icon path')
      .sort({ displayName: 1, name: 1 })
      .lean();
    return templates;
  },

  /**
   * Resolve effective template for an item, merging its base template definition with the
   * component templates of all renderings in the item's resolved presentation.
   */
  async resolveEffectiveTemplate(itemOrId, langCode = 'vi', versionNumber = 1) {
    if (!itemOrId) return null;
    let item = itemOrId;
    if (typeof itemOrId === 'string' || itemOrId instanceof mongoose.Types.ObjectId) {
      item = await Item.findById(itemOrId).lean();
      if (!item) return null;
    }

    const itemIdStr = item._id ? item._id.toString() : 'temp';
    const lang = (langCode || 'vi').toLowerCase().trim();
    const ver = parseInt(versionNumber, 10) || 1;
    const cacheKey = `eff_${itemIdStr}_${lang}_${ver}`;

    if (effectiveTemplateCache.has(cacheKey)) {
      return JSON.parse(JSON.stringify(effectiveTemplateCache.get(cacheKey)));
    }

    const templateId = item.templateId?._id || item.templateId;
    if (!templateId) return null;

    // 1. Resolve base template hierarchy (e.g. Home template + its base templates)
    const baseTemplate = await this.resolveTemplate(templateId);
    if (!baseTemplate) return null;

    const effective = JSON.parse(JSON.stringify(baseTemplate));

    // 2. Fetch presentation for this item at this lang & version
    let presentation = null;
    try {
      const presentationService = require('./presentationService');
      presentation = await presentationService.getFinalPresentation(item, lang, ver);
    } catch {
      presentation = null;
    }

    const componentRenderings = presentation?.renderings || [];
    const addedCompTemplateIds = new Set();
    const componentSections = [];
    const componentStandardValues = {};

    // 3. For each rendering in presentation, find its componentTemplate
    for (const r of componentRenderings) {
      if (r.hidden) continue;
      const compTplId = r.componentTemplate;
      if (!compTplId) continue;
      const compTplIdStr = compTplId.toString();

      // All instances of the same component on the page share the same fields
      if (addedCompTemplateIds.has(compTplIdStr)) continue;
      addedCompTemplateIds.add(compTplIdStr);

      let compTpl = null;
      try {
        compTpl = await Template.findById(compTplIdStr).lean();
      } catch {
        compTpl = null;
      }
      if (!compTpl) continue;

      // Gather component template standard values
      if (compTpl.standardValues) {
        const stdMap = compTpl.standardValues instanceof Map
          ? Object.fromEntries(compTpl.standardValues)
          : compTpl.standardValues;
        Object.assign(componentStandardValues, stdMap);
      }

      // Group fields of this component template into a dedicated section named after the Component / Rendering
      const renderingName = r.name || compTpl.name;
      const sectionName = renderingName;
      const sectionDisplayName = r.displayName || compTpl.displayName || compTpl.name;

      const compFields = [];
      if (compTpl.sections) {
        for (const sec of compTpl.sections) {
          if (sec.fields) {
            for (const f of sec.fields) {
              const fieldObj = {
                ...f,
                _id: f._id ? f._id.toString() : new mongoose.Types.ObjectId().toString(),
                origin: {
                  templateId: compTpl._id.toString(),
                  templateName: compTpl.displayName || compTpl.name,
                  renderingName,
                  isComponent: true,
                },
              };
              compFields.push(fieldObj);
            }
          }
        }
      }

      if (compFields.length > 0) {
        componentSections.push({
          _id: new mongoose.Types.ObjectId().toString(),
          name: sectionName,
          displayName: sectionDisplayName,
          sortOrder: 200 + componentSections.length * 10,
          origin: {
            templateId: compTpl._id.toString(),
            templateName: compTpl.displayName || compTpl.name,
            renderingName,
            isComponent: true,
          },
          fields: compFields,
        });
      }
    }

    // Merge sections: base page sections first, then component sections
    effective.sections = [
      ...(effective.sections || []),
      ...componentSections,
    ];

    // Merge standard values: base template standard values + component template standard values
    effective.standardValues = {
      ...(effective.standardValues || {}),
      ...componentStandardValues,
    };

    effective.componentRenderings = componentRenderings;

    // Cache the result
    effectiveTemplateCache.set(cacheKey, JSON.parse(JSON.stringify(effective)));

    return effective;
  },
};

module.exports = templateService;
