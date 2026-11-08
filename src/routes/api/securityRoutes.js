const express = require('express');
const router = express.Router();
const securityController = require('../../controllers/admin/securityController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

// User Manager API
router.get('/users', requireAuth, securityController.getUsersJson);
router.get('/users/:id', requireAuth, securityController.getUserJson);
router.post('/users', requireAuth, csrfMiddleware.verifyToken, securityController.postUser);
router.put('/users/:id', requireAuth, csrfMiddleware.verifyToken, securityController.putUser);
router.post('/users/:id/toggle-status', requireAuth, csrfMiddleware.verifyToken, securityController.toggleUserStatus);
router.post('/users/:id/reset-password', requireAuth, csrfMiddleware.verifyToken, securityController.resetUserPassword);

// Role Manager API
router.get('/roles', requireAuth, securityController.getRolesJson);
router.get('/roles/:id', requireAuth, securityController.getRoleJson);
router.post('/roles', requireAuth, csrfMiddleware.verifyToken, securityController.postRole);
router.put('/roles/:id', requireAuth, csrfMiddleware.verifyToken, securityController.putRole);
router.delete('/roles/:id', requireAuth, csrfMiddleware.verifyToken, securityController.deleteRole);

// Item ACL API (Security Editor)
router.get('/items/:id/acl', requireAuth, securityController.getAclMatrix);
router.post('/items/:id/acl', requireAuth, csrfMiddleware.verifyToken, securityController.setAclEntry);
router.delete('/entries/:entryId', requireAuth, csrfMiddleware.verifyToken, securityController.removeAclEntry);
router.post('/items/:id/acl/reset', requireAuth, csrfMiddleware.verifyToken, securityController.resetToInherited);

// Access Viewer API
router.get('/items/:id/access-explain', requireAuth, securityController.getAccessExplanation);

module.exports = router;

