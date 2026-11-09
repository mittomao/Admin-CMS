'use strict';

/**
 * Recycle Bin Service (GĐ 9 / DEC-044)
 * Manages soft-deleted items, restoration to hierarchical tree,
 * and permanent purging with Web store & Cloudinary cleanup.
 */

const mongoose = require('mongoose');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const itemService = require('./itemService');
const referenceService = require('./referenceService');
const { getStorageProvider } = require('./storage');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

class RecycleBinService {
  /**
   * List soft-deleted items with pagination and filters
   */
  async list(options = {}) {
    const {
      deletedBy,
      from,
      to,
      templateId,
      q,
      page = 1,
      limit = 20,
      sort = 'deletedAt',
      sortDir = -1,
    } = options;

    const query = {
      $or: [{ deleted: true }, { isDeleted: true }],
    };

    if (deletedBy) {
      if (mongoose.Types.ObjectId.isValid(deletedBy)) {
        query.deletedBy = new mongoose.Types.ObjectId(deletedBy);
      }
    }

    if (templateId) {
      if (mongoose.Types.ObjectId.isValid(templateId)) {
        query.templateId = new mongoose.Types.ObjectId(templateId);
      }
    }

    if (from || to) {
      query.deletedAt = {};
      if (from) {
        query.deletedAt.$gte = new Date(from);
      }
      if (to) {
        query.deletedAt.$lte = new Date(to);
      }
    }

    if (q && typeof q === 'string' && q.trim()) {
      const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and = [
        {
          $or: [
            { name: searchRegex },
            { displayName: searchRegex },
            { deletedFromPath: searchRegex },
            { path: searchRegex },
          ],
        },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sort || 'deletedAt'] = sortDir === 1 || sortDir === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('deletedBy', 'username fullName email')
        .populate('templateId', 'name displayName icon')
        .lean(),
      Item.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get single deleted item with parent status and reference check
   */
  async getById(id) {
    const item = await Item.findOne({
      _id: id,
      $or: [{ deleted: true }, { isDeleted: true }],
    })
      .populate('deletedBy', 'username fullName email')
      .populate('templateId', 'name displayName icon')
      .lean();

    if (!item) {
      throw new NotFoundError('Item không tồn tại trong Thùng rác.');
    }

    let originalParent = null;
    const parentId = item.deletedFromParentId || item.parentId;
    if (parentId) {
      originalParent = await Item.findById(parentId).lean();
    }

    const parentStatus = {
      originalParentId: parentId || null,
      originalParentExists: Boolean(originalParent),
      originalParentName: originalParent ? (originalParent.displayName || originalParent.name) : null,
      isOriginalParentDeleted: originalParent ? Boolean(originalParent.deleted || originalParent.isDeleted) : true,
    };

    const refResult = await referenceService.findReferences(item, { includeDescendants: true });

    return {
      item,
      parentStatus,
      references: refResult,
    };
  }

  /**
   * Restore an item and its batch descendants
   */
  async restore(id, options = {}) {
    const userId = options.user?._id || options.user?.id || null;
    return itemService.restoreItem(id, userId, options);
  }

  /**
   * Permanently purge an item, its descendants, Web store and unreferenced Cloudinary media
   */
  async purge(id, options = {}) {
    const item = await Item.findOne({
      _id: id,
      $or: [{ deleted: true }, { isDeleted: true }],
    });

    if (!item) {
      throw new NotFoundError('Item không tồn tại trong Thùng rác.');
    }

    // 1. Gather all items in this branch / batch
    const allTargets = await Item.find({
      $and: [
        {
          $or: [
            { _id: item._id },
            { ancestors: item._id },
            ...(item.deletionBatchId ? [{ deletionBatchId: item.deletionBatchId }] : []),
          ],
        },
        { $or: [{ deleted: true }, { isDeleted: true }] },
      ],
    });

    const allIds = allTargets.map((t) => t._id);

    // 2. Reference integrity check: Make sure alive items outside recycle bin do not depend on this
    const refResult = await referenceService.findReferences(item, { includeDescendants: true });
    if (refResult.blockingCount > 0) {
      const messages = refResult.references
        .filter((r) => r.severity === 'BLOCK')
        .map((r) => r.message)
        .slice(0, 5);
      throw new ConflictError(
        `Không thể xoá vĩnh viễn: Có ${refResult.blockingCount} ràng buộc chặn xoá:\n- ${messages.join('\n- ')}`
      );
    }

    // 3. Clean up Web Store (items_web)
    await PublishedItem.deleteMany({ _id: { $in: allIds } });
    for (const targetId of allIds) {
      eventBus.emit('item.unpublished', {
        itemId: targetId,
        user: options.user,
        reason: 'Recycle Bin Purge',
      });
    }

    // 4. Clean up Cloudinary storage if no other item shares the publicId
    const storageProvider = getStorageProvider();
    for (const target of allTargets) {
      let publicId = target.fileDetails?.publicId || null;
      if (!publicId) {
        if (target.sharedFields instanceof Map) {
          publicId = target.sharedFields.get('publicId');
        } else if (target.sharedFields?.publicId) {
          publicId = target.sharedFields.publicId;
        }
      }
      if (!publicId) {
        if (target.fields instanceof Map) {
          publicId = target.fields.get('publicId');
        } else if (target.fields?.publicId) {
          publicId = target.fields.publicId;
        }
      }

      if (publicId && typeof publicId === 'string') {
        const otherCount = await Item.countDocuments({
          _id: { $nin: allIds },
          $or: [
            { 'sharedFields.publicId': publicId },
            { 'fields.publicId': publicId },
          ],
        });

        if (otherCount === 0) {
          try {
            await storageProvider.deleteFile(null, null, publicId);
            logger.info(`Đã dọn dẹp tài nguyên Cloudinary: ${publicId}`);
          } catch (cloudErr) {
            logger.warn(`Lỗi khi dọn dẹp Cloudinary publicId '${publicId}': ${cloudErr.message}`);
          }
        }
      }
    }

    // 5. Delete from Mongo Master Item and Template collections
    await Item.deleteMany({ _id: { $in: allIds } });
    await Template.deleteMany({ _id: { $in: allIds } });

    // 6. Emit item.purged event
    eventBus.emit('item.purged', {
      itemId: item._id,
      itemName: item.displayName || item.name,
      purgedIds: allIds,
      purgedCount: allIds.length,
      user: options.user,
      purgedAt: new Date(),
    });

    return {
      success: true,
      purgedId: item._id,
      purgedCount: allIds.length,
    };
  }

  /**
   * Purge all items in recycle bin (or matching filter)
   */
  async purgeAll(filter = {}, options = {}) {
    const deletedItems = await Item.find({
      $or: [{ deleted: true }, { isDeleted: true }],
      ...filter,
    }).lean();

    let totalPurged = 0;
    const processedIds = new Set();

    for (const item of deletedItems) {
      if (processedIds.has(item._id.toString())) {
        continue;
      }
      try {
        const result = await this.purge(item._id, options);
        totalPurged += result.purgedCount;
        (result.purgedIds || []).forEach((id) => processedIds.add(id.toString()));
      } catch (err) {
        logger.warn(`Không thể purge item ${item._id}: ${err.message}`);
      }
    }

    return {
      success: true,
      totalPurged,
    };
  }
}

module.exports = new RecycleBinService();
