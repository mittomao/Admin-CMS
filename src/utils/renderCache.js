const crypto = require('crypto');
const eventBus = require('./eventBus');
const logger = require('./logger');

/**
 * In-Memory Render Cache for Public Site Pages (GĐ 10)
 * Key format: site:{itemId}:{lang}:{publishedVersion}
 */
class RenderCache {
  constructor() {
    this.cache = new Map();
    this.enabled = process.env.SITE_CACHE !== 'false';
    this.ttl = parseInt(process.env.SITE_CACHE_TTL || '300', 10) * 1000; // default 5 minutes
    this.maxItems = parseInt(process.env.SITE_CACHE_MAX_ITEMS || '500', 10);

    this.registerEventListeners();
  }

  /**
   * Register Event Bus listeners for automatic cache invalidation
   */
  registerEventListeners() {
    eventBus.on('item.published', ({ itemId }) => {
      if (itemId) {
        this.invalidateItem(itemId);
      }
    });

    eventBus.on('item.unpublished', ({ itemId }) => {
      if (itemId) {
        this.invalidateItem(itemId);
      }
    });

    eventBus.on('publish.job.finished', () => {
      this.clear();
      logger.info('[RenderCache] Cleared all cache entries after publish job finished.');
    });

    // Invalidate site render cache when languages or default language change (GĐ L1 / DEC-048)
    const clearOnLangEvent = (eventName) => {
      this.clear();
      logger.info(`[RenderCache] Cleared all cache entries after language event: ${eventName}.`);
    };

    eventBus.on('language.default.changed', () => clearOnLangEvent('language.default.changed'));
    eventBus.on('language.enabled', () => clearOnLangEvent('language.enabled'));
    eventBus.on('language.disabled', () => clearOnLangEvent('language.disabled'));
    eventBus.on('language.deleted', () => clearOnLangEvent('language.deleted'));
    eventBus.on('language.updated', () => clearOnLangEvent('language.updated'));
  }

  /**
   * Generate cache key
   * @param {string|object} itemId 
   * @param {string} lang 
   * @param {number|string} version 
   * @returns {string}
   */
  createKey(itemId, lang = 'vi', version = 1) {
    const id = typeof itemId === 'object' && itemId !== null ? itemId.toString() : String(itemId);
    return `site:${id}:${(lang || 'vi').toLowerCase()}:${version || 1}`;
  }

  /**
   * Get cached item
   * @param {string} key 
   * @returns {{ html: string, etag: string } | null}
   */
  get(key) {
    if (!this.enabled) return null;
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      html: entry.html,
      etag: entry.etag,
      createdAt: entry.createdAt,
    };
  }

  /**
   * Store rendered HTML in cache
   * @param {string} key 
   * @param {string} html 
   * @returns {string} Generated ETag
   */
  set(key, html) {
    if (!this.enabled || !key || typeof html !== 'string') return '';

    // Evict oldest if limit reached
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const etag = `W/"${crypto.createHash('md5').update(html).digest('hex')}"`;
    this.cache.set(key, {
      html,
      etag,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });

    return etag;
  }

  /**
   * Invalidate all cache entries for a specific itemId
   * @param {string|object} itemId 
   */
  invalidateItem(itemId) {
    if (!itemId) return;
    const idStr = typeof itemId === 'object' ? itemId.toString() : String(itemId);
    const prefix = `site:${idStr}:`;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.info(`[RenderCache] Invalidated ${count} entries for item ${idStr}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size() {
    return this.cache.size;
  }
}

module.exports = new RenderCache();
