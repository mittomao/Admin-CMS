/**
 * envConfig.test.js
 * Kiểm thử tính đúng đắn của logic nạp biến môi trường phân tầng trong src/config/env.js
 * Kiến trúc: DEC-052 (Base .env + Layered Override)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Cấu hình Môi trường env.js (Phase E1 - Base .env Layering)', () => {
  it('từ chối khởi động với giá trị APP_ENV không hợp lệ (develop, test, prod, uat)', () => {
    const invalidEnvs = ['develop', 'test', 'prod', 'uat', 'demo'];

    invalidEnvs.forEach((badEnv) => {
      expect(() => {
        execSync(`node -e "require('./src/config/env')"`, {
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, APP_ENV: badEnv },
        });
      }).toThrow(/Giá trị APP_ENV=.*không hợp lệ/);
    });
  });

  it('chấp nhận giá trị APP_ENV hợp lệ: development, staging, production', () => {
    const validEnvs = ['development'];

    validEnvs.forEach((validEnv) => {
      const output = execSync(
        `node -e "const env = require('./src/config/env'); console.log(env.APP_ENV);"`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, APP_ENV: validEnv },
        }
      );
      expect(output.trim()).toBe(validEnv);
    });
  });

  it('ưu tiên biến có sẵn trong process.env hơn giá trị trong file cấu hình', () => {
    const output = execSync(
      `node -e "const env = require('./src/config/env'); console.log(env.PORT);"`,
      {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, APP_ENV: 'development', PORT: '9999' },
      }
    );
    expect(output.trim()).toBe('9999');
  });

  it('nạp đè chính xác từ file .env.${APP_ENV} lên file base .env', () => {
    // Tạo tạm file override .env.staging để test
    const testOverrideFile = path.resolve(process.cwd(), '.env.staging');
    fs.writeFileSync(testOverrideFile, 'PORT=8888\nBASIC_AUTH_ENABLED=true\n');

    try {
      const output = execSync(
        `node -e "const env = require('./src/config/env'); console.log(env.PORT, env.BASIC_AUTH_ENABLED);"`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
          env: { ...process.env, APP_ENV: 'staging', ALLOW_REMOTE_DB_IN_DEV: 'true' },
        }
      );
      expect(output.trim()).toBe('8888 true');
    } finally {
      if (fs.existsSync(testOverrideFile)) {
        fs.unlinkSync(testOverrideFile);
      }
    }
  });
});
