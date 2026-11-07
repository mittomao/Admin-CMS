const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const Item = require('../models/Item');
const { AppError } = require('../utils/errors');

/**
 * Helper to convert Map or Object to plain JS object
 */
function toPlainObject(val) {
  if (!val) return {};
  if (val instanceof Map) {
    return Object.fromEntries(val);
  }
  if (typeof val === 'object') {
    return { ...val };
  }
  return {};
}

class WebItemService {
  /**
   * Get a published item by its ObjectId
   * @param {string|mongoose.Types.ObjectId} id
   * @returns {Promise<PublishedItem|null>}
   */
  async getById(id) {
    if (!id) return null;
    return PublishedItem.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
  }

  /**
   * Get a published item by its materialized path (e.g. '/sitecore/content/home')
   * @param {string} path
   * @returns {Promise<PublishedItem|null>}
   */
  async getByPath(path) {
    if (!path) return null;
    const cleanPath = path.trim().replace(/\/+$/, '') || '/';
    // Case-insensitive match or exact trimmed match
    return PublishedItem.findOne({
      path: { $regex: new RegExp(`^${cleanPath}$`, 'i') },
      isDeleted: { $ne: true },
    }).lean();
  }

  /**
   * Get children of a published item
   * @param {string|mongoose.Types.ObjectId} parentId
   * @param {object} options
   * @returns {Promise<Array<PublishedItem>>}
   */
  async getChildren(parentId, _options = {}) {
    if (!parentId) return [];
    const query = { parentId, isDeleted: { $ne: true } };
    return PublishedItem.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }

  /**
   * Resolve fields for a published item for a specific language
   * Combines base fields, shared fields, unversioned fields, published version fields,
   * standard values, and provides dual-key access (field ID & field name).
   * Supports effective templates with component template fields.
   * @param {PublishedItem|object} item
   * @param {string} langCode
   * @returns {Promise<{ fields: object, language: string, publishedVersion: number }>}
   */
  async resolveFields(item, langCode = 'vi') {
    if (!item) {
      throw new AppError('Item is required to resolve fields', 400);
    }

    const code = (langCode || 'vi').toLowerCase().trim();
    const languages = Array.isArray(item.languages) ? item.languages : [];
    const langEntry = languages.find((l) => l.code === code) || null;
    const pubVersion = langEntry ? langEntry.publishedVersion : 1;

    const baseFields = toPlainObject(item.fields);
    const sharedFields = toPlainObject(item.sharedFields);
    const unversionedFields = langEntry ? toPlainObject(langEntry.unversionedFields) : {};
    const versionFields = langEntry ? toPlainObject(langEntry.fields) : {};

    // Standard field priority: Base -> Shared -> Unversioned -> Version
    const mergedFields = {
      ...baseFields,
      ...sharedFields,
      ...unversionedFields,
      ...versionFields,
    };

    // 1. Resolve Effective Template (including Component Templates from Presentation)
    const templateId = item.templateId?._id || item.templateId;
    let template = null;
    if (templateId) {
      try {
        const templateService = require('./templateService');
        template = await templateService.resolveEffectiveTemplate(item, code, pubVersion);
      } catch (err) {
        template = null;
      }
      if (!template) {
        template = await Template.findById(templateId).lean();
      }
    }

    // 2. Fallback Standard Values from template if any field is empty
    if (template && template.standardValues) {
      const stdVals = toPlainObject(template.standardValues);
      for (const [k, v] of Object.entries(stdVals)) {
        if (mergedFields[k] === undefined || mergedFields[k] === null || mergedFields[k] === '') {
          mergedFields[k] = v;
        }
      }
    }

    // 3. Provide dual-key access: both fieldId and fieldName
    if (template && Array.isArray(template.sections)) {
      for (const sec of template.sections) {
        if (Array.isArray(sec.fields)) {
          for (const f of sec.fields) {
            const fid = f._id ? f._id.toString() : '';
            const fname = f.name;
            if (fid && mergedFields[fid] !== undefined && mergedFields[fname] === undefined) {
              mergedFields[fname] = mergedFields[fid];
            } else if (fid && mergedFields[fname] !== undefined && mergedFields[fid] === undefined) {
              mergedFields[fid] = mergedFields[fname];
            }
          }
        }
      }
    }

    return {
      itemId: item._id,
      path: item.path,
      name: item.name,
      displayName: item.displayName || item.name,
      language: code,
      publishedVersion: pubVersion,
      fields: mergedFields,
    };
  }

  /**
   * Resolve final presentation for a published item in Web store
   * Reads layout and renderings directly from PublishedItem and referenced layout/rendering items in Web.
   * Performs complete Delta-merge: Standard (Template) -> Shared -> Final (Version).
   * @param {PublishedItem|object} item
   * @param {string} langCode
   * @returns {Promise<object>}
   */
  async getFinalPresentation(item, langCode = 'vi') {
    if (!item) {
      throw new AppError('Item is required to resolve presentation', 400);
    }

    const code = (langCode || 'vi').toLowerCase().trim();
    const languages = Array.isArray(item.languages) ? item.languages : [];
    const langEntry = languages.find((l) => l.code === code) || null;

    // 1. Fetch Template Standard Presentation
    let standardLayoutId = null;
    let standardRenderings = [];
    const templateId = item.templateId?._id || item.templateId;
    if (templateId) {
      const template = await Template.findById(templateId).lean();
      if (template && template.presentation) {
        standardLayoutId = template.presentation.layoutId ? template.presentation.layoutId.toString() : null;
        if (Array.isArray(template.presentation.renderings)) {
          standardRenderings = template.presentation.renderings;
        }
      }
    }

    // 2. Fetch Shared Presentation & Final Presentation
    const sharedPresentation = item.presentation?.shared || {};
    const finalPresentation = langEntry?.finalLayout || {};

    const resolvedLayoutId = finalPresentation.layoutId || sharedPresentation.layoutId || standardLayoutId || null;

    // 3. Delta-merge Renderings: Standard -> Shared -> Final
    const renderingsMap = new Map();

    // 3.1 Standard renderings
    for (const r of standardRenderings) {
      if (!r.hidden && (r.uid || r.renderingId)) {
        const uid = r.uid || `std-${r.renderingId}`;
        renderingsMap.set(uid, {
          uid,
          renderingId: r.renderingId ? r.renderingId.toString() : null,
          placeholder: r.placeholderKey || r.placeholder || 'maincontent',
          placeholderKey: r.placeholderKey || r.placeholder || 'maincontent',
          sortOrder: r.sortOrder !== undefined ? r.sortOrder : 100,
          datasourceId: r.datasourceId ? r.datasourceId.toString() : null,
          parameters: toPlainObject(r.parameters),
          hidden: false,
          origin: 'standard',
        });
      }
    }

    // 3.2 Shared renderings (override/add/delete)
    if (Array.isArray(sharedPresentation.renderings)) {
      for (const r of sharedPresentation.renderings) {
        const uid = r.uid || (r.renderingId ? r.renderingId.toString() : null);
        if (!uid) continue;
        if (r.hidden) {
          renderingsMap.delete(uid);
        } else {
          const existing = renderingsMap.get(uid);
          renderingsMap.set(uid, {
            uid,
            renderingId: r.renderingId ? r.renderingId.toString() : existing?.renderingId || null,
            placeholder: r.placeholderKey || r.placeholder || existing?.placeholderKey || 'maincontent',
            placeholderKey: r.placeholderKey || r.placeholder || existing?.placeholderKey || 'maincontent',
            sortOrder: r.sortOrder !== undefined ? r.sortOrder : existing?.sortOrder || 100,
            datasourceId: r.datasourceId !== undefined ? (r.datasourceId ? r.datasourceId.toString() : null) : existing?.datasourceId || null,
            parameters: { ...(existing?.parameters || {}), ...toPlainObject(r.parameters) },
            origin: 'shared',
          });
        }
      }
    }

    // 3.3 Final renderings (override/add/delete)
    if (Array.isArray(finalPresentation.renderings)) {
      for (const r of finalPresentation.renderings) {
        const uid = r.uid || (r.renderingId ? r.renderingId.toString() : null);
        if (!uid) continue;
        if (r.hidden) {
          renderingsMap.delete(uid);
        } else {
          const existing = renderingsMap.get(uid);
          renderingsMap.set(uid, {
            uid,
            renderingId: r.renderingId ? r.renderingId.toString() : existing?.renderingId || null,
            placeholder: r.placeholderKey || r.placeholder || existing?.placeholderKey || 'maincontent',
            placeholderKey: r.placeholderKey || r.placeholder || existing?.placeholderKey || 'maincontent',
            sortOrder: r.sortOrder !== undefined ? r.sortOrder : existing?.sortOrder || 100,
            datasourceId: r.datasourceId !== undefined ? (r.datasourceId ? r.datasourceId.toString() : null) : existing?.datasourceId || null,
            parameters: { ...(existing?.parameters || {}), ...toPlainObject(r.parameters) },
            origin: 'final',
          });
        }
      }
    }

    const mergedRenderings = Array.from(renderingsMap.values()).sort((a, b) => {
      const pA = (a.placeholderKey || a.placeholder || '').localeCompare(b.placeholderKey || b.placeholder || '');
      if (pA !== 0) return pA;
      return (a.sortOrder || 100) - (b.sortOrder || 100);
    });

    // 4. Resolve Layout Details (search PublishedItem, fallback to Item)
    let layoutDetails = null;
    if (resolvedLayoutId) {
      let layoutItem = await PublishedItem.findById(resolvedLayoutId).lean();
      if (!layoutItem) {
        layoutItem = await Item.findById(resolvedLayoutId).lean();
      }
      if (layoutItem) {
        const lf = toPlainObject(layoutItem.fields);
        const lsf = toPlainObject(layoutItem.sharedFields);
        layoutDetails = {
          _id: layoutItem._id,
          id: layoutItem._id.toString(),
          name: layoutItem.name,
          displayName: layoutItem.displayName || layoutItem.name,
          viewPath: lsf.viewPath || lf.viewPath || '',
        };
      }
    }

    // 5. Resolve Rendering Details (search PublishedItem, fallback to Item)
    const renderingIds = mergedRenderings.map((r) => r.renderingId).filter(Boolean);
    let renderingItems = renderingIds.length > 0
      ? await PublishedItem.find({ _id: { $in: renderingIds } }).lean()
      : [];

    if (renderingItems.length < renderingIds.length) {
      const foundIds = new Set(renderingItems.map((ri) => ri._id.toString()));
      const missingIds = renderingIds.filter((id) => !foundIds.has(id.toString()));
      if (missingIds.length > 0) {
        const masterRenderings = await Item.find({ _id: { $in: missingIds } }).lean();
        renderingItems = renderingItems.concat(masterRenderings);
      }
    }

    const metaMap = new Map(
      renderingItems.map((ri) => {
        const rf = toPlainObject(ri.fields);
        const rsf = toPlainObject(ri.sharedFields);
        return [
          ri._id.toString(),
          {
            name: ri.name,
            displayName: ri.displayName || ri.name,
            viewPath: rsf.viewPath || rf.viewPath || '',
            icon: rsf.icon || rf.icon || 'ti ti-box',
            componentTemplate: rsf.componentTemplate || rf.componentTemplate || null,
          },
        ];
      })
    );

    const enrichedRenderings = mergedRenderings.map((r) => {
      const meta = r.renderingId ? metaMap.get(r.renderingId) : null;
      return {
        ...r,
        name: meta?.name || 'Component',
        displayName: meta?.displayName || 'Component',
        viewPath: meta?.viewPath || '',
        icon: meta?.icon || 'ti ti-box',
        componentTemplate: r.componentTemplate || meta?.componentTemplate || null,
      };
    });

    // 6. Group by placeholder
    const placeholders = {};
    for (const r of enrichedRenderings) {
      const key = r.placeholderKey || r.placeholder || 'maincontent';
      if (!placeholders[key]) {
        placeholders[key] = [];
      }
      placeholders[key].push(r);
    }

    return {
      itemId: item._id,
      itemPath: item.path,
      itemName: item.name,
      lang: code,
      publishedVersion: langEntry ? langEntry.publishedVersion : 1,
      layoutId: resolvedLayoutId,
      layout: layoutDetails,
      renderings: enrichedRenderings,
      placeholders,
    };
  }
}

module.exports = new WebItemService();
