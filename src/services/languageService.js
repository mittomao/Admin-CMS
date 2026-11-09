'use strict';

/**
 * Treecraft CMS - Language Service (GĐ L1 / DEC-048)
 * Single Source of Truth for system languages and multilingual configuration.
 * Manages Language Items under /root/system/Languages, in-memory caching,
 * event bus notifications, BCP 47 validation, and safe deletion.
 */

const mongoose = require('mongoose');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const Setting = require('../models/Setting');
const eventBus = require('../utils/eventBus');
const branding = require('../config/branding');
const logger = require('../utils/logger');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');

const SETTING_KEY = 'siteLanguages';
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// BCP 47 simplified regex: 2-3 alpha characters followed by optional subtag (e.g., vi, en, ja, fr-FR, zh-CN)
const BCP47_REGEX = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)?$/;

// Standard fallback languages when system items are not yet seeded or during early bootstrap
const FALLBACK_LANGUAGES = [
  {
    code: 'vi',
    displayName: 'Tiếng Việt',
    nativeName: 'Tiếng Việt',
    direction: 'ltr',
    enabled: true,
    sortOrder: 10,
    fallbackLanguage: '',
    urlPrefix: 'vi',
    flagIcon: 'ti ti-world',
    isDefault: true,
  },
  {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    direction: 'ltr',
    enabled: true,
    sortOrder: 20,
    fallbackLanguage: 'vi',
    urlPrefix: 'en',
    flagIcon: 'ti ti-world',
    isDefault: false,
  },
];

class LanguageService {
  constructor() {
    this._cache = new Map(); // key -> { data, expiresAt }

    // Register event listener for automatic local cache invalidation
    eventBus.on('language.cache.invalidate', () => {
      this.invalidateCache();
    });
  }

  /**
   * Invalidate in-memory cache
   */
  invalidateCache() {
    this._cache.clear();
  }

  /**
   * Normalize BCP 47 language code (lowercase primary, uppercase subtag if 2 chars, e.g. 'fr-FR', 'vi', 'en')
   * @param {string} code
   * @returns {string}
   */
  normalizeCode(code) {
    if (!code || typeof code !== 'string') return '';
    const clean = code.trim();
    if (!BCP47_REGEX.test(clean)) {
      throw new ValidationError(`Mã ngôn ngữ không hợp lệ theo chuẩn BCP 47: "${code}". Ví dụ: vi, en, ja, fr-FR.`);
    }

    const parts = clean.split('-');
    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }

  /**
   * Get default language code configured in settings
   * @returns {Promise<string>}
   */
  async getDefaultLanguageCode() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return 'vi';
      }
      const setting = await Setting.findOne({ key: SETTING_KEY }).lean();
      if (setting && setting.value && setting.value.defaultLanguage) {
        return setting.value.defaultLanguage.toLowerCase();
      }
    } catch (err) {
      logger.warn(`[LanguageService] Error getting default language code: ${err.message}`);
    }
    return 'vi';
  }

  /**
   * Ensure system templates and folder exist under /root/system/Languages
   * @returns {Promise<{ folderItem: object, languageTemplate: object }>}
   */
  async ensureSystemStructure() {
    const sysPath = branding.PATHS.SYSTEM;
    const langFolderPath = branding.PATHS.SYSTEM_LANGUAGES;
    const sysTplPath = branding.PATHS.SYSTEM_TEMPLATES;

    // 1. Ensure Templates Folder Template & Language Template
    let folderTpl = await Template.findOne({ name: 'Languages Folder' });
    if (!folderTpl) {
      folderTpl = await Template.create({
        name: 'Languages Folder',
        displayName: 'Languages Folder',
        icon: 'ti ti-folder',
        isSystem: true,
        description: 'System folder item to organize language items',
        path: `${sysTplPath}/Languages Folder`,
        sections: [{ name: 'Folder Info', sortOrder: 10, fields: [] }],
      });
    }

    let langTpl = await Template.findOne({ name: 'Language' });
    if (!langTpl) {
      langTpl = await Template.create({
        name: 'Language',
        displayName: 'Language',
        icon: 'ti ti-language',
        isSystem: true,
        description: 'System template defining language attributes and locale settings',
        path: `${sysTplPath}/Language`,
        sections: [
          {
            name: 'Language Definition',
            sortOrder: 10,
            fields: [
              { name: 'code', title: 'Language Code', type: 'Single-Line Text', required: true, shared: true, sortOrder: 10 },
              { name: 'displayName', title: 'Display Name', type: 'Single-Line Text', required: true, shared: true, sortOrder: 20 },
              { name: 'nativeName', title: 'Native Name', type: 'Single-Line Text', required: false, shared: true, sortOrder: 30 },
              { name: 'direction', title: 'Direction', type: 'Single-Line Text', required: false, defaultValue: 'ltr', shared: true, sortOrder: 40 },
              { name: 'enabled', title: 'Enabled', type: 'Checkbox', required: false, defaultValue: 'true', shared: true, sortOrder: 50 },
              { name: 'sortOrder', title: 'Sort Order', type: 'Number', required: false, defaultValue: '100', shared: true, sortOrder: 60 },
              { name: 'fallbackLanguage', title: 'Fallback Language', type: 'Single-Line Text', required: false, shared: true, sortOrder: 70 },
              { name: 'urlPrefix', title: 'URL Prefix', type: 'Single-Line Text', required: false, shared: true, sortOrder: 80 },
              { name: 'flagIcon', title: 'Flag Icon', type: 'Single-Line Text', required: false, shared: true, sortOrder: 90 },
            ],
          },
        ],
      });
    }

    // Set insertOptions for Languages Folder
    if (!folderTpl.insertOptions || !folderTpl.insertOptions.some((id) => id.toString() === langTpl._id.toString())) {
      folderTpl.insertOptions = [langTpl._id];
      await folderTpl.save();
    }

    // 2. Ensure /root exists
    let rootItem = await Item.findOne({ path: branding.PATHS.ROOT });
    if (!rootItem) {
      rootItem = await Item.create({
        name: 'root',
        displayName: 'Root',
        templateId: folderTpl._id,
        parentId: null,
        ancestors: [],
        path: branding.PATHS.ROOT,
        sortOrder: 1,
        isSystem: true,
        sharedFields: {},
      });
    }

    // Ensure /root/system exists
    let systemRoot = await Item.findOne({ path: sysPath });
    if (!systemRoot) {
      systemRoot = await Item.create({
        name: 'system',
        displayName: 'System',
        templateId: folderTpl._id,
        parentId: rootItem._id,
        ancestors: [rootItem._id],
        path: sysPath,
        sortOrder: 900,
        isSystem: true,
        sharedFields: {},
      });
    }

    // 3. Ensure /root/system/Languages exists
    let langFolder = await Item.findOne({ path: langFolderPath });
    if (!langFolder) {
      langFolder = await Item.create({
        name: 'Languages',
        displayName: 'Languages',
        templateId: folderTpl._id,
        parentId: systemRoot._id,
        ancestors: [...systemRoot.ancestors, systemRoot._id],
        path: langFolderPath,
        sortOrder: 10,
        isSystem: true,
        sharedFields: {},
      });
    }

    // 4. Ensure initial vi and en items exist under /root/system/Languages
    for (const defLang of FALLBACK_LANGUAGES) {
      const existing = await Item.findOne({
        parentId: langFolder._id,
        name: { $regex: new RegExp(`^${defLang.code}$`, 'i') },
        isDeleted: { $ne: true },
      });
      if (!existing) {
        await Item.create({
          name: defLang.code,
          displayName: defLang.displayName,
          templateId: langTpl._id,
          parentId: langFolder._id,
          ancestors: [...langFolder.ancestors, langFolder._id],
          path: `${langFolderPath}/${defLang.code}`,
          sortOrder: defLang.sortOrder,
          isSystem: true,
          sharedFields: {
            code: defLang.code,
            displayName: defLang.displayName,
            nativeName: defLang.nativeName,
            direction: defLang.direction,
            enabled: defLang.enabled,
            sortOrder: defLang.sortOrder,
            fallbackLanguage: defLang.fallbackLanguage || '',
            urlPrefix: defLang.code === branding.SITE_DEFAULT_LANGUAGE ? '' : defLang.code,
            flagIcon: defLang.flagIcon || 'ti ti-flag',
          },
        });
      }
    }

    return { folderItem: langFolder, languageTemplate: langTpl };
  }

  /**
   * List all languages in the system
   * @param {object} options { enabledOnly = true, store = 'master' }
   * @returns {Promise<Array<object>>}
   */
  async list(options = {}) {
    const { enabledOnly = true, store = 'master' } = options;
    const isWeb = store === 'web';
    const cacheKey = `list:${isWeb ? 'web' : 'master'}:${enabledOnly ? '1' : '0'}`;

    const cached = this._cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Fast-fail if DB is not ready
    if (mongoose.connection.readyState !== 1) {
      return enabledOnly ? FALLBACK_LANGUAGES.filter((l) => l.enabled) : FALLBACK_LANGUAGES;
    }

    const defaultLangCode = await this.getDefaultLanguageCode();
    const Model = isWeb ? PublishedItem : Item;
    const langFolderRegex = new RegExp(`^${branding.PATHS.SYSTEM_LANGUAGES}/[^/]+$`, 'i');

    let items = [];
    try {
      items = await Model.find({
        path: { $regex: langFolderRegex },
        isDeleted: { $ne: true },
      }).lean();
    } catch (err) {
      logger.warn(`[LanguageService] Query error: ${err.message}`);
    }

    // If no language items exist in database yet, return fallback languages
    if (!items || items.length === 0) {
      const res = FALLBACK_LANGUAGES.map((l) => ({
        ...l,
        isDefault: l.code.toLowerCase() === defaultLangCode,
      })).filter((l) => (!enabledOnly ? true : l.enabled));
      return res;
    }

    const mapped = items.map((it) => {
      const sf = it.sharedFields || {};
      const code = String(sf.code || it.name || '').trim();
      const enabled = sf.enabled !== false && sf.enabled !== 'false';
      const sortOrder = typeof sf.sortOrder === 'number' ? sf.sortOrder : parseInt(sf.sortOrder || '100', 10);
      const isDefault = code.toLowerCase() === defaultLangCode;

      return {
        id: it._id.toString(),
        code,
        displayName: sf.displayName || it.displayName || code,
        nativeName: sf.nativeName || sf.displayName || it.displayName || code,
        direction: sf.direction === 'rtl' ? 'rtl' : 'ltr',
        enabled,
        sortOrder: isNaN(sortOrder) ? 100 : sortOrder,
        fallbackLanguage: sf.fallbackLanguage ? String(sf.fallbackLanguage).trim() : '',
        urlPrefix: sf.urlPrefix !== undefined && sf.urlPrefix !== '' ? String(sf.urlPrefix).trim() : code,
        flagIcon: sf.flagIcon || 'ti ti-world',
        isDefault,
        updatedAt: it.updatedAt,
      };
    });

    mapped.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.code.localeCompare(b.code);
    });

    const result = enabledOnly ? mapped.filter((l) => l.enabled) : mapped;

    this._cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }

  /**
   * Get a language by code
   * @param {string} code
   * @param {object} options { store = 'master' }
   * @returns {Promise<object|null>}
   */
  async getByCode(code, options = {}) {
    if (!code) return null;
    const clean = code.trim().toLowerCase();
    const all = await this.list({ enabledOnly: false, store: options.store || 'master' });
    return all.find((l) => l.code.toLowerCase() === clean) || null;
  }

  /**
   * Get default language info
   * @param {object} options { store = 'master' }
   * @returns {Promise<object>}
   */
  async getDefault(options = {}) {
    const all = await this.list({ enabledOnly: false, store: options.store || 'master' });
    const found = all.find((l) => l.isDefault && l.enabled);
    if (found) return found;

    // Fallback to first enabled language or fallback object
    const firstEnabled = all.find((l) => l.enabled);
    if (firstEnabled) return firstEnabled;

    return FALLBACK_LANGUAGES[0];
  }

  /**
   * Check if a language code is valid and enabled
   * @param {string} code
   * @param {object} options { store = 'master' }
   * @returns {Promise<boolean>}
   */
  async isValid(code, options = {}) {
    if (!code) return false;
    const clean = code.trim().toLowerCase();
    const enabledLangs = await this.list({ enabledOnly: true, store: options.store || 'master' });
    return enabledLangs.some((l) => l.code.toLowerCase() === clean);
  }

  /**
   * Calculate fallback chain for a language, preventing infinite loops (max depth 5)
   * @param {string} code
   * @param {object} options { store = 'master' }
   * @returns {Promise<Array<string>>} Array of language codes in order of fallback
   */
  async getFallbackChain(code, options = {}) {
    if (!code) return [];
    const clean = code.trim().toLowerCase();
    const chain = [clean];
    const visited = new Set([clean]);
    let currentCode = clean;
    const defaultLang = await this.getDefault(options);
    const defaultCode = (defaultLang?.code || branding.SITE_DEFAULT_LANGUAGE).toLowerCase();

    while (currentCode && chain.length < 5) {
      const lang = await this.getByCode(currentCode, options);
      if (!lang) break;

      const nextFallback = (lang.fallbackLanguage || '').trim().toLowerCase();
      if (nextFallback && !visited.has(nextFallback)) {
        visited.add(nextFallback);
        chain.push(nextFallback);
        currentCode = nextFallback;
      } else {
        break;
      }
    }

    // If default language is not yet in chain, append it
    if (!chain.includes(defaultCode)) {
      chain.push(defaultCode);
    }

    return chain;
  }

  /**
   * Count usage of a language across all items, versions, and presentation overrides
   * @param {string} code
   * @returns {Promise<{ itemCount: number, versionCount: number, presentationCount: number, total: number }>}
   */
  async getUsage(code) {
    if (!code) return { itemCount: 0, versionCount: 0, presentationCount: 0, total: 0 };
    const clean = code.trim().toLowerCase();

    if (mongoose.connection.readyState !== 1) {
      return { itemCount: 0, versionCount: 0, presentationCount: 0, total: 0 };
    }

    // 1. Items in Master having this language with at least 1 version
    const masterItems = await Item.countDocuments({
      'languages.code': clean,
      'languages.versions.0': { $exists: true },
    });

    // 2. Total versions in Master for this language
    const versionAgg = await Item.aggregate([
      { $match: { 'languages.code': clean } },
      { $unwind: '$languages' },
      { $match: { 'languages.code': clean } },
      { $project: { versionCount: { $size: { $ifNull: ['$languages.versions', []] } } } },
      { $group: { _id: null, totalVersions: { $sum: '$versionCount' } } },
    ]);
    const versionCount = versionAgg[0]?.totalVersions || 0;

    // 3. Final presentation overrides in Master for this language
    const presAgg = await Item.aggregate([
      { $unwind: '$presentation.final' },
      { $match: { 'presentation.final.language': clean } },
      { $count: 'totalPres' },
    ]);
    const presentationCount = presAgg[0]?.totalPres || 0;

    const total = masterItems + versionCount + presentationCount;
    return {
      itemCount: masterItems,
      versionCount,
      presentationCount,
      total,
    };
  }

  /**
   * Create a new language item under /root/system/Languages
   * @param {object} data
   * @param {object} context { userId: string }
   * @returns {Promise<object>}
   */
  async create(data, context = {}) {
    const rawCode = data.code;
    const code = this.normalizeCode(rawCode);
    const { folderItem, languageTemplate } = await this.ensureSystemStructure();

    // Check for duplicate code under /root/system/Languages (case-insensitive)
    const existing = await Item.findOne({
      parentId: folderItem._id,
      name: { $regex: new RegExp(`^${code}$`, 'i') },
      isDeleted: { $ne: true },
    });
    if (existing) {
      throw new ConflictError(`Mã ngôn ngữ "${code}" đã tồn tại trong hệ thống.`);
    }

    const displayName = (data.displayName || code).trim();
    const nativeName = (data.nativeName || displayName).trim();
    const direction = data.direction === 'rtl' ? 'rtl' : 'ltr';
    const enabled = data.enabled !== false && data.enabled !== 'false';
    const sortOrder = parseInt(data.sortOrder || '100', 10);
    const fallbackLanguage = data.fallbackLanguage ? this.normalizeCode(data.fallbackLanguage) : '';
    const urlPrefix = (data.urlPrefix || code).trim().toLowerCase();
    const flagIcon = (data.flagIcon || 'ti ti-world').trim();

    // Validate fallbackLanguage exists if provided
    if (fallbackLanguage) {
      if (fallbackLanguage.toLowerCase() === code.toLowerCase()) {
        throw new ValidationError('Fallback Language không thể là chính ngôn ngữ này.');
      }
      const fbExists = await this.getByCode(fallbackLanguage);
      if (!fbExists) {
        throw new ValidationError(`Ngôn ngữ fallback "${fallbackLanguage}" không tồn tại.`);
      }
    }

    const itemPath = `${folderItem.path}/${code}`;
    const sharedFields = {
      code,
      displayName,
      nativeName,
      direction,
      enabled,
      sortOrder: isNaN(sortOrder) ? 100 : sortOrder,
      fallbackLanguage,
      urlPrefix,
      flagIcon,
    };

    const newItem = await Item.create({
      name: code,
      displayName,
      templateId: languageTemplate._id,
      parentId: folderItem._id,
      ancestors: [...folderItem.ancestors, folderItem._id],
      path: itemPath,
      sortOrder: isNaN(sortOrder) ? 100 : sortOrder,
      sharedFields,
      isSystem: true,
      createdBy: context.userId || null,
      updatedBy: context.userId || null,
    });

    this.invalidateCache();
    eventBus.emit('language.created', { code, itemId: newItem._id, data: sharedFields });
    eventBus.emit('language.cache.invalidate');

    return {
      id: newItem._id.toString(),
      path: newItem.path,
      ...sharedFields,
      isDefault: false,
      updatedAt: newItem.updatedAt,
    };
  }

  /**
   * Update an existing language item
   * @param {string} code
   * @param {object} data
   * @param {object} context { userId: string, expectedUpdatedAt?: string }
   * @returns {Promise<object>}
   */
  async update(code, data, context = {}) {
    if (!code) throw new ValidationError('Thiếu mã ngôn ngữ cần cập nhật.');
    const cleanCode = code.trim().toLowerCase();
    const langFolderPath = branding.PATHS.SYSTEM_LANGUAGES;

    const item = await Item.findOne({
      path: { $regex: new RegExp(`^${langFolderPath}/${cleanCode}$`, 'i') },
      isDeleted: { $ne: true },
    });
    if (!item) {
      throw new NotFoundError(`Không tìm thấy ngôn ngữ với mã "${code}".`);
    }

    // Check optimistic locking
    if (context.expectedUpdatedAt && item.updatedAt) {
      const currentIso = new Date(item.updatedAt).toISOString();
      const expectedIso = new Date(context.expectedUpdatedAt).toISOString();
      if (currentIso !== expectedIso) {
        throw new ConflictError('Ngôn ngữ đã được chỉnh sửa bởi người dùng khác. Vui lòng tải lại trang.');
      }
    }

    // Code is strictly immutable (DEC-048)
    if (data.code && this.normalizeCode(data.code).toLowerCase() !== cleanCode) {
      throw new ValidationError('Mã ngôn ngữ (code) là bất biến và không được phép thay đổi.');
    }

    const sf = item.sharedFields instanceof Map ? Object.fromEntries(item.sharedFields) : { ...(item.sharedFields || {}) };
    if (data.displayName !== undefined) sf.displayName = String(data.displayName).trim();
    if (data.nativeName !== undefined) sf.nativeName = String(data.nativeName).trim();
    if (data.direction !== undefined) sf.direction = data.direction === 'rtl' ? 'rtl' : 'ltr';
    if (data.sortOrder !== undefined) sf.sortOrder = parseInt(data.sortOrder, 10) || 100;
    if (data.urlPrefix !== undefined) sf.urlPrefix = String(data.urlPrefix).trim().toLowerCase();
    if (data.flagIcon !== undefined) sf.flagIcon = String(data.flagIcon).trim();

    if (data.fallbackLanguage !== undefined) {
      const fb = data.fallbackLanguage ? this.normalizeCode(data.fallbackLanguage) : '';
      if (fb.toLowerCase() === cleanCode) {
        throw new ValidationError('Fallback Language không thể là chính ngôn ngữ này.');
      }
      if (fb) {
        const fbExists = await this.getByCode(fb);
        if (!fbExists) throw new ValidationError(`Ngôn ngữ fallback "${fb}" không tồn tại.`);
      }
      sf.fallbackLanguage = fb;
    }

    if (data.enabled !== undefined) {
      const willEnable = data.enabled === true || data.enabled === 'true';
      const defaultCode = await this.getDefaultLanguageCode();
      if (!willEnable && cleanCode === defaultCode) {
        throw new ValidationError('Không thể vô hiệu hóa ngôn ngữ mặc định của hệ thống.');
      }
      sf.enabled = willEnable;
    }

    item.displayName = sf.displayName || item.displayName;
    item.sortOrder = sf.sortOrder;
    item.set('sharedFields', sf);
    item.updatedBy = context.userId || null;
    await item.save();

    this.invalidateCache();
    eventBus.emit('language.updated', { code: cleanCode, itemId: item._id, data: sf });
    eventBus.emit('language.cache.invalidate');

    const defaultCode = await this.getDefaultLanguageCode();
    return {
      id: item._id.toString(),
      ...sf,
      isDefault: cleanCode === defaultCode,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Enable or disable a language
   * @param {string} code
   * @param {boolean} enabled
   * @param {object} context { userId: string }
   */
  async setEnabled(code, enabled, context = {}) {
    return this.update(code, { enabled }, context);
  }

  /**
   * Set a language as the site-wide default language
   * @param {string} code
   * @param {object} context { userId: string }
   */
  async setDefault(code, context = {}) {
    if (!code) throw new ValidationError('Thiếu mã ngôn ngữ.');
    const cleanCode = code.trim().toLowerCase();

    const lang = await this.getByCode(cleanCode);
    if (!lang) {
      throw new NotFoundError(`Ngôn ngữ "${code}" không tồn tại trong hệ thống.`);
    }
    if (!lang.enabled) {
      throw new ValidationError(`Không thể đặt ngôn ngữ đang bị tắt ("${code}") làm mặc định. Vui lòng kích hoạt trước.`);
    }

    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        key: SETTING_KEY,
        value: { defaultLanguage: cleanCode },
        updatedBy: context.userId || 'system',
      },
      { upsert: true, new: true }
    );

    this.invalidateCache();
    eventBus.emit('language.default.changed', { defaultLanguage: cleanCode });
    eventBus.emit('language.cache.invalidate');

    return { success: true, defaultLanguage: cleanCode };
  }

  /**
   * Reorder languages by an array of ordered codes
   * @param {Array<string>} orderedCodes
   * @param {object} context { userId: string }
   */
  async reorder(orderedCodes, context = {}) {
    if (!Array.isArray(orderedCodes)) {
      throw new ValidationError('Danh sách mã ngôn ngữ phải là một mảng.');
    }

    const langFolderPath = branding.PATHS.SYSTEM_LANGUAGES;
    let step = 10;
    for (const raw of orderedCodes) {
      const code = String(raw).trim().toLowerCase();
      await Item.updateOne(
        {
          path: { $regex: new RegExp(`^${langFolderPath}/${code}$`, 'i') },
          isDeleted: { $ne: true },
        },
        {
          $set: {
            sortOrder: step,
            'sharedFields.sortOrder': step,
            updatedBy: context.userId || null,
          },
        }
      );
      step += 10;
    }

    this.invalidateCache();
    eventBus.emit('language.updated', { reordered: true });
    eventBus.emit('language.cache.invalidate');

    return this.list({ enabledOnly: false });
  }

  /**
   * Delete a language item safely (Safe Deletion - only when usage is 0 and not default)
   * @param {string} code
   * @param {object} context { userId: string }
   */
  async delete(code, _context = {}) {
    if (!code) throw new ValidationError('Thiếu mã ngôn ngữ.');
    const cleanCode = code.trim().toLowerCase();
    const defaultCode = await this.getDefaultLanguageCode();

    if (cleanCode === defaultCode) {
      throw new ValidationError('Không thể xóa ngôn ngữ mặc định của hệ thống.');
    }

    const usage = await this.getUsage(cleanCode);
    if (usage.total > 0) {
      throw new ValidationError(
        `Không thể xóa ngôn ngữ "${code}" vì còn ${usage.itemCount} items (${usage.versionCount} phiên bản, ${usage.presentationCount} layout) đang sử dụng. Hãy chuyển sang trạng thái Vô hiệu hóa (Disable).`,
        { usage }
      );
    }

    const langFolderPath = branding.PATHS.SYSTEM_LANGUAGES;
    const item = await Item.findOne({
      path: { $regex: new RegExp(`^${langFolderPath}/${cleanCode}$`, 'i') },
      isDeleted: { $ne: true },
    });
    if (!item) {
      throw new NotFoundError(`Không tìm thấy ngôn ngữ "${code}".`);
    }

    await Item.deleteOne({ _id: item._id });

    // Also remove from Web store if published
    try {
      await PublishedItem.deleteOne({ path: item.path });
    } catch {
      // Ignore if not present
    }

    this.invalidateCache();
    eventBus.emit('language.deleted', { code: cleanCode, itemId: item._id });
    eventBus.emit('language.cache.invalidate');

    return { success: true, deletedCode: cleanCode };
  }
}

const languageService = new LanguageService();
module.exports = languageService;
