const mongoose = require('mongoose');
const Item = require('../models/Item');
const PublishedItem = require('../models/PublishedItem');
const Template = require('../models/Template');
const branding = require('../config/branding');
const logger = require('../utils/logger');

/**
 * Reference Service (GĐ 9 / DEC-044)
 * Single source of truth for reference integrity & dependency discovery across the CMS.
 */
class ReferenceService {
  /**
   * Check if a path is a protected system node
   * @param {string} path
   * @returns {boolean}
   */
  isProtectedPath(path) {
    if (!path) return false;
    const clean = path.trim().toLowerCase();
    const root = branding.PATHS.ROOT.toLowerCase();
    const content = branding.PATHS.CONTENT.toLowerCase();
    const media = branding.PATHS.MEDIA.toLowerCase();
    const templates = branding.PATHS.TEMPLATES.toLowerCase();
    const system = branding.PATHS.SYSTEM.toLowerCase();
    const layout = branding.PATHS.LAYOUT.toLowerCase();

    return (
      clean === root ||
      clean === content ||
      clean === media ||
      clean === templates ||
      clean === system ||
      clean === layout
    );
  }

  /**
   * Find all incoming references to an item (or all items in its subtree)
   * @param {string|Object} itemOrId - Target item doc, plain object, or ObjectId
   * @param {Object} [options]
   * @returns {Promise<Object>} Reference analysis result
   */
  async findReferences(itemOrId, _options = {}) {
    const references = [];

    // 1. Resolve Target Item
    let item = null;
    if (itemOrId && typeof itemOrId === 'object' && itemOrId._id) {
      item = itemOrId;
    } else if (itemOrId) {
      item = await Item.findById(itemOrId).lean();
    }

    if (!item) {
      return {
        canDelete: true,
        hasWarnings: false,
        blockingCount: 0,
        warningCount: 0,
        references: [],
      };
    }

    const itemIdStr = item._id.toString();

    // 2. Fetch all descendants in the branch
    const descendants = await Item.find({
      ancestors: item._id,
      deleted: false,
    })
      .select('_id name displayName path templateId sharedFields')
      .lean();

    const allTargets = [item, ...descendants];
    const targetIdMap = new Map();
    allTargets.forEach((t) => {
      targetIdMap.set(t._id.toString(), t);
    });
    const targetIdList = Array.from(targetIdMap.keys()).map((id) => new mongoose.Types.ObjectId(id));

    // 3. System Node Protection
    for (const target of allTargets) {
      if (this.isProtectedPath(target.path)) {
        references.push({
          targetId: target._id.toString(),
          targetName: target.displayName || target.name,
          targetPath: target.path,
          sourceId: null,
          sourceName: 'System Core',
          sourcePath: target.path,
          sourceType: 'System',
          referenceType: 'SYSTEM_NODE',
          severity: 'BLOCK',
          description: `Node hệ thống '${target.path}' được bảo vệ tuyệt đối, không thể xoá.`,
        });
      }
    }

    // 4. System Template Protection
    const templatesInBranch = await Template.find({
      _id: { $in: targetIdList },
    }).lean();

    for (const tpl of templatesInBranch) {
      if (tpl.isSystem) {
        references.push({
          targetId: tpl._id.toString(),
          targetName: tpl.displayName || tpl.name,
          targetPath: tpl.path || '',
          sourceId: null,
          sourceName: 'System Core',
          sourcePath: tpl.path || '',
          sourceType: 'Template',
          referenceType: 'SYSTEM_TEMPLATE',
          severity: 'BLOCK',
          description: `Template hệ thống '${tpl.name}' được bảo vệ, không thể xoá.`,
        });
      }
    }

    // 5. Layout & Rendering Presentation References (In Templates)
    const tplPresentationRefs = await Template.find({
      _id: { $nin: targetIdList },
      $or: [
        { 'presentation.layoutId': { $in: targetIdList } },
        { 'presentation.renderings.renderingId': { $in: targetIdList } },
      ],
    })
      .select('_id name displayName path presentation')
      .lean();

    tplPresentationRefs.forEach((tpl) => {
      const layoutIdStr = tpl.presentation?.layoutId?.toString();
      if (layoutIdStr && targetIdMap.has(layoutIdStr)) {
        const target = targetIdMap.get(layoutIdStr);
        references.push({
          targetId: layoutIdStr,
          targetName: target.displayName || target.name,
          targetPath: target.path,
          sourceId: tpl._id.toString(),
          sourceName: tpl.displayName || tpl.name,
          sourcePath: tpl.path || `/root/templates/${tpl.name}`,
          sourceType: 'Template',
          referenceType: 'LAYOUT',
          severity: 'BLOCK',
          description: `Layout đang được sử dụng trong Standard Presentation của Template '${tpl.displayName || tpl.name}'.`,
        });
      }

      if (Array.isArray(tpl.presentation?.renderings)) {
        tpl.presentation.renderings.forEach((r) => {
          const rIdStr = r.renderingId?.toString();
          if (rIdStr && targetIdMap.has(rIdStr)) {
            const target = targetIdMap.get(rIdStr);
            references.push({
              targetId: rIdStr,
              targetName: target.displayName || target.name,
              targetPath: target.path,
              sourceId: tpl._id.toString(),
              sourceName: tpl.displayName || tpl.name,
              sourcePath: tpl.path || `/root/templates/${tpl.name}`,
              sourceType: 'Template',
              referenceType: 'RENDERING',
              severity: 'BLOCK',
              description: `Rendering đang được sử dụng trong Standard Presentation của Template '${tpl.displayName || tpl.name}' tại placeholder '${r.placeholder || r.placeholderKey}'.`,
            });
          }
        });
      }
    });

    // 6. Layout & Rendering Presentation References (In Master Items outside the branch)
    const itemPresentationRefs = await Item.find({
      _id: { $nin: targetIdList },
      deleted: false,
      $or: [
        { 'presentation.shared.layoutId': { $in: targetIdList } },
        { 'presentation.shared.renderings.renderingId': { $in: targetIdList } },
        { 'presentation.final.layoutId': { $in: targetIdList } },
        { 'presentation.final.renderings.renderingId': { $in: targetIdList } },
      ],
    })
      .select('_id name displayName path presentation')
      .lean();

    itemPresentationRefs.forEach((it) => {
      // Check shared layout
      const sLayoutId = it.presentation?.shared?.layoutId?.toString();
      if (sLayoutId && targetIdMap.has(sLayoutId)) {
        const target = targetIdMap.get(sLayoutId);
        references.push({
          targetId: sLayoutId,
          targetName: target.displayName || target.name,
          targetPath: target.path,
          sourceId: it._id.toString(),
          sourceName: it.displayName || it.name,
          sourcePath: it.path,
          sourceType: 'Item',
          referenceType: 'LAYOUT',
          severity: 'BLOCK',
          description: `Layout đang được cấu hình trong Shared Presentation của item '${it.path}'.`,
        });
      }

      // Check shared renderings
      if (Array.isArray(it.presentation?.shared?.renderings)) {
        it.presentation.shared.renderings.forEach((r) => {
          const rIdStr = r.renderingId?.toString();
          if (rIdStr && targetIdMap.has(rIdStr)) {
            const target = targetIdMap.get(rIdStr);
            references.push({
              targetId: rIdStr,
              targetName: target.displayName || target.name,
              targetPath: target.path,
              sourceId: it._id.toString(),
              sourceName: it.displayName || it.name,
              sourcePath: it.path,
              sourceType: 'Item',
              referenceType: 'RENDERING',
              severity: 'BLOCK',
              description: `Rendering đang được cấu hình trong Shared Presentation của item '${it.path}'.`,
            });
          }
        });
      }

      // Check final layout & renderings
      if (Array.isArray(it.presentation?.final)) {
        it.presentation.final.forEach((f) => {
          const fLayoutId = f.layoutId?.toString();
          if (fLayoutId && targetIdMap.has(fLayoutId)) {
            const target = targetIdMap.get(fLayoutId);
            references.push({
              targetId: fLayoutId,
              targetName: target.displayName || target.name,
              targetPath: target.path,
              sourceId: it._id.toString(),
              sourceName: it.displayName || it.name,
              sourcePath: it.path,
              sourceType: 'Item',
              referenceType: 'LAYOUT',
              severity: 'BLOCK',
              description: `Layout đang được sử dụng trong Final Presentation (${f.language || 'vi'} v${f.version || 1}) của item '${it.path}'.`,
            });
          }

          if (Array.isArray(f.renderings)) {
            f.renderings.forEach((r) => {
              const rIdStr = r.renderingId?.toString();
              if (rIdStr && targetIdMap.has(rIdStr)) {
                const target = targetIdMap.get(rIdStr);
                references.push({
                  targetId: rIdStr,
                  targetName: target.displayName || target.name,
                  targetPath: target.path,
                  sourceId: it._id.toString(),
                  sourceName: it.displayName || it.name,
                  sourcePath: it.path,
                  sourceType: 'Item',
                  referenceType: 'RENDERING',
                  severity: 'BLOCK',
                  description: `Rendering đang được cấu hình trong Final Presentation (${f.language || 'vi'} v${f.version || 1}) của item '${it.path}'.`,
                });
              }
            });
          }
        });
      }
    });

    // 7. Component Template References (Renderings pointing to this template)
    const renderingCompRefs = await Item.find({
      _id: { $nin: targetIdList },
      deleted: false,
      $or: [
        { 'fields.componentTemplate': { $in: targetIdList } },
        { 'sharedFields.componentTemplate': { $in: targetIdList } },
      ],
    })
      .select('_id name displayName path fields sharedFields')
      .lean();

    renderingCompRefs.forEach((r) => {
      const compId = (r.sharedFields?.componentTemplate || r.fields?.componentTemplate)?.toString();
      if (compId && targetIdMap.has(compId)) {
        const target = targetIdMap.get(compId);
        references.push({
          targetId: compId,
          targetName: target.displayName || target.name,
          targetPath: target.path,
          sourceId: r._id.toString(),
          sourceName: r.displayName || r.name,
          sourcePath: r.path,
          sourceType: 'Item',
          referenceType: 'COMPONENT_TEMPLATE',
          severity: 'BLOCK',
          description: `Template được Rendering '${r.name}' sử dụng làm componentTemplate.`,
        });
      }
    });

    // 8. Base Template References & Template Instantiation
    const baseTplRefs = await Template.find({
      _id: { $nin: targetIdList },
      baseTemplates: { $in: targetIdList },
    })
      .select('_id name displayName path')
      .lean();

    baseTplRefs.forEach((tpl) => {
      references.push({
        targetId: itemIdStr,
        targetName: item.displayName || item.name,
        targetPath: item.path,
        sourceId: tpl._id.toString(),
        sourceName: tpl.displayName || tpl.name,
        sourcePath: tpl.path || `/root/templates/${tpl.name}`,
        sourceType: 'Template',
        referenceType: 'BASE_TEMPLATE',
        severity: 'BLOCK',
        description: `Template '${tpl.name}' kế thừa từ template này qua baseTemplates.`,
      });
    });

    const itemInstanceRefs = await Item.find({
      _id: { $nin: targetIdList },
      templateId: { $in: targetIdList },
      deleted: false,
    })
      .select('_id name displayName path')
      .limit(20)
      .lean();

    itemInstanceRefs.forEach((it) => {
      references.push({
        targetId: itemIdStr,
        targetName: item.displayName || item.name,
        targetPath: item.path,
        sourceId: it._id.toString(),
        sourceName: it.displayName || it.name,
        sourcePath: it.path,
        sourceType: 'Item',
        referenceType: 'TEMPLATE_INSTANCE',
        severity: 'BLOCK',
        description: `Item '${it.path}' đang được khởi tạo từ template này.`,
      });
    });

    // 9. Datasource References (In Shared & Final Presentations)
    const datasourceRefs = await Item.find({
      _id: { $nin: targetIdList },
      deleted: false,
      $or: [
        { 'presentation.shared.renderings.datasourceId': { $in: targetIdList } },
        { 'presentation.final.renderings.datasourceId': { $in: targetIdList } },
      ],
    })
      .select('_id name displayName path presentation')
      .lean();

    datasourceRefs.forEach((it) => {
      references.push({
        targetId: itemIdStr,
        targetName: item.displayName || item.name,
        targetPath: item.path,
        sourceId: it._id.toString(),
        sourceName: it.displayName || it.name,
        sourcePath: it.path,
        sourceType: 'Item',
        referenceType: 'DATASOURCE',
        severity: 'WARN',
        description: `Item được gán làm Datasource cho rendering trong trang '${it.path}'.`,
      });
    });

    // 10. Media & Rich Text References (Images, data-media-id, data-item-id)
    const publicIds = [];
    allTargets.forEach((t) => {
      const pubId = t.sharedFields?.publicId || t.fields?.publicId;
      if (pubId) publicIds.push(pubId);
    });

    try {
      const idStrings = targetIdList.map((tId) => tId.toString());
      const rawMatches = await Item.collection
        .find(
          {
            _id: { $nin: targetIdList },
            deleted: false,
          },
          { projection: { _id: 1, name: 1, displayName: 1, path: 1, languages: 1, sharedFields: 1 } }
        )
        .limit(100)
        .toArray();

      for (const doc of rawMatches) {
        const rawJson = JSON.stringify(doc);
        const hasRef =
          idStrings.some((idStr) => rawJson.includes(idStr)) ||
          (publicIds.length > 0 && publicIds.some((pId) => rawJson.includes(pId)));

        if (hasRef) {
          references.push({
            targetId: itemIdStr,
            targetName: item.displayName || item.name,
            targetPath: item.path,
            sourceId: doc._id.toString(),
            sourceName: doc.displayName || doc.name,
            sourcePath: doc.path,
            sourceType: 'Item',
            referenceType: 'INTERNAL_LINK',
            severity: 'WARN',
            description: `Trang '${doc.path}' có chứa liên kết nội bộ hoặc hình ảnh trỏ tới item này.`,
          });
          if (references.filter((r) => r.referenceType === 'INTERNAL_LINK').length >= 10) break;
        }
      }
    } catch (rawErr) {
      logger.debug(`Internal link detection fallback: ${rawErr.message}`);
    }

    // 11. Public Web Store Presence (PublishedItem)
    const webItems = await PublishedItem.find({
      _id: { $in: targetIdList },
    })
      .select('_id path')
      .lean();

    if (webItems.length > 0) {
      references.push({
        targetId: itemIdStr,
        targetName: item.displayName || item.name,
        targetPath: item.path,
        sourceId: null,
        sourceName: 'Web Delivery Store',
        sourcePath: item.path,
        sourceType: 'WebItem',
        referenceType: 'WEB_PUBLISHED',
        severity: 'WARN',
        description: `Item (hoặc nhánh con) đang tồn tại trên Web công khai (${webItems.length} trang). Xóa Master sẽ không tự xóa trên Web cho đến lần publish tiếp theo hoặc khi purge.`,
      });
    }

    references.forEach((r) => {
      if (!r.message) r.message = r.description;
    });

    const blockingCount = references.filter((r) => r.severity === 'BLOCK').length;
    const warningCount = references.filter((r) => r.severity === 'WARN').length;

    return {
      canDelete: blockingCount === 0,
      hasWarnings: warningCount > 0,
      blockingCount,
      warningCount,
      references,
    };
  }
}

const referenceService = new ReferenceService();
module.exports = referenceService;
