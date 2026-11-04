const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Template = require('../models/Template');
const logger = require('../utils/logger');

const uuidv4 = () => randomUUID();

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Helper to safely extract map/object
 */
const toPlainObject = (m) => {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m === 'object') return { ...m };
  return {};
};

const presentationService = {
  ConflictError,
  ValidationError,
  NotFoundError,

  /**
   * Validate viewPath against path traversal, whitelist folder, and .ejs extension
   * DEC-033: Cơ chế an toàn viewPath
   */
  validateViewPath(viewPath, checkFileExists = false) {
    if (!viewPath || typeof viewPath !== 'string') {
      throw new ValidationError('viewPath là bắt buộc và phải là chuỗi ký tự.');
    }

    const normalized = viewPath.trim().replace(/\\/g, '/');

    // 1. Chặn Path Traversal (..)
    if (normalized.includes('..')) {
      throw new ValidationError('viewPath không được chứa ký tự ".." (Path Traversal bị chặn).');
    }

    // 2. Bắt buộc kết thúc bằng .ejs
    if (!normalized.toLowerCase().endsWith('.ejs')) {
      throw new ValidationError('viewPath bắt buộc phải có phần mở rộng là ".ejs".');
    }

    // 3. Whitelist thư mục gốc: phải nằm dưới site/ (tương ứng src/views/site/)
    const cleanPath = normalized.startsWith('/') ? normalized.substring(1) : normalized;
    if (!cleanPath.startsWith('site/')) {
      throw new ValidationError('viewPath bắt buộc phải nằm trong thư mục whitelist "site/" (ví dụ: site/layouts/... hoặc site/components/...).');
    }

    // 4. Kiểm tra file tồn tại trên đĩa nếu được yêu cầu
    if (checkFileExists) {
      const fullPath = path.join(process.cwd(), 'src', 'views', cleanPath);
      if (!fs.existsSync(fullPath)) {
        logger.warn(`[validateViewPath] Tệp view vật lý chưa tồn tại trên đĩa: ${fullPath}`);
      }
    }

    return cleanPath;
  },

  /**
   * Get all active Layout items under /sitecore/layout/Layouts/
   */
  async getAllLayouts() {
    const layoutTemplate = await Template.findOne({ name: 'Layout' }).lean();
    const query = {
      path: { $regex: new RegExp('^/sitecore/layout/Layouts/[^/]+$', 'i') },
      deleted: false,
    };
    if (layoutTemplate) {
      query.templateId = layoutTemplate._id;
    }

    const layouts = await Item.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return layouts.map((item) => {
      const fields = toPlainObject(item.fields);
      const sharedFields = toPlainObject(item.sharedFields);
      const viewPath = sharedFields.viewPath || fields.viewPath || '';
      return {
        _id: item._id,
        id: item._id.toString(),
        name: item.name,
        displayName: item.displayName || item.name,
        viewPath,
        sortOrder: item.sortOrder || 100,
        path: item.path,
      };
    });
  },

  /**
   * Get all active Placeholder items under /sitecore/layout/Placeholders/
   */
  async getAllPlaceholders() {
    const placeholderTemplate = await Template.findOne({ name: 'Placeholder' }).lean();
    const query = {
      path: { $regex: new RegExp('^/sitecore/layout/Placeholders/[^/]+$', 'i') },
      deleted: false,
    };
    if (placeholderTemplate) {
      query.templateId = placeholderTemplate._id;
    }

    const placeholders = await Item.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return placeholders.map((item) => {
      const fields = toPlainObject(item.fields);
      const sharedFields = toPlainObject(item.sharedFields);
      const placeholderKey = sharedFields.placeholderKey || fields.placeholderKey || item.name;
      const allowedRenderingsRaw = sharedFields.allowedRenderings || fields.allowedRenderings || '';
      const allowedRenderings = typeof allowedRenderingsRaw === 'string'
        ? allowedRenderingsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(allowedRenderingsRaw) ? allowedRenderingsRaw : [];
      return {
        _id: item._id,
        id: item._id.toString(),
        name: item.name,
        displayName: item.displayName || item.name,
        placeholderKey,
        allowedRenderings,
        description: sharedFields.description || fields.description || '',
        sortOrder: item.sortOrder || 100,
        path: item.path,
      };
    });
  },

  /**
   * Helper trích xuất tên thư mục cha của rendering item (ví dụ Feature, Project, Renderings)
   */
  getRenderingFolder(path) {
    if (!path) return 'Renderings';
    const prefix = '/sitecore/layout/renderings/';
    const lower = path.toLowerCase();
    if (lower.startsWith(prefix)) {
      const relative = path.substring(prefix.length);
      const segments = relative.split('/');
      if (segments.length > 1) {
        return segments[0];
      }
    }
    return 'Renderings';
  },

  /**
   * Get all active Rendering items under /sitecore/layout/Renderings/
   */
  async getAllRenderings() {
    const renderingTemplate = await Template.findOne({ name: 'Rendering' }).lean();
    const query = {
      path: { $regex: new RegExp('^/sitecore/layout/Renderings/.*', 'i') },
      deleted: false,
    };
    if (renderingTemplate) {
      query.templateId = renderingTemplate._id;
    }

    const renderings = await Item.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    const compTplIds = renderings
      .map((item) => {
        const fields = toPlainObject(item.fields);
        const sharedFields = toPlainObject(item.sharedFields);
        return sharedFields.componentTemplate || fields.componentTemplate || null;
      })
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    const compTemplates = await Template.find({ _id: { $in: compTplIds } })
      .select('name displayName')
      .lean();
    const compTplMap = new Map(compTemplates.map((t) => [t._id.toString(), t.displayName || t.name]));

    return renderings.map((item) => {
      const fields = toPlainObject(item.fields);
      const sharedFields = toPlainObject(item.sharedFields);
      const viewPath = sharedFields.viewPath || fields.viewPath || '';
      const compTplId = sharedFields.componentTemplate || fields.componentTemplate || null;
      const folder = this.getRenderingFolder(item.path);
      return {
        _id: item._id,
        id: item._id.toString(),
        name: item.name,
        displayName: item.displayName || item.name,
        viewPath,
        icon: sharedFields.icon || fields.icon || 'ti ti-box',
        componentTemplate: compTplId,
        componentTemplateName: compTplId ? (compTplMap.get(compTplId.toString()) || null) : null,
        parametersTemplate: sharedFields.parametersTemplate || fields.parametersTemplate || null,
        sortOrder: item.sortOrder || 100,
        path: item.path,
        folder,
      };
    });
  },

  /**
   * Get allowed renderings for a given placeholder key or placeholder item ID
   * @param {string} placeholderKeyOrId - Placeholder key or item ID
   * @param {Object} options - { includeAll: boolean, showAll: boolean }
   */
  async getAllowedRenderings(placeholderKeyOrId, options = {}) {
    const allRenderings = await this.getAllRenderings();
    if (!placeholderKeyOrId) {
      const list = allRenderings.map((r) => ({ ...r, isAllowed: true }));
      if (options.includeAll) {
        return {
          hasRestrictions: false,
          renderings: list,
        };
      }
      return list;
    }

    const allPlaceholders = await this.getAllPlaceholders();

    const placeholder = allPlaceholders.find(
      (p) =>
        p.id === placeholderKeyOrId.toString() ||
        p.placeholderKey.toLowerCase() === placeholderKeyOrId.toString().toLowerCase()
    );

    const hasRestrictions = Boolean(
      placeholder && placeholder.allowedRenderings && placeholder.allowedRenderings.length > 0
    );

    const allowedSet = hasRestrictions
      ? new Set(placeholder.allowedRenderings.map((r) => r.toLowerCase()))
      : null;

    const enriched = allRenderings.map((r) => {
      const isAllowed = !hasRestrictions || (
        allowedSet.has(r.id.toLowerCase()) ||
        allowedSet.has(r.name.toLowerCase()) ||
        allowedSet.has(r.displayName.toLowerCase())
      );
      return {
        ...r,
        isAllowed,
      };
    });

    // Sắp xếp: các item isAllowed = true lên trước, sau đó theo sortOrder và displayName
    enriched.sort((a, b) => {
      if (a.isAllowed && !b.isAllowed) return -1;
      if (!a.isAllowed && b.isAllowed) return 1;
      if ((a.sortOrder || 100) !== (b.sortOrder || 100)) {
        return (a.sortOrder || 100) - (b.sortOrder || 100);
      }
      return (a.displayName || a.name).localeCompare(b.displayName || b.name);
    });

    if (options.includeAll) {
      return {
        hasRestrictions,
        renderings: enriched,
      };
    }

    if (options.showAll) {
      return enriched;
    }

    // Default legacy filter cho backward compatibility: chỉ trả về các rendering được phép
    return enriched.filter((r) => r.isAllowed);
  },

  /**
   * Phân giải Final Presentation cho một Item:
   * Độ ưu tiên: Final Layout (version & lang) > Shared Layout > Standard Presentation (từ Template)
   */
  async getFinalPresentation(itemOrId, lang = 'vi', version = 1) {
    let item = null;
    if (typeof itemOrId === 'string' || itemOrId instanceof mongoose.Types.ObjectId) {
      item = await Item.findById(itemOrId).lean();
    } else if (itemOrId && typeof itemOrId === 'object') {
      item = itemOrId;
    }

    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để phân giải Presentation.');
    }

    const currentLang = (lang || 'vi').toLowerCase().trim();
    const currentVersion = Number(version) || 1;

    // 1. Lấy Standard Presentation từ Template
    let standardLayoutId = null;
    let standardRenderings = [];
    const templateId = item.templateId?._id || item.templateId;
    if (templateId) {
      const template = await Template.findById(templateId).lean();
      if (template && template.presentation) {
        standardLayoutId = template.presentation.layoutId || null;
        if (Array.isArray(template.presentation.renderings)) {
          standardRenderings = template.presentation.renderings;
        }
      }
    }

    // 2. Lấy Shared Presentation của Item
    const sharedLayoutId = item.presentation?.shared?.layoutId || null;
    const sharedRenderings = Array.isArray(item.presentation?.shared?.renderings)
      ? item.presentation.shared.renderings
      : [];

    // 3. Lấy Final Presentation theo Language và Version của Item
    let finalLayoutId = null;
    let finalRenderings = [];
    if (Array.isArray(item.presentation?.final)) {
      const finalRec = item.presentation.final.find(
        (f) =>
          f.language?.toLowerCase() === currentLang &&
          Number(f.version) === currentVersion
      );
      if (finalRec) {
        finalLayoutId = finalRec.layoutId || null;
        if (Array.isArray(finalRec.renderings)) {
          finalRenderings = finalRec.renderings;
        }
      }
    }

    // 4. Phân giải Layout ID (Final > Shared > Standard)
    const resolvedLayoutId = finalLayoutId || sharedLayoutId || standardLayoutId || null;

    // 5. Phân giải Renderings (Delta merge: Standard -> Shared -> Final)
    const renderingsMap = new Map();

    // Bước 5.1: Nạp Standard renderings
    for (const r of standardRenderings) {
      if (!r.hidden) {
        const uid = r.uid || uuidv4();
        renderingsMap.set(uid, {
          uid,
          renderingId: r.renderingId ? r.renderingId.toString() : null,
          placeholder: r.placeholderKey || r.placeholder || 'maincontent',
          placeholderKey: r.placeholderKey || r.placeholder || 'maincontent',
          sortOrder: r.sortOrder || 100,
          datasourceId: r.datasourceId ? r.datasourceId.toString() : null,
          parameters: toPlainObject(r.parameters),
          hidden: false,
          origin: 'standard',
        });
      }
    }

    // Bước 5.2: Ghi đè Shared renderings
    for (const r of sharedRenderings) {
      const uid = r.uid || uuidv4();
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
          hidden: false,
          origin: 'shared',
        });
      }
    }

    // Bước 5.3: Ghi đè Final renderings
    for (const r of finalRenderings) {
      const uid = r.uid || uuidv4();
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
          hidden: false,
          origin: 'final',
        });
      }
    }

    const mergedRenderings = Array.from(renderingsMap.values()).sort((a, b) => {
      const pA = (a.placeholderKey || a.placeholder || '').localeCompare(b.placeholderKey || b.placeholder || '');
      if (pA !== 0) return pA;
      return (a.sortOrder || 100) - (b.sortOrder || 100);
    });

    // 6. Gán thêm metadata (viewPath, name, icon) cho Layout và Renderings
    let layoutDetails = null;
    if (resolvedLayoutId) {
      const layoutItem = await Item.findById(resolvedLayoutId).lean();
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

    const allRenderingsMetadata = await this.getAllRenderings();
    const renderingsMetaMap = new Map(allRenderingsMetadata.map((r) => [r.id, r]));

    const enrichedRenderings = mergedRenderings.map((r) => {
      const meta = r.renderingId ? renderingsMetaMap.get(r.renderingId) : null;
      return {
        ...r,
        name: meta?.name || 'Unnamed Component',
        displayName: meta?.displayName || meta?.name || 'Component',
        viewPath: meta?.viewPath || '',
        icon: meta?.icon || 'ti ti-box',
        componentTemplate: meta?.componentTemplate || null,
      };
    });

    // 7. Gom nhóm theo Placeholder Key
    const placeholdersMap = {};
    for (const r of enrichedRenderings) {
      const key = r.placeholderKey || r.placeholder || 'maincontent';
      if (!placeholdersMap[key]) {
        placeholdersMap[key] = [];
      }
      placeholdersMap[key].push(r);
    }

    return {
      itemId: item._id,
      itemPath: item.path,
      itemName: item.name,
      lang: currentLang,
      version: currentVersion,
      layoutId: resolvedLayoutId,
      layout: layoutDetails,
      renderings: enrichedRenderings,
      placeholders: placeholdersMap,
      origins: {
        hasStandard: Boolean(standardLayoutId || standardRenderings.length > 0),
        hasShared: Boolean(sharedLayoutId || sharedRenderings.length > 0),
        hasFinal: Boolean(finalLayoutId || finalRenderings.length > 0),
      },
    };
  },

  /**
   * Get presentation details for Content Editor modal
   */
  async getPresentationDetails(itemId, lang = 'vi', version = 1) {
    const item = await Item.findById(itemId).lean();
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const currentLang = (lang || 'vi').toLowerCase().trim();
    const currentVersion = Number(version) || 1;

    const allLayouts = await this.getAllLayouts();
    const allPlaceholders = await this.getAllPlaceholders();
    const allRenderings = await this.getAllRenderings();

    const merged = await this.getFinalPresentation(item, currentLang, currentVersion);

    // Xác định activeScope mặc định (ưu tiên final nếu đã có override, ngược lại shared)
    let activeScope = 'shared';
    if (merged.origins.hasFinal) {
      activeScope = 'final';
    }

    return {
      item,
      language: currentLang,
      version: currentVersion,
      activeScope,
      allLayouts,
      allPlaceholders,
      allRenderings,
      merged,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : '',
    };
  },

  /**
   * Validate Presentation configuration (Layout & Renderings)
   */
  async validatePresentation(presentationData) {
    if (!presentationData) return;
    const { layoutId, renderings } = presentationData;

    if (layoutId) {
      const layoutItem = await Item.findById(layoutId).populate('templateId').lean();
      if (!layoutItem) {
        throw new ValidationError(`Layout với ID ${layoutId} không tồn tại.`);
      }
      if (!layoutItem.path.toLowerCase().startsWith('/sitecore/layout/layouts')) {
        throw new ValidationError('Layout được chọn phải nằm trong nhánh /sitecore/layout/Layouts.');
      }
      const tplName = layoutItem.templateId?.name || '';
      if (tplName !== 'Layout') {
        throw new ValidationError(`Item ${layoutItem.name} không phải là một Layout hợp lệ (Template: ${tplName}).`);
      }
    }

    if (Array.isArray(renderings)) {
      for (let i = 0; i < renderings.length; i++) {
        const r = renderings[i];
        if (!r.renderingId) continue;

        const renderingItem = await Item.findById(r.renderingId).populate('templateId').lean();
        if (!renderingItem) {
          throw new ValidationError(`Rendering tại vị trí [${i}] với ID ${r.renderingId} không tồn tại.`);
        }
        if (!renderingItem.path.toLowerCase().startsWith('/sitecore/layout/renderings')) {
          throw new ValidationError(`Rendering ${renderingItem.name} phải nằm trong nhánh /sitecore/layout/Renderings.`);
        }
        const tplName = renderingItem.templateId?.name || '';
        if (tplName !== 'Rendering') {
          throw new ValidationError(`Item ${renderingItem.name} không phải là một Rendering hợp lệ (Template: ${tplName}).`);
        }
      }
    }
  },

  /**
   * Lưu cấu hình Presentation cho Item (Shared hoặc Final)
   */
  async savePresentation(itemId, presentationData, scope = 'shared', options = {}) {
    const { lang = 'vi', version = 1, expectedUpdatedAt = null, userId = null } = options;
    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để lưu Presentation.');
    }

    // Optimistic locking
    if (expectedUpdatedAt && item.updatedAt) {
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      const actualTime = new Date(item.updatedAt).getTime();
      if (Math.abs(expectedTime - actualTime) > 1000) {
        throw new ConflictError('Item đã bị chỉnh sửa bởi người dùng khác. Vui lòng tải lại trước khi lưu Presentation.');
      }
    }

    const { layoutId = null, renderings = [] } = presentationData;

    // Validate Layout & Renderings
    await this.validatePresentation({ layoutId, renderings });

    // Format renderings và gán UID nếu chưa có
    const formattedRenderings = renderings.map((r, index) => {
      const phKey = r.placeholderKey || r.placeholder || 'maincontent';
      return {
        uid: r.uid || uuidv4(),
        renderingId: r.renderingId ? new mongoose.Types.ObjectId(r.renderingId) : null,
        placeholder: phKey,
        placeholderKey: phKey,
        sortOrder: r.sortOrder !== undefined ? Number(r.sortOrder) : (index + 1) * 100,
        datasourceId: r.datasourceId ? new mongoose.Types.ObjectId(r.datasourceId) : null,
        parameters: toPlainObject(r.parameters),
        hidden: Boolean(r.hidden),
      };
    });

    if (!item.presentation) {
      item.presentation = { shared: {}, final: [] };
    }

    if (scope === 'shared') {
      item.presentation.shared = {
        layoutId: layoutId ? new mongoose.Types.ObjectId(layoutId) : null,
        renderings: formattedRenderings,
      };
    } else if (scope === 'final') {
      if (!Array.isArray(item.presentation.final)) {
        item.presentation.final = [];
      }

      const targetLang = (lang || 'vi').toLowerCase().trim();
      const targetVersion = Number(version) || 1;

      const idx = item.presentation.final.findIndex(
        (f) => f.language?.toLowerCase() === targetLang && Number(f.version) === targetVersion
      );

      const finalRecord = {
        language: targetLang,
        version: targetVersion,
        layoutId: layoutId ? new mongoose.Types.ObjectId(layoutId) : null,
        renderings: formattedRenderings,
      };

      if (idx >= 0) {
        item.presentation.final[idx] = finalRecord;
      } else {
        item.presentation.final.push(finalRecord);
      }
    } else {
      throw new ValidationError(`Scope "${scope}" không hợp lệ (chỉ chấp nhận 'shared' hoặc 'final').`);
    }

    if (userId) {
      item.updatedBy = userId;
    }
    item.updatedAt = new Date();

    await item.save();
    logger.info(`[presentationService] Saved ${scope} presentation for item: ${item.path} (ID: ${item._id})`);

    // Đồng bộ sang Template document nếu item là một Template (nằm dưới /sitecore/templates hoặc có Template trùng _id)
    if (scope === 'shared') {
      try {
        const isTemplatePath = item.path?.toLowerCase().startsWith('/sitecore/templates');
        const targetTemplate = await Template.findById(item._id);
        if (isTemplatePath || targetTemplate) {
          if (targetTemplate) {
            targetTemplate.presentation = {
              layoutId: layoutId ? new mongoose.Types.ObjectId(layoutId) : null,
              renderings: formattedRenderings,
            };
            if (userId) targetTemplate.updatedBy = userId;
            await targetTemplate.save();
            logger.info(`[presentationService] Đồng bộ Standard Presentation sang Template: ${targetTemplate.name} (${targetTemplate._id})`);
          }
        }
      } catch (syncErr) {
        logger.error(`[presentationService] Lỗi đồng bộ sang Template collection: ${syncErr.message}`);
      }
    }

    try {
      const templateService = require('./templateService');
      templateService.invalidateCache();
    } catch (err) {
      logger.debug(`Could not invalidate template cache: ${err.message}`);
    }

    return this.getFinalPresentation(item, lang, version);
  },

  /**
   * Reset Presentation về Standard Presentation của Template
   */
  async resetToStandard(itemId, scope = 'final', options = {}) {
    const { lang = 'vi', version = 1, expectedUpdatedAt = null, userId = null } = options;
    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để reset Presentation.');
    }

    // Optimistic locking
    if (expectedUpdatedAt && item.updatedAt) {
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      const actualTime = new Date(item.updatedAt).getTime();
      if (Math.abs(expectedTime - actualTime) > 1000) {
        throw new ConflictError('Item đã bị chỉnh sửa bởi người dùng khác. Vui lòng tải lại trước khi reset Presentation.');
      }
    }

    const targetLang = (lang || 'vi').toLowerCase().trim();
    const targetVersion = Number(version) || 1;

    if (scope === 'final' || scope === 'all') {
      if (Array.isArray(item.presentation?.final)) {
        item.presentation.final = item.presentation.final.filter(
          (f) => !(f.language?.toLowerCase() === targetLang && Number(f.version) === targetVersion)
        );
      }
    }

    if (scope === 'shared' || scope === 'all') {
      if (item.presentation?.shared) {
        item.presentation.shared = {
          layoutId: null,
          renderings: [],
        };
      }
    }

    if (userId) {
      item.updatedBy = userId;
    }
    item.updatedAt = new Date();

    await item.save();
    logger.info(`[presentationService] Reset ${scope} presentation for item: ${item.path} (ID: ${item._id})`);

    try {
      const templateService = require('./templateService');
      templateService.invalidateCache();
    } catch (err) {
      logger.debug(`Could not invalidate template cache: ${err.message}`);
    }

    return this.getFinalPresentation(item, lang, version);
  },

  /**
   * Set Standard Presentation on Template
   */
  async setTemplateStandardPresentation(templateId, { layoutId = null, renderings = [] }, options = {}) {
    const template = await Template.findById(templateId);
    if (!template) {
      throw new NotFoundError('Không tìm thấy Template để cấu hình Standard Presentation.');
    }

    await this.validatePresentation({ layoutId, renderings });

    const formattedRenderings = renderings.map((r, index) => {
      const phKey = r.placeholderKey || r.placeholder || 'maincontent';
      return {
        uid: r.uid || uuidv4(),
        renderingId: r.renderingId ? new mongoose.Types.ObjectId(r.renderingId) : null,
        placeholder: phKey,
        placeholderKey: phKey,
        sortOrder: r.sortOrder !== undefined ? Number(r.sortOrder) : (index + 1) * 100,
        datasourceId: r.datasourceId ? new mongoose.Types.ObjectId(r.datasourceId) : null,
        parameters: toPlainObject(r.parameters),
        hidden: Boolean(r.hidden),
      };
    });

    template.presentation = {
      layoutId: layoutId ? new mongoose.Types.ObjectId(layoutId) : null,
      renderings: formattedRenderings,
    };

    if (options.userId) {
      template.updatedBy = options.userId;
    }

    await template.save();
    logger.info(`[presentationService] Set Standard Presentation on Template: ${template.name}`);

    // Đồng bộ ngược lại sang Item.presentation.shared nếu có Item tương ứng trong cây Content Tree
    try {
      const item = await Item.findById(template._id);
      if (item) {
        if (!item.presentation) item.presentation = { shared: {}, final: [] };
        item.presentation.shared = {
          layoutId: layoutId ? new mongoose.Types.ObjectId(layoutId) : null,
          renderings: formattedRenderings,
        };
        if (options.userId) item.updatedBy = options.userId;
        await item.save();
        logger.info(`[presentationService] Đồng bộ ngược lại Item.presentation.shared: ${item.path} (${item._id})`);
      }
    } catch (syncErr) {
      logger.error(`[presentationService] Lỗi đồng bộ ngược lại Item: ${syncErr.message}`);
    }

    try {
      const templateService = require('./templateService');
      templateService.invalidateCache();
    } catch (err) {
      logger.debug(`Could not invalidate template cache: ${err.message}`);
    }

    return template;
  },

  /**
   * Kiểm tra xem Layout hoặc Rendering có đang được Template hoặc Item nào sử dụng hay không
   */
  async getUsage(layoutOrRenderingId) {
    if (!layoutOrRenderingId) return { inUse: false, templates: [], items: [] };
    const id = new mongoose.Types.ObjectId(layoutOrRenderingId);

    // 1. Kiểm tra trong Templates
    const templates = await Template.find({
      $or: [
        { 'presentation.layoutId': id },
        { 'presentation.renderings.renderingId': id },
      ],
    })
      .select('name displayName')
      .lean();

    // 2. Kiểm tra trong Items (shared và final)
    const items = await Item.find({
      deleted: false,
      $or: [
        { 'presentation.shared.layoutId': id },
        { 'presentation.shared.renderings.renderingId': id },
        { 'presentation.final.layoutId': id },
        { 'presentation.final.renderings.renderingId': id },
      ],
    })
      .select('name displayName path')
      .lean();

    return {
      inUse: templates.length > 0 || items.length > 0,
      templates,
      items,
    };
  },

  /**
   * Kiểm tra các item tham chiếu tới Datasource item
   */
  async getReferences(datasourceItemId) {
    if (!datasourceItemId) return [];
    const id = new mongoose.Types.ObjectId(datasourceItemId);

    const items = await Item.find({
      deleted: false,
      $or: [
        { 'presentation.shared.renderings.datasourceId': id },
        { 'presentation.final.renderings.datasourceId': id },
      ],
    })
      .select('name displayName path')
      .lean();

    return items;
  },
};

module.exports = presentationService;
