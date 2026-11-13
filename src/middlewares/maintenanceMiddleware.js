const path = require('path');
const fs = require('fs');
const maintenanceService = require('../services/maintenanceService');
const branding = require('../config/branding');
const sitePaths = require('../config/sitePaths');

/**
 * Middleware handling Maintenance Mode:
 * - Public Site: returns HTTP 503 Service Unavailable
 * - Admin CMS: blocks state-mutating requests (POST, PUT, DELETE) except backup/auth/maintenance endpoints
 */
async function maintenanceMiddleware(req, res, next) {
  try {
    const isMaintenance = await maintenanceService.isMaintenanceMode();
    res.locals.isMaintenanceMode = isMaintenance;

    if (!isMaintenance) {
      return next();
    }

    const pathLower = req.path.toLowerCase();

    // Whitelisted routes allowed during maintenance
    const isWhitelisted =
      pathLower.startsWith('/admin/login') ||
      pathLower.startsWith('/admin/logout') ||
      pathLower.startsWith('/admin/backups') ||
      pathLower.startsWith('/api/backups') ||
      pathLower.startsWith('/api/maintenance') ||
      pathLower.startsWith('/api/auth/login') ||
      pathLower.startsWith('/css/') ||
      pathLower.startsWith('/js/') ||
      pathLower.startsWith('/img/') ||
      pathLower.startsWith('/fonts/') ||
      pathLower === '/favicon.ico';

    if (isWhitelisted) {
      return next();
    }

    // Public Site request: render 503 view
    const isAdminOrApi = pathLower.startsWith('/admin') || pathLower.startsWith('/api');
    if (!isAdminOrApi) {
      res.setHeader('Retry-After', '300');
      res.status(503);
      const site503 = path.resolve(sitePaths.getViewsDir(), 'errors/503.ejs');
      if (fs.existsSync(site503)) {
        return res.render(site503, {
          title: `Hệ thống đang bảo trì - ${branding.PROJECT_NAME}`,
          branding,
          retryAfterSeconds: 300,
          layout: false,
        });
      }
      return res.render('admin/errors/503', {
        title: `Hệ thống đang bảo trì - ${branding.PROJECT_NAME}`,
        branding,
        retryAfterSeconds: 300,
        layout: false,
      });
    }

    // Admin / API request during maintenance:
    // GET requests allowed (read-only)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    // Mutating actions (POST, PUT, DELETE) blocked
    if (req.xhr || req.headers.accept?.includes('application/json') || pathLower.startsWith('/api/')) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: 'Hệ thống đang ở chế độ bảo trì để sao lưu/phục hồi dữ liệu. Mọi thao tác ghi tạm thời bị chặn.',
      });
    }

    return res.status(503).send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 24px; border: 1px solid #f59e0b; background: #fffbeb; border-radius: 8px;">
        <h2 style="color: #b45309; margin-top: 0;">Hệ thống đang ở chế độ bảo trì</h2>
        <p style="color: #78350f;">Thao tác ghi bị chặn để bảo đảm an toàn dữ liệu cơ sở dữ liệu. Vui lòng quay lại sau khi bảo trì hoàn tất.</p>
        <a href="/admin/backups" style="display: inline-block; padding: 8px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 4px;">Đến trang Sao lưu & Phục hồi</a>
      </div>
    `);
  } catch (err) {
    next(err);
  }
}

module.exports = maintenanceMiddleware;

