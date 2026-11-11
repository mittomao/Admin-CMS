'use strict';

/**
 * Treecraft CMS - Deterministic YAML Item Serializer (DEC-053 / DEC-054 / DEC-055)
 * Handles byte-stable serialization and deserialization of individual items and template schemas.
 * Embeds full field definitions (sections, fields, baseTemplates, insertOptions, standardValues).
 * Preserves file mtime when content has not changed to keep git status clean.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { fieldRegistry } = require('../fields');

/**
 * Build bidirectional lookup maps for Registry types:
 * e.g. "Single-Line Text" <-> "singleLineText"
 */
function buildTypeKeyMaps() {
  const allTypes = fieldRegistry.getAll();
  const toKeyMap = new Map();
  const fromKeyMap = new Map();

  for (const def of allTypes) {
    const canonical = def.type || def.name;
    const camel = canonical
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, (chr) => chr.toLowerCase());

    toKeyMap.set(canonical, camel);
    fromKeyMap.set(camel.toLowerCase(), canonical);
    fromKeyMap.set(canonical.toLowerCase(), canonical);
    if (def.viewSlug) {
      fromKeyMap.set(def.viewSlug.toLowerCase(), canonical);
    }
  }

  return { toKeyMap, fromKeyMap };
}

const { toKeyMap, fromKeyMap } = buildTypeKeyMaps();

/**
 * Convert canonical field type to typeKey (e.g. "Single-Line Text" -> "singleLineText")
 * @param {string} canonicalType
 * @returns {string}
 */
function toTypeKey(canonicalType) {
  if (!canonicalType || typeof canonicalType !== 'string') return 'singleLineText';
  return toKeyMap.get(canonicalType) || canonicalType;
}

/**
 * Resolve a typeKey or alias back to canonical registry type (e.g. "singleLineText" -> "Single-Line Text")
 * @param {string} typeKey
 * @returns {string|null}
 */
function fromTypeKey(typeKey) {
  if (!typeKey || typeof typeKey !== 'string') return null;
  return fromKeyMap.get(typeKey.trim().toLowerCase()) || null;
}

/**
 * Safe conversion of Mongoose Maps and nested objects to plain JS objects
 */
function toPlainObject(val) {
  if (!val) return {};
  if (val instanceof Map) {
    const obj = {};
    for (const [k, v] of val.entries()) {
      obj[k] = v instanceof Map ? toPlainObject(v) : v;
    }
    return obj;
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    const plain = {};
    for (const [k, v] of Object.entries(val)) {
      plain[k] = v instanceof Map ? toPlainObject(v) : v;
    }
    return plain;
  }
  return {};
}

/**
 * Normalizes item languages structure to pure serializable object
 */
function formatLanguages(languages) {
  if (!Array.isArray(languages)) return [];
  return languages.map((lang) => ({
    code: lang.code || 'vi',
    unversionedFields: toPlainObject(lang.unversionedFields),
    versions: Array.isArray(lang.versions)
      ? lang.versions.map((v) => ({
          version: v.version || 1,
          fields: toPlainObject(v.fields),
          workflowState: v.workflowState ? v.workflowState.toString() : null,
          validFrom: v.validFrom ? new Date(v.validFrom).toISOString() : null,
          validTo: v.validTo ? new Date(v.validTo).toISOString() : null,
          neverPublish: Boolean(v.neverPublish),
          note: v.note || '',
        }))
      : [],
  }));
}

/**
 * Format Presentation structure with portable paths
 */
function formatPresentation(presentation, { layoutMap = new Map(), renderingMap = new Map() } = {}) {
  if (!presentation || typeof presentation !== 'object') return null;

  const finalPresentation = presentation.final || presentation;
  if (!finalPresentation || (!finalPresentation.layoutId && (!finalPresentation.renderings || finalPresentation.renderings.length === 0))) {
    return null;
  }

  const layoutIdStr = finalPresentation.layoutId ? finalPresentation.layoutId.toString() : null;
  const layoutObj = layoutIdStr ? layoutMap.get(layoutIdStr) : null;

  const formattedRenderings = Array.isArray(finalPresentation.renderings)
    ? finalPresentation.renderings.map((r) => {
        const rendIdStr = r.renderingId ? r.renderingId.toString() : null;
        const rendObj = rendIdStr ? renderingMap.get(rendIdStr) : null;
        return {
          id: r.id || r._id ? (r.id || r._id).toString() : undefined,
          uid: r.uid || undefined,
          renderingId: rendIdStr,
          renderingPath: rendObj ? rendObj.path : undefined,
          renderingName: rendObj ? rendObj.name : undefined,
          placeholder: r.placeholder || '',
          sortOrder: r.sortOrder || 0,
          parameters: toPlainObject(r.parameters),
          datasource: r.datasource || null,
        };
      })
    : [];

  return {
    layoutId: layoutIdStr,
    layoutPath: layoutObj ? layoutObj.path : undefined,
    renderings: formattedRenderings,
  };
}

/**
 * Format Template Sections and embedded Fields (DEC-055)
 * Sorts sections by sortOrder then ID, and fields by sortOrder then ID.
 */
function formatTemplateSections(sections) {
  if (!Array.isArray(sections)) return [];

  const sortedSecs = [...sections].sort((a, b) => {
    const sA = typeof a.sortOrder === 'number' ? a.sortOrder : 100;
    const sB = typeof b.sortOrder === 'number' ? b.sortOrder : 100;
    if (sA !== sB) return sA - sB;
    return String(a.id || a._id || '').localeCompare(String(b.id || b._id || ''));
  });

  return sortedSecs.map((sec) => {
    const sortedFields = [...(sec.fields || [])].sort((a, b) => {
      const sA = typeof a.sortOrder === 'number' ? a.sortOrder : 100;
      const sB = typeof b.sortOrder === 'number' ? b.sortOrder : 100;
      if (sA !== sB) return sA - sB;
      return String(a.id || a._id || '').localeCompare(String(b.id || b._id || ''));
    });

    return {
      id: sec._id ? sec._id.toString() : (sec.id ? String(sec.id) : undefined),
      name: sec.name,
      sortOrder: typeof sec.sortOrder === 'number' ? sec.sortOrder : 100,
      fields: sortedFields.map((f) => {
        const canonicalType = f.type || 'Single-Line Text';
        const typeKey = toTypeKey(canonicalType);

        return {
          id: f._id ? f._id.toString() : (f.id ? String(f.id) : undefined),
          name: f.name,
          title: f.title || f.name,
          type: typeKey,
          source: f.source || '',
          required: Boolean(f.required),
          defaultValue: f.defaultValue !== undefined ? f.defaultValue : '',
          shared: Boolean(f.shared),
          unversioned: Boolean(f.unversioned),
          helpText: f.helpText || '',
          validation: toPlainObject(f.validation),
          sortOrder: typeof f.sortOrder === 'number' ? f.sortOrder : 100,
          visibility: toPlainObject(f.visibility),
          permissions: toPlainObject(f.permissions),
          layout: toPlainObject(f.layout),
          config: toPlainObject(f.config),
        };
      }),
    };
  });
}

/**
 * Format baseTemplates or insertOptions references
 */
function formatTemplateReferences(refs, templateMap = new Map()) {
  if (!Array.isArray(refs)) return [];
  return refs.map((ref) => {
    const idStr = ref ? (ref._id ? ref._id.toString() : ref.toString()) : '';
    const tObj = templateMap.get(idStr);
    return {
      id: idStr,
      name: tObj ? tObj.name : undefined,
      path: tObj ? tObj.path : undefined,
    };
  });
}

/**
 * Format standardValues map with field names for clarity
 */
function formatStandardValues(standardValues, fieldMap = new Map()) {
  if (!standardValues) return {};
  const plain = toPlainObject(standardValues);
  const result = {};
  const sortedKeys = Object.keys(plain).sort();

  for (const fieldId of sortedKeys) {
    const fieldObj = fieldMap.get(fieldId);
    result[fieldId] = {
      fieldName: fieldObj ? fieldObj.name : undefined,
      value: plain[fieldId],
    };
  }
  return result;
}

/**
 * Custom sort keys order for deterministic YAML output
 */
const KEY_PRIORITY = {
  _id: 1,
  id: 1,
  name: 2,
  displayName: 3,
  path: 4,
  template: 5,
  parentId: 6,
  parentPath: 7,
  sortOrder: 8,
  icon: 9,
  description: 10,
  isSystem: 11,

  // Template Schema
  baseTemplates: 12,
  insertOptions: 13,
  sections: 14,
  standardValues: 15,

  // Item Content & Presentation
  sharedFields: 16,
  languages: 17,
  presentation: 18,

  // Section / Field properties
  title: 3,
  type: 4,
  source: 5,
  required: 6,
  defaultValue: 7,
  shared: 8,
  unversioned: 9,
  helpText: 10,
  validation: 11,
  visibility: 13,
  permissions: 14,
  layout: 15,
  config: 16,
  fields: 20,
};

function sortKeys(a, b) {
  const pA = KEY_PRIORITY[a] || 100;
  const pB = KEY_PRIORITY[b] || 100;
  if (pA !== pB) return pA - pB;
  return a.localeCompare(b);
}

/**
 * Serialize an Item to a deterministic YAML string
 * If item has an associated Template schema, embeds full field definitions (DEC-055).
 *
 * @param {Object} item - Mongoose item document or plain object
 * @param {Object} [referenceMaps={}] - Template, Layout, Rendering, Parent path, Template Schema maps
 * @returns {string} Deterministic YAML string
 */
function serializeItemToYaml(item, referenceMaps = {}) {
  const {
    templateMap = new Map(),
    layoutMap = new Map(),
    renderingMap = new Map(),
    itemPathMap = new Map(),
    templateSchemaMap = new Map(),
  } = referenceMaps;

  const templateIdStr = item.templateId ? item.templateId.toString() : null;
  const templateObj = templateIdStr ? templateMap.get(templateIdStr) : null;

  const parentIdStr = item.parentId ? item.parentId.toString() : null;
  const parentPath = parentIdStr ? itemPathMap.get(parentIdStr) : null;

  const data = {
    _id: item._id ? item._id.toString() : undefined,
    name: item.name,
    displayName: item.displayName || undefined,
    path: item.path,
    template: templateIdStr
      ? {
          id: templateIdStr,
          name: templateObj ? templateObj.name : undefined,
          path: templateObj ? templateObj.path : undefined,
        }
      : null,
    parentId: parentIdStr,
    parentPath: parentPath || undefined,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 100,
    icon: item.icon || undefined,
  };

  // If this item is a Template definition, embed schema (DEC-055)
  const itemIdStr = item._id ? item._id.toString() : null;
  const tplSchema = (itemIdStr ? templateSchemaMap.get(itemIdStr) : null) ||
    templateSchemaMap.get(item.name) ||
    (item.path ? templateSchemaMap.get(item.path) : null) ||
    (item.sections ? item : null);

  if (tplSchema) {
    if (tplSchema.description) {
      data.description = tplSchema.description;
    }
    data.isSystem = Boolean(tplSchema.isSystem);
    data.baseTemplates = formatTemplateReferences(tplSchema.baseTemplates, templateMap);
    data.insertOptions = formatTemplateReferences(tplSchema.insertOptions, templateMap);

    // Build fieldMap for standardValues formatting
    const fieldMap = new Map();
    if (Array.isArray(tplSchema.sections)) {
      for (const s of tplSchema.sections) {
        for (const f of s.fields || []) {
          const fid = f._id ? f._id.toString() : f.id;
          if (fid) fieldMap.set(fid, f);
        }
      }
    }

    data.sections = formatTemplateSections(tplSchema.sections);
    data.standardValues = formatStandardValues(tplSchema.standardValues, fieldMap);
  }

  // Content fields & languages
  data.sharedFields = toPlainObject(item.sharedFields);
  data.languages = formatLanguages(item.languages);

  const pres = formatPresentation(item.presentation, { layoutMap, renderingMap });
  if (pres) {
    data.presentation = pres;
  }

  // Generate deterministic YAML: 2 spaces, sortKeys, no tags/aliases
  const yamlStr = yaml.dump(data, {
    indent: 2,
    sortKeys: sortKeys,
    noRefs: true,
    noCompatMode: true,
    lineWidth: -1,
  });

  return yamlStr.replace(/\r\n/g, '\n');
}

/**
 * Helper to locate line number of a text pattern in YAML string (1-based)
 */
function findLineInYaml(yamlString, pattern) {
  if (!yamlString || !pattern) return 1;
  const lines = yamlString.split('\n');
  const cleanPat = String(pattern).trim();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(cleanPat)) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Parse and validate a YAML string into an item object
 * Validates field types against FieldRegistry and reports errors with file:line.
 *
 * @param {string} yamlString
 * @param {string} [sourceFileName='unknown']
 * @returns {Object} Parsed item data
 */
function parseYamlToItem(yamlString, sourceFileName = 'unknown') {
  if (!yamlString || typeof yamlString !== 'string') {
    throw new Error(`[yamlSerializer] Empty or invalid YAML string in ${sourceFileName}`);
  }

  if (yamlString.length > 5 * 1024 * 1024) {
    throw new Error(`[yamlSerializer] YAML file exceeds 5MB size limit: ${sourceFileName}`);
  }

  let data;
  try {
    data = yaml.load(yamlString, {
      schema: yaml.DEFAULT_SAFE_SCHEMA || yaml.DEFAULT_SCHEMA,
      json: true,
    });
  } catch (err) {
    throw new Error(`[yamlSerializer] YAML syntax error in ${sourceFileName}: ${err.message}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error(`[yamlSerializer] Invalid YAML payload in ${sourceFileName}: must be an object`);
  }

  // Basic required fields validation
  if (!data.name || typeof data.name !== 'string') {
    throw new Error(`[yamlSerializer] Missing or invalid "name" in ${sourceFileName}`);
  }

  if (!data.path || typeof data.path !== 'string') {
    throw new Error(`[yamlSerializer] Missing or invalid "path" in ${sourceFileName}`);
  }

  // Validate Template sections & fields if present (DEC-055)
  if (Array.isArray(data.sections)) {
    for (const sec of data.sections) {
      if (!sec.name) {
        const line = findLineInYaml(yamlString, sec.id || 'sections');
        throw new Error(`[Schema Error] Section thiếu tên tại ${sourceFileName}:${line}`);
      }

      if (Array.isArray(sec.fields)) {
        for (const f of sec.fields) {
          if (!f.name) {
            const line = findLineInYaml(yamlString, f.id || sec.name);
            throw new Error(`[Schema Error] Trường dữ liệu thiếu "name" tại ${sourceFileName}:${line}`);
          }
          if (!f.title) {
            f.title = f.name;
          }

          // Validate field type against registry
          const rawType = f.type || 'Single-Line Text';
          const canonicalType = fromTypeKey(rawType);

          if (!canonicalType || !fieldRegistry.has(canonicalType)) {
            const line = findLineInYaml(yamlString, rawType);
            throw new Error(
              `[Field Error] Kiểu trường "${rawType}" không tồn tại trong Field Registry (${sourceFileName}:${line})`
            );
          }

          // Normalize to canonical type for MongoDB storage
          f.type = canonicalType;
        }
      }
    }
  }

  // Normalize standardValues if structured as { [fieldId]: { fieldName, value } }
  if (data.standardValues && typeof data.standardValues === 'object') {
    const normalizedStd = {};
    for (const [k, v] of Object.entries(data.standardValues)) {
      if (v && typeof v === 'object' && 'value' in v) {
        normalizedStd[k] = v.value;
      } else {
        normalizedStd[k] = v;
      }
    }
    data.standardValues = normalizedStd;
  }

  return data;
}

/**
 * Write YAML content to disk, keeping mtime untouched if content has not changed
 * @param {string} filePath - Absolute file path
 * @param {string} yamlContent - YAML string to write
 * @returns {{ written: boolean, isNew: boolean }}
 */
function writeItemFileIfChanged(filePath, yamlContent) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const normExisting = existingContent.replace(/\r\n/g, '\n');
    const normNew = yamlContent.replace(/\r\n/g, '\n');

    if (normExisting === normNew) {
      return { written: false, isNew: false };
    }

    fs.writeFileSync(filePath, normNew, 'utf8');
    return { written: true, isNew: false };
  }

  fs.writeFileSync(filePath, yamlContent.replace(/\r\n/g, '\n'), 'utf8');
  return { written: true, isNew: true };
}

module.exports = {
  toTypeKey,
  fromTypeKey,
  toPlainObject,
  serializeItemToYaml,
  parseYamlToItem,
  writeItemFileIfChanged,
};
