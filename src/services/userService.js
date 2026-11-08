const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const branding = require('../config/branding');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');

class UserService {
  /**
   * List users with optional filtering and pagination
   * @param {object} options
   * @returns {Promise<{ users: Array, total: number, page: number, totalPages: number }>}
   */
  async listUsers(options = {}) {
    const {
      search = '',
      domain = '',
      roleId = '',
      status = 'all',
      page = 1,
      limit = 20,
    } = options;

    const query = {};

    if (domain) {
      query.domain = domain.trim().toLowerCase();
    }

    if (status === 'active') {
      query.isDisabled = { $ne: true };
    } else if (status === 'disabled') {
      query.isDisabled = true;
    }

    if (roleId && mongoose.Types.ObjectId.isValid(roleId)) {
      query.roles = new mongoose.Types.ObjectId(roleId);
    }

    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ username: rx }, { fullName: rx }, { displayName: rx }, { email: rx }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('roles', 'name domain description isSystem')
        .sort({ username: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  }

  /**
   * Get a single user by ID
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getUserById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID người dùng không hợp lệ');
    }
    const user = await User.findById(id).populate('roles').lean();
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }
    return user;
  }

  /**
   * Create a new user
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createUser(data) {
    const { username, email, fullName, displayName, domain = branding.DEFAULT_DOMAIN, password, roleIds = [] } = data;

    if (!username || !username.trim()) {
      throw new ValidationError('Tên đăng nhập (username) là bắt buộc');
    }
    if (!email || !email.trim()) {
      throw new ValidationError('Email là bắt buộc');
    }
    if (!password || password.length < 6) {
      throw new ValidationError('Mật khẩu phải có tối thiểu 6 ký tự');
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate username or email
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });
    if (existing) {
      if (existing.username === cleanUsername) {
        throw new ValidationError(`Tên đăng nhập "${cleanUsername}" đã tồn tại`);
      }
      throw new ValidationError(`Email "${cleanEmail}" đã được sử dụng`);
    }

    // Verify valid roles
    const validRoleIds = [];
    if (Array.isArray(roleIds) && roleIds.length > 0) {
      for (const rId of roleIds) {
        if (mongoose.Types.ObjectId.isValid(rId)) {
          const roleDoc = await Role.findById(rId);
          if (roleDoc) validRoleIds.push(roleDoc._id);
        }
      }
    }

    const passwordHash = await User.hashPassword(password);
    const populatedRoles = await Role.find({ _id: { $in: validRoleIds } });
    const isAdmin = populatedRoles.some((r) => r.name.toLowerCase() === 'administrator');

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      fullName: (fullName || cleanUsername).trim(),
      displayName: (displayName || fullName || cleanUsername).trim(),
      domain: (domain || branding.DEFAULT_DOMAIN).trim().toLowerCase(),
      passwordHash,
      roles: validRoleIds,
      isAdmin,
      isDisabled: false,
      isActive: true,
    });

    await newUser.save();

    eventBus.emit('user.changed', {
      action: 'created',
      userId: newUser._id,
      username: newUser.username,
    });

    logger.info(`[UserService] Created user ${newUser.username} (${newUser._id})`);
    return newUser.toObject();
  }

  /**
   * Update an existing user
   * @param {string} id
   * @param {object} data
   * @param {string|object} currentUserId
   * @returns {Promise<object>}
   */
  async updateUser(id, data, _currentUserId) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID người dùng không hợp lệ');
    }

    const user = await User.findById(id).populate('roles');
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    // Optimistic locking check if expectedUpdatedAt provided
    if (data.expectedUpdatedAt) {
      const incoming = new Date(data.expectedUpdatedAt).getTime();
      const current = new Date(user.updatedAt).getTime();
      if (incoming !== current) {
        throw new ConflictError('Dữ liệu người dùng đã bị thay đổi bởi người khác. Vui lòng tải lại trang.');
      }
    }

    const { fullName, displayName, email, domain, roleIds } = data;

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email) {
        const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
        if (emailExists) {
          throw new ValidationError(`Email "${cleanEmail}" đã được sử dụng bởi người dùng khác`);
        }
        user.email = cleanEmail;
      }
    }

    if (fullName) user.fullName = fullName.trim();
    if (displayName) user.displayName = displayName.trim();
    if (domain) user.domain = domain.trim().toLowerCase();

    // Role assignment update
    if (Array.isArray(roleIds)) {
      const validRoleIds = [];
      for (const rId of roleIds) {
        if (mongoose.Types.ObjectId.isValid(rId)) {
          const roleDoc = await Role.findById(rId);
          if (roleDoc) validRoleIds.push(roleDoc._id);
        }
      }

      const assignedRoles = await Role.find({ _id: { $in: validRoleIds } });
      const willBeAdmin = assignedRoles.some((r) => r.name.toLowerCase() === 'administrator');

      // Guard: Cannot remove Administrator from the last active Administrator
      const wasAdmin = user.roles.some((r) => r.name.toLowerCase() === 'administrator');
      if (wasAdmin && !willBeAdmin) {
        const adminRole = await Role.findOne({ name: 'Administrator' });
        if (adminRole) {
          const otherAdminCount = await User.countDocuments({
            _id: { $ne: user._id },
            roles: adminRole._id,
            isDisabled: { $ne: true },
          });
          if (otherAdminCount === 0) {
            throw new ForbiddenError('Không thể gỡ quyền Administrator của quản trị viên hoạt động cuối cùng của hệ thống!');
          }
        }
      }

      user.roles = validRoleIds;
      user.isAdmin = willBeAdmin;
    }

    await user.save();

    eventBus.emit('user.changed', {
      action: 'updated',
      userId: user._id,
      username: user.username,
    });

    logger.info(`[UserService] Updated user ${user.username} (${user._id})`);
    return user.toObject();
  }

  /**
   * Enable or disable a user account
   * @param {string} id
   * @param {boolean} isDisabled
   * @param {string|object} currentUserId
   * @returns {Promise<object>}
   */
  async setUserDisabled(id, isDisabled, currentUserId) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID người dùng không hợp lệ');
    }

    const user = await User.findById(id).populate('roles');
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    const currentIdStr = typeof currentUserId === 'object' ? (currentUserId._id || currentUserId.id)?.toString() : currentUserId?.toString();

    // Guard: Cannot disable oneself
    if (isDisabled && currentIdStr && currentIdStr === user._id.toString()) {
      throw new ForbiddenError('Bạn không thể tự khoá tài khoản của chính mình!');
    }

    // Guard: Cannot disable the last active Administrator
    if (isDisabled) {
      const isAdmin = user.roles.some((r) => r.name.toLowerCase() === 'administrator');
      if (isAdmin) {
        const adminRole = await Role.findOne({ name: 'Administrator' });
        if (adminRole) {
          const otherAdminCount = await User.countDocuments({
            _id: { $ne: user._id },
            roles: adminRole._id,
            isDisabled: { $ne: true },
          });
          if (otherAdminCount === 0) {
            throw new ForbiddenError('Không thể khoá tài khoản Administrator hoạt động cuối cùng của hệ thống!');
          }
        }
      }
    }

    user.isDisabled = Boolean(isDisabled);
    user.isActive = !user.isDisabled;
    await user.save();

    // If disabled, invalidate active sessions
    if (user.isDisabled) {
      await this.invalidateUserSessions(user._id);
    }

    eventBus.emit('user.changed', {
      action: user.isDisabled ? 'disabled' : 'enabled',
      userId: user._id,
      username: user.username,
    });

    logger.info(`[UserService] Set user ${user.username} disabled=${user.isDisabled}`);
    return user.toObject();
  }

  /**
   * Reset user password (by Admin)
   * @param {string} id
   * @param {string} newPassword
   * @returns {Promise<boolean>}
   */
  async resetPassword(id, newPassword) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID người dùng không hợp lệ');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new ValidationError('Mật khẩu mới phải có tối thiểu 6 ký tự');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('Không tìm thấy người dùng');
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    // Invalidate sessions on password reset
    await this.invalidateUserSessions(user._id);

    eventBus.emit('user.changed', {
      action: 'password_reset',
      userId: user._id,
      username: user.username,
    });

    logger.info(`[UserService] Reset password for user ${user.username}`);
    return true;
  }

  /**
   * Invalidate all active sessions for a user in MongoDB session store
   * @param {string|mongoose.Types.ObjectId} userId
   */
  async invalidateUserSessions(userId) {
    try {
      const userIdStr = userId.toString();
      const sessionsColl = mongoose.connection.collection('sessions');
      if (sessionsColl) {
        // Query regex on session JSON string stored by connect-mongo
        const res = await sessionsColl.deleteMany({
          session: { $regex: `"id":"${userIdStr}"` },
        });
        logger.info(`[UserService] Invalidated ${res.deletedCount} sessions for user ${userIdStr}`);
      }
    } catch (err) {
      logger.warn(`[UserService] Could not invalidate sessions for user ${userId}: ${err.message}`);
    }
  }
}

module.exports = new UserService();

