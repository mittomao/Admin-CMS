#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase 11: Serialization Launchpad Tile
 * Upserts Serialization application tile into launchpad_apps collection.
 * 
 * Usage:
 *   node src/scripts/migrate-phase-11-launchpad.js
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const LaunchpadApp = require('../models/LaunchpadApp');
const Role = require('../models/Role');

async function runMigration() {
  try {
    logger.info('=== Bắt đầu Migration GĐ 11: Thêm Serialization tile vào Launchpad ===');
    await mongoose.connect(env.MONGO_URI, { autoIndex: true });
    logger.info('Đã kết nối MongoDB thành công.');

    const adminRole = await Role.findOne({ name: 'Administrator' });
    const allowedRoles = adminRole ? [adminRole._id] : [];

    const serializationData = {
      name: 'Serialization',
      description: 'Export and import content, templates, layouts, and renderings as JSON packages',
      icon: 'ti ti-package-export',
      iconBg: 'cyan',
      group: 'Control Panel & Maintenance',
      url: '/admin/serialization',
      sortOrder: 50,
      isEnabled: true,
      isStub: false,
      allowedRoles,
    };

    const updated = await LaunchpadApp.findOneAndUpdate(
      { name: 'Serialization' },
      serializationData,
      { upsert: true, new: true }
    );

    logger.info(`Đã cập nhật/tạo mới tile Launchpad '${updated.name}' (ID: ${updated._id}).`);
    logger.info('=== Migration GĐ 11 hoàn tất thành công! ===');
  } catch (err) {
    logger.error(`Migration thất bại: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

