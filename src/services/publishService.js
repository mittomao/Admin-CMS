const mongoose = require('mongoose');
const crypto = require('crypto');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const PublishHistory = require('../models/PublishHistory');
const PublishJob = require('../models/PublishJob');
const workflowService = require('./workflowService');
const languageService = require('./languageService');
const branding = require('../config/branding');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

class PublishService {
  constructor() {
    this.schedulerInterval = null;
    this.isJobWorkerRunning = false;
  }

  /**
   * Preflight check: analyzes an item and its subtree for warnings
   * (e.g. unpublished datasources, broken references, workflow not final)
   * @param {string|mongoose.Types.ObjectId} rootItemId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async preflightCheck(rootItemId, options = {}) {
    const root = await Item.findById(rootItemId).lean();
    if (!root) throw new NotFoundError('Item not found for preflight');

    const warnings = [];
    const itemsToInspect = [root];

    if (options.includeSubitems) {
      const descendants = await Item.find({
        path: { $regex: new RegExp(`^${root.path}/`, 'i') },
        deleted: { $ne: true },
        isDeleted: { $ne: true },
      }).lean();
      itemsToInspect.push(...descendants);
    }

    const publishedWebIds = new Set(
      (await PublishedItem.find({}, { _id: 1 }).lean()).map((p) => p._id.toString())
    );

    const aclService = require('./aclService');
    const isAdmin = options.user && (aclService.isAdministrator(options.user) || options.user.isAdmin === true);

    for (const it of itemsToInspect) {
      // 1. Check workflow final status
      const stateInfo = await workflowService.getState(it, options.lang || 'vi');
      if (stateInfo && !stateInfo.isFinal) {
        warnings.push({
          type: 'WORKFLOW_NOT_FINAL',
          itemId: it._id,
          path: it.path,
          name: it.name,
          message: isAdmin
            ? `Item đang ở trạng thái "${stateInfo.state.name}" nhưng sẽ được xuất bản trực tiếp do bạn có quyền Administrator.`
            : `Item đang ở trạng thái "${stateInfo.state.name}" (chưa phê duyệt cuối cùng).`,
          state: stateInfo.state.name,
          adminBypass: Boolean(isAdmin),
        });
      }

      // 2. Check datasource links in presentation
      const datasources = [];
      if (it.presentation?.shared?.renderings) {
        for (const r of it.presentation.shared.renderings) {
          if (r.datasourceId) datasources.push(r.datasourceId.toString());
        }
      }
      if (Array.isArray(it.presentation?.final)) {
        for (const f of it.presentation.final) {
          if (Array.isArray(f.renderings)) {
            for (const r of f.renderings) {
              if (r.datasourceId) datasources.push(r.datasourceId.toString());
            }
          }
        }
      }

      for (const dsId of datasources) {
        if (!publishedWebIds.has(dsId)) {
          const dsItem = await Item.findById(dsId).select('name path').lean();
          warnings.push({
            type: 'UNPUBLISHED_DATASOURCE',
            itemId: it._id,
            itemPath: it.path,
            datasourceId: dsId,
            datasourceName: dsItem?.name || 'Unknown',
            datasourcePath: dsItem?.path || 'Unknown',
            message: `Rendering trỏ tới datasource "${dsItem?.name || dsId}" chưa được xuất bản trên Web.`,
          });
        }
      }
    }

    return {
      rootItemId: root._id,
      path: root.path,
      totalInspected: itemsToInspect.length,
      warningsCount: warnings.length,
      warnings,
    };
  }

  /**
   * Determine if a version is eligible for publishing
   * @param {object} item
   * @param {string} langCode
   * @param {number|string} version
   * @param {object|null} user
   */
  async isVersionPublishable(item, langCode, version, user = null) {
    let ver = null;
    if (typeof item?.getVersion === 'function') {
      ver = item.getVersion(langCode, version);
    } else if (item && Array.isArray(item.languages)) {
      const code = (langCode || 'vi').toLowerCase().trim();
      const vNum = parseInt(version, 10) || 1;
      const langEntry = item.languages.find((l) => (l.code || '').toLowerCase() === code);
      if (langEntry && Array.isArray(langEntry.versions)) {
        ver = langEntry.versions.find((v) => Number(v.version) === vNum) || null;
      }
    }
    if (!ver) return { publishable: false, reason: 'Version does not exist' };

    // Check "neverPublish"
    if (ver.neverPublish) {
      return { publishable: false, reason: 'Version marked as "never publish"' };
    }

    // Check scheduling: validFrom / validTo
    const now = new Date();
    if (ver.validFrom && new Date(ver.validFrom) > now) {
      return { publishable: false, reason: `Version not yet active (validFrom: ${ver.validFrom})` };
    }
    if (ver.validTo && new Date(ver.validTo) < now) {
      return { publishable: false, reason: `Version has expired (validTo: ${ver.validTo})` };
    }

    // Check workflow
    const stateInfo = await workflowService.getState(item, langCode, version);
    if (stateInfo) {
      if (!stateInfo.isFinal) {
        const aclService = require('./aclService');
        const isAdmin = user && (aclService.isAdministrator(user) || user.isAdmin === true);
        if (!isAdmin) {
          return {
            publishable: false,
            reason: `Workflow state "${stateInfo.state.name}" is not final. Only approved items can be published.`,
          };
        }
        return {
          publishable: true,
          state: stateInfo?.state?.name || null,
          adminBypass: true,
          workflowStateInfo: stateInfo,
        };
      }
    }

    return {
      publishable: true,
      state: stateInfo?.state?.name || null,
      adminBypass: false,
      workflowStateInfo: stateInfo,
    };
  }

  /**
   * Resolve related items that should be published alongside a page item
   * (Layouts, Renderings, Component Templates, Referenced Media Items)
   */
  async resolveRelatedItems(item) {
    const relatedIds = new Set();

    // 1. Presentation Layout & Renderings
    if (item.presentation?.shared?.layoutId) {
      relatedIds.add(item.presentation.shared.layoutId.toString());
    }
    if (Array.isArray(item.presentation?.shared?.renderings)) {
      for (const r of item.presentation.shared.renderings) {
        if (r.renderingId) relatedIds.add(r.renderingId.toString());
        if (r.datasourceId) relatedIds.add(r.datasourceId.toString());
      }
    }

    if (Array.isArray(item.presentation?.final)) {
      for (const f of item.presentation.final) {
        if (f.layoutId) relatedIds.add(f.layoutId.toString());
        if (Array.isArray(f.renderings)) {
          for (const r of f.renderings) {
            if (r.renderingId) relatedIds.add(r.renderingId.toString());
            if (r.datasourceId) relatedIds.add(r.datasourceId.toString());
          }
        }
      }
    }

    // 2. Referenced Media IDs from fields
    const scanForMediaIds = (fieldsMap) => {
      if (!fieldsMap) return;
      const entries = fieldsMap instanceof Map ? Array.from(fieldsMap.entries()) : Object.entries(fieldsMap);
      for (const [, val] of entries) {
        if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
          relatedIds.add(val.toString());
        } else if (val && typeof val === 'object' && val.mediaId) {
          relatedIds.add(val.mediaId.toString());
        }
      }
    };

    scanForMediaIds(item.fields);
    scanForMediaIds(item.sharedFields);
    if (Array.isArray(item.languages)) {
      for (const l of item.languages) {
        scanForMediaIds(l.unversionedFields);
        if (Array.isArray(l.versions)) {
          for (const v of l.versions) {
            scanForMediaIds(v.fields);
          }
        }
      }
    }

    // 3. Language items under /root/system/Languages (DEC-048)
    try {
      const langItems = await Item.find({
        path: { $regex: new RegExp(`^${branding.PATHS.SYSTEM_LANGUAGES}/[^/]+$`, 'i') },
        deleted: { $ne: true },
        isDeleted: { $ne: true },
      }).select('_id').lean();
      for (const li of langItems) {
        relatedIds.add(li._id.toString());
      }
    } catch (_err) {
      // Ignore if not present
    }

    if (relatedIds.size === 0) return [];

    // Query valid items from Master
    return Item.find({
      _id: { $in: Array.from(relatedIds) },
      deleted: { $ne: true },
      isDeleted: { $ne: true },
    }).lean();
  }

  /**
   * Publish a single item to items_web
   */
  async publishSingleItemToWeb(itemDoc, languages = null, user = null) {
    if (!languages || !languages.length) {
      const defLang = await languageService.getDefault();
      languages = [defLang.code];
    }
    const item = itemDoc.toObject ? itemDoc : await Item.findById(itemDoc._id);
    if (!item || item.deleted || item.isDeleted) {
      // Remove from web if deleted
      await PublishedItem.deleteOne({ _id: itemDoc._id });
      return { action: 'DELETED', itemId: itemDoc._id };
    }

    const langsToPublish = [];
    const itemLanguages = Array.isArray(item.languages) ? item.languages : [];

    for (const langCode of languages) {
      const code = langCode.toLowerCase().trim();
      const langEntry = itemLanguages.find((l) => l.code === code);
      if (!langEntry || !Array.isArray(langEntry.versions) || langEntry.versions.length === 0) {
        continue;
      }

      // Sort versions descending
      const sortedVersions = [...langEntry.versions].sort((a, b) => b.version - a.version);

      let eligibleVer = null;
      let bypassInfo = null;
      for (const ver of sortedVersions) {
        const check = await this.isVersionPublishable(item, code, ver.version, user);
        if (check.publishable) {
          eligibleVer = ver;
          if (check.adminBypass) {
            bypassInfo = check.workflowStateInfo;
          }
          break;
        }
      }

      if (eligibleVer) {
        // If Admin bypassed a non-final workflow state, auto-promote version on Master to Final (Approved)
        if (bypassInfo && bypassInfo.workflow && Array.isArray(bypassInfo.workflow.states)) {
          const finalState = bypassInfo.workflow.states.find((s) => s.isFinal);
          if (finalState) {
            try {
              await Item.updateOne(
                { _id: item._id, 'languages.code': code, 'languages.versions.version': eligibleVer.version },
                {
                  $set: {
                    'languages.$[lang].versions.$[ver].workflowState': finalState._id,
                    'languages.$[lang].versions.$[ver].updatedBy': user?._id || null,
                    'languages.$[lang].versions.$[ver].updatedAt': new Date(),
                    updatedBy: user?._id || null,
                    updatedAt: new Date(),
                  },
                },
                { arrayFilters: [{ 'lang.code': code }, { 'ver.version': eligibleVer.version }] }
              );

              // Record in WorkflowHistory
              const WorkflowHistory = require('../models/WorkflowHistory');
              const fromState = bypassInfo.state;
              await WorkflowHistory.create({
                itemId: item._id,
                lang: code,
                version: parseInt(eligibleVer.version, 10),
                fromState: fromState ? { _id: fromState._id, name: fromState.name, displayName: fromState.displayName || fromState.name } : null,
                toState: { _id: finalState._id, name: finalState.name, displayName: finalState.displayName || finalState.name },
                command: { name: 'admin-publish-bypass', displayName: 'Admin Direct Publish' },
                comment: 'Tự động phê duyệt khi Quản trị viên (Administrator) xuất bản trực tiếp sang Web.',
                user: user?._id || null,
                username: user?.username || user?.fullName || 'Administrator',
                at: new Date(),
              });
            } catch (err) {
              logger.error(`[PublishService] Error auto-promoting master workflow state: ${err.message}`);
            }
          }
        }

        // Resolve final layout for this (lang, version)
        let finalLayout = { layoutId: null, renderings: [] };
        if (Array.isArray(item.presentation?.final)) {
          const matched = item.presentation.final.find(
            (f) => f.language === code && f.version === eligibleVer.version
          );
          if (matched) {
            finalLayout = {
              layoutId: matched.layoutId || null,
              renderings: matched.renderings || [],
            };
          }
        }

        langsToPublish.push({
          code,
          publishedVersion: eligibleVer.version,
          fields: eligibleVer.fields || new Map(),
          unversionedFields: langEntry.unversionedFields || new Map(),
          finalLayout,
          publishedAt: new Date(),
          publishedBy: user?._id || null,
        });
      }
    }

    if (langsToPublish.length === 0) {
      // If the item has no versioned languages defined (e.g. system, layout, rendering, or folder items with shared fields),
      // create a default published language entry so related and structural items publish to Web.
      const hasAnyVersions = itemLanguages.some((l) => Array.isArray(l.versions) && l.versions.length > 0);
      if (!hasAnyVersions) {
        for (const langCode of languages) {
          langsToPublish.push({
            code: langCode.toLowerCase().trim(),
            publishedVersion: 1,
            fields: item.fields || new Map(),
            unversionedFields: new Map(),
            finalLayout: { layoutId: null, renderings: [] },
            publishedAt: new Date(),
            publishedBy: user?._id || null,
          });
        }
      } else {
        return { action: 'SKIPPED_NO_ELIGIBLE_VERSION', itemId: item._id, path: item.path };
      }
    }

    // Upsert into items_web
    const webDoc = {
      _id: item._id,
      name: item.name,
      displayName: item.displayName || item.name,
      templateId: item.templateId,
      parentId: item.parentId,
      ancestors: item.ancestors || [],
      path: item.path,
      sortOrder: item.sortOrder || 100,
      fields: item.fields || new Map(),
      sharedFields: item.sharedFields || new Map(),
      presentation: {
        shared: {
          layoutId: item.presentation?.shared?.layoutId || null,
          renderings: item.presentation?.shared?.renderings || [],
        },
      },
      languages: langsToPublish,
      sourceVersion: langsToPublish[0].publishedVersion,
      publishedAt: new Date(),
      publishedBy: user?._id || null,
      isDeleted: false,
    };

    await PublishedItem.findOneAndUpdate({ _id: item._id }, { $set: webDoc }, { upsert: true, new: true });

    eventBus.emit('item.published', {
      itemId: item._id,
      path: item.path,
      languages: langsToPublish.map((l) => l.code),
      byUser: user?.username || 'system',
    });

    return { action: 'PUBLISHED', itemId: item._id, path: item.path };
  }

  /**
   * Main publishing entry point supporting 4 modes: Item, Smart, Republish, Site
   * @param {string|mongoose.Types.ObjectId} rootItemId
   * @param {object} options
   */
  async publishItem(rootItemId, options = {}) {
    const mode = options.mode || 'Item';
    const defLang = await languageService.getDefault();
    const languages = options.languages && options.languages.length > 0 ? options.languages : [defLang.code];
    const includeSubitems = options.includeSubitems !== false;
    const includeRelated = options.includeRelated !== false;
    let user = options.user || null;

    if (user && typeof user === 'object' && !user.roles && user.isAdmin === undefined && (user._id || user.id)) {
      const User = require('../models/User');
      const loaded = await User.findById(user._id || user.id).populate('roles').lean();
      if (loaded) user = loaded;
    } else if (typeof user === 'string' || (user && user.constructor && user.constructor.name === 'ObjectId')) {
      const User = require('../models/User');
      const loaded = await User.findById(user).populate('roles').lean();
      if (loaded) user = loaded;
    }

    logger.info(`[PublishService] Starting ${mode} Publish for item ${rootItemId || 'SITE'} (Langs: ${languages.join(',')})`);

    let targetItems = [];

    if (mode === 'Site') {
      targetItems = await Item.find({
        deleted: { $ne: true },
        isDeleted: { $ne: true },
      }).lean();
    } else {
      const rootItem = await Item.findById(rootItemId);
      if (!rootItem) throw new NotFoundError('Root item not found for publishing');

      targetItems.push(rootItem);

      if (includeSubitems) {
        const descendants = await Item.find({
          path: { $regex: new RegExp(`^${rootItem.path}/`, 'i') },
          deleted: { $ne: true },
          isDeleted: { $ne: true },
        }).lean();
        targetItems.push(...descendants);
      }
    }

    // Smart publish filter: only items whose updatedAt is newer than their Web publishedAt
    if (mode === 'Smart') {
      const webItems = await PublishedItem.find(
        { _id: { $in: targetItems.map((t) => t._id) } },
        { _id: 1, publishedAt: 1 }
      ).lean();
      const webMap = new Map(webItems.map((w) => [w._id.toString(), w.publishedAt]));

      targetItems = targetItems.filter((t) => {
        const webPublishedAt = webMap.get(t._id.toString());
        if (!webPublishedAt) return true; // Never published
        return new Date(t.updatedAt) > new Date(webPublishedAt);
      });
    }

    // Include related items (Layouts, Renderings, Referenced Media)
    if (includeRelated) {
      const relatedMap = new Map();
      for (const it of targetItems) {
        const related = await this.resolveRelatedItems(it);
        for (const rel of related) {
          relatedMap.set(rel._id.toString(), rel);
        }
      }
      for (const rel of relatedMap.values()) {
        if (!targetItems.some((t) => t._id.toString() === rel._id.toString())) {
          targetItems.push(rel);
        }
      }
    }

    // Execute publish batch
    const logs = [];
    let publishedCount = 0;

    for (const it of targetItems) {
      try {
        // GĐ 7: Check item:publish right for EACH individual item if user is present
        if (user) {
          const itemService = require('./itemService');
          const canPublishItem = await itemService.canPerform(user, it, 'item:publish');
          if (!canPublishItem) {
            logs.push({
              itemId: it._id,
              path: it.path,
              action: 'SKIPPED',
              details: 'Bỏ qua: người dùng không có quyền item:publish trên mục này.',
            });
            continue;
          }
        }

        const res = await this.publishSingleItemToWeb(it, languages, user);
        logs.push({
          itemId: it._id,
          path: it.path,
          action: res.action,
          details: `Processed in mode ${mode}`,
        });
        if (res.action === 'PUBLISHED') {
          publishedCount++;
        }
      } catch (err) {
        logs.push({
          itemId: it._id,
          path: it.path,
          action: 'FAILED',
          details: err.message,
        });
      }
    }

    // Record history
    const history = await PublishHistory.create({
      publishType: mode,
      sourceDatabase: 'master',
      targetDatabase: 'web',
      rootItemId: rootItemId ? new mongoose.Types.ObjectId(rootItemId) : null,
      totalItemsProcessed: targetItems.length,
      totalItemsPublished: publishedCount,
      languages,
      status: 'Success',
      publishedBy: user?._id || null,
      startedAt: new Date(),
      finishedAt: new Date(),
      logDetails: logs,
    });

    logger.info(`[PublishService] Completed ${mode} Publish: ${publishedCount}/${targetItems.length} published.`);

    return {
      success: true,
      mode,
      totalItemsProcessed: targetItems.length,
      totalItemsPublished: publishedCount,
      historyId: history._id,
      logs,
    };
  }

  /**
   * Unpublish an item from Web
   */
  async unpublishItem(itemId, options = {}) {
    const item = await Item.findById(itemId);
    if (!item) throw new NotFoundError('Item not found');

    const idsToRemove = [item._id];
    if (options.includeSubitems) {
      const descendants = await PublishedItem.find({
        path: { $regex: new RegExp(`^${item.path}/`, 'i') },
      }).select('_id');
      idsToRemove.push(...descendants.map((d) => d._id));
    }

    const result = await PublishedItem.deleteMany({ _id: { $in: idsToRemove } });

    await PublishHistory.create({
      publishType: 'Item',
      rootItemId: item._id,
      totalItemsProcessed: idsToRemove.length,
      totalItemsPublished: 0,
      status: 'Success',
      publishedBy: options.user?._id || null,
      startedAt: new Date(),
      finishedAt: new Date(),
      logDetails: [
        {
          itemId: item._id,
          path: item.path,
          action: 'UNPUBLISHED',
          details: `Unpublished ${result.deletedCount} items from Web`,
        },
      ],
    });

    eventBus.emit('item.unpublished', {
      itemId: item._id,
      path: item.path,
      count: result.deletedCount,
    });

    return {
      success: true,
      unpublishedCount: result.deletedCount,
    };
  }

  /**
   * Cleanup Web: remove items from items_web that were deleted or moved on Master
   */
  async cleanupWeb() {
    const webItems = await PublishedItem.find({}, { _id: 1, path: 1 }).lean();
    const masterItems = await Item.find({
      deleted: { $ne: true },
      isDeleted: { $ne: true },
    }, { _id: 1, path: 1 }).lean();

    const masterMap = new Map(masterItems.map((m) => [m._id.toString(), m.path]));
    const toDeleteIds = [];

    for (const w of webItems) {
      const mPath = masterMap.get(w._id.toString());
      if (!mPath || mPath !== w.path) {
        toDeleteIds.push(w._id);
      }
    }

    if (toDeleteIds.length > 0) {
      await PublishedItem.deleteMany({ _id: { $in: toDeleteIds } });
      logger.info(`[PublishService: cleanupWeb] Removed ${toDeleteIds.length} obsolete items from Web`);
    }

    return { removedCount: toDeleteIds.length };
  }

  /**
   * Create and queue an asynchronous Publish Job
   */
  async queuePublishJob(params, user = null) {
    const defLang = await languageService.getDefault();
    const jobLangs = params.languages && params.languages.length > 0 ? params.languages : [defLang.code];

    const job = await PublishJob.create({
      mode: params.mode || 'Item',
      rootItemId: params.rootItemId || null,
      includeSubitems: params.includeSubitems !== false,
      includeRelated: params.includeRelated !== false,
      languages: jobLangs,
      status: 'Pending',
      createdBy: user?._id || null,
    });

    // Trigger in-process runner
    setImmediate(() => this.processNextJob());

    return job;
  }

  /**
   * Distributed Lock Job Runner
   * Only 1 publish job can run across the cluster at a time.
   */
  async processNextJob() {
    if (this.isJobWorkerRunning) return;
    this.isJobWorkerRunning = true;

    try {
      const lockToken = crypto.randomUUID();
      const lockExpiryTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes lock expiration

      // Acquire lock on oldest Pending job or expired Processing job
      const job = await PublishJob.findOneAndUpdate(
        {
          $or: [
            { status: 'Pending' },
            { status: 'Processing', lockedAt: { $lt: lockExpiryTime } },
          ],
        },
        {
          $set: {
            status: 'Processing',
            lockToken,
            lockedAt: new Date(),
            startedAt: new Date(),
            currentStep: 'Processing items',
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) {
        this.isJobWorkerRunning = false;
        return;
      }

      logger.info(`[PublishJob Runner] Acquired lock for Job ${job._id} (Mode: ${job.mode})`);

      // Populate createdBy user to ensure admin privileges are retained during background execution
      let publishingUser = null;
      if (job.createdBy) {
        const User = require('../models/User');
        publishingUser = await User.findById(job.createdBy).populate('roles').lean();
      }

      // Run publish
      const result = await this.publishItem(job.rootItemId, {
        mode: job.mode,
        languages: job.languages,
        includeSubitems: job.includeSubitems,
        includeRelated: job.includeRelated,
        user: publishingUser || job.createdBy,
      });

      // Update Job status
      job.status = 'Success';
      job.total = result.totalItemsProcessed;
      job.processed = result.totalItemsPublished;
      job.historyId = result.historyId;
      job.currentStep = 'Completed';
      job.finishedAt = new Date();
      job.lockToken = null;
      await job.save();

      eventBus.emit('publish.job.finished', {
        jobId: job._id,
        status: 'Success',
        total: result.totalItemsProcessed,
      });
    } catch (err) {
      logger.error(`[PublishJob Runner] Job failed: ${err.message}`, err);
    } finally {
      this.isJobWorkerRunning = false;
    }
  }

  /**
   * Start in-process Scheduler checking validFrom and validTo
   * Runs every 60 seconds
   */
  startScheduler(intervalMs = 60000) {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(async () => {
      try {
        await this.checkScheduledPublishing();
      } catch (err) {
        logger.error(`[Publish Scheduler] Error checking schedules: ${err.message}`, err);
      }
    }, intervalMs);

    logger.info('[Publish Scheduler] Started checking schedules every 60s');
  }

  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      logger.info('[Publish Scheduler] Stopped.');
    }
  }

  async checkScheduledPublishing() {
    const now = new Date();
    // Find items whose validFrom <= now and not yet published on web
    const itemsToPublish = await Item.find({
      'languages.versions.validFrom': { $lte: now },
      deleted: { $ne: true },
      isDeleted: { $ne: true },
    }).select('_id');

    const defLang = await languageService.getDefault();
    for (const it of itemsToPublish) {
      await this.publishSingleItemToWeb(it, [defLang.code]);
    }

    // Find items whose validTo <= now that are currently published
    const expiredItems = await Item.find({
      'languages.versions.validTo': { $lte: now },
      deleted: { $ne: true },
      isDeleted: { $ne: true },
    }).select('_id');

    for (const exp of expiredItems) {
      await PublishedItem.deleteOne({ _id: exp._id });
    }
  }
}

module.exports = new PublishService();
