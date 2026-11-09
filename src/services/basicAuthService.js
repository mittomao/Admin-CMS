'use strict';

/**
 * Basic Auth Service (GĐ B1 / DEC-046)
 * Manages HTTP Basic Authentication settings, user credentials,
 * in-memory caching, optimistic locking, and event bus notifications.
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const eventBus = require('../utils/eventBus');
const branding = require('../config/branding');
const env = require('../config/env');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');

const SETTING_KEY = 'basicAuth';
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL for high throughput
// Pre-computed dummy hash to guarantee constant time response even if user is not found
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

class BasicAuthService {
  constructor() {
    this._cache = null;
    this._cacheExpiresAt = 0;

    // Listen for multi-instance cache invalidation
    eventBus.on('basicauth.cache.invalidate', () => {
      this.invalidateCache(false);
    });
  }

  /**
   * Default initial configuration
   */
  getDefaultConfig() {
    return {
      enabled: false,
      realm: env.BASIC_AUTH_REALM || `${branding.PROJECT_NAME} Admin Access`,
      excludePaths: ['/health'],
      ipAllowlist: [],
      users: [],
    };
  }

  /**
   * Invalidate local memory cache
   */
  invalidateCache(broadcast = true) {
    this._cache = null;
    this._cacheExpiresAt = 0;
    if (broadcast) {
      eventBus.emit('basicauth.cache.invalidate');
    }
  }

  /**
   * Get raw configuration doc from database (with caching)
   */
  async getRawConfig() {
    const now = Date.now();
    if (this._cache && now < this._cacheExpiresAt) {
      return this._cache;
    }

    // Fast fallback if DB is not connected (e.g. during smoke tests without active DB)
    if (mongoose.connection.readyState !== 1) {
      return {
        config: this.getDefaultConfig(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };
    }

    let doc = await Setting.findOne({ key: SETTING_KEY }).lean();
    if (!doc) {
      const initial = this.getDefaultConfig();
      const created = await Setting.create({
        key: SETTING_KEY,
        value: initial,
        updatedBy: 'system',
      });
      doc = created.toObject();
    }

    const value = {
      ...this.getDefaultConfig(),
      ...(doc.value || {}),
    };

    // Ensure array structures
    if (!Array.isArray(value.excludePaths)) value.excludePaths = ['/health', '/robots.txt'];
    if (!Array.isArray(value.ipAllowlist)) value.ipAllowlist = [];
    if (!Array.isArray(value.users)) value.users = [];

    const result = {
      config: value,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
      updatedBy: doc.updatedBy || 'system',
    };

    this._cache = result;
    this._cacheExpiresAt = now + CACHE_TTL_MS;
    return result;
  }

  /**
   * Get configuration for API / UI (sanitizes passwordHash)
   */
  async getConfig(options = { sanitize: true }) {
    const { config, updatedAt, updatedBy } = await this.getRawConfig();

    // Check emergency environment variable override
    const isOverriddenByEnv = process.env.BASIC_AUTH_ENABLED === 'false' || env.BASIC_AUTH_ENABLED === 'false';
    const effectiveEnabled = isOverriddenByEnv ? false : Boolean(config.enabled);

    const sanitizedUsers = config.users.map((u) => {
      const userObj = {
        username: u.username,
        disabled: Boolean(u.disabled),
        createdAt: u.createdAt || null,
        createdBy: u.createdBy || 'system',
      };
      if (!options.sanitize) {
        userObj.passwordHash = u.passwordHash;
      }
      return userObj;
    });

    return {
      enabled: effectiveEnabled,
      rawEnabled: Boolean(config.enabled),
      isOverriddenByEnv,
      realm: config.realm || env.BASIC_AUTH_REALM || branding.PROJECT_NAME,
      excludePaths: config.excludePaths || ['/health', '/robots.txt'],
      ipAllowlist: config.ipAllowlist || [],
      users: sanitizedUsers,
      updatedAt,
      updatedBy,
    };
  }

  /**
   * Update entire Basic Auth configuration (with Optimistic Locking)
   */
  async updateConfig(newConfig = {}, options = {}) {
    const raw = await this.getRawConfig();
    const existingConfig = raw.config;

    // 1. Optimistic Locking Check
    if (options.expectedUpdatedAt && raw.updatedAt) {
      const expectedTime = new Date(options.expectedUpdatedAt).getTime();
      const actualTime = new Date(raw.updatedAt).getTime();
      if (Math.abs(expectedTime - actualTime) > 1000) {
        throw new ConflictError('Cấu hình Basic Auth đã được cập nhật bởi một quản trị viên khác. Vui lòng tải lại trang.');
      }
    }

    const updated = { ...existingConfig };

    // 2. Validate Realm
    if (newConfig.realm !== undefined) {
      const realmStr = String(newConfig.realm).trim();
      if (!realmStr) {
        throw new ValidationError('Realm không được để trống.');
      }
      updated.realm = realmStr;
    }

    // 3. Validate excludePaths
    if (newConfig.excludePaths !== undefined) {
      if (!Array.isArray(newConfig.excludePaths)) {
        throw new ValidationError('excludePaths phải là một mảng chuỗi đường dẫn.');
      }
      const cleanedPaths = newConfig.excludePaths
        .map((p) => String(p).trim())
        .filter(Boolean)
        .map((p) => (p.startsWith('/') ? p : `/${p}`));
      // Always retain standard required system endpoints
      if (!cleanedPaths.includes('/health')) cleanedPaths.unshift('/health');
      if (!cleanedPaths.includes('/robots.txt')) cleanedPaths.push('/robots.txt');
      updated.excludePaths = Array.from(new Set(cleanedPaths));
    }

    // 4. Validate ipAllowlist
    if (newConfig.ipAllowlist !== undefined) {
      if (!Array.isArray(newConfig.ipAllowlist)) {
        throw new ValidationError('ipAllowlist phải là một mảng chuỗi địa chỉ IP hoặc CIDR.');
      }
      updated.ipAllowlist = newConfig.ipAllowlist
        .map((ip) => String(ip).trim())
        .filter(Boolean);
    }

    // 5. Validate Enabled state
    if (newConfig.enabled !== undefined) {
      const targetEnabled = Boolean(newConfig.enabled);
      if (targetEnabled) {
        const hasActiveUser = updated.users.some((u) => !u.disabled);
        if (!hasActiveUser) {
          throw new ValidationError('Không thể bật Basic Auth khi chưa có tài khoản người dùng hoạt động nào.');
        }
      }
      updated.enabled = targetEnabled;
    }

    // 6. Persist to MongoDB
    const operator = options.user?.username || options.user?.email || 'admin';
    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        value: updated,
        updatedBy: operator,
      },
      { new: true, upsert: true }
    );

    this.invalidateCache();

    // 7. Event Bus emission
    if (existingConfig.enabled !== updated.enabled) {
      eventBus.emit(updated.enabled ? 'basicauth.enabled' : 'basicauth.disabled', {
        user: options.user,
        timestamp: new Date(),
      });
    }

    eventBus.emit('basicauth.config.changed', {
      user: options.user,
      changes: {
        enabled: updated.enabled,
        realm: updated.realm,
        excludePaths: updated.excludePaths,
        ipAllowlist: updated.ipAllowlist,
      },
      timestamp: new Date(),
    });

    return this.getConfig({ sanitize: true });
  }

  /**
   * Add a new Basic Auth user
   */
  async addUser({ username, password, disabled = false }, options = {}) {
    if (!username || typeof username !== 'string') {
      throw new ValidationError('Tên người dùng không hợp lệ.');
    }
    const cleanUser = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUser)) {
      throw new ValidationError('Tên người dùng phải từ 3 đến 30 ký tự, chỉ chứa chữ cái, chữ số, dấu gạch dưới, gạch ngang hoặc dấu chấm.');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new ValidationError('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
    }

    const raw = await this.getRawConfig();
    const existingUsers = raw.config.users || [];

    if (existingUsers.some((u) => u.username.toLowerCase() === cleanUser)) {
      throw new ConflictError(`Tài khoản '${cleanUser}' đã tồn tại.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const operator = options.user?.username || options.user?.email || 'admin';

    const newUser = {
      username: cleanUser,
      passwordHash,
      disabled: Boolean(disabled),
      createdAt: new Date(),
      createdBy: operator,
    };

    const updatedUsers = [...existingUsers, newUser];

    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        'value.users': updatedUsers,
        updatedBy: operator,
      },
      { new: true, upsert: true }
    );

    this.invalidateCache();

    eventBus.emit('basicauth.user.added', {
      username: cleanUser,
      user: options.user,
      timestamp: new Date(),
    });

    return {
      username: cleanUser,
      disabled: Boolean(disabled),
      createdAt: newUser.createdAt,
      createdBy: operator,
    };
  }

  /**
   * Update an existing user (change password or toggle disabled status)
   */
  async updateUser(username, { password, disabled }, options = {}) {
    const cleanUser = String(username).trim().toLowerCase();
    const raw = await this.getRawConfig();
    const users = [...(raw.config.users || [])];
    const index = users.findIndex((u) => u.username.toLowerCase() === cleanUser);

    if (index === -1) {
      throw new NotFoundError(`Không tìm thấy tài khoản '${cleanUser}'.`);
    }

    const userToUpdate = { ...users[index] };
    let passwordChanged = false;

    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        throw new ValidationError('Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự.');
      }
      const salt = await bcrypt.genSalt(10);
      userToUpdate.passwordHash = await bcrypt.hash(password, salt);
      passwordChanged = true;
    }

    if (disabled !== undefined) {
      const willBeDisabled = Boolean(disabled);
      if (willBeDisabled && raw.config.enabled) {
        // Ensure at least one active user remains
        const remainingActive = users.filter((u, i) => i !== index && !u.disabled);
        if (remainingActive.length === 0) {
          throw new ValidationError('Không thể khóa tài khoản hoạt động cuối cùng khi Basic Auth đang bật.');
        }
      }
      userToUpdate.disabled = willBeDisabled;
    }

    users[index] = userToUpdate;
    const operator = options.user?.username || options.user?.email || 'admin';

    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        'value.users': users,
        updatedBy: operator,
      },
      { new: true }
    );

    this.invalidateCache();

    if (passwordChanged) {
      eventBus.emit('basicauth.user.password.changed', {
        username: cleanUser,
        user: options.user,
        timestamp: new Date(),
      });
    }

    eventBus.emit('basicauth.config.changed', {
      user: options.user,
      action: 'update_user',
      username: cleanUser,
      timestamp: new Date(),
    });

    return {
      username: cleanUser,
      disabled: Boolean(userToUpdate.disabled),
      createdAt: userToUpdate.createdAt,
      createdBy: userToUpdate.createdBy,
    };
  }

  /**
   * Delete a Basic Auth user
   */
  async deleteUser(username, options = {}) {
    const cleanUser = String(username).trim().toLowerCase();
    const raw = await this.getRawConfig();
    const users = raw.config.users || [];
    const target = users.find((u) => u.username.toLowerCase() === cleanUser);

    if (!target) {
      throw new NotFoundError(`Không tìm thấy tài khoản '${cleanUser}'.`);
    }

    if (raw.config.enabled) {
      const remainingActive = users.filter((u) => u.username.toLowerCase() !== cleanUser && !u.disabled);
      if (remainingActive.length === 0) {
        throw new ValidationError('Không thể xóa tài khoản hoạt động cuối cùng khi Basic Auth đang bật.');
      }
    }

    const updatedUsers = users.filter((u) => u.username.toLowerCase() !== cleanUser);
    const operator = options.user?.username || options.user?.email || 'admin';

    await Setting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        'value.users': updatedUsers,
        updatedBy: operator,
      },
      { new: true }
    );

    this.invalidateCache();

    eventBus.emit('basicauth.user.removed', {
      username: cleanUser,
      user: options.user,
      timestamp: new Date(),
    });

    return { success: true, username: cleanUser };
  }

  /**
   * Authenticate credentials (used by basicAuthMiddleware)
   * Guaranteed timing-safe verification
   */
  async authenticate(username, plainPassword) {
    if (!username || !plainPassword) return false;

    const cleanUser = String(username).trim().toLowerCase();
    const { config } = await this.getRawConfig();
    const user = (config.users || []).find((u) => u.username.toLowerCase() === cleanUser);

    if (!user || user.disabled) {
      // Execute dummy bcrypt comparison to defend against timing attacks
      await bcrypt.compare(plainPassword, DUMMY_HASH);
      return false;
    }

    return bcrypt.compare(plainPassword, user.passwordHash);
  }
}

module.exports = new BasicAuthService();
