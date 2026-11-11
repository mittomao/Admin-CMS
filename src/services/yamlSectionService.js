'use strict';

/**
 * Treecraft CMS - Section-Based YAML Service (DEC-053 / Phase 11-Y2)
 * Handles section-scoped Reserialize (DB -> YAML) and Sync (YAML -> DB),
 * enforces dry-run verification, reference integrity, and orphan detection.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const branding = require('../config/branding');
const Item = require('../models/Item');
const Template = require('../models/Template');
const templateService = require('./templateService');
const COMPATIBLE_TYPE_TRANSITIONS = templateService.COMPATIBLE_TYPE_TRANSITIONS || {
  'Single-Line Text': ['Multi-Line Text', 'Rich Text'],
  'Multi-Line Text': ['Single-Line Text', 'Rich Text'],
  'Rich Text': ['Multi-Line Text'],
  'Number': ['Single-Line Text'],
  'Date': ['Single-Line Text'],
  'Checkbox': ['Single-Line Text'],
  'Droplist': ['Single-Line Text'],
  'Image': ['Single-Line Text'],
};
const { getSection } = require('../config/serializationSections');
const {
  resolveSectionDir,
  resolveSectionManifestPath,
  resolveGlobalManifestPath,
  itemPathToRelativeFile,
  ensureDirExists,
  validateWindowsPath,
  getSerializationDir,
  PROJECT_ROOT,
} = require('../config/serializationPaths');
const {
  serializeItemToYaml,
  parseYamlToItem,
  writeItemFileIfChanged,
} = require('./yamlItemSerializer');
const logger = require('../utils/logger');
const eventBus = require('../utils/eventBus');

/**
 * Recursively find all YAML files in a directory
 * @param {string} dir
 * @param {string} [baseDir=dir]
 * @returns {Array<string>} Relative file paths
 */
function scanYamlFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanYamlFiles(fullPath, baseDir));
    } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
      if (entry.name !== '.manifest.json' && entry.name !== 'serialization.manifest.yml') {
        results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
      }
    }
  }
  return results;
}

/**
 * Write global manifest without timestamp to prevent dirty git diffs (DEC-054)
 */
function writeGlobalManifest() {
  const globalManifestPath = resolveGlobalManifestPath();
  const manifestContent = [
    'formatVersion: "1.0"',
    'layoutVersion: 2',
    'generator: "Treecraft CMS"',
    'sections:',
    '  - Templates',
    '  - Renderings',
    '  - Layouts',
    '  - Placeholders',
    '  - Contents',
    '',
  ].join('\n');
  fs.writeFileSync(globalManifestPath, manifestContent, 'utf8');
}

/**
 * Detect legacy layout structure and guide the user to migrate (DEC-054)
 */
function checkLegacyLayout() {
  const baseDir = getSerializationDir();
  const oldItemsDir = path.join(baseDir, 'items');
  const legacyDataDir = path.join(PROJECT_ROOT, 'data/serialization');

  if (fs.existsSync(oldItemsDir) || (fs.existsSync(legacyDataDir) && baseDir !== legacyDataDir && !fs.existsSync(baseDir))) {
    throw new Error(
      `[Serialization Error] Phát hiện cấu trúc thư mục Serialization cũ (v1). ` +
      `Vui lòng chạy lệnh di chuyển: "npm run serialize:migrate-layout" trước khi tiếp tục.`
    );
  }
}

/**
 * Compute SHA-256 hash of all files in section directory
 * @param {string} sectionDir
 * @param {Array<string>} fileList
 * @returns {string} Hex hash
 */
function computeDirectoryHash(sectionDir, fileList) {
  const hash = crypto.createHash('sha256');
  const sorted = [...fileList].sort();
  for (const relFile of sorted) {
    const full = path.join(sectionDir, relFile);
    if (fs.existsSync(full)) {
      hash.update(relFile);
      hash.update(fs.readFileSync(full));
    }
  }
  return hash.digest('hex');
}

/**
 * Count items currently storing data for a specific field in a template (or child templates)
 * @param {string|mongoose.Types.ObjectId} templateId
 * @param {string} fieldId
 * @returns {Promise<number>}
 */
async function countFieldUsage(templateId, fieldId) {
  if (!templateId || !fieldId) return 0;
  const tIdStr = templateId.toString();
  const fIdStr = fieldId.toString();

  const inheriting = await Template.find({ baseTemplates: tIdStr }).select('_id').lean();
  const allTemplateIds = [tIdStr, ...inheriting.map((t) => t._id.toString())];

  const count = await Item.countDocuments({
    templateId: { $in: allTemplateIds },
    $or: [
      { [`languages.versions.fields.${fIdStr}`]: { $exists: true, $nin: ['', null] } },
      { [`languages.unversionedFields.${fIdStr}`]: { $exists: true, $nin: ['', null] } },
      { [`sharedFields.${fIdStr}`]: { $exists: true, $nin: ['', null] } },
      { [`fields.${fIdStr}`]: { $exists: true, $nin: ['', null] } },
    ],
  });

  return count;
}

/**
 * Build MongoDB query for a section
 * @param {Object} section
 * @returns {Object} Mongo query
 */
function buildSectionMongoQuery(section) {
  const rootConditions = section.roots.map((root) => ({
    $or: [{ path: root }, { path: { $regex: `^${root}/` } }],
  }));

  const query = { $or: rootConditions };

  if (section.excludeRoots && section.excludeRoots.length > 0) {
    const excludeConditions = section.excludeRoots.map((exc) => ({
      path: { $regex: `^${exc}($|/)` },
    }));
    query.$nor = excludeConditions;
  }

  return query;
}

class YamlSectionService {
  /**
   * Get synchronization status of a section
   * @param {string} sectionKey
   * @returns {Promise<Object>}
   */
  async getSectionStatus(sectionKey) {
    const section = getSection(sectionKey);
    if (!section) {
      throw new Error(`[yamlSectionService] Unknown section key: ${sectionKey}`);
    }

    const sectionDir = resolveSectionDir(sectionKey);
    const manifestPath = resolveSectionManifestPath(sectionKey);

    // 1. Count items in DB
    const dbQuery = buildSectionMongoQuery(section);
    const dbCount = await Item.countDocuments(dbQuery);

    // 2. Count YAML files on disk
    const files = scanYamlFiles(sectionDir);
    const yamlCount = files.length;

    // 3. Read manifest if exists
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = null;
      }
    }

    // 4. Determine comparison badge
    let comparison = 'IN_SYNC';
    let comparisonLabel = 'Đồng bộ';
    let comparisonClass = 'badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';

    if (yamlCount === 0) {
      comparison = 'NO_YAML';
      comparisonLabel = 'Chưa có YAML';
      comparisonClass = 'badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    } else if (dbCount > yamlCount) {
      comparison = 'DB_NEWER';
      comparisonLabel = 'DB có thêm item';
      comparisonClass = 'badge bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    } else if (yamlCount > dbCount) {
      comparison = 'YAML_NEWER';
      comparisonLabel = 'YAML có thêm file';
      comparisonClass = 'badge bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
    } else if (manifest && manifest.lastReserializedAt) {
      // Check if any DB item has updatedAt > lastReserializedAt
      const newerDbItem = await Item.findOne({
        ...dbQuery,
        updatedAt: { $gt: new Date(manifest.lastReserializedAt) },
      }).select('_id updatedAt').lean();

      if (newerDbItem) {
        comparison = 'DB_NEWER';
        comparisonLabel = 'DB mới hơn';
        comparisonClass = 'badge bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      }
    }

    return {
      key: section.key,
      label: section.label,
      description: section.description,
      roots: section.roots,
      folder: section.folder,
      defaultMode: section.defaultMode,
      dependsOn: section.dependsOn,
      icon: section.icon,
      color: section.color,
      dbCount,
      yamlCount,
      lastReserializedAt: manifest ? manifest.lastReserializedAt : null,
      lastSyncedAt: manifest ? manifest.lastSyncedAt : null,
      comparison,
      comparisonLabel,
      comparisonClass,
    };
  }

  /**
   * Reserialize a section from DB to YAML files
   * @param {string} sectionKey
   * @param {Object} [options={}]
   * @param {boolean} [options.pruneOrphans=false]
   * @param {Object} [options.user]
   * @returns {Promise<Object>} Reserialize summary
   */
  async reserializeSection(sectionKey, options = {}) {
    const { pruneOrphans = false, user = null } = options;
    const section = getSection(sectionKey);
    if (!section) {
      throw new Error(`[yamlSectionService] Unknown section key: ${sectionKey}`);
    }

    const sectionDir = resolveSectionDir(sectionKey);
    ensureDirExists(sectionDir);

    logger.info(`[yamlSectionService] Starting Reserialize for section "${sectionKey}". User: ${user?.username || 'system'}`);

    // Pre-load reference maps for environment portability
    const allTemplates = await Template.find({}).lean();
    const templateMap = new Map(allTemplates.map((t) => [t._id.toString(), t]));
    const templateSchemaMap = new Map();
    for (const t of allTemplates) {
      templateSchemaMap.set(t._id.toString(), t);
      templateSchemaMap.set(t.name, t);
      if (t.path) {
        templateSchemaMap.set(t.path, t);
      }
    }

    const layoutItems = await Item.find({ path: { $regex: `^${branding.PATHS.LAYOUT || '/root/layout'}` } })
      .select('name path')
      .lean();
    const layoutMap = new Map(layoutItems.map((l) => [l._id.toString(), l]));
    const renderingMap = new Map(layoutItems.map((r) => [r._id.toString(), r]));

    const allDbItems = await Item.find(buildSectionMongoQuery(section)).lean();
    const itemPathMap = new Map(allDbItems.map((i) => [i._id.toString(), i.path]));

    const refMaps = { templateMap, layoutMap, renderingMap, itemPathMap, templateSchemaMap };

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const writtenFiles = new Set();

    for (const item of allDbItems) {
      const relFile = itemPathToRelativeFile(sectionKey, item.path);
      const absFile = path.join(sectionDir, relFile);

      const winCheck = validateWindowsPath(absFile);
      if (!winCheck.valid) {
        throw new Error(`[yamlSectionService] ${winCheck.error}`);
      }
      if (winCheck.warning) {
        logger.warn(`[yamlSectionService] ${winCheck.warning}`);
      }

      writtenFiles.add(relFile.replace(/\\/g, '/'));

      const yamlStr = serializeItemToYaml(item, refMaps);
      const res = writeItemFileIfChanged(absFile, yamlStr);

      if (res.isNew) {
        createdCount++;
      } else if (res.written) {
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    // Orphan detection
    const diskFiles = scanYamlFiles(sectionDir);
    const orphanFiles = [];
    for (const df of diskFiles) {
      if (!writtenFiles.has(df)) {
        orphanFiles.push(df);
        if (pruneOrphans) {
          const absOrphan = path.join(sectionDir, df);
          if (fs.existsSync(absOrphan)) {
            fs.unlinkSync(absOrphan);
          }
        }
      }
    }

    // Write manifest
    const manifestPath = resolveSectionManifestPath(sectionKey);
    const manifestData = {
      sectionKey,
      itemCount: allDbItems.length,
      lastReserializedAt: new Date().toISOString(),
      lastReserializedBy: user?.username || 'system',
      stats: {
        created: createdCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        orphansDetected: orphanFiles.length,
        orphansPruned: pruneOrphans ? orphanFiles.length : 0,
      },
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

    // Write global layout manifest (DEC-054)
    writeGlobalManifest();

    // Emit event for Audit Log
    eventBus.emit('serialization.section.reserialized', {
      sectionKey,
      itemCount: allDbItems.length,
      stats: manifestData.stats,
      user: user?.username || 'system',
      timestamp: manifestData.lastReserializedAt,
    });

    return {
      success: true,
      sectionKey,
      totalItems: allDbItems.length,
      created: createdCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      orphans: orphanFiles,
      prunedOrphans: pruneOrphans,
    };
  }

  /**
   * Dry-run Sync: validate YAML files and inspect potential changes without modifying DB
   * @param {string} sectionKey
   * @param {Object} [options={}]
   * @param {string} [options.mode]
   * @param {Object} [options.user]
   * @returns {Promise<Object>} Dry-run analysis and hash
   */
  async dryRunSyncSection(sectionKey, options = {}) {
    checkLegacyLayout();

    const section = getSection(sectionKey);
    if (!section) {
      throw new Error(`[yamlSectionService] Unknown section key: ${sectionKey}`);
    }

    const mode = (options.mode || section.defaultMode).toLowerCase();
    const sectionDir = resolveSectionDir(sectionKey);
    const files = scanYamlFiles(sectionDir);

    if (files.length === 0) {
      return {
        success: true,
        sectionKey,
        mode,
        totalFiles: 0,
        toCreate: 0,
        toUpdate: 0,
        toSkip: 0,
        errors: [],
        warnings: ['Thư mục section hiện không có tệp YAML nào để đồng bộ.'],
        missingDependencies: [],
        hash: '',
      };
    }

    const hash = computeDirectoryHash(sectionDir, files);
    const errors = [];
    const warnings = [];
    const missingDeps = [];
    const fieldDiffs = [];
    const deleteMissingFields = Boolean(options.deleteMissingFields);

    // Pre-load reference maps from DB
    const existingTemplates = await Template.find({}).lean();
    const templatePathSet = new Set(existingTemplates.map((t) => t.path));
    const templateIdSet = new Set(existingTemplates.map((t) => t._id.toString()));
    const templateMapByPath = new Map(existingTemplates.map((t) => [t.path, t]));
    const templateMapByName = new Map(existingTemplates.map((t) => [t.name, t]));
    const templateMapById = new Map(existingTemplates.map((t) => [t._id.toString(), t]));

    const existingLayouts = await Item.find({ path: { $regex: `^${branding.PATHS.LAYOUT || '/root/layout'}` } })
      .select('_id name path')
      .lean();
    const layoutPathSet = new Set(existingLayouts.map((l) => l.path));
    const layoutIdSet = new Set(existingLayouts.map((l) => l._id.toString()));

    // Pre-load existing items in DB under section roots
    const existingItems = await Item.find(buildSectionMongoQuery(section)).select('_id path').lean();
    const existingPathMap = new Map(existingItems.map((i) => [i.path, i]));
    const existingIdMap = new Map(existingItems.map((i) => [i._id.toString(), i]));

    let toCreate = 0;
    let toUpdate = 0;
    let toSkip = 0;

    for (const relFile of files) {
      const absFile = path.join(sectionDir, relFile);
      let itemData;
      try {
        const content = fs.readFileSync(absFile, 'utf8');
        itemData = parseYamlToItem(content, relFile);
      } catch (err) {
        errors.push({ file: relFile, error: err.message });
        continue;
      }

      // Path security check: item.path MUST belong to section roots
      let belongsToSection = false;
      for (const root of section.roots) {
        if (itemData.path === root || itemData.path.startsWith(`${root}/`)) {
          belongsToSection = true;
          break;
        }
      }

      if (!belongsToSection) {
        errors.push({
          file: relFile,
          error: `Đường dẫn "${itemData.path}" nằm ngoài phạm vi các nhánh của section "${sectionKey}" (${section.roots.join(', ')})`,
        });
        continue;
      }

      // Check template dependency
      if (itemData.template) {
        const tPath = itemData.template.path;
        const tId = itemData.template.id;
        if (!templatePathSet.has(tPath) && !templateIdSet.has(tId)) {
          missingDeps.push({
            file: relFile,
            itemPath: itemData.path,
            dependencyType: 'Template',
            reference: tPath || tId,
          });
        }
      }

      // Check presentation rendering dependencies
      if (itemData.presentation && Array.isArray(itemData.presentation.renderings)) {
        for (const r of itemData.presentation.renderings) {
          const rPath = r.renderingPath;
          const rId = r.renderingId;
          if (rPath && !layoutPathSet.has(rPath) && !layoutIdSet.has(rId)) {
            missingDeps.push({
              file: relFile,
              itemPath: itemData.path,
              dependencyType: 'Rendering',
              reference: rPath || rId,
            });
          }
        }
      }

      // Analyze Template field definitions diff (DEC-055)
      if (Array.isArray(itemData.sections)) {
        const existingTpl =
          (itemData._id ? templateMapById.get(itemData._id) : null) ||
          (itemData.path ? templateMapByPath.get(itemData.path) : null) ||
          templateMapByName.get(itemData.name);

        if (existingTpl) {
          const dbFieldsById = new Map();
          const dbFieldsByName = new Map();
          for (const s of existingTpl.sections || []) {
            for (const f of s.fields || []) {
              const fid = f._id ? f._id.toString() : f.id;
              if (fid) dbFieldsById.set(fid, { field: f, section: s });
              dbFieldsByName.set(f.name, { field: f, section: s });
            }
          }

          const yamlFieldIds = new Set();
          const yamlFieldNames = new Set();

          for (const secYaml of itemData.sections) {
            for (const fYaml of secYaml.fields || []) {
              const fid = fYaml.id || fYaml._id;
              if (fid) yamlFieldIds.add(String(fid));
              yamlFieldNames.add(fYaml.name);

              const matched = (fid ? dbFieldsById.get(String(fid)) : null) || dbFieldsByName.get(fYaml.name);
              if (matched) {
                const dbF = matched.field;
                if (dbF.type !== fYaml.type) {
                  const usageCount = await countFieldUsage(existingTpl._id, dbF._id);
                  const allowedTransitions = COMPATIBLE_TYPE_TRANSITIONS[dbF.type] || [];
                  const isCompatible = allowedTransitions.includes(fYaml.type);

                  if (!isCompatible && usageCount > 0) {
                    errors.push({
                      file: relFile,
                      error: `Template "${existingTpl.name}", trường "${fYaml.name}": chuyển đổi kiểu từ "${dbF.type}" sang "${fYaml.type}" không tương thích (${usageCount} item có dữ liệu).`,
                    });
                  }

                  fieldDiffs.push({
                    templateName: existingTpl.name,
                    sectionName: secYaml.name,
                    fieldName: fYaml.name,
                    fieldId: fid || dbF._id?.toString(),
                    action: 'modify',
                    change: `Kiểu: ${dbF.type} → ${fYaml.type}${!isCompatible && usageCount > 0 ? ' [KHÔNG TƯƠNG THÍCH]' : ''}`,
                    usageCount,
                  });
                } else if (dbF.name !== fYaml.name) {
                  fieldDiffs.push({
                    templateName: existingTpl.name,
                    sectionName: secYaml.name,
                    fieldName: fYaml.name,
                    fieldId: fid || dbF._id?.toString(),
                    action: 'rename',
                    change: `Đổi tên: ${dbF.name} → ${fYaml.name}`,
                    usageCount: 0,
                  });
                } else if (
                  typeof secYaml.sortOrder === 'number' &&
                  typeof fYaml.sortOrder === 'number' &&
                  dbF.sortOrder !== fYaml.sortOrder
                ) {
                  fieldDiffs.push({
                    templateName: existingTpl.name,
                    sectionName: secYaml.name,
                    fieldName: fYaml.name,
                    fieldId: fid || dbF._id?.toString(),
                    action: 'reorder',
                    change: `Thứ tự: ${dbF.sortOrder} → ${fYaml.sortOrder}`,
                    usageCount: 0,
                  });
                }
              } else {
                fieldDiffs.push({
                  templateName: existingTpl.name,
                  sectionName: secYaml.name,
                  fieldName: fYaml.name,
                  fieldId: fid || 'new',
                  action: 'add',
                  change: `[+ Thêm mới] type: ${fYaml.type}`,
                  usageCount: 0,
                });
              }
            }
          }

          // Check DB fields missing in YAML
          for (const [fid, { field: dbF, section: dbSec }] of dbFieldsById.entries()) {
            if (!yamlFieldIds.has(fid) && !yamlFieldNames.has(dbF.name)) {
              const usageCount = await countFieldUsage(existingTpl._id, dbF._id);
              if (deleteMissingFields) {
                warnings.push(
                  `Trường "${dbF.name}" trong template "${existingTpl.name}" sẽ bị XOÁ khỏi schema (${usageCount} item đang chứa dữ liệu).`
                );
                fieldDiffs.push({
                  templateName: existingTpl.name,
                  sectionName: dbSec.name,
                  fieldName: dbF.name,
                  fieldId: fid,
                  action: 'remove',
                  change: `Xoá field khỏi template (${usageCount} item có dữ liệu)`,
                  usageCount,
                });
              } else {
                warnings.push(
                  `Trường "${dbF.name}" trong template "${existingTpl.name}" có trong DB nhưng không có trong YAML. Giữ nguyên (deleteMissingFields = false).`
                );
                fieldDiffs.push({
                  templateName: existingTpl.name,
                  sectionName: dbSec.name,
                  fieldName: dbF.name,
                  fieldId: fid,
                  action: 'keep_missing',
                  change: `Giữ nguyên trong DB (${usageCount} item có dữ liệu)`,
                  usageCount,
                });
              }
            }
          }
        } else {
          // Entirely new template
          for (const secYaml of itemData.sections) {
            for (const fYaml of secYaml.fields || []) {
              fieldDiffs.push({
                templateName: itemData.name,
                sectionName: secYaml.name,
                fieldName: fYaml.name,
                fieldId: fYaml.id || 'new',
                action: 'add',
                change: `[+ Thêm mới template] type: ${fYaml.type}`,
                usageCount: 0,
              });
            }
          }
        }
      }

      // Check create vs update vs skip
      const existing = existingPathMap.get(itemData.path) || (itemData._id ? existingIdMap.get(itemData._id) : null);
      if (!existing) {
        toCreate++;
      } else if (mode === 'createonly') {
        toSkip++;
      } else {
        toUpdate++;
      }
    }

    return {
      success: errors.length === 0,
      sectionKey,
      mode,
      totalFiles: files.length,
      toCreate,
      toUpdate,
      toSkip,
      errors,
      warnings,
      missingDependencies: missingDeps,
      fieldDiffs,
      hash,
    };
  }

  /**
   * Sync Section from YAML into Database
   * @param {string} sectionKey
   * @param {Object} [options={}]
   * @param {string} [options.mode]
   * @param {string} [options.dryRunHash]
   * @param {boolean} [options.deleteMissing=false]
   * @param {Object} [options.user]
   * @returns {Promise<Object>} Sync execution result
   */
  async syncSection(sectionKey, options = {}) {
    checkLegacyLayout();

    const { dryRunHash = null, deleteMissing = false, deleteMissingFields = false, user = null } = options;
    const section = getSection(sectionKey);
    if (!section) {
      throw new Error(`[yamlSectionService] Unknown section key: ${sectionKey}`);
    }

    const mode = (options.mode || section.defaultMode).toLowerCase();
    const sectionDir = resolveSectionDir(sectionKey);
    const files = scanYamlFiles(sectionDir);

    if (files.length === 0) {
      return {
        success: true,
        sectionKey,
        mode,
        totalFiles: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        deleted: 0,
      };
    }

    // Verify dry-run hash integrity
    if (dryRunHash) {
      const currentHash = computeDirectoryHash(sectionDir, files);
      if (currentHash !== dryRunHash) {
        throw new Error(
          '[yamlSectionService] Thư mục tệp YAML đã bị thay đổi sau khi chạy Dry-Run. Vui lòng thực hiện Dry-Run lại trước khi Sync.'
        );
      }
    }

    logger.info(`[yamlSectionService] Executing Sync for section "${sectionKey}" (mode: ${mode}). User: ${user?.username || 'system'}`);

    // Parse all files first
    const parsedItems = [];
    for (const relFile of files) {
      const absFile = path.join(sectionDir, relFile);
      const content = fs.readFileSync(absFile, 'utf8');
      const itemData = parseYamlToItem(content, relFile);

      // Verify path belongs to section
      let belongsToSection = false;
      for (const root of section.roots) {
        if (itemData.path === root || itemData.path.startsWith(`${root}/`)) {
          belongsToSection = true;
          break;
        }
      }

      if (!belongsToSection) {
        throw new Error(
          `[yamlSectionService] Tệp "${relFile}" có đường dẫn "${itemData.path}" nằm ngoài phạm vi section "${sectionKey}". Bị từ chối.`
        );
      }

      parsedItems.push(itemData);
    }

    // Sort items by path depth ascending (parents created before children)
    parsedItems.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

    // Pre-load reference maps
    const allTemplates = await Template.find({}).select('_id name path').lean();
    const templateMapByPath = new Map(allTemplates.map((t) => [t.path, t]));
    const templateMapById = new Map(allTemplates.map((t) => [t._id.toString(), t]));

    const allLayouts = await Item.find({ path: { $regex: `^${branding.PATHS.LAYOUT || '/root/layout'}` } })
      .select('_id name path')
      .lean();
    const layoutMapByPath = new Map(allLayouts.map((l) => [l.path, l]));
    const layoutMapById = new Map(allLayouts.map((l) => [l._id.toString(), l]));

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const processedIds = new Set();

    for (const data of parsedItems) {
      // Find template
      let resolvedTemplateId = null;
      if (data.template) {
        const tByPath = data.template.path ? templateMapByPath.get(data.template.path) : null;
        const tById = data.template.id ? templateMapById.get(data.template.id) : null;
        resolvedTemplateId = (tByPath || tById)?._id || null;
      }

      // Find parentId if missing
      let resolvedParentId = data.parentId || null;
      if (!resolvedParentId && data.parentPath) {
        const parentItem = await Item.findOne({ path: data.parentPath }).select('_id').lean();
        resolvedParentId = parentItem?._id || null;
      } else if (!resolvedParentId && data.path) {
        const parts = data.path.split('/');
        parts.pop();
        const parentPath = parts.join('/');
        if (parentPath && parentPath !== '') {
          const parentItem = await Item.findOne({ path: parentPath }).select('_id').lean();
          resolvedParentId = parentItem?._id || null;
        }
      }

      // Resolve Presentation if present
      let resolvedPresentation = null;
      if (data.presentation) {
        let layoutId = null;
        if (data.presentation.layoutPath) {
          layoutId = layoutMapByPath.get(data.presentation.layoutPath)?._id || null;
        }
        if (!layoutId && data.presentation.layoutId) {
          layoutId = layoutMapById.get(data.presentation.layoutId)?._id || null;
        }

        const renderings = Array.isArray(data.presentation.renderings)
          ? data.presentation.renderings.map((r) => {
              let rendId = null;
              if (r.renderingPath) {
                rendId = layoutMapByPath.get(r.renderingPath)?._id || null;
              }
              if (!rendId && r.renderingId) {
                rendId = layoutMapById.get(r.renderingId)?._id || null;
              }
              return {
                uid: r.uid || r.id || crypto.randomUUID(),
                renderingId: rendId,
                placeholder: r.placeholder || 'maincontent',
                placeholderKey: r.placeholder || 'maincontent',
                sortOrder: r.sortOrder || 100,
                parameters: r.parameters || {},
                datasourceId: r.datasource || null,
              };
            })
          : [];

        resolvedPresentation = {
          final: {
            layoutId,
            renderings,
          },
        };
      }

      // Upsert Template schema into MongoDB (DEC-055)
      if (Array.isArray(data.sections)) {
        let existingTpl = null;
        if (data._id) existingTpl = await Template.findById(data._id);
        if (!existingTpl && data.path) existingTpl = await Template.findOne({ path: data.path });
        if (!existingTpl && data.name) existingTpl = await Template.findOne({ name: data.name });

        if (existingTpl) {
          // Enforce type compatibility against item content
          for (const secYaml of data.sections) {
            for (const fYaml of secYaml.fields || []) {
              let matchedDbField = null;
              for (const s of existingTpl.sections || []) {
                for (const f of s.fields || []) {
                  if ((fYaml.id && f._id.toString() === fYaml.id) || f.name === fYaml.name) {
                    matchedDbField = f;
                    break;
                  }
                }
                if (matchedDbField) break;
              }

              if (matchedDbField && matchedDbField.type !== fYaml.type) {
                const usageCount = await countFieldUsage(existingTpl._id, matchedDbField._id);
                const allowed = COMPATIBLE_TYPE_TRANSITIONS[matchedDbField.type] || [];
                if (!allowed.includes(fYaml.type) && usageCount > 0) {
                  throw new Error(
                    `[Sync Error] Không thể chuyển đổi kiểu trường "${fYaml.name}" trong template "${existingTpl.name}" từ "${matchedDbField.type}" sang "${fYaml.type}" (không tương thích vì có ${usageCount} item đang chứa dữ liệu).`
                  );
                }
              }
            }
          }

          // Reconcile sections & fields
          const existingSecsById = new Map((existingTpl.sections || []).map((s) => [s._id.toString(), s]));
          const existingSecsByName = new Map((existingTpl.sections || []).map((s) => [s.name, s]));
          const newSections = [];
          const processedSecIds = new Set();

          for (const secYaml of data.sections) {
            const secId = secYaml.id || secYaml._id;
            const matchedSec = (secId ? existingSecsById.get(String(secId)) : null) || existingSecsByName.get(secYaml.name);
            const targetSecId = matchedSec?._id || (secId && mongoose.Types.ObjectId.isValid(secId) ? new mongoose.Types.ObjectId(secId) : new mongoose.Types.ObjectId());
            processedSecIds.add(targetSecId.toString());

            const existingFieldsById = new Map((matchedSec?.fields || []).map((f) => [f._id.toString(), f]));
            const existingFieldsByName = new Map((matchedSec?.fields || []).map((f) => [f.name, f]));
            const secFields = [];
            const processedFieldIdsInSec = new Set();

            for (const fYaml of secYaml.fields || []) {
              const fId = fYaml.id || fYaml._id;
              const matchedF = (fId ? existingFieldsById.get(String(fId)) : null) || existingFieldsByName.get(fYaml.name);
              const targetFieldId = matchedF?._id || (fId && mongoose.Types.ObjectId.isValid(fId) ? new mongoose.Types.ObjectId(fId) : new mongoose.Types.ObjectId());
              processedFieldIdsInSec.add(targetFieldId.toString());

              secFields.push({
                _id: targetFieldId,
                name: fYaml.name,
                title: fYaml.title || fYaml.name,
                type: fYaml.type,
                source: fYaml.source || '',
                required: Boolean(fYaml.required),
                defaultValue: fYaml.defaultValue !== undefined ? fYaml.defaultValue : '',
                shared: Boolean(fYaml.shared),
                unversioned: Boolean(fYaml.unversioned),
                helpText: fYaml.helpText || '',
                validation: fYaml.validation || {},
                sortOrder: typeof fYaml.sortOrder === 'number' ? fYaml.sortOrder : 100,
                visibility: fYaml.visibility || {},
                permissions: fYaml.permissions || {},
                layout: fYaml.layout || {},
                config: fYaml.config || {},
              });
            }

            // If deleteMissingFields is false, retain existing fields in this section
            if (!deleteMissingFields && matchedSec) {
              for (const ef of matchedSec.fields || []) {
                if (!processedFieldIdsInSec.has(ef._id.toString())) {
                  secFields.push(ef);
                }
              }
            }

            newSections.push({
              _id: targetSecId,
              name: secYaml.name,
              sortOrder: typeof secYaml.sortOrder === 'number' ? secYaml.sortOrder : 100,
              fields: secFields,
            });
          }

          // If deleteMissingFields is false, retain remaining existing sections
          if (!deleteMissingFields) {
            for (const es of existingTpl.sections || []) {
              if (!processedSecIds.has(es._id.toString())) {
                newSections.push(es);
              }
            }
          }

          existingTpl.sections = newSections;
          existingTpl.name = data.name;
          if (data.displayName !== undefined) existingTpl.displayName = data.displayName;
          if (data.icon !== undefined) existingTpl.icon = data.icon;
          if (data.description !== undefined) existingTpl.description = data.description;
          if (data.isSystem !== undefined) existingTpl.isSystem = Boolean(data.isSystem);
          if (data.path !== undefined) existingTpl.path = data.path;

          if (Array.isArray(data.baseTemplates)) {
            existingTpl.baseTemplates = data.baseTemplates
              .map((b) => (b.id || b._id || (typeof b === 'string' ? b : null)))
              .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id));
          }

          if (Array.isArray(data.insertOptions)) {
            existingTpl.insertOptions = data.insertOptions
              .map((ins) => (ins.id || ins._id || (typeof ins === 'string' ? ins : null)))
              .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id));
          }

          if (data.standardValues) {
            existingTpl.standardValues = new Map(Object.entries(data.standardValues));
          }

          existingTpl.updatedBy = user?._id || null;
          await existingTpl.save();
        } else {
          // Create new Template document
          const tplSections = (data.sections || []).map((sec) => ({
            _id: sec.id && mongoose.Types.ObjectId.isValid(sec.id) ? new mongoose.Types.ObjectId(sec.id) : new mongoose.Types.ObjectId(),
            name: sec.name,
            sortOrder: typeof sec.sortOrder === 'number' ? sec.sortOrder : 100,
            fields: (sec.fields || []).map((f) => ({
              _id: f.id && mongoose.Types.ObjectId.isValid(f.id) ? new mongoose.Types.ObjectId(f.id) : new mongoose.Types.ObjectId(),
              name: f.name,
              title: f.title || f.name,
              type: f.type,
              source: f.source || '',
              required: Boolean(f.required),
              defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
              shared: Boolean(f.shared),
              unversioned: Boolean(f.unversioned),
              helpText: f.helpText || '',
              validation: f.validation || {},
              sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : 100,
              visibility: f.visibility || {},
              permissions: f.permissions || {},
              layout: f.layout || {},
              config: f.config || {},
            })),
          }));

          const newTpl = new Template({
            _id: data._id && mongoose.Types.ObjectId.isValid(data._id) ? new mongoose.Types.ObjectId(data._id) : undefined,
            name: data.name,
            displayName: data.displayName || data.name,
            icon: data.icon || 'ti ti-file-text',
            description: data.description || '',
            isSystem: Boolean(data.isSystem),
            path: data.path || '',
            sections: tplSections,
            baseTemplates: Array.isArray(data.baseTemplates)
              ? data.baseTemplates
                  .map((b) => (b.id || b._id || (typeof b === 'string' ? b : null)))
                  .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
                  .map((id) => new mongoose.Types.ObjectId(id))
              : [],
            insertOptions: Array.isArray(data.insertOptions)
              ? data.insertOptions
                  .map((ins) => (ins.id || ins._id || (typeof ins === 'string' ? ins : null)))
                  .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
                  .map((id) => new mongoose.Types.ObjectId(id))
              : [],
            standardValues: data.standardValues ? new Map(Object.entries(data.standardValues)) : {},
            createdBy: user?._id || null,
            updatedBy: user?._id || null,
          });

          await newTpl.save();
        }
      }

      // Check existing item by path or ID
      let existing = null;
      if (data._id) {
        existing = await Item.findById(data._id);
      }
      if (!existing && data.path) {
        existing = await Item.findOne({ path: data.path });
      }

      if (!existing) {
        // Create new item
        const newItem = new Item({
          _id: data._id || undefined,
          name: data.name,
          displayName: data.displayName || data.name,
          path: data.path,
          templateId: resolvedTemplateId,
          parentId: resolvedParentId,
          sortOrder: data.sortOrder || 100,
          icon: data.icon || '',
          sharedFields: data.sharedFields || {},
          languages: data.languages || [],
          presentation: resolvedPresentation || undefined,
          createdBy: user?._id || null,
          updatedBy: user?._id || null,
        });

        // Compute ancestors if parent known
        if (resolvedParentId) {
          const p = await Item.findById(resolvedParentId).select('ancestors').lean();
          if (p) {
            newItem.ancestors = [...(p.ancestors || []), p._id];
          }
        }

        await newItem.save();
        createdCount++;
        processedIds.add(newItem._id.toString());
      } else if (mode === 'createonly') {
        // Skip existing in createOnly mode
        skippedCount++;
        processedIds.add(existing._id.toString());
      } else {
        // Overwrite mode: update fields, languages, presentation
        existing.name = data.name;
        if (data.displayName !== undefined) existing.displayName = data.displayName;
        if (data.icon !== undefined) existing.icon = data.icon;
        if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
        if (resolvedTemplateId) existing.templateId = resolvedTemplateId;
        if (resolvedParentId) existing.parentId = resolvedParentId;

        if (data.sharedFields) {
          existing.sharedFields = data.sharedFields;
        }

        if (Array.isArray(data.languages)) {
          existing.languages = data.languages;
        }

        if (resolvedPresentation) {
          existing.presentation = resolvedPresentation;
        }

        existing.updatedBy = user?._id || null;
        await existing.save();
        updatedCount++;
        processedIds.add(existing._id.toString());
      }
    }

    // Optional deleteMissing items
    let deletedCount = 0;
    if (deleteMissing) {
      const allDbItems = await Item.find(buildSectionMongoQuery(section)).select('_id path').lean();
      for (const item of allDbItems) {
        if (!processedIds.has(item._id.toString())) {
          await Item.deleteOne({ _id: item._id });
          deletedCount++;
        }
      }
    }

    // Update manifest with sync stats
    const manifestPath = resolveSectionManifestPath(sectionKey);
    let manifestData = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {
        manifestData = {};
      }
    }

    manifestData.lastSyncedAt = new Date().toISOString();
    manifestData.lastSyncedBy = user?.username || 'system';
    manifestData.lastSyncStats = {
      mode,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      deleted: deletedCount,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

    // Write global layout manifest (DEC-054)
    writeGlobalManifest();

    // Emit event for Audit Log
    eventBus.emit('serialization.section.synced', {
      sectionKey,
      mode,
      stats: manifestData.lastSyncStats,
      user: user?.username || 'system',
      timestamp: manifestData.lastSyncedAt,
    });

    // Invalidate templateService cache after template sync (DEC-055)
    templateService.invalidateCache();

    return {
      success: true,
      sectionKey,
      mode,
      totalFiles: parsedItems.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      deleted: deletedCount,
    };
  }

  /**
   * Compare template field definitions between YAML files and Database (DEC-055)
   * @param {string} [sectionKey='template']
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  async getFieldDiff(sectionKey = 'template', options = {}) {
    const dryRunRes = await this.dryRunSyncSection(sectionKey, options);
    return {
      success: dryRunRes.success,
      sectionKey: dryRunRes.sectionKey,
      totalFiles: dryRunRes.totalFiles,
      fieldDiffs: dryRunRes.fieldDiffs || [],
      warnings: dryRunRes.warnings || [],
      errors: dryRunRes.errors || [],
      hash: dryRunRes.hash,
    };
  }
}

module.exports = new YamlSectionService();

