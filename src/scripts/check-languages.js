#!/usr/bin/env node
'use strict';

/**
 * Static analysis tool: Scan codebase for hard-coded language codes.
 * Ensures language codes ('vi', 'en', etc.) are resolved dynamically via languageService.
 * 
 * Whitelisted files:
 * - src/config/branding.js (contains initial default fallback)
 * - src/services/languageService.js (contains initial bootstrap defaults)
 * - src/utils/mongoTextStemmer.js (contains BCP47-to-stemmer dictionary mapping)
 * - src/scripts/* (migration and seed scripts)
 * - tests/* (test fixtures and assertions)
 * 
 * Usage:
 *   node src/scripts/check-languages.js
 */

const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  path.join(__dirname, '../controllers'),
  path.join(__dirname, '../services'),
  path.join(__dirname, '../routes'),
  path.join(__dirname, '../middlewares'),
];

const WHITELIST_FILES = [
  'languageService.js',
  'branding.js',
  'mongoTextStemmer.js',
  'env.js',
];

// Patterns that indicate hard-coded language logic
const FORBIDDEN_PATTERNS = [
  {
    regex: /(['"])vi\1\s*(?:===|!==|==|!=)\s*(?:lang|language|code)/i,
    description: "Hard-coded comparison against 'vi'",
  },
  {
    regex: /(?:lang|language|code)\s*(?:===|!==|==|!=)\s*(['"])vi\1/i,
    description: "Hard-coded comparison against 'vi'",
  },
  {
    regex: /\[\s*(['"])vi\1\s*,\s*(['"])en\1\s*\]/,
    description: "Hard-coded array ['vi', 'en']",
  },
  {
    regex: /(?:const|let|var|\(|,)\s*lang\s*=\s*(['"])vi\1/i,
    description: "Hard-coded default assignment lang = 'vi'",
  },
  {
    regex: /lang\s*=\s*(['"])vi\1;/i,
    description: "Hard-coded assignment lang = 'vi';",
  },
  {
    regex: /validLangs\s*=\s*\[/,
    description: "Hard-coded static whitelist validLangs array",
  },
];

let totalViolations = 0;

function scanFile(filePath) {
  const fileName = path.basename(filePath);
  if (WHITELIST_FILES.includes(fileName)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip single-line comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return;
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(line)) {
        console.error(
          `❌ [VIOLATION] ${path.relative(process.cwd(), filePath)}:${index + 1}\n` +
          `   Rule: ${pattern.description}\n` +
          `   Code: ${line.trim()}\n`
        );
        totalViolations++;
      }
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ejs'))) {
      scanFile(fullPath);
    }
  }
}

console.log('================================================================');
console.log('Treecraft CMS - Checking Hard-Coded Languages Compliance');
console.log('================================================================\n');

DIRECTORIES_TO_SCAN.forEach(walkDir);

if (totalViolations > 0) {
  console.error(`\n❌ Phát hiện ${totalViolations} vi phạm hard-coded ngôn ngữ! Cần sử dụng languageService thay thế.`);
  process.exit(1);
} else {
  console.log('✓ Tuân thủ 100%! Không phát hiện chuỗi hard-coded ngôn ngữ trong controllers/services/routes.');
  process.exit(0);
}
