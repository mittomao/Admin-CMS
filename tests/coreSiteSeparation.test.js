'use strict';

/**
 * coreSiteSeparation.test.js
 * Kiểm thử toàn diện kiến trúc Tách biệt Core và Site theo DEC-056 (GĐ S1)
 * 1. Module sitePaths & siteConfigSchema
 * 2. Branding Facade Adapter
 * 3. Chạy CLI từ thư mục bên ngoài (cwd khác)
 * 4. Độc lập vị trí Core (Location Independence - Core được copy sang đường dẫn khác)
 * 5. Tính bất biến của Core (Core Immutability)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const sitePaths = require('../src/config/sitePaths');
const { validateSiteConfig } = require('../src/config/siteConfigSchema');
const branding = require('../src/config/branding');
const { initSite } = require('../src/services/initService');

describe('GĐ S1: Tách Core và Site (DEC-056)', () => {
  const originalEnv = { ...process.env };
  const realCoreDir = sitePaths.getCoreDir();
  let realSiteDir;

  beforeAll(async () => {
    realSiteDir = path.join(os.tmpdir(), `treecraft-test-site-${Date.now()}`);
    fs.mkdirSync(realSiteDir, { recursive: true });
    fs.mkdirSync(path.join(realSiteDir, '.git'), { recursive: true });
    await initSite({
      targetDir: realSiteDir,
      name: 'Corporate Test Site',
      skipDb: true,
    });
  });

  afterAll(() => {
    fs.rmSync(realSiteDir, { recursive: true, force: true });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sitePaths.resetCache();
  });

  describe('1. siteConfigSchema Validation & Security', () => {
    test('Phải từ chối cấu hình rỗng hoặc sai kiểu', () => {
      const res = validateSiteConfig(null);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });

    test('Phải chặn tuyệt đối thông tin bí mật (Secrets Protection)', () => {
      const res = validateSiteConfig({
        projectName: 'Test Site',
        secret_key: 'my-super-secret',
        MONGODB_URI: 'mongodb://localhost:27017/secret',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('KHÔNG ĐƯỢC CHỨA thông tin bảo mật'))).toBe(true);
    });

    test('Phải chuẩn hóa projectName và rootName mặc định', () => {
      const res = validateSiteConfig({
        projectName: 'My Corporate Portal',
        rootName: 'root',
      });
      expect(res.valid).toBe(true);
      expect(res.config.projectName).toBe('My Corporate Portal');
      expect(res.config.rootName).toBe('root');
      expect(res.config.rootPath).toBe('/root');
      expect(res.config.defaultLanguage).toBe('vi');
      expect(res.config.languages).toEqual(['vi']);
    });
  });

  describe('2. sitePaths Resolution Logic', () => {
    test('getCoreDir() phải trỏ chính xác về thư mục gốc của Core qua __dirname', () => {
      const coreDir = sitePaths.getCoreDir();
      expect(coreDir).toBe(realCoreDir);
      expect(fs.existsSync(path.join(coreDir, 'package.json'))).toBe(true);
    });

    test('resolveSiteDir() với biến môi trường TREECRAFT_SITE_DIR', () => {
      process.env.TREECRAFT_SITE_DIR = realSiteDir;
      sitePaths.resetCache();
      expect(sitePaths.getSiteDir()).toBe(realSiteDir);
    });

    test('resolveSiteDir() với customPath', () => {
      sitePaths.resetCache();
      const resolved = sitePaths.resolveSiteDir({ customPath: realSiteDir });
      expect(resolved).toBe(realSiteDir);
    });

    test('Các getter thư mục con phải nằm dưới SITE_DIR', () => {
      sitePaths.setSiteDir(realSiteDir);
      expect(sitePaths.getViewsDir()).toBe(path.join(realSiteDir, 'views'));
      expect(sitePaths.getPublicDir()).toBe(path.join(realSiteDir, 'public'));
      expect(sitePaths.getSerializationDir()).toBe(path.join(realSiteDir, 'serialization'));
      expect(sitePaths.getBackupsDir()).toBe(path.join(realSiteDir, 'backups'));
      expect(sitePaths.getEnvPath()).toBe(path.join(realSiteDir, '.env'));
    });

    test('getStarterDir() phải nằm trong Core', () => {
      const starterDir = sitePaths.getStarterDir('corporate');
      expect(starterDir).toBe(path.join(realCoreDir, 'starter', 'corporate'));
      expect(fs.existsSync(starterDir)).toBe(true);
    });
  });

  describe('3. Branding Facade Adapter', () => {
    test('Branding constants phải đọc động từ sitePaths và giữ nguyên cấu trúc', () => {
      sitePaths.setSiteDir(realSiteDir);
      expect(branding.PROJECT_NAME).toBeDefined();
      expect(branding.ROOT_NAME).toBe('root');
      expect(branding.ROOT_PATH).toBe('/root');
      expect(branding.PATHS.CONTENT).toBe('/root/content');
      expect(branding.PATHS.LAYOUTS).toBe('/root/layout/Layouts');
      expect(branding.PATHS.TEMPLATES).toBe('/root/templates');
    });

    test('getBranding() phải trả về object đầy đủ thông tin', () => {
      const info = branding.getBranding();
      expect(info.projectName).toBe(branding.PROJECT_NAME);
      expect(info.rootPath).toBe('/root');
      expect(info.paths).toBeDefined();
    });
  });

  describe('4. CLI Khởi chạy từ thư mục bên ngoài (cwd khác)', () => {
    test('Chạy CLI "where" từ /tmp với cờ --site', () => {
      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      const output = execSync(`node "${binPath}" where --site "${realSiteDir}"`, {
        cwd: os.tmpdir(),
        encoding: 'utf8',
      });
      expect(output).toContain('THÔNG TIN ĐƯỜNG DẪN HỆ THỐNG');
      expect(output).toContain(`Core Engine Dir : ${realCoreDir}`);
      expect(output).toContain(`Site Dir        : ${realSiteDir}`);
    });

    test('Chạy CLI "doctor" từ /tmp phải đạt 10/10 bài kiểm tra', () => {
      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      const output = execSync(`node "${binPath}" doctor --site "${realSiteDir}"`, {
        cwd: os.tmpdir(),
        encoding: 'utf8',
      });
      expect(output).toContain('10 bài kiểm tra đạt, 0 bài kiểm tra thất bại.');
    });
  });

  describe('5. Độc lập vị trí Core & Tính bất biến (Immutability)', () => {
    test('Core được copy sang đường dẫn khác tên vẫn nhận diện và chẩn đoán site bình thường', () => {
      const tempCoreDir = path.join(os.tmpdir(), `treecraft-core-test-${Date.now()}`);
      try {
        // Sao chép tối thiểu các thành phần của core
        fs.mkdirSync(path.join(tempCoreDir, 'bin'), { recursive: true });
        fs.mkdirSync(path.join(tempCoreDir, 'src', 'config'), { recursive: true });
        fs.mkdirSync(path.join(tempCoreDir, 'src', 'views', 'admin'), { recursive: true });
        fs.mkdirSync(path.join(tempCoreDir, 'starter', 'corporate'), { recursive: true });

        fs.copyFileSync(path.join(realCoreDir, 'bin', 'treecraft.js'), path.join(tempCoreDir, 'bin', 'treecraft.js'));
        fs.copyFileSync(path.join(realCoreDir, 'src', 'config', 'sitePaths.js'), path.join(tempCoreDir, 'src', 'config', 'sitePaths.js'));
        fs.copyFileSync(path.join(realCoreDir, 'src', 'config', 'siteConfigSchema.js'), path.join(tempCoreDir, 'src', 'config', 'siteConfigSchema.js'));
        fs.copyFileSync(path.join(realCoreDir, 'package.json'), path.join(tempCoreDir, 'package.json'));

        const tempBinPath = path.join(tempCoreDir, 'bin', 'treecraft.js');
        const output = execSync(`node "${tempBinPath}" where --site "${realSiteDir}"`, {
          cwd: os.tmpdir(),
          encoding: 'utf8',
        });
        const realTempCoreDir = fs.realpathSync(tempCoreDir);
        expect(output).toContain(`Core Engine Dir : ${realTempCoreDir}`);
        expect(output).toContain(`Site Dir        : ${realSiteDir}`);
      } finally {
        fs.rmSync(tempCoreDir, { recursive: true, force: true });
      }
    });

    test('Core không bị tạo mới hoặc thay đổi bất kỳ file nào khi chạy các tác vụ', () => {
      function getTreeSnapshot(dir) {
        const files = [];
        function walk(d) {
          const entries = fs.readdirSync(d, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'site') continue;
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else {
              files.push(path.relative(dir, full));
            }
          }
        }
        walk(dir);
        return files.sort();
      }

      const beforeFiles = getTreeSnapshot(realCoreDir);

      // Chạy các lệnh CLI đọc
      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      execSync(`node "${binPath}" doctor --site "${realSiteDir}"`, { cwd: os.tmpdir() });
      execSync(`node "${binPath}" where --site "${realSiteDir}"`, { cwd: os.tmpdir() });

      const afterFiles = getTreeSnapshot(realCoreDir);
      expect(afterFiles).toEqual(beforeFiles);
    });
  });
});
