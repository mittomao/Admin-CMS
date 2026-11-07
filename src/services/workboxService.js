const Workflow = require('../models/Workflow');
const workflowService = require('./workflowService');
const itemService = require('./itemService');
const { ValidationError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

class WorkboxService {
  /**
   * Single gateway for filtering items visible to user in Workbox.
   * In GĐ 8: Evaluated via canPerform(user, item, 'workbox:read').
   * In GĐ 7: Will seamlessly integrate Item ACL rules inside this single method.
   * @param {Array<object>} items
   * @param {User|object} user
   * @returns {Array<object>}
   */
  filterVisible(items, user) {
    if (!Array.isArray(items) || !user) return [];
    return items.filter((it) => {
      const itemContext = it.item || it;
      return itemService.canPerform(user, itemContext, 'workbox:read');
    });
  }

  /**
   * Get all workflows with their states and counts of pending items
   * @param {User|object} user
   * @returns {Promise<Array<object>>}
   */
  async getWorkboxSummary(user) {
    await workflowService.ensureDefaultWorkflow();
    const workflows = await Workflow.find({ isActive: true }).lean();

    const summary = [];
    for (const wf of workflows) {
      const stateSummaries = [];
      for (const st of wf.states) {
        const rawItems = await workflowService.getItemsByState(st._id);
        const visibleItems = this.filterVisible(rawItems, user);

        stateSummaries.push({
          _id: st._id,
          id: st._id.toString(),
          name: st.name,
          displayName: st.displayName || st.name,
          icon: st.icon || 'ti ti-clock',
          sortOrder: st.sortOrder || 100,
          isInitial: Boolean(st.isInitial),
          isFinal: Boolean(st.isFinal),
          itemCount: visibleItems.length,
          commands: st.commands || [],
        });
      }

      summary.push({
        _id: wf._id,
        id: wf._id.toString(),
        name: wf.name,
        displayName: wf.displayName || wf.name,
        description: wf.description || '',
        states: stateSummaries,
        totalItems: stateSummaries.reduce((acc, s) => acc + s.itemCount, 0),
      });
    }

    return summary;
  }

  /**
   * Get items in a specific workflow state with search, language filter, and commands
   * @param {string|mongoose.Types.ObjectId} stateId
   * @param {object} options { search, lang, page, limit }
   * @param {User|object} user
   */
  async getWorkboxItems(stateId, options = {}, user = null) {
    if (!stateId) return { items: [], total: 0, page: 1, limit: 20 };

    const rawItems = await workflowService.getItemsByState(stateId);
    let items = this.filterVisible(rawItems, user);

    // Filter by language
    if (options.lang) {
      const filterLang = options.lang.toLowerCase().trim();
      items = items.filter((it) => it.lang === filterLang);
    }

    // Filter by search keyword
    if (options.search) {
      const query = options.search.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.name?.toLowerCase().includes(query) ||
          it.path?.toLowerCase().includes(query) ||
          it.displayName?.toLowerCase().includes(query)
      );
    }

    const total = items.length;
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, parseInt(options.limit, 10) || 20);
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    // Augment with available commands for user
    const enrichedItems = [];
    for (const entry of paginatedItems) {
      const commands = await workflowService.getCommands(entry.itemId, entry.lang, entry.version, user);
      const history = await workflowService.getHistory(entry.itemId, entry.lang, entry.version);
      const latestHistory = history[0] || null;

      enrichedItems.push({
        ...entry,
        availableCommands: commands,
        latestComment: latestHistory?.comment || '',
        latestActionBy: latestHistory?.username || '',
        latestActionAt: latestHistory?.at || null,
      });
    }

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Execute bulk workflow command on multiple items
   * Requires workbox:bulk permission via canPerform
   * @param {string|mongoose.Types.ObjectId} stateId
   * @param {string} commandNameOrId
   * @param {Array<{ itemId: string, lang: string, version: number }>} targets
   * @param {string} comment
   * @param {User|object} user
   * @returns {Promise<object>}
   */
  async executeBulk(stateId, commandNameOrId, targets = [], comment = '', user = null) {
    if (!user) throw new ForbiddenError('User is required');
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new ValidationError('No items selected for bulk operation');
    }

    const isAllowed = itemService.canPerform(user, null, 'workbox:bulk');
    if (!isAllowed) {
      throw new ForbiddenError('Bạn không có quyền thực hiện thao tác hàng loạt (workbox:bulk)');
    }

    const results = {
      total: targets.length,
      successCount: 0,
      failCount: 0,
      succeeded: [],
      failed: [],
    };

    for (const target of targets) {
      try {
        const res = await workflowService.execute(
          target.itemId,
          target.lang || 'vi',
          target.version || 1,
          commandNameOrId,
          comment,
          user
        );
        results.successCount++;
        results.succeeded.push({
          itemId: target.itemId,
          lang: target.lang,
          version: target.version,
          toState: res.toState,
        });
      } catch (err) {
        results.failCount++;
        results.failed.push({
          itemId: target.itemId,
          lang: target.lang,
          version: target.version,
          error: err.message,
        });
      }
    }

    logger.info(
      `[Workbox Bulk] Executed command "${commandNameOrId}" by ${user.username}: ${results.successCount} succeeded, ${results.failCount} failed.`
    );

    return results;
  }
}

module.exports = new WorkboxService();
