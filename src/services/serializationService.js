'use strict';

/**
 * Serialization Service (DEC-047 / Phase 11)
 * Handles JSON package export, inspection, and 4-step dependency-safe import
 * for Content, Templates, Layouts, Renderings, and Placeholders.
 */

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const Item = require('../models/Item');
const Template = require('../models/Template');
const branding = require('../config/branding');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');

/**
 * Helper to safely convert Mongoose Maps/Objects to plain Javascript object
 */
function toPlainObject(val) {
  if (!val) return {};
  if (val instanceof Map) return Object.fromEntries(val);
  if (typeof val === 'object' && !Array.isArray(val)) {
    const plain = {};
    for (const [k, v] of Object.entries(val)) {
      if (v instanceof Map) {
        plain[k] = Object.fromEntries(v);
      } else {
        plain[k] = v;
      }
    }
    return plain;
  }
  return {};
}

/**
 * Helper to normalize item languages structure to pure serializable JSON
 */
function serializeLanguages(languages) {
  if (!Array.isArray(languages)) return [];
  return languages.map((lang) => ({
    code: lang.code || 'vi',
    unversionedFields: toPlainObject(lang.unversionedFields),
    versions: Array.isArray(lang.versions)
      ? lang.versions.map((v) => ({
          version: v.version || 1,
          fields: toPlainObject(v.fields),
          workflowState: v.workflowState ? v.workflowState.toString() : null,
          validFrom: v.validFrom || null,
          validTo: v.validTo || null,
          neverPublish: Boolean(v.neverPublish),
          note: v.note || '',
        }))
      : [],
  }));
}

class SerializationService {
  /**
   * Export JSON package containing selected branches
   * @param {Object} options
   * @param {boolean} [options.includeContent=true]
   * @param {boolean} [options.includeTemplates=true]
   * @param {boolean} [options.includeLayouts=true]
   * @param {boolean} [options.includeRenderings=true]
   * @param {boolean} [options.includePlaceholders=true]
   * @param {string} [options.contentRootPath='/root/content']
   * @param {Object} [options.user]
   * @returns {Promise<Object>} Serialized package data
   */
  async exportPackage(options = {}) {
    const {
      includeContent = true,
      includeTemplates = true,
      includeLayouts = true,
      includeRenderings = true,
      includePlaceholders = true,
      contentRootPath = branding.PATHS.CONTENT || '/root/content',
      user = null,
    } = options;

    logger.info(`[serializationService] Starting package export. User: ${user ? user.username : 'system'}`);

    // Pre-load reference maps for environment portability (Template path/name, Layout path, Rendering path)
    const allTemplates = await Template.find({}).select('name displayName path').lean();
    const templateMap = new Map(allTemplates.map((t) => [t._id.toString(), t]));

    const layoutsPath = branding.PATHS.LAYOUTS || '/root/layout/Layouts';
    const layoutItems = await Item.find({
      $or: [{ path: layoutsPath }, { path: { $regex: `^${layoutsPath}/` } }],
    }).select('name path').lean();
    const layoutMap = new Map(layoutItems.map((l) => [l._id.toString(), l]));

    const renderingsPath = branding.PATHS.RENDERINGS || '/root/layout/Renderings';
    const renderingItems = await Item.find({
      $or: [{ path: renderingsPath }, { path: { $regex: `^${renderingsPath}/` } }],
    }).select('name path').lean();
    const renderingMap = new Map(renderingItems.map((r) => [r._id.toString(), r]));

    const branches = {
      templates: [],
      templateDefinitions: [],
      layouts: [],
      renderings: [],
      placeholders: [],
      content: [],
    };

    // 1. Export Templates Branch
    if (includeTemplates) {
      const templateItemPath = branding.PATHS.TEMPLATES || '/root/templates';
      const templateItems = await Item.find({
        $or: [{ path: templateItemPath }, { path: { $regex: `^${templateItemPath}/` } }],
      })
        .sort({ path: 1 })
        .lean();

      branches.templates = templateItems.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));

      // Also export template model definitions (sections, fields, standard values)
      const tplDefs = await Template.find({}).lean();
      branches.templateDefinitions = tplDefs.map((t) => ({
        _id: t._id.toString(),
        name: t.name,
        displayName: t.displayName || t.name,
        icon: t.icon || 'ti ti-file-text',
        description: t.description || '',
        path: t.path || '',
        isSystem: Boolean(t.isSystem),
        baseTemplates: Array.isArray(t.baseTemplates) ? t.baseTemplates.map((b) => b.toString()) : [],
        sections: (t.sections || []).map((sec) => ({
          _id: sec._id ? sec._id.toString() : undefined,
          name: sec.name,
          sortOrder: sec.sortOrder || 100,
          fields: (sec.fields || []).map((f) => ({
            _id: f._id ? f._id.toString() : undefined,
            name: f.name,
            title: f.title,
            type: f.type,
            required: Boolean(f.required),
            defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
            source: f.source || '',
            shared: Boolean(f.shared),
            unversioned: Boolean(f.unversioned),
            helpText: f.helpText || '',
            validation: f.validation || '',
            sortOrder: f.sortOrder || 100,
          })),
        })),
        standardValues: toPlainObject(t.standardValues),
        insertOptions: Array.isArray(t.insertOptions) ? t.insertOptions.map((opt) => opt.toString()) : [],
      }));
    }

    // 2. Export Layouts Branch
    if (includeLayouts) {
      const layoutsPath = branding.PATHS.LAYOUTS || '/root/layout/Layouts';
      const items = await Item.find({
        $or: [{ path: layoutsPath }, { path: { $regex: `^${layoutsPath}/` } }],
      })
        .sort({ path: 1 })
        .lean();
      branches.layouts = items.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));
    }

    // 3. Export Renderings Branch
    if (includeRenderings) {
      const renderingsPath = branding.PATHS.RENDERINGS || '/root/layout/Renderings';
      const items = await Item.find({
        $or: [{ path: renderingsPath }, { path: { $regex: `^${renderingsPath}/` } }],
      })
        .sort({ path: 1 })
        .lean();
      branches.renderings = items.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));
    }

    // 4. Export Placeholders Branch
    if (includePlaceholders) {
      const placeholdersPath = branding.PATHS.PLACEHOLDERS || '/root/layout/Placeholders';
      const items = await Item.find({
        $or: [{ path: placeholdersPath }, { path: { $regex: `^${placeholdersPath}/` } }],
      })
        .sort({ path: 1 })
        .lean();
      branches.placeholders = items.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));
    }

    // 5. Export Content Branch
    if (includeContent) {
      const rootPath = (contentRootPath || branding.PATHS.CONTENT || '/root/content').trim();
      const items = await Item.find({
        $or: [{ path: rootPath }, { path: { $regex: `^${rootPath}/` } }],
      })
        .sort({ path: 1 })
        .lean();
      branches.content = items.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));
    }

    const stats = {
      templatesCount: branches.templates.length,
      templateDefinitionsCount: branches.templateDefinitions.length,
      layoutsCount: branches.layouts.length,
      renderingsCount: branches.renderings.length,
      placeholdersCount: branches.placeholders.length,
      contentCount: branches.content.length,
      totalItems:
        branches.templates.length +
        branches.layouts.length +
        branches.renderings.length +
        branches.placeholders.length +
        branches.content.length,
    };

    const pkg = {
      $schema: 'https://treecraft.io/schemas/serialization-v1.json',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user ? (user.username || user.fullName || 'admin') : 'system',
      appName: `${branding.PROJECT_NAME || 'Treecraft'} Content Management`,
      stats,
      branches,
    };

    logger.info(`[serializationService] Package export completed successfully: ${stats.totalItems} items.`);
    return pkg;
  }

  /**
   * Export a single tree starting from a root item ID
   * @param {string} rootItemId
   * @param {Object} options
   */
  async exportSingleTree(rootItemId, options = {}) {
    const rootItem = await Item.findById(rootItemId).lean();
    if (!rootItem) {
      throw new Error(`Item not found with ID: ${rootItemId}`);
    }

    const allTemplates = await Template.find({}).select('name displayName path').lean();
    const templateMap = new Map(allTemplates.map((t) => [t._id.toString(), t]));

    const layoutsPath = branding.PATHS.LAYOUTS || '/root/layout/Layouts';
    const layoutItems = await Item.find({
      $or: [{ path: layoutsPath }, { path: { $regex: `^${layoutsPath}/` } }],
    }).select('name path').lean();
    const layoutMap = new Map(layoutItems.map((l) => [l._id.toString(), l]));

    const renderingsPath = branding.PATHS.RENDERINGS || '/root/layout/Renderings';
    const renderingItems = await Item.find({
      $or: [{ path: renderingsPath }, { path: { $regex: `^${renderingsPath}/` } }],
    }).select('name path').lean();
    const renderingMap = new Map(renderingItems.map((r) => [r._id.toString(), r]));

    const items = await Item.find({
      $or: [{ _id: rootItem._id }, { path: { $regex: `^${rootItem.path}/` } }],
    })
      .sort({ path: 1 })
      .lean();

    const serializedItems = items.map((item) => this.serializeItem(item, { templateMap, layoutMap, renderingMap }));

    return {
      $schema: 'https://treecraft.io/schemas/serialization-v1.json',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: options.user ? options.user.username : 'system',
      appName: `${branding.PROJECT_NAME || 'Treecraft'} Content Management`,
      rootItemPath: rootItem.path,
      stats: {
        totalItems: serializedItems.length,
      },
      items: serializedItems,
    };
  }

  /**
   * Helper to serialize an individual item into portable format
   */
  serializeItem(item, { templateMap, layoutMap, renderingMap } = {}) {
    const tpl = item.templateId ? templateMap.get(item.templateId.toString()) : null;

    // Resolve presentation references to portable paths
    let portablePresentation = null;
    const pres = item.presentation?.shared || item.presentation;
    if (pres && (pres.layoutId || (Array.isArray(pres.renderings) && pres.renderings.length > 0))) {
      const layoutObj = pres.layoutId ? layoutMap.get(pres.layoutId.toString()) : null;
      const portableRenderings = Array.isArray(pres.renderings)
        ? pres.renderings.map((r) => {
            const rendObj = r.renderingId ? renderingMap.get(r.renderingId.toString()) : null;
            return {
              uid: r.uid || randomUUID(),
              renderingId: r.renderingId ? r.renderingId.toString() : null,
              renderingPath: rendObj ? rendObj.path : null,
              renderingName: rendObj ? rendObj.name : null,
              placeholder: r.placeholder || r.placeholderKey || 'maincontent',
              placeholderKey: r.placeholderKey || r.placeholder || 'maincontent',
              sortOrder: r.sortOrder || 100,
              datasourceId: r.datasourceId ? r.datasourceId.toString() : null,
              parameters: toPlainObject(r.parameters),
              hidden: Boolean(r.hidden),
            };
          })
        : [];

      portablePresentation = {
        layoutId: pres.layoutId ? pres.layoutId.toString() : null,
        layoutPath: layoutObj ? layoutObj.path : null,
        layoutName: layoutObj ? layoutObj.name : null,
        renderings: portableRenderings,
      };
    }

    // Determine parent path
    let parentPath = '';
    if (item.path) {
      const lastSlash = item.path.lastIndexOf('/');
      if (lastSlash > 0) {
        parentPath = item.path.substring(0, lastSlash);
      }
    }

    return {
      _id: item._id ? item._id.toString() : undefined,
      name: item.name,
      displayName: item.displayName || item.name,
      path: item.path,
      parentPath,
      templateId: item.templateId ? item.templateId.toString() : null,
      templatePath: tpl ? tpl.path : null,
      templateName: tpl ? tpl.name : null,
      sortOrder: item.sortOrder || 100,
      icon: item.icon || null,
      isSystem: Boolean(item.isSystem),
      sharedFields: toPlainObject(item.sharedFields),
      languages: serializeLanguages(item.languages),
      presentation: portablePresentation,
    };
  }

  /**
   * Inspect and validate an uploaded package file
   * @param {Object} pkg
   * @returns {Object} Inspection result
   */
  inspectPackage(pkg) {
    if (!pkg || typeof pkg !== 'object') {
      return {
        isValid: false,
        error: 'Tệp JSON không hợp lệ hoặc rỗng.',
      };
    }

    if (!pkg.branches && !pkg.items) {
      return {
        isValid: false,
        error: 'Tệp không đúng định dạng Treecraft Serialization v1.0 (thiếu cấu trúc branches/items).',
      };
    }

    const branches = pkg.branches || {
      content: Array.isArray(pkg.items) ? pkg.items : [],
      templates: [],
      templateDefinitions: [],
      layouts: [],
      renderings: [],
      placeholders: [],
    };

    const stats = {
      templatesCount: (branches.templates || []).length,
      templateDefinitionsCount: (branches.templateDefinitions || []).length,
      layoutsCount: (branches.layouts || []).length,
      renderingsCount: (branches.renderings || []).length,
      placeholdersCount: (branches.placeholders || []).length,
      contentCount: (branches.content || []).length,
    };

    stats.totalItems =
      stats.templatesCount +
      stats.layoutsCount +
      stats.renderingsCount +
      stats.placeholdersCount +
      stats.contentCount;

    const warnings = [];
    if (stats.totalItems === 0) {
      warnings.push('Gói dữ liệu không chứa bất kỳ item nào.');
    }

    return {
      isValid: true,
      version: pkg.version || '1.0',
      appName: pkg.appName || 'Treecraft',
      exportedAt: pkg.exportedAt || null,
      exportedBy: pkg.exportedBy || 'Unknown',
      stats,
      warnings,
    };
  }

  /**
   * Import package with 4-step dependency order:
   * Step 1: Templates & Definitions -> Step 2: Layouts & Placeholders -> Step 3: Renderings -> Step 4: Content
   * @param {Object} pkg
   * @param {Object} options - { conflictMode: 'OVERWRITE'|'SKIP'|'RENAME', selectedBranches: [], user: {} }
   * @returns {Promise<Object>} Import summary
   */
  async importPackage(pkg, options = {}) {
    const inspection = this.inspectPackage(pkg);
    if (!inspection.isValid) {
      throw new Error(inspection.error);
    }

    const {
      conflictMode = 'OVERWRITE',
      selectedBranches = ['templates', 'layouts', 'renderings', 'placeholders', 'content'],
      user = null,
    } = options;

    logger.info(`[serializationService] Starting import. Conflict mode: ${conflictMode}, Branches: ${selectedBranches.join(', ')}`);

    const branches = pkg.branches || {
      content: Array.isArray(pkg.items) ? pkg.items : [],
      templates: [],
      templateDefinitions: [],
      layouts: [],
      renderings: [],
      placeholders: [],
    };

    const summary = {
      templates: { created: 0, updated: 0, skipped: 0 },
      layouts: { created: 0, updated: 0, skipped: 0 },
      renderings: { created: 0, updated: 0, skipped: 0 },
      placeholders: { created: 0, updated: 0, skipped: 0 },
      content: { created: 0, updated: 0, skipped: 0 },
      totalCreated: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      warnings: [],
    };

    // Maintain ID mapping for cross-environment resolution: oldIdString -> newObjectId
    const idMap = new Map();

    // =========================================================================
    // STEP 1: IMPORT TEMPLATES & DEFINITIONS
    // =========================================================================
    if (selectedBranches.includes('templates')) {
      logger.info('[serializationService] Step 1: Importing Templates & Definitions...');

      // 1.1 Import Template definitions (Template collection)
      const tplDefs = branches.templateDefinitions || [];
      for (const def of tplDefs) {
        try {
          let existingTpl = await Template.findOne({ name: def.name });
          if (!existingTpl && def._id && mongoose.Types.ObjectId.isValid(def._id)) {
            existingTpl = await Template.findById(def._id);
          }

          if (existingTpl) {
            idMap.set(def._id, existingTpl._id);
            if (conflictMode === 'OVERWRITE') {
              existingTpl.displayName = def.displayName || existingTpl.displayName;
              existingTpl.icon = def.icon || existingTpl.icon;
              existingTpl.description = def.description || existingTpl.description;
              if (def.sections) existingTpl.sections = def.sections;
              if (def.standardValues) existingTpl.standardValues = def.standardValues;
              await existingTpl.save();
            }
          } else {
            const newTplId = (def._id && mongoose.Types.ObjectId.isValid(def._id))
              ? new mongoose.Types.ObjectId(def._id)
              : new mongoose.Types.ObjectId();

            const created = await Template.create({
              _id: newTplId,
              name: def.name,
              displayName: def.displayName || def.name,
              icon: def.icon || 'ti ti-file-text',
              description: def.description || '',
              path: def.path || '',
              isSystem: Boolean(def.isSystem),
              sections: def.sections || [],
              standardValues: def.standardValues || {},
              insertOptions: [],
            });
            idMap.set(def._id, created._id);
          }
        } catch (err) {
          logger.warn(`[serializationService] Template definition import notice for '${def.name}': ${err.message}`);
          summary.warnings.push(`Mẫu '${def.name}': ${err.message}`);
        }
      }

      // 1.2 Import Template Items under /root/templates
      const templateItems = (branches.templates || []).slice().sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length);
      for (const itemData of templateItems) {
        const res = await this.upsertSingleItem(itemData, conflictMode, idMap, user);
        if (res.status === 'created') summary.templates.created++;
        else if (res.status === 'updated') summary.templates.updated++;
        else if (res.status === 'skipped') summary.templates.skipped++;
      }
    }

    // =========================================================================
    // STEP 2: IMPORT LAYOUTS & PLACEHOLDERS
    // =========================================================================
    if (selectedBranches.includes('layouts')) {
      logger.info('[serializationService] Step 2A: Importing Layouts...');
      const layoutItems = (branches.layouts || []).slice().sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length);
      for (const itemData of layoutItems) {
        const res = await this.upsertSingleItem(itemData, conflictMode, idMap, user);
        if (res.status === 'created') summary.layouts.created++;
        else if (res.status === 'updated') summary.layouts.updated++;
        else if (res.status === 'skipped') summary.layouts.skipped++;
      }
    }

    if (selectedBranches.includes('placeholders')) {
      logger.info('[serializationService] Step 2B: Importing Placeholders...');
      const placeholderItems = (branches.placeholders || []).slice().sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length);
      for (const itemData of placeholderItems) {
        const res = await this.upsertSingleItem(itemData, conflictMode, idMap, user);
        if (res.status === 'created') summary.placeholders.created++;
        else if (res.status === 'updated') summary.placeholders.updated++;
        else if (res.status === 'skipped') summary.placeholders.skipped++;
      }
    }

    // =========================================================================
    // STEP 3: IMPORT RENDERINGS
    // =========================================================================
    if (selectedBranches.includes('renderings')) {
      logger.info('[serializationService] Step 3: Importing Renderings...');
      const renderingItems = (branches.renderings || []).slice().sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length);
      for (const itemData of renderingItems) {
        const res = await this.upsertSingleItem(itemData, conflictMode, idMap, user);
        if (res.status === 'created') summary.renderings.created++;
        else if (res.status === 'updated') summary.renderings.updated++;
        else if (res.status === 'skipped') summary.renderings.skipped++;
      }
    }

    // =========================================================================
    // STEP 4: IMPORT CONTENT
    // =========================================================================
    if (selectedBranches.includes('content')) {
      logger.info('[serializationService] Step 4: Importing Content...');
      const contentItems = (branches.content || []).slice().sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length);
      for (const itemData of contentItems) {
        const res = await this.upsertSingleItem(itemData, conflictMode, idMap, user);
        if (res.status === 'created') summary.content.created++;
        else if (res.status === 'updated') summary.content.updated++;
        else if (res.status === 'skipped') summary.content.skipped++;
      }
    }

    summary.totalCreated =
      summary.templates.created +
      summary.layouts.created +
      summary.renderings.created +
      summary.placeholders.created +
      summary.content.created;

    summary.totalUpdated =
      summary.templates.updated +
      summary.layouts.updated +
      summary.renderings.updated +
      summary.placeholders.updated +
      summary.content.updated;

    summary.totalSkipped =
      summary.templates.skipped +
      summary.layouts.skipped +
      summary.renderings.skipped +
      summary.placeholders.skipped +
      summary.content.skipped;

    // Emit event for Audit logging
    eventBus.emit('serialization.imported', {
      user,
      summary,
      stats: {
        totalCreated: summary.totalCreated,
        totalUpdated: summary.totalUpdated,
        totalSkipped: summary.totalSkipped,
      },
    });

    logger.info(
      `[serializationService] Import completed. Created: ${summary.totalCreated}, Updated: ${summary.totalUpdated}, Skipped: ${summary.totalSkipped}`
    );

    return {
      success: true,
      stats: summary,
      warnings: summary.warnings,
    };
  }

  /**
   * Upsert a single item into items_master with parent and template resolution
   */
  async upsertSingleItem(itemData, conflictMode, idMap, _user) {
    if (!itemData || !itemData.name) {
      return { status: 'skipped', reason: 'Invalid item data' };
    }

    // Find existing item by exact path or by _id
    let existingItem = null;
    if (itemData.path) {
      existingItem = await Item.findOne({ path: itemData.path });
    }
    if (!existingItem && itemData._id && mongoose.Types.ObjectId.isValid(itemData._id)) {
      existingItem = await Item.findById(itemData._id);
    }

    // Resolve template ID: by templatePath, templateName, or templateId
    let resolvedTemplateId = null;
    if (itemData.templatePath) {
      const tplItem = await Item.findOne({ path: itemData.templatePath });
      if (tplItem) resolvedTemplateId = tplItem._id;
    }
    if (!resolvedTemplateId && itemData.templateName) {
      const tplDef = await Template.findOne({ name: itemData.templateName });
      if (tplDef) resolvedTemplateId = tplDef._id;
    }
    if (!resolvedTemplateId && itemData.templateId) {
      const mappedId = idMap.get(itemData.templateId) || itemData.templateId;
      if (mongoose.Types.ObjectId.isValid(mappedId)) {
        resolvedTemplateId = mappedId;
      }
    }
    // Fallback: If still unresolved, default to standard Page/Item template or system template
    if (!resolvedTemplateId) {
      const defaultTpl = await Template.findOne({ isSystem: true }) || await Template.findOne({});
      if (defaultTpl) resolvedTemplateId = defaultTpl._id;
    }

    // Resolve parent ID and ancestors
    let parentId = null;
    let ancestors = [];
    if (itemData.parentPath) {
      const parentItem = await Item.findOne({ path: itemData.parentPath });
      if (parentItem) {
        parentId = parentItem._id;
        ancestors = [...(parentItem.ancestors || []), parentItem._id];
      }
    }

    // Resolve Presentation references (layoutId, renderingIds)
    let presentation = null;
    if (itemData.presentation) {
      let layoutId = null;
      if (itemData.presentation.layoutPath) {
        const layoutItem = await Item.findOne({ path: itemData.presentation.layoutPath });
        if (layoutItem) layoutId = layoutItem._id;
      }
      if (!layoutId && itemData.presentation.layoutId) {
        const mappedLId = idMap.get(itemData.presentation.layoutId) || itemData.presentation.layoutId;
        if (mongoose.Types.ObjectId.isValid(mappedLId)) layoutId = mappedLId;
      }

      const renderings = [];
      if (Array.isArray(itemData.presentation.renderings)) {
        for (const r of itemData.presentation.renderings) {
          let renderingId = null;
          if (r.renderingPath) {
            const rendItem = await Item.findOne({ path: r.renderingPath });
            if (rendItem) renderingId = rendItem._id;
          }
          if (!renderingId && r.renderingName) {
            const rendItem = await Item.findOne({ name: r.renderingName, path: { $regex: '^/root/layout/Renderings' } });
            if (rendItem) renderingId = rendItem._id;
          }
          if (!renderingId && r.renderingId) {
            const mappedRId = idMap.get(r.renderingId) || r.renderingId;
            if (mongoose.Types.ObjectId.isValid(mappedRId)) renderingId = mappedRId;
          }

          if (renderingId) {
            renderings.push({
              uid: r.uid || randomUUID(),
              renderingId,
              placeholder: r.placeholder || r.placeholderKey || 'maincontent',
              placeholderKey: r.placeholderKey || r.placeholder || 'maincontent',
              sortOrder: r.sortOrder || 100,
              datasourceId: r.datasourceId && mongoose.Types.ObjectId.isValid(r.datasourceId) ? r.datasourceId : null,
              parameters: r.parameters || {},
              hidden: Boolean(r.hidden),
            });
          }
        }
      }

      presentation = {
        layoutId,
        renderings,
      };
    }

    // 1. If item already exists:
    if (existingItem) {
      if (conflictMode === 'SKIP') {
        idMap.set(itemData._id, existingItem._id);
        return { status: 'skipped', item: existingItem };
      }

      if (conflictMode === 'OVERWRITE') {
        idMap.set(itemData._id, existingItem._id);
        existingItem.displayName = itemData.displayName || existingItem.displayName;
        if (itemData.icon) existingItem.icon = itemData.icon;
        if (resolvedTemplateId) existingItem.templateId = resolvedTemplateId;
        if (itemData.sortOrder !== undefined) existingItem.sortOrder = itemData.sortOrder;
        if (itemData.sharedFields) existingItem.sharedFields = itemData.sharedFields;
        if (itemData.languages && itemData.languages.length > 0) existingItem.languages = itemData.languages;
        if (presentation) {
          existingItem.presentation = {
            shared: presentation,
            final: existingItem.presentation?.final || [],
          };
        }

        await existingItem.save();
        return { status: 'updated', item: existingItem };
      }

      if (conflictMode === 'RENAME') {
        const newName = `${itemData.name} - Copy`;
        const newPath = itemData.parentPath ? `${itemData.parentPath}/${newName}` : `/${newName}`;
        const created = await Item.create({
          name: newName,
          displayName: `${itemData.displayName || itemData.name} (Copy)`,
          path: newPath,
          parentId,
          ancestors,
          templateId: resolvedTemplateId,
          sortOrder: (itemData.sortOrder || 100) + 1,
          icon: itemData.icon || null,
          sharedFields: itemData.sharedFields || {},
          languages: itemData.languages || [],
          presentation: presentation ? { shared: presentation, final: [] } : { shared: { layoutId: null, renderings: [] }, final: [] },
        });
        idMap.set(itemData._id, created._id);
        return { status: 'created', item: created };
      }
    }

    // 2. If item does not exist: Create new
    const targetId = (itemData._id && mongoose.Types.ObjectId.isValid(itemData._id))
      ? new mongoose.Types.ObjectId(itemData._id)
      : new mongoose.Types.ObjectId();

    const created = await Item.create({
      _id: targetId,
      name: itemData.name,
      displayName: itemData.displayName || itemData.name,
      path: itemData.path,
      parentId,
      ancestors,
      templateId: resolvedTemplateId,
      sortOrder: itemData.sortOrder || 100,
      icon: itemData.icon || null,
      isSystem: Boolean(itemData.isSystem),
      sharedFields: itemData.sharedFields || {},
      languages: itemData.languages || [],
      presentation: presentation ? { shared: presentation, final: [] } : { shared: { layoutId: null, renderings: [] }, final: [] },
    });

    idMap.set(itemData._id, created._id);
    return { status: 'created', item: created };
  }
}

module.exports = new SerializationService();
