const env = require('../config/env');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class MaintenanceService {
  constructor() {
    this._cachedState = null;
    this._cachedAt = 0;
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceMode() {
    // 1. Environment variable override takes immediate precedence
    if (env.MAINTENANCE_MODE) {
      return true;
    }

    // 2. Cache DB state for 5 seconds to reduce DB load
    const now = Date.now();
    if (this._cachedState !== null && (now - this._cachedAt < 5000)) {
      return this._cachedState;
    }

    try {
      if (mongoose.connection.readyState !== 1) {
        return false;
      }
      const db = mongoose.connection.db;
      const settingsColl = db.collection('settings');
      const setting = await settingsColl.findOne({ key: 'system_maintenance' });
      const enabled = Boolean(setting && setting.value && setting.value.enabled);
      this._cachedState = enabled;
      this._cachedAt = now;
      return enabled;
    } catch (err) {
      logger.warn(`[MaintenanceService] Failed to read maintenance state: ${err.message}`);
      return false;
    }
  }

  /**
   * Set maintenance mode in database settings
   */
  async setMaintenanceMode(enabled, reason = '', byUser = null) {
    const db = mongoose.connection.db;
    const settingsColl = db.collection('settings');

    const value = {
      enabled: Boolean(enabled),
      reason: reason || (enabled ? 'Bảo trì hệ thống phục vụ sao lưu & phục hồi dữ liệu' : ''),
      updatedAt: new Date(),
      updatedBy: byUser ? (byUser.username || byUser.id || byUser._id) : 'system',
    };

    await settingsColl.updateOne(
      { key: 'system_maintenance' },
      { $set: { key: 'system_maintenance', value, updatedAt: new Date() } },
      { upsert: true }
    );

    this._cachedState = Boolean(enabled);
    this._cachedAt = Date.now();

    const eventName = enabled ? 'maintenance.on' : 'maintenance.off';
    eventBus.emit(eventName, {
      enabled,
      reason,
      byUser: value.updatedBy,
      at: new Date(),
    });

    logger.warn(`[MaintenanceService] Maintenance mode set to ${enabled ? 'ON' : 'OFF'} by ${value.updatedBy}. Reason: ${reason}`);
    return value;
  }
}

module.exports = new MaintenanceService();

