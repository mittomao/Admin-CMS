'use strict';

const express = require('express');
const router = express.Router();
const mediaController = require('../../controllers/admin/mediaController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');
const { upload, validateUploadedFiles } = require('../../middlewares/uploadMiddleware');

// Tất cả endpoints API Media đều yêu cầu xác thực
router.use(requireAuth);

// Read endpoints
router.get('/folders', (req, res, next) => mediaController.apiGetFolders(req, res, next));
router.get('/assets', (req, res, next) => mediaController.apiGetAssets(req, res, next));
router.get('/:id', (req, res, next) => mediaController.apiGetMediaDetails(req, res, next));
router.get('/:id/usage', (req, res, next) => mediaController.apiGetUsage(req, res, next));

// Mutating endpoints kèm kiểm tra CSRF Token
router.post(
  '/upload',
  csrfMiddleware.verifyToken,
  upload.any(),
  validateUploadedFiles,
  (req, res, next) => mediaController.apiUpload(req, res, next)
);

router.post('/folders', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiCreateFolder(req, res, next)
);

router.post(
  '/:id/replace',
  csrfMiddleware.verifyToken,
  upload.single('file'),
  validateUploadedFiles,
  (req, res, next) => mediaController.apiReplace(req, res, next)
);

router.put('/:id', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiUpdateMetadata(req, res, next)
);

router.post('/:id/move', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiMove(req, res, next)
);

router.post('/:id/rename', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiRename(req, res, next)
);

router.delete('/folders/:id', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiDelete(req, res, next)
);

router.delete('/:id', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiDelete(req, res, next)
);

router.post('/bulk-delete', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiBulkDelete(req, res, next)
);

router.post('/sync', csrfMiddleware.verifyToken, (req, res, next) =>
  mediaController.apiSync(req, res, next)
);

module.exports = router;

