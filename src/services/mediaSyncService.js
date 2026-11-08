'use strict';

const Item = require('../models/Item');
const { ensureMediaTemplates, MEDIA_TEMPLATES } = require('./mediaTemplateService');
const { getStorageProvider } = require('./storage');
const mediaPathMapper = require('../utils/mediaPathMapper');
const logger = require('../utils/logger');
const branding = require('../config/branding');
const cloudinary = require('cloudinary').v2;

class MediaSyncService {
  /**
   * Quét toàn bộ tài nguyên trên Cloudinary thuộc thư mục AdminCMS và đồng bộ vào CMS Items
   * @param {Object} options
   * @param {boolean} [options.dryRun=false]
   * @param {string} [options.rootFolder='AdminCMS']
   * @param {number} [options.maxResults=100]
   * @param {string} [options.userId=null]
   * @returns {Promise<{ created: number, updated: number, missing: number, errors: Array }>}
   */
  async syncFromCloudinary({ dryRun = false, rootFolder = 'AdminCMS', maxResults = 100, userId = null } = {}) {
    logger.info(`[MediaSyncService] Starting sync from Cloudinary (rootFolder: ${rootFolder}, dryRun: ${dryRun})...`);

    const storageProvider = getStorageProvider();
    if (storageProvider.cloudName && storageProvider.apiKey && storageProvider.apiSecret) {
      cloudinary.config({
        cloud_name: storageProvider.cloudName,
        api_key: storageProvider.apiKey,
        api_secret: storageProvider.apiSecret,
        secure: true
      });
    }

    const templates = await ensureMediaTemplates();
    const mediaFolderTpl = templates[MEDIA_TEMPLATES.MEDIA_FOLDER];
    const imageTpl = templates[MEDIA_TEMPLATES.IMAGE];
    const fileTpl = templates[MEDIA_TEMPLATES.FILE];

    // 1. Đảm bảo thư mục gốc /root/media library tồn tại
    let rootItem = await Item.findOne({ path: { $in: [branding.PATHS.MEDIA, '/root/media library'] }, deleted: false });
    if (!rootItem) {
      if (!dryRun) {
        let rootNode = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/root'] }, deleted: false });
        if (!rootNode) {
          rootNode = await Item.create({
            name: branding.ROOT_NAME,
            displayName: branding.ROOT_NAME,
            path: branding.PATHS.ROOT,
            templateId: mediaFolderTpl._id,
            ancestors: [],
            fields: {},
            sharedFields: {}
          });
        }
        rootItem = await Item.create({
          name: 'media library',
          displayName: 'Media Library',
          path: branding.PATHS.MEDIA,
          templateId: mediaFolderTpl._id,
          parentId: rootNode._id,
          ancestors: [rootNode._id],
          fields: {},
          sharedFields: {}
        });
      }
    }

    const report = {
      created: 0,
      updated: 0,
      missing: 0,
      errors: [],
      itemsProcessed: []
    };

    // 2. Lấy danh sách tất cả tài nguyên từ Cloudinary (hỗ trợ cả Dynamic Folder Mode và Fixed Folder Mode)
    let nextCursor = null;
    const remoteAssets = [];

    try {
      if (cloudinary.search && typeof cloudinary.search.expression === 'function') {
        do {
          let searchReq = cloudinary.search
            .expression(`asset_folder:${rootFolder}* OR folder:${rootFolder}*`)
            .max_results(Math.min(maxResults, 100));

          if (nextCursor) {
            searchReq = searchReq.next_cursor(nextCursor);
          }

          const searchRes = await searchReq.execute();
          if (searchRes.resources && searchRes.resources.length > 0) {
            remoteAssets.push(...searchRes.resources);
          }
          nextCursor = searchRes.next_cursor || null;
        } while (nextCursor);
      } else {
        // Fallback sang resources API (thường dùng trong Unit test mock)
        do {
          const queryOptions = {
            type: 'upload',
            prefix: rootFolder,
            max_results: Math.min(maxResults, 100)
          };
          if (nextCursor) {
            queryOptions.next_cursor = nextCursor;
          }

          const res = await cloudinary.api.resources(queryOptions);
          if (res.resources && res.resources.length > 0) {
            remoteAssets.push(...res.resources);
          }
          nextCursor = res.next_cursor || null;
        } while (nextCursor);
      }

      logger.info(`[MediaSyncService] Retrieved ${remoteAssets.length} resources from Cloudinary.`);
    } catch (err) {
      logger.warn(`[MediaSyncService] Search API failed (${err.message}), trying resources API prefix fallback...`);
      try {
        const res = await cloudinary.api.resources({
          type: 'upload',
          prefix: rootFolder,
          max_results: Math.min(maxResults, 100)
        });
        if (res.resources && res.resources.length > 0) {
          remoteAssets.push(...res.resources);
        }
      } catch (fallbackErr) {
        logger.error(`[MediaSyncService] Failed to query Cloudinary resources: ${fallbackErr.message}`);
        report.errors.push(`Cloudinary API Error: ${fallbackErr.message}`);
        return report;
      }
    }

    const foundPublicIds = new Set();

    // 3. Xử lý từng remote asset
    for (const asset of remoteAssets) {
      try {
        foundPublicIds.add(asset.public_id);

        const mapped = mediaPathMapper.cloudinaryToItemPath({
          publicId: asset.public_id,
          assetFolder: asset.asset_folder || '',
          format: asset.format || '',
          resourceType: asset.resource_type || 'image',
          rootFolder
        });

        const isImage = (asset.resource_type === 'image') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes((asset.format || '').toLowerCase());
        const templateId = isImage ? imageTpl._id : fileTpl._id;

        // Đảm bảo các folder cha trong CMS tồn tại
        const folderSegments = mapped.itemPath
          .replace('/root/media library', '')
          .split('/')
          .filter(Boolean);
        folderSegments.pop(); // Bỏ phần tên item cuối cùng

        let currentParent = rootItem;
        if (!dryRun && rootItem) {
          let currentPath = '/root/media library';
          for (const seg of folderSegments) {
            currentPath = `${currentPath}/${seg}`;
            let folderItem = await Item.findOne({ path: currentPath, deleted: false });
            if (!folderItem) {
              folderItem = await Item.create({
                name: seg,
                displayName: seg.charAt(0).toUpperCase() + seg.slice(1),
                templateId: mediaFolderTpl._id,
                parentId: currentParent._id,
                ancestors: [...currentParent.ancestors, currentParent._id],
                path: currentPath,
                fields: {},
                sharedFields: {},
                createdBy: userId
              });
            }
            currentParent = folderItem;
          }
        }

        // Kiểm tra xem Item đã tồn tại chưa (theo path hoặc publicId)
        let item = await Item.findOne({
          $or: [
            { path: mapped.itemPath },
            { 'sharedFields.publicId': asset.public_id }
          ],
          deleted: false
        });

        const thumbUrl = storageProvider.getTransformationUrl
          ? storageProvider.getTransformationUrl(asset.public_id, 'thumb', asset.format, asset.version)
          : asset.secure_url;

        if (!item) {
          report.created += 1;
          report.itemsProcessed.push({ action: 'create', path: mapped.itemPath, publicId: asset.public_id });

          if (!dryRun && currentParent) {
            await Item.create({
              name: mapped.itemName,
              displayName: asset.display_name || (asset.format ? `${mapped.itemName}.${asset.format}` : mapped.itemName),
              templateId,
              parentId: currentParent._id,
              ancestors: [...currentParent.ancestors, currentParent._id],
              path: mapped.itemPath,
              fields: {},
              sharedFields: {
                publicId: asset.public_id,
                assetId: asset.asset_id || '',
                format: asset.format || '',
                extension: asset.format || '',
                secureUrl: asset.secure_url,
                thumbnailUrl: thumbUrl,
                version: asset.version || null,
                fileSize: asset.bytes || 0,
                width: asset.width || null,
                height: asset.height || null,
                checksum: '',
                resourceType: asset.resource_type || 'image',
                syncedAt: new Date()
              },
              languages: [
                {
                  code: 'vi',
                  unversionedFields: {},
                  versions: [
                    {
                      version: 1,
                      fields: {
                        altText: '',
                        title: asset.display_name || mapped.itemName,
                        description: ''
                      },
                      createdBy: userId
                    }
                  ]
                }
              ],
              createdBy: userId
            });
          }
        } else {
          // Cập nhật metadata nếu có thay đổi
          report.updated += 1;
          report.itemsProcessed.push({ action: 'update', path: mapped.itemPath, publicId: asset.public_id });

          if (!dryRun) {
            item.sharedFields = item.sharedFields || {};
            item.sharedFields.publicId = asset.public_id;
            item.sharedFields.secureUrl = asset.secure_url;
            item.sharedFields.thumbnailUrl = thumbUrl;
            if (asset.version) {
              item.sharedFields.version = asset.version;
            }
            item.sharedFields.fileSize = asset.bytes || item.sharedFields.fileSize;
            item.sharedFields.width = asset.width || item.sharedFields.width;
            item.sharedFields.height = asset.height || item.sharedFields.height;
            item.sharedFields.format = asset.format || item.sharedFields.format;
            item.sharedFields.extension = asset.format || item.sharedFields.extension;
            item.sharedFields.syncedAt = new Date();
            item.markModified('sharedFields');
            await item.save();
          }
        }
      } catch (err) {
        logger.error(`[MediaSyncService] Error processing asset ${asset.public_id}: ${err.message}`);
        report.errors.push(`Asset ${asset.public_id}: ${err.message}`);
      }
    }

    // 4. Kiểm tra các asset trên CMS bị mất file trên Cloudinary
    try {
      const existingMediaItems = await Item.find({
        path: { $regex: '^/root/media library/' },
        templateId: { $in: [imageTpl._id, fileTpl._id] },
        deleted: false
      }).lean();

      for (const mediaItem of existingMediaItems) {
        const pubId = mediaItem.sharedFields?.publicId;
        if (pubId && !foundPublicIds.has(pubId)) {
          report.missing += 1;
          report.itemsProcessed.push({ action: 'missing', path: mediaItem.path, publicId: pubId });
          if (!dryRun) {
            await Item.updateOne(
              { _id: mediaItem._id },
              { $set: { 'sharedFields.missingOnCloudinary': true } }
            );
          }
        }
      }
    } catch (err) {
      logger.warn(`[MediaSyncService] Error scanning missing assets: ${err.message}`);
    }

    logger.info(`[MediaSyncService] Completed sync: created=${report.created}, updated=${report.updated}, missing=${report.missing}`);
    return report;
  }

  /**
   * Đồng bộ từ CMS lên Cloudinary (Push direction: tạo folder còn thiếu trên Cloudinary, kiểm tra tính toàn vẹn asset)
   * @param {Object} options
   * @param {boolean} [options.dryRun=false]
   * @param {string} [options.rootFolder='AdminCMS']
   * @returns {Promise<{ foldersCreated: number, verified: number, missing: number, unlinked: number, errors: Array }>}
   */
  async syncToCloudinary({ dryRun = false, rootFolder = 'AdminCMS' } = {}) {
    logger.info(`[MediaSyncService] Starting sync to Cloudinary (rootFolder: ${rootFolder}, dryRun: ${dryRun})...`);

    const storageProvider = getStorageProvider();
    if (storageProvider.cloudName && storageProvider.apiKey && storageProvider.apiSecret) {
      cloudinary.config({
        cloud_name: storageProvider.cloudName,
        api_key: storageProvider.apiKey,
        api_secret: storageProvider.apiSecret,
        secure: true
      });
    }

    const templates = await ensureMediaTemplates();
    const mediaFolderTpl = templates[MEDIA_TEMPLATES.MEDIA_FOLDER];
    const imageTpl = templates[MEDIA_TEMPLATES.IMAGE];
    const fileTpl = templates[MEDIA_TEMPLATES.FILE];

    const report = {
      foldersCreated: 0,
      verified: 0,
      purged: 0,
      missing: 0,
      unlinked: 0,
      errors: [],
      itemsProcessed: []
    };

    // 1. Quét tất cả folder thuộc /root/media library để đảm bảo tồn tại trên Cloudinary
    try {
      const folderItems = await Item.find({
        path: { $regex: '^/root/media library' },
        templateId: mediaFolderTpl._id,
        deleted: false
      }).lean();

      for (const f of folderItems) {
        if (f.path === '/root/media library') continue;
        const { assetFolder } = mediaPathMapper.itemPathToCloudinary({ itemPath: f.path, rootFolder });
        if (assetFolder && !dryRun) {
          try {
            if (cloudinary.api && typeof cloudinary.api.create_folder === 'function') {
              await cloudinary.api.create_folder(assetFolder);
              report.foldersCreated += 1;
              report.itemsProcessed.push({ action: 'create_folder', path: f.path, assetFolder });
            }
          } catch (folderErr) {
            logger.debug(`[MediaSyncService] Folder create note: ${folderErr.message}`);
          }
        }
      }
    } catch (err) {
      logger.warn(`[MediaSyncService] Error checking folders on Cloudinary: ${err.message}`);
      report.errors.push(`Folder check error: ${err.message}`);
    }

    // 2. Quét tất cả media items (Image, File) để kiểm chứng tài nguyên trên Cloudinary
    try {
      const mediaItems = await Item.find({
        path: { $regex: '^/root/media library/' },
        templateId: { $in: [imageTpl._id, fileTpl._id] },
        deleted: false
      }).lean();

      for (const item of mediaItems) {
        const pubId = item.sharedFields?.publicId;
        if (!pubId) {
          report.unlinked += 1;
          report.itemsProcessed.push({ action: 'unlinked', path: item.path });
          continue;
        }

        try {
          if (cloudinary.api && typeof cloudinary.api.resource === 'function') {
            await cloudinary.api.resource(pubId);
            report.verified += 1;
            report.itemsProcessed.push({ action: 'verified', path: item.path, publicId: pubId });
            if (!dryRun) {
              await Item.updateOne(
                { _id: item._id },
                {
                  $set: {
                    'sharedFields.missingOnCloudinary': false,
                    'sharedFields.syncedAt': new Date()
                  }
                }
              );
            }
          } else {
            report.verified += 1;
          }
        } catch (resErr) {
          if (resErr && (resErr.http_code === 404 || resErr.message?.includes('not found') || resErr.message?.includes('404'))) {
            report.missing += 1;
            report.itemsProcessed.push({ action: 'missing', path: item.path, publicId: pubId });
            if (!dryRun) {
              await Item.updateOne(
                { _id: item._id },
                { $set: { 'sharedFields.missingOnCloudinary': true } }
              );
            }
          } else {
            report.errors.push(`Check error on ${item.path}: ${resErr.message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`[MediaSyncService] Error validating media items: ${err.message}`);
      report.errors.push(`Validation error: ${err.message}`);
    }

    // 3. Quét tài nguyên trên Cloudinary để dọn dẹp các ảnh đã bị xóa hoặc không còn tồn tại trên CMS (Orphaned Purge)
    try {
      let remoteAssets = [];
      let nextCursor = null;

      if (cloudinary.search && typeof cloudinary.search.expression === 'function') {
        do {
          let searchReq = cloudinary.search
            .expression(`asset_folder:${rootFolder}* OR folder:${rootFolder}*`)
            .max_results(100);
          if (nextCursor) searchReq = searchReq.next_cursor(nextCursor);
          const searchRes = await searchReq.execute();
          if (searchRes.resources && searchRes.resources.length > 0) {
            remoteAssets.push(...searchRes.resources);
          }
          nextCursor = searchRes.next_cursor || null;
        } while (nextCursor);
      } else if (cloudinary.api && typeof cloudinary.api.resources === 'function') {
        const res = await cloudinary.api.resources({ type: 'upload', prefix: rootFolder, max_results: 100 });
        if (res.resources) remoteAssets.push(...res.resources);
      }

      for (const asset of remoteAssets) {
        // Tìm xem trên CMS có item nào đang dùng public_id này và chưa bị xóa
        const activeItem = await Item.findOne({
          $or: [
            { 'sharedFields.publicId': asset.public_id },
            { name: asset.public_id }
          ],
          deleted: false
        }).lean();

        if (!activeItem) {
          // File này trên Cloudinary đã bị xóa trên CMS hoặc không còn tồn tại
          report.purged += 1;
          report.itemsProcessed.push({ action: 'purge_cloudinary', publicId: asset.public_id });
          if (!dryRun) {
            try {
              if (storageProvider.deleteFile) {
                await storageProvider.deleteFile(null, null, asset.public_id);
              } else if (cloudinary.uploader?.destroy) {
                await cloudinary.uploader.destroy(asset.public_id);
              }
              logger.info(`[MediaSyncService] Purged orphaned Cloudinary asset: ${asset.public_id}`);
            } catch (delErr) {
              logger.warn(`[MediaSyncService] Could not purge ${asset.public_id}: ${delErr.message}`);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`[MediaSyncService] Error during Cloudinary orphan purge: ${err.message}`);
    }

    logger.info(`[MediaSyncService] Push sync completed: foldersCreated=${report.foldersCreated}, verified=${report.verified}, purged=${report.purged}, missing=${report.missing}, unlinked=${report.unlinked}`);
    return report;
  }

  /**
   * Đồng bộ hai chiều toàn diện (PULL Cloudinary -> CMS rồi PUSH CMS -> Cloudinary)
   */
  async syncBoth({ dryRun = false, rootFolder = 'AdminCMS', maxResults = 100, userId = null } = {}) {
    logger.info(`[MediaSyncService] Starting two-way sync (direction: BOTH)...`);
    const pullReport = await this.syncFromCloudinary({ dryRun, rootFolder, maxResults, userId });
    const pushReport = await this.syncToCloudinary({ dryRun, rootFolder });

    return {
      direction: 'both',
      dryRun,
      pull: pullReport,
      push: pushReport,
      totalCreated: pullReport.created,
      totalUpdated: pullReport.updated,
      totalPurged: pushReport.purged,
      totalMissing: pullReport.missing + pushReport.missing,
      totalVerified: pushReport.verified,
      errors: [...pullReport.errors, ...pushReport.errors]
    };
  }
}

module.exports = new MediaSyncService();
