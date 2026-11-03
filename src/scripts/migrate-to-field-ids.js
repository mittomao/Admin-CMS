const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Item = require('../models/Item');
const Template = require('../models/Template');

const getMaskedUri = (uri) => (uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : '');

const isObjectId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);

const runMigration = async () => {
  try {
    logger.info(`Starting migration to Field IDs... [${getMaskedUri(env.MONGO_URI)}]`);
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    logger.info('Connected to MongoDB.');

    // 1. Load all templates and map templateId -> Map(fieldName -> fieldId)
    const templates = await Template.find().lean();
    const templateFieldMap = new Map();

    for (const tpl of templates) {
      const fieldMap = new Map();
      if (tpl.sections) {
        for (const sec of tpl.sections) {
          if (sec.fields) {
            for (const f of sec.fields) {
              fieldMap.set(f.name, f._id.toString());
            }
          }
        }
      }
      templateFieldMap.set(tpl._id.toString(), fieldMap);
    }

    // 2. Scan all items
    const items = await Item.find({});
    logger.info(`Found ${items.length} items to inspect.`);

    let migratedCount = 0;

    for (const item of items) {
      if (!item.fields) continue;

      const rawFields = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields || {});

      const fieldMap = templateFieldMap.get(item.templateId.toString());
      if (!fieldMap) continue;

      let hasChanges = false;
      const updatedFields = { ...rawFields };

      for (const [key, val] of Object.entries(rawFields)) {
        if (!isObjectId(key) && fieldMap.has(key)) {
          const fieldId = fieldMap.get(key);
          // If the fieldId key does not exist yet, migrate it
          if (updatedFields[fieldId] === undefined) {
            updatedFields[fieldId] = val;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        item.fields = updatedFields;
        await item.save();
        migratedCount++;
        logger.info(`Migrated item [${item.name}] (${item._id}) to Field IDs.`);
      }
    }

    logger.info(`Migration complete! Successfully updated ${migratedCount} items.`);
    await mongoose.disconnect();
    return { success: true, migratedCount };
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    throw error;
  }
};

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
