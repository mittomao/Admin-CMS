const Template = require('../models/Template');
const Item = require('../models/Item');

const templateService = {
  /**
   * Get template by ID with populated insertOptions
   */
  async getById(id) {
    if (!id) return null;
    return Template.findById(id).populate('insertOptions', 'name displayName icon').lean();
  },

  /**
   * List all available templates
   */
  async list() {
    return Template.find().sort({ name: 1 }).lean();
  },

  /**
   * Get valid insert options for an item.
   * If the item's template defines insertOptions, return them.
   * If insertOptions are empty, return all templates as default fallback.
   */
  async getInsertOptions(itemId) {
    if (!itemId) return [];
    const item = await Item.findById(itemId).lean();
    if (!item) return [];

    const template = await Template.findById(item.templateId)
      .populate('insertOptions', 'name displayName icon description')
      .lean();

    if (template && template.insertOptions && template.insertOptions.length > 0) {
      return template.insertOptions;
    }

    // Default fallback: return all templates
    return Template.find().select('name displayName icon description').sort({ name: 1 }).lean();
  },
};

module.exports = templateService;

