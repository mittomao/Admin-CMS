/**
 * Treecraft CMS — Branding & Path Integrity Audit Script
 * Giai đoạn R2: Đảm bảo không còn tồn tại từ khóa "sitecore" ngoài allowlist.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALLOWLIST_PATTERNS = [
  /^docs\/archive\//,
  /^package-lock\.json$/,
  /^src\/scripts\/migrate-phase-r1-root-rename\.js$/,
  /^docs\/decisions\/DEC-043-rebrand-treecraft-and-root-rename\.md$/,
  /^docs\/phases\/phase-R1-rebrand-root-rename\.md$/,
  /^docs\/phases\/R1-impact-matrix\.md$/,
  /^docs\/reports\/phase-R1-report\.md$/,
  /^docs\/open-questions\.md$/,
  /^tests\/brandingAudit\.test\.js$/,
  /^docs\/reports\/phase-R2-/,
  /^docs\/reports\/R2-/,
  /^src\/scripts\/check-branding\.js$/,
];

function isAllowlisted(filePath) {
  return ALLOWLIST_PATTERNS.some((pattern) => pattern.test(filePath));
}

async function runAudit() {
  console.log('=== TREECRAFT CMS BRANDING AUDIT (PHASE R2) ===\n');
  let hasErrors = false;

  // 1. Audit File & Directory Names
  console.log('1. Checking file & directory names for "sitecore"...');
  try {
    const filesOutput = execSync('git ls-files', { encoding: 'utf8' });
    const matchedFiles = filesOutput
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f && fs.existsSync(f) && f.toLowerCase().includes('sitecore') && !isAllowlisted(f));

    if (matchedFiles.length > 0) {
      console.error('❌ FAIL: Found file names containing "sitecore":');
      matchedFiles.forEach((f) => console.error(`   - ${f}`));
      hasErrors = true;
    } else {
      console.log('✅ PASS: No files or directories contain "sitecore".');
    }
  } catch (err) {
    console.error(`Error checking file names: ${err.message}`);
    hasErrors = true;
  }

  // 2. Audit Repo Content for "sitecore" Keyword
  console.log('\n2. Scanning repository content for residual "sitecore" text...');
  try {
    let grepOutput = '';
    try {
      grepOutput = execSync('git grep -n -i "sitecore"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    } catch (e) {
      // Exit code 1 from git grep means 0 matches
      grepOutput = e.stdout || '';
    }

    const lines = grepOutput.split('\n').filter(Boolean);
    const violations = [];

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (!match) continue;
      const [_, filePath, lineNum, content] = match;

      if (!isAllowlisted(filePath)) {
        violations.push({ filePath, lineNum, content: content.trim() });
      }
    }

    if (violations.length > 0) {
      console.error(`❌ FAIL: Found ${violations.length} occurrence(s) outside allowlist:`);
      violations.slice(0, 30).forEach((v) => {
        console.error(`   [${v.filePath}:${v.lineNum}] ${v.content.slice(0, 100)}`);
      });
      if (violations.length > 30) {
        console.error(`   ... và ${violations.length - 30} vị trí khác.`);
      }
      hasErrors = true;
    } else {
      console.log('✅ PASS: Zero occurrences of "sitecore" outside allowlist.');
    }
  } catch (err) {
    console.error(`Error scanning content: ${err.message}`);
    hasErrors = true;
  }

  // 3. Audit Seed Scripts Specifically
  console.log('\n3. Verifying Seed Data Scripts for clean "/root" bootstrap...');
  const seedFiles = [
    'src/scripts/seed-initial-data.js',
    'src/scripts/seed-presentation-data.js',
    'src/scripts/seed-sample-site.js',
    'src/scripts/sync-system-templates.js',
  ];

  let seedViolations = 0;
  for (const sf of seedFiles) {
    const fullPath = path.join(process.cwd(), sf);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.toLowerCase().includes('sitecore')) {
      console.error(`❌ FAIL: Seed script contains "sitecore": ${sf}`);
      seedViolations++;
      hasErrors = true;
    }
  }
  if (seedViolations === 0) {
    console.log('✅ PASS: All seed scripts are 100% clean and Treecraft /root compliant.');
  }

  console.log('\n===============================================');
  if (hasErrors) {
    console.error('❌ BRANDING AUDIT FAILED: Please resolve the issues above.');
    process.exit(1);
  } else {
    console.log('🎉 BRANDING AUDIT PASSED: 100% Treecraft & Root compliance verified.');
    process.exit(0);
  }
}

runAudit();
