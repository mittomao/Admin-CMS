const userService = require('../../services/userService');
const roleService = require('../../services/roleService');
const aclService = require('../../services/aclService');
const itemService = require('../../services/itemService');
const User = require('../../models/User');
const Role = require('../../models/Role');
const Domain = require('../../models/Domain');
const Item = require('../../models/Item');
const logger = require('../../utils/logger');
const branding = require('../../config/branding');
const { ACTIONS } = require('../../config/permissions');

const securityController = {
  // ==========================================
  // USER MANAGER
  // ==========================================

  /**
   * GET /admin/security/users
   */
  async renderUsers(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền truy cập Quản lý Người dùng (User Manager).',
          currentPath: req.originalUrl,
          activeApp: 'users',
          user: req.user,
        });
      }

      const [usersData, roles, domains] = await Promise.all([
        userService.listUsers(req.query),
        roleService.listRoles(),
        Domain.find({}).sort({ name: 1 }).lean(),
      ]);

      res.render('admin/security/users', {
        title: 'User Manager - Quản lý Người dùng',
        layout: 'layouts/shell',
        activeApp: 'users',
        user: req.user,
        users: usersData.users,
        pagination: usersData,
        roles,
        domains: domains.length > 0 ? domains : [{ name: branding.DEFAULT_DOMAIN, displayName: branding.PROJECT_NAME }],
        query: req.query,
      });
    } catch (err) {
      logger.error(`[SecurityController] renderUsers error: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/security/users
   */
  async getUsersJson(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const data = await userService.listUsers(req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/security/users/:id
   */
  async getUserJson(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/security/users
   */
  async postUser(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const created = await userService.createUser(req.body);
      res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: created });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * PUT /api/security/users/:id
   */
  async putUser(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const updated = await userService.updateUser(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Cập nhật tài khoản thành công', data: updated });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/security/users/:id/toggle-status
   */
  async toggleUserStatus(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { isDisabled } = req.body;
      const updated = await userService.setUserDisabled(req.params.id, isDisabled, req.user);
      res.json({
        success: true,
        message: updated.isDisabled ? 'Đã khoá tài khoản' : 'Đã kích hoạt lại tài khoản',
        data: updated,
      });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/security/users/:id/reset-password
   */
  async resetUserPassword(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_USER_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { newPassword } = req.body;
      await userService.resetPassword(req.params.id, newPassword);
      res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  // ==========================================
  // ROLE MANAGER
  // ==========================================

  /**
   * GET /admin/security/roles
   */
  async renderRoles(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền truy cập Quản lý Vai trò (Role Manager).',
          currentPath: req.originalUrl,
          activeApp: 'roles',
          user: req.user,
        });
      }

      const [roles, domains] = await Promise.all([
        roleService.listRoles(req.query),
        Domain.find({}).sort({ name: 1 }).lean(),
      ]);

      res.render('admin/security/roles', {
        title: 'Role Manager - Quản lý Vai trò',
        layout: 'layouts/shell',
        activeApp: 'roles',
        user: req.user,
        roles,
        domains: domains.length > 0 ? domains : [{ name: branding.DEFAULT_DOMAIN, displayName: branding.PROJECT_NAME }],
        query: req.query,
      });
    } catch (err) {
      logger.error(`[SecurityController] renderRoles error: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/security/roles
   */
  async getRolesJson(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const roles = await roleService.listRoles(req.query);
      res.json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/security/roles/:id
   */
  async getRoleJson(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const role = await roleService.getRoleById(req.params.id);
      res.json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/security/roles
   */
  async postRole(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const created = await roleService.createRole(req.body);
      res.status(201).json({ success: true, message: 'Tạo vai trò thành công', data: created });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * PUT /api/security/roles/:id
   */
  async putRole(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const updated = await roleService.updateRole(req.params.id, req.body);
      res.json({ success: true, message: 'Cập nhật vai trò thành công', data: updated });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /api/security/roles/:id
   */
  async deleteRole(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ROLE_MANAGE))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      await roleService.deleteRole(req.params.id);
      res.json({ success: true, message: 'Xoá vai trò thành công' });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  // ==========================================
  // SECURITY EDITOR (ITEM ACL)
  // ==========================================

  /**
   * GET /api/security/items/:id/acl
   * Returns matrix of ACL rules on the item for Security Editor modal
   */
  async getAclMatrix(req, res, next) {
    try {
      const { id } = req.params;
      const { principalType, principalId } = req.query;

      // Check permission: can read the item
      const item = await Item.findById(id).lean();
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      if (!(await itemService.canPerform(req.user, item, 'item:read'))) {
        return res.status(403).json({ success: false, message: 'Forbidden: read permission required.' });
      }

      const data = await aclService.getAclMatrix(id, principalType, principalId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/security/items/:id/acl
   * Set or update an ACL entry on an item
   */
  async setAclEntry(req, res, next) {
    try {
      const { id } = req.params;
      const { principalType, principalId, right, access, inheritance = 'both' } = req.body;

      const result = await aclService.setEntry({
        itemId: id,
        principalType,
        principalId,
        right,
        access,
        inheritance,
        user: req.user,
      });

      res.json({ success: true, message: 'Cập nhật quyền thành công', data: result });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /api/security/entries/:entryId
   * Remove a direct ACL entry
   */
  async removeAclEntry(req, res, next) {
    try {
      const { entryId } = req.params;
      const result = await aclService.removeEntry(entryId, req.user);
      res.json({ success: true, message: 'Đã xoá quy tắc quyền trực tiếp', data: result });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  /**
   * POST /api/security/items/:id/acl/reset
   * Reset all direct ACL rules to inherited from parent
   */
  async resetToInherited(req, res, next) {
    try {
      const { id } = req.params;
      const result = await aclService.resetToInherited(id, req.user);
      res.json({
        success: true,
        message: `Đã khôi phục ${result.count} quy tắc về trạng thái kế thừa từ thư mục cha`,
        data: result,
      });
    } catch (err) {
      res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  },

  // ==========================================
  // ACCESS VIEWER
  // ==========================================

  /**
   * GET /admin/security/access-viewer
   */
  async renderAccessViewer(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ACCESS_VIEW))) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền xem Access Viewer.',
          currentPath: req.originalUrl,
          activeApp: 'access-viewer',
          user: req.user,
        });
      }

      const [users, roles] = await Promise.all([
        User.find({ isDisabled: { $ne: true } }).select('_id username fullName displayName domain').sort({ username: 1 }).lean(),
        Role.find({}).select('_id name domain description').sort({ name: 1 }).lean(),
      ]);

      res.render('admin/security/access-viewer', {
        title: `Access Viewer - ${branding.PROJECT_NAME} Security`,
        layout: 'layouts/shell',
        activeApp: 'access-viewer',
        user: req.user,
        users,
        roles,
      });
    } catch (err) {
      logger.error(`[SecurityController] renderAccessViewer error: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /admin/security/security-editor
   */
  async renderSecurityEditor(req, res, next) {
    try {
      if (!(await itemService.canPerform(req.user, null, ACTIONS.SECURITY_ACCESS_VIEW))) {
        return res.status(403).render('errors/403', {
          title: '403 - Forbidden',
          message: 'Bạn không có quyền truy cập Security Editor.',
          currentPath: req.originalUrl,
          activeApp: 'security-editor',
          user: req.user,
        });
      }

      const [users, roles] = await Promise.all([
        User.find({ isDisabled: { $ne: true } }).select('_id username fullName displayName domain').sort({ username: 1 }).lean(),
        Role.find({}).select('_id name domain description').sort({ name: 1 }).lean(),
      ]);

      const initialPath = req.query.path || branding.PATHS.HOME;
      const initialId = req.query.id || null;

      res.render('admin/security/security-editor', {
        title: `Security Editor - ${branding.PROJECT_NAME} Security`,
        layout: 'layouts/shell',
        activeApp: 'security-editor',
        user: req.user,
        users,
        roles,
        initialPath,
        initialId,
      });
    } catch (err) {
      logger.error(`[SecurityController] renderSecurityEditor error: ${err.message}`);
      next(err);
    }
  },

  /**
   * GET /api/security/items/:id/access-explain
   * Returns effective permissions breakdown with detailed reasoning for each right
   */
  async getAccessExplanation(req, res, next) {
    try {
      const { id } = req.params;
      const { principalType = 'user', principalId } = req.query;

      if (!principalId) {
        return res.status(400).json({ success: false, message: 'principalId is required' });
      }

      let targetUser = null;
      if (principalType === 'user') {
        targetUser = await User.findById(principalId).populate('roles').lean();
        if (!targetUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
      } else {
        // Construct synthetic user object with this single role
        const role = await Role.findById(principalId).lean();
        if (!role) {
          return res.status(404).json({ success: false, message: 'Role not found' });
        }
        targetUser = {
          _id: new require('mongoose').Types.ObjectId(),
          username: `role:${role.name}`,
          roles: [role._id],
          roleNames: [role.name],
        };
      }

      const effectivePermissions = await aclService.getEffectivePermissions(id, targetUser);
      res.json({ success: true, data: effectivePermissions });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = securityController;

