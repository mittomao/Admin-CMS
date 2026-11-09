'use strict';

/**
 * Unit Test Suite for LanguageService (GĐ L1 / DEC-048)
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const languageService = require('../src/services/languageService');
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const branding = require('../src/config/branding');
const { ValidationError, ConflictError } = require('../src/utils/errors');

describe('GĐ L1 — LanguageService Unit Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // Ensure system structure
    await languageService.ensureSystemStructure();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    languageService.invalidateCache();
  });

  describe('1. Bootstrapping & ensureSystemStructure', () => {
    it('creates system templates and languages folder', async () => {
      const folder = await Item.findOne({ path: branding.PATHS.SYSTEM_LANGUAGES });
      expect(folder).not.toBeNull();
      expect(folder.name).toBe('Languages');

      const langTpl = await Template.findOne({ name: 'Language' });
      expect(langTpl).not.toBeNull();
      expect(langTpl.sections.some((s) => s.fields.some((f) => f.name === 'code'))).toBe(true);
    });

    it('returns default languages if no custom ones are registered', async () => {
      const list = await languageService.list({ enabledOnly: false });
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.some((l) => l.code === 'vi')).toBe(true);
      expect(list.some((l) => l.code === 'en')).toBe(true);
    });
  });

  describe('2. Language Creation & BCP 47 Validation', () => {
    it('successfully creates a valid language item', async () => {
      const created = await languageService.create({
        code: 'ja',
        displayName: 'Japanese',
        nativeName: '日本語',
        direction: 'ltr',
        enabled: true,
        sortOrder: 30,
      }, { username: 'test_admin' });

      expect(created.code).toBe('ja');
      expect(created.displayName).toBe('Japanese');
      expect(created.path).toBe(`${branding.PATHS.SYSTEM_LANGUAGES}/ja`);

      const fetched = await languageService.getByCode('ja');
      expect(fetched).not.toBeNull();
      expect(fetched.code).toBe('ja');
    });

    it('normalizes BCP 47 code case (e.g. fr-fr -> fr-FR)', async () => {
      const created = await languageService.create({
        code: 'fr-fr',
        displayName: 'French (France)',
        nativeName: 'Français',
      });

      expect(created.code).toBe('fr-FR');
    });

    it('rejects duplicate language codes (case-insensitive)', async () => {
      await expect(
        languageService.create({ code: 'JA', displayName: 'Japanese Duplicate' })
      ).rejects.toThrow(ConflictError);
    });

    it('rejects invalid BCP 47 code format', async () => {
      await expect(
        languageService.create({ code: 'invalid_code_123!!', displayName: 'Invalid' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('3. Language Update & Immutability Rules', () => {
    it('updates mutable fields such as displayName and direction', async () => {
      const updated = await languageService.update('ja', {
        displayName: 'Japanese Modern',
        direction: 'ltr',
        fallbackLanguage: 'en',
      }, { username: 'test_admin' });

      expect(updated.displayName).toBe('Japanese Modern');
      expect(updated.fallbackLanguage).toBe('en');
    });

    it('rejects attempts to modify the immutable code', async () => {
      await expect(
        languageService.update('ja', { code: 'jp' })
      ).rejects.toThrow(ValidationError);
    });

    it('rejects optimistic locking conflict (409)', async () => {
      const staleTime = new Date(Date.now() - 100000);
      await expect(
        languageService.update('ja', { displayName: 'Conflict' }, { expectedUpdatedAt: staleTime })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('4. Toggle Enable & Default Language Rules', () => {
    it('can disable and enable a non-default language', async () => {
      await languageService.setEnabled('ja', false);
      let ja = await languageService.getByCode('ja');
      expect(ja.enabled).toBe(false);

      const enabledOnlyList = await languageService.list({ enabledOnly: true });
      expect(enabledOnlyList.some((l) => l.code === 'ja')).toBe(false);

      await languageService.setEnabled('ja', true);
      ja = await languageService.getByCode('ja');
      expect(ja.enabled).toBe(true);
    });

    it('cannot disable the system default language', async () => {
      const def = await languageService.getDefault();
      await expect(
        languageService.setEnabled(def.code, false)
      ).rejects.toThrow(ValidationError);
    });

    it('can change system default language to another enabled language', async () => {
      await languageService.setDefault('en', { username: 'test_admin' });
      const currentDefault = await languageService.getDefault();
      expect(currentDefault.code).toBe('en');

      // Revert back to vi
      await languageService.setDefault('vi', { username: 'test_admin' });
      const reverted = await languageService.getDefault();
      expect(reverted.code).toBe('vi');
    });

    it('cannot set a disabled language as default', async () => {
      await languageService.setEnabled('ja', false);
      await expect(
        languageService.setDefault('ja')
      ).rejects.toThrow(ValidationError);
      await languageService.setEnabled('ja', true);
    });
  });

  describe('5. Fallback Chain & Circular Reference Protection', () => {
    it('computes fallback chain without loops', async () => {
      await languageService.update('ja', { fallbackLanguage: 'en' });
      await languageService.update('en', { fallbackLanguage: 'vi' });

      const chain = await languageService.getFallbackChain('ja');
      expect(chain).toEqual(['ja', 'en', 'vi']);
    });

    it('handles circular fallback reference gracefully and terminates', async () => {
      // Temporarily simulate a circular chain: vi -> en -> ja -> vi
      await languageService.update('vi', { fallbackLanguage: 'en' });
      await languageService.update('en', { fallbackLanguage: 'ja' });
      await languageService.update('ja', { fallbackLanguage: 'vi' });

      const chain = await languageService.getFallbackChain('vi');
      // Should not infinite loop and should not repeat visited codes
      expect(chain.length).toBeLessThanOrEqual(4);
      expect(new Set(chain).size).toBe(chain.length);

      // Clean up fallback for vi
      await languageService.update('vi', { fallbackLanguage: '' });
    });
  });

  describe('6. Language Usage & Safe Deletion', () => {
    it('prevents deleting the default language', async () => {
      await expect(
        languageService.delete('vi')
      ).rejects.toThrow(ValidationError);
    });

    it('prevents deleting a language that is in use by items', async () => {
      // Create a dummy item with ja version
      await Item.create({
        name: 'Test JA Page',
        path: '/root/content/test-ja-page',
        parentId: null,
        templateId: new mongoose.Types.ObjectId(),
        languages: [{
          code: 'ja',
          versions: [{ version: 1, workflowState: null }],
        }],
      });

      const usage = await languageService.getUsage('ja');
      expect(usage.total).toBeGreaterThan(0);

      await expect(
        languageService.delete('ja')
      ).rejects.toThrow(ValidationError);

      // Clean up dummy item
      await Item.deleteOne({ path: '/root/content/test-ja-page' });
    });

    it('successfully deletes an unused non-default language', async () => {
      const unused = await languageService.create({
        code: 'ko',
        displayName: 'Korean',
        nativeName: '한국어',
      });
      expect(unused.code).toBe('ko');

      await languageService.delete('ko');
      const fetched = await languageService.getByCode('ko');
      expect(fetched).toBeNull();
    });
  });
});
