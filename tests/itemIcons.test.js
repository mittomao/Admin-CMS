const mongoose = require('mongoose');
const {
  ICON_REGISTRY,
  LEGACY_ICON_MAP,
  normalizeIconKey,
  isValidIconKey,
  isFolderItem,
  resolveItemIcon,
  getIconUrl,
  renderIconHtml,
} = require('../src/config/icons');
const treeHelper = require('../src/utils/treeHelper');

describe('Item Icons & Registry System', () => {
  describe('1. Icon Registry Integrity', () => {
    test('contains all required canonical icon types', () => {
      const requiredKeys = [
        'folder',
        'folder-open',
        'content-root',
        'page',
        'layout',
        'placeholder',
        'rendering',
        'template',
        'media',
      ];

      requiredKeys.forEach((key) => {
        expect(ICON_REGISTRY[key]).toBeDefined();
        expect(ICON_REGISTRY[key].key).toBe(key);
        expect(ICON_REGISTRY[key].file).toBe(`/img/icons/${key}.svg`);
        expect(ICON_REGISTRY[key].colorVar).toMatch(/^--color-icon-/);
        expect(ICON_REGISTRY[key].defaultColor).toBeDefined();
      });
    });

    test('validates keys correctly and blocks path traversal attempts', () => {
      expect(isValidIconKey('folder')).toBe(true);
      expect(isValidIconKey('rendering')).toBe(true);
      expect(isValidIconKey('ti ti-home')).toBe(true);
      expect(isValidIconKey('ti ti-custom-icon')).toBe(true);

      // Malicious or invalid values
      expect(isValidIconKey('../../../etc/passwd')).toBe(false);
      expect(isValidIconKey('<script>alert(1)</script>')).toBe(false);
      expect(isValidIconKey('folder;rm -rf /')).toBe(false);
      expect(isValidIconKey('')).toBe(false);
      expect(isValidIconKey(null)).toBe(false);
      expect(isValidIconKey(undefined)).toBe(false);
    });

    test('normalizes legacy Tabler class names to canonical registry keys', () => {
      expect(LEGACY_ICON_MAP['ti ti-folder']).toBe('folder');
      expect(normalizeIconKey('ti ti-folder')).toBe('folder');
      expect(normalizeIconKey('ti ti-layout')).toBe('layout');
      expect(normalizeIconKey('ti ti-layout-grid-add')).toBe('placeholder');
      expect(normalizeIconKey('ti ti-components')).toBe('rendering');
      expect(normalizeIconKey('ti ti-template')).toBe('template');
      expect(normalizeIconKey('ti ti-file-text')).toBe('page');
    });
  });

  describe('2. Folder Identification (All Folders are Yellow)', () => {
    test('identifies all folder template variants as folders', () => {
      const folderVariants = [
        { name: 'Folder' },
        { name: 'Template Folder' },
        { name: 'Layout Folder' },
        { name: 'Rendering Folder' },
        { name: 'Media Folder' },
        { name: 'Custom Folder' },
      ];

      folderVariants.forEach((tpl) => {
        expect(isFolderItem(null, tpl)).toBe(true);
      });
    });

    test('identifies structural folder paths', () => {
      expect(isFolderItem({ path: '/root/templates' }, null)).toBe(true);
      expect(isFolderItem({ path: '/root/templates/Feature' }, null)).toBe(true);
      expect(isFolderItem({ path: '/root/layout/Layouts' }, null)).toBe(true);
      expect(isFolderItem({ path: '/root/layout/Renderings' }, null)).toBe(true);
      expect(isFolderItem({ path: '/root/layout/Placeholders' }, null)).toBe(true);
    });

    test('/root/content is NOT a regular folder (it is content-root)', () => {
      expect(isFolderItem({ path: '/root/content' }, null)).toBe(false);
    });
  });

  describe('3. Icon Resolution Rules (Priority Order)', () => {
    test('node /root/content resolves to content-root', () => {
      const item = { path: '/root/content', name: 'content' };
      expect(resolveItemIcon(item)).toBe('content-root');
    });

    test('all folder variants resolve to folder (or folder-open if expanded)', () => {
      const folderItem = { path: '/root/templates/Project', name: 'Project' };
      const folderTemplate = { name: 'Template Folder' };

      expect(resolveItemIcon(folderItem, folderTemplate)).toBe('folder');
      expect(resolveItemIcon(folderItem, folderTemplate, { expanded: true })).toBe('folder-open');
    });

    test('Layout item resolves to layout', () => {
      const item = { path: '/root/layout/Layouts/HomeLayout', name: 'HomeLayout' };
      const template = { name: 'Layout' };
      expect(resolveItemIcon(item, template)).toBe('layout');
    });

    test('Placeholder item resolves to placeholder', () => {
      const item = { path: '/root/layout/Placeholders/maincontent', name: 'maincontent' };
      const template = { name: 'Placeholder' };
      expect(resolveItemIcon(item, template)).toBe('placeholder');
    });

    test('Rendering item resolves to rendering', () => {
      const item = { path: '/root/layout/Renderings/HeroBanner', name: 'HeroBanner' };
      const template = { name: 'Rendering' };
      expect(resolveItemIcon(item, template)).toBe('rendering');
    });

    test('Template item resolves to template', () => {
      const item = { path: '/root/templates/Feature/Components/HeroBanner', name: 'HeroBanner' };
      const template = { name: 'Template' };
      expect(resolveItemIcon(item, template)).toBe('template');
    });

    test('Standard Template resolves to template', () => {
      const item = { path: '/root/templates/System/Standard Template', name: 'Standard Template' };
      const template = { name: 'Standard Template' };
      expect(resolveItemIcon(item, template)).toBe('template');
    });

    test('Page item under /root/content resolves to page', () => {
      const item = { path: '/root/content/Home', name: 'Home' };
      const template = { name: 'Page' };
      expect(resolveItemIcon(item, template)).toBe('page');
    });

    test('Custom user icon is respected when valid', () => {
      const customItem = { path: '/root/content/Special', icon: 'ti ti-star' };
      expect(resolveItemIcon(customItem)).toBe('ti ti-star');
    });

    test('Invalid or unknown icon falls back to correct type default', () => {
      const itemWithBadIcon = { path: '/root/layout/Layouts/Custom', icon: 'invalid-icon-xyz' };
      const template = { name: 'Layout' };
      expect(resolveItemIcon(itemWithBadIcon, template)).toBe('layout');
    });
  });

  describe('4. HTML Rendering & Tree Integration', () => {
    test('getIconUrl returns correct SVG paths', () => {
      expect(getIconUrl('folder')).toBe('/img/icons/folder.svg');
      expect(getIconUrl('content-root')).toBe('/img/icons/content-root.svg');
      expect(getIconUrl('rendering')).toBe('/img/icons/rendering.svg');
      expect(getIconUrl('unknown-custom')).toBeNull();
    });

    test('renderIconHtml outputs valid and secure HTML', () => {
      const folderHtml = renderIconHtml('folder', 16);
      expect(folderHtml).toContain('/img/icons/folder.svg');
      expect(folderHtml).toContain('width="16"');
      expect(folderHtml).toContain('height="16"');

      const pageHtml = renderIconHtml('page', 32, 'my-test-class');
      expect(pageHtml).toContain('/img/icons/page.svg');
      expect(pageHtml).toContain('width="32"');
      expect(pageHtml).toContain('height="32"');
      expect(pageHtml).toContain('my-test-class');

      // Fallback for invalid icon key
      const fallbackHtml = renderIconHtml('unknown-icon');
      expect(fallbackHtml).toContain('/img/icons/page.svg');
    });

    test('treeHelper.toFancytreeNode sets correct iconUrl, iconKey, and folder state', () => {
      const dummyId = new mongoose.Types.ObjectId();

      // Test 1: Folder
      const folderItem = {
        _id: dummyId,
        name: 'Feature',
        displayName: 'Feature',
        path: '/root/templates/Feature',
      };
      const folderNode = treeHelper.toFancytreeNode(folderItem, true, { name: 'Template Folder' });
      expect(folderNode.folder).toBe(true);
      expect(folderNode.data.iconKey).toBe('folder');
      expect(folderNode.data.iconUrl).toBe('/img/icons/folder.svg');

      // Test 2: Content root
      const rootItem = {
        _id: dummyId,
        name: 'content',
        displayName: 'Content',
        path: '/root/content',
      };
      const rootNode = treeHelper.toFancytreeNode(rootItem, true, null);
      expect(rootNode.folder).toBe(false);
      expect(rootNode.data.iconKey).toBe('content-root');
      expect(rootNode.data.iconUrl).toBe('/img/icons/content-root.svg');

      // Test 3: Rendering
      const renderingItem = {
        _id: dummyId,
        name: 'HeroBanner',
        displayName: 'Hero Banner',
        path: '/root/layout/Renderings/HeroBanner',
      };
      const renderingNode = treeHelper.toFancytreeNode(renderingItem, false, { name: 'Rendering' });
      expect(renderingNode.folder).toBe(false);
      expect(renderingNode.data.iconKey).toBe('rendering');
      expect(renderingNode.data.iconUrl).toBe('/img/icons/rendering.svg');
    });
  });
});
