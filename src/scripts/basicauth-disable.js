#!/usr/bin/env node
'use strict';

/**
 * Emergency CLI tool to disable Basic Auth directly in MongoDB (GĐ B1 / DEC-046)
 * Usage: npm run basicauth:disable
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const Setting = require('../models/Setting');

async function run() {
  logger.info('[Basic Auth CLI] Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI, { autoIndex: true });

  const doc = await Setting.findOne({ key: 'basicAuth' });
  if (!doc) {
    await Setting.create({
      key: 'basicAuth',
      value: { enabled: false },
      updatedBy: 'cli:disable',
    });
    logger.info('[Basic Auth CLI] Created basicAuth setting with enabled = false.');
  } else {
    await Setting.updateOne(
      { key: 'basicAuth' },
      {
        $set: {
          'value.enabled': false,
          updatedBy: 'cli:disable',
        },
      }
    );
    logger.info('[Basic Auth CLI] Successfully disabled Basic Authentication in MongoDB.');
  }

  await mongoose.disconnect();
  logger.info('[Basic Auth CLI] Done.');
  process.exit(0);
}

run().catch(async (err) => {
  logger.error(`[Basic Auth CLI] Failed to disable Basic Auth: ${err.message}`, { stack: err.stack });
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect error on failure
  }
  process.exit(1);
});

