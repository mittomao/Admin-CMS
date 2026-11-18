'use strict';

/**
 * Backup, Disaster Recovery & Safe Restore Integration Suite (GĐ 12 / TST-03, Task 12.A3)
 * Verifies the complete disaster recovery workflow:
 * 1. Seed initial content item in Master
 * 2. Create encrypted NDJSON backup with SHA-256 checksums
 * 3. Simulate accidental deletion or corrupted migration
 * 4. Restore database from backup
 * 5. Verify database integrity is 100% restored
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const os = require('os');

const Item = require('../src/models/Item');
const Template = require('../src/models/Template');
const backupService = require('../src/services/backupService');
const RestoreEngine = require('../src/services/backup/restoreEngine');
const LocalStorageProvider = require('../src/services/backup/LocalStorageProvider');

describe('Backup & Restore Disaster Recovery Integration (Task 12.A3)', () => {
  let mongoServer;
  let testBackupDir;
  let sampleTemplate;
  let sampleItem;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-test-'));
    backupService.storage = new LocalStorageProvider(testBackupDir);
    backupService.restoreEngine = new RestoreEngine(backupService.storage);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  test('performs full disaster recovery lifecycle: Backup -> Accidental Deletion -> Restore -> Verification', async () => {
    // 1. Create baseline data
    sampleTemplate = await Template.create({
      name: 'DRTemplate',
      path: '/root/templates/DRTemplate',
      sections: [],
    });

    sampleItem = await Item.create({
      name: 'critical-doc',
      path: '/root/content/critical-doc',
      templateId: sampleTemplate._id,
      deleted: false,
      languages: [
        {
          code: 'vi',
          versions: [
            {
              version: 1,
              fields: {
                title: 'Tài liệu Tối mật',
                content: 'Dữ liệu kinh doanh quan trọng.',
              },
            },
          ],
        },
      ],
    });

    expect(sampleItem).not.toBeNull();

    // 2. Create backup
    const backupResult = await backupService.createBackup({
      label: 'pre-migration-backup',
      engine: 'ndjson',
    });

    expect(backupResult).toBeDefined();
    expect(backupResult.backupId).toBeDefined();

    // Verify backup integrity
    const verifyResult = await backupService.verifyBackup(backupResult.backupId);
    expect(verifyResult.passed).toBe(true);

    // 3. Simulate catastrophic disaster (accidental drop / corruption)
    await Item.deleteMany({});
    await Template.deleteMany({});

    const itemsAfterDisaster = await Item.find({});
    expect(itemsAfterDisaster).toHaveLength(0);

    // 4. Execute In-Place Disaster Recovery Restore
    const currentDbName = mongoose.connection.db.databaseName;
    const restoreResult = await backupService.restoreBackup(backupResult.backupId, {
      mode: 'in-place',
      force: true,
      confirmDbName: currentDbName,
    });

    expect(restoreResult).toBeDefined();
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.mode).toBe('in-place');

    // 5. Verify database integrity is 100% recovered
    const recoveredItem = await Item.findOne({ name: 'critical-doc' });
    expect(recoveredItem).not.toBeNull();
    expect(recoveredItem.path).toBe('/root/content/critical-doc');
    expect(recoveredItem.languages[0].versions[0].fields.get('title')).toBe('Tài liệu Tối mật');

    const recoveredTemplate = await Template.findOne({ name: 'DRTemplate' });
    expect(recoveredTemplate).not.toBeNull();
  });
});
