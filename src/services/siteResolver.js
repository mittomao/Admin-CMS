const mongoose = require('mongoose');
const PublishedItem = require('../models/PublishedItem');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const branding = require('../config/branding');
const languageService = require('./languageService');

class SiteResolver {
  constructor() {
    this.startItemPath = process.env.SITE_START_ITEM || branding.PATHS.START_ITEM;
  }

  /**
   * Resolve an incoming URL path to a PublishedItem in the Web store
   * @param {string} rawUrl 
   * @param {object} options 
   * @returns {Promise<{ item: object, lang: string, cleanPath: string } | { redirect: string, statusCode: number }>}
   */
  async resolve(rawUrl, options = {}) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new NotFoundError('Invalid URL path');
    }

    // Fast-fail if MongoDB is not connected (e.g. unit/smoke tests without DB)
    if (mongoose.connection.readyState !== 1) {
      throw new NotFoundError('Database connection is not available');
    }

    // 1. Sanitize & Length Check
    let path = rawUrl.trim();
    if (path.length > 1000) {
      throw new AppError('URL exceeds maximum supported length', 414);
    }

    // Strip duplicate slashes
    path = path.replace(/\/+/g, '/');

    // Chặn Directory Traversal
    if (path.includes('..') || path.includes('\\')) {
      throw new AppError('Invalid path characters', 400);
    }

    // 2. Fetch enabled languages and default language from Web store (DEC-048)
    const enabledLanguages = await languageService.list({ enabledOnly: true, store: 'web' });
    const defaultLanguageObj = await languageService.getDefault({ store: 'web' });
    const defaultLangCode = options.defaultLang || defaultLanguageObj.code;

    // 3. Extract Language Prefix
    let lang = defaultLangCode;
    let cleanPath = path;

    const segments = path.split('/').filter(Boolean);
    let hasLangPrefix = false;
    if (segments.length > 0) {
      const firstSegment = segments[0].toLowerCase();
      const matchedLang = enabledLanguages.find(
        (l) => (l.urlPrefix && l.urlPrefix.toLowerCase() === firstSegment) || l.code.toLowerCase() === firstSegment
      );

      if (matchedLang) {
        lang = matchedLang.code;
        hasLangPrefix = true;
        // Remaining path after language prefix
        segments.shift();
        cleanPath = segments.length > 0 ? '/' + segments.join('/') : '/';
      }
    }

    // 4. Trailing Slash Check (DEC-034): 301 Redirect for non-root paths ending in /
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      const trimmedClean = cleanPath.replace(/\/+$/, '') || '/';
      const redirectTarget = hasLangPrefix ? `/${lang}${trimmedClean}` : trimmedClean;
      return { redirect: redirectTarget, statusCode: 301 };
    }

    // 4. Resolve Item Path from Segments (DEC-034)
    let candidatePaths = [];

    if (cleanPath === '/') {
      candidatePaths = [this.startItemPath];
      if (this.startItemPath !== '/root/content/Home') {
        candidatePaths.push('/root/content/Home');
      }
    } else {
      // Create segment search path (e.g. ['about-us', 'team'])
      const joinedSegments = segments.join('/');
      // Also try replacing hyphens with spaces for CMS Item names: 'about-us' -> 'about us'
      const spacedSegments = segments.map((s) => s.replace(/-/g, ' ')).join('/');

      const contentRoot = branding.PATHS.CONTENT;
      candidatePaths = [
        // Sibling under /root/content
        `${contentRoot}/${joinedSegments}`,
        `${contentRoot}/${spacedSegments}`,
        // Child under Start Item (e.g. /root/content/Home)
        `${this.startItemPath}/${joinedSegments}`,
        `${this.startItemPath}/${spacedSegments}`,
        // Backward compatibility fallback for /root/content
        `/root/content/${joinedSegments}`,
        `/root/content/${spacedSegments}`,
        `/root/content/Home/${joinedSegments}`,
        `/root/content/Home/${spacedSegments}`,
      ];
    }

    // 5. Query Web Store (PublishedItem) - Case Insensitive
    let item = null;
    for (const cPath of candidatePaths) {
      const escaped = cPath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      item = await PublishedItem.findOne({
        path: { $regex: new RegExp(`^${escaped}$`, 'i') },
        isDeleted: { $ne: true },
      }).lean();

      if (item) break;
    }

    // Fallback: Segment-by-segment hierarchical tree traversal starting from /root/content or /root/content
    if (!item && cleanPath !== '/') {
      item = await this.resolveHierarchically(segments);
    }

    if (!item) {
      logger.debug(`[SiteResolver] Item not found in Web store for URL: ${rawUrl} (cleanPath: ${cleanPath})`);
      throw new NotFoundError(`Page not found: ${rawUrl}`);
    }

    // 6. Validations
    // 6.1. Exclude System/Template/Media items from being rendered as pages
    const lowerPath = item.path.toLowerCase();
    if (
      lowerPath.startsWith(branding.PATHS.MEDIA.toLowerCase()) ||
      lowerPath.startsWith(branding.PATHS.TEMPLATES.toLowerCase()) ||
      lowerPath.startsWith(branding.PATHS.SYSTEM.toLowerCase()) ||
      lowerPath.startsWith(branding.PATHS.LAYOUT.toLowerCase()) ||
      lowerPath.startsWith('/root/media library') ||
      lowerPath.startsWith('/root/templates') ||
      lowerPath.startsWith('/root/system') ||
      lowerPath.startsWith('/root/layout')
    ) {
      throw new NotFoundError(`Path is not a public page: ${rawUrl}`);
    }

    // 6.2. Verify language is published for this item
    const languages = Array.isArray(item.languages) ? item.languages : [];
    const langEntry = languages.find((l) => l.code === lang.toLowerCase());
    if (!langEntry || !langEntry.publishedVersion || langEntry.publishedVersion <= 0) {
      throw new NotFoundError(`Language [${lang}] is not published for page: ${rawUrl}`);
    }

    // 6.3. Verify Ancestors are all published in Web Store
    await this.verifyPublishedAncestors(item);

    return {
      item,
      lang,
      cleanPath,
      rawUrl,
      publishedVersion: langEntry.publishedVersion,
    };
  }

  /**
   * Traverse segments hierarchically in items_web
   * @param {string[]} segments 
   * @returns {Promise<object|null>}
   */
  async resolveHierarchically(segments) {
    if (!segments || segments.length === 0) return null;

    // Start node: Content root (/root/content) or Start Item (/root/content/Home)
    let currentParent = await PublishedItem.findOne({
      path: { $regex: new RegExp(`^${this.startItemPath.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      isDeleted: { $ne: true },
    }).lean();

    if (!currentParent) {
      const contentRootEscaped = branding.PATHS.CONTENT.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      currentParent = await PublishedItem.findOne({
        path: { $regex: new RegExp(`^(${contentRootEscaped}|/root/content)$`, 'i') },
        isDeleted: { $ne: true },
      }).lean();
    }

    if (!currentParent) return null;

    let currentNode = currentParent;
    for (const segment of segments) {
      const normSegment = segment.replace(/-/g, ' ');
      const escapedNorm = normSegment.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedRaw = segment.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

      const child = await PublishedItem.findOne({
        parentId: currentNode._id,
        $or: [
          { name: { $regex: new RegExp(`^${escapedRaw}$`, 'i') } },
          { name: { $regex: new RegExp(`^${escapedNorm}$`, 'i') } },
        ],
        isDeleted: { $ne: true },
      }).lean();

      if (!child) return null;
      currentNode = child;
    }

    return currentNode;
  }

  /**
   * Verify all ancestors up to /root/content are published in Web Store
   * @param {object} item 
   */
  async verifyPublishedAncestors(item) {
    let currParentId = item.parentId;
    while (currParentId) {
      const parent = await PublishedItem.findOne({
        _id: currParentId,
        isDeleted: { $ne: true },
      }).lean();

      if (!parent) {
        throw new NotFoundError(`An ancestor of the item is not published or unavailable`);
      }

      // Stop once we reach /root/content or root
      if (parent.path === '/root/content' || parent.path === '/root' || !parent.parentId) {
        break;
      }

      currParentId = parent.parentId;
    }
  }
}

module.exports = new SiteResolver();
