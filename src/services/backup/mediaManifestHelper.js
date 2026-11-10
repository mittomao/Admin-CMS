const Item = require('../../models/Item');
const logger = require('../../utils/logger');

class MediaManifestHelper {
  /**
   * Extract media manifest from Master database
   */
  static async extractMediaManifest() {
    try {
      const items = await Item.find({
        $or: [
          { 'sharedFields.publicId': { $exists: true, $ne: '' } },
          { 'fields.publicId': { $exists: true, $ne: '' } },
        ],
        isDeleted: { $ne: true },
        deleted: { $ne: true },
      }).lean();

      const manifestEntries = [];

      for (const item of items) {
        const sf = item.sharedFields instanceof Map ? Object.fromEntries(item.sharedFields) : (item.sharedFields || {});
        const f = item.fields instanceof Map ? Object.fromEntries(item.fields) : (item.fields || {});

        const publicId = sf.publicId || f.publicId;
        if (!publicId) continue;

        manifestEntries.push({
          itemId: item._id.toString(),
          name: item.name,
          path: item.path,
          publicId,
          assetId: sf.assetId || f.assetId || '',
          format: sf.format || f.format || '',
          bytes: sf.fileSize || f.fileSize || 0,
          width: sf.width || f.width || null,
          height: sf.height || f.height || null,
          url: sf.secureUrl || f.secureUrl || '',
          checksum: sf.checksum || f.checksum || '',
        });
      }

      logger.info(`[MediaManifestHelper] Extracted ${manifestEntries.length} media assets into manifest`);
      return {
        totalAssets: manifestEntries.length,
        extractedAt: new Date().toISOString(),
        assets: manifestEntries,
      };
    } catch (err) {
      logger.error(`[MediaManifestHelper] Failed to extract media manifest: ${err.message}`, err);
      return {
        totalAssets: 0,
        extractedAt: new Date().toISOString(),
        assets: [],
        error: err.message,
      };
    }
  }

  /**
   * Verify media manifest against Cloudinary or database items after restore
   * Reports any missing assets without throwing
   */
  static async verifyMediaManifest(manifest, storageProvider = null) {
    if (!manifest || !Array.isArray(manifest.assets)) {
      return { total: 0, missing: [], present: 0 };
    }

    const missing = [];
    let present = 0;

    for (const asset of manifest.assets) {
      if (storageProvider && typeof storageProvider.getFileDetails === 'function') {
        try {
          const details = await storageProvider.getFileDetails(asset.publicId);
          if (details && details.publicId) {
            present++;
          } else {
            missing.push(asset);
          }
        } catch {
          missing.push(asset);
        }
      } else {
        // Fallback: check if Item still exists in DB
        const exists = await Item.exists({ _id: asset.itemId });
        if (exists) {
          present++;
        } else {
          missing.push(asset);
        }
      }
    }

    return {
      total: manifest.assets.length,
      present,
      missingCount: missing.length,
      missing,
    };
  }
}

module.exports = MediaManifestHelper;

