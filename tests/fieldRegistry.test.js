const { fieldRegistry, getFieldHandler } = require('../src/fields');

describe('Universal Custom Field System - Field Registry & Definitions', () => {
  it('should initialize and contain at least 14 built-in field types', () => {
    const all = fieldRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(14);

    const expectedTypes = [
      'Single-Line Text',
      'Multi-Line Text',
      'Rich Text',
      'Checkbox',
      'Date',
      'Number',
      'Droplist',
      'Image',
      'Toggle Switch',
      'Color Picker',
      'Icon Picker',
      'Tag Input',
      'External Link',
      'Markdown',
    ];

    expectedTypes.forEach((t) => {
      expect(fieldRegistry.has(t)).toBe(true);
      expect(fieldRegistry.get(t)).toBeDefined();
      expect(fieldRegistry.get(t).type).toBe(t);
    });
  });

  it('should fall back to Single-Line Text for unknown types', () => {
    const fallback = getFieldHandler('Unknown-Non-Existent-Field-Type');
    expect(fallback).toBeDefined();
    expect(fallback.type).toBe('Single-Line Text');
  });

  it('should group fields by categories', () => {
    const categories = fieldRegistry.getCategories();
    expect(categories.has('Text')).toBe(true);
    expect(categories.has('Selection')).toBe(true);
    expect(categories.has('Visual')).toBe(true);
    expect(categories.has('Toggle')).toBe(true);
    expect(categories.has('Relation')).toBe(true);
  });

  describe('Single-Line Text', () => {
    const handler = fieldRegistry.get('Single-Line Text');

    it('sanitizes strings properly', () => {
      expect(handler.sanitize('  hello world  ')).toBe('hello world');
      expect(handler.sanitize(null)).toBe('');
      expect(handler.sanitize(undefined)).toBe('');
    });

    it('validates required and regex rules', () => {
      expect(handler.validate('', { required: true, title: 'Title' })).toContain('is required');
      expect(handler.validate('valid', { required: true })).toBeNull();
      expect(
        handler.validate('invalid123', {
          validation: { regex: '^[a-z]+$', customErrorMessage: 'Chỉ chấp nhận chữ cái thường' },
        })
      ).toBe('Chỉ chấp nhận chữ cái thường');
      expect(handler.validate('abc', { validation: { regex: '^[a-z]+$' } })).toBeNull();
    });
  });

  describe('Rich Text', () => {
    const handler = fieldRegistry.get('Rich Text');

    it('strips dangerous HTML scripts and attributes', () => {
      const malicious = '<p>Hello <script>alert("XSS")</script><img src="x" onerror="alert(1)" /></p>';
      const cleaned = handler.sanitize(malicious);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('onerror');
      expect(cleaned).toContain('<p>Hello');
    });

    it('normalizes relative media URLs to absolute', () => {
      const input = '<p><img src="../../media/file/6af18744ca595fd6f7f97fde" /></p>';
      const cleaned = handler.sanitize(input);
      expect(cleaned).toContain('src="/media/file/6af18744ca595fd6f7f97fde"');
    });

    it('validates required non-empty HTML', () => {
      expect(handler.validate('<p><br></p>', { required: true, title: 'Content' })).toContain('is required');
      expect(handler.validate('<p>Some text</p>', { required: true })).toBeNull();
    });
  });

  describe('Number', () => {
    const handler = fieldRegistry.get('Number');

    it('sanitizes number values', () => {
      expect(handler.sanitize('42')).toBe(42);
      expect(handler.sanitize('3.1415')).toBe(3.1415);
      expect(handler.sanitize('')).toBeNull();
      expect(handler.sanitize(null)).toBeNull();
    });

    it('validates min and max', () => {
      expect(handler.validate('not-a-number', { title: 'Age' })).toContain('must be a valid number');
      expect(handler.validate(5, { title: 'Score', validation: { min: 10 } })).toContain('must be at least 10');
      expect(handler.validate(150, { title: 'Score', validation: { max: 100 } })).toContain('must not exceed 100');
      expect(handler.validate(50, { title: 'Score', validation: { min: 10, max: 100 } })).toBeNull();
    });
  });

  describe('Droplist', () => {
    const handler = fieldRegistry.get('Droplist');

    it('extracts options from newline string', () => {
      const def = { source: 'Option 1\nOption 2\n  Option 3  ' };
      const options = handler.getOptions(def);
      expect(options).toEqual([
        { label: 'Option 1', value: 'Option 1' },
        { label: 'Option 2', value: 'Option 2' },
        { label: 'Option 3', value: 'Option 3' },
      ]);
    });

    it('extracts options from config array', () => {
      const def = { config: { options: ['Red', 'Green', 'Blue'] } };
      const options = handler.getOptions(def);
      expect(options).toEqual([
        { label: 'Red', value: 'Red' },
        { label: 'Green', value: 'Green' },
        { label: 'Blue', value: 'Blue' },
      ]);
    });
  });

  describe('Toggle Switch', () => {
    const handler = fieldRegistry.get('Toggle Switch');

    it('sanitizes boolean values', () => {
      expect(handler.sanitize(true)).toBe(true);
      expect(handler.sanitize('true')).toBe(true);
      expect(handler.sanitize('on')).toBe(true);
      expect(handler.sanitize('1')).toBe(true);
      expect(handler.sanitize(false)).toBe(false);
      expect(handler.sanitize('false')).toBe(false);
      expect(handler.sanitize('0')).toBe(false);
      expect(handler.sanitize('')).toBe(false);
    });
  });

  describe('Color Picker', () => {
    const handler = fieldRegistry.get('Color Picker');

    it('sanitizes and validates hex codes', () => {
      expect(handler.sanitize(' #ffffff ')).toBe('#ffffff');
      expect(handler.validate('#123456')).toBeNull();
      expect(handler.validate('#abc')).toBeNull();
      expect(handler.validate('invalid-color', { title: 'Color' })).toContain('must be a valid hex or rgb');
    });
  });

  describe('Tag Input', () => {
    const handler = fieldRegistry.get('Tag Input');

    it('sanitizes comma-separated string, array and JSON', () => {
      expect(handler.sanitize('tag1, tag2,  tag3 ')).toEqual(['tag1', 'tag2', 'tag3']);
      expect(handler.sanitize(['a', ' b '])).toEqual(['a', 'b']);
      expect(handler.sanitize('["news", "updates"]')).toEqual(['news', 'updates']);
    });

    it('validates required tags', () => {
      expect(handler.validate('', { required: true, title: 'Tags' })).toContain('is required');
      expect(handler.validate(['design'], { required: true })).toBeNull();
    });
  });

  describe('External Link', () => {
    const handler = fieldRegistry.get('External Link');

    it('sanitizes object and JSON string', () => {
      const raw = {
        url: ' https://example.com ',
        text: ' Click Here ',
        target: '_blank',
        nofollow: true,
      };
      const cleaned = handler.sanitize(raw);
      expect(cleaned).toEqual({
        url: 'https://example.com',
        text: 'Click Here',
        target: '_blank',
        nofollow: true,
      });

      const jsonCleaned = handler.sanitize(JSON.stringify(raw));
      expect(jsonCleaned.url).toBe('https://example.com');
      expect(jsonCleaned.target).toBe('_blank');
    });

    it('validates required URL', () => {
      expect(handler.validate({ url: '' }, { required: true, title: 'CTA Link' })).toContain('URL is required');
      expect(handler.validate({ url: 'https://treecraft.io' }, { required: true })).toBeNull();
    });
  });

  describe('Custom Dynamic Registration', () => {
    it('allows registering a new custom field dynamically', () => {
      fieldRegistry.register({
        type: 'Rating Stars',
        displayName: 'Rating Stars (1-5)',
        category: 'Visual',
        icon: 'ti ti-star',
        viewSlug: 'rating-stars',
        sanitize: (val) => Math.min(5, Math.max(1, Number(val) || 1)),
        validate: () => null,
      });

      expect(fieldRegistry.has('Rating Stars')).toBe(true);
      const starHandler = fieldRegistry.get('Rating Stars');
      expect(starHandler.displayName).toBe('Rating Stars (1-5)');
      expect(starHandler.sanitize('10')).toBe(5);
    });
  });
});
