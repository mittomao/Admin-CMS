const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const AccessControl = require('../models/AccessControl');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');

class RoleService {
  /**
   * Detect if assigning parentRoleIds to roleId would create a circular inheritance loop
   * @param {string|mongoose.Types.ObjectId} roleId
   * @param {Array<string|mongoose.Types.ObjectId>} candidateParentIds
   * @returns {Promise<boolean>} true if cycle detected
   */
  async detectCycle(roleId, candidateParentIds = []) {
    if (!roleId || !candidateParentIds || candidateParentIds.length === 0) return false;

    const roleIdStr = roleId.toString();

    // Direct self-inheritance
    if (candidateParentIds.some((p) => p.toString() === roleIdStr)) {
      return true;
    }

    // Traverse ancestors of each candidate parent using BFS
    const visited = new Set();
    const queue = [...candidateParentIds.map((p) => p.toString())];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId === roleIdStr) {
        return true; // Cycle detected: a candidate parent inherits from roleId!
      }
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      try {
        const parentDoc = await Role.findById(currentId).select('memberOf').lean();
        if (parentDoc && Array.isArray(parentDoc.memberOf)) {
          for (const ancestorId of parentDoc.memberOf) {
            const strAncestor = ancestorId.toString();
            if (strAncestor === roleIdStr) {
              return true;
            }
            if (!visited.has(strAncestor)) {
              queue.push(strAncestor);
            }
          }
        }
      } catch (err) {
        logger.warn(`[RoleService] detectCycle error reading parent ${currentId}: ${err.message}`);
      }
    }

    return false;
  }

  /**
   * List all roles with memberOf populated and count of assigned users
   * @param {object} options
   * @returns {Promise<Array<object>>}
   */
  async listRoles(options = {}) {
    const { domain, search } = options;
    const query = {};

    if (domain) {
      query.domain = domain.trim().toLowerCase();
    }
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { description: rx }];
    }

    const roles = await Role.find(query)
      .populate('memberOf', 'name domain description')
      .sort({ name: 1 })
      .lean();

    // Count user assignments per role
    const userCounts = await User.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(userCounts.map((u) => [u._id.toString(), u.count]));

    return roles.map((r) => ({
      ...r,
      userCount: countMap.get(r._id.toString()) || 0,
    }));
  }

  /**
   * Get single role by ID
   * @param {string} id
   * @returns {Promise<object>}
   */
  async getRoleById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID vai trò không hợp lệ');
    }

    const role = await Role.findById(id).populate('memberOf', 'name domain description').lean();
    if (!role) {
      throw new NotFoundError('Không tìm thấy vai trò');
    }

    const userCount = await User.countDocuments({ roles: role._id });
    return { ...role, userCount };
  }

  /**
   * Create a new role
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createRole(data) {
    const { name, domain = 'sitecore', description = '', memberOf = [] } = data;

    if (!name || !name.trim()) {
      throw new ValidationError('Tên vai trò (Role Name) là bắt buộc');
    }

    const cleanName = name.trim();
    const cleanDomain = (domain || 'sitecore').trim().toLowerCase();

    // Check duplicate
    const existing = await Role.findOne({ name: cleanName });
    if (existing) {
      throw new ValidationError(`Vai trò "${cleanName}" đã tồn tại`);
    }

    // Validate memberOf IDs
    const validMemberOf = [];
    if (Array.isArray(memberOf)) {
      for (const mId of memberOf) {
        if (mongoose.Types.ObjectId.isValid(mId)) {
          const parentRole = await Role.findById(mId);
          if (parentRole) validMemberOf.push(parentRole._id);
        }
      }
    }

    const newRole = new Role({
      name: cleanName,
      domain: cleanDomain,
      description: (description || '').trim(),
      memberOf: validMemberOf,
      isSystem: false,
    });

    await newRole.save();

    eventBus.emit('role.changed', {
      action: 'created',
      roleId: newRole._id,
      name: newRole.name,
    });

    logger.info(`[RoleService] Created role ${newRole.name} (${newRole._id})`);
    return newRole.toObject();
  }

  /**
   * Update an existing role
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateRole(id, data) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID vai trò không hợp lệ');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new NotFoundError('Không tìm thấy vai trò');
    }

    // Optimistic locking check if expectedUpdatedAt provided
    if (data.expectedUpdatedAt) {
      const incoming = new Date(data.expectedUpdatedAt).getTime();
      const current = new Date(role.updatedAt).getTime();
      if (incoming !== current) {
        throw new ConflictError('Dữ liệu vai trò đã bị thay đổi bởi người khác. Vui lòng tải lại trang.');
      }
    }

    const { name, domain, description, memberOf } = data;

    // Prevent renaming system roles
    if (role.isSystem && name && name.trim() !== role.name) {
      throw new ForbiddenError(`Không thể đổi tên vai trò hệ thống (${role.name})!`);
    }

    if (name && name.trim() && name.trim() !== role.name) {
      const existing = await Role.findOne({ name: name.trim(), _id: { $ne: role._id } });
      if (existing) {
        throw new ValidationError(`Tên vai trò "${name.trim()}" đã được sử dụng`);
      }
      role.name = name.trim();
    }

    if (domain) role.domain = domain.trim().toLowerCase();
    if (typeof description === 'string') role.description = description.trim();

    // Role inheritance update with cycle check
    if (Array.isArray(memberOf)) {
      const validMemberOf = [];
      for (const mId of memberOf) {
        if (mongoose.Types.ObjectId.isValid(mId)) {
          validMemberOf.push(new mongoose.Types.ObjectId(mId));
        }
      }

      const hasCycle = await this.detectCycle(role._id, validMemberOf);
      if (hasCycle) {
        throw new ValidationError('Phát hiện vòng lặp kế thừa vai trò (Circular Role Inheritance). Vui lòng chọn vai trò cha khác.');
      }

      role.memberOf = validMemberOf;
    }

    await role.save();

    eventBus.emit('role.changed', {
      action: 'updated',
      roleId: role._id,
      name: role.name,
    });

    logger.info(`[RoleService] Updated role ${role.name} (${role._id})`);
    return role.toObject();
  }

  /**
   * Delete a role
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteRole(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('ID vai trò không hợp lệ');
    }

    const role = await Role.findById(id);
    if (!role) {
      throw new NotFoundError('Không tìm thấy vai trò');
    }

    if (role.isSystem || role.name === 'Administrator') {
      throw new ForbiddenError(`Không thể xoá vai trò hệ thống (${role.name})!`);
    }

    // Remove role from users
    await User.updateMany({ roles: role._id }, { $pull: { roles: role._id } });

    // Remove role from other roles' memberOf
    await Role.updateMany({ memberOf: role._id }, { $pull: { memberOf: role._id } });

    // Delete associated ACL entries
    await AccessControl.deleteMany({ principalType: 'role', principalId: role._id });

    await Role.deleteOne({ _id: role._id });

    eventBus.emit('role.changed', {
      action: 'deleted',
      roleId: role._id,
      name: role.name,
    });

    logger.info(`[RoleService] Deleted role ${role.name} (${role._id})`);
    return true;
  }
}

module.exports = new RoleService();

