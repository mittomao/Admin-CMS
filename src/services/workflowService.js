const mongoose = require('mongoose');
const Workflow = require('../models/Workflow');
const WorkflowHistory = require('../models/WorkflowHistory');
const Item = require('../models/Item');
const Template = require('../models/Template');
const templateService = require('./templateService');
const languageService = require('./languageService');
const eventBus = require('../utils/eventBus');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Helper to safely get version object from either Mongoose document or lean plain object
 */
function getItemVersion(item, langCode = null, versionNumber = 1) {
  if (!item) return null;
  const code = (langCode || '').toLowerCase().trim();
  if (!code) return null;
  if (typeof item.getVersion === 'function') {
    return item.getVersion(code, versionNumber);
  }
  const vNum = parseInt(versionNumber, 10) || 1;
  const languages = Array.isArray(item.languages) ? item.languages : [];
  const langEntry = languages.find((l) => (l.code || '').toLowerCase() === code);
  if (!langEntry || !Array.isArray(langEntry.versions)) return null;
  return langEntry.versions.find((v) => Number(v.version) === vNum) || null;
}

class WorkflowService {
  constructor() {
    this.actionRegistry = new Map();
    this.registerDefaultActions();
  }

  /**
   * Register workflow action handlers
   */
  registerAction(actionType, handler) {
    this.actionRegistry.set(actionType, handler);
  }

  registerDefaultActions() {
    // 1. autoPublish action
    this.registerAction('autoPublish', async ({ item, lang, version, user }) => {
      try {
        const publishService = require('./publishService');
        logger.info(`[Workflow Action] Auto-publishing item ${item._id} (${lang} v${version})`);
        await publishService.publishItem(item._id, {
          languages: [lang],
          includeSubitems: false,
          includeRelated: true,
          user,
        });
      } catch (err) {
        logger.error(`[Workflow Action: autoPublish] Failed for item ${item._id}: ${err.message}`, err);
        // Do not rollback workflow state, but log error
      }
    });

    // 2. validate action
    this.registerAction('validate', async ({ item, lang, version }) => {
      logger.info(`[Workflow Action] Validating item ${item._id} (${lang} v${version})`);
      const ver = getItemVersion(item, lang, version);

      // Check required fields based on template
      const effectiveTemplate = await templateService.resolveEffectiveTemplate(item, lang, version);
      if (effectiveTemplate && Array.isArray(effectiveTemplate.sections)) {
        for (const sec of effectiveTemplate.sections) {
          if (Array.isArray(sec.fields)) {
            for (const f of sec.fields) {
              if (f.required) {
                let val = ver && ver.fields ? (ver.fields instanceof Map ? ver.fields.get(f.name) : ver.fields?.[f.name]) : undefined;
                if (val === undefined && item.fields) {
                  val = item.fields instanceof Map ? item.fields.get(f.name) : item.fields[f.name];
                }
                if (val === undefined || val === null || val === '') {
                  throw new ValidationError(`Trường bắt buộc "${f.title || f.name}" không được để trống khi chuyển duyệt.`);
                }
              }
            }
          }
        }
      }
    });

    // 3. notify action
    this.registerAction('notify', async ({ item, lang, version, command, targetState, user }) => {
      logger.info(`[Workflow Action: notify] Item "${item.name}" moved to "${targetState.name}" via command "${command.name}" by user ${user?.username || 'system'}`);
      eventBus.emit('workflow.notification', {
        itemId: item._id,
        path: item.path,
        name: item.name,
        lang,
        version,
        targetState: targetState.name,
        byUser: user?.username || 'system',
        at: new Date(),
      });
    });

    // 4. lockItem action
    this.registerAction('lockItem', async ({ item }) => {
      logger.info(`[Workflow Action: lockItem] Locking item ${item._id}`);
      // Mark lock flag if needed
    });
  }

  /**
   * Ensure default 'Sample Workflow' exists in database and system items
   */
  async ensureDefaultWorkflow() {
    let sample = await Workflow.findOne({ name: 'Sample Workflow' });
    if (!sample) {
      const draftStateId = new mongoose.Types.ObjectId();
      const awaitingApprovalStateId = new mongoose.Types.ObjectId();
      const approvedStateId = new mongoose.Types.ObjectId();

      const submitCmdId = new mongoose.Types.ObjectId();
      const approveCmdId = new mongoose.Types.ObjectId();
      const rejectCmdId = new mongoose.Types.ObjectId();

      sample = await Workflow.create({
        name: 'Sample Workflow',
        displayName: 'Quy trình Tiêu chuẩn (Sample Workflow)',
        description: 'Quy trình xuất bản 3 bước: Bản nháp -> Chờ duyệt -> Đã duyệt & Xuất bản tự động',
        initialStateId: draftStateId,
        isActive: true,
        states: [
          {
            _id: draftStateId,
            name: 'Draft',
            displayName: 'Bản nháp (Draft)',
            icon: 'ti ti-file-pencil',
            sortOrder: 10,
            isInitial: true,
            isFinal: false,
            commands: [
              {
                _id: submitCmdId,
                name: 'Submit',
                displayName: 'Gửi duyệt (Submit)',
                targetStateId: awaitingApprovalStateId,
                requireComment: false,
                icon: 'ti ti-send',
                sortOrder: 10,
                actions: [
                  {
                    name: 'Validate Required Fields',
                    actionType: 'validate',
                  },
                  {
                    name: 'Notify Reviewers',
                    actionType: 'notify',
                  },
                ],
              },
            ],
          },
          {
            _id: awaitingApprovalStateId,
            name: 'Awaiting Approval',
            displayName: 'Chờ duyệt (Awaiting Approval)',
            icon: 'ti ti-clock',
            sortOrder: 20,
            isInitial: false,
            isFinal: false,
            commands: [
              {
                _id: approveCmdId,
                name: 'Approve',
                displayName: 'Phê duyệt & Xuất bản (Approve)',
                targetStateId: approvedStateId,
                requireComment: false,
                icon: 'ti ti-check',
                sortOrder: 10,
                actions: [
                  {
                    name: 'Auto Publish to Web',
                    actionType: 'autoPublish',
                  },
                  {
                    name: 'Notify Author',
                    actionType: 'notify',
                  },
                ],
              },
              {
                _id: rejectCmdId,
                name: 'Reject',
                displayName: 'Từ chối (Reject)',
                targetStateId: draftStateId,
                requireComment: true,
                icon: 'ti ti-x',
                sortOrder: 20,
                actions: [
                  {
                    name: 'Notify Author of Rejection',
                    actionType: 'notify',
                  },
                ],
              },
            ],
          },
          {
            _id: approvedStateId,
            name: 'Approved',
            displayName: 'Đã phê duyệt (Approved)',
            icon: 'ti ti-circle-check',
            sortOrder: 30,
            isInitial: false,
            isFinal: true,
            commands: [],
          },
        ],
      });
      logger.info('Created default "Sample Workflow" in workflows collection');
    }
    return sample;
  }

  /**
   * Resolve which workflow applies to an item
   * Priority:
   * 1. item.workflowId
   * 2. item.sharedFields.workflow or item.fields.workflow
   * 3. Template standard values
   * If not assigned, returns null (Item does not use workflow).
   */
  async resolveWorkflowForItem(item) {
    if (!item) return null;

    // 1. Direct assignment on Item
    let wfId = item.workflowId || null;
    if (!wfId && item.sharedFields) {
      wfId = item.sharedFields instanceof Map ? item.sharedFields.get('workflow') : item.sharedFields.workflow;
    }
    if (!wfId && item.fields) {
      wfId = item.fields instanceof Map ? item.fields.get('workflow') : item.fields.workflow;
    }

    // 2. Template Standard Values / Template level
    if (!wfId && item.templateId) {
      try {
        const templateId = item.templateId._id || item.templateId;
        const stdValues = await templateService.resolveStandardValues(templateId);
        if (stdValues && (stdValues.workflow || stdValues.workflowId)) {
          wfId = stdValues.workflow || stdValues.workflowId;
        }
      } catch {
        // Fallback silently if template cannot be resolved
      }
    }

    if (!wfId) {
      // Check if template itself has workflow assigned
      if (item.templateId) {
        const tpl = await Template.findById(item.templateId._id || item.templateId).lean();
        if (tpl && (tpl.workflow || tpl.workflowId)) {
          wfId = tpl.workflow || tpl.workflowId;
        }
      }
    }

    if (!wfId) {
      return null;
    }

    // Load workflow by ID or name
    let wf = null;
    if (mongoose.Types.ObjectId.isValid(wfId)) {
      wf = await Workflow.findById(wfId).lean();
    }
    if (!wf) {
      wf = await Workflow.findOne({ name: wfId.toString() }).lean();
    }

    // Fallback to default if string 'sample' or 'default'
    if (!wf && typeof wfId === 'string' && wfId.toLowerCase().includes('sample')) {
      wf = await this.ensureDefaultWorkflow();
    }

    return wf;
  }

  /**
   * Get current workflow state for an item in a specific language and version
   * @param {Item|string|mongoose.Types.ObjectId} itemOrId
   * @param {string} lang
   * @param {number} version
   * @returns {Promise<{ workflow: object, state: object, isInitial: boolean, isFinal: boolean }|null>}
   */
  async getState(itemOrId, lang = null, version = 1) {
    let item = itemOrId;
    if (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) {
      item = await Item.findById(item);
    }
    if (!item) return null;

    const defaultLang = await languageService.getDefault();
    const targetLang = lang || defaultLang.code;

    const workflow = await this.resolveWorkflowForItem(item);
    if (!workflow) {
      return null; // Item does not participate in workflow
    }

    const ver = getItemVersion(item, targetLang, version);
    if (!ver) {
      // If version not created yet, default to initial state
      const initState = workflow.states.find((s) => s.isInitial) || workflow.states[0];
      return {
        workflow,
        state: initState,
        isInitial: initState ? Boolean(initState.isInitial) : true,
        isFinal: initState ? Boolean(initState.isFinal) : false,
      };
    }

    let stateId = ver.workflowState || null;
    let state = null;

    if (stateId) {
      state = workflow.states.find((s) => s._id.toString() === stateId.toString() || s.name === stateId.toString());
    }

    // Default to initial state if not yet set
    if (!state) {
      state = workflow.states.find((s) => s.isInitial) || workflow.states[0];
    }

    return {
      workflow,
      state,
      isInitial: state ? Boolean(state.isInitial) : false,
      isFinal: state ? Boolean(state.isFinal) : false,
    };
  }

  /**
   * Get available outgoing workflow commands for user
   * @param {Item|string|mongoose.Types.ObjectId} itemOrId
   * @param {string} lang
   * @param {number} version
   * @param {User|object} user
   * @returns {Promise<Array<object>>}
   */
  async getCommands(itemOrId, lang = null, version = 1, user = null) {
    let item = itemOrId;
    if (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) {
      item = await Item.findById(item);
    }
    if (!item) return [];

    const defaultLang = await languageService.getDefault();
    const targetLang = lang || defaultLang.code;

    const stateInfo = await this.getState(item, targetLang, version);
    if (!stateInfo || !stateInfo.state || !Array.isArray(stateInfo.state.commands)) {
      return [];
    }

    const itemService = require('./itemService');
    const availableCommands = [];

    for (const cmd of stateInfo.state.commands) {
      const actionName = `workflow:execute:${cmd.name}`;
      // Check authorization via canPerform passing item
      const isAllowed = user ? await itemService.canPerform(user, item, actionName) : false;
      if (isAllowed) {
        availableCommands.push({
          id: cmd._id.toString(),
          _id: cmd._id,
          name: cmd.name,
          displayName: cmd.displayName || cmd.name,
          targetStateId: cmd.targetStateId,
          requireComment: Boolean(cmd.requireComment),
          icon: cmd.icon || 'ti ti-player-play',
          sortOrder: cmd.sortOrder || 100,
        });
      }
    }

    return availableCommands.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Execute a workflow command atomically
   * @param {string|mongoose.Types.ObjectId} itemId
   * @param {string} lang
   * @param {number} version
   * @param {string} commandIdOrName
   * @param {string} comment
   * @param {User|object} user
   * @param {Date|string} expectedUpdatedAt
   * @returns {Promise<object>}
   */
  async execute(itemId, lang = null, version = 1, commandIdOrName, comment = '', user = null, expectedUpdatedAt = null) {
    if (!itemId) throw new ValidationError('itemId is required');
    if (!user) throw new ForbiddenError('User is required to execute workflow command');

    const item = await Item.findById(itemId);
    if (!item) throw new NotFoundError('Item not found');

    const defaultLang = await languageService.getDefault();
    const targetLang = lang || defaultLang.code;

    // 1. Optimistic Locking check (409 Conflict)
    if (expectedUpdatedAt) {
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      const actualTime = new Date(item.updatedAt).getTime();
      if (Math.abs(actualTime - expectedTime) > 1000) {
        throw new ConflictError('Item đã bị chỉnh sửa bởi người dùng khác. Vui lòng tải lại trước khi duyệt.');
      }
    }

    // 2. Resolve current workflow state
    const stateInfo = await this.getState(item, targetLang, version);
    if (!stateInfo || !stateInfo.state) {
      throw new ValidationError('Item không thuộc quy trình phê duyệt (Workflow) nào.');
    }

    const { workflow, state: fromState } = stateInfo;

    // 3. Find target command
    const cmd = fromState.commands?.find(
      (c) => c._id.toString() === commandIdOrName.toString() || c.name.toLowerCase() === commandIdOrName.toString().toLowerCase()
    );
    if (!cmd) {
      throw new ValidationError(`Lệnh duyệt "${commandIdOrName}" không hợp lệ cho trạng thái hiện tại (${fromState.name}).`);
    }

    // 4. Permission Check via canPerform (DEC-039)
    const itemService = require('./itemService');
    const isAllowed = await itemService.canPerform(user, item, `workflow:execute:${cmd.name}`);
    if (!isAllowed) {
      throw new ForbiddenError(`Bạn không có quyền thực hiện lệnh "${cmd.displayName || cmd.name}".`);
    }

    // 5. Require comment check
    if (cmd.requireComment && (!comment || !comment.trim())) {
      throw new ValidationError(`Lệnh "${cmd.displayName || cmd.name}" bắt buộc phải nhập lý do/ghi chú (Comment).`);
    }

    // 6. Find target state
    const toState = workflow.states.find((s) => s._id.toString() === cmd.targetStateId.toString());
    if (!toState) {
      throw new ValidationError('Không tìm thấy trạng thái đích cho lệnh này.');
    }

    // 7. Ensure language and version entry exist before executing actions
    let langEntry = item.getLanguage(lang);
    if (!langEntry) {
      item.languages.push({
        code: lang,
        unversionedFields: new Map(),
        versions: [{
          version: parseInt(version, 10) || 1,
          fields: new Map(),
          workflowState: fromState._id,
          createdBy: user._id,
          updatedBy: user._id,
        }],
      });
      langEntry = item.getLanguage(lang);
    }

    let ver = langEntry.versions.find((v) => v.version === parseInt(version, 10));
    if (!ver) {
      langEntry.versions.push({
        version: parseInt(version, 10) || 1,
        fields: new Map(),
        workflowState: fromState._id,
        createdBy: user._id,
        updatedBy: user._id,
      });
      ver = langEntry.versions.find((v) => v.version === parseInt(version, 10));
    }

    // 8. Execute pre-transition actions (e.g. validate)
    if (Array.isArray(cmd.actions)) {
      for (const act of cmd.actions) {
        const handler = this.actionRegistry.get(act.actionType);
        if (handler && act.actionType === 'validate') {
          await handler({ item, lang, version, user, command: cmd, targetState: toState, action: act });
        }
      }
    }

    // 9. Atomically update item's version workflowState
    ver.workflowState = toState._id;
    ver.updatedBy = user._id;
    ver.updatedAt = new Date();

    item.updatedBy = user._id;
    item.updatedAt = new Date();
    await item.save();

    // 9. Record Workflow History
    const historyRecord = await WorkflowHistory.create({
      itemId: item._id,
      lang,
      version: parseInt(version, 10),
      fromState: { _id: fromState._id, name: fromState.name, displayName: fromState.displayName },
      toState: { _id: toState._id, name: toState.name, displayName: toState.displayName },
      command: { _id: cmd._id, name: cmd.name, displayName: cmd.displayName },
      comment: (comment || '').trim(),
      user: user._id,
      username: user.username || user.fullName || 'User',
      at: new Date(),
    });

    // 10. Execute post-transition actions (e.g. autoPublish, notify)
    if (Array.isArray(cmd.actions)) {
      for (const act of cmd.actions) {
        const handler = this.actionRegistry.get(act.actionType);
        if (handler && act.actionType !== 'validate') {
          await handler({ item, lang, version, user, command: cmd, targetState: toState, action: act });
        }
      }
    }

    // Emit internal event
    eventBus.emit('workflow.executed', {
      itemId: item._id,
      path: item.path,
      lang,
      version: parseInt(version, 10),
      fromState,
      toState,
      command: cmd,
      comment,
      user,
      historyId: historyRecord._id,
    });

    return {
      success: true,
      itemId: item._id,
      path: item.path,
      lang,
      version: parseInt(version, 10),
      fromState: fromState.name,
      toState: toState.name,
      toStateDisplayName: toState.displayName || toState.name,
      command: cmd.name,
      updatedAt: item.updatedAt,
      history: historyRecord,
    };
  }

  /**
   * Reset workflow state back to initial state when an approved/final item is edited
   * (Per DEC-039 / Phase 8 rules: Web preserves previously published version until re-approved)
   */
  async handleItemEdited(itemOrDoc, lang = null, version = 1, user = null) {
    let item = itemOrDoc;
    if (item && !item.save && item._id) {
      item = await Item.findById(item._id);
    }
    if (!item) return;

    const defaultLang = await languageService.getDefault();
    const targetLang = lang || defaultLang.code;

    const stateInfo = await this.getState(item, targetLang, version);
    if (!stateInfo || !stateInfo.state) return;

    if (stateInfo.isFinal) {
      const initState = stateInfo.workflow.states.find((s) => s.isInitial) || stateInfo.workflow.states[0];
      if (initState && initState._id.toString() !== stateInfo.state._id.toString()) {
        const ver = getItemVersion(item, targetLang, version);
        if (ver) {
          ver.workflowState = initState._id;
          await item.save();

          await WorkflowHistory.create({
            itemId: item._id,
            lang,
            version: parseInt(version, 10),
            fromState: { _id: stateInfo.state._id, name: stateInfo.state.name },
            toState: { _id: initState._id, name: initState.name },
            command: 'System: Auto-Reset on Edit',
            comment: 'Nội dung đã duyệt được chỉnh sửa lại -> chuyển về Bản nháp',
            user: user?._id || null,
            username: user?.username || 'system',
            at: new Date(),
          });

          logger.info(`Item ${item._id} (${lang} v${version}) was in Final state. Reset to initial state "${initState.name}".`);
        }
      }
    }
  }

  /**
   * Get workflow history for an item
   */
  async getHistory(itemId, lang = null, version = null) {
    if (!itemId) return [];
    const query = { itemId };
    if (lang) query.lang = lang;
    if (version) query.version = parseInt(version, 10);

    return WorkflowHistory.find(query)
      .sort({ at: -1 })
      .populate('user', 'username fullName avatar')
      .lean();
  }

  /**
   * Get items waiting in a specific workflow state
   */
  async getItemsByState(stateId, _options = {}) {
    if (!stateId) return [];
    const sId = mongoose.Types.ObjectId.isValid(stateId) ? new mongoose.Types.ObjectId(stateId) : stateId;

    const items = await Item.find({
      'languages.versions.workflowState': sId,
      deleted: { $ne: true },
      isDeleted: { $ne: true },
    })
      .populate('templateId', 'name displayName icon')
      .populate('updatedBy', 'username fullName')
      .sort({ updatedAt: -1 })
      .lean();

    // Flatten to item version entries
    const results = [];
    for (const it of items) {
      if (Array.isArray(it.languages)) {
        for (const l of it.languages) {
          if (Array.isArray(l.versions)) {
            for (const v of l.versions) {
              if (v.workflowState && v.workflowState.toString() === sId.toString()) {
                results.push({
                  item: it,
                  itemId: it._id,
                  name: it.name,
                  displayName: it.displayName || it.name,
                  path: it.path,
                  template: it.templateId,
                  lang: l.code,
                  version: v.version,
                  workflowStateId: v.workflowState,
                  updatedAt: v.updatedAt || it.updatedAt,
                  updatedBy: v.updatedBy || it.updatedBy,
                  note: v.note || '',
                });
              }
            }
          }
        }
      }
    }

    return results;
  }
}

module.exports = new WorkflowService();
