const { fieldRegistry } = require('../src/fields');

describe('Universal Custom Field System - Extended Field Catalog 30+ (Phase F3)', () => {
  it('registers all 33 custom field definitions successfully', () => {
    const all = fieldRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(30);

    const requiredTypes = [
      'Slug',
      'Currency',
      'Percentage',
      'Range Slider',
      'JSON Data',
      'Radio Group',
      'Checkbox List',
      'Time',
      'Date Time',
      'Date Range',
      'Gallery',
      'File Attachment',
      'Video Embed',
      'Content Reference',
      'Multi Item List',
      'Geo Location',
      'Key-Value Map',
    ];

    requiredTypes.forEach((t) => {
      expect(fieldRegistry.has(t)).toBe(true);
      const handler = fieldRegistry.get(t);
      expect(handler).toBeDefined();
      expect(handler.viewSlug).toBeDefined();
      expect(typeof handler.validate).toBe('function');
      expect(typeof handler.sanitize).toBe('function');
    });
  });

  describe('Slug Field', () => {
    const handler = fieldRegistry.get('Slug');

    it('sanitizes titles to valid slugs', () => {
      expect(handler.sanitize('Hello World 2026!')).toBe('hello-world-2026');
      expect(handler.sanitize('  --multiple---dashes-- ')).toBe('multiple-dashes');
      expect(handler.sanitize('')).toBe('');
    });

    it('validates slug format', () => {
      expect(handler.validate('valid-slug-123')).toBeNull();
      expect(handler.validate('Invalid Slug!')).toContain('valid lowercase slug');
      expect(handler.validate('', { required: true, title: 'URL Slug' })).toBe('URL Slug is required.');
    });
  });

  describe('Currency Field', () => {
    const handler = fieldRegistry.get('Currency');

    it('sanitizes currency numbers', () => {
      expect(handler.sanitize('129.99')).toBe(129.99);
      expect(handler.sanitize('')).toBeNull();
      expect(handler.sanitize('invalid')).toBeNull();
    });

    it('validates min and max constraints', () => {
      expect(handler.validate(50, { config: { min: 10, max: 100 } })).toBeNull();
      expect(handler.validate(5, { config: { min: 10 }, title: 'Price' })).toBe('Price cannot be less than 10.');
      expect(handler.validate(150, { config: { max: 100 }, title: 'Price' })).toBe('Price cannot be greater than 100.');
    });
  });

  describe('Percentage Field', () => {
    const handler = fieldRegistry.get('Percentage');

    it('sanitizes percentage numbers', () => {
      expect(handler.sanitize('85.5')).toBe(85.5);
      expect(handler.sanitize('')).toBeNull();
    });

    it('validates range between 0 and 100', () => {
      expect(handler.validate(50)).toBeNull();
      expect(handler.validate(120, { title: 'Discount' })).toBe('Discount must be between 0 and 100.');
      expect(handler.validate(-5, { title: 'Discount' })).toBe('Discount must be between 0 and 100.');
    });
  });

  describe('Range Slider Field', () => {
    const handler = fieldRegistry.get('Range Slider');

    it('sanitizes and validates slider values', () => {
      expect(handler.sanitize('75')).toBe(75);
      expect(handler.validate(75)).toBeNull();
      expect(handler.validate('abc', { title: 'Volume' })).toBe('Volume must be a valid number.');
    });
  });

  describe('JSON Data Field', () => {
    const handler = fieldRegistry.get('JSON Data');

    it('validates correct and incorrect JSON syntax', () => {
      expect(handler.validate('{"key": "value"}')).toBeNull();
      expect(handler.validate('{invalid json}', { title: 'Config' })).toContain('must be valid JSON');
    });

    it('sanitizes and formats JSON', () => {
      const sanitized = handler.sanitize('{"a":1}');
      expect(JSON.parse(sanitized)).toEqual({ a: 1 });
    });
  });

  describe('Radio Group & Checkbox List Fields', () => {
    const radio = fieldRegistry.get('Radio Group');
    const checkboxList = fieldRegistry.get('Checkbox List');

    it('sanitizes radio group single values', () => {
      expect(radio.sanitize(' option1 ')).toBe('option1');
      expect(radio.sanitize(null)).toBe('');
    });

    it('sanitizes checkbox list multi values', () => {
      expect(checkboxList.sanitize('a, b, c')).toEqual(['a', 'b', 'c']);
      expect(checkboxList.sanitize(JSON.stringify(['x', 'y']))).toEqual(['x', 'y']);
      expect(checkboxList.sanitize(['m', 'n'])).toEqual(['m', 'n']);
    });
  });

  describe('DateTime Fields (Time, Date Time, Date Range)', () => {
    const time = fieldRegistry.get('Time');
    const dateTime = fieldRegistry.get('Date Time');
    const dateRange = fieldRegistry.get('Date Range');

    it('validates and sanitizes Time format (HH:mm)', () => {
      expect(time.validate('14:30')).toBeNull();
      expect(time.validate('25:99', { title: 'Start Time' })).toContain('must be a valid time');
      expect(time.sanitize(' 09:15 ')).toBe('09:15');
    });

    it('validates and sanitizes Date Time', () => {
      expect(dateTime.validate('2026-11-09T12:00:00.000Z')).toBeNull();
      expect(dateTime.validate('invalid-date', { title: 'Event Date' })).toContain('must be a valid date');
      expect(dateTime.sanitize('2026-11-09T10:00:00.000Z')).toBe('2026-11-09T10:00:00.000Z');
    });

    it('validates and sanitizes Date Range', () => {
      const range = dateRange.sanitize('2026-01-01 to 2026-01-31');
      expect(range).toEqual({ from: '2026-01-01', to: '2026-01-31' });
      expect(dateRange.validate(range)).toBeNull();
    });
  });

  describe('Media & Complex Fields (Gallery, Video Embed, Geo Location, Key-Value Map)', () => {
    const gallery = fieldRegistry.get('Gallery');
    const video = fieldRegistry.get('Video Embed');
    const geo = fieldRegistry.get('Geo Location');
    const kv = fieldRegistry.get('Key-Value Map');

    it('sanitizes gallery media lists', () => {
      expect(gallery.sanitize('url1, url2')).toEqual(['url1', 'url2']);
      expect(gallery.sanitize(['/img1.png', '/img2.png'])).toEqual(['/img1.png', '/img2.png']);
    });

    it('sanitizes video embed URLs', () => {
      expect(video.sanitize(' https://youtube.com/watch?v=123 ')).toBe('https://youtube.com/watch?v=123');
    });

    it('sanitizes geo location coordinates and address', () => {
      const g = geo.sanitize({ lat: '21.0285', lng: '105.8542', address: 'Hanoi' });
      expect(g.lat).toBe(21.0285);
      expect(g.lng).toBe(105.8542);
      expect(g.address).toBe('Hanoi');
    });

    it('sanitizes key-value maps', () => {
      const map = kv.sanitize([
        { key: 'theme', value: 'dark' },
        { key: '', value: 'ignored' },
        { key: 'sidebar', value: 'collapsed' },
      ]);
      expect(map).toEqual([
        { key: 'theme', value: 'dark' },
        { key: 'sidebar', value: 'collapsed' },
      ]);
    });
  });
});

