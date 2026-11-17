#!/usr/bin/env node
'use strict';

/**
 * Treecraft CMS - Unified CLI Entry Point (DEC-056 / Phase S)
 * Designed for 100% native Node.js execution with zero top-level external dependencies.
 * Powers the single-step "submodule -> init -> dev" workflow.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const readline = require('readline');

// Core Directory is the directory containing bin/
const CORE_DIR = path.resolve(__dirname, '..');

// Helper for colored console output without dependencies
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function logInfo(msg) {
  console.log(`${colors.cyan}[treecraft]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}
function logError(msg) {
  console.error(`${colors.red}✖ ${msg}${colors.reset}`);
}

function parseCliArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const eqIdx = a.indexOf('=');
      if (eqIdx !== -1) {
        const key = a.slice(2, eqIdx);
        parsed[key] = a.slice(eqIdx + 1);
      } else {
        const key = a.slice(2);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          parsed[key] = args[i + 1];
          i++;
        } else {
          parsed[key] = true;
        }
      }
    } else if (a.startsWith('-')) {
      const key = a.slice(1);
      parsed[key] = true;
    } else {
      parsed._.push(a);
    }
  }
  return parsed;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Command: init
 * One-step initialization for fresh projects
 */
async function runInit(cliArgs) {
  console.log(`\n${colors.bold}${colors.cyan}===================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}   Treecraft CMS — Project Initializer (Phase S)    ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}===================================================${colors.reset}\n`);

  const isNonInteractive = cliArgs.yes || cliArgs.y || false;

  const projectName = cliArgs.name || (isNonInteractive ? 'My Corporate Site' : null);
  const projectSlug = cliArgs.slug || (projectName ? slugify(projectName) : 'corporate');
  const dbPrefix = cliArgs['db-prefix'] || 'treecraft_';
  const dbName = cliArgs['db-name'] || `${dbPrefix}${projectSlug}`;
  const mongoUri = cliArgs['mongo-uri'] || 'mongodb://127.0.0.1:27017';
  const fullMongoUri = `${mongoUri.replace(/\/+$/, '')}/${dbName}`;
  const port = parseInt(cliArgs.port || '4000', 10);
  const adminUser = cliArgs['admin-user'] || 'admin';
  const adminPass = cliArgs['admin-pass'] || (isNonInteractive ? 'Admin@123456' : null);

  const projectRoot = process.cwd();
  logInfo(`Initializing new project in: ${colors.bold}${projectRoot}${colors.reset}`);
  logInfo(`Project Name: ${colors.bold}${projectName || 'Corporate Site'}${colors.reset} (slug: ${projectSlug})`);
  logInfo(`Database: ${colors.bold}${dbName}${colors.reset}`);

  // 1. Check and install core dependencies if missing
  const coreNodeModules = path.join(CORE_DIR, 'node_modules');
  if (!fs.existsSync(coreNodeModules)) {
    logInfo('Installing Core dependencies (this happens only once)...');
    try {
      execSync('npm install --prefix core', { cwd: projectRoot, stdio: 'inherit' });
      logSuccess('Core dependencies installed successfully.');
    } catch (e) {
      logWarn('Fallback: running npm install inside core directory...');
      execSync('npm install', { cwd: CORE_DIR, stdio: 'inherit' });
    }
  }

  // 2. Generate project root package.json if not present
  const projectPkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(projectPkgPath)) {
    logInfo('Generating root package.json with Treecraft CLI wrappers...');
    const pkg = {
      name: projectSlug,
      version: '1.0.0',
      private: true,
      description: `${projectName || 'Corporate Site'} built with Treecraft CMS`,
      scripts: {
        dev: 'node core/bin/treecraft.js dev',
        start: 'node core/bin/treecraft.js start',
        'sync:export': 'node core/bin/treecraft.js sync:export',
        'sync:import': 'node core/bin/treecraft.js sync:import',
        backup: 'node core/bin/treecraft.js backup',
        restore: 'node core/bin/treecraft.js restore',
        'tree:compare': 'node core/bin/treecraft.js tree:compare',
      },
    };
    fs.writeFileSync(projectPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    logSuccess('Created package.json');
  }

  // 3. Generate .gitignore if not present
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = [
      'node_modules/',
      'core/',
      'site/.env*',
      '!site/.env.example',
      'site/backups/',
      'site/logs/',
      '.DS_Store',
      'Thumbs.db',
      '',
    ].join('\n');
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
    logSuccess('Created .gitignore');
  }

  // 4. Create site directory structure
  const siteDir = path.join(projectRoot, 'site');
  fs.mkdirSync(siteDir, { recursive: true });
  fs.mkdirSync(path.join(siteDir, 'views'), { recursive: true });
  fs.mkdirSync(path.join(siteDir, 'public'), { recursive: true });
  fs.mkdirSync(path.join(siteDir, 'serialization'), { recursive: true });
  fs.mkdirSync(path.join(siteDir, 'backups'), { recursive: true });

  // 5. Create site/site.config.js
  const siteConfigPath = path.join(siteDir, 'site.config.js');
  if (!fs.existsSync(siteConfigPath)) {
    const configContent = `module.exports = {
  name: '${projectName || 'Corporate Site'}',
  slug: '${projectSlug}',
  title: '${projectName || 'Corporate Site'}',
  description: 'Built with Treecraft CMS',
  domain: '${projectSlug}.local',
  port: ${port},
  dbPrefix: '${dbPrefix}',
  dbName: '${dbName}',
  admin: {
    path: '/admin',
  },
};
`;
    fs.writeFileSync(siteConfigPath, configContent, 'utf8');
    logSuccess('Created site/site.config.js');
  }

  // 6. Create site/.env.development and site/.env.example
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const envDevPath = path.join(siteDir, '.env.development');
  if (!fs.existsSync(envDevPath)) {
    const envDevContent = [
      'APP_ENV=development',
      'NODE_ENV=development',
      `PORT=${port}`,
      `MONGO_URI=${fullMongoUri}`,
      `MONGO_DB_NAME=${dbName}`,
      `SESSION_SECRET=${sessionSecret}`,
      'STORAGE_PROVIDER=local',
      '',
    ].join('\n');
    fs.writeFileSync(envDevPath, envDevContent, 'utf8');
    logSuccess('Created site/.env.development');
  }

  const envExamplePath = path.join(siteDir, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    const envExampleContent = [
      'APP_ENV=development',
      'NODE_ENV=development',
      'PORT=4000',
      'MONGO_URI=mongodb://127.0.0.1:27017/treecraft_corporate',
      'MONGO_DB_NAME=treecraft_corporate',
      'SESSION_SECRET=change_me_in_production',
      'STORAGE_PROVIDER=local',
      '',
    ].join('\n');
    fs.writeFileSync(envExamplePath, envExampleContent, 'utf8');
    logSuccess('Created site/.env.example');
  }

  // 7. Copy Starter assets, views, and serialization
  const starterCorporate = path.join(CORE_DIR, 'starter', 'corporate');
  if (fs.existsSync(starterCorporate)) {
    logInfo('Copying Corporate starter views and public assets...');
    copyDirRecursive(path.join(starterCorporate, 'views'), path.join(siteDir, 'views'));
    copyDirRecursive(path.join(starterCorporate, 'public'), path.join(siteDir, 'public'));
    copyDirRecursive(path.join(starterCorporate, 'serialization'), path.join(siteDir, 'serialization'));
    logSuccess('Starter files copied successfully.');
  }

  // 8. Seed Database (System Seed + Serialization Sync)
  logInfo(`Connecting to database [${fullMongoUri}] to seed initial data...`);
  try {
    const seedScript = path.join(CORE_DIR, 'src', 'scripts', 'seed-initial-data.js');
    execSync(`node "${seedScript}"`, {
      cwd: projectRoot,
      env: {
        ...process.env,
        APP_ENV: 'development',
        NODE_ENV: 'development',
        MONGO_URI: fullMongoUri,
        MONGO_DB_NAME: dbName,
        TREECRAFT_SITE_DIR: siteDir,
        SEED_SYSTEM_ONLY: 'true',
      },
      stdio: 'inherit',
    });
    logSuccess('System seed and initial data completed.');

    // Sync Starter YAML into items_master
    logInfo('Syncing starter templates, layout, and content from YAML...');
    const syncScript = path.join(CORE_DIR, 'src', 'scripts', 'sync-starter-serialization.js');
    if (fs.existsSync(syncScript)) {
      execSync(`node "${syncScript}"`, {
        cwd: projectRoot,
        env: {
          ...process.env,
          APP_ENV: 'development',
          NODE_ENV: 'development',
          MONGO_URI: fullMongoUri,
          MONGO_DB_NAME: dbName,
          TREECRAFT_SITE_DIR: siteDir,
          SEED_SYSTEM_ONLY: 'true',
        },
        stdio: 'inherit',
      });
      logSuccess('Starter YAML synchronization completed.');
    }
  } catch (err) {
    logWarn(`Seed warning: ${err.message}. (Database may have been initialized partially)`);
  }

  console.log(`\n${colors.bold}${colors.green}===================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}  🎉 Treecraft project initialized successfully!   ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}===================================================${colors.reset}\n`);
  console.log(`Admin Portal:  ${colors.cyan}http://localhost:${port}/admin${colors.reset}`);
  console.log(`Public Site:   ${colors.cyan}http://localhost:${port}/${colors.reset}`);
  console.log(`Admin User:    ${colors.bold}${adminUser}${colors.reset}`);
  console.log(`Admin Pass:    ${colors.bold}${adminPass || 'Admin@123456'}${colors.reset}\n`);
  console.log(`${colors.yellow}To start your development server:${colors.reset}`);
  console.log(`  ${colors.bold}npm run dev${colors.reset}\n`);
}

/**
 * Command: dev
 */
function runDev(cliArgs) {
  const siteDir = cliArgs.site ? path.resolve(process.cwd(), cliArgs.site) : null;
  const envVars = {
    ...process.env,
    NODE_ENV: 'development',
    APP_ENV: 'development',
  };
  if (siteDir) envVars.TREECRAFT_SITE_DIR = siteDir;

  const serverScript = path.join(CORE_DIR, 'src', 'server.js');
  logInfo(`Starting Treecraft development server...`);
  spawn('node', [serverScript], {
    cwd: process.cwd(),
    env: envVars,
    stdio: 'inherit',
  });
}

/**
 * Command: start
 */
function runStart(cliArgs) {
  const siteDir = cliArgs.site ? path.resolve(process.cwd(), cliArgs.site) : null;
  const envVars = {
    ...process.env,
    NODE_ENV: 'production',
    APP_ENV: 'production',
  };
  if (siteDir) envVars.TREECRAFT_SITE_DIR = siteDir;

  const serverScript = path.join(CORE_DIR, 'src', 'server.js');
  logInfo(`Starting Treecraft production server...`);
  spawn('node', [serverScript], {
    cwd: process.cwd(),
    env: envVars,
    stdio: 'inherit',
  });
}

// Main CLI router
async function main() {
  const args = process.argv.slice(2);
  const parsed = parseCliArgs(args);
  const command = parsed._[0] || 'help';

  switch (command) {
    case 'init':
      await runInit(parsed);
      break;

    case 'dev':
      runDev(parsed);
      break;

    case 'start':
      runStart(parsed);
      break;

    case 'tree:snapshot': {
      const script = path.join(CORE_DIR, 'src', 'scripts', 'tree-snapshot.js');
      const childArgs = args.slice(1);
      spawn('node', [script, ...childArgs], { cwd: process.cwd(), stdio: 'inherit' });
      break;
    }

    case 'tree:compare': {
      const script = path.join(CORE_DIR, 'src', 'scripts', 'tree-compare.js');
      const childArgs = args.slice(1);
      spawn('node', [script, ...childArgs], { cwd: process.cwd(), stdio: 'inherit' });
      break;
    }

    case 'help':
    default:
      console.log(`
${colors.bold}${colors.cyan}Treecraft CMS CLI${colors.reset}

Usage:
  node core/bin/treecraft.js <command> [options]

Commands:
  ${colors.green}init${colors.reset}             Initialize a new site in the current directory
  ${colors.green}dev${colors.reset}              Start development server
  ${colors.green}start${colors.reset}            Start production server
  ${colors.green}tree:snapshot${colors.reset}    Export content tree snapshot manifest
  ${colors.green}tree:compare${colors.reset}     Compare two content trees for 100% parity
  ${colors.green}help${colors.reset}             Show this help message

Options for init:
  --name <name>         Project name (e.g. "Corporate Portal")
  --slug <slug>         Project slug (e.g. "corporate")
  --mongo-uri <uri>     MongoDB URI base (default: mongodb://127.0.0.1:27017)
  --port <port>         Server port (default: 4000)
  --yes, -y             Run non-interactively with defaults
`);
      break;
  }
}

main().catch((err) => {
  logError(`Fatal CLI error: ${err.message}`);
  process.exit(1);
});
