#!/usr/bin/env node
'use strict';

/**
 * Treecraft CMS - Prepublish Safety Guard (Task N.A4)
 * Strict sanity and security check before publishing to npm.
 * Enforces automated linting, test suites, packaging whitelist checks,
 * and reminds that AI assistants are never permitted to publish packages.
 */

const { execSync } = require('child_process');

console.log('\n========================================================');
console.log('   TREECRAFT CORE PREPUBLISH SAFETY GUARD');
console.log('========================================================');
console.log('⚠ NOTICE: Automated AI assistants are strictly forbidden');
console.log('  from executing npm publish. Only human maintainers');
console.log('  with 2FA credentials may perform releases.');
console.log('--------------------------------------------------------\n');

try {
  console.log('1. Running Linter check...');
  execSync('npm run lint', { stdio: 'inherit' });

  console.log('\n2. Running Packaging Whitelist check (pack:check)...');
  execSync('npm run pack:check', { stdio: 'inherit' });

  console.log('\n3. Running Test Suites...');
  execSync('npm test', { stdio: 'inherit' });

  console.log('\n✔ ALL PREPUBLISH CHECKS PASSED.');
  console.log('Maintainer may proceed with manual publish using 2FA OTP.\n');
} catch (err) {
  console.error('\n✖ PREPUBLISH VERIFICATION FAILED.');
  console.error(err.message);
  process.exit(1);
}
