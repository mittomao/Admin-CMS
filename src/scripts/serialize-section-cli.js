#!/usr/bin/env node
'use strict';

/**
 * Treecraft Section-Based YAML Serialization CLI (GĐ 11-Y2 / DEC-053)
 * Usage:
 *   node src/scripts/serialize-section-cli.js status
 *   node src/scripts/serialize-section-cli.js reserialize <content|layout|rendering|template|all> [--prune-orphans]
 *   node src/scripts/serialize-section-cli.js sync <content|layout|rendering|template|all> [--mode createOnly|overwrite] [--dry-run] [--delete-missing]
 */

const { connectDB, disconnectDB } = require('../config/db');
const yamlSectionService = require('../services/yamlSectionService');
const { getAllSections, SYNC_EXECUTION_ORDER, getSection } = require('../config/serializationSections');

function parseArgs(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

function printUsage() {
  console.log(`
Treecraft Section-Based YAML Serialization CLI (Phase 11-Y2 / Phase 11-Y3)
Usage:
  node src/scripts/serialize-section-cli.js <command> [section] [options]

Commands:
  status                                          Hiển thị trạng thái của tất cả sections
  reserialize <template|rendering|layout|placeholder|content|all> [--prune-orphans]
                                                  Xuất từ Database ra YAML theo section
  diff [template|all] [--delete-missing-fields]
                                                  So sánh thay đổi Field Definition giữa YAML và Database
  sync <template|rendering|layout|placeholder|content|all> [--mode createOnly|overwrite] [--dry-run] [--delete-missing] [--delete-missing-fields]
                                                  Nhập từ YAML vào Database theo section

Examples:
  npm run serialize:section -- status
  npm run serialize:diff
  npm run serialize:section -- diff template
  npm run serialize:section -- reserialize template
  npm run serialize:section -- reserialize all --prune-orphans
  npm run serialize:section -- sync template --dry-run
  npm run serialize:section -- sync template --delete-missing-fields
  npm run serialize:section -- sync all
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const parsed = parseArgs(args.slice(1));
  const targetSection = (parsed._[0] || '').toLowerCase().trim();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  try {
    await connectDB();

    if (command === 'status') {
      console.log('\n=== TRẠNG THÁI SECTION SERIALIZATION (YAML) ===\n');
      const allSecs = getAllSections();
      for (const sec of allSecs) {
        const st = await yamlSectionService.getSectionStatus(sec.key);
        console.log(`[${sec.key.toUpperCase()}] ${sec.label}`);
        console.log(`  - Thư mục:      ${st.folder}`);
        console.log(`  - Nhánh DB:     ${st.roots.join(', ')}`);
        console.log(`  - Số item DB:   ${st.dbCount}`);
        console.log(`  - Số file YAML: ${st.yamlCount}`);
        console.log(`  - So sánh:      ${st.comparisonLabel} (${st.comparison})`);
        console.log(`  - Lần xuất:     ${st.lastReserializedAt || 'Chưa xuất'}`);
        console.log(`  - Lần sync:     ${st.lastSyncedAt || 'Chưa sync'}`);
        console.log('');
      }
    } else if (command === 'reserialize') {
      if (!targetSection) {
        console.error('Lỗi: Vui lòng chỉ định section cần reserialize (template, layout, rendering, content, hoặc all).');
        process.exit(1);
      }

      const pruneOrphans = Boolean(parsed['prune-orphans']);
      const sectionsToRun = targetSection === 'all' ? SYNC_EXECUTION_ORDER : [targetSection];

      console.log(`\n=== BẮT ĐẦU RESERIALIZE: ${sectionsToRun.join(', ').toUpperCase()} ===\n`);

      for (const sKey of sectionsToRun) {
        if (!getSection(sKey)) {
          console.error(`Lỗi: Không tìm thấy cấu hình cho section "${sKey}".`);
          continue;
        }
        console.log(`>> Đang xuất section [${sKey}]...`);
        const result = await yamlSectionService.reserializeSection(sKey, {
          pruneOrphans,
          user: { username: 'cli-user' },
        });

        console.log(`   + Tổng items:    ${result.totalItems}`);
        console.log(`   + Tạo mới:       ${result.created}`);
        console.log(`   + Cập nhật:      ${result.updated}`);
        console.log(`   + Giữ nguyên:    ${result.unchanged}`);
        if (result.orphans.length > 0) {
          console.log(`   + File mồ côi:   ${result.orphans.length} (${pruneOrphans ? 'Đã xóa' : 'Chỉ cảnh báo'})`);
        }
        console.log('');
      }
      console.log('✓ Hoàn tất Reserialize! Vui lòng chạy "git status" hoặc "git diff" để kiểm tra thay đổi.');
    } else if (command === 'diff') {
      const sectionKey = targetSection || 'template';
      const deleteMissingFields = Boolean(parsed['delete-missing-fields']);

      console.log(`\n=== SO SÁNH FIELD DEFINITIONS: [${sectionKey.toUpperCase()}] (YAML vs DATABASE) ===\n`);
      const diffRes = await yamlSectionService.getFieldDiff(sectionKey, { deleteMissingFields });

      if (diffRes.errors.length > 0) {
        console.log(`x LỖI CẤU TRÚC / CHUYỂN ĐỔI KIỂU (${diffRes.errors.length}):`);
        diffRes.errors.forEach((e) => console.log(`  * ${e.file || 'Lỗi'}: ${e.error}`));
        console.log('');
      }

      if (diffRes.warnings.length > 0) {
        console.log(`! CẢNH BÁO (${diffRes.warnings.length}):`);
        diffRes.warnings.forEach((w) => console.log(`  * ${w}`));
        console.log('');
      }

      if (!diffRes.fieldDiffs || diffRes.fieldDiffs.length === 0) {
        console.log('✓ Không có thay đổi nào giữa YAML và Database.');
      } else {
        console.log(`Tìm thấy ${diffRes.fieldDiffs.length} thay đổi cấp field:`);
        console.log('------------------------------------------------------------------------------------------------------------------');
        console.log(
          `| ${'Template'.padEnd(20)} | ${'Trường'.padEnd(20)} | ${'Thao tác'.padEnd(14)} | ${'Chi tiết'.padEnd(36)} | ${'Item data'.padEnd(9)} |`
        );
        console.log('------------------------------------------------------------------------------------------------------------------');
        for (const d of diffRes.fieldDiffs) {
          const tName = String(d.templateName || '').slice(0, 20).padEnd(20);
          const fName = String(d.fieldName || '').slice(0, 20).padEnd(20);
          const act = String(d.action || '').slice(0, 14).padEnd(14);
          const chg = String(d.change || '').slice(0, 36).padEnd(36);
          const usage = String(d.usageCount || 0).padEnd(9);
          console.log(`| ${tName} | ${fName} | ${act} | ${chg} | ${usage} |`);
        }
        console.log('------------------------------------------------------------------------------------------------------------------');
      }
    } else if (command === 'sync') {
      if (!targetSection) {
        console.error('Lỗi: Vui lòng chỉ định section cần sync (template, layout, rendering, content, hoặc all).');
        process.exit(1);
      }

      const isDryRun = Boolean(parsed['dry-run']);
      const mode = parsed.mode;
      const deleteMissing = Boolean(parsed['delete-missing']);
      const deleteMissingFields = Boolean(parsed['delete-missing-fields']);
      const sectionsToRun = targetSection === 'all' ? SYNC_EXECUTION_ORDER : [targetSection];

      if (isDryRun) {
        console.log(`\n=== CHẠY XEM TRƯỚC (DRY-RUN) SYNC: ${sectionsToRun.join(', ').toUpperCase()} ===\n`);
        for (const sKey of sectionsToRun) {
          console.log(`>> Phân tích section [${sKey}]...`);
          const dryRes = await yamlSectionService.dryRunSyncSection(sKey, {
            mode,
            deleteMissingFields,
          });

          console.log(`   - Tổng files:    ${dryRes.totalFiles}`);
          console.log(`   - Sẽ tạo mới:    ${dryRes.toCreate}`);
          console.log(`   - Sẽ cập nhật:   ${dryRes.toUpdate}`);
          console.log(`   - Sẽ bỏ qua:     ${dryRes.toSkip}`);
          if (dryRes.fieldDiffs && dryRes.fieldDiffs.length > 0) {
            console.log(`   - Thay đổi field: ${dryRes.fieldDiffs.length} thao tác`);
          }
          if (dryRes.missingDependencies.length > 0) {
            console.log(`   ! Cảnh báo thiếu ${dryRes.missingDependencies.length} tham chiếu:`);
            dryRes.missingDependencies.slice(0, 5).forEach((d) => {
              console.log(`     * ${d.file}: Thiếu ${d.dependencyType} "${d.reference}"`);
            });
          }
          if (dryRes.errors.length > 0) {
            console.log(`   x LỖI: ${dryRes.errors.length} file không hợp lệ!`);
            dryRes.errors.forEach((e) => console.log(`     * ${e.file}: ${e.error}`));
          }
          console.log(`   - Hash thư mục:  ${dryRes.hash}`);
          console.log('');
        }
        console.log('✓ Hoàn thành Dry-Run! Chạy lại lệnh không có cờ --dry-run để thực thi ghi vào Database.');
      } else {
        console.log(`\n=== THỰC THI SYNC VÀO DATABASE: ${sectionsToRun.join(', ').toUpperCase()} ===\n`);
        for (const sKey of sectionsToRun) {
          console.log(`>> Đang đồng bộ section [${sKey}]...`);
          const res = await yamlSectionService.syncSection(sKey, {
            mode,
            deleteMissing,
            deleteMissingFields,
            user: { username: 'cli-user' },
          });

          console.log(`   + Tổng items:    ${res.totalFiles}`);
          console.log(`   + Đã tạo mới:    ${res.created}`);
          console.log(`   + Đã cập nhật:   ${res.updated}`);
          console.log(`   + Đã bỏ qua:     ${res.skipped}`);
          if (deleteMissing) {
            console.log(`   + Đã xóa:        ${res.deleted}`);
          }
          console.log('');
        }
        console.log('✓ Hoàn tất Sync dữ liệu vào Database!');
      }
    } else {
      console.error(`Lệnh không hợp lệ: "${command}"`);
      printUsage();
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n[LỖI CLI] ${err.message}`);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

main();

