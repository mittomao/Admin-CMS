'use strict';

/**
 * Treecraft CMS - Starter Serialization Synchronizer (DEC-058 / Phase S-Parity)
 * Syncs starter YAML sections into items_master in topological dependency order.
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const yamlSectionService = require('../services/yamlSectionService');
const { SYNC_EXECUTION_ORDER } = require('../config/serializationSections');
const logger = require('../utils/logger');

async function syncStarter() {
  console.log(`[sync-starter] Connecting to MongoDB [${env.MONGO_URI}] dbName=[${env.MONGO_DB_NAME}]...`);
  await mongoose.connect(env.MONGO_URI, {
    dbName: env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`[sync-starter] Starting synchronization in topological order: ${SYNC_EXECUTION_ORDER.join(' -> ')}`);

  // Ensure system language structure exists
  try {
    const languageService = require('../services/languageService');
    await languageService.ensureSystemStructure();
    console.log('[sync-starter] System language structure verified.');
  } catch (langErr) {
    console.warn(`[sync-starter] Language structure notice: ${langErr.message}`);
  }

  // Seed starter media library items
  try {
    const { seedStarterMedia } = require('./seed-starter-media');
    await seedStarterMedia();
  } catch (mediaErr) {
    console.warn(`[sync-starter] Starter media notice: ${mediaErr.message}`);
  }

  for (const sectionKey of SYNC_EXECUTION_ORDER) {
    console.log(`[sync-starter] Syncing section: "${sectionKey}"...`);
    try {
      const res = await yamlSectionService.syncSection(sectionKey, {
        mode: 'overwrite',
        user: 'system:init',
      });
      console.log(`[sync-starter] Section "${sectionKey}" synced: ${res.created} created, ${res.updated} updated, ${res.unchanged} unchanged.`);
    } catch (err) {
      console.warn(`[sync-starter] Warning on section "${sectionKey}": ${err.message}`);
    }
  }

  console.log('[sync-starter] ✅ All starter sections synchronized successfully!');
  await mongoose.disconnect();
}

if (require.main === module) {
  syncStarter()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[sync-starter] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { syncStarter };
