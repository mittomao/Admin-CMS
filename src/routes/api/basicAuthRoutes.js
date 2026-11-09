'use strict';

const express = require('express');
const router = express.Router();
const basicAuthController = require('../../controllers/admin/basicAuthController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

router.get('/', basicAuthController.getConfig);
router.put('/', csrfMiddleware.verifyToken, basicAuthController.updateConfig);
router.post('/users', csrfMiddleware.verifyToken, basicAuthController.addUser);
router.put('/users/:username', csrfMiddleware.verifyToken, basicAuthController.updateUser);
router.delete('/users/:username', csrfMiddleware.verifyToken, basicAuthController.deleteUser);

module.exports = router;

