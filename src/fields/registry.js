const fs = require('fs');
const path = require('path');

class FieldRegistry {
  constructor() {
    this.fields = new Map();
    this.initialized = false;
  }

  register(definition) {
    if (!definition || (!definition.type && !definition.name)) {
      throw new Error('Field definition must have a "type" or "name" property.');
    }
    const type = definition.type || definition.name;
    definition.type = type;
    definition.name = type;

    this.fields.set(type, definition);
    // Allow property-style access: fieldRegistry['Single-Line Text']
    this[type] = definition;
    return this;
  }

  get(type) {
    if (!this.initialized) this.init();
    return this.fields.get(type) || this.fields.get('Single-Line Text');
  }

  has(type) {
    if (!this.initialized) this.init();
    return this.fields.has(type);
  }

  getAll() {
    if (!this.initialized) this.init();
    return Array.from(this.fields.values());
  }

  getCategories() {
    const list = this.getAll();
    const categories = new Map();
    for (const f of list) {
      const cat = f.category || 'Standard';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat).push(f);
    }
    return categories;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    const defDir = path.join(__dirname, 'definitions');
    if (fs.existsSync(defDir)) {
      const files = fs.readdirSync(defDir).filter((file) => file.endsWith('.js'));
      for (const file of files) {
        try {
          const def = require(path.join(defDir, file));
          if (def && (def.type || def.name)) {
            this.register(def);
          }
        } catch (err) {
          console.error(`Failed to load field definition from ${file}:`, err);
        }
      }
    }
  }
}

const registryInstance = new FieldRegistry();
registryInstance.init();

module.exports = registryInstance;

