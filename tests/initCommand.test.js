'use strict';

/**
 * initCommand.test.js
 * Kiểm thử toàn diện lệnh khởi tạo dự án mới một bước (treecraft init - One-Step Bootstrap)
 * Tuân thủ DEC-056, DEC-057 (Giai đoạn S2 - Làm lại)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const sitePaths = require('../src/config/sitePaths');
const {
  initSite,
  generateSecurePassword,
  isInsideGitRepo,
} = require('../src/services/initService');
const { validateSiteConfig } = require('../src/config/siteConfigSchema');

describe('GĐ S2: Lệnh Khởi Tạo Dự Án Mới Một Bước (treecraft init)', () => {
  const realCoreDir = sitePaths.getCoreDir();
  const testOutputDir = path.join(os.tmpdir(), `treecraft-init-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(testOutputDir, { recursive: true });
    // Tạo giả lập .git trong testOutputDir để thỏa mãn tiền điều kiện Git repo
    fs.mkdirSync(path.join(testOutputDir, '.git'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
    sitePaths.resetCache();
  });

  describe('1. Kiểm Tra Tiền Điều Kiện & Helper Functions', () => {
    test('generateSecurePassword sinh mật khẩu có độ dài 16 ký tự an toàn', () => {
      const pwd = generateSecurePassword();
      expect(pwd).toHaveLength(16);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
    });

    test('isInsideGitRepo phát hiện chính xác thư mục có hoặc không có .git', () => {
      expect(isInsideGitRepo(testOutputDir)).toBe(true);
      const nonGitDir = path.join(os.tmpdir(), `treecraft-non-git-${Date.now()}`);
      fs.mkdirSync(nonGitDir, { recursive: true });
      try {
        expect(isInsideGitRepo(nonGitDir)).toBe(false);
      } finally {
        fs.rmSync(nonGitDir, { recursive: true, force: true });
      }
    });

    test('Báo lỗi rõ ràng nếu yêu cầu starter khác ngoài "corporate"', async () => {
      const targetSiteDir = path.join(testOutputDir, 'site');
      await expect(
        initSite({
          targetDir: targetSiteDir,
          starter: 'unsupported-starter-xyz',
          skipDb: true,
        })
      ).rejects.toThrow('Starter "unsupported-starter-xyz" không được hỗ trợ');
    });

    test('Báo lỗi rõ ràng nếu thư mục không nằm trong một Git repository', async () => {
      const nonGitDir = path.join(os.tmpdir(), `treecraft-nogit-${Date.now()}`);
      fs.mkdirSync(nonGitDir, { recursive: true });
      const targetSiteDir = path.join(nonGitDir, 'site');

      try {
        await expect(
          initSite({
            targetDir: targetSiteDir,
            skipDb: true,
          })
        ).rejects.toThrow('Thư mục hiện tại không nằm trong một Git repository');
      } finally {
        fs.rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('2. Khởi Tạo Khung Dự Án & Tính Idempotent (Chống ghi đè)', () => {
    test('Cờ --dry-run không tạo bất kỳ file hay thư mục nào trên đĩa', async () => {
      const targetSiteDir = path.join(testOutputDir, 'dry-run-site');
      const res = await initSite({
        targetDir: targetSiteDir,
        name: 'Dry Run Site',
        skipDb: true,
        dryRun: true,
      });

      expect(res.success).toBe(true);
      expect(fs.existsSync(targetSiteDir)).toBe(false);
    });

    test('Khởi tạo thành công đầy đủ khung thư mục, cấu hình, docker-compose và serialization', async () => {
      const targetSiteDir = path.join(testOutputDir, 'full-site');
      const res = await initSite({
        targetDir: targetSiteDir,
        name: 'Beta Enterprise',
        root: 'root',
        dbPrefix: 'beta_enterprise',
        defaultLanguage: 'vi',
        languages: ['vi', 'en'],
        skipDb: true,
      });

      expect(res.projectName).toBe('Beta Enterprise');

      // 1. Kiểm tra site.config.js
      const configPath = path.join(targetSiteDir, 'site.config.js');
      expect(fs.existsSync(configPath)).toBe(true);
      const generatedConfig = require(configPath);
      const validation = validateSiteConfig(generatedConfig);
      expect(validation.valid).toBe(true);
      expect(generatedConfig.projectName).toBe('Beta Enterprise');
      expect(generatedConfig.mongoDbMaster.development).toBe('beta_enterprise_master');

      // 2. Kiểm tra .env.development & .env
      const envDevPath = path.join(targetSiteDir, '.env.development');
      expect(fs.existsSync(envDevPath)).toBe(true);
      const envContent = fs.readFileSync(envDevPath, 'utf8');
      expect(envContent).toContain('beta_enterprise_master');
      expect(envContent).toMatch(/SESSION_SECRET=[a-f0-9]{64}/);
      expect(envContent).toMatch(/BACKUP_ENCRYPTION_KEY=[a-f0-9]{64}/);

      // 3. Kiểm tra .env.staging.example và .env.production.example
      expect(fs.existsSync(path.join(targetSiteDir, '.env.staging.example'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, '.env.production.example'))).toBe(true);

      // 4. Kiểm tra docker-compose.dev.yml
      const composePath = path.join(targetSiteDir, 'docker-compose.dev.yml');
      expect(fs.existsSync(composePath)).toBe(true);
      const composeContent = fs.readFileSync(composePath, 'utf8');
      expect(composeContent).toContain('127.0.0.1:27017:27017');
      expect(composeContent).toContain('beta_enterprise');

      // 5. Kiểm tra views, public, serialization (bao gồm Contents)
      expect(fs.existsSync(path.join(targetSiteDir, 'views', 'layouts', 'HomeLayout.ejs'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'views', 'errors', '404.ejs'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'public', 'css', 'tailwind.css'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'serialization', 'Templates'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'serialization', 'Contents', 'Contents.yml'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'serialization', 'Contents', 'home', 'home.yml'))).toBe(true);
      expect(fs.existsSync(path.join(targetSiteDir, 'serialization', 'Contents', 'about-us', 'about-us.yml'))).toBe(true);

      // 6. Kiểm tra package.json và .gitignore
      const pkgPath = path.join(targetSiteDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(pkg.name).toBe('beta_enterprise');
      expect(pkg.scripts.dev).toBe('treecraft dev');
      expect(pkg.scripts.start).toBe('treecraft start');
      expect(pkg.scripts['db:up']).toBe('treecraft db:up');

      const gitignorePath = path.join(targetSiteDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('.env');
      expect(gitignoreContent).toContain('backups/*');
    });

    test('Chạy lại lần 2 (Idempotent): Giữ nguyên file người dùng đã chỉnh sửa, không ghi đè', async () => {
      const targetSiteDir = path.join(testOutputDir, 'idempotent-site');

      // Khởi tạo lần 1
      await initSite({
        targetDir: targetSiteDir,
        name: 'Initial Site',
        skipDb: true,
      });

      // Người dùng chỉnh sửa một file view
      const customViewFile = path.join(targetSiteDir, 'views', 'custom-user-view.ejs');
      fs.writeFileSync(customViewFile, '<h1>User Custom Content</h1>', 'utf8');

      // Người dùng sửa site.config.js
      const configPath = path.join(targetSiteDir, 'site.config.js');
      const originalConfigContent = fs.readFileSync(configPath, 'utf8');
      const modifiedConfigContent = originalConfigContent.replace('Initial Site', 'Modified Initial Site');
      fs.writeFileSync(configPath, modifiedConfigContent, 'utf8');

      // Khởi tạo lần 2 trên cùng thư mục
      const res = await initSite({
        targetDir: targetSiteDir,
        name: 'Attempted Overwrite Site',
        skipDb: true,
      });

      expect(res.success).toBe(true);

      // File view tự tạo vẫn còn nguyên
      expect(fs.existsSync(customViewFile)).toBe(true);
      expect(fs.readFileSync(customViewFile, 'utf8')).toBe('<h1>User Custom Content</h1>');

      // File site.config.js không bị ghi đè lại
      expect(fs.readFileSync(configPath, 'utf8')).toContain('Modified Initial Site');
      expect(fs.readFileSync(configPath, 'utf8')).not.toContain('Attempted Overwrite Site');
    });
  });

  describe('3. CLI Integration Tests for "treecraft init"', () => {
    test('Chạy CLI init từ thư mục khác sinh site hợp lệ và doctor đạt PASSED', () => {
      const binPath = path.join(realCoreDir, 'bin', 'treecraft.js');
      const targetSiteDir = path.join(testOutputDir, 'cli-site');

      const output = execSync(
        `node "${binPath}" init "${targetSiteDir}" --name "Gamma Corp" --db-prefix "gamma_corp" --skip-db`,
        {
          cwd: testOutputDir,
          encoding: 'utf8',
        }
      );

      expect(output).toContain('KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "Gamma Corp"');
      expect(fs.existsSync(path.join(targetSiteDir, 'site.config.js'))).toBe(true);

      // Chạy doctor trên site mới
      const doctorOutput = execSync(`node "${binPath}" doctor --site "${targetSiteDir}"`, {
        cwd: testOutputDir,
        encoding: 'utf8',
      });
      expect(doctorOutput).toContain('10 bài kiểm tra đạt, 0 bài kiểm tra thất bại.');
      expect(doctorOutput).not.toContain('[FAIL]');
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
        cwd: testOutputDir,
      });

      const afterFiles = getCoreSnapshot();
      expect(afterFiles).toEqual(beforeFiles);
    });
  });
});
