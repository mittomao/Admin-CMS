'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AuditLog = require('../src/models/AuditLog');
const auditService = require('../src/services/auditService');
const eventBus = require('../src/utils/eventBus');

describe('GĐ 9 — auditService (DEC-045)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  test('auditService.log ghi log thành công và tự động làm sạch trường nhạy cảm', async () => {
    const doc = await auditService.log({
      action: 'TEST_ACTION',
      username: 'tester',
      details: {
        password: 'supersecretpassword',
        token: 'jwt.token.secret',
        normalField: 'safe value',
      },
    });

    expect(doc).toBeTruthy();
    expect(doc.details.normalField).toBe('safe value');
    expect(doc.details.password).toBe('[REDACTED]');
    expect(doc.details.token).toBe('[REDACTED]');
  });

  test('auditService.log tự động băm (hash) và cắt ngắn các trường text > 1000 ký tự', async () => {
    const longText = 'A'.repeat(2500);
    const doc = await auditService.log({
      action: 'LONG_PAYLOAD',
      username: 'tester',
      details: {
        content: longText,
      },
    });

    expect(doc.details.content).toContain('[TRUNCATED: length=2500');
    expect(doc.details.content).toContain('sha256=');
  });

  test('eventBus phát sự kiện item.deleted tự động kích hoạt tạo AuditLog', async () => {
    eventBus.emit('item.deleted', {
      userId: new mongoose.Types.ObjectId(),
      item: { _id: new mongoose.Types.ObjectId(), path: '/root/content/demo' },
      deletionBatchId: 'batch-123',
      deletedCount: 3,
    });

    // Đợi async microtask
    await new Promise((resolve) => setTimeout(resolve, 100));

    const log = await AuditLog.findOne({ action: 'ITEM_DELETE' });
    expect(log).toBeTruthy();
    expect(log.itemPath).toBe('/root/content/demo');
    expect(log.details.deletedCount).toBe(3);
  });

  test('auditService.exportCsv xuất dữ liệu chuẩn RFC 4180', async () => {
    await auditService.log({
      action: 'ITEM_UPDATE',
      username: 'author_user',
      itemPath: '/root/content/article',
      details: { summary: 'Cập nhật tiêu đề "Mới & Nổi bật"' },
    });

    const csv = await auditService.exportCsv();
    expect(csv).toContain('ITEM_UPDATE');
    expect(csv.includes('author_user')).toBe(true);
    expect(csv.includes('""Mới & Nổi bật""')).toBe(true); // Escaped quote
  });

  test('auditService.pruneExpired tỉa bỏ log hết hạn', async () => {
    // Tạo 1 log cũ hơn 100 ngày
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await AuditLog.create({
      action: 'OLD_ACTION',
      username: 'old_user',
      at: oldDate,
    });

    // Tạo 1 log mới hôm nay
    await AuditLog.create({
      action: 'NEW_ACTION',
      username: 'new_user',
      at: new Date(),
    });

    const pruneRes = await auditService.pruneExpired(90, false);
    expect(pruneRes.expiredCount).toBe(1);

    const remaining = await AuditLog.find({ action: { $ne: 'AUDIT_PRUNE' } });
    expect(remaining.length).toBe(1);
    expect(remaining[0].action).toBe('NEW_ACTION');
  });
});
