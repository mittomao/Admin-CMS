'use strict';

/**
 * Treecraft CMS - Content Tree Parity Invariant Test (DEC-058 / Phase S-Parity)
 * Ensures that starter manifest contains all 54 nodes with deterministic structure.
 */

const fs = require('fs');
const path = require('path');
const { SYSTEM_IDS, TEMPLATE_NAME_IDS } = require('../src/config/systemIds');

describe('GĐ S-Parity: Content Tree Parity & Starter Snapshot Invariants', () => {
  const manifestPath = path.resolve(__dirname, '..', 'starter', 'corporate', 'tree.manifest.json');

  it('should have valid starter manifest file', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.totalItems).toBe(54);
    expect(Array.isArray(manifest.nodes)).toBe(true);
    expect(manifest.nodes.length).toBe(54);
  });

  it('should include all 6 root nodes with deterministic IDs', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const nodes = manifest.nodes;

    const rootPaths = [
      '/root',
      '/root/content',
      '/root/layout',
      '/root/media library',
      '/root/system',
      '/root/templates',
    ];

    for (const p of rootPaths) {
      const node = nodes.find((n) => n.path === p);
      expect(node).toBeDefined();
      expect(node.id).toBe(SYSTEM_IDS[p]);
    }
  });

  it('should include all 13 system templates under /root/templates/System with deterministic IDs', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const nodes = manifest.nodes;

    const systemTemplates = [
      '_BasePage',
      'Standard Template',
      'Page',
      'Sample Item',
      'Template Folder',
      'Template',
      'Layout',
      'Layout Folder',
      'Placeholder',
      'Placeholder Folder',
      'Rendering',
      'Rendering Folder',
    ];

    for (const name of systemTemplates) {
      const node = nodes.find((n) => n.path === `/root/templates/System/${name}`);
      expect(node).toBeDefined();
      expect(node.id).toBe(TEMPLATE_NAME_IDS[name]);
    }
  });

  it('should include starter presentation items (Layouts, Placeholders, Renderings)', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const paths = manifest.nodes.map((n) => n.path);

    expect(paths).toContain('/root/layout/Layouts/HomeLayout');
    expect(paths).toContain('/root/layout/Placeholders/maincontent');
    expect(paths).toContain('/root/layout/Renderings/HeroBanner');
    expect(paths).toContain('/root/layout/Renderings/Introduction');
    expect(paths).toContain('/root/layout/Renderings/ImageText');
  });

  it('should include starter content items (/root/content/home, /root/content/about-us)', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const paths = manifest.nodes.map((n) => n.path);

    expect(paths).toContain('/root/content');
    expect(paths).toContain('/root/content/home');
    expect(paths).toContain('/root/content/about-us');
  });
});
