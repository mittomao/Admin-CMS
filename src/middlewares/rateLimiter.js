/**
 * Lightweight In-Memory Rate Limiter for Login Brute Force Defense (SEC-05)
 * Zero external dependencies, pure Node.js Map with sliding expiration window.
 */

const logger = require('../utils/logger');

class LoginRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxAttempts = options.maxAttempts || 5; // 5 attempts per window
    this.attempts = new Map(); // key -> { count, expiresAt }
  }

  getKey(req) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const username = req.body?.username ? req.body.username.trim().toLowerCase() : '';
    return `${ip}:${username}`;
  }

  isRateLimited(key) {
    const now = Date.now();
    const record = this.attempts.get(key);
    if (!record) return false;

    if (now > record.expiresAt) {
      this.attempts.delete(key);
      return false;
    }

    return record.count >= this.maxAttempts;
  }

  recordFailure(key) {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.expiresAt) {
      this.attempts.set(key, {
        count: 1,
        expiresAt: now + this.windowMs,
      });
    } else {
      record.count += 1;
    }
  }

  reset(key) {
    this.attempts.delete(key);
  }

  middleware() {
    return (req, res, next) => {
      // Skip rate limit in test environment unless explicitly enabled
      if (process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']) {
        return next();
      }

      const key = this.getKey(req);
      if (this.isRateLimited(key)) {
        logger.warn(`[RateLimit] Brute force block triggered for ${key}`);

        const isJson = req.xhr || req.headers.accept?.includes('application/json');
        if (isJson) {
          return res.status(429).json({
            success: false,
            message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
            code: 'TOO_MANY_REQUESTS',
          });
        }

        return res.status(429).render('admin/auth/login', {
          layout: 'layouts/auth',
          title: 'Treecraft Login',
          returnUrl: req.body?.returnUrl || '/admin/launchpad',
          error: 'Tài khoản tạm thời bị giới hạn do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.',
          username: req.body?.username || '',
        });
      }

      // Attach limiter helpers to req for authController
      req.loginRateLimiter = {
        key,
        recordFailure: () => this.recordFailure(key),
        reset: () => this.reset(key),
      };

      next();
    };
  }
}

const loginLimiter = new LoginRateLimiter();

module.exports = {
  LoginRateLimiter,
  loginLimiter,
};
