/**
 * Test logic evaluation for Conditional Visibility
 */

function evaluateCondition(actualVal, operator, targetVal) {
  const op = (operator || 'equals').toLowerCase();

  switch (op) {
    case 'truthy':
      return Boolean(actualVal) && actualVal !== 'false' && actualVal !== '0' && actualVal !== '';

    case 'falsy':
      return !actualVal || actualVal === 'false' || actualVal === '0' || actualVal === '';

    case 'equals':
      return String(actualVal ?? '').trim() === String(targetVal ?? '').trim();

    case 'notequals':
      return String(actualVal ?? '').trim() !== String(targetVal ?? '').trim();

    case 'contains':
      return String(actualVal ?? '')
        .toLowerCase()
        .includes(String(targetVal ?? '').toLowerCase());

    case 'in': {
      const list = Array.isArray(targetVal)
        ? targetVal.map(String)
        : String(targetVal || '')
            .split(',')
            .map((s) => s.trim());
      return list.includes(String(actualVal ?? '').trim());
    }

    case 'notin': {
      const list = Array.isArray(targetVal)
        ? targetVal.map(String)
        : String(targetVal || '')
            .split(',')
            .map((s) => s.trim());
      return !list.includes(String(actualVal ?? '').trim());
    }

    default:
      return true;
  }
}

describe('Conditional Visibility Engine - Operator Evaluation', () => {
  it('evaluates equals and notEquals', () => {
    expect(evaluateCondition('video', 'equals', 'video')).toBe(true);
    expect(evaluateCondition('image', 'equals', 'video')).toBe(false);
    expect(evaluateCondition('image', 'notEquals', 'video')).toBe(true);
    expect(evaluateCondition('video', 'notEquals', 'video')).toBe(false);
  });

  it('evaluates truthy and falsy', () => {
    expect(evaluateCondition(true, 'truthy')).toBe(true);
    expect(evaluateCondition('true', 'truthy')).toBe(true);
    expect(evaluateCondition(false, 'truthy')).toBe(false);
    expect(evaluateCondition('', 'truthy')).toBe(false);
    expect(evaluateCondition(false, 'falsy')).toBe(true);
    expect(evaluateCondition('', 'falsy')).toBe(true);
    expect(evaluateCondition('0', 'falsy')).toBe(true);
    expect(evaluateCondition('hello', 'falsy')).toBe(false);
  });

  it('evaluates contains', () => {
    expect(evaluateCondition('Treecraft CMS Engine', 'contains', 'CMS')).toBe(true);
    expect(evaluateCondition('Treecraft CMS Engine', 'contains', 'WordPress')).toBe(false);
  });

  it('evaluates in and notIn lists', () => {
    expect(evaluateCondition('published', 'in', ['draft', 'review', 'published'])).toBe(true);
    expect(evaluateCondition('archived', 'in', ['draft', 'review', 'published'])).toBe(false);
    expect(evaluateCondition('published', 'in', 'draft, review, published')).toBe(true);
    expect(evaluateCondition('archived', 'notIn', 'draft, review, published')).toBe(true);
  });
});

