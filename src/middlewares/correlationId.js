const crypto = require('crypto');

/**
 * Middleware gán và đồng bộ Correlation ID cho mỗi HTTP request (Task 12.E1)
 * Giúp theo dõi vết request xuyên suốt hệ thống và trong logs.
 */
function correlationIdMiddleware(req, res, next) {
  // Lấy correlation ID từ header request (nếu có từ proxy/gateway) hoặc sinh UUID mới
  const correlationId =
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    crypto.randomUUID();

  // Lưu trữ trên request và res.locals để dùng trong views & logging
  req.correlationId = correlationId;
  res.locals.correlationId = correlationId;

  // Thiết lập phản hồi header cho client
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}

module.exports = correlationIdMiddleware;
