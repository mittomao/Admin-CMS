'use strict';

/**
 * Backup Service & Engine Test Suite (GĐ K1 / DEC-051)
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LocalStorageProvider = require('../src/services/backup/LocalStorageProvider');
const NdjsonEngine = require('../src/services/backup/NdjsonEngine');
const backupService = require('../src/services/backupService');
const BackupJob = require('../src/models/BackupJob');
const { ValidationError } = require('../src/utils/errors');

describe('GĐ K1 — BackupService & Storage Provider', () => {
  let mongoServer;
  let testBackupDir;

  beforeAll(async () => {
    testBackupDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-svc-test-'));

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    // Switch backup storage to our temporary test directory
    backupService.storage = new LocalStorageProvider(testBackupDir);
    await backupService.init();

    // Populate some sample collections in mongo
    const db = mongoose.connection.db;
    await db.collection('items_master').insertMany([
      { name: 'Root Item', path: '/root', createdAt: new Date() },
      { name: 'Home Item', path: '/root/content/home', createdAt: new Date() },
    ]);
    await db.collection('items_web').insertOne({
      name: 'Home Item',
      path: '/root/content/home',
      publishedAt: new Date(),
    });
    await db.collection('sessions').insertOne({
      _id: 'temp-session-id',
      expires: new Date(),
    });
  });

  afterAll(async () => {
    backupService.stopScheduler();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (testBackupDir) {
      await fsp.rm(testBackupDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('LocalStorageProvider Path Traversal Defense', () => {
    test('rejects backupId with directory traversal characters', () => {
      const storage = new LocalStorageProvider(testBackupDir);
      expect(() => storage.validateBackupId('../etc')).toThrow(ValidationError);
      expect(() => storage.validateBackupId('backup/traversal')).toThrow(ValidationError);
      expect(() => storage.validateBackupId('backup;rm -rf')).toThrow(ValidationError);
      expect(() => storage.resolveSafePath('../../hack')).toThrow(ValidationError);
    });

    test('accepts valid backupId characters (alphanumeric, dashes, underscores)', () => {
      const storage = new LocalStorageProvider(testBackupDir);
      const validId = 'backup-20261110-120000_abc123';
      expect(storage.validateBackupId(validId)).toBe(validId);
    });
  });

  describe('NdjsonEngine BSON Streaming & Exclusion', () => {
    test('exports collections to compressed ndjson with BSON types intact', async () => {
      const db = mongoose.connection.db;
      const ndjson = new NdjsonEngine(db);
      const dumpDir = path.join(testBackupDir, 'ndjson-test-run');
      await fsp.mkdir(dumpDir, { recursive: true });

      const meta = await ndjson.backup(dumpDir, { excludeAuditLogs: false });

      // Sessions should be automatically excluded
      const sessionEntry = meta.find((m) => m.name === 'sessions');
      expect(sessionEntry).toBeUndefined();

      // items_master should be present
      const itemsMasterEntry = meta.find((m) => m.name === 'items_master');
      expect(itemsMasterEntry).toBeDefined();
      expect(itemsMasterEntry.count).toBe(2);
      expect(itemsMasterEntry.file).toBe('items_master.ndjson.gz');
      expect(itemsMasterEntry.checksum).toHaveLength(64);
    });
  });

  describe('BackupService Full Flow', () => {
    let createdBackupId1;
    let createdBackupId2;

    test('creates full database backup successfully with manifest', async () => {
      const result = await backupService.createBackup({
        note: 'Test Full Backup',
        type: 'full',
        engine: 'ndjson', // Force NDJSON for deterministic test environment
        user: { username: 'test-admin' },
      });

      expect(result.success).toBe(true);
      expect(result.backupId).toMatch(/^backup-[\d-]+-[a-f0-9]+$/);
      createdBackupId1 = result.backupId;

      const manifest = result.manifest;
      expect(manifest.projectName).toBe('Treecraft');
      expect(manifest.rootPath).toBe('/root');
      expect(manifest.collections.length).toBeGreaterThanOrEqual(2);

      // Verify DB record created
      const job = await BackupJob.findOne({ backupId: createdBackupId1 });
      expect(job).not.toBeNull();
      expect(job.status).toBe('Success');
      expect(job.initiatedByUsername).toBe('test-admin');
    });

    test('verifies integrity of created backup successfully', async () => {
      const report = await backupService.verifyBackup(createdBackupId1);
      expect(report.passed).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.filesVerified).toBeGreaterThan(0);
    });

    test('detects tampered/corrupted file during verification', async () => {
      const backupDir = await backupService.storage.getBackupDir(createdBackupId1);
      const targetFile = path.join(backupDir, 'data', 'items_master.ndjson.gz');

      // Tamper with file
      if (fs.existsSync(targetFile)) {
        await fsp.appendFile(targetFile, 'CORRUPTED_BYTES');
        const report = await backupService.verifyBackup(createdBackupId1);
        expect(report.passed).toBe(false);
        expect(report.errors.length).toBeGreaterThan(0);
      }
    });

    test('enforces Golden Rule: never deletes the only remaining backup', async () => {
      // First, delete everything except 1
      const backups = await backupService.listBackups();
      expect(backups.length).toBeGreaterThan(0);

      // If only 1 backup exists, attempting to delete it throws ValidationError
      if (backups.length === 1) {
        await expect(backupService.deleteBackup(backups[0].backupId)).rejects.toThrow(ValidationError);
      }
    });

    test('creates second backup and tests retention protection', async () => {
      const result2 = await backupService.createBackup({
        note: 'Second Backup',
        type: 'full',
        engine: 'ndjson',
      });
      createdBackupId2 = result2.backupId;

      const list = await backupService.listBackups();
      expect(list.length).toBeGreaterThanOrEqual(2);

      // Prune with dryRun should not delete
      const pruneDry = await backupService.pruneBackups({ retentionCount: 1, dryRun: true });
      expect(pruneDry.dryRun).toBe(true);
      expect(pruneDry.wouldPruneCount).toBeGreaterThanOrEqual(1);

      const listAfterDry = await backupService.listBackups();
      expect(listAfterDry.length).toBe(list.length);
    });
  });
});
