#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase B1: Basic Auth Launchpad Tile
 * Upserts Basic Auth application tile into launchpad_apps collection.
 * 
 * Usage:
 *   node src/scripts/migrate-phase-B1-launchpad.js
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const LaunchpadApp = require('../models/LaunchpadApp');
const Role = require('../models/Role');

async function runMigration() {
  try {
    logger.info('=== Bắt đầu Migration GĐ B1: Thêm Basic Auth tile vào Launchpad ===');
    await mongoose.connect(env.MONGO_URI, { autoIndex: true });
    logger.info('Đã kết nối MongoDB thành công.');

    const adminRole = await Role.findOne({ name: 'Administrator' });
    const allowedRoles = adminRole ? [adminRole._id] : [];

    const basicAuthData = {
      name: 'Basic Auth',
      description: 'Protect public website with HTTP Basic Authentication',
      icon: 'ti ti-door-enter',
      iconBg: 'cyan',
      group: 'Control Panel & Maintenance',
      url: '/admin/basic-auth',
      sortOrder: 40,
      isEnabled: true,
      isStub: false,
      allowedRoles,
    };

    const updated = await LaunchpadApp.findOneAndUpdate(
      { name: 'Basic Auth' },
      basicAuthData,
      { upsert: true, new: true }
    );

    logger.info(`Đã cập nhật/tạo mới tile Launchpad '${updated.name}' (ID: ${updated._id}).`);
    logger.info('=== Migration GĐ B1 hoàn tất thành công! ===');
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

