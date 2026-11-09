const mongoose = require('mongoose');
const Item = require('../models/Item');
const languageService = require('./languageService');
const templateService = require('./templateService');
const { getFieldHandler } = require('../fields');
const { diffValues } = require('../utils/diffHelper');

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

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

const mapToObject = (m) => {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m === 'object') return { ...m };
  return {};
};

const versionService = {
  ConflictError,
  ValidationError,
  NotFoundError,

  /**
   * List all system languages and indicate if this item has content for each language
   * @param {string|ObjectId} itemId
   */
  async listLanguages(itemId) {
    const activeLanguages = await languageService.list({ enabledOnly: true });
    let itemLanguagesMap = new Set();

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      const item = await Item.findById(itemId).select('languages').lean();
      if (item && Array.isArray(item.languages)) {
        for (const l of item.languages) {
          if (l.versions && l.versions.length > 0) {
            itemLanguagesMap.add(l.code.toLowerCase());
          }
        }
      }
    }

    return activeLanguages.map((lang) => ({
      ...lang,
      hasContent: itemLanguagesMap.has(lang.code.toLowerCase()),
    }));
  },

  /**
   * List all versions for a given language of an item
   * @param {string|ObjectId} itemId
   * @param {string} langCode
   */
  async listVersions(itemId, langCode = 'vi') {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || 'vi').toLowerCase().trim();
    const item = await Item.findById(itemId)
      .populate({
        path: 'languages.versions.createdBy',
        select: 'username fullName avatar',
      })
      .populate({
        path: 'languages.versions.updatedBy',
        select: 'username fullName avatar',
      })
      .lean();

    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const langEntry = (item.languages || []).find((l) => l.code === code);
    if (!langEntry || !Array.isArray(langEntry.versions)) {
      return [];
    }

    // Return versions sorted by version number descending
    return [...langEntry.versions].sort((a, b) => b.version - a.version);
  },

  /**
   * Resolve fields for an item at a specific language and version.
   * Priority: Versioned Fields -> Unversioned Fields -> Shared Fields -> Standard Values
   * Returns: { fields, origins, sharedFields, unversionedFields, versionFields, versionInfo }
   */
  async resolveFields(item, langCode = 'vi', versionNumber = 1) {
    if (!item) return { fields: {}, origins: {} };
    const code = (langCode || 'vi').toLowerCase().trim();
    const vNum = parseInt(versionNumber, 10) || 1;

    // 1. Template schema & standard values (resolving effective template including presentation components)
    const templateId = item.templateId?._id || item.templateId;
    let template = null;
    let standardValues = {};
    if (templateId) {
      const eff = await templateService.resolveEffectiveTemplate(item, code, vNum);
      template = eff || (await templateService.resolveTemplate(templateId));
      standardValues = eff?.standardValues || (await templateService.resolveStandardValues(templateId));
    }

    // Map fieldId -> field metadata
    const fieldMetaMap = new Map();
    if (template && template.sections) {
      for (const sec of template.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            fieldMetaMap.set(f._id.toString(), f);
            fieldMetaMap.set(f.name, f);
          }
        }
      }
    }

    // 2. Extract raw maps
    const sharedFields = mapToObject(item.sharedFields);
    const legacyFields = mapToObject(item.fields);

    const langEntry = (item.languages || []).find((l) => l.code === code);
    let unversionedFields = langEntry ? mapToObject(langEntry.unversionedFields) : {};

    let versionEntry = null;
    if (langEntry && Array.isArray(langEntry.versions)) {
      versionEntry = langEntry.versions.find((v) => v.version === vNum);
    }
    let versionedFields = versionEntry ? mapToObject(versionEntry.fields) : {};
    let isFallbackContent = false;

    // Fallback logic: Nếu ngôn ngữ yêu cầu chưa có bản dịch, tìm theo fallback chain của ngôn ngữ đó (DEC-048)
    if (!langEntry || (!versionEntry && (!langEntry.versions || langEntry.versions.length === 0))) {
      let fallbackLang = null;
      try {
        const fallbackChain = await languageService.getFallbackChain(code);
        for (const fbCode of fallbackChain) {
          const found = (item.languages || []).find(
            (l) => l.code.toLowerCase() === fbCode.toLowerCase() && Array.isArray(l.versions) && l.versions.length > 0
          );
          if (found) {
            fallbackLang = found;
            break;
          }
        }
      } catch (_err) {
        // Fallback gracefully
      }

      if (!fallbackLang) {
        fallbackLang = (item.languages || []).find((l) => Array.isArray(l.versions) && l.versions.length > 0);
      }

      if (fallbackLang && Array.isArray(fallbackLang.versions) && fallbackLang.versions.length > 0) {
        const latestFallbackVer = [...fallbackLang.versions].sort((a, b) => b.version - a.version)[0];
        if (latestFallbackVer) {
          unversionedFields = mapToObject(fallbackLang.unversionedFields);
          versionedFields = mapToObject(latestFallbackVer.fields);
          isFallbackContent = true;
        }
      }
    }

    // 3. Merge by inheritance order
    const mergedFields = {};
    const origins = {}; // fieldId -> 'version' | 'unversioned' | 'shared' | 'legacy' | 'standard' | 'fallback'

    // 3.1 Start with standard values
    for (const [key, val] of Object.entries(standardValues || {})) {
      mergedFields[key] = val;
      origins[key] = 'standard';
    }

    // 3.2 Legacy fields fallback
    for (const [key, val] of Object.entries(legacyFields)) {
      if (val !== undefined && val !== null && val !== '') {
        mergedFields[key] = val;
        origins[key] = 'legacy';
      }
    }

    // 3.3 Shared fields
    for (const [key, val] of Object.entries(sharedFields)) {
      if (val !== undefined && val !== null && val !== '') {
        mergedFields[key] = val;
        origins[key] = 'shared';
      }
    }

    // 3.4 Unversioned fields
    for (const [key, val] of Object.entries(unversionedFields)) {
      if (val !== undefined && val !== null && val !== '') {
        mergedFields[key] = val;
        origins[key] = isFallbackContent ? 'fallback' : 'unversioned';
      }
    }

    // 3.5 Versioned fields (highest priority)
    for (const [key, val] of Object.entries(versionedFields)) {
      if (val !== undefined && val !== null && val !== '') {
        mergedFields[key] = val;
        origins[key] = isFallbackContent ? 'fallback' : 'version';
      }
    }

    // Provide dual-key access: both fieldId and fieldName
    if (template && template.sections) {
      for (const sec of template.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            const fid = f._id.toString();
            const fname = f.name;
            if (mergedFields[fid] !== undefined && mergedFields[fname] === undefined) {
              mergedFields[fname] = mergedFields[fid];
              origins[fname] = origins[fid];
            } else if (mergedFields[fname] !== undefined && mergedFields[fid] === undefined) {
              mergedFields[fid] = mergedFields[fname];
              origins[fid] = origins[fname];
            }
          }
        }
      }
    }

    return {
      fields: mergedFields,
      origins,
      sharedFields,
      unversionedFields,
      versionedFields,
      versionInfo: versionEntry,
      hasLanguage: !!langEntry && Array.isArray(langEntry.versions) && langEntry.versions.length > 0,
      hasVersion: !!versionEntry,
      isFallbackContent,
    };
  },

  /**
   * Add a new version for a given language
   * @param {string|ObjectId} itemId
   * @param {string} langCode
   * @param {Object} options
   */
  async addVersion(itemId, langCode = null, { copyFromVersion = null, userId = null, note = '' } = {}) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const defaultLang = await languageService.getDefault();
    const code = (langCode || defaultLang.code).toLowerCase().trim();

    // Verify language is active
    const isValidLang = await languageService.isValid(code);
    if (!isValidLang) {
      throw new ValidationError(`Ngôn ngữ [${code}] không tồn tại hoặc đã bị vô hiệu hóa.`);
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    let langEntry = item.languages.find((l) => l.code === code);
    if (!langEntry) {
      item.languages.push({
        code,
        unversionedFields: new Map(),
        versions: [],
      });
      langEntry = item.languages[item.languages.length - 1];
    }

    // Compute next version number
    const currentVersions = langEntry.versions || [];
    const maxVersion = currentVersions.reduce((max, v) => (v.version > max ? v.version : max), 0);
    const nextVersion = maxVersion + 1;

    // Determine initial fields for the new version
    let initialFields = new Map();
    let sourceVersionNumber = copyFromVersion;

    if (sourceVersionNumber === null || sourceVersionNumber === undefined) {
      // Default: copy from latest existing version if any
      sourceVersionNumber = maxVersion > 0 ? maxVersion : null;
    }

    if (sourceVersionNumber && sourceVersionNumber !== 'empty') {
      const sourceVer = currentVersions.find((v) => v.version === parseInt(sourceVersionNumber, 10));
      if (sourceVer && sourceVer.fields) {
        const rawSource = mapToObject(sourceVer.fields);
        initialFields = new Map(Object.entries(rawSource));
      }
    }

    let initWfStateId = null;
    try {
      const workflowService = require('./workflowService');
      const wf = await workflowService.resolveWorkflowForItem(item);
      if (wf) {
        const initState = wf.states.find((s) => s.isInitial) || wf.states[0];
        initWfStateId = initState?._id || null;
      }
    } catch {
      /* ignore workflow resolution failure during version creation */
    }

    // Push new version
    const newVersionDoc = {
      version: nextVersion,
      workflowState: initWfStateId,
      fields: initialFields,
      createdBy: userId,
      createdAt: new Date(),
      updatedBy: userId,
      updatedAt: new Date(),
      note: note || (sourceVersionNumber ? `Cloned from Version ${sourceVersionNumber}` : 'New version'),
    };
    langEntry.versions.push(newVersionDoc);

    // Presentation Copy Rule (DEC-020, DEC-026, DEC-031):
    // If source version had final presentation, copy it to new version
    if (sourceVersionNumber && item.presentation && Array.isArray(item.presentation.final)) {
      const sourceFinalPres = item.presentation.final.find(
        (p) => p.language === code && p.version === parseInt(sourceVersionNumber, 10)
      );
      if (sourceFinalPres) {
        const clonedRecord = {
          language: code,
          version: nextVersion,
          layoutId: sourceFinalPres.layoutId || null,
          renderings: sourceFinalPres.renderings ? JSON.parse(JSON.stringify(sourceFinalPres.renderings)) : [],
        };
        if (sourceFinalPres.devices) {
          clonedRecord.devices = JSON.parse(JSON.stringify(sourceFinalPres.devices));
        }
        item.presentation.final.push(clonedRecord);
        item.markModified('presentation');
      }
    }

    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    return {
      version: nextVersion,
      language: code,
      item,
    };
  },

  /**
   * Add a new language version for an item
   */
  async addLanguageVersion(itemId, langCode, { copyFromLang = null, copyFromVersion = 1, userId = null, note = '' } = {}) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || '').toLowerCase().trim();
    if (!code) {
      throw new ValidationError('Mã ngôn ngữ là bắt buộc.');
    }

    const isValidLang = await languageService.isValid(code);
    if (!isValidLang) {
      throw new ValidationError(`Ngôn ngữ [${code}] không tồn tại trong hệ thống.`);
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    let existingLang = item.languages.find((l) => l.code === code);
    if (existingLang && existingLang.versions && existingLang.versions.length > 0) {
      throw new ValidationError(`Ngôn ngữ [${code}] đã tồn tại nội dung trên Item này.`);
    }

    let initialFields = new Map();
    let initialUnversioned = new Map();

    if (copyFromLang) {
      const srcCode = copyFromLang.toLowerCase().trim();
      const srcLang = item.languages.find((l) => l.code === srcCode);
      if (srcLang) {
        initialUnversioned = new Map(Object.entries(mapToObject(srcLang.unversionedFields)));
        const vNum = parseInt(copyFromVersion, 10) || 1;
        const srcVer = (srcLang.versions || []).find((v) => v.version === vNum) || srcLang.versions[0];
        if (srcVer && srcVer.fields) {
          initialFields = new Map(Object.entries(mapToObject(srcVer.fields)));
        }
      }
    }

    const newLangEntry = {
      code,
      unversionedFields: initialUnversioned,
      versions: [
        {
          version: 1,
          fields: initialFields,
          createdBy: userId,
          createdAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
          note: note || (copyFromLang ? `Created from language ${copyFromLang}` : 'Initial language version'),
        },
      ],
    };

    if (existingLang) {
      existingLang.versions = newLangEntry.versions;
      existingLang.unversionedFields = newLangEntry.unversionedFields;
    } else {
      item.languages.push(newLangEntry);
    }

    // Presentation: if copyFromLang had final layout, copy for version 1
    if (copyFromLang && item.presentation && Array.isArray(item.presentation.final)) {
      const srcPres = item.presentation.final.find(
        (p) => p.language === copyFromLang.toLowerCase() && p.version === (parseInt(copyFromVersion, 10) || 1)
      );
      if (srcPres) {
        const clonedRecord = {
          language: code,
          version: 1,
          layoutId: srcPres.layoutId || null,
          renderings: srcPres.renderings ? JSON.parse(JSON.stringify(srcPres.renderings)) : [],
        };
        if (srcPres.devices) {
          clonedRecord.devices = JSON.parse(JSON.stringify(srcPres.devices));
        }
        item.presentation.final.push(clonedRecord);
        item.markModified('presentation');
      }
    }

    item.updatedBy = userId;
    item.updatedAt = new Date();
    await item.save();

    return {
      language: code,
      version: 1,
      item,
    };
  },

  /**
   * Delete a version of an item for a given language
   * Rule: Cannot delete the last remaining version of a language.
   */
  async deleteVersion(itemId, langCode = 'vi', versionNumber) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || 'vi').toLowerCase().trim();
    const vNum = parseInt(versionNumber, 10);
    if (!vNum) {
      throw new ValidationError('Số phiên bản không hợp lệ.');
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const langEntry = item.languages.find((l) => l.code === code);
    if (!langEntry || !Array.isArray(langEntry.versions) || langEntry.versions.length === 0) {
      throw new NotFoundError(`Không tìm thấy ngôn ngữ [${code}] trên Item.`);
    }

    if (langEntry.versions.length <= 1) {
      throw new ValidationError(`Không thể xóa phiên bản [${vNum}]. Đây là phiên bản duy nhất còn lại của ngôn ngữ [${code}].`);
    }

    const verIndex = langEntry.versions.findIndex((v) => v.version === vNum);
    if (verIndex === -1) {
      throw new NotFoundError(`Không tìm thấy phiên bản [${vNum}] của ngôn ngữ [${code}].`);
    }

    langEntry.versions.splice(verIndex, 1);

    // Clean up final presentation for this version if any
    if (item.presentation && Array.isArray(item.presentation.final)) {
      item.presentation.final = item.presentation.final.filter(
        (p) => !(p.language === code && p.version === vNum)
      );
      item.markModified('presentation');
    }

    await item.save();

    // Determine nearest version to switch to
    const remaining = langEntry.versions.sort((a, b) => b.version - a.version);
    const fallbackVersion = remaining[0]?.version || 1;

    return {
      deletedVersion: vNum,
      language: code,
      fallbackVersion,
      item,
    };
  },

  /**
   * Restore a historical version by creating a NEW version with that historical version's contents.
   * Never overwrites historical records!
   */
  async restoreVersion(itemId, langCode = 'vi', versionNumber, { userId = null } = {}) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || 'vi').toLowerCase().trim();
    const vNum = parseInt(versionNumber, 10);
    if (!vNum) {
      throw new ValidationError('Số phiên bản không hợp lệ.');
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const langEntry = item.languages.find((l) => l.code === code);
    if (!langEntry) {
      throw new NotFoundError(`Không tìm thấy ngôn ngữ [${code}] trên Item.`);
    }

    const targetVer = (langEntry.versions || []).find((v) => v.version === vNum);
    if (!targetVer) {
      throw new NotFoundError(`Không tìm thấy phiên bản [${vNum}] để khôi phục.`);
    }

    // Call addVersion cloning from this target version
    return await this.addVersion(itemId, code, {
      copyFromVersion: vNum,
      userId,
      note: `Khôi phục từ Phiên bản ${vNum}`,
    });
  },

  /**
   * Compare two versions of an item
   */
  async compareVersions(itemId, langCode = 'vi', v1, v2) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || 'vi').toLowerCase().trim();
    const v1Num = parseInt(v1, 10);
    const v2Num = parseInt(v2, 10);

    if (!v1Num || !v2Num) {
      throw new ValidationError('Vui lòng chỉ định cả hai phiên bản v1 và v2 để so sánh.');
    }

    const item = await Item.findById(itemId).populate('templateId').lean();
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    const template = (await templateService.resolveEffectiveTemplate(item, code, v2Num)) || (await templateService.resolveTemplate(item.templateId._id || item.templateId));

    // Resolve both versions
    const resV1 = await this.resolveFields(item, code, v1Num);
    const resV2 = await this.resolveFields(item, code, v2Num);

    const diffResults = [];
    let totalDifferences = 0;

    if (template && template.sections) {
      for (const sec of template.sections) {
        const secDiff = {
          sectionName: sec.name,
          fields: [],
        };

        if (sec.fields) {
          for (const f of sec.fields) {
            const fid = f._id.toString();
            const valA = resV1.fields[fid] !== undefined ? resV1.fields[fid] : resV1.fields[f.name];
            const valB = resV2.fields[fid] !== undefined ? resV2.fields[fid] : resV2.fields[f.name];

            const diff = diffValues(valA, valB, f.type);
            if (diff.isDifferent) totalDifferences += 1;

            secDiff.fields.push({
              fieldId: fid,
              fieldName: f.name,
              title: f.title,
              type: f.type,
              shared: !!f.shared,
              unversioned: !!f.unversioned,
              originA: resV1.origins[fid] || 'unknown',
              originB: resV2.origins[fid] || 'unknown',
              ...diff,
            });
          }
        }

        diffResults.push(secDiff);
      }
    }

    return {
      itemId,
      language: code,
      v1: v1Num,
      v2: v2Num,
      versionInfoA: resV1.versionInfo,
      versionInfoB: resV2.versionInfo,
      totalDifferences,
      sections: diffResults,
    };
  },

  /**
   * Update fields for an item at a specific language and version.
   * Splits input values into shared, unversioned, and versioned fields based on Template flags.
   * Handles optimistic locking (409 Conflict).
   */
  async updateFields(itemId, langCode = 'vi', versionNumber = 1, fieldsData = {}, expectedUpdatedAt = null, { userId = null, user = null } = {}) {
    if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ValidationError('ID Item không hợp lệ.');
    }
    const code = (langCode || 'vi').toLowerCase().trim();
    const vNum = parseInt(versionNumber, 10) || 1;

    const item = await Item.findById(itemId);
    if (!item) {
      throw new NotFoundError('Không tìm thấy Item.');
    }

    // 1. Optimistic Locking check
    if (expectedUpdatedAt) {
      const clientTime = new Date(expectedUpdatedAt).getTime();
      const serverTime = new Date(item.updatedAt).getTime();
      if (!isNaN(clientTime) && Math.abs(serverTime - clientTime) > 1000) {
        throw new ConflictError(
          'Dữ liệu Item đã bị sửa đổi bởi một phiên làm việc khác. Vui lòng tải lại trước khi lưu.'
        );
      }
    }

    // 2. Resolve template to know field scope (shared, unversioned, versioned)
    const eff = await templateService.resolveEffectiveTemplate(item, code, vNum);
    const template = eff || (await templateService.resolveTemplate(item.templateId));
    const fieldMap = new Map(); // identifier (id or name) -> field definition

    if (template && template.sections) {
      for (const sec of template.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            fieldMap.set(f._id.toString(), f);
            fieldMap.set(f.name, f);
          }
        }
      }
    }

    // 3. Find or ensure language and version
    let langEntry = item.languages.find((l) => l.code === code);
    if (!langEntry) {
      item.languages.push({
        code,
        unversionedFields: new Map(),
        versions: [],
      });
      langEntry = item.languages[item.languages.length - 1];
    }

    let versionEntry = langEntry.versions.find((v) => v.version === vNum);
    if (!versionEntry) {
      langEntry.versions.push({
        version: vNum,
        fields: new Map(),
        createdBy: userId,
        createdAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date(),
      });
      versionEntry = langEntry.versions[langEntry.versions.length - 1];
    }

    // Initialize maps if missing
    if (!item.sharedFields) item.sharedFields = new Map();
    if (!langEntry.unversionedFields) langEntry.unversionedFields = new Map();
    if (!versionEntry.fields) versionEntry.fields = new Map();
    if (!item.fields) item.fields = new Map();

    const userRoles = Array.isArray(user?.roles) ? user.roles.map(r => r.name || r) : [];
    const isAdmin = userRoles.includes('Administrator');

    // 4. Process each submitted field
    for (const [key, rawValue] of Object.entries(fieldsData)) {
      const fieldDef = fieldMap.get(key);
      const storageKey = fieldDef ? fieldDef._id.toString() : key;
      const fieldType = fieldDef ? fieldDef.type : 'Single-Line Text';
      const handler = getFieldHandler(fieldType);

      // Field ACL enforcement (writeRoles check)
      if (fieldDef && fieldDef.permissions) {
        const perms = fieldDef.permissions;
        if (!isAdmin && perms.writeRoles && perms.writeRoles.length > 0) {
          if (!perms.writeRoles.some(r => userRoles.includes(r))) {
            continue; // Skip field without write permission
          }
        }
      }

      // Sanitize / clean value
      const cleanedValue = handler && handler.sanitize ? handler.sanitize(rawValue, fieldDef) : rawValue;

      if (fieldDef && fieldDef.shared) {
        // Cấp 1: Shared field
        item.sharedFields.set(storageKey, cleanedValue);
        item.fields.set(storageKey, cleanedValue); // legacy sync
      } else if (fieldDef && fieldDef.unversioned) {
        // Cấp 2: Unversioned field
        langEntry.unversionedFields.set(storageKey, cleanedValue);
      } else {
        // Cấp 3: Versioned field (default)
        versionEntry.fields.set(storageKey, cleanedValue);
      }
    }

    // 5. Update timestamps and user metadata
    versionEntry.updatedBy = userId;
    versionEntry.updatedAt = new Date();
    item.updatedBy = userId;
    item.updatedAt = new Date();

    await item.save();

    // GĐ 8: If this version was in a Final (Approved) workflow state and is edited,
    // automatically transition it back to initial (Draft) state per DEC-039.
    try {
      const workflowService = require('./workflowService');
      await workflowService.handleItemEdited(item, code, vNum, { _id: userId });
    } catch {
      // Ignore if workflow not assigned
    }

    return {
      item,
      language: code,
      version: vNum,
      updatedAt: item.updatedAt,
    };
  },
};

module.exports = versionService;
