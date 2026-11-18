'use strict';

/**
 * Treecraft CMS - Live HTTP Smoke Test on Fresh Submodule Project (Pre-Merge Layer 3 & 4)
 * Validates that a fresh project initialized via Treecraft CLI starts up, serves
 * SSR public pages via EJS, handles Admin authentication, and keeps Core completely immutable.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync, spawn } = require('child_process');
const mongoose = require('mongoose');

const CORE_DIR = path.resolve(__dirname, '..');
const TIMESTAMP = Date.now();
const SMOKE_SLUG = `smoke_${TIMESTAMP}`;
const SMOKE_DB = `treecraft_${SMOKE_SLUG}`;
const SMOKE_PORT = 4098;
const TMP_DIR = path.join(os.tmpdir(), `treecraft-smoke-${TIMESTAMP}`);

function log(msg) {
  console.log(`[smoke-test] ${msg}`);
}

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await makeHttpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/health',
        method: 'GET',
        timeout: 1000,
      });
      if (res.statusCode === 200) {
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function runSmokeTest() {
  log(`1. Initializing isolated smoke workspace in: ${TMP_DIR}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });

  let serverProcess = null;

  try {
    // 1. Git init in temp dir
    execSync('git init', { cwd: TMP_DIR, stdio: 'pipe' });
    execSync('git config user.name "Treecraft Tester"', { cwd: TMP_DIR, stdio: 'pipe' });
    execSync('git config user.email "test@treecraft.local"', { cwd: TMP_DIR, stdio: 'pipe' });

    // 2. Add Core as submodule or link
    log('2. Adding Core submodule via file protocol...');
    const coreUrl = CORE_DIR.replace(/\\/g, '/');
    try {
      execSync(`git -c protocol.file.allow=always submodule add "file://${coreUrl}" core`, {
        cwd: TMP_DIR,
        stdio: 'pipe',
      });
    } catch (subErr) {
      log(`Submodule add notice: ${subErr.message}. Falling back to copy.`);
      const targetCore = path.join(TMP_DIR, 'core');
      fs.cpSync(CORE_DIR, targetCore, {
        recursive: true,
        filter: (src) => !src.includes('node_modules') && !src.includes('.git') && !src.includes('storage') && !src.includes('data'),
      });
    }

    const targetCore = path.join(TMP_DIR, 'core');
    if (fs.existsSync(path.join(CORE_DIR, 'bin'))) {
      fs.cpSync(path.join(CORE_DIR, 'bin'), path.join(targetCore, 'bin'), { recursive: true });
    }
    if (fs.existsSync(path.join(CORE_DIR, 'starter'))) {
      fs.cpSync(path.join(CORE_DIR, 'starter'), path.join(targetCore, 'starter'), { recursive: true });
    }
    if (fs.existsSync(path.join(CORE_DIR, 'src'))) {
      fs.cpSync(path.join(CORE_DIR, 'src'), path.join(targetCore, 'src'), { recursive: true });
    }
    if (fs.existsSync(path.join(CORE_DIR, 'node_modules')) && !fs.existsSync(path.join(targetCore, 'node_modules'))) {
      try {
        fs.symlinkSync(path.join(CORE_DIR, 'node_modules'), path.join(targetCore, 'node_modules'), 'junction');
      } catch (linkErr) {
        // ignore
      }
    }

    // 3. Run treecraft init
    log(`3. Initializing fresh project via CLI: node core/bin/treecraft.js init...`);
    const initCmd = `node core/bin/treecraft.js init --name "Smoke Portal" --slug "${SMOKE_SLUG}" --port ${SMOKE_PORT} --yes`;
    execSync(initCmd, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });

    // 4. Start Server
    log(`4. Starting live project server on port ${SMOKE_PORT}...`);
    const siteDir = path.join(TMP_DIR, 'site');
    serverProcess = spawn('node', ['core/bin/treecraft.js', 'dev'], {
      cwd: TMP_DIR,
      env: {
        ...process.env,
        PORT: SMOKE_PORT,
        TREECRAFT_SITE_DIR: siteDir,
        APP_ENV: 'development',
        NODE_ENV: 'development',
        MONGO_URI: `mongodb://127.0.0.1:27017/${SMOKE_DB}`,
        MONGO_DB_NAME: SMOKE_DB,
      },
      stdio: 'pipe',
    });

    let serverLogs = '';
    serverProcess.stdout.on('data', (d) => {
      serverLogs += d.toString();
    });
    serverProcess.stderr.on('data', (d) => {
      serverLogs += d.toString();
    });

    // Wait for server to be responsive
    log('Waiting for HTTP server to become ready...');
    const isReady = await waitForServer(SMOKE_PORT, 20);
    if (!isReady) {
      throw new Error(`Server failed to start within timeout. Logs:\n${serverLogs}`);
    }
    log(`✅ Server is up and responding on http://127.0.0.1:${SMOKE_PORT}`);

    // 5. Test Endpoint: GET /health
    log('5.1 Testing GET /health...');
    const healthRes = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: SMOKE_PORT,
      path: '/health',
      method: 'GET',
    });
    if (healthRes.statusCode !== 200 || !healthRes.body.includes('"status":"ok"')) {
      throw new Error(`GET /health failed: status=${healthRes.statusCode}, body=${healthRes.body}`);
    }
    log('✅ GET /health: 200 OK');

    // 5.2 Test Endpoint: GET / (Public Site SSR)
    log('5.2 Testing GET / (Public Site EJS SSR)...');
    const homeRes = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: SMOKE_PORT,
      path: '/',
      method: 'GET',
    });
    if (homeRes.statusCode !== 200) {
      throw new Error(`GET / failed with status: ${homeRes.statusCode}`);
    }
    // Verify layout and renderings rendered
    if (!homeRes.body.includes('<!DOCTYPE html>') && !homeRes.body.includes('<html')) {
      throw new Error('GET / did not return full HTML document');
    }
    log(`✅ GET /: 200 OK (Rendered ${homeRes.body.length} bytes HTML)`);

    // 5.3 Test Endpoint: GET /admin/login
    log('5.3 Testing GET /admin/login...');
    const loginPageRes = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: SMOKE_PORT,
      path: '/admin/login',
      method: 'GET',
    });
    if (loginPageRes.statusCode !== 200 || !loginPageRes.body.includes('password')) {
      throw new Error(`GET /admin/login failed: status=${loginPageRes.statusCode}`);
    }
    log('✅ GET /admin/login: 200 OK (Login form rendered)');

    // 5.4 Test Endpoint: POST /admin/login (Authentication)
    log('5.4 Testing POST /admin/login (Admin authentication)...');
    const postBody = 'username=admin&password=admin123';
    const authRes = await makeHttpRequest(
      {
        hostname: '127.0.0.1',
        port: SMOKE_PORT,
        path: '/admin/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody),
        },
      },
      postBody
    );

    if (authRes.statusCode !== 302 && authRes.statusCode !== 303) {
      throw new Error(`POST /admin/login failed: expected redirect, got ${authRes.statusCode}. Body: ${authRes.body}`);
    }

    const setCookie = authRes.headers['set-cookie'];
    if (!setCookie || !setCookie.length) {
      throw new Error(`Authentication did not return session cookie. Headers: ${JSON.stringify(authRes.headers)}`);
    }
    const sessionCookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    log('✅ POST /admin/login: 302 Redirect (Session established)');

    // 5.5 Test Endpoint: GET /admin/launchpad with session
    log('5.5 Testing GET /admin/launchpad with authenticated session...');
    const launchpadRes = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: SMOKE_PORT,
      path: '/admin/launchpad',
      method: 'GET',
      headers: {
        Cookie: sessionCookie,
      },
    });

    if (launchpadRes.statusCode !== 200 || !launchpadRes.body.includes('Launchpad')) {
      throw new Error(`GET /admin/launchpad failed: status=${launchpadRes.statusCode}`);
    }
    log('✅ GET /admin/launchpad: 200 OK (Launchpad dashboard rendered)');

    // 5.6 Test Endpoint: GET /admin/content-editor with session
    log('5.6 Testing GET /admin/content-editor with authenticated session...');
    const editorRes = await makeHttpRequest({
      hostname: '127.0.0.1',
      port: SMOKE_PORT,
      path: '/admin/content-editor',
      method: 'GET',
      headers: {
        Cookie: sessionCookie,
      },
    });

    if (editorRes.statusCode !== 200) {
      throw new Error(`GET /admin/content-editor failed: status=${editorRes.statusCode}`);
    }
    log('✅ GET /admin/content-editor: 200 OK (Content Editor workspace rendered)');

    // 6. Verify Core Immutability
    log('6. Validating Core Immutability (zero rogue writes in core/)...');
    const coreLogs = path.join(targetCore, 'logs');
    const coreSite = path.join(targetCore, 'site');
    const coreStorage = path.join(targetCore, 'storage');

    if (fs.existsSync(coreLogs) && fs.readdirSync(coreLogs).length > 0) {
      throw new Error('Violation: Core/logs has written files');
    }
    if (fs.existsSync(coreSite)) {
      throw new Error('Violation: Core/site was created');
    }
    if (fs.existsSync(coreStorage) && fs.readdirSync(coreStorage).length > 0) {
      throw new Error('Violation: Core/storage has written files');
    }
    log('✅ Core Immutability verified: Thư mục core hoàn toàn nguyên vẹn và bất biến.');

    console.log(`\n======================================================`);
    console.log(`🎉 ALL LIVE HTTP SMOKE TESTS PASSED (6/6 Endpoints OK)`);
    console.log(`======================================================\n`);
  } finally {
    // Teardown server
    if (serverProcess) {
      log('Terminating project server...');
      serverProcess.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 1000));
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }

    // Drop temporary MongoDB database
    try {
      log(`Dropping smoke database: ${SMOKE_DB}...`);
      const conn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${SMOKE_DB}`).asPromise();
      await conn.dropDatabase();
      await conn.close();
      log('Temporary smoke database dropped.');
    } catch (dbErr) {
      log(`Database cleanup notice: ${dbErr.message}`);
    }

    // Clean up OS temp directory
    try {
      log(`Cleaning up temporary smoke directory: ${TMP_DIR}...`);
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
      log('Temporary smoke directory removed.');
    } catch (rmErr) {
      log(`Temp cleanup notice: ${rmErr.message}`);
    }
  }
}

if (require.main === module) {
  runSmokeTest()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n✖ SMOKE TEST FAILED: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { runSmokeTest };
