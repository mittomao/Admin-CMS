#!/usr/bin/env node
'use strict';

/**
 * Treecraft CMS - NPM Package Whitelist & Size Auditor (Task N.C1)
 * Runs `npm pack --dry-run --json` to inspect the contents of the tarball
 * without publishing or making any changes.
 */

const { execSync } = require('child_process');

console.log('Auditing package contents via npm pack --dry-run...');

let packOutput;
try {
  const stdout = execSync('npm pack --dry-run --json', { encoding: 'utf8' });
  packOutput = JSON.parse(stdout);
} catch (err) {
  console.error('✖ Failed to execute npm pack --dry-run:', err.message);
  process.exit(1);
}

if (!Array.isArray(packOutput) || packOutput.length === 0) {
  console.error('✖ Invalid output from npm pack --dry-run.');
  process.exit(1);
}

const tarball = packOutput[0];
const files = (tarball.files || []).map((f) => f.path);
const fileCount = tarball.entryCount || files.length;
const unpackedSize = tarball.unpackedSize || 0;

console.log(`- Package Name:  ${tarball.name}`);
console.log(`- Version:       ${tarball.version}`);
console.log(`- Total Files:    ${fileCount}`);
console.log(`- Unpacked Size: ${(unpackedSize / 1024).toFixed(1)} KB`);

// 1. Check forbidden files / directories
const forbiddenPatterns = [
  /^tests\//,
  /^docs\//,
  /^\.agents\//,
  /^\.github\//,
  /\.env(\..+)?$/,
  /docker-compose/,
  /^Dockerfile/,
  /^data\//,
  /^Serialization\//,
  /\.bak$/,
  /\.tmp$/,
];

const forbiddenFound = [];
for (const file of files) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(file)) {
      forbiddenFound.push({ file, pattern: pattern.toString() });
      break;
    }
  }
}

if (forbiddenFound.length > 0) {
  console.error('\n✖ VIOLATION: Forbidden files found in package tarball:');
  for (const item of forbiddenFound) {
    console.error(`  - ${item.file} (matched ${item.pattern})`);
  }
  process.exit(1);
}

// 2. Check required files
const requiredFiles = [
  'bin/treecraft.js',
  'src/server.js',
  'src/app.js',
  'src/config/sitePaths.js',
  'public/css/tailwind-admin.css',
  'public/img/icons/content-root.svg',
  'starter/corporate/site.config.js',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'SECURITY.md',
];

const missingRequired = [];
for (const req of requiredFiles) {
  if (!files.includes(req)) {
    missingRequired.push(req);
  }
}

if (missingRequired.length > 0) {
  console.error('\n✖ VIOLATION: Required files missing from package tarball:');
  for (const req of missingRequired) {
    console.error(`  - ${req}`);
  }
  process.exit(1);
}

// 3. Check file count budget
const MAX_FILES = 450;
if (fileCount > MAX_FILES) {
  console.error(`\n✖ VIOLATION: File count exceeds budget (${fileCount} > ${MAX_FILES}).`);
  process.exit(1);
}

console.log('\n✔ PACKAGE CHECK PASSED: Tarball contains only whitelisted, clean files.');
