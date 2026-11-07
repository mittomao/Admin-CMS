const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const webItemService = require('./webItemService');
const presentationService = require('./presentationService');
const versionService = require('./versionService');
const itemService = require('./itemService');
const renderCache = require('../utils/renderCache');
const { resolveRichText } = require('../utils/richTextHelper');
const { AppError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');
const env = require('../config/env');

const VIEWS_SITE_DIR = path.resolve(__dirname, '../views/site');

class SiteRenderer {
  constructor() {
    this.viewsSiteDir = VIEWS_SITE_DIR;
  }

  /**
   * Validate and resolve safe viewPath inside src/views/site (DEC-033)
   * @param {string} rawViewPath 
   * @returns {string} Absolute file path
   */
  resolveSafeViewPath(rawViewPath) {
    if (!rawViewPath || typeof rawViewPath !== 'string') {
      throw new AppError('View path is required', 400);
    }

    let normalized = rawViewPath.trim().replace(/\\/g, '/');
    if (normalized.startsWith('site/')) {
      normalized = normalized.substring(5);
    } else if (normalized.startsWith('/site/')) {
      normalized = normalized.substring(6);
    }

    if (!normalized.endsWith('.ejs')) {
      normalized += '.ejs';
    }

    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new AppError(`Path traversal or absolute view path is forbidden: ${rawViewPath}`, 403);
    }

    const resolved = path.resolve(this.viewsSiteDir, normalized);

    // Whitelist check
    if (!resolved.startsWith(this.viewsSiteDir)) {
      throw new AppError(`Access forbidden: view path outside allowed site views directory: ${rawViewPath}`, 403);
    }

    if (!fs.existsSync(resolved)) {
      throw new NotFoundError(`View template file not found on disk: ${normalized}`);
    }

    return resolved;
  }

  /**
   * Render a public page or admin preview page
   * @param {object} item 
   * @param {string} lang 
   * @param {object} options { isPreview, req, res }
   * @returns {Promise<{ html: string, etag: string, fromCache?: boolean }>}
   */
  async render(item, lang = 'vi', options = {}) {
    if (!item) {
      throw new AppError('Item is required for rendering', 400);
    }

    const code = (lang || 'vi').toLowerCase();
    const isPreview = Boolean(options.isPreview);

    // 1. In-Memory Cache Check (Only for public requests)
    let cacheKey = null;
    if (!isPreview) {
      const languages = Array.isArray(item.languages) ? item.languages : [];
      const langEntry = languages.find((l) => l.code === code);
      const pubVersion = langEntry?.publishedVersion || 1;

      cacheKey = renderCache.createKey(item._id, code, pubVersion);
      const cached = renderCache.get(cacheKey);
      if (cached) {
        return {
          html: cached.html,
          etag: cached.etag,
          fromCache: true,
        };
      }
    }

    // 2. Resolve Presentation & Fields
    let presentation = null;
    let resolvedFieldsData = null;

    if (isPreview) {
      // Preview reads from Master Database
      const targetVersion = item.version || 1;
      presentation = await presentationService.getFinalPresentation(item._id, code, targetVersion);
      const resolved = await versionService.resolveFields(item, code, targetVersion);
      resolvedFieldsData = {
        itemId: item._id,
        path: item.path,
        name: item.name,
        displayName: item.displayName || item.name,
        language: code,
        fields: {
          ...(resolved.fields || {}),
          ...(options.previewFields || {}),
        },
      };
    } else {
      // Public Site reads from Web Database
      presentation = await webItemService.getFinalPresentation(item, code);
      resolvedFieldsData = await webItemService.resolveFields(item, code);
    }

    const pageFields = resolvedFieldsData.fields || {};

    // 3. Resolve Navigation Items (Child pages of Home or /sitecore/content)
    const navItems = await this.resolveNavItems(isPreview);

    // 4. View Helpers
    const helpers = {
      field: (fieldName, fallback = '') => {
        const val = pageFields[fieldName];
        return val !== undefined && val !== null && val !== '' ? val : fallback;
      },
      richText: (htmlContent) => {
        if (!htmlContent) return '';
        return resolveRichText(htmlContent, {
          resolveItemLink: (targetId) => `/item/${targetId}`,
          resolveMediaLink: (mediaId) => `/media/file/${mediaId}`,
        });
      },
      imageUrl: (mediaVal, _preset = 'f_auto,q_auto') => {
        if (!mediaVal) return '';
        if (typeof mediaVal === 'string') return mediaVal;
        return mediaVal.secure_url || mediaVal.url || '';
      },
      link: (targetId) => {
        if (!targetId) return '#';
        return `/item/${targetId}`;
      },
      navItems: () => navItems,
      site: {
        name: 'Sitecore XM Website',
        startItem: '/sitecore/content/Home',
        host: options.req?.headers?.host || 'localhost:4000',
      },
      lang: code,
      item,
      fields: pageFields,
      isPreview,
    };

    // 5. Placeholder Rendering Function
    const renderPlaceholder = async (placeholderKey) => {
      const renderings = presentation.placeholders?.[placeholderKey] || [];
      if (!renderings.length) return '';

      const renderedHtmlBlocks = [];

      for (const rendering of renderings) {
        try {
          // Resolve Component View Path
          const componentViewPath = this.resolveSafeViewPath(rendering.viewPath);

          // Resolve Datasource if defined
          let datasourceFields = null;
          if (rendering.datasourceId) {
            datasourceFields = await this.resolveDatasourceFields(rendering.datasourceId, code, isPreview);
          }

          // Component Fields: Datasource fields override or fallback to page fields
          const componentFields = datasourceFields ? { ...pageFields, ...datasourceFields } : pageFields;

          // Component Execution Context
          const componentContext = {
            ...helpers,
            item,
            fields: componentFields,
            datasource: datasourceFields,
            params: rendering.parameters || {},
            rendering,
            placeholder: renderPlaceholder,
          };

          const html = await ejs.renderFile(componentViewPath, componentContext, {
            async: true,
            views: [this.viewsSiteDir],
          });

          renderedHtmlBlocks.push(html);
        } catch (err) {
          logger.error(`[SiteRenderer] Component render error [${rendering.name || 'Component'}]: ${err.message}`, {
            renderingId: rendering.renderingId,
            placeholder: placeholderKey,
            viewPath: rendering.viewPath,
            stack: err.stack,
          });

          // Error Boundary (DEC-033)
          if (env.isDev || isPreview) {
            renderedHtmlBlocks.push(`
              <div class="site-component-error" style="border: 1px dashed #f87171; background-color: #fef2f2; color: #991b1b; padding: 12px; margin: 8px 0; border-radius: 6px; font-family: monospace; font-size: 12px;">
                <strong>⚠️ Component Error:</strong> ${rendering.displayName || rendering.name} (${rendering.viewPath})<br>
                <span style="color: #7f1d1d;">${err.message}</span>
              </div>
            `);
          } else {
            renderedHtmlBlocks.push(`<!-- Error rendering component: ${rendering.name || 'Component'} -->`);
          }
        }
      }

      return renderedHtmlBlocks.join('\n');
    };

    // 6. Resolve Layout View Path
    const layoutView = presentation.layout?.viewPath || 'layouts/HomeLayout.ejs';
    const layoutPath = this.resolveSafeViewPath(layoutView);

    // 7. Render Layout Template
    const layoutContext = {
      ...helpers,
      placeholders: presentation.placeholders || {},
      placeholder: renderPlaceholder,
    };

    let renderedHtml = await ejs.renderFile(layoutPath, layoutContext, {
      async: true,
      views: [this.viewsSiteDir],
    });

    // 8. Inject Preview Banner for Admin Preview Mode
    if (isPreview) {
      const bannerHtml = `
        <div id="sitecorePreviewBanner" style="position: sticky; top: 0; z-index: 999999; background: #0f172a; color: #f8fafc; padding: 10px 16px; border-bottom: 3px solid #ef4444; font-family: system-ui, -apple-system, sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #ef4444; color: #fff; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Preview</span>
            <strong>Sitecore XM Preview Mode</strong>
            <span style="background: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #cbd5e1;">Master Store</span>
            <span style="color: #94a3b8; font-size: 11px;">${item.path} [${code.toUpperCase()}]</span>
          </div>
          <div>
            <a href="/admin/content-editor/${item._id}" style="color: #60a5fa; text-decoration: none; font-weight: 500; font-size: 12px; display: flex; align-items: center; gap: 4px;">
              ← Back to Content Editor
            </a>
          </div>
        </div>
      `;

      if (renderedHtml.includes('<body')) {
        renderedHtml = renderedHtml.replace(/(<body[^>]*>)/i, `$1\n${bannerHtml}`);
      } else {
        renderedHtml = bannerHtml + '\n' + renderedHtml;
      }
    }

    // 9. Cache Result (if public)
    let etag = '';
    if (cacheKey) {
      etag = renderCache.set(cacheKey, renderedHtml);
    }

    return {
      html: renderedHtml,
      etag,
      fromCache: false,
    };
  }

  /**
   * Resolve Datasource Item Fields
   */
  async resolveDatasourceFields(datasourceId, lang, isPreview) {
    try {
      if (isPreview) {
        const dsItem = await itemService.getById(datasourceId);
        if (!dsItem) return null;
        return dsItem.fields instanceof Map ? Object.fromEntries(dsItem.fields) : (dsItem.fields || {});
      } else {
        const dsItem = await webItemService.getById(datasourceId);
        if (!dsItem) return null;
        const resolved = await webItemService.resolveFields(dsItem, lang);
        return resolved.fields || {};
      }
    } catch (err) {
      logger.warn(`[SiteRenderer] Failed to resolve datasource ${datasourceId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Resolve navigation items for header/menu
   */
  async resolveNavItems(isPreview) {
    try {
      let homeNode = null;
      if (isPreview) {
        homeNode = await itemService.getByPath('/sitecore/content/Home');
      } else {
        homeNode = await webItemService.getByPath('/sitecore/content/Home');
      }

      if (!homeNode) return [];

      let children = [];
      if (isPreview) {
        children = await itemService.getChildren(homeNode._id);
      } else {
        children = await webItemService.getChildren(homeNode._id);
      }

      return children.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        displayName: c.displayName || c.name,
        path: c.path,
        url: '/' + c.name.toLowerCase().replace(/\s+/g, '-'),
      }));
    } catch {
      return [];
    }
  }
}

module.exports = new SiteRenderer();
