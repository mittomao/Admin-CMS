'use strict';

/**
 * Treecraft CMS - NPM Package Fresh Install Verification (DEC-059 / Phase N)
 * Runs end-to-end verification of the standard Node.js workflow:
 * "npm pack -> npm init -y -> npm install <tgz> -> npx treecraft init -> tree:compare"
 * strictly inside an isolated OS temporary directory.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

const CORE_DIR = path.resolve(__dirname, '..');
const TMP_DIR = path.join(os.tmpdir(), `treecraft-npm-verify-${Date.now()}`);
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
    // 1. Pack Core into .tgz tarball in TMP_DIR
    log('1. Packaging Core into local tarball via npm pack...');
    execSync(`npm pack --pack-destination "${TMP_DIR}"`, {
      cwd: CORE_DIR,
      stdio: 'inherit',
    });

    const tarballFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith('.tgz'));
    if (tarballFiles.length === 0) {
      throw new Error('Verification failed: npm pack did not produce a .tgz tarball');
    }
    const tarballName = tarballFiles[0];
    log(`Tarball produced: ${tarballName}`);

    // 2. Initialize project in temp directory
    log('2. Running npm init -y in temp directory...');
    execSync('npm init -y', { cwd: TMP_DIR, stdio: 'pipe' });

    // 3. Install Core package from local tarball
    log(`3. Installing ${tarballName} via npm install...`);
    execSync(`npm install ./${tarballName} --no-audit --prefer-offline`, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });

    const installedCliUnscoped = path.join(TMP_DIR, 'node_modules', 'treecraft-core', 'bin', 'treecraft.js');
    const installedCliScoped = path.join(TMP_DIR, 'node_modules', '@treecraft', 'core', 'bin', 'treecraft.js');
    const installedCli = fs.existsSync(installedCliUnscoped) ? installedCliUnscoped : installedCliScoped;
    if (!fs.existsSync(installedCli)) {
      throw new Error(`Verification failed: CLI not found at ${installedCli}`);
    }
    log('✅ Core package and CLI installed successfully in node_modules.');

    // 4. Run treecraft init
    log('4. Initializing fresh site via: npx treecraft init --yes...');
    const initCmd = `npx treecraft init --name "Verify Portal" --slug "${TEST_SLUG}" --port ${TEST_PORT} --yes`;
    execSync(initCmd, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });

    // 5. Validate generated file structure
    log('5. Validating generated directory structure and files...');
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

    // Verify package.json scripts
    const sitePkg = JSON.parse(fs.readFileSync(path.join(TMP_DIR, 'package.json'), 'utf8'));
    if (!sitePkg.scripts || sitePkg.scripts.dev !== 'treecraft dev') {
      throw new Error(`Verification failed: package.json script "dev" is not "treecraft dev"`);
    }
    log('✅ Generated package.json has valid Treecraft CLI scripts.');

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

    // Verify .gitignore does not contain submodule 'core/'
    const gitignoreContent = fs.readFileSync(path.join(TMP_DIR, '.gitignore'), 'utf8');
    if (gitignoreContent.includes('core/')) {
      throw new Error('Verification failed: .gitignore should not contain core/ in NPM mode');
    }
    log('✅ .gitignore verified clean of submodule artifacts.');

    // 6. Validate Content Tree Parity
    log('6. Validating Content Tree Parity against corporate starter manifest...');
    const compareScript = path.join(CORE_DIR, 'src', 'scripts', 'tree-compare.js');
    const snapshotPath = path.join(CORE_DIR, 'starter', 'corporate', 'tree.manifest.json');
    const testDbUri = `mongodb://127.0.0.1:27017/${TEST_DB}`;

    execSync(`node "${compareScript}" --a "${snapshotPath}" --b "${testDbUri}"`, {
      cwd: TMP_DIR,
      stdio: 'inherit',
    });
    log('✅ Content Tree Parity check passed with 100% match!');

    console.log(`\n======================================================`);
    console.log(`🎉 VERIFICATION COMPLETED: Luồng NPM Package -> Init -> Dev thành công 100%!`);
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
