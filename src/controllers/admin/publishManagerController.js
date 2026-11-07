const PublishJob = require('../../models/PublishJob');
const PublishHistory = require('../../models/PublishHistory');
const publishService = require('../../services/publishService');
const itemService = require('../../services/itemService');
const logger = require('../../utils/logger');

const publishManagerController = {
  /**
   * Render Publish Manager Dashboard
   * GET /admin/publish-manager
   */
  async renderManager(req, res, next) {
    try {
      if (!itemService.canPerform(req.user, null, 'publish:manage')) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền truy cập trang Quản lý Xuất bản (cần quyền publish:manage).',
          currentPath: req.originalUrl,
          activeApp: 'publish-manager',
          user: req.user,
        });
      }

      // Fetch active jobs and recent histories
      const activeJobs = await PublishJob.find({
        status: { $in: ['Pending', 'Processing'] },
      })
        .sort({ createdAt: -1 })
        .lean();

      const histories = await PublishHistory.find({})
        .sort({ startedAt: -1 })
        .limit(20)
        .populate('publishedBy', 'username fullName')
        .populate('rootItemId', 'name path')
        .lean();

      res.render('admin/publish/manager', {
        title: 'Publish Manager - Quản lý Xuất bản',
        layout: 'layouts/shell',
        activeApp: 'publish-manager',
        user: req.user,
        activeJobs,
        histories,
        csrfToken: req.session?.csrfToken || res.locals?.csrfToken || (req.csrfToken ? req.csrfToken() : ''),
      });
    } catch (err) {
      logger.error(`[PublishManagerController] Error: ${err.message}`, err);
      next(err);
    }
  },

  /**
   * API: Trigger or Queue a Publish Job
   * POST /api/publish
   */
  async triggerPublish(req, res, next) {
    try {
      const { mode, rootItemId, includeSubitems, includeRelated, languages } = req.body;

      if (mode === 'Site') {
        if (!itemService.canPerform(req.user, null, 'publish:manage')) {
          return res.status(403).json({ success: false, message: 'Yêu cầu quyền publish:manage để xuất bản toàn bộ Site.' });
        }
      } else {
        if (!itemService.canPerform(req.user, null, 'item:publish')) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền item:publish.' });
        }
      }

      const job = await publishService.queuePublishJob(
        {
          mode: mode || 'Item',
          rootItemId: rootItemId || null,
          includeSubitems: includeSubitems !== false,
          includeRelated: includeRelated !== false,
          languages: Array.isArray(languages) && languages.length > 0 ? languages : ['vi'],
        },
        req.user
      );

      res.json({
        success: true,
        message: 'Tác vụ xuất bản đã được thêm vào hàng đợi.',
        jobId: job._id,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: Preflight check
   * GET /api/publish/preflight
   */
  async preflightCheck(req, res, next) {
    try {
      const { rootItemId, includeSubitems, lang } = req.query;
      if (!rootItemId) {
        return res.status(400).json({ success: false, message: 'rootItemId is required' });
      }

      const result = await publishService.preflightCheck(rootItemId, {
        includeSubitems: includeSubitems === 'true' || includeSubitems === true,
        lang: lang || 'vi',
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: List publish jobs
   * GET /api/publish/jobs
   */
  async listJobs(req, res, next) {
    try {
      const jobs = await PublishJob.find({}).sort({ createdAt: -1 }).limit(30).lean();
      res.json({ success: true, data: jobs });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: Get single publish job status
   * GET /api/publish/jobs/:id
   */
  async getJob(req, res, next) {
    try {
      const job = await PublishJob.findById(req.params.id).lean();
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: Cancel a pending job
   * POST /api/publish/jobs/:id/cancel
   */
  async cancelJob(req, res, next) {
    try {
      const job = await PublishJob.findById(req.params.id);
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      if (job.status === 'Pending') {
        job.status = 'Cancelled';
        job.cancelled = true;
        await job.save();
        return res.json({ success: true, message: 'Đã hủy tác vụ xuất bản thành công.' });
      }

      res.status(400).json({ success: false, message: 'Không thể hủy tác vụ đang xử lý hoặc đã hoàn tất.' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * API: List publish history
   * GET /api/publish/history
   */
  async listHistory(req, res, next) {
    try {
      const histories = await PublishHistory.find({})
        .sort({ startedAt: -1 })
        .limit(50)
        .populate('publishedBy', 'username fullName')
        .populate('rootItemId', 'name path')
        .lean();
      res.json({ success: true, data: histories });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = publishManagerController;
