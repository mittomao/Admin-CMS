const crypto = require('crypto');

module.exports = {
  type: 'Repeater',
  displayName: 'Repeater (Danh Sách Lặp Động)',
  category: 'Complex',
  icon: 'ti ti-list-details',
  viewSlug: 'repeater',
  defaultConfig: {
    subFields: [
      { name: 'title', title: 'Tiêu đề', type: 'Single-Line Text' },
      { name: 'description', title: 'Mô tả', type: 'Multi-Line Text' },
    ],
    minItems: 0,
    maxItems: null,
    addBtnText: 'Thêm mục mới',
  },
  validate(val, def = {}) {
    const isRequired = def.required || def.validation?.required;
    const items = this.sanitize(val, def);

    if (isRequired && items.length === 0) {
      return `${def.title || def.name} requires at least one item.`;
    }

    const minItems = def.config?.minItems || def.validation?.min;
    if (minItems && items.length < Number(minItems)) {
      return `${def.title || def.name} must have at least ${minItems} items.`;
    }

    const maxItems = def.config?.maxItems || def.validation?.max;
    if (maxItems && items.length > Number(maxItems)) {
      return `${def.title || def.name} must not exceed ${maxItems} items.`;
    }

    // Validate subFields if required
    const subFields = def.config?.subFields || [];
    const { fieldRegistry } = require('../index');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      for (const sub of subFields) {
        if (sub.required) {
          const handler = fieldRegistry.get(sub.type);
          const subErr = handler.validate(item[sub.name], sub);
          if (subErr) {
            return `Mục #${i + 1} (${sub.title || sub.name}): ${subErr}`;
          }
        }
      }
    }

    return null;
  },
  sanitize(val, def = {}) {
    if (!val) return [];
    let items = [];

    if (Array.isArray(val)) {
      items = val;
    } else if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        return [];
      }
    } else if (typeof val === 'object' && val !== null) {
      items = Object.values(val);
    }

    const subFields = def.config?.subFields || [];
    const { fieldRegistry } = require('../index');

    return items
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => {
        const cleaned = {
          _uid: item._uid || crypto.randomUUID(),
        };

        if (subFields.length > 0) {
          for (const sub of subFields) {
            const handler = fieldRegistry.get(sub.type);
            const rawSubVal = item[sub.name];
            cleaned[sub.name] = handler.sanitize(rawSubVal, sub);
          }
        } else {
          // If no explicit subFields defined in config, preserve all keys
          for (const [k, v] of Object.entries(item)) {
            cleaned[k] = v;
          }
        }

        return cleaned;
      });
  },
};

