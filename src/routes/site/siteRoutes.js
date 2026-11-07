const express = require('express');
const siteController = require('../../controllers/site/siteController');

const router = express.Router();

// 1. Technical SEO Endpoints
router.get('/robots.txt', (req, res) => siteController.getRobotsTxt(req, res));
router.get('/sitemap.xml', (req, res, next) => siteController.getSitemapXml(req, res, next));

// 2. Public Site Page Delivery (Root and Catch-all)
router.get('/', (req, res, next) => siteController.renderPage(req, res, next));
router.get('/*', (req, res, next) => siteController.renderPage(req, res, next));

// 3. Strict HTTP Method Handling (405 Method Not Allowed)
router.all('/*', (req, res, next) => {
  // If request begins with admin, api, media, or health, pass down
  const p = req.path.toLowerCase();
  if (
    p.startsWith('/admin') ||
    p.startsWith('/api') ||
    p.startsWith('/media') ||
    p.startsWith('/health')
  ) {
    return next();
  }

  res.setHeader('Allow', 'GET, HEAD');
  return res.status(405).send('Method Not Allowed');
});

module.exports = router;

