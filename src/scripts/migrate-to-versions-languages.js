const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Language = require('../models/Language');
const Template = require('../models/Template');

const getMaskedUri = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '');

/**
 * Core migration function
 * @param {Object} options
 * @param {boolean} options.dryRun - When true, inspect and log without writing
 * @returns {Promise<{ itemsScanned: number, itemsUpdated: number, languagesCreated: number }>}
 */
async function migrateVersionsAndLanguages({ dryRun = false } = {}) {
  const result = {
    itemsScanned: 0,
    itemsUpdated: 0,
    languagesCreated: 0,
    dryRun,
  };

  logger.info(`=== MIGRATION GĐ 4: VERSION & LANGUAGES ===`);
  if (dryRun) {
    logger.warn('*** DRY RUN MODE: Không ghi vào Database ***');
  }

  // 1. Seed / Ensure default languages (en, vi)
  const defaultLanguages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      icon: 'ti ti-world',
      isDefault: true,
      active: true,
      sortOrder: 10,
    },
    {
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
      icon: 'ti ti-world',
      isDefault: false,
      active: true,
      sortOrder: 20,
    },
  ];

  for (const langData of defaultLanguages) {
    const existing = await Language.findOne({ code: langData.code });
    if (!existing) {
      if (!dryRun) {
        await Language.create(langData);
      }
      result.languagesCreated += 1;
      logger.info(`[Language] ${dryRun ? '[Dry-run] Would create' : 'Created'} default language: ${langData.code} (${langData.name})`);
    }
  }

  // 2. Load templates to understand field flags (isShared, isUnversioned)
  const templates = await Template.find().lean();
  const templateFieldFlags = new Map(); // fieldId -> { shared: bool, unversioned: bool }

  for (const tpl of templates) {
    if (tpl.sections) {
      for (const sec of tpl.sections) {
        if (sec.fields) {
          for (const f of sec.fields) {
            templateFieldFlags.set(f._id.toString(), {
              shared: !!f.shared,
              unversioned: !!f.unversioned,
            });
            // also map field name for legacy support
            templateFieldFlags.set(f.name, {
              shared: !!f.shared,
              unversioned: !!f.unversioned,
            });
          }
        }
      }
    }
  }

  // 3. Inspect items_master
  const items = await Item.find({});
  result.itemsScanned = items.length;
  logger.info(`Found ${items.length} items to inspect.`);

  for (const item of items) {
    let needsUpdate = false;
    const updatePayload = {};

    // 3.1 Check presentation placeholder (chừa sẵn schema cho GĐ 6)
    if (!item.presentation || !item.presentation.shared) {
      updatePayload.presentation = {
        shared: { devices: [] },
        final: [],
      };
      needsUpdate = true;
    }

    // 3.2 Check sharedFields
    if (!item.sharedFields) {
      updatePayload.sharedFields = new Map();
      needsUpdate = true;
    }

    // 3.3 Check languages & versions
    const hasLanguages = Array.isArray(item.languages) && item.languages.length > 0;
    if (!hasLanguages) {
      // Migrate legacy item.fields into en/version 1
      const rawLegacyFields = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields || {});

      const sharedMap = new Map();
      const unversionedMap = new Map();
      const versionedMap = new Map();

      for (const [key, val] of Object.entries(rawLegacyFields)) {
        const flags = templateFieldFlags.get(key) || { shared: false, unversioned: false };
        if (flags.shared) {
          sharedMap.set(key, val);
        } else if (flags.unversioned) {
          unversionedMap.set(key, val);
        } else {
          versionedMap.set(key, val);
        }
      }

      if (sharedMap.size > 0) {
        updatePayload.sharedFields = sharedMap;
      }

      updatePayload.languages = [
        {
          code: 'en',
          unversionedFields: unversionedMap,
          versions: [
            {
              version: 1,
              fields: versionedMap,
              createdBy: item.createdBy || null,
              createdAt: item.createdAt || new Date(),
              updatedBy: item.updatedBy || null,
              updatedAt: item.updatedAt || new Date(),
              note: 'Initial migrated version from GĐ 2/3',
            },
          ],
        },
      ];
      needsUpdate = true;
    }

    if (needsUpdate) {
      result.itemsUpdated += 1;
      if (!dryRun) {
        if (updatePayload.presentation) item.presentation = updatePayload.presentation;
        if (updatePayload.sharedFields) item.sharedFields = updatePayload.sharedFields;
        if (updatePayload.languages) item.languages = updatePayload.languages;
        await item.save();
      }
      logger.info(`[Item] ${dryRun ? '[Dry-run] Would update' : 'Updated'}: ${item.path} (${item._id})`);
    }
  }

  logger.info(`=== MIGRATION SUMMARY ===`);
  logger.info(`Items inspected: ${result.itemsScanned}`);
  logger.info(`Items needing update: ${result.itemsUpdated}`);
  logger.info(`Languages ensured/created: ${result.languagesCreated}`);
  logger.info(`Mode: ${dryRun ? 'DRY RUN (no database changes)' : 'APPLIED SUCCESSFULLY'}`);

  return result;
}

// Direct execution from CLI
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');

  (async () => {
    try {
      logger.info(`Connecting to MongoDB... [${getMaskedUri(env.MONGO_URI)}]`);
      await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
      logger.info('Connected.');

      await migrateVersionsAndLanguages({ dryRun: isDryRun });

      await mongoose.disconnect();
      logger.info('Migration finished successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Migration failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  migrateVersionsAndLanguages,
};
