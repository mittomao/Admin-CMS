'use strict';

/**
 * Treecraft CMS - Serialization Paths & Security Guard (DEC-053 / DEC-054 / Phase 11-Y2)
 * Manages SERIALIZATION_DIR, enforces path traversal protection, symlink checks,
 * Windows MAX_PATH safety, and shortened directory layout (DEC-054).
 */

const path = require('path');
const fs = require('fs');
const { getSection } = require('./serializationSections');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const DEFAULT_SERIALIZATION_DIR = path.join(PROJECT_ROOT, 'Serialization');

// Forbidden directory roots that can never be set as SERIALIZATION_DIR or written to
const FORBIDDEN_DIRS = [
  path.join(PROJECT_ROOT, 'src'),
  path.join(PROJECT_ROOT, 'public'),
  path.join(PROJECT_ROOT, '.git'),
  path.join(PROJECT_ROOT, 'node_modules'),
  path.join(PROJECT_ROOT, 'storage/backups'),
  path.join(PROJECT_ROOT, 'data/backups'),
];

// Forbidden characters in Windows file/directory names (excluding path separators and drive colon)
const WINDOWS_INVALID_CHAR_REGEX = /[<>:"|?*]/;

/**
 * Get the base serialization directory
 * @returns {string} Absolute path to SERIALIZATION_DIR
 */
function getSerializationDir() {
  const envDir = process.env.SERIALIZATION_DIR;
  const resolvedDir = envDir ? path.resolve(PROJECT_ROOT, envDir) : DEFAULT_SERIALIZATION_DIR;

  // Security check: cannot be project root or system root
  if (resolvedDir === PROJECT_ROOT || resolvedDir === path.parse(resolvedDir).root) {
    throw new Error(`[serializationPaths] SERIALIZATION_DIR cannot be root or project root: ${resolvedDir}`);
  }

  for (const forbidden of FORBIDDEN_DIRS) {
    if (resolvedDir === forbidden || resolvedDir.startsWith(forbidden + path.sep)) {
      throw new Error(`[serializationPaths] SERIALIZATION_DIR cannot be inside forbidden directory: ${resolvedDir}`);
    }
  }

  return resolvedDir;
}

/**
 * Ensure a directory exists safely
 * @param {string} dirPath
 */
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Check if a path is safe and inside SERIALIZATION_DIR
 * @param {string} targetPath
 * @returns {boolean}
 */
function isPathSafe(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  try {
    const baseDir = getSerializationDir();
    const resolved = path.resolve(baseDir, targetPath);
    return resolved.startsWith(baseDir + path.sep) || resolved === baseDir;
  } catch {
    return false;
  }
}

/**
 * Validate path length and characters for Windows OS safety
 * @param {string} absFilePath
 * @returns {{ valid: boolean, warning?: string, error?: string }}
 */
function validateWindowsPath(absFilePath) {
  if (!absFilePath) return { valid: false, error: 'Đường dẫn tệp rỗng' };

  // Windows MAX_PATH check (warn at 240, error at 260)
  if (absFilePath.length >= 260) {
    return {
      valid: false,
      error: `Đường dẫn vượt quá giới hạn Windows MAX_PATH (260 ký tự): ${absFilePath.length} chars (${absFilePath})`,
    };
  }

  let warning;
  if (absFilePath.length > 240) {
    warning = `Đường dẫn tiệm cận giới hạn Windows MAX_PATH: ${absFilePath.length} chars (${absFilePath})`;
  }

  // Check forbidden characters in basename / segments (skip drive letter like D:)
  const pathWithoutDrive = absFilePath.replace(/^[a-zA-Z]:/, '');
  const segments = pathWithoutDrive.split(/[\\/]/).filter(Boolean);
  for (const seg of segments) {
    if (WINDOWS_INVALID_CHAR_REGEX.test(seg)) {
      return {
        valid: false,
        error: `Đường dẫn chứa ký tự cấm trên Windows (< > : " | ? *): "${seg}" trong ${absFilePath}`,
      };
    }
  }

  return { valid: true, warning };
}

/**
 * Resolve directory path for a specific section
 * DEC-054: Section directory is placed directly under SERIALIZATION_DIR
 * e.g. <SERIALIZATION_DIR>/Templates
 * @param {string} sectionKey
 * @returns {string} Absolute directory path
 */
function resolveSectionDir(sectionKey) {
  const section = getSection(sectionKey);
  if (!section) {
    throw new Error(`[serializationPaths] Unknown section key: ${sectionKey}`);
  }

  const baseDir = getSerializationDir();
  const folderName = section.dir || section.folder || sectionKey;
  const sectionDir = path.resolve(baseDir, folderName);

  if (!sectionDir.startsWith(baseDir + path.sep)) {
    throw new Error(`[serializationPaths] Security violation: section dir escapes base: ${sectionDir}`);
  }

  return sectionDir;
}

/**
 * Resolve global manifest file path (DEC-054: Serialization/serialization.manifest.yml)
 * @returns {string} Absolute path to serialization.manifest.yml
 */
function resolveGlobalManifestPath() {
  const baseDir = getSerializationDir();
  return path.join(baseDir, 'serialization.manifest.yml');
}

/**
 * Resolve manifest file path for a section
 * @param {string} sectionKey
 * @returns {string} Absolute path to .manifest.json (or fallback)
 */
function resolveSectionManifestPath(sectionKey) {
  const sectionDir = resolveSectionDir(sectionKey);
  return path.join(sectionDir, '.manifest.json');
}

/**
 * Convert an item path to a relative file path inside a section folder
 * DEC-054 Specification:
 * - Relative to root of section (no repeating branch name)
 * - Section root item: e.g. "/root/templates" -> "Templates.yml"
 * - Child items: "/root/templates/Feature/Components/HeroBanner" -> "Feature/Components/HeroBanner/HeroBanner.yml"
 *
 * @param {string} sectionKey
 * @param {string} itemPath
 * @returns {string} Relative file path ending in .yml
 */
function itemPathToRelativeFile(sectionKey, itemPath) {
  const section = getSection(sectionKey);
  if (!section) {
    throw new Error(`[serializationPaths] Unknown section key: ${sectionKey}`);
  }

  let matchingRoot = null;
  for (const root of section.roots) {
    if (itemPath === root || itemPath.startsWith(`${root}/`)) {
      matchingRoot = root;
      break;
    }
  }

  if (!matchingRoot) {
    throw new Error(
      `[serializationPaths] Item path "${itemPath}" does not belong to section "${sectionKey}" (roots: ${section.roots.join(', ')})`
    );
  }

  const sectionDirName = section.dir || section.folder;

  // 1. If item is the section root itself: no redundant subfolder
  // e.g. /root/templates -> Templates.yml
  if (itemPath === matchingRoot) {
    return `${sectionDirName}.yml`;
  }

  // 2. Relative subpath from section root
  // e.g. /root/templates/Feature/Components/HeroBanner -> "Feature/Components/HeroBanner"
  const sub = itemPath.slice(matchingRoot.length + 1);
  const itemName = path.basename(sub);

  // DEC-054 Target Structure: Feature/Components/HeroBanner/HeroBanner.yml
  return path.join(sub, `${itemName}.yml`).replace(/\\/g, '/');
}

/**
 * Convert a relative file path inside a section folder back to expected DB item path
 * Handles both new DEC-054 layout (HeroBanner/HeroBanner.yml) and legacy flat layout.
 *
 * @param {string} sectionKey
 * @param {string} relativeFilePath
 * @returns {string} Full DB item path
 */
function relativeFileToItemPath(sectionKey, relativeFilePath) {
  const section = getSection(sectionKey);
  if (!section) {
    throw new Error(`[serializationPaths] Unknown section key: ${sectionKey}`);
  }

  const cleanRel = relativeFilePath.replace(/\\/g, '/').replace(/\.ya?ml$/i, '');
  const sectionDirName = section.dir || section.folder;
  const matchingRoot = section.roots[0];

  // Root item matches
  if (cleanRel === sectionDirName || cleanRel === '_root' || cleanRel === '') {
    return matchingRoot;
  }

  const parts = cleanRel.split('/').filter(Boolean);
  if (parts.length === 0) {
    return matchingRoot;
  }

  // DEC-054 Structure: parts = ['Feature', 'Components', 'HeroBanner', 'HeroBanner']
  // If the last part equals the second-to-last part, the item path is the parent folder
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    const itemSubPath = parts.slice(0, -1).join('/');
    return `${matchingRoot}/${itemSubPath}`;
  }

  // Legacy or flat fallback: parts = ['Feature', 'Components', 'HeroBanner']
  const itemSubPath = parts.join('/');
  return `${matchingRoot}/${itemSubPath}`;
}

module.exports = {
  PROJECT_ROOT,
  DEFAULT_SERIALIZATION_DIR,
  getSerializationDir,
  ensureDirExists,
  isPathSafe,
  validateWindowsPath,
  resolveSectionDir,
  resolveGlobalManifestPath,
  resolveSectionManifestPath,
  itemPathToRelativeFile,
  relativeFileToItemPath,
};
