const { randomUUID } = require('crypto');
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
   * Helper to resolve device by ID, Name or fallback to default device
   */
  async resolveDevice(deviceIdOrName = null) {
    let device = null;
    if (deviceIdOrName) {
      if (deviceIdOrName.toString().match(/^[0-9a-fA-F]{24}$/)) {
        device = await Item.findById(deviceIdOrName).lean();
      }
      if (!device) {
        device = await Item.findOne({
          path: { $regex: new RegExp(`^/sitecore/layout/Devices/${deviceIdOrName}$`, 'i') },
          deleted: false,
        }).lean();
      }
    }

    if (!device) {
      // Find default device
      device = await Item.findOne({
        path: { $regex: new RegExp('^/sitecore/layout/Devices/', 'i') },
        $or: [
          { 'sharedFields.isDefault': true },
          { 'fields.isDefault': true },
          { name: 'Default' },
        ],
        deleted: false,
      }).lean();
    }

    return device;
  },

  /**
   * Get all active Devices in CMS
   */
  async getAllDevices() {
    const devices = await Item.find({
      path: { $regex: new RegExp('^/sitecore/layout/Devices/[^/]+$', 'i') },
      deleted: false,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return devices.map((d) => {
      const fields = toPlainObject(d.sharedFields || d.fields);
      return {
        _id: d._id,
        name: d.name,
        displayName: d.displayName || d.name,
        isDefault: Boolean(fields.isDefault),
        userAgentRegex: fields.userAgentRegex || '',
        fallbackDeviceId: fields.fallbackDeviceId || null,
      };
    });
  },

  /**
   * Get all active Layouts in CMS
   */
  async getAllLayouts() {
    const layouts = await Item.find({
      path: { $regex: new RegExp('^/sitecore/layout/Layouts/[^/]+$', 'i') },
      deleted: false,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return layouts.map((l) => {
      const fields = toPlainObject(l.sharedFields || l.fields);
      const placeholdersRaw = fields.placeholders || '';
      const placeholders = typeof placeholdersRaw === 'string'
        ? placeholdersRaw.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      return {
        _id: l._id,
        name: l.name,
        displayName: l.displayName || l.name,
        componentName: fields.componentName || l.name,
        placeholders,
      };
    });
  },

  /**
   * Get all active Renderings in CMS
   */
  async getAllRenderings() {
    const renderings = await Item.find({
      path: { $regex: new RegExp('^/sitecore/layout/Renderings/[^/]+$', 'i') },
      deleted: false,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return renderings.map((r) => {
      const fields = toPlainObject(r.sharedFields || r.fields);
      return {
        _id: r._id,
        name: r.name,
        displayName: r.displayName || r.name,
        componentName: fields.componentName || r.name,
        icon: fields.icon || 'ti ti-box',
        datasourceTemplate: fields.datasourceTemplate || null,
        datasourceLocation: fields.datasourceLocation || null,
        parametersTemplate: fields.parametersTemplate || null,
      };
    });
  },

  /**
   * Get all Placeholder Settings in CMS
   */
  async getAllPlaceholderSettings() {
    const settings = await Item.find({
      path: { $regex: new RegExp('^/sitecore/layout/Placeholder Settings/[^/]+$', 'i') },
      deleted: false,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return settings.map((s) => {
      const fields = toPlainObject(s.sharedFields || s.fields);
      let allowedRenderings = [];
      if (typeof fields.allowedRenderings === 'string') {
        allowedRenderings = fields.allowedRenderings.split(',').map((x) => x.trim()).filter(Boolean);
      } else if (Array.isArray(fields.allowedRenderings)) {
        allowedRenderings = fields.allowedRenderings.map((x) => x.toString());
      }

      return {
        _id: s._id,
        name: s.name,
        displayName: s.displayName || s.name,
        placeholderKey: fields.placeholderKey || s.name,
        allowedRenderings,
        description: fields.description || '',
      };
    });
  },

  /**
   * Match a placeholder key against Placeholder Settings
   * Rules (DEC-022):
   * 1. Exact match (e.g. key === 'main')
   * 2. Wildcard match (e.g. 'column-{*}' matches 'column-1', 'column-left')
   * 3. Nested placeholder key (e.g. '/main/column-1' extracts the last segment 'column-1')
   */
  async matchPlaceholderSettings(placeholderKey) {
    if (!placeholderKey) return null;
    const key = placeholderKey.trim();
    const settings = await this.getAllPlaceholderSettings();

    // Clean nested key: /main/column-1 -> column-1
    const segments = key.split('/').filter(Boolean);
    const leafKey = segments[segments.length - 1] || key;

    // 1. Exact match
    const exact = settings.find(
      (s) => s.placeholderKey.toLowerCase() === key.toLowerCase() || s.placeholderKey.toLowerCase() === leafKey.toLowerCase()
    );
    if (exact) return exact;

    // 2. Wildcard match (e.g., column-{*})
    for (const setting of settings) {
      if (setting.placeholderKey.includes('{*}')) {
        const regexStr = '^' + setting.placeholderKey.replace('{*}', '.*') + '$';
        const reg = new RegExp(regexStr, 'i');
        if (reg.test(leafKey) || reg.test(key)) {
          return setting;
        }
      }
    }

    return null;
  },

  /**
   * Get allowed renderings for a given placeholder key
   */
  async getAllowedRenderings(placeholderKey) {
    const matched = await this.matchPlaceholderSettings(placeholderKey);
    const allRenderings = await this.getAllRenderings();

    if (!matched || !matched.allowedRenderings || matched.allowedRenderings.length === 0) {
      // If no placeholder settings defined, return all renderings as fallback
      return allRenderings;
    }

    const allowedSet = new Set(matched.allowedRenderings.map((x) => x.toLowerCase()));
    return allRenderings.filter((r) =>
      allowedSet.has(r._id.toString().toLowerCase()) || allowedSet.has(r.name.toLowerCase())
    );
  },

  /**
   * Resolve merged presentation (Standard -> Shared -> Final Delta)
   * Algorithm according to DEC-020 and DEC-021.
   */
  async getFinalPresentation(itemOrId, deviceIdOrName = null, lang = 'vi', version = 1) {
    let item = itemOrId;
    if (typeof itemOrId === 'string' || itemOrId instanceof mongoose.Types.ObjectId) {
      item = await Item.findById(itemOrId).lean();
    }
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để lấy Presentation.');
    }

    const device = await this.resolveDevice(deviceIdOrName);
    if (!device) {
      throw new NotFoundError('Không tìm thấy Thiết bị (Device) hợp lệ.');
    }
    const targetDeviceIdStr = device._id.toString();

    // 1. Lấy Standard Presentation từ Template
    let standardDeviceConfig = null;
    const templateId = item.templateId?._id || item.templateId;
    if (templateId) {
      const template = await Template.findById(templateId).lean();
      if (template && template.presentation && Array.isArray(template.presentation.devices)) {
        standardDeviceConfig = template.presentation.devices.find(
          (d) => d.deviceId && d.deviceId.toString() === targetDeviceIdStr
        );
      }
    }

    let resolvedLayoutId = standardDeviceConfig?.layoutId || null;
    const renderingsMap = new Map(); // Key: uid, Value: rendering object

    // Step A: Load Standard Renderings
    if (standardDeviceConfig && Array.isArray(standardDeviceConfig.renderings)) {
      standardDeviceConfig.renderings.forEach((r) => {
        if (!r.hidden) {
          renderingsMap.set(r.uid, {
            uid: r.uid,
            renderingId: r.renderingId,
            placeholder: r.placeholder || 'main',
            sortOrder: r.sortOrder || 100,
            datasourceId: r.datasourceId || null,
            parameters: toPlainObject(r.parameters),
            hidden: false,
            origin: 'standard',
          });
        }
      });
    }

    // Step B: Merge Shared Layout Delta
    const sharedDeviceConfig = (item.presentation?.shared?.devices || []).find(
      (d) => d.deviceId && d.deviceId.toString() === targetDeviceIdStr
    );

    if (sharedDeviceConfig) {
      if (sharedDeviceConfig.layoutId) {
        resolvedLayoutId = sharedDeviceConfig.layoutId;
      }
      if (Array.isArray(sharedDeviceConfig.renderings)) {
        sharedDeviceConfig.renderings.forEach((r) => {
          if (r.hidden) {
            renderingsMap.delete(r.uid);
          } else {
            const existing = renderingsMap.get(r.uid);
            renderingsMap.set(r.uid, {
              uid: r.uid,
              renderingId: r.renderingId || existing?.renderingId,
              placeholder: r.placeholder || existing?.placeholder || 'main',
              sortOrder: r.sortOrder !== undefined ? r.sortOrder : (existing?.sortOrder || 100),
              datasourceId: r.datasourceId !== undefined ? r.datasourceId : (existing?.datasourceId || null),
              parameters: {
                ...(existing?.parameters || {}),
                ...toPlainObject(r.parameters),
              },
              hidden: false,
              origin: 'shared',
            });
          }
        });
      }
    }

    // Step C: Merge Final Layout Delta (language + version)
    const normalizedLang = (lang || 'vi').toLowerCase().trim();
    const normalizedVer = parseInt(version, 10) || 1;

    const finalRecord = (item.presentation?.final || []).find(
      (f) => f.language === normalizedLang && f.version === normalizedVer
    );

    const finalDeviceConfig = (finalRecord?.devices || []).find(
      (d) => d.deviceId && d.deviceId.toString() === targetDeviceIdStr
    );

    if (finalDeviceConfig) {
      if (finalDeviceConfig.layoutId) {
        resolvedLayoutId = finalDeviceConfig.layoutId;
      }
      if (Array.isArray(finalDeviceConfig.renderings)) {
        finalDeviceConfig.renderings.forEach((r) => {
          if (r.hidden) {
            renderingsMap.delete(r.uid);
          } else {
            const existing = renderingsMap.get(r.uid);
            renderingsMap.set(r.uid, {
              uid: r.uid,
              renderingId: r.renderingId || existing?.renderingId,
              placeholder: r.placeholder || existing?.placeholder || 'main',
              sortOrder: r.sortOrder !== undefined ? r.sortOrder : (existing?.sortOrder || 100),
              datasourceId: r.datasourceId !== undefined ? r.datasourceId : (existing?.datasourceId || null),
              parameters: {
                ...(existing?.parameters || {}),
                ...toPlainObject(r.parameters),
              },
              hidden: false,
              origin: 'final',
            });
          }
        });
      }
    }

    // Step D: Enrich metadata (Rendering component name, icon, Datasource path)
    const allRenderings = await this.getAllRenderings();
    const renderingMetaMap = new Map(allRenderings.map((r) => [r._id.toString(), r]));

    const datasourceIds = Array.from(renderingsMap.values())
      .map((r) => r.datasourceId)
      .filter((id) => id && id.toString().match(/^[0-9a-fA-F]{24}$/));

    const datasourceItems = datasourceIds.length > 0
      ? await Item.find({ _id: { $in: datasourceIds }, deleted: false }, { path: 1, name: 1, displayName: 1 }).lean()
      : [];
    const datasourceMetaMap = new Map(datasourceItems.map((ds) => [ds._id.toString(), ds]));

    const sortedRenderings = Array.from(renderingsMap.values())
      .map((r) => {
        const rMeta = r.renderingId ? renderingMetaMap.get(r.renderingId.toString()) : null;
        const dsMeta = r.datasourceId ? datasourceMetaMap.get(r.datasourceId.toString()) : null;

        return {
          ...r,
          renderingName: rMeta?.name || 'Unknown',
          displayName: rMeta?.displayName || rMeta?.name || 'Unknown Rendering',
          componentName: rMeta?.componentName || 'UnknownComponent',
          icon: rMeta?.icon || 'ti ti-box',
          datasourcePath: dsMeta?.path || null,
          datasourceName: dsMeta?.displayName || dsMeta?.name || null,
        };
      })
      .sort((a, b) => {
        if (a.placeholder !== b.placeholder) {
          return a.placeholder.localeCompare(b.placeholder);
        }
        return a.sortOrder - b.sortOrder;
      });

    // Group into placeholders map
    const placeholdersMap = {};
    sortedRenderings.forEach((r) => {
      if (!placeholdersMap[r.placeholder]) {
        placeholdersMap[r.placeholder] = [];
      }
      placeholdersMap[r.placeholder].push(r);
    });

    // Layout info
    let layoutInfo = null;
    if (resolvedLayoutId) {
      const allLayouts = await this.getAllLayouts();
      layoutInfo = allLayouts.find((l) => l._id.toString() === resolvedLayoutId.toString()) || null;
    }

    return {
      itemId: item._id,
      language: normalizedLang,
      version: normalizedVer,
      device: {
        _id: device._id,
        name: device.name,
        displayName: device.displayName || device.name,
        isDefault: Boolean(device.sharedFields?.isDefault || device.fields?.isDefault),
      },
      layoutId: resolvedLayoutId,
      layout: layoutInfo,
      renderings: sortedRenderings,
      placeholders: placeholdersMap,
    };
  },

  /**
   * Get Presentation details for UI Modal
   */
  async getPresentationDetails(itemId, deviceIdOrName = null, lang = 'vi', version = 1) {
    const item = await Item.findById(itemId).populate('templateId').lean();
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const allDevices = await this.getAllDevices();
    const currentDevice = await this.resolveDevice(deviceIdOrName);
    const targetDeviceIdStr = currentDevice?._id.toString();

    const normalizedLang = (lang || 'vi').toLowerCase().trim();
    const normalizedVer = parseInt(version, 10) || 1;

    // Check configuration level
    const template = item.templateId;
    const hasStandard = Boolean(
      template?.presentation?.devices?.some((d) => d.deviceId?.toString() === targetDeviceIdStr)
    );
    const hasShared = Boolean(
      item.presentation?.shared?.devices?.some((d) => d.deviceId?.toString() === targetDeviceIdStr)
    );
    const hasFinal = Boolean(
      item.presentation?.final?.some(
        (f) =>
          f.language === normalizedLang &&
          f.version === normalizedVer &&
          f.devices?.some((d) => d.deviceId?.toString() === targetDeviceIdStr)
      )
    );

    let activeScope = 'standard';
    if (hasFinal) activeScope = 'final';
    else if (hasShared) activeScope = 'shared';

    const merged = await this.getFinalPresentation(item, currentDevice._id, normalizedLang, normalizedVer);
    const allLayouts = await this.getAllLayouts();
    const allPlaceholderSettings = await this.getAllPlaceholderSettings();

    return {
      item: {
        _id: item._id,
        name: item.name,
        displayName: item.displayName || item.name,
        path: item.path,
        updatedAt: item.updatedAt,
      },
      currentDevice,
      allDevices,
      allLayouts,
      allPlaceholderSettings,
      activeScope,
      hasStandard,
      hasShared,
      hasFinal,
      merged,
      language: normalizedLang,
      version: normalizedVer,
    };
  },

  /**
   * Save Presentation changes (Shared or Final)
   * Enforces Optimistic Locking with expectedUpdatedAt
   */
  async savePresentation(
    itemId,
    presentationData,
    scope = 'shared',
    { lang = 'vi', version = 1, expectedUpdatedAt = null, userId = null } = {}
  ) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để lưu Presentation.');
    }

    // 1. Optimistic Locking check (409)
    if (expectedUpdatedAt && item.updatedAt) {
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      const actualTime = new Date(item.updatedAt).getTime();
      if (Math.abs(expectedTime - actualTime) > 1000) {
        throw new ConflictError(
          'Dữ liệu đã được người dùng khác cập nhật trong phiên làm việc. Vui lòng tải lại trang trước khi lưu.'
        );
      }
    }

    const { deviceId, layoutId, renderings = [] } = presentationData;
    if (!deviceId) {
      throw new ValidationError('Thiếu Device ID cho cấu hình Presentation.');
    }

    // 2. Validate and sanitize rendering instances
    const cleanRenderings = [];
    for (let i = 0; i < renderings.length; i++) {
      const r = renderings[i];
      const uid = r.uid && typeof r.uid === 'string' && r.uid.trim() ? r.uid.trim() : uuidv4();
      if (!r.renderingId) {
        throw new ValidationError(`Rendering ở vị trí ${i + 1} chưa chọn Component.`);
      }

      cleanRenderings.push({
        uid,
        renderingId: r.renderingId,
        placeholder: (r.placeholder || 'main').trim(),
        sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : (i + 1) * 100,
        datasourceId: r.datasourceId || null,
        parameters: toPlainObject(r.parameters),
        hidden: Boolean(r.hidden),
      });
    }

    const normalizedLang = (lang || 'vi').toLowerCase().trim();
    const normalizedVer = parseInt(version, 10) || 1;
    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);
    const layoutObjectId = layoutId ? new mongoose.Types.ObjectId(layoutId) : null;

    if (!item.presentation) {
      item.presentation = { shared: { devices: [] }, final: [] };
    }

    if (scope === 'shared') {
      // Update Shared Presentation
      if (!item.presentation.shared) {
        item.presentation.shared = { devices: [] };
      }
      const existingDeviceIdx = item.presentation.shared.devices.findIndex(
        (d) => d.deviceId && d.deviceId.toString() === deviceId.toString()
      );

      const devicePayload = {
        deviceId: deviceObjectId,
        layoutId: layoutObjectId,
        renderings: cleanRenderings,
      };

      if (existingDeviceIdx >= 0) {
        item.presentation.shared.devices[existingDeviceIdx] = devicePayload;
      } else {
        item.presentation.shared.devices.push(devicePayload);
      }
    } else {
      // Update Final Presentation for language & version
      const devicePayload = {
        deviceId: deviceObjectId,
        layoutId: layoutObjectId,
        renderings: cleanRenderings,
      };

      const finalArray = Array.isArray(item.presentation.final)
        ? item.presentation.final.map((f) => (typeof f.toObject === 'function' ? f.toObject() : { ...f }))
        : [];

      const langRecordIdx = finalArray.findIndex(
        (f) => f.language === normalizedLang && f.version === normalizedVer
      );

      if (langRecordIdx >= 0) {
        const langRecord = finalArray[langRecordIdx];
        const devices = Array.isArray(langRecord.devices) ? [...langRecord.devices] : [];
        const existingDeviceIdx = devices.findIndex(
          (d) => d.deviceId && d.deviceId.toString() === deviceId.toString()
        );
        if (existingDeviceIdx >= 0) {
          devices[existingDeviceIdx] = devicePayload;
        } else {
          devices.push(devicePayload);
        }
        langRecord.devices = devices;
        finalArray[langRecordIdx] = langRecord;
      } else {
        finalArray.push({
          language: normalizedLang,
          version: normalizedVer,
          devices: [devicePayload],
        });
      }

      item.presentation.final = finalArray;
    }

    item.markModified('presentation');
    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    logger.info(`[Presentation] Saved ${scope} presentation for item: ${item.path} (${item._id})`);
    return {
      success: true,
      itemId: item._id,
      scope,
      language: normalizedLang,
      version: normalizedVer,
      updatedAt: item.updatedAt,
    };
  },

  /**
   * Reset Presentation to Standard (Template defaults)
   */
  async resetToStandard(
    itemId,
    scope = 'all',
    { lang = 'vi', version = 1, deviceId = null, expectedUpdatedAt = null, userId = null } = {}
  ) {
    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item để khôi phục Presentation.');
    }

    if (expectedUpdatedAt && item.updatedAt) {
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      const actualTime = new Date(item.updatedAt).getTime();
      if (Math.abs(expectedTime - actualTime) > 1000) {
        throw new ConflictError(
          'Dữ liệu đã được người dùng khác cập nhật. Vui lòng tải lại trang trước khi khôi phục.'
        );
      }
    }

    const normalizedLang = (lang || 'vi').toLowerCase().trim();
    const normalizedVer = parseInt(version, 10) || 1;

    if (scope === 'final' || scope === 'all') {
      if (Array.isArray(item.presentation?.final)) {
        if (deviceId) {
          const rec = item.presentation.final.find(
            (f) => f.language === normalizedLang && f.version === normalizedVer
          );
          if (rec && Array.isArray(rec.devices)) {
            rec.devices = rec.devices.filter((d) => d.deviceId && d.deviceId.toString() !== deviceId.toString());
          }
        } else {
          item.presentation.final = item.presentation.final.filter(
            (f) => !(f.language === normalizedLang && f.version === normalizedVer)
          );
        }
      }
    }

    if (scope === 'shared' || scope === 'all') {
      if (item.presentation?.shared?.devices) {
        if (deviceId) {
          item.presentation.shared.devices = item.presentation.shared.devices.filter(
            (d) => d.deviceId && d.deviceId.toString() !== deviceId.toString()
          );
        } else {
          item.presentation.shared.devices = [];
        }
      }
    }

    item.markModified('presentation');
    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    logger.info(`[Presentation] Reset to standard (${scope}) for item: ${item.path}`);
    return {
      success: true,
      itemId: item._id,
      scope,
      updatedAt: item.updatedAt,
    };
  },

  /**
   * Set Standard Presentation on Template
   */
  async setTemplateStandardPresentation(templateId, { deviceId, layoutId, renderings = [] }, { userId = null } = {}) {
    const template = await Template.findById(templateId);
    if (!template) {
      throw new NotFoundError('Không tìm thấy Template.');
    }

    if (!template.presentation) {
      template.presentation = { devices: [] };
    }

    const cleanRenderings = [];
    for (let i = 0; i < renderings.length; i++) {
      const r = renderings[i];
      const uid = r.uid && typeof r.uid === 'string' && r.uid.trim() ? r.uid.trim() : uuidv4();
      cleanRenderings.push({
        uid,
        renderingId: r.renderingId,
        placeholder: (r.placeholder || 'main').trim(),
        sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : (i + 1) * 100,
        datasourceId: r.datasourceId || null,
        parameters: toPlainObject(r.parameters),
        hidden: Boolean(r.hidden),
      });
    }

    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);
    const layoutObjectId = layoutId ? new mongoose.Types.ObjectId(layoutId) : null;

    const existingDeviceIdx = template.presentation.devices.findIndex(
      (d) => d.deviceId && d.deviceId.toString() === deviceId.toString()
    );

    const payload = {
      deviceId: deviceObjectId,
      layoutId: layoutObjectId,
      renderings: cleanRenderings,
    };

    if (existingDeviceIdx >= 0) {
      template.presentation.devices[existingDeviceIdx] = payload;
    } else {
      template.presentation.devices.push(payload);
    }

    template.markModified('presentation');
    template.updatedBy = userId;
    await template.save();
    return { success: true, templateId: template._id };
  },

  /**
   * Integrity Check: get all usage of a Layout or Rendering
   */
  async getUsage(layoutOrRenderingId) {
    const id = layoutOrRenderingId.toString();

    // Check templates
    const templatesWithLayout = await Template.find({
      'presentation.devices.layoutId': id,
    }, { name: 1, displayName: 1 }).lean();

    const templatesWithRendering = await Template.find({
      'presentation.devices.renderings.renderingId': id,
    }, { name: 1, displayName: 1 }).lean();

    // Check items (shared + final)
    const itemsWithLayout = await Item.find({
      $or: [
        { 'presentation.shared.devices.layoutId': id },
        { 'presentation.final.devices.layoutId': id },
      ],
      deleted: false,
    }, { path: 1, name: 1, displayName: 1 }).lean();

    const itemsWithRendering = await Item.find({
      $or: [
        { 'presentation.shared.devices.renderings.renderingId': id },
        { 'presentation.final.devices.renderings.renderingId': id },
      ],
      deleted: false,
    }, { path: 1, name: 1, displayName: 1 }).lean();

    const totalUsage =
      templatesWithLayout.length +
      templatesWithRendering.length +
      itemsWithLayout.length +
      itemsWithRendering.length;

    return {
      id,
      inUse: totalUsage > 0,
      totalUsage,
      templates: [...templatesWithLayout, ...templatesWithRendering],
      items: [...itemsWithLayout, ...itemsWithRendering],
    };
  },

  /**
   * Integrity Check: get all items referencing a datasource item
   */
  async getReferences(datasourceItemId) {
    const id = datasourceItemId.toString();

    const referencingItems = await Item.find({
      $or: [
        { 'presentation.shared.devices.renderings.datasourceId': id },
        { 'presentation.final.devices.renderings.datasourceId': id },
      ],
      deleted: false,
    }, { path: 1, name: 1, displayName: 1 }).lean();

    return {
      datasourceId: id,
      referenced: referencingItems.length > 0,
      count: referencingItems.length,
      items: referencingItems,
    };
  },
};

module.exports = presentationService;
