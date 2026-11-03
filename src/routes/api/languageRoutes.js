const express = require('express');
const router = express.Router();
const Language = require('../../models/Language');
const { requireAuth } = require('../../middlewares/authMiddleware');
const csrfMiddleware = require('../../middlewares/csrfMiddleware');

router.use(requireAuth);

/**
 * GET /api/languages
 * List all system languages
 */
router.get('/', async (req, res) => {
  try {
    const languages = await Language.find().sort({ sortOrder: 1, code: 1 }).lean();
    res.json({ success: true, data: languages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/languages
 * Create a new system language
 */
router.post('/', csrfMiddleware.verifyToken, async (req, res) => {
  try {
    const { code, name, nativeName, icon, isDefault, active, sortOrder } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Mã ngôn ngữ và Tên ngôn ngữ là bắt buộc.' });
    }

    const newLang = await Language.create({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      nativeName: nativeName || '',
      icon: icon || 'ti ti-world',
      isDefault: !!isDefault,
      active: active !== undefined ? !!active : true,
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : 100,
    });

    res.status(201).json({ success: true, message: `Created language ${newLang.code}`, data: newLang });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

