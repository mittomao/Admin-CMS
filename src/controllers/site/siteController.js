const path = require('path');
const ejs = require('ejs');
const siteResolver = require('../../services/siteResolver');
const siteRenderer = require('../../services/siteRenderer');
const PublishedItem = require('../../models/PublishedItem');
const { NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const env = require('../../config/env');

const VIEWS_SITE_DIR = path.resolve(__dirname, '../../views/site');

class SiteController {
  /**
   * Main Public Site Request Handler (GET / and GET /*)
   */
  async renderPage(req, res, next) {
    // 1. Method check: only GET and HEAD are allowed on public pages
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).send('Method Not Allowed');
    }

    // 2. Collision guard: System and admin routes must never fall through here
    const p = req.path.toLowerCase();
    if (
      p.startsWith('/admin') ||
      p.startsWith('/api') ||
      p.startsWith('/media') ||
      p.startsWith('/health')
    ) {
      return next();
    }

    try {
      // 3. Resolve URL to published item
      const resolution = await siteResolver.resolve(req.path);

      // Handle 301 Redirect for trailing slashes or aliases
      if (resolution.redirect) {
        return res.redirect(resolution.statusCode || 301, resolution.redirect);
      }

      const { item, lang } = resolution;

      // 4. Render HTML
      const { html, etag } = await siteRenderer.render(item, lang, { req, res });

      // 5. ETag / 304 Handling
      if (etag) {
        res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.send(html);
    } catch (err) {
      if (err instanceof NotFoundError || err.statusCode === 404) {
        return this.render404(req, res, err.message);
      }

      logger.error(`[SiteController] Rendering error on ${req.path}: ${err.message}`, {
        path: req.path,
        stack: err.stack,
      });

      return this.render500(req, res, err);
    }
  }

  /**
   * Render custom 404 Not Found Page for Site
   */
  async render404(req, res, message = 'Trang bạn yêu cầu không tồn tại hoặc đã bị gỡ bỏ.') {
    try {
      const viewPath = path.resolve(VIEWS_SITE_DIR, 'errors/404.ejs');
      const fallbackPath = path.resolve(VIEWS_SITE_DIR, '404.ejs');
      const fileToRender = require('fs').existsSync(viewPath) ? viewPath : fallbackPath;

      const html = await ejs.renderFile(fileToRender, {
        title: '404 - Trang Không Tồn Tại',
        message,
        url: req.path,
        lang: 'vi',
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(html);
    } catch {
      return res.status(404).send('<h1>404 - Trang Không Tồn Tại</h1><p>Nội dung này không tồn tại trên hệ thống.</p>');
    }
  }

  /**
   * Render custom 500 Server Error Page for Site
   */
  async render500(req, res, err) {
    try {
      const viewPath = path.resolve(VIEWS_SITE_DIR, 'errors/500.ejs');
      if (require('fs').existsSync(viewPath)) {
        const html = await ejs.renderFile(viewPath, {
          title: '500 - Lỗi Máy Chủ Nội Bộ',
          message: 'Hệ thống đang gặp sự cố tạm thời khi xử lý yêu cầu của bạn.',
          error: env.isDev ? err : null,
          url: req.path,
          lang: 'vi',
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(500).send(html);
      }
    } catch {
      // Fallback below
    }

    return res.status(500).send('<h1>500 - Lỗi Máy Chủ Nội Bộ</h1><p>Đã xảy ra lỗi trong quá trình kết xuất trang.</p>');
  }

  /**
   * Serve dynamic robots.txt
   */
  getRobotsTxt(req, res) {
    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const content = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      `Sitemap: ${protocol}://${host}/sitemap.xml`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(content);
  }

  /**
   * Serve dynamic sitemap.xml for all published public pages
   */
  async getSitemapXml(req, res, next) {
    try {
      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;

      // Query all published pages from Web Store
      const publishedPages = await PublishedItem.find({
        path: { $regex: /^\/sitecore\/content/i },
        isDeleted: { $ne: true },
      }).lean();

      const urls = [
        `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      ];

      for (const item of publishedPages) {
        if (item.path === '/sitecore/content/Home' || item.path === '/sitecore/content') continue;
        const slug = item.name.toLowerCase().replace(/\s+/g, '-');
        const lastMod = item.publishedAt ? new Date(item.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        urls.push(`  <url>\n    <loc>${baseUrl}/${slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
      }

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls.join('\n'),
        '</urlset>',
      ].join('\n');

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(xml);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new SiteController();

