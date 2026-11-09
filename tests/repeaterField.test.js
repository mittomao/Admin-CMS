const { fieldRegistry } = require('../src/fields');

describe('Universal Custom Field System - Phase F2 (Repeater & Complex Engines)', () => {
  const repeaterHandler = fieldRegistry.get('Repeater');
  const fieldGroupHandler = fieldRegistry.get('Field Group');

  describe('Repeater Registration', () => {
    it('is registered in FieldRegistry under Complex category', () => {
      expect(repeaterHandler).toBeDefined();
      expect(repeaterHandler.type).toBe('Repeater');
      expect(repeaterHandler.category).toBe('Complex');
      expect(repeaterHandler.viewSlug).toBe('repeater');
    });

    it('has Field Group registered under Layout category', () => {
      expect(fieldGroupHandler).toBeDefined();
      expect(fieldGroupHandler.type).toBe('Field Group');
      expect(fieldGroupHandler.category).toBe('Layout');
      expect(fieldGroupHandler.viewSlug).toBe('field-group');
    });
  });

  describe('Repeater Sanitization', () => {
    const def = {
      name: 'faqList',
      title: 'FAQ List',
      config: {
        subFields: [
          { name: 'question', title: 'Câu hỏi', type: 'Single-Line Text' },
          { name: 'answer', title: 'Câu trả lời', type: 'Multi-Line Text' },
          { name: 'isFeatured', title: 'Nổi bật', type: 'Toggle Switch' },
        ],
      },
    };

    it('sanitizes an array of items and ensures each item has a unique _uid', () => {
      const raw = [
        { question: '  What is Treecraft?  ', answer: 'A hierarchical CMS.', isFeatured: 'true' },
        { question: 'How to install?', answer: 'npm install', isFeatured: false },
      ];

      const cleaned = repeaterHandler.sanitize(raw, def);
      expect(cleaned).toHaveLength(2);
      expect(cleaned[0]._uid).toBeDefined();
      expect(cleaned[1]._uid).toBeDefined();
      expect(cleaned[0]._uid).not.toBe(cleaned[1]._uid);

      // Verify subfields sanitized by their handlers
      expect(cleaned[0].question).toBe('What is Treecraft?');
      expect(cleaned[0].isFeatured).toBe(true);
      expect(cleaned[1].isFeatured).toBe(false);
    });

    it('parses JSON string payload submitted by browser forms', () => {
      const jsonStr = JSON.stringify([
        { _uid: 'custom-uid-1', question: 'Test?', answer: 'Yes' },
      ]);

      const cleaned = repeaterHandler.sanitize(jsonStr, def);
      expect(cleaned).toHaveLength(1);
      expect(cleaned[0]._uid).toBe('custom-uid-1');
      expect(cleaned[0].question).toBe('Test?');
    });

    it('handles invalid input, null, or undefined by returning an empty array', () => {
      expect(repeaterHandler.sanitize(null, def)).toEqual([]);
      expect(repeaterHandler.sanitize(undefined, def)).toEqual([]);
      expect(repeaterHandler.sanitize('invalid-json', def)).toEqual([]);
      expect(repeaterHandler.sanitize(12345, def)).toEqual([]);
    });
  });

  describe('Repeater Validation', () => {
    const def = {
      name: 'carousel',
      title: 'Carousel Slides',
      required: true,
      config: {
        minItems: 2,
        maxItems: 4,
        subFields: [
          { name: 'headline', title: 'Tiêu đề slide', type: 'Single-Line Text', required: true },
        ],
      },
    };

    it('fails when empty and required', () => {
      const err = repeaterHandler.validate([], def);
      expect(err).toContain('requires at least one item');
    });

    it('fails when items count is below minItems', () => {
      const oneItem = [{ headline: 'Slide 1' }];
      const err = repeaterHandler.validate(oneItem, def);
      expect(err).toContain('must have at least 2 items');
    });

    it('fails when items count exceeds maxItems', () => {
      const fiveItems = [
        { headline: 'S1' },
        { headline: 'S2' },
        { headline: 'S3' },
        { headline: 'S4' },
        { headline: 'S5' },
      ];
      const err = repeaterHandler.validate(fiveItems, def);
      expect(err).toContain('must not exceed 4 items');
    });

    it('fails when a required subfield is missing or empty in any item', () => {
      const items = [
        { headline: 'Valid Slide' },
        { headline: '   ' }, // invalid empty required subfield
      ];
      const err = repeaterHandler.validate(items, def);
      expect(err).toContain('Mục #2 (Tiêu đề slide): Tiêu đề slide is required.');
    });

    it('passes when all constraints and subfields are valid', () => {
      const validItems = [
        { headline: 'Slide 1' },
        { headline: 'Slide 2' },
        { headline: 'Slide 3' },
      ];
      const err = repeaterHandler.validate(validItems, def);
      expect(err).toBeNull();
    });
  });

  describe('Field Group Definitions', () => {
    it('sanitizes and validates cleanly', () => {
      expect(fieldGroupHandler.sanitize({ test: 1 })).toEqual({ test: 1 });
      expect(fieldGroupHandler.sanitize(null)).toEqual({});
      expect(fieldGroupHandler.validate()).toBeNull();
    });
  });
});

