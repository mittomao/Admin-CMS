const itemService = require('../../services/itemService');
const aclService = require('../../services/aclService');
const templateService = require('../../services/templateService');
const versionService = require('../../services/versionService');
const workflowService = require('../../services/workflowService');
const Item = require('../../models/Item');
const PublishedItem = require('../../models/PublishedItem');
const Template = require('../../models/Template');
const treeHelper = require('../../utils/treeHelper');
const ribbonConfig = require('../../config/ribbon');
const logger = require('../../utils/logger');
const branding = require('../../config/branding');
const { ForbiddenError, NotFoundError } = require('../../utils/errors');
const eventBus = require('../../utils/eventBus');

const isLayoutItem = (p) => p && (p.toLowerCase().startsWith(branding.PATHS.LAYOUT.toLowerCase()) || p.toLowerCase().startsWith('/root/layout'));

const contentEditorController = {
  /**
   * GET /admin/content-editor and /admin/content-editor/:id
   * Render the full Content Editor shell layout
   */
  async index(req, res, next) {
    try {
      const requestedId = req.params.id;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);
      const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');

      if (currentDb === 'web' && !canReadWeb) {
        throw new ForbiddenError('Bạn không có quyền truy cập cơ sở dữ liệu Web (database:web:read).');
      }

      let selectedItem = null;

      if (requestedId) {
        selectedItem = await itemService.getById(requestedId, currentDb);
      }

      if (!selectedItem) {
        // Fallback to /root/content/home, /root/content/home or root
        selectedItem = (await itemService.getByPath(branding.PATHS.HOME, currentDb)) ||
                       (await itemService.getByPath('/root/content/home', currentDb)) ||
                       (await itemService.getRoot(currentDb));
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
        if (currentDb === 'master') {
          activeTemplate = await Template.findById(selectedItem._id);
        }
        if (activeTemplate) {
          isTemplate = true;
          resolvedTemplate = await templateService.resolveTemplate(selectedItem._id);
          usage = await templateService.getUsage(selectedItem._id);
          quickInfo = await itemService.getQuickInfo(selectedItem._id, currentDb);
        } else {
          schemaData = await itemService.getItemWithRenderSchema(selectedItem._id, lang, version, currentDb);
          quickInfo = schemaData?.quickInfo || (await itemService.getQuickInfo(selectedItem._id, currentDb));
        }
      }

      const breadcrumbs = selectedItem ? await itemService.getPathBreadcrumb(selectedItem, currentDb) : [];
      const templates = allTemplates;

      let workflowStateInfo = null;
      let availableCommands = [];
      let isPublishedOnWeb = false;
      let publishStatus = 'UNPUBLISHED';

      if (selectedItem && !isTemplate) {
        try {
          workflowStateInfo = await workflowService.getState(selectedItem, lang, version);
          availableCommands = await workflowService.getCommands(selectedItem, lang, version, req.user);
          const webDoc = await PublishedItem.findById(selectedItem._id).lean();
          isPublishedOnWeb = Boolean(webDoc && !webDoc.isDeleted);
          publishStatus = await itemService.getPublishStatus(selectedItem, lang, version);
        } catch (wfErr) {
          logger.error(`Error resolving workflow/publish status in index: ${wfErr.message}`);
        }
      }

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
        workflowStateInfo,
        availableCommands,
        isPublishedOnWeb,
        publishStatus,
        currentLang: lang,
        currentVersion: version,
        breadcrumbs,
        templates,
        ribbon: ribbonConfig,
        currentDb,
        canReadWeb,
        layout: 'layouts/shell',
      });
    } catch (error) {
      logger.error(`Error loading Content Editor: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /admin/content-editor/item/:id/form?lang=&version=&db=
   * Returns partial HTML of the item editing form for specific language, version, and database
   */
  async getItemFormPartial(req, res) {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'vi';
      const version = parseInt(req.query.version, 10) || 1;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);

      if (currentDb === 'web') {
        const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');
        if (!canReadWeb) {
          return res.status(403).send('<div class="alert alert-danger m-3">Bạn không có quyền truy cập cơ sở dữ liệu Web (database:web:read).</div>');
        }

        const schemaData = await itemService.getItemWithRenderSchema(id, lang, version, 'web');
        if (!schemaData) {
          const masterItem = await itemService.getById(id, 'master');
          if (masterItem) {
            return res.render('content-editor/partials/un节-web-alert', {
              masterItem,
              lang,
            }, (renderErr, html) => {
              if (renderErr || !html) {
                return res.send(`
                  <div class="p-6 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl shadow-xs m-4 text-center">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-3">
                      <i class="ti ti-alert-triangle text-2xl"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Item chưa được xuất bản lên Web</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
                      Item "<strong>${masterItem.displayName || masterItem.name}</strong>" tồn tại trên Master database nhưng chưa được xuất bản sang kho Web Store.
                    </p>
                    <a href="/admin/content-editor/${masterItem._id}?db=master&lang=${lang}" class="btn btn-primary bg-sc-red hover:bg-sc-red-hover text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm">
                      <i class="ti ti-arrow-back-up me-1"></i> Mở trên Master Database
                    </a>
                  </div>
                `);
              }
              return res.send(html);
            });
          }
          return res.status(404).send('<div class="alert alert-danger m-3">Item không tồn tại hoặc đã bị xóa.</div>');
        }

        const { item, resolvedTemplate, languagesList, versionsList, hasLanguage, hasVersion, versionInfo, componentTemplates, quickInfo } = schemaData;
        const breadcrumbs = await itemService.getPathBreadcrumb(item, 'web');

        // Check orphan: item in web but not in master
        const masterItem = await Item.findOne({ _id: id, deleted: false, isDeleted: { $ne: true } }).lean();
        const isOrphan = !masterItem;

        return res.render('content-editor/item-form', {
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
          workflowStateInfo: null,
          availableCommands: [],
          isPublishedOnWeb: true,
          publishStatus: 'PUBLISHED',
          currentDb: 'web',
          isOrphan,
        });
      }

      // Master DB Mode:
      // 1. Check if item is a Template Definition
      const activeTemplate = await Template.findById(id);
      if (activeTemplate) {
        const resolvedTemplate = await templateService.resolveTemplate(id);
        const usage = await templateService.getUsage(id);
        const allTemplates = await templateService.list();
        const quickInfo = await itemService.getQuickInfo(id, 'master');

        return res.render('content-editor/template-workspace', {
          layout: false,
          activeTemplate,
          resolvedTemplate,
          usage,
          allTemplates,
          quickInfo,
          currentDb: 'master',
        });
      }

      // 2. Normal Content Item
      const schemaData = await itemService.getItemWithRenderSchema(id, lang, version, 'master');
      if (!schemaData) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found or has been removed.</div>');
      }

      const { item, resolvedTemplate, languagesList, versionsList, hasLanguage, hasVersion, versionInfo, componentTemplates, quickInfo } = schemaData;

      // GĐ 7: Check read permission on item
      if (!(await itemService.canPerform(req.user, item, 'item:read'))) {
        return res.status(403).send('<div class="alert alert-danger m-3">Bạn không có quyền đọc (item:read) trên mục này.</div>');
      }

      const breadcrumbs = await itemService.getPathBreadcrumb(item, 'master');

      // GĐ 8 & 8.1: Resolve workflow state, available commands and publish status
      let workflowStateInfo = null;
      let availableCommands = [];
      let isPublishedOnWeb = false;
      let publishStatus = 'UNPUBLISHED';

      try {
        workflowStateInfo = await workflowService.getState(item, lang, version);
        availableCommands = await workflowService.getCommands(item, lang, version, req.user);
        const webDoc = await PublishedItem.findById(item._id).lean();
        isPublishedOnWeb = Boolean(webDoc && !webDoc.isDeleted);
        publishStatus = await itemService.getPublishStatus(item, lang, version);
      } catch (wfErr) {
        logger.error(`Error resolving workflow/publish status: ${wfErr.message}`);
      }

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
        workflowStateInfo,
        availableCommands,
        isPublishedOnWeb,
        publishStatus,
        currentDb: 'master',
        isOrphan: false,
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
   * GET /admin/content-editor/item/:id/folder-view?db=
   * Returns partial HTML of folder view (child item tiles)
   */
  async getItemFolderViewPartial(req, res, next) {
    try {
      const { id } = req.params;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);

      if (currentDb === 'web') {
        const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');
        if (!canReadWeb) {
          return res.status(403).send('<div class="alert alert-danger m-3">Bạn không có quyền truy cập cơ sở dữ liệu Web (database:web:read).</div>');
        }
      }

      const item = await itemService.getById(id, currentDb);
      if (!item) {
        return res.status(404).send('<div class="alert alert-danger m-3">Item not found.</div>');
      }

      let children = await itemService.getChildren(id, { db: currentDb });
      if (req.user) {
        children = await aclService.filterReadable(req.user, children);
      }
      const breadcrumbs = await itemService.getPathBreadcrumb(item, currentDb);
      const quickInfo = await itemService.getQuickInfo(item, currentDb);

      res.render('content-editor/folder-view', {
        layout: false,
        item,
        children,
        breadcrumbs,
        quickInfo,
        currentDb,
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
   * GET /api/items/:id/children?db=
   * Returns Fancytree-compliant JSON for lazy loading
   */
  async getTreeNodes(req, res, next) {
    try {
      const { id } = req.params;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);

      if (currentDb === 'web') {
        const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');
        if (!canReadWeb) {
          return res.status(403).json({ error: 'Bạn không có quyền truy cập cơ sở dữ liệu Web (database:web:read).' });
        }
      }

      if (!id || id === 'root') {
        let root;
        if (req.query.path) {
          root = await itemService.getByPath(req.query.path, currentDb);
        } else {
          root = await itemService.getRoot(currentDb);
        }
        if (root) {
          const directChildren = await itemService.getChildren(root._id, { db: currentDb });
          const rootNode = treeHelper.toFancytreeNode(root, directChildren.length > 0, root.templateId);
          return res.json([rootNode]);
        }
        return res.json([]);
      }

      const children = await itemService.getChildren(id, { db: currentDb });
      const accessibleChildren = [];
      for (const child of children) {
        const canRead = await itemService.canPerform(req.user, child, 'item:read');
        if (canRead) {
          accessibleChildren.push(child);
        } else {
          // Check if user has read permission on any descendant
          const descendants = await Item.find({
            path: { $regex: new RegExp(`^${child.path}/`, 'i') },
            deleted: { $ne: true },
          }).lean();
          const readableDescendants = await aclService.filterReadable(req.user, descendants);
          if (readableDescendants.length > 0) {
            child.navigationOnly = true;
            accessibleChildren.push(child);
          }
        }
      }

      const nodes = accessibleChildren.map((child) => {
        const node = treeHelper.toFancytreeNode(child, child.hasChildren, child.templateId);
        if (child.navigationOnly) {
          node.extraClasses = (node.extraClasses || '') + ' opacity-50 text-slate-400';
          node.data = node.data || {};
          node.data.navigationOnly = true;
        }
        return node;
      });

      res.json(nodes);
    } catch (error) {
      logger.error(`Error loading tree nodes: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/items/:id/quick-info?db=
   * Returns JSON metadata of the item for Quick Info
   */
  async getItemQuickInfo(req, res, next) {
    try {
      const { id } = req.params;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);
      const quickInfo = await itemService.getQuickInfo(id, currentDb);
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
   * GET /api/items/search?q=&db=
   * Search items in content tree
   */
  async searchItems(req, res, next) {
    try {
      const query = req.query.q || '';
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);

      if (currentDb === 'web') {
        const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');
        if (!canReadWeb) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      let results = await itemService.search(query, 20, currentDb);
      if (req.user) {
        results = await aclService.filterReadable(req.user, results);
      }
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/items/resolve-path?path=&db=
   * GET /api/items?path=&db=
   * Resolve an item by path or ID with security check
   */
  async resolvePath(req, res, next) {
    try {
      const rawPath = req.query.path;
      const rawId = req.query.id;
      const rawDb = req.query.db || 'master';
      const currentDb = itemService.validateDb(rawDb);

      if (currentDb === 'web') {
        const canReadWeb = await itemService.canPerform(req.user, null, 'database:web:read');
        if (!canReadWeb) {
          return res.status(403).json({ success: false, message: 'Forbidden: Web database read not permitted' });
        }
      }

      let item = null;
      if (rawPath) {
        item = await itemService.getByPath(rawPath, currentDb);
      } else if (rawId) {
        item = await itemService.getById(rawId, currentDb);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tham số "path" hoặc "id".',
        });
      }

      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy Item tại đường dẫn "${rawPath || rawId}"`,
        });
      }

      if (req.user) {
        const canRead = await itemService.canPerform(req.user, item, 'item:read');
        if (!canRead) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền đọc Item này (item:read).',
          });
        }
      }

      const itemObj = item.toObject ? item.toObject() : item;
      return res.json({
        success: true,
        _id: item._id,
        id: item._id,
        data: itemObj,
        ...itemObj,
      });
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
      if (parent) {
        if (isLayoutItem(parent.path)) {
          if (!(await itemService.canPerform(user, parent, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền tạo item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
        }
        if (!(await itemService.canPerform(user, parent, 'item:create'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo mục con dưới mục này (cần quyền create).',
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

      eventBus.emit('item.created', { item: newItem, user, userId });

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
      if (targetItem) {
        if (!(await itemService.canPerform(user, targetItem, 'item:write'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền chỉnh sửa mục này (cần quyền write).',
          });
        }
        if (isLayoutItem(targetItem.path)) {
          if (!(await itemService.canPerform(user, targetItem, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền chỉnh sửa item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
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

      eventBus.emit('item.updated', {
        item: targetItem,
        user,
        userId,
        lang: langCode,
        version: versionNumber,
        updatedFields: Object.keys(fields || {}),
      });

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

      if (!(await itemService.canPerform(user, id, 'version:create'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo phiên bản mới.' });
      }

      const result = await versionService.addVersion(id, lang, {
        copyFromVersion,
        userId: user?.id,
        note,
      });

      eventBus.emit('version.added', {
        itemId: id,
        itemPath: result.path || '',
        lang,
        version: result.version,
        user,
        userId: user?.id,
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

      if (!(await itemService.canPerform(user, id, 'version:create'))) {
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

      if (!(await itemService.canPerform(user, id, 'version:delete'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa phiên bản.' });
      }

      const result = await versionService.deleteVersion(id, lang, version);

      eventBus.emit('version.deleted', {
        itemId: id,
        lang,
        version: parseInt(version, 10),
        user,
        userId: user?.id,
      });

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

      if (!(await itemService.canPerform(user, id, 'version:restore'))) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khôi phục phiên bản.' });
      }

      const result = await versionService.restoreVersion(id, lang, version, {
        userId: user?.id,
      });

      eventBus.emit('version.restored', {
        itemId: id,
        lang,
        version: result.version,
        user,
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
      if (targetItem) {
        if (!(await itemService.canPerform(user, targetItem, 'item:rename'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền đổi tên item này (cần quyền rename).',
          });
        }
        if (isLayoutItem(targetItem.path)) {
          if (!(await itemService.canPerform(user, targetItem, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền đổi tên item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
        }
      }

      const item = await itemService.rename(id, name, displayName, userId);

      eventBus.emit('item.renamed', {
        item,
        user,
        userId,
        oldName: targetItem.name,
        newName: item.name,
      });

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
      if (targetItem) {
        if (!(await itemService.canPerform(user, targetItem, 'item:create'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền nhân bản item này (cần quyền create).',
          });
        }
        if (isLayoutItem(targetItem.path)) {
          if (!(await itemService.canPerform(user, targetItem, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền nhân bản item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
        }
      }

      const copy = await itemService.duplicate(
        id,
        targetParentId,
        userId,
        withSubitems !== false
      );

      const treeNode = treeHelper.toFancytreeNode(copy, false, copy.templateId);

      eventBus.emit('item.duplicated', {
        newItem: copy,
        sourceItem: targetItem,
        user,
        userId,
      });

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

      eventBus.emit('item.copied', {
        newItem: copy,
        sourceItem: { _id: id },
        targetParentId,
        user: req.session?.user,
        userId,
      });

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
      if (targetItem) {
        if (!(await itemService.canPerform(user, targetItem, 'item:write'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền di chuyển item này (cần quyền write).',
          });
        }
        if (isLayoutItem(targetItem.path)) {
          if (!(await itemService.canPerform(user, targetItem, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền di chuyển item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
        }
      }

      const movedItem = await itemService.moveTo(id, targetParentId, userId);

      eventBus.emit('item.moved', {
        item: movedItem,
        oldPath: targetItem?.path,
        newParentId: targetParentId,
        user,
        userId,
      });

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

      eventBus.emit('item.sorted', {
        item,
        direction,
        user: req.session?.user,
        userId: req.session?.user?.id,
      });

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
   * GET /api/items/:id/references (GĐ 9 / DEC-044)
   */
  async getItemReferences(req, res) {
    try {
      const { id } = req.params;
      const targetItem = await Item.findById(id).lean();
      if (!targetItem) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }
      const referenceService = require('../../services/referenceService');
      const refResult = await referenceService.findReferences(targetItem, { includeDescendants: true });
      res.json({
        success: true,
        data: refResult,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, message: error.message });
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
      if (targetItem) {
        if (!(await itemService.canPerform(user, targetItem, 'item:delete'))) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá item này (cần quyền delete).',
          });
        }
        if (isLayoutItem(targetItem.path)) {
          if (!(await itemService.canPerform(user, targetItem, 'presentation:write'))) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền xoá item trong nhánh Layout (yêu cầu quyền presentation:write).',
            });
          }
        }
      }

      const options = {
        confirmWarnings: req.body?.confirmWarnings === true,
        force: req.body?.force === true,
      };

      const result = await itemService.delete(id, userId, options);

      res.json({
        success: true,
        message: 'Item deleted successfully.',
        deletedId: id,
        ...result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        references: error.references || null,
        requiresConfirmation: error.requiresConfirmation || false,
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

  /**
   * Preview a content item from Master database (GĐ 10)
   * GET /admin/preview?id=...&lang=... OR GET /admin/content-editor/preview?id=...
   */
  async previewItem(req, res, next) {
    try {
      const user = req.user || req.session?.user;
      const itemId = req.query.id;
      const itemPath = req.query.path;
      const lang = (req.query.lang || 'vi').toLowerCase();

      let item = null;
      if (itemId) {
        item = await itemService.getById(itemId);
      } else if (itemPath) {
        item = await itemService.getByPath(itemPath);
      } else {
        item = (await itemService.getByPath(branding.PATHS.HOME)) || (await itemService.getByPath('/root/content/Home'));
      }

      if (!item) {
        throw new NotFoundError('Item to preview was not found');
      }

      // Check permission via canPerform (strictly NO hardcoded role checks!)
      if (!(await itemService.canPerform(user, item, 'item:read'))) {
        throw new ForbiddenError('You do not have permission to preview this item');
      }

      const siteRenderer = require('../../services/siteRenderer');
      const { html } = await siteRenderer.render(item, lang, {
        isPreview: true,
        req,
        res,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = contentEditorController;
