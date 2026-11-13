'use strict';

/**
 * initCommand.test.js
 * Kiểm thử toàn diện lệnh khởi tạo dự án mới (treecraft init) theo DEC-056 (GĐ S2)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const sitePaths = require('../src/config/sitePaths');
const { initSite } = require('../src/services/initService');
const { validateSiteConfig } = require('../src/config/siteConfigSchema');

describe('GĐ S2: Lệnh Khởi Tạo Dự Án Mới (treecraft init)', () => {
  const realCoreDir = sitePaths.getCoreDir();
  const testOutputDir = path.join(os.tmpdir(), `treecraft-init-test-${Date.now()}`);

  afterEach(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
    sitePaths.resetCache();
  });

  describe('1. initService Unit Tests', () => {
    test('Báo lỗi nếu Starter template không tồn tại', async () => {
      await expect(
        initSite({
          targetDir: testOutputDir,
          starter: 'non-existent-starter-12345',
          skipDb: true,
        })
      ).rejects.toThrow('Không tìm thấy Starter Template');
    });

    test('Chặn ghi đè thư mục đích nếu đã có file và không truyền force: true', async () => {
      fs.mkdirSync(testOutputDir, { recursive: true });
      fs.writeFileSync(path.join(testOutputDir, 'existing.txt'), 'hello', 'utf8');

      await expect(
        initSite({
          targetDir: testOutputDir,
          force: false,
          skipDb: true,
        })
      ).rejects.toThrow('đã tồn tại và không rỗng');
    });

    test('Khởi tạo thành công đầy đủ cây thư mục và file cấu hình', async () => {
      const res = await initSite({
        targetDir: testOutputDir,
        name: 'Beta Enterprise',
        root: 'root',
        dbPrefix: 'beta_enterprise',
        defaultLanguage: 'vi',
        languages: ['vi', 'en'],
        skipDb: true,
      });

      expect(res.projectName).toBe('Beta Enterprise');

      // 1. Kiểm tra site.config.js
      const configPath = path.join(testOutputDir, 'site.config.js');
      expect(fs.existsSync(configPath)).toBe(true);
      const generatedConfig = require(configPath);
      const validation = validateSiteConfig(generatedConfig);
      expect(validation.valid).toBe(true);
      expect(generatedConfig.projectName).toBe('Beta Enterprise');
      expect(generatedConfig.mongoDbMaster.development).toBe('beta_enterprise_master');

      // 2. Kiểm tra .env.development & .env
      const envDevPath = path.join(testOutputDir, '.env.development');
      expect(fs.existsSync(envDevPath)).toBe(true);
      const envContent = fs.readFileSync(envDevPath, 'utf8');
      expect(envContent).toContain('beta_enterprise_master');
      expect(envContent).toMatch(/SESSION_SECRET=[a-f0-9]{64}/);
      expect(envContent).toMatch(/BACKUP_ENCRYPTION_KEY=[a-f0-9]{64}/);

      // 3. Kiểm tra views, public, serialization
      expect(fs.existsSync(path.join(testOutputDir, 'views', 'layouts', 'HomeLayout.ejs'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'views', 'errors', '404.ejs'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'public', 'css', 'tailwind.css'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'serialization', 'Templates'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'backups', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputDir, 'extensions', '.gitkeep'))).toBe(true);

      // 4. Kiểm tra package.json
      const pkgPath = path.join(testOutputDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.name).toBe('beta_enterprise');
      expect(pkg.scripts.dev).toBe('treecraft dev');
      expect(pkg.scripts.start).toBe('treecraft start');
    });
  });

  describe('2. CLI Integration Tests for "treecraft init"', () => {
    test('Chạy CLI init từ thư mục khác sinh site hợp lệ và doctor đạt 10/10 PASS', () => {
      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      const targetSiteDir = path.join(testOutputDir, 'cli-site');

      const output = execSync(
        `node "${binPath}" init "${targetSiteDir}" --name "Gamma Corp" --db-prefix "gamma_corp" --skip-db`,
        {
          cwd: os.tmpdir(),
          encoding: 'utf8',
        }
      );

      expect(output).toContain('KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "Gamma Corp"');
      expect(fs.existsSync(path.join(targetSiteDir, 'site.config.js'))).toBe(true);

      // Chạy doctor trên site mới
      const doctorOutput = execSync(`node "${binPath}" doctor --site "${targetSiteDir}"`, {
        cwd: os.tmpdir(),
        encoding: 'utf8',
      });
      expect(doctorOutput).toContain('10 bài kiểm tra đạt, 0 bài kiểm tra thất bại.');
    });

    test('Lệnh init tuyệt đối không tạo mới hay sửa đổi bất kỳ file nào trong thư mục Core', () => {
      function getCoreSnapshot() {
        const files = [];
        function walk(d) {
          const entries = fs.readdirSync(d, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'site') continue;
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else {
              files.push(path.relative(realCoreDir, full));
            }
          }
        }
        walk(realCoreDir);
        return files.sort();
      }

      const beforeFiles = getCoreSnapshot();

      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      const targetSiteDir = path.join(testOutputDir, 'immutability-site');
      execSync(`node "${binPath}" init "${targetSiteDir}" --name "Delta Test" --skip-db`, {
        cwd: os.tmpdir(),
      });

      const afterFiles = getCoreSnapshot();
      expect(afterFiles).toEqual(beforeFiles);
    });
  });
});

