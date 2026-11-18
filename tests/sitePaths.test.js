'use strict';

const path = require('path');
const fs = require('fs');
const sitePaths = require('../src/config/sitePaths');

describe('sitePaths resolver (DEC-056)', () => {
  test('resolves core directory properly', () => {
    expect(sitePaths.CORE_DIR).toBeDefined();
    expect(fs.existsSync(sitePaths.CORE_DIR)).toBe(true);
    expect(fs.existsSync(path.join(sitePaths.CORE_DIR, 'package.json'))).toBe(true);
  });

  test('runs in standalone mode when cwd is core directory', () => {
    expect(sitePaths.isStandaloneMode).toBe(true);
    expect(sitePaths.SITE_DIR).toBe(sitePaths.CORE_DIR);
    expect(sitePaths.ADMIN_VIEWS_DIR).toBe(path.join(sitePaths.CORE_DIR, 'src', 'views'));
    expect(sitePaths.VIEWS_DIR).toBe(path.join(sitePaths.CORE_DIR, 'src', 'views', 'site'));
  });

  test('normalizes paths across Windows and POSIX', () => {
    expect(sitePaths.normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz');
    expect(sitePaths.normalizePath('foo/bar/baz')).toBe('foo/bar/baz');
  });

  test('detects path traversal and checks directory containment safely', () => {
    const parent = path.join(sitePaths.CORE_DIR, 'src');
    const validChild = path.join(parent, 'config', 'env.js');
    const invalidChild = path.join(sitePaths.CORE_DIR, 'node_modules');

    expect(sitePaths.isPathInside(parent, validChild)).toBe(true);
    expect(sitePaths.isPathInside(parent, invalidChild)).toBe(false);
  });

  test('resolves environment file properly', () => {
    const envFile = sitePaths.resolveEnvFile('development');
    expect(envFile).toBeDefined();
    expect(typeof envFile).toBe('string');
  });

  test('fallback configuration returns safe object when site.config.js is absent', () => {
    const config = sitePaths.resolveSiteConfig();
    expect(typeof config).toBe('object');
    expect(config).not.toBeNull();
  });

  test('verifyCoreImmutability returns clean state in standalone mode', () => {
    const status = sitePaths.verifyCoreImmutability();
    expect(status).toBeDefined();
    expect(status.isClean).toBe(true);
  });

  test('resolves default serialization and backup directories safely', () => {
    const serDir = sitePaths.getSerializationDir();
    const backupDir = sitePaths.getBackupDir();
    expect(typeof serDir).toBe('string');
    expect(typeof backupDir).toBe('string');
  });
});

