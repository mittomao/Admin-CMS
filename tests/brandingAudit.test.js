const fs = require('fs');
const path = require('path');
const branding = require('../src/config/branding');

describe('Phase R1 — Branding & Root Rename Audit', () => {
  describe('1. Centralized Branding Configuration', () => {
    it('should export correct PROJECT_NAME as Treecraft', () => {
      expect(branding.PROJECT_NAME).toBe('Treecraft');
    });

    it('should export ROOT_NAME as root and ROOT_PATH as /root', () => {
      expect(branding.ROOT_NAME).toBe('root');
      expect(branding.ROOT_PATH).toBe('/root');
    });

    it('should export DEFAULT_DOMAIN as treecraft', () => {
      expect(branding.DEFAULT_DOMAIN).toBe('treecraft');
    });

    it('should define standard branch paths under /root', () => {
      expect(branding.PATHS.ROOT).toBe('/root');
      expect(branding.PATHS.CONTENT).toBe('/root/content');
      expect(branding.PATHS.LAYOUT).toBe('/root/layout');
      expect(branding.PATHS.LAYOUTS).toBe('/root/layout/Layouts');
      expect(branding.PATHS.RENDERINGS).toBe('/root/layout/Renderings');
      expect(branding.PATHS.PLACEHOLDERS).toBe('/root/layout/Placeholders');
      expect(branding.PATHS.TEMPLATES).toBe('/root/templates');
      expect(branding.PATHS.MEDIA).toBe('/root/media library');
      expect(branding.PATHS.SYSTEM).toBe('/root/system');
    });

    it('package.json should have name set to treecraft', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      expect(pkg.name).toBe('treecraft');
    });
  });

  describe('2. Brand and Path Independence Audit', () => {
    it('brand name Treecraft should NEVER appear in data paths', () => {
      Object.entries(branding.PATHS).forEach(([key, value]) => {
        expect(value.toLowerCase()).not.toContain('treecraft');
        expect(value.toLowerCase()).not.toContain('sitecore');
      });
    });
  });
});

