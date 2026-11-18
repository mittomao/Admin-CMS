#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase 12: Control Panel System Health Launchpad Tile
 * Cập nhật tile Control Panel trỏ tới /admin/control-panel và kích hoạt isStub: false
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const LaunchpadApp = require('../models/LaunchpadApp');
const Role = require('../models/Role');

async function runMigration() {
  try {
    logger.info('=== Bắt đầu Migration GĐ 12: Kích hoạt Control Panel tile vào Launchpad ===');
    await mongoose.connect(env.MONGO_URI, { autoIndex: true });
    logger.info('Đã kết nối MongoDB thành công.');

    const adminRole = await Role.findOne({ name: 'Administrator' });
    const allowedRoles = adminRole ? [adminRole._id] : [];

    const controlPanelData = {
      name: 'Control Panel',
      description: 'System Health, hardware metrics, database status, and cache management',
      icon: 'ti ti-activity-heartbeat',
      iconBg: 'rose',
      group: 'Control Panel & Maintenance',
      url: '/admin/control-panel',
      sortOrder: 10,
      isEnabled: true,
      isStub: false,
      allowedRoles,
    };

    const updated = await LaunchpadApp.findOneAndUpdate(
      { name: 'Control Panel' },
      controlPanelData,
      { upsert: true, new: true }
    );

    logger.info(`Đã cập nhật tile Launchpad '${updated.name}' (URL: ${updated.url}, isStub: ${updated.isStub}).`);
    logger.info('=== Migration GĐ 12 Launchpad hoàn tất thành công! ===');
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
