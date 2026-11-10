/**
 * dbInvariant.test.js
 * Kiểm tra các quy tắc bất biến về tên Database và Collection trong Phase E1
 * Kiến trúc: DEC-052 (Single .env.example & Invariant Database Name)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dbGuard = require('../src/config/dbGuard');

describe('Quy tắc Bất biến về Tên Database và Collections (Phase E1)', () => {
  const rootDir = process.cwd();

  it('duy nhất 1 file .env.example trong repo, không còn file .env.*.example dư thừa', () => {
    expect(fs.existsSync(path.join(rootDir, '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, '.env.development.example'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, '.env.staging.example'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, '.env.production.example'))).toBe(false);
  });

  it('tên database trong .env.example BẮT BUỘC là "admin_cms"', () => {
    const exampleConfig = dotenv.parse(fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8'));
    const dbName = dbGuard.extractDatabaseName(exampleConfig.MONGO_URI);
    expect(dbName).toBe('admin_cms');
  });

  it('tuyệt đối KHÔNG có hậu tố _dev, _uat, _prod trong tên database', () => {
    const exampleConfig = dotenv.parse(fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8'));
    const dbName = dbGuard.extractDatabaseName(exampleConfig.MONGO_URI);
    expect(dbName).not.toMatch(/_dev$/i);
    expect(dbName).not.toMatch(/_uat$/i);
    expect(dbName).not.toMatch(/_prod$/i);
    expect(dbName).not.toMatch(/_staging$/i);
    expect(dbName).not.toMatch(/_test$/i);
  });

  it('danh sách 19 collections baseline không chứa bất kỳ collection có hậu tố môi trường', () => {
    const baselineCollections = [
      'acl',
      'auditlogs',
      'backup_jobs',
      'backupjobs',
      'basic_auth_credentials',
      'items_master',
      'items_web',
      'languages',
      'launchpad_apps',
      'publish_histories',
      'publish_jobs',
      'publishhistories',
      'publishjobs',
      'recyclebin',
      'roles',
      'sessions',
      'settings',
      'templates',
      'users',
    ];

    expect(baselineCollections.length).toBe(19);

    baselineCollections.forEach((colName) => {
      expect(colName).not.toMatch(/_dev$/i);
      expect(colName).not.toMatch(/_uat$/i);
      expect(colName).not.toMatch(/_prod$/i);
    });
  });

  it('docker-compose.yml cấu hình đúng MongoDB 8.0, replica set rs0 và bind vào 127.0.0.1', () => {
    const filePath = fs.existsSync(path.join(rootDir, 'docker-compose.yml'))
      ? path.join(rootDir, 'docker-compose.yml')
      : path.join(rootDir, 'docker-compose.dev.yml');
    const composeContent = fs.readFileSync(filePath, 'utf8');
    expect(composeContent).toContain('image: mongo:8.0');
    expect(composeContent).toContain('--replSet');
    expect(composeContent).toContain('rs0');
    expect(composeContent).toContain('127.0.0.1:27017:27017');
    expect(composeContent).toContain('treecraft-mongo-dev-data');
  });
});
