const PublishedItem = require('../models/PublishedItem');
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
   * Combines base fields, shared fields, unversioned fields, and published version fields.
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

    return {
      itemId: item._id,
      path: item.path,
      name: item.name,
      displayName: item.displayName || item.name,
      language: code,
      publishedVersion: langEntry ? langEntry.publishedVersion : 1,
      fields: mergedFields,
    };
  }

  /**
   * Resolve final presentation for a published item in Web store
   * Reads layout and renderings directly from PublishedItem and referenced layout/rendering items in Web.
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

    const sharedPresentation = item.presentation?.shared || {};
    const finalPresentation = langEntry?.finalLayout || {};

    const resolvedLayoutId = finalPresentation.layoutId || sharedPresentation.layoutId || null;

    const renderingsMap = new Map();

    // 1. Shared renderings
    if (Array.isArray(sharedPresentation.renderings)) {
      for (const r of sharedPresentation.renderings) {
        if (!r.hidden && r.uid) {
          renderingsMap.set(r.uid, {
            uid: r.uid,
            renderingId: r.renderingId ? r.renderingId.toString() : null,
            placeholder: r.placeholderKey || r.placeholder || 'maincontent',
            placeholderKey: r.placeholderKey || r.placeholder || 'maincontent',
            sortOrder: r.sortOrder || 100,
            datasourceId: r.datasourceId ? r.datasourceId.toString() : null,
            parameters: toPlainObject(r.parameters),
            origin: 'shared',
          });
        }
      }
    }

    // 2. Final renderings (override shared by uid)
    if (Array.isArray(finalPresentation.renderings)) {
      for (const r of finalPresentation.renderings) {
        if (r.hidden && r.uid) {
          renderingsMap.delete(r.uid);
        } else if (r.uid) {
          const existing = renderingsMap.get(r.uid);
          renderingsMap.set(r.uid, {
            uid: r.uid,
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

    // 3. Resolve Layout Details from PublishedItem
    let layoutDetails = null;
    if (resolvedLayoutId) {
      const layoutItem = await PublishedItem.findById(resolvedLayoutId).lean();
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

    // 4. Resolve Rendering Details from PublishedItem
    const renderingIds = mergedRenderings.map((r) => r.renderingId).filter(Boolean);
    const renderingItems = renderingIds.length > 0
      ? await PublishedItem.find({ _id: { $in: renderingIds } }).lean()
      : [];
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
      };
    });

    // 5. Group by placeholder
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
