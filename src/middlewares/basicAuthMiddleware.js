'use strict';

/**
 * HTTP Basic Authentication Middleware for Public Site (GĐ B1 / DEC-046)
 * Enforces RFC 7617 authentication on public pages with rate limiting,
 * timing-safe checks, and emergency override capabilities.
 */

const path = require('path');
const ejs = require('ejs');
const basicAuthService = require('../services/basicAuthService');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getClientIp } = require('../utils/requestHelper');

const VIEWS_SITE_DIR = path.resolve(__dirname, '../views/site');

// In-Memory Brute-Force Rate Limiter Store: Map<key, { attempts, firstAttemptAt, lockedUntil }>
const rateLimitStore = new Map();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lockedUntil < now && now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Normalize IP addresses (strip IPv6 prefix if IPv4-mapped)
 */
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  let cleaned = String(ip).trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Check if IP matches an item in allowlist (supports exact match & IPv4 CIDR)
 */
function isIpInAllowlist(clientIp, allowlist = []) {
  if (!allowlist || allowlist.length === 0) return false;
  const targetIp = normalizeIp(clientIp);

  for (const item of allowlist) {
    const pattern = normalizeIp(item);
    if (!pattern) continue;

    // Exact match (127.0.0.1, ::1, etc.)
    if (targetIp === pattern) return true;

    // IPv4 CIDR check (e.g. 192.168.1.0/24)
    if (pattern.includes('/')) {
      const [range, bitsStr] = pattern.split('/');
      const bits = parseInt(bitsStr, 10);
      if (!isNaN(bits) && bits >= 0 && bits <= 32) {
        const mask = ~(2 ** (32 - bits) - 1);
        const ip2long = (ipStr) =>
          ipStr
            .split('.')
            .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);

        try {
          if (
            /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIp) &&
            /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(range)
          ) {
            if ((ip2long(targetIp) & mask) === (ip2long(range) & mask)) {
              return true;
            }
          }
        } catch {
          // Ignore invalid IP parsing
        }
      }
    }
  }

  return false;
}

/**
 * Render 401 Unauthorized Response (JSON for API, HTML for Admin pages)
 */
async function send401(res, realm, req = null) {
  res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.status(401);

  const isApi =
    req &&
    (req.path?.startsWith('/api') ||
      req.originalUrl?.startsWith('/api') ||
      Boolean(req.xhr) ||
      Boolean(req.headers?.accept?.includes('application/json')));

  if (isApi) {
    return res.json({
      success: false,
      message: 'Authentication Required (Basic Auth for Admin API)',
    });
  }

  try {
    const viewPath = path.resolve(VIEWS_SITE_DIR, 'errors/401.ejs');
    const fallbackPath = path.resolve(VIEWS_SITE_DIR, '401.ejs');
    const fs = require('fs');
    const fileToRender = fs.existsSync(viewPath) ? viewPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

    if (fileToRender) {
      const html = await ejs.renderFile(fileToRender, {
        title: '401 - Yêu Cầu Xác Thực Quản Trị',
        realm,
        lang: 'vi',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (err) {
    logger.warn(`[basicAuthMiddleware] Failed to render 401 view: ${err.message}`);
  }

  // Fallback simple HTML with Admin CMS branding
  const fallbackHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>401 - Yêu Cầu Xác Thực Quản Trị (Basic Auth)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc; }
    .card { max-width: 480px; padding: 2.5rem; background: #1e293b; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); text-align: center; }
    h1 { font-size: 1.25rem; font-weight: 700; color: #f87171; margin-top: 0; margin-bottom: 0.75rem; }
    p { font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: #334155; color: #38bdf8; margin-bottom: 1rem; }
    .btn { display: inline-block; padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; text-decoration: none; background: #0284c7; color: #ffffff; cursor: pointer; border: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">HTTP Basic Authentication &bull; RFC 7617</div>
    <h1>401 - Yêu Cầu Xác Thực Quản Trị</h1>
    <p>Phân vùng quản trị <strong>Treecraft CMS</strong> đang được bảo vệ. Vui lòng tải lại trang và đăng nhập bằng tài khoản Basic Auth hợp lệ.</p>
    <button onclick="location.reload()" class="btn">Thử lại</button>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(fallbackHtml);
}

/**
 * Basic Auth Middleware Factory / Handler
 */
const basicAuthMiddleware = async (req, res, next) => {
  // 1. Only intercept Admin CMS (/admin)
  // Public website (/, /:slug, /media/file/..., /site/...) and APIs are NEVER intercepted.
  const p = (req.originalUrl || req.url || req.path || '').toLowerCase().split('?')[0];
  if (!p.startsWith('/admin')) {
    return next();
  }

  // 2. Health check endpoint is always exempt
  if (p === '/health') {
    return next();
  }

  // 3. Emergency Override Check: If BASIC_AUTH_ENABLED=false in env, completely bypass
  if (process.env.BASIC_AUTH_ENABLED === 'false' || env.BASIC_AUTH_ENABLED === 'false') {
    return next();
  }

  try {
    // 4. Retrieve configuration
    const configData = await basicAuthService.getConfig({ sanitize: false });
    if (!configData.enabled) {
      return next();
    }

    const realm = configData.realm || 'Treecraft Admin Access';

    // 5. Path exclusion check
    const excludePaths = configData.excludePaths || ['/health'];
    const isExcluded = excludePaths.some((ex) => {
      const cleanEx = ex.toLowerCase();
      return p === cleanEx || p.startsWith(cleanEx.endsWith('/') ? cleanEx : `${cleanEx}/`);
    });

    if (isExcluded) {
      return next();
    }

    // 6. IP allowlist check
    const clientIp = getClientIp(req);
    if (isIpInAllowlist(clientIp, configData.ipAllowlist)) {
      return next();
    }

    // 7. Inspect Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return send401(res, realm, req);
    }

    // Header security checks
    if (authHeader.length > 512 || !authHeader.toLowerCase().startsWith('basic ')) {
      return send401(res, realm, req);
    }

    const base64Credentials = authHeader.substring(6).trim();
    let credentialsText = '';
    try {
      credentialsText = Buffer.from(base64Credentials, 'base64').toString('utf8');
    } catch {
      return send401(res, realm, req);
    }

    const colonIndex = credentialsText.indexOf(':');
    if (colonIndex === -1) {
      return send401(res, realm, req);
    }

    const username = credentialsText.substring(0, colonIndex);
    const password = credentialsText.substring(colonIndex + 1);

    if (!username) {
      return send401(res, realm, req);
    }

    // 7. Brute-force rate limiting check
    const rateLimitKey = `${clientIp}:${username.toLowerCase()}`;
    const now = Date.now();
    let rateEntry = rateLimitStore.get(rateLimitKey);

    if (!rateEntry || now - rateEntry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
      rateEntry = { attempts: 0, firstAttemptAt: now, lockedUntil: 0 };
      rateLimitStore.set(rateLimitKey, rateEntry);
    }

    if (rateEntry.lockedUntil > now) {
      const retryAfter = Math.ceil((rateEntry.lockedUntil - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('Cache-Control', 'no-store, private');
      return res.status(429).send(`Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${retryAfter} giây.`);
    }

    // 8. Authenticate credentials
    const isValid = await basicAuthService.authenticate(username, password);
    if (!isValid) {
      rateEntry.attempts += 1;
      if (rateEntry.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
        rateEntry.lockedUntil = now + RATE_LIMIT_LOCKOUT_MS;
        const retryAfter = Math.ceil(RATE_LIMIT_LOCKOUT_MS / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('Cache-Control', 'no-store, private');
        return res.status(429).send(`Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ${retryAfter} giây.`);
      }

      if (rateEntry.attempts === RATE_LIMIT_MAX_ATTEMPTS) {
        rateEntry.lockedUntil = now + RATE_LIMIT_LOCKOUT_MS;
      }

      return send401(res, realm, req);
    }

    // 9. Authentication successful
    rateLimitStore.delete(rateLimitKey);
    req.basicAuth = { username: username.toLowerCase() };
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    // Prevent CDN and public caches from storing authenticated HTML
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name, value) {
      if (name.toLowerCase() === 'cache-control') {
        value = 'private, no-cache, no-store, must-revalidate';
      }
      return originalSetHeader(name, value);
    };

    return next();
  } catch (err) {
    logger.error(`[basicAuthMiddleware] Error: ${err.message}`, { stack: err.stack });
    return next(err);
  }
};

// Export helper for testing purposes
basicAuthMiddleware.clearRateLimitStore = () => {
  rateLimitStore.clear();
};

module.exports = basicAuthMiddleware;
