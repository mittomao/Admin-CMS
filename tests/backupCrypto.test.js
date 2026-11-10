'use strict';

/**
 * Backup Crypto & Hashing Test Suite (GĐ K1 / DEC-051)
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const BackupCrypto = require('../src/services/backup/backupCrypto');

describe('GĐ K1 — BackupCrypto (AES-256-GCM & SHA-256)', () => {
  const secretKey = 'test-super-secret-backup-encryption-key-32chars!';
  let tempDir;

  beforeAll(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'crypto-test-'));
  });

  afterAll(async () => {
    if (tempDir) {
      await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('SHA-256 Checksum Calculation', () => {
    test('calculates correct SHA-256 for buffer and string', () => {
      const data = 'Hello Treecraft Backup!';
      const hash = BackupCrypto.calculateSha256(data);
      expect(hash).toHaveLength(64);
      expect(BackupCrypto.calculateSha256(Buffer.from(data))).toBe(hash);
    });

    test('calculates correct SHA-256 for file on disk', async () => {
      const testFile = path.join(tempDir, 'hash-sample.txt');
      const content = 'Comprehensive database backup integrity test';
      await fsp.writeFile(testFile, content);

      const fileHash = await BackupCrypto.calculateFileSha256(testFile);
      const strHash = BackupCrypto.calculateSha256(content);

      expect(fileHash).toBe(strHash);
    });
  });

  describe('AES-256-GCM Encryption & Decryption', () => {
    test('encrypts and decrypts buffer successfully', () => {
      const original = Buffer.from('Database Dump Sample: items_master, items_web, templates');
      const encrypted = BackupCrypto.encryptBuffer(original, secretKey);

      expect(encrypted).not.toEqual(original);
      expect(encrypted.length).toBeGreaterThan(original.length);

      const decrypted = BackupCrypto.decryptBuffer(encrypted, secretKey);
      expect(decrypted.toString()).toBe(original.toString());
    });

    test('fails to decrypt with incorrect key', () => {
      const original = Buffer.from('Confidential admin data');
      const encrypted = BackupCrypto.encryptBuffer(original, secretKey);

      expect(() => {
        BackupCrypto.decryptBuffer(encrypted, 'wrong-key-attempt');
      }).toThrow();
    });

    test('fails to decrypt if ciphertext is tampered with', () => {
      const original = Buffer.from('Integrity protected payload');
      const encrypted = BackupCrypto.encryptBuffer(original, secretKey);

      // Mutate one byte in ciphertext
      encrypted[20] = encrypted[20] ^ 0xff;

      expect(() => {
        BackupCrypto.decryptBuffer(encrypted, secretKey);
      }).toThrow();
    });

    test('encrypts and decrypts whole file with file streams', async () => {
      const srcFile = path.join(tempDir, 'sample-raw.json');
      const encFile = path.join(tempDir, 'sample-encrypted.bin');
      const decFile = path.join(tempDir, 'sample-restored.json');

      const fileContent = JSON.stringify({ item: 'Root', id: 12345, list: [1, 2, 3] }, null, 2);
      await fsp.writeFile(srcFile, fileContent);

      const encResult = await BackupCrypto.encryptFile(srcFile, encFile, secretKey);
      expect(encResult.checksum).toBeDefined();
      expect(fs.existsSync(encFile)).toBe(true);

      await BackupCrypto.decryptFile(encFile, decFile, secretKey);
      expect(fs.existsSync(decFile)).toBe(true);

      const restoredContent = await fsp.readFile(decFile, 'utf8');
      expect(restoredContent).toBe(fileContent);
    });
  });
});

