const itemService = require('../../services/itemService');
const templateService = require('../../services/templateService');
const versionService = require('../../services/versionService');
const Item = require('../../models/Item');
const Template = require('../../models/Template');
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

      const lang = req.query.lang || 'vi';
      const version = parseInt(req.query.version, 10) || 1;
      let schemaData = null;
      let isTemplate = false;
      let activeTemplate = null;
      let resolvedTemplate = null;
      let usage = null;
      let quickInfo = null;
      const allTemplates = await templateService.list();

      if (selectedItem) {
        activeTemplate = await Template.findById(selectedItem._id);
        if (activeTemplate) {
          isTemplate = true;
          resolvedTemplate = await templateService.resolveTemplate(selectedItem._id);
          usage = await templateService.getUsage(selectedItem._id);
          quickInfo = await itemService.getQuickInfo(selectedItem._id);
        } else {
          schemaData = await itemService.getItemWithRenderSchema(selectedItem._id, lang, version);
          quickInfo = schemaData?.quickInfo || (await itemService.getQuickInfo(selectedItem._id));
        }
      }

      const breadcrumbs = selectedItem ? await itemService.getPathBreadcrumb(selectedItem) : [];
      const templates = allTemplates;

      res.render('content-editor/index', {
        title: selectedItem ? `${selectedItem.displayName || selectedItem.name} - Content Editor` : 'Content Editor',
        currentPath: '/admin/content-editor',
        selectedItem: schemaData ? schemaData.item : selectedItem,
        schemaData,
        isTemplate,
        activeTemplate,
        resolvedTemplate,
        usage,
        allTemplates,
        quickInfo,
        currentLang: lang,
        currentVersion: version,
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
   * GET /admin/content-editor/item/:id/form?lang=&version=
   * Returns partial HTML of the item editing form for specific language and version
   */
  async getItemFormPartial(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const version = parseInt(req.query.version, 10) || 1;

      // 1. Check if item is a Template Definition
      const activeTemplate = await Template.findById(id);
      if (activeTemplate) {
        const resolvedTemplate = await templateService.resolveTemplate(id);
        const usage = await templateService.getUsage(id);
        const allTemplates = await templateService.list();
        const quickInfo = await itemService.getQuickInfo(id);

        return res.render('content-editor/template-workspace', {
          layout: false,
          activeTemplate,
          resolvedTemplate,
          usage,
          allTemplates,
          quickInfo,
        });
      }

      // 2. Normal Content Item
      const schemaData = await itemService.getItemWithRenderSchema(id, lang, version);
      if (!schemaData) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found or has been removed.</div>');
      }

      const { item, resolvedTemplate, languagesList, versionsList, hasLanguage, hasVersion, versionInfo, componentTemplates, quickInfo } = schemaData;
      const breadcrumbs = await itemService.getPathBreadcrumb(item);

      res.render('content-editor/item-form', {
        layout: false,
        item,
        template: resolvedTemplate,
        breadcrumbs,
        currentLang: lang,
        currentVersion: version,
        languagesList,
        versionsList,
        hasLanguage,
        hasVersion,
        versionInfo,
        componentTemplates: componentTemplates || [],
        quickInfo,
      });
    } catch (error) {
      logger.error(`Error loading item form partial: ${error.message}`);
      res.status(500).send(`<div class="alert alert-danger m-3">Error loading form: ${error.message}</div>`);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/versions?lang=
   * Returns partial HTML for the Version History modal / pane
   */
  async getVersionsHistoryPartial(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const item = await itemService.getById(id);
      if (!item) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found.</div>');
      }

      const versions = await versionService.listVersions(id, lang);
      const languages = await versionService.listLanguages(id);

      res.render('content-editor/modals/version-history-modal', {
        layout: false,
        item,
        currentLang: lang,
        versions,
        languages,
      });
    } catch (error) {
      logger.error(`Error loading versions history partial: ${error.message}`);
      res.status(500).send(`<div class="alert alert-danger m-3">Error loading version history: ${error.message}</div>`);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/compare?lang=&v1=&v2=
   * Returns partial HTML comparing two versions with visual diff
   */
  async getCompareVersionsPartial(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const item = await itemService.getById(id);
      if (!item) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found.</div>');
      }

      const versions = await versionService.listVersions(id, lang);
      let v1 = parseInt(req.query.v1, 10);
      let v2 = parseInt(req.query.v2, 10);

      // Default compare: latest vs previous
      if (!v1 || !v2) {
        if (versions.length >= 2) {
          v2 = versions[0].version; // latest
          v1 = versions[1].version; // previous
        } else if (versions.length === 1) {
          v1 = versions[0].version;
          v2 = versions[0].version;
        } else {
          v1 = 1;
          v2 = 1;
        }
      }

      const compareData = await versionService.compareVersions(id, lang, v1, v2);

      res.render('content-editor/modals/compare-versions-modal', {
        layout: false,
        item,
        currentLang: lang,
        versions,
        compareData,
      });
    } catch (error) {
      logger.error(`Error loading compare partial: ${error.message}`);
      res.status(500).send(`<div class="alert alert-danger m-3">Error loading comparison: ${error.message}</div>`);
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

      const quickInfo = await itemService.getQuickInfo(item);

      res.render('content-editor/folder-view', {
        layout: false,
        item,
        children,
        breadcrumbs,
        quickInfo,
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
        let root;
        if (req.query.path) {
          root = await itemService.getByPath(req.query.path);
        } else {
          root = await itemService.getRoot();
        }
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
   * GET /api/items/:id/quick-info
   * Returns JSON metadata of the item for Quick Info
   */
  async getItemQuickInfo(req, res, next) {
    try {
      const { id } = req.params;
      const quickInfo = await itemService.getQuickInfo(id);
      if (!quickInfo) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }
      res.json({ success: true, data: quickInfo });
    } catch (error) {
      logger.error(`Error loading item quick info: ${error.message}`);
      next(error);
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
      const user = req.session?.user;

      const parent = await Item.findById(parentId).lean();
      if (parent && parent.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, parent, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

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
   * Update item fields with optimistic locking and multi-version / multi-language support
   */
  async updateFields(req, res) {
    try {
      const { id } = req.params;
      const { fields, expectedUpdatedAt, lang, version } = req.body;
      const userId = req.session?.user?.id;
      const user = req.session?.user;

      const targetItem = await Item.findById(id).lean();
      if (targetItem && targetItem.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, targetItem, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền chỉnh sửa item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

      const langCode = lang || req.query.lang || null;
      const versionNumber = version || req.query.version || null;

      const updatedResult = await itemService.updateFields(
        id,
        fields,
        expectedUpdatedAt,
        userId,
        langCode,
        versionNumber
      );

      res.json({
        success: true,
        message: 'Item saved successfully.',
        data: updatedResult,
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
   * GET /api/items/:id/languages
   */
  async getItemLanguages(req, res) {
    try {
      const { id } = req.params;
      const languages = await versionService.listLanguages(id);
      res.json({ success: true, data: languages });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/items/:id/versions?lang=
   */
  async getItemVersions(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const versions = await versionService.listVersions(id, lang);
      res.json({ success: true, data: versions });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/items/:id/versions
   */
  async addVersion(req, res) {
    try {
      const { id } = req.params;
      const { lang = 'vi', copyFromVersion = null, note = '' } = req.body;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'version:create')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo phiên bản mới.' });
      }

      const result = await versionService.addVersion(id, lang, {
        copyFromVersion,
        userId: user?.id,
        note,
      });

      res.status(201).json({
        success: true,
        message: `Đã tạo thành công Phiên bản ${result.version} cho ngôn ngữ [${result.language}].`,
        data: result,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/items/:id/languages
   */
  async addLanguage(req, res) {
    try {
      const { id } = req.params;
      const { lang, copyFromLang = null, copyFromVersion = 1, note = '' } = req.body;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'version:create')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm ngôn ngữ mới.' });
      }

      const result = await versionService.addLanguageVersion(id, lang, {
        copyFromLang,
        copyFromVersion,
        userId: user?.id,
        note,
      });

      res.status(201).json({
        success: true,
        message: `Đã thêm thành công ngôn ngữ [${result.language}] cho Item.`,
        data: result,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * DELETE /api/items/:id/versions/:lang/:version
   */
  async deleteVersion(req, res) {
    try {
      const { id, lang, version } = req.params;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'version:delete')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa phiên bản.' });
      }

      const result = await versionService.deleteVersion(id, lang, version);

      res.json({
        success: true,
        message: `Đã xóa Phiên bản ${result.deletedVersion} của ngôn ngữ [${result.language}].`,
        data: result,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * POST /api/items/:id/versions/:lang/:version/restore
   */
  async restoreVersion(req, res) {
    try {
      const { id, lang, version } = req.params;
      const user = req.session?.user;

      if (!itemService.canPerform(user, null, 'version:restore')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khôi phục phiên bản.' });
      }

      const result = await versionService.restoreVersion(id, lang, version, {
        userId: user?.id,
      });

      res.status(201).json({
        success: true,
        message: `Đã khôi phục nội dung từ Phiên bản ${version} thành Phiên bản mới ${result.version}.`,
        data: result,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/items/:id/compare?lang=&v1=&v2=
   */
  async compareVersions(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const v1 = req.query.v1;
      const v2 = req.query.v2;

      const compareData = await versionService.compareVersions(id, lang, v1, v2);

      res.json({
        success: true,
        data: compareData,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
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
      const user = req.session?.user;

      const targetItem = await Item.findById(id).lean();
      if (targetItem && targetItem.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, targetItem, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền đổi tên item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

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
      const user = req.session?.user;

      const targetItem = await Item.findById(id).lean();
      if (targetItem && targetItem.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, targetItem, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền nhân bản item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

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
      const user = req.session?.user;

      const targetItem = await Item.findById(id).lean();
      if (targetItem && targetItem.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, targetItem, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền di chuyển item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

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
      const user = req.session?.user;

      const targetItem = await Item.findById(id).lean();
      if (targetItem && targetItem.path?.toLowerCase().startsWith('/sitecore/layout')) {
        if (!itemService.canPerform(user, targetItem, 'presentation:write')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá item trong nhánh Layout (yêu cầu quyền presentation:write).',
          });
        }
      }

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

  /**
   * POST /api/items/:id/reset-standard-value
   */
  async resetFieldStandardValue(req, res) {
    try {
      const { id } = req.params;
      const { fieldId } = req.body;
      const userId = req.session?.user?.id;

      if (!fieldId) {
        return res.status(400).json({
          success: false,
          message: 'fieldId is required.',
        });
      }

      const schemaData = await itemService.resetFieldToStandardValue(id, fieldId, userId);

      res.json({
        success: true,
        message: 'Field successfully reset to standard value.',
        data: schemaData,
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
