'use strict';

/**
 * Restore Engine Test Suite (GĐ K1 / DEC-051)
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LocalStorageProvider = require('../src/services/backup/LocalStorageProvider');
const RestoreEngine = require('../src/services/backup/restoreEngine');
const backupService = require('../src/services/backupService');
const maintenanceService = require('../src/services/maintenanceService');
const { ValidationError, ConflictError } = require('../src/utils/errors');

describe('GĐ K1 — RestoreEngine Preconditions & Execution', () => {
  let mongoServer;
  let testBackupDir;
  let backupId;

  beforeAll(async () => {
    testBackupDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'restore-test-'));

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());

    backupService.storage = new LocalStorageProvider(testBackupDir);
    await backupService.init();

    // Populate data
    const db = mongoose.connection.db;
    await db.collection('items_master').insertOne({
      name: 'Sample Item for Restore',
      path: '/root/content/sample',
      createdAt: new Date(),
    });

    // Create a backup
    const backupRes = await backupService.createBackup({
      note: 'Pre-restore test source',
      type: 'full',
      engine: 'ndjson',
    });
    backupId = backupRes.backupId;
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

  describe('Validation Preconditions', () => {
    test('rejects restore if backup is from a strictly newer app version', async () => {
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const futureManifest = {
        appVersion: '99.0.0',
        schemaVersion: 99,
      };

      await expect(
        restoreEngine.validatePreconditions(futureManifest, { mode: 'target-db', targetDb: 'new_db' })
      ).rejects.toThrow(ValidationError);
    });

    test('rejects in-place restore if maintenance mode is OFF', async () => {
      await maintenanceService.setMaintenanceMode(false);
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const manifest = { appVersion: '1.0.0', schemaVersion: 1 };
      const currentDb = mongoose.connection.db.databaseName;

      await expect(
        restoreEngine.validatePreconditions(manifest, {
          mode: 'in-place',
          confirmDbName: currentDb,
        })
      ).rejects.toThrow(ConflictError);
    });

    test('rejects in-place restore if confirmDbName does not match current db', async () => {
      await maintenanceService.setMaintenanceMode(true);
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const manifest = { appVersion: '1.0.0', schemaVersion: 1 };

      await expect(
        restoreEngine.validatePreconditions(manifest, {
          mode: 'in-place',
          confirmDbName: 'wrong_name_input',
        })
      ).rejects.toThrow(ValidationError);

      await maintenanceService.setMaintenanceMode(false);
    });

    test('rejects target-db mode with invalid database name', async () => {
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const manifest = { appVersion: '1.0.0', schemaVersion: 1 };

      await expect(
        restoreEngine.validatePreconditions(manifest, {
          mode: 'target-db',
          targetDb: 'invalid db;drop',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Restore Execution (Dry Run & Target DB)', () => {
    test('dry-run returns collections and records preview without writing', async () => {
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const result = await restoreEngine.executeRestore(backupId, {
        mode: 'target-db',
        targetDb: 'test_preview_db',
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.targetDb).toBe('test_preview_db');
      expect(result.totalCollections).toBeGreaterThan(0);
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(Array.isArray(result.collections)).toBe(true);
    });

    test('executes restore into target database successfully', async () => {
      const storage = new LocalStorageProvider(testBackupDir);
      const restoreEngine = new RestoreEngine(storage);

      const targetDbName = 'restored_target_test';
      const result = await restoreEngine.executeRestore(backupId, {
        mode: 'target-db',
        targetDb: targetDbName,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.targetDb).toBe(targetDbName);
      expect(result.totalRestored).toBeGreaterThan(0);

      // Verify data in target DB
      const targetDb = mongoose.connection.client.db(targetDbName);
      const restoredItems = await targetDb.collection('items_master').find().toArray();
      expect(restoredItems.length).toBeGreaterThan(0);
      expect(restoredItems[0].name).toBe('Sample Item for Restore');
    });
  });
});

