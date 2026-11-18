'use strict';

/**
 * Treecraft CMS - Site Paths & Context Resolver (DEC-056 / Phase S)
 * Single Source of Truth for resolving paths across Core (submodule) and Site directories.
 * Supports Submodule Mode and Standalone/Monolith Mode with zero disruption.
 */

const path = require('path');
const fs = require('fs');

function normalizePath(p) {
  return typeof p === 'string' ? p.replace(/\\/g, '/') : p;
}

const CORE_DIR = path.resolve(__dirname, '../../');

/**
 * Extract CLI argument value (supports --site <path> or --site=<path>)
 */
function extractArg(flagName) {
  if (!process.argv || !Array.isArray(process.argv)) return null;
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === flagName && i + 1 < process.argv.length) {
      return process.argv[i + 1];
    }
    if (arg.startsWith(`${flagName}=`)) {
      return arg.slice(flagName.length + 1);
    }
  }
  return null;
}

/**
 * Detect the active SITE_DIR according to the 4-tier detection order
 */
function detectSiteDir() {
  // 1. CLI flag --site
  const cliSite = extractArg('--site');
  if (cliSite) {
    const resolved = path.resolve(process.cwd(), cliSite);
    if (fs.existsSync(resolved)) return resolved;
  }

  // 2. Environment variable TREECRAFT_SITE_DIR
  if (process.env.TREECRAFT_SITE_DIR) {
    const resolved = path.resolve(process.cwd(), process.env.TREECRAFT_SITE_DIR);
    if (fs.existsSync(resolved)) return resolved;
  }

  // 3. Search upward from process.cwd() (max 4 levels)
  let currentDir = path.resolve(process.cwd());
  for (let depth = 0; depth < 5; depth++) {
    // Check if currentDir has site.config.js
    if (fs.existsSync(path.join(currentDir, 'site.config.js'))) {
      return currentDir;
    }
    // Check if currentDir has a site/ folder with site.config.js
    const subSite = path.join(currentDir, 'site');
    if (fs.existsSync(path.join(subSite, 'site.config.js'))) {
      return subSite;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  // Check sibling site directory if cwd is CORE_DIR
  const siblingSite = path.resolve(CORE_DIR, '../site');
  if (fs.existsSync(path.join(siblingSite, 'site.config.js'))) {
    return siblingSite;
  }

  // 4. Fallback: Core Standalone Mode
  return CORE_DIR;
}

const SITE_DIR = detectSiteDir();
const isStandaloneMode = path.resolve(SITE_DIR) === path.resolve(CORE_DIR);

// Config file
const CONFIG_FILE = isStandaloneMode
  ? (fs.existsSync(path.join(CORE_DIR, 'site.config.js')) ? path.join(CORE_DIR, 'site.config.js') : null)
  : path.join(SITE_DIR, 'site.config.js');

let cachedConfig = null;

function resolveSiteConfig() {
  if (cachedConfig) return cachedConfig;
  if (CONFIG_FILE && fs.existsSync(CONFIG_FILE)) {
    try {
      // Clear require cache for testing flexibility
      delete require.cache[require.resolve(CONFIG_FILE)];
      cachedConfig = require(CONFIG_FILE) || {};
    } catch (err) {
      console.warn(`[sitePaths] Warning: could not load ${CONFIG_FILE}: ${err.message}`);
      cachedConfig = {};
    }
  } else {
    cachedConfig = {};
  }
  return cachedConfig;
}

// Views
const ADMIN_VIEWS_DIR = path.join(CORE_DIR, 'src', 'views');
const VIEWS_DIR = isStandaloneMode
  ? path.join(CORE_DIR, 'src', 'views', 'site')
  : (fs.existsSync(path.join(SITE_DIR, 'views')) ? path.join(SITE_DIR, 'views') : path.join(CORE_DIR, 'src', 'views', 'site'));

// Public
const ADMIN_PUBLIC_DIR = path.join(CORE_DIR, 'public');
const PUBLIC_DIR = isStandaloneMode
  ? path.join(CORE_DIR, 'public')
  : (fs.existsSync(path.join(SITE_DIR, 'public')) ? path.join(SITE_DIR, 'public') : path.join(CORE_DIR, 'public'));

// Serialization
const DEFAULT_SERIALIZATION_DIR = isStandaloneMode
  ? path.join(CORE_DIR, 'Serialization')
  : path.join(SITE_DIR, 'serialization');

function getSerializationDir() {
  if (process.env.SERIALIZATION_DIR) {
    return path.resolve(isStandaloneMode ? CORE_DIR : SITE_DIR, process.env.SERIALIZATION_DIR);
  }
  return DEFAULT_SERIALIZATION_DIR;
}

// Backups
const DEFAULT_BACKUP_DIR = isStandaloneMode
  ? path.join(CORE_DIR, 'data', 'backups')
  : path.join(SITE_DIR, 'backups');

function getBackupDir() {
  if (process.env.BACKUP_DIR) {
    return path.resolve(isStandaloneMode ? CORE_DIR : SITE_DIR, process.env.BACKUP_DIR);
  }
  return DEFAULT_BACKUP_DIR;
}

// Starters
const STARTER_DIR = path.join(CORE_DIR, 'starter');

// Env file resolver
function resolveEnvFile(appEnv = 'development') {
  const envTargetDir = isStandaloneMode ? CORE_DIR : SITE_DIR;
  const envSpecific = path.join(envTargetDir, `.env.${appEnv}`);
  if (fs.existsSync(envSpecific)) return envSpecific;
  const envDefault = path.join(envTargetDir, '.env');
  if (fs.existsSync(envDefault)) return envDefault;
  return envSpecific; // Default fallback for loading attempt
}

/**
 * Check if a path resides inside allowed parent directory (prevent traversal)
 */
function isPathInside(parentDir, childPath) {
  const resolvedParent = path.resolve(parentDir);
  const resolvedChild = path.resolve(childPath);
  return resolvedChild === resolvedParent || resolvedChild.startsWith(resolvedParent + path.sep);
}

module.exports = {
  CORE_DIR,
  SITE_DIR,
  isStandaloneMode,
  CONFIG_FILE,
  resolveSiteConfig,
  ADMIN_VIEWS_DIR,
  VIEWS_DIR,
  ADMIN_PUBLIC_DIR,
  PUBLIC_DIR,
  DEFAULT_SERIALIZATION_DIR,
  getSerializationDir,
  DEFAULT_BACKUP_DIR,
  getBackupDir,
  STARTER_DIR,
  resolveEnvFile,
  normalizePath,
  isPathInside,
  detectSiteDir,
};

