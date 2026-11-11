#!/usr/bin/env node
'use strict';

/**
 * Treecraft CMS - Serialization Layout Migration Tool (DEC-054)
 * Usage:
 *   node src/scripts/migrate-serialization-layout.js [--dry-run]
 *   npm run serialize:migrate-layout -- [--dry-run]
 *
 * Detects legacy v1 serialization layouts:
 *   - data/data/serialization/items/...
 *   - data/serialization/items/...
 *   - Serialization/items/...
 *
 * Safely moves files to the new DEC-054 shortened structure:
 *   Serialization/<Section>/<relative_path>/<Name>.yml
 *
 * Idempotent, dry-run supported, detects case collisions, leaves foreign files intact.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  PROJECT_ROOT,
  getSerializationDir,
  ensureDirExists,
  itemPathToRelativeFile,
} = require('../config/serializationPaths');
const {
  findSectionByItemPath,
} = require('../config/serializationSections');

const isDryRun = process.argv.includes('--dry-run');

/**
 * Scan all YAML files recursively in a directory
 * @param {string} dir
 * @returns {Array<string>} Absolute file paths
 */
function scanYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanYamlFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) &&
      entry.name !== 'serialization.manifest.yml'
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Remove empty directories recursively
 * @param {string} dir
 * @returns {boolean} true if directory was removed
 */
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return false;

  let entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      removeEmptyDirs(full);
    }
  }

  entries = fs.readdirSync(dir);
  // Remove manifest.json if it is the only remaining file in legacy dir
  if (entries.length === 1 && entries[0] === '.manifest.json') {
    try {
      fs.unlinkSync(path.join(dir, '.manifest.json'));
      entries = [];
    } catch {
      // keep
    }
  }

  if (entries.length === 0) {
    try {
      fs.rmdirSync(dir);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function runMigration() {
  console.log('\n============================================================');
  console.log(`  TREECRAFT CMS - SERIALIZATION LAYOUT MIGRATOR (DEC-054)`);
  console.log(`  Chế độ: ${isDryRun ? '🔍 DRY-RUN (CHỈ KIỂM TRA, KHÔNG GHI ĐĨA)' : '🚀 THỰC THI DI CHUYỂN'}`);
  console.log('============================================================\n');

  const targetBaseDir = getSerializationDir();
  console.log(`📁 Thư mục Serialization đích: ${targetBaseDir}`);

  // Candidate legacy directories to search for old files
  const legacyCandidateRoots = [
    path.join(PROJECT_ROOT, 'data/data/serialization'),
    path.join(PROJECT_ROOT, 'data/serialization'),
    path.join(targetBaseDir, 'items'),
  ];

  const foundSources = new Set();
  for (const cand of legacyCandidateRoots) {
    if (fs.existsSync(cand)) {
      const files = scanYamlFiles(cand);
      files.forEach((f) => foundSources.add(path.resolve(f)));
    }
  }

  const allSourceFiles = Array.from(foundSources);
  console.log(`🔎 Phát hiện ${allSourceFiles.length} tệp YAML từ các thư mục cấu trúc cũ.`);

  if (allSourceFiles.length === 0) {
    console.log('✅ Không phát hiện tệp YAML cấu trúc cũ cần di chuyển.');
    return;
  }

  // Plan moves and check collisions
  const plannedMoves = [];
  const destinationMap = new Map(); // lowercase dest -> { originalDest, srcPath }
  const errors = [];

  for (const srcFile of allSourceFiles) {
    try {
      const rawContent = fs.readFileSync(srcFile, 'utf8');
      const doc = yaml.load(rawContent);

      if (!doc || !doc.path) {
        errors.push(`[Bỏ qua] Tệp không chứa trường "path": ${srcFile}`);
        continue;
      }

      const section = findSectionByItemPath(doc.path);
      if (!section) {
        errors.push(`[Không xác định section] Đường dẫn item "${doc.path}" không khớp section nào: ${srcFile}`);
        continue;
      }

      const relFile = itemPathToRelativeFile(section.key, doc.path);
      const destFile = path.resolve(targetBaseDir, section.dir || section.folder, relFile);

      // Same location check (already in right place)
      if (path.resolve(srcFile).toLowerCase() === destFile.toLowerCase()) {
        continue;
      }

      // Collision check
      const destKey = destFile.toLowerCase();
      if (destinationMap.has(destKey)) {
        const existing = destinationMap.get(destKey);
        errors.push(
          `[VA CHẠM TÊN] Hai tệp nguồn cùng trỏ đến 1 đích:\n` +
          `  - Tệp 1: ${existing.srcPath}\n` +
          `  - Tệp 2: ${srcFile}\n` +
          `  - Đích : ${destFile}`
        );
      } else {
        destinationMap.set(destKey, { srcPath: srcFile, destFile });
        plannedMoves.push({
          src: srcFile,
          dest: destFile,
          itemPath: doc.path,
          section: section.key,
        });
      }
    } catch (err) {
      errors.push(`[Lỗi đọc tệp] ${srcFile}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ PHÁT HIỆN LỖI / VA CHẠM TÊN. TIẾN TRÌNH DỪNG LẠI ĐỂ BẢO VỆ DỮ LIỆU:');
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  console.log(`\n📋 Danh sách ${plannedMoves.length} tệp dự kiến di chuyển:\n`);
  for (const move of plannedMoves) {
    const relSrc = path.relative(PROJECT_ROOT, move.src);
    const relDest = path.relative(PROJECT_ROOT, move.dest);
    console.log(`  [MOVE] ${relSrc} -> ${relDest}`);
  }

  if (isDryRun) {
    console.log('\n✨ [DRY-RUN HOÀN TẤT] Không có tệp nào bị thay đổi trên đĩa.');
    console.log('   Chạy lại không có cờ --dry-run để thực hiện di chuyển thật:');
    console.log('   npm run serialize:migrate-layout\n');
    return;
  }

  // Perform actual file moves using fs (NOT git mv)
  let movedCount = 0;
  for (const move of plannedMoves) {
    ensureDirExists(path.dirname(move.dest));

    // Copy then delete source (safe move)
    fs.copyFileSync(move.src, move.dest);
    fs.unlinkSync(move.src);
    movedCount++;
  }

  // Write new global manifest
  const globalManifestPath = path.join(targetBaseDir, 'serialization.manifest.yml');
  const manifestContent = [
    'formatVersion: "1.0"',
    'layoutVersion: 2',
    'generator: "Treecraft CMS"',
    'sections:',
    '  - Templates',
    '  - Renderings',
    '  - Layouts',
    '  - Placeholders',
    '  - Contents',
    '',
  ].join('\n');
  fs.writeFileSync(globalManifestPath, manifestContent, 'utf8');

  // Cleanup empty legacy directories
  for (const cand of legacyCandidateRoots) {
    if (fs.existsSync(cand)) {
      removeEmptyDirs(cand);
      if (fs.existsSync(cand)) {
        const remaining = fs.readdirSync(cand);
        if (remaining.length > 0) {
          console.log(`⚠️ [Lưu ý] Thư mục cũ "${cand}" còn chứa tệp/thư mục khác nên được giữ lại: ${remaining.join(', ')}`);
        }
      }
    }
  }

  console.log(`\n🎉 DI CHUYỂN HOÀN TẤT! Đã chuyển ${movedCount} tệp sang cấu trúc rút gọn DEC-054.`);
  console.log('============================================================');
  console.log('👉 BƯỚC TIẾP THEO: Vui lòng chạy lệnh sau để review thay đổi:');
  console.log('   git status --short');
  console.log('   git diff');
  console.log('============================================================\n');
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

