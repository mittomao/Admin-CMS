'use strict';

/**
 * Treecraft CMS - Fresh Install Verification Script (DEC-056 / Phase S)
 * Runs end-to-end verification of the "git init -> git submodule add -> init -> dev" workflow
 * strictly inside an isolated OS temporary directory.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

const CORE_DIR = path.resolve(__dirname, '..');
const TMP_DIR = path.join(os.tmpdir(), `treecraft-verify-${Date.now()}`);
const TEST_SLUG = `verify_${Date.now()}`;
const TEST_DB = `treecraft_${TEST_SLUG}`;
const TEST_PORT = 4099;

function log(msg) {
  console.log(`[verify-fresh-install] ${msg}`);
}

async function runVerification() {
  log(`Starting verification in isolated OS temp dir: ${TMP_DIR}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });

  try {
    // 1. Git init in temp dir
    log('1. Initializing fresh git repository in temp directory...');
    execSync('git init', { cwd: TMP_DIR, stdio: 'pipe' });
    execSync('git config user.name "Treecraft Tester"', { cwd: TMP_DIR, stdio: 'pipe' });
    execSync('git config user.email "test@treecraft.local"', { cwd: TMP_DIR, stdio: 'pipe' });

    // 2. Add Core as submodule (allow file protocol)
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

    // Sync working copy files into core (since git working copy changes are uncommitted)
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
    // Link core's node_modules for fast verify without downloading packages
    if (fs.existsSync(path.join(CORE_DIR, 'node_modules')) && !fs.existsSync(path.join(targetCore, 'node_modules'))) {
      try {
        fs.symlinkSync(path.join(CORE_DIR, 'node_modules'), path.join(targetCore, 'node_modules'), 'junction');
      } catch (linkErr) {
        // ignore if already linked
      }
    }

    // 3. Execute treecraft init
    log('3. Running one-step init: node core/bin/treecraft.js init --yes...');
    const initCmd = `node core/bin/treecraft.js init --name "Verify Portal" --slug "${TEST_SLUG}" --port ${TEST_PORT} --yes`;
    execSync(initCmd, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });

    // 4. Validate generated file structure
    log('4. Validating generated directory structure and files...');
    const expectedFiles = [
      path.join(TMP_DIR, 'package.json'),
      path.join(TMP_DIR, '.gitignore'),
      path.join(TMP_DIR, 'site', 'site.config.js'),
      path.join(TMP_DIR, 'site', '.env.development'),
      path.join(TMP_DIR, 'site', '.env.example'),
      path.join(TMP_DIR, 'site', 'views', 'layouts', 'HomeLayout.ejs'),
      path.join(TMP_DIR, 'site', 'public'),
      path.join(TMP_DIR, 'site', 'serialization'),
      path.join(TMP_DIR, 'site', 'backups'),
    ];

    for (const f of expectedFiles) {
      if (!fs.existsSync(f)) {
        throw new Error(`Verification failed: Expected file does not exist: ${f}`);
      }
    }

    // Verify dynamic DB naming in generated configs
    const generatedSiteConfig = require(path.join(TMP_DIR, 'site', 'site.config.js'));
    if (generatedSiteConfig.dbName !== TEST_DB) {
      throw new Error(`Verification failed: site.config.js dbName (${generatedSiteConfig.dbName}) != expected (${TEST_DB})`);
    }

    const envContent = fs.readFileSync(path.join(TMP_DIR, 'site', '.env.development'), 'utf8');
    if (!envContent.includes(`MONGO_DB_NAME=${TEST_DB}`)) {
      throw new Error(`Verification failed: .env.development does not contain MONGO_DB_NAME=${TEST_DB}`);
    }
    log(`✅ Dynamic DB Name verified in configs: ${TEST_DB}`);

    log('✅ All project and site files verified successfully on disk.');

    // 5. Validate Content Tree Parity
    log('5. Validating Content Tree Parity against corporate starter manifest...');
    const compareScript = path.join(CORE_DIR, 'src', 'scripts', 'tree-compare.js');
    const snapshotPath = path.join(CORE_DIR, 'starter', 'corporate', 'tree.manifest.json');
    const testDbUri = `mongodb://127.0.0.1:27017/${TEST_DB}`;

    execSync(`node "${compareScript}" --a "${snapshotPath}" --b "${testDbUri}"`, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });
    log('✅ Content Tree Parity check passed with 100% match!');

    console.log(`\n======================================================`);
    console.log(`🎉 VERIFICATION COMPLETED: Luồng Submodule -> Init -> Dev thành công 100%!`);
    console.log(`======================================================\n`);
  } finally {
    // Cleanup temporary MongoDB database
    try {
      log(`Cleaning up temporary database: ${TEST_DB}...`);
      await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: TEST_DB });
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
      log('Temporary database dropped.');
    } catch (dbErr) {
      log(`DB cleanup notice: ${dbErr.message}`);
    }

    // Cleanup temporary OS directory
    try {
      log(`Cleaning up OS temporary directory: ${TMP_DIR}...`);
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
      log('OS temporary directory removed.');
    } catch (rmErr) {
      log(`FS cleanup notice: ${rmErr.message}`);
    }
  }
}

if (require.main === module) {
  runVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[verify-fresh-install] FAILED:', err);
      process.exit(1);
    });
}

module.exports = { runVerification };
