'use strict';

const multer = require('multer');
const sanitizeHtml = require('sanitize-html');
const { sniffBuffer } = require('../utils/fileSniffer');
const AppError = require('../utils/AppError');

// Giới hạn dung lượng tối đa (mặc định 10MB)
const MAX_FILE_SIZE = parseInt(process.env.MEDIA_MAX_FILE_SIZE || `${10 * 1024 * 1024}`, 10);

// Cấu hình Multer lưu tạm trong memory để sniffer kiểm tra trước khi ghi ra đĩa
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20 // Tối đa 20 file mỗi lần upload
  }
});

/**
 * Whitelist các thuộc tính an toàn cho SVG
 */
const SVG_SANITIZE_OPTIONS = {
  allowedTags: [
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
    'polyline', 'polygon', 'text', 'tspan', 'defs', 'use',
    'clipPath', 'linearGradient', 'radialGradient', 'stop',
    'mask', 'pattern', 'desc', 'title'
  ],
  allowedAttributes: {
    '*': [
      'id', 'class', 'style', 'width', 'height', 'viewBox',
      'fill', 'fill-rule', 'fill-opacity',
      'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity',
      'transform', 'd', 'x', 'y', 'dx', 'dy', 'r', 'cx', 'cy', 'rx', 'ry',
      'x1', 'y1', 'x2', 'y2', 'points', 'offset', 'opacity', 'xmlns', 'xmlns:xlink'
    ]
  },
  disallowedTagsMode: 'discard'
};

/**
 * Middleware kiểm tra Magic Bytes và làm sạch SVG
 */
function validateUploadedFiles(req, res, next) {
  const files = [];

  if (req.file) {
    files.push(req.file);
  } else if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      // req.files dạng object theo fieldname
      for (const key of Object.keys(req.files)) {
        files.push(...req.files[key]);
      }
    }
  }

  if (files.length === 0) {
    return next();
  }

  for (const file of files) {
    const sniffResult = sniffBuffer(file.buffer);

    if (!sniffResult) {
      return next(
        new AppError(
          `Tệp tin "${file.originalname}" không thuộc định dạng được hỗ trợ hoặc bị hỏng chữ ký tệp.`,
          400
        )
      );
    }

    // Gán thông tin mime và extension thực tế dựa trên magic bytes
    file.detectedMime = sniffResult.mime;
    file.detectedExt = sniffResult.ext;

    // Nếu là file SVG, tiến hành sanitize loại trừ mã độc Stored XSS
    if (sniffResult.mime === 'image/svg+xml') {
      const rawSvg = file.buffer.toString('utf8');

      // Chặn ngay nếu có chứa script hoặc PHP injection
      if (/<script/i.test(rawSvg) || /<\?php/i.test(rawSvg) || /on\w+\s*=/i.test(rawSvg)) {
        const cleanSvg = sanitizeHtml(rawSvg, SVG_SANITIZE_OPTIONS);
        if (!cleanSvg || !cleanSvg.includes('<svg')) {
          return next(
            new AppError(`Tệp SVG "${file.originalname}" chứa mã độc hại và đã bị chặn.`, 400)
          );
        }
        file.buffer = Buffer.from(cleanSvg, 'utf8');
      }
    }
  }

  next();
}

module.exports = {
  upload,
  validateUploadedFiles,
  MAX_FILE_SIZE
};

