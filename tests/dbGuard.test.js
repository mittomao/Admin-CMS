/**
 * dbGuard.test.js
 * Kiểm thử toàn diện chốt chặn an toàn database dbGuard (DEC-052 / Phase E1)
 */

const dbGuard = require('../src/config/dbGuard');

describe('dbGuard - Phân loại Host và Chốt chặn Kết nối', () => {
  describe('classifyHost()', () => {
    it('nhận diện đúng các địa chỉ local', () => {
      expect(dbGuard.classifyHost('mongodb://127.0.0.1:27017/admin_cms')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://localhost:27017/admin_cms')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://localhost/admin_cms')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://127.0.0.1:27017/admin_cms?replicaSet=rs0')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://mongo:27017/admin_cms')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://127.0.0.2:27017/admin_cms')).toBe('local');
      expect(dbGuard.classifyHost('mongodb://myhost.local:27017/admin_cms')).toBe('local');
    });

    it('nhận diện đúng các địa chỉ remote và cloud', () => {
      expect(dbGuard.classifyHost('mongodb+srv://admin:pass@cluster0.abcde.mongodb.net/admin_cms')).toBe('remote');
      expect(dbGuard.classifyHost('mongodb://user:pass@192.168.1.100:27017/admin_cms')).toBe('remote');
      expect(dbGuard.classifyHost('mongodb://db.treecraft.com:27017/admin_cms')).toBe('remote');
      expect(dbGuard.classifyHost('')).toBe('remote');
      expect(dbGuard.classifyHost(null)).toBe('remote');
    });
  });

  describe('maskUri()', () => {
    it('che giấu mật khẩu trong chuỗi kết nối an toàn', () => {
      const masked1 = dbGuard.maskUri('mongodb+srv://admin_user:SuperSecretPassword123@cluster.mongodb.net/admin_cms');
      expect(masked1).not.toContain('SuperSecretPassword123');
      expect(masked1).toContain('//admin_user:****@');

      const masked2 = dbGuard.maskUri('mongodb://user:myPass@127.0.0.1:27017/admin_cms');
      expect(masked2).not.toContain('myPass');
      expect(masked2).toContain('//user:****@');
    });
  });

  describe('extractDatabaseName()', () => {
    it('trích xuất chính xác tên database từ URI', () => {
      expect(dbGuard.extractDatabaseName('mongodb://127.0.0.1:27017/admin_cms?replicaSet=rs0')).toBe('admin_cms');
      expect(dbGuard.extractDatabaseName('mongodb+srv://user:pass@cluster.mongodb.net/admin_cms')).toBe('admin_cms');
      expect(dbGuard.extractDatabaseName('mongodb://127.0.0.1:27017/custom_db')).toBe('custom_db');
      expect(dbGuard.extractDatabaseName('')).toBe('admin_cms');
    });
  });

  describe('validateConnection()', () => {
    it('từ chối kết nối remote trong môi trường development khi chưa bật allowRemoteInDev', () => {
      const remoteUri = 'mongodb+srv://user:pass@cluster.mongodb.net/admin_cms';
      expect(() => {
        dbGuard.validateConnection(remoteUri, 'development', { allowRemoteInDev: false });
      }).toThrow(/Chặn kết nối: Môi trường "development" không được phép kết nối tới database Remote\/Cloud/);
    });

    it('cho phép kết nối remote trong development khi có cờ allowRemoteInDev=true', () => {
      const remoteUri = 'mongodb+srv://user:pass@cluster.mongodb.net/admin_cms';
      const result = dbGuard.validateConnection(remoteUri, 'development', { allowRemoteInDev: true });
      expect(result.hostType).toBe('remote');
    });

    it('cho phép kết nối local trong môi trường development', () => {
      const localUri = 'mongodb://127.0.0.1:27017/admin_cms';
      const result = dbGuard.validateConnection(localUri, 'development');
      expect(result.hostType).toBe('local');
    });

    it('từ chối kết nối local trong môi trường production', () => {
      const localUri = 'mongodb://127.0.0.1:27017/admin_cms';
      expect(() => {
        dbGuard.validateConnection(localUri, 'production');
      }).toThrow(/Môi trường "production" không được phép kết nối tới MongoDB Local/);
    });
  });

  describe('assertSafeFor()', () => {
    it('chặn hoàn toàn lệnh destructive trên host remote', () => {
      expect(() => {
        dbGuard.assertSafeFor('destructive', {
          uri: 'mongodb+srv://user:pass@cluster.mongodb.net/admin_cms',
          appEnv: 'development',
          scriptName: 'seed:reset',
        });
      }).toThrow(/BỊ CẤM TUYỆT ĐỐI trên máy chủ Remote\/Cloud/);
    });

    it('chặn hoàn toàn lệnh destructive trong môi trường production kể cả local', () => {
      expect(() => {
        dbGuard.assertSafeFor('destructive', {
          uri: 'mongodb://127.0.0.1:27017/admin_cms',
          appEnv: 'production',
          scriptName: 'seed:reset',
        });
      }).toThrow(/BỊ CẤM TUYỆT ĐỐI trong môi trường "production"/);
    });

    it('cho phép lệnh destructive trên host local trong môi trường development', () => {
      expect(() => {
        dbGuard.assertSafeFor('destructive', {
          uri: 'mongodb://127.0.0.1:27017/admin_cms',
          appEnv: 'development',
          scriptName: 'seed:reset',
        });
      }).not.toThrow();
    });

    it('yêu cầu cờ xác nhận khi chạy restore/migration trên remote', () => {
      expect(() => {
        dbGuard.assertSafeFor('restore', {
          uri: 'mongodb+srv://user:pass@cluster.mongodb.net/admin_cms',
          appEnv: 'staging',
          scriptName: 'backup:restore',
          confirmedRemote: false,
        });
      }).toThrow(/--confirm-remote/);

      expect(() => {
        dbGuard.assertSafeFor('restore', {
          uri: 'mongodb+srv://user:pass@cluster.mongodb.net/admin_cms',
          appEnv: 'staging',
          scriptName: 'backup:restore',
          confirmedRemote: true,
        });
      }).not.toThrow();
    });
  });

  describe('verifyFingerprint()', () => {
    it('phát hiện và từ chối khi môi trường ghi nhận không khớp', async () => {
      const mockDb = {
        collection: () => ({
          findOne: async () => ({
            key: 'environmentFingerprint',
            value: {
              appEnv: 'production',
              taggedBy: 'admin',
              taggedAt: new Date(),
            },
          }),
        }),
      };

      await expect(
        dbGuard.verifyFingerprint(mockDb, 'development', { uri: 'mongodb://127.0.0.1:27017/admin_cms' })
      ).rejects.toThrow(/\[dbGuard MISMATCH\]/);
    });

    it('thông qua khi môi trường ghi nhận khớp chính xác', async () => {
      const mockDb = {
        collection: () => ({
          findOne: async () => ({
            key: 'environmentFingerprint',
            value: {
              appEnv: 'development',
              taggedBy: 'admin',
              taggedAt: new Date(),
            },
          }),
        }),
      };

      const result = await dbGuard.verifyFingerprint(mockDb, 'development', { uri: 'mongodb://127.0.0.1:27017/admin_cms' });
      expect(result.appEnv).toBe('development');
    });
  });

  describe('getEnvironmentBadge()', () => {
    it('trả về metadata badge chính xác cho từng môi trường', () => {
      const devBadge = dbGuard.getEnvironmentBadge('development');
      expect(devBadge.label).toBe('DEV (LOCAL)');
      expect(devBadge.isLocal).toBe(true);

      const stagingBadge = dbGuard.getEnvironmentBadge('staging');
      expect(stagingBadge.label).toBe('STAGING (CLOUD)');
      expect(stagingBadge.isLocal).toBe(false);

      const prodBadge = dbGuard.getEnvironmentBadge('production');
      expect(prodBadge.label).toBe('PRODUCTION');
      expect(prodBadge.isLocal).toBe(false);
    });
  });
});

