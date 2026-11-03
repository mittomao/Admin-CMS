const itemService = require('../../services/itemService');
const templateService = require('../../services/templateService');
const treeHelper = require('../../utils/treeHelper');
const ribbonConfig = require('../../config/ribbon');
const logger = require('../../utils/logger');

const contentEditorController = {
  /**
   * GET /admin/content-editor and /admin/content-editor/:id
   * Render the full Content Editor shell layout
   */
  async index(req, res, next) {
    try {
      const requestedId = req.params.id;
      let selectedItem = null;

      if (requestedId) {
        selectedItem = await itemService.getById(requestedId);
      }

      if (!selectedItem) {
        // Fallback to /sitecore/content/home or root
        selectedItem = (await itemService.getByPath('/sitecore/content/home')) || (await itemService.getRoot());
      }

      const breadcrumbs = selectedItem ? await itemService.getPathBreadcrumb(selectedItem) : [];
      const templates = await templateService.list();

      res.render('content-editor/index', {
        title: selectedItem ? `${selectedItem.displayName || selectedItem.name} - Content Editor` : 'Content Editor',
        currentPath: '/admin/content-editor',
        selectedItem,
        breadcrumbs,
        templates,
        ribbon: ribbonConfig,
        layout: 'layouts/shell',
      });
    } catch (error) {
      logger.error(`Error loading Content Editor: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/form
   * Returns partial HTML of the item editing form
   */
  async getItemFormPartial(req, res, next) {
    try {
      const { id } = req.params;
      const item = await itemService.getById(id);
      if (!item) {
        return res.status(404).render('partials/alerts', {
          alertType: 'danger',
          alertMessage: 'Item not found or has been removed.',
        });
      }

      const breadcrumbs = await itemService.getPathBreadcrumb(item);
      const template = item.templateId;

      res.render('content-editor/item-form', {
        layout: false,
        item,
        template,
        breadcrumbs,
      });
    } catch (error) {
      logger.error(`Error loading item form partial: ${error.message}`);
      res.status(500).send(`<div class="alert alert-danger m-3">Error loading form: ${error.message}</div>`);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/folder-view
   * Returns partial HTML of folder view (child item tiles)
   */
  async getItemFolderViewPartial(req, res, next) {
    try {
      const { id } = req.params;
      const item = await itemService.getById(id);
      if (!item) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found.</div>');
      }

      const children = await itemService.getChildren(id);
      const breadcrumbs = await itemService.getPathBreadcrumb(item);

      res.render('content-editor/folder-view', {
        layout: false,
        item,
        children,
        breadcrumbs,
      });
    } catch (error) {
      logger.error(`Error loading folder view partial: ${error.message}`);
      res.status(500).send(`<div class="alert alert-danger m-3">Error loading child items: ${error.message}</div>`);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/insert-options
   * Returns available templates for inserting children
   */
  async getInsertOptions(req, res, next) {
    try {
      const { id } = req.params;
      const options = await templateService.getInsertOptions(id);
      res.json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  },

  // ==========================================
  // AJAX / JSON API Endpoints
  // ==========================================

  /**
   * GET /api/items/:id/children
   * Returns Fancytree-compliant JSON for lazy loading
   */
  async getTreeNodes(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || id === 'root') {
        const root = await itemService.getRoot();
        if (root) {
          const directChildren = await itemService.getChildren(root._id);
          const rootNode = treeHelper.toFancytreeNode(root, directChildren.length > 0, root.templateId);
          return res.json([rootNode]);
        }
        return res.json([]);
      }

      const children = await itemService.getChildren(id);
      const nodes = children.map((child) =>
        treeHelper.toFancytreeNode(child, child.hasChildren, child.templateId)
      );

      res.json(nodes);
    } catch (error) {
      logger.error(`Error loading tree nodes: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/items/search?q=
   * Search items in content tree
   */
  async searchItems(req, res, next) {
    try {
      const query = req.query.q || '';
      const results = await itemService.search(query);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/items
   * Insert new item from template
   */
  async createItem(req, res) {
    try {
      const { parentId, templateId, name, displayName } = req.body;
      const userId = req.session?.user?.id;

      const newItem = await itemService.createFromTemplate(
        parentId,
        templateId,
        name,
        displayName,
        userId
      );

      const treeNode = treeHelper.toFancytreeNode(newItem, false, newItem.templateId);

      res.status(201).json({
        success: true,
        message: `Created item '${newItem.displayName || newItem.name}' successfully.`,
        data: newItem,
        node: treeNode,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
      });
    }
  },

  /**
   * PUT /api/items/:id/fields
   * Update item fields with optimistic locking
   */
  async updateFields(req, res) {
    try {
      const { id } = req.params;
      const { fields, expectedUpdatedAt } = req.body;
      const userId = req.session?.user?.id;

      const updatedItem = await itemService.updateFields(
        id,
        fields,
        expectedUpdatedAt,
        userId
      );

      res.json({
        success: true,
        message: 'Item saved successfully.',
        data: updatedItem,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
      });
    }
  },

  /**
   * POST /api/items/:id/rename
   */
  async renameItem(req, res) {
    try {
      const { id } = req.params;
      const { name, displayName } = req.body;
      const userId = req.session?.user?.id;

      const item = await itemService.rename(id, name, displayName, userId);

      res.json({
        success: true,
        message: 'Item renamed successfully.',
        data: item,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  /**
   * POST /api/items/:id/duplicate
   */
  async duplicateItem(req, res) {
    try {
      const { id } = req.params;
      const { targetParentId, withSubitems } = req.body;
      const userId = req.session?.user?.id;

      const copy = await itemService.duplicate(
        id,
        targetParentId,
        userId,
        withSubitems !== false
      );

      const treeNode = treeHelper.toFancytreeNode(copy, false, copy.templateId);

      res.json({
        success: true,
        message: `Duplicated as '${copy.displayName || copy.name}'.`,
        data: copy,
        node: treeNode,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  /**
   * POST /api/items/:id/copy
   */
  async copyItem(req, res) {
    try {
      const { id } = req.params;
      const { targetParentId } = req.body;
      const userId = req.session?.user?.id;

      const copy = await itemService.copyTo(id, targetParentId, userId);
      const treeNode = treeHelper.toFancytreeNode(copy, false, copy.templateId);

      res.json({
        success: true,
        message: `Item copied successfully.`,
        data: copy,
        node: treeNode,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  /**
   * POST /api/items/:id/move
   */
  async moveItem(req, res) {
    try {
      const { id } = req.params;
      const { targetParentId } = req.body;
      const userId = req.session?.user?.id;

      const movedItem = await itemService.moveTo(id, targetParentId, userId);

      res.json({
        success: true,
        message: 'Item moved successfully.',
        data: movedItem,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  /**
   * POST /api/items/:id/sort
   */
  async sortItem(req, res) {
    try {
      const { id } = req.params;
      const { direction } = req.body;

      const item = await itemService.sort(id, direction);

      res.json({
        success: true,
        message: `Sorted ${direction}.`,
        data: item,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  /**
   * DELETE /api/items/:id
   */
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id;

      await itemService.delete(id, userId);

      res.json({
        success: true,
        message: 'Item deleted successfully.',
        deletedId: id,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },
};

module.exports = contentEditorController;
