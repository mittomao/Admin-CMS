const { resolveItemIcon, getIconUrl, isFolderItem } = require('../config/icons');

/**
 * Helper to convert MongoDB Item documents to Fancytree JSON format
 */
const treeHelper = {
  /**
   * Convert a single item to Fancytree node representation
   * @param {Object} item Mongoose document or lean object
   * @param {Boolean} hasChildren Whether the node has subitems
   * @param {Object} template Populated template object
   */
  toFancytreeNode(item, hasChildren = false, template = null) {
    const isFolder = isFolderItem(item, template);
    const iconKey = resolveItemIcon(item, template);
    const iconUrl = getIconUrl(iconKey);

    return {
      key: item._id.toString(),
      title: item.displayName || item.name,
      folder: isFolder,
      lazy: Boolean(hasChildren),
      icon: iconUrl || iconKey,
      extraClasses: `node-template-${(template && template.name) || 'default'}`,
      data: {
        id: item._id.toString(),
        name: item.name,
        displayName: item.displayName || item.name,
        path: item.path,
        parentId: item.parentId ? item.parentId.toString() : null,
        sortOrder: item.sortOrder || 100,
        templateName: template ? template.name : '',
        templateId: (template && template._id) || (item.templateId ? item.templateId.toString() : ''),
        isFolder: isFolder,
        iconKey: iconKey,
        iconUrl: iconUrl,
      },
    };
  },

  /**
   * Convert an array of items to Fancytree nodes
   * @param {Array} items List of items
   * @param {Map|Object} childrenCountMap Map of itemId -> count of children
   */
  toFancytreeList(items, childrenCountMap = {}) {
    return items.map((item) => {
      const idStr = item._id.toString();
      const childCount = childrenCountMap[idStr] || 0;
      const tpl = item.templateId && typeof item.templateId === 'object' ? item.templateId : null;
      return treeHelper.toFancytreeNode(item, childCount > 0, tpl);
    });
  },
};

module.exports = treeHelper;

