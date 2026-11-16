#!/usr/bin/env node
'use strict';

/**
 * verify-fresh-install.js
 * Script kiểm tra tự động luồng repo mới "Submodule → Init → Dev" (DEC-058 / GĐ S4)
 * Thực hiện trong thư mục tạm của OS, đảm bảo không ảnh hưởng tới repo hiện tại.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const http = require('http');

async function main() {
  const coreDir = path.resolve(__dirname, '../..');
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'treecraft-verify-fresh-'));
  const testPort = 4015;
  let mongoServer = null;
  let devProcess = null;

  console.log('\n============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM TRA LUỒNG: SUBMODULE → INIT → DEV (GĐ S4)');
  console.log(`📁 Thư mục tạm OS: ${tmpRepo}`);
  console.log('============================================================\n');

  try {
    // 1. Khởi tạo Git repo trong thư mục tạm
    console.log('1️⃣ [Git Init] Khởi tạo git repository mới...');
    execSync('git init', { cwd: tmpRepo, stdio: 'pipe' });

    // 2. Thêm core làm Git Submodule
    console.log('2️⃣ [Git Submodule] Thêm core làm submodule cục bộ...');
    try {
      execSync(`git -c protocol.file.allow=always submodule add "${coreDir}" core`, {
        cwd: tmpRepo,
        stdio: 'pipe',
      });
    } catch {
      // Fallback nếu Git môi trường bảo mật chặn submodule local
      console.log('   ⚠️ Chế độ bảo mật Git chặn file://, sao chép snapshot core...');
      const targetCore = path.join(tmpRepo, 'core');
      fs.cpSync(coreDir, targetCore, {
        recursive: true,
        filter: (src) => !src.includes('node_modules') && !src.includes('.git') && !src.includes('site'),
      });
    }

    // Đồng bộ working tree mới nhất của core vào submodule core
    const modifiedCoreFiles = [
      'bin/treecraft.js',
      'src/services/initService.js',
      'src/config/sitePaths.js',
      'src/config/siteConfigSchema.js',
      'src/controllers/admin/authController.js',
      'src/middlewares/authMiddleware.js',
      'src/routes/admin/authRoutes.js',
      'src/views/admin/auth/change-password.ejs',
    ];
    for (const rel of modifiedCoreFiles) {
      const src = path.join(coreDir, rel);
      const dest = path.join(tmpRepo, 'core', rel);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }

    // Đảm bảo node_modules của core có sẵn trong submodule
    const coreNodeModules = path.join(coreDir, 'node_modules');
    const targetNodeModules = path.join(tmpRepo, 'core', 'node_modules');
    if (!fs.existsSync(targetNodeModules) && fs.existsSync(coreNodeModules)) {
      try {
        fs.symlinkSync(coreNodeModules, targetNodeModules, 'junction');
      } catch {
        // Fallback
      }
    }

    // 3. Chuẩn bị MongoDB (Kiểm tra 27017 hoặc khởi động MongoMemoryServer replica set)
    let mongoUri = 'mongodb://127.0.0.1:27017/treecraft_verify_site?replicaSet=rs0';
    const isPort27017Open = await new Promise((resolve) => {
      const socket = require('net').createConnection(27017, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });

    if (!isPort27017Open) {
      console.log('3️⃣ [MongoDB] Cổng 27017 đóng, khởi động MongoMemoryReplSet kiểm thử...');
      const { MongoMemoryReplSet } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
      });
      mongoUri = `${mongoServer.getUri()}treecraft_verify_site`;
    } else {
      console.log('3️⃣ [MongoDB] Cổng 27017 sẵn sàng, sử dụng MongoDB local...');
    }

    // 4. Thực thi treecraft init
    console.log('4️⃣ [Treecraft Init] Chạy lệnh: node core/bin/treecraft.js init...');
    const initCmd = `node core/bin/treecraft.js init --name="Verify Site" --slug="verify_site" --db-uri="${mongoUri}"`;
    execSync(initCmd, {
      cwd: tmpRepo,
      stdio: 'inherit',
      env: { ...process.env, PORT: String(testPort) },
    });

    // 5. Kiểm tra tính toàn vẹn cấu trúc và Single Database Dual Collection
    console.log('\n5️⃣ [Kiểm tra Mô hình Dữ liệu] Xác minh DEC-058...');
    const mongoose = require('mongoose');
    const conn = await mongoose.createConnection(mongoUri).asPromise();
    const collections = (await conn.db.listCollections().toArray()).map((c) => c.name);
    console.log('   - Danh sách collections trong DB:', collections.join(', '));

    if (!collections.includes('items_master') || !collections.includes('items_web')) {
      throw new Error(`DB thiếu collection bắt buộc! Cần có cả "items_master" và "items_web".`);
    }
    console.log('   ✅ Đã xác minh: Database duy nhất chứa cả "items_master" và "items_web".');

    const masterCount = await conn.collection('items_master').countDocuments();
    const webCount = await conn.collection('items_web').countDocuments();
    console.log(`   - Số lượng items_master: ${masterCount}`);
    console.log(`   - Số lượng items_web   : ${webCount}`);
    if (masterCount === 0 || webCount === 0) {
      throw new Error(`Dữ liệu chưa được nạp hoặc publish đầy đủ: master=${masterCount}, web=${webCount}`);
    }
    await conn.close();

    // 6. Kiểm tra package.json tại gốc repo
    console.log('\n6️⃣ [Kiểm tra package.json] Xác minh script "dev"...');
    const rootPkgPath = path.join(tmpRepo, 'package.json');
    if (!fs.existsSync(rootPkgPath)) {
      throw new Error('Thiếu package.json tại gốc repository!');
    }
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    if (!rootPkg.scripts || !rootPkg.scripts.dev) {
      throw new Error('package.json tại gốc thiếu script "dev"!');
    }
    console.log(`   ✅ Script dev tại gốc repo: "${rootPkg.scripts.dev}"`);

    // 7. Khởi động máy chủ phát triển (dev) và kiểm tra HTTP endpoints
    console.log('\n7️⃣ [Kiểm tra HTTP Server] Khởi chạy máy chủ phát triển...');
    const envFile = path.join(tmpRepo, 'site', '.env.development');
    let envData = fs.readFileSync(envFile, 'utf8');
    envData = envData.replace(/PORT=\d+/, `PORT=${testPort}`);
    if (!isPort27017Open) {
      envData = envData.replace(/MONGO_URI=.+/, `MONGO_URI=${mongoUri}`);
    }
    fs.writeFileSync(envFile, envData, 'utf8');

    devProcess = spawn('node', ['core/bin/treecraft.js', 'dev'], {
      cwd: tmpRepo,
      env: {
        ...process.env,
        PORT: String(testPort),
        MONGO_URI: mongoUri,
        APP_ENV: 'development',
      },
      stdio: 'pipe',
    });

    devProcess.stdout.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.log(`   [server] ${line}`);
    });
    devProcess.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.error(`   [server err] ${line}`);
    });

    // Chờ server lắng nghe trên testPort (tối đa 25s)
    let serverReady = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const isOpen = await new Promise((resolve) => {
        const req = http.get(`http://localhost:${testPort}/admin/login`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
      });
      if (isOpen) {
        serverReady = true;
        break;
      }
    }

    if (!serverReady) {
      throw new Error(`Máy chủ không phản hồi tại http://localhost:${testPort}/admin/login sau 25s!`);
    }

    // 8. Test HTTP GET /admin/login (200)
    console.log('\n8️⃣ [HTTP GET /admin/login]');
    const loginStatus = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/admin/login`, (res) => resolve(res.statusCode)).on('error', reject);
    });
    console.log(`   - HTTP Status: ${loginStatus}`);
    if (loginStatus !== 200) {
      throw new Error(`HTTP GET /admin/login trả về mã ${loginStatus}, kỳ vọng 200!`);
    }
    console.log('   ✅ /admin/login đạt mã 200 OK.');

    // 9. Test HTTP GET / (200)
    console.log('\n9️⃣ [HTTP GET /]');
    const homeStatus = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/`, (res) => resolve(res.statusCode)).on('error', reject);
    });
    console.log(`   - HTTP Status: ${homeStatus}`);
    if (homeStatus !== 200) {
      throw new Error(`HTTP GET / trả về mã ${homeStatus}, kỳ vọng 200!`);
    }
    console.log('   ✅ / (Trang chủ) đạt mã 200 OK.');

    console.log('\n============================================================');
    console.log('🎉 TOÀN BỘ CÁC BÀI KIỂM TRA LUỒNG FRESH-INSTALL ĐỀU ĐẠT (PASSED)!');
    console.log('============================================================\n');
  } finally {
    // Dọn dẹp
    if (devProcess) {
      console.log('🧹 Đang dừng máy chủ kiểm thử...');
      devProcess.kill('SIGTERM');
    }
    if (mongoServer) {
      console.log('🧹 Đang dừng MongoMemoryReplSet...');
      await mongoServer.stop().catch(() => {});
    }
    try {
      console.log(`🧹 Dọn dẹp thư mục tạm: ${tmpRepo}`);
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    } catch (_e) {
      // ignore
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`\n❌ VERIFY FRESH-INSTALL THẤT BẠI: ${err.message}\n`, err.stack);
    process.exit(1);
  });
}

module.exports = { main };

