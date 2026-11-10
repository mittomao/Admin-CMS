#!/usr/bin/env node
'use strict';

/**
 * Treecraft Database Backup & Restore CLI (GĐ K1 / DEC-051)
 * Usage:
 *   node src/scripts/backup-cli.js create [--note "Ghi chú"] [--type full] [--engine mongodump|ndjson] [--exclude-audit]
 *   node src/scripts/backup-cli.js list
 *   node src/scripts/backup-cli.js verify <backupId>
 *   node src/scripts/backup-cli.js restore <backupId> [--mode target-db|in-place] [--target-db <name>] [--confirm-db-name <name>] [--dry-run]
 *   node src/scripts/backup-cli.js prune [--count 7] [--days 30] [--dry-run]
 */

const { connectDB, disconnectDB } = require('../config/db');
const env = require('../config/env');
const dbGuard = require('../config/dbGuard');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');

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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const parsed = parseArgs(args.slice(1));

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
Treecraft Database Backup & Restore CLI
Usage:
  node src/scripts/backup-cli.js <command> [options]

Commands:
  create                     Tạo bản sao lưu cơ sở dữ liệu mới
    --note <text>            Ghi chú bản sao lưu
    --type <full|pre-restore>Kiểu sao lưu (mặc định: full)
    --engine <mongodump|ndjson> Động cơ trích xuất
    --exclude-audit          Loại trừ nhật ký kiểm toán (auditLogs)

  list                       Liệt kê tất cả các bản sao lưu hiện có

  verify <backupId>          Kiểm tra tính toàn vẹn (SHA-256) của bản sao lưu

  restore <backupId>         Phục hồi dữ liệu từ bản sao lưu
    --mode <target-db|in-place> Chế độ phục hồi (mặc định: target-db)
    --target-db <name>       Tên database đích (dành cho chế độ target-db)
    --confirm-db-name <name> Gõ lại tên DB để xác nhận ghi đè (chế độ in-place)
    --dry-run                Kiểm tra mô phỏng, không ghi vào DB

  prune                      Dọn dẹp bản sao lưu cũ theo chính sách lưu trữ
    --count <N>              Số lượng bản mới nhất cần giữ (mặc định: 7)
    --days <N>               Số ngày lưu trữ tối đa (mặc định: 30)
    --dry-run                Kiểm tra mô phỏng những bản sẽ bị xóa
`);
    process.exit(0);
  }

  try {
    await connectDB();
    await backupService.init();

    switch (command) {
      case 'create': {
        console.log('[CLI] Khởi tạo sao lưu cơ sở dữ liệu...');
        const result = await backupService.createBackup({
          note: parsed.note || 'Tạo bằng Treecraft Backup CLI',
          type: parsed.type || 'full',
          engine: parsed.engine,
          excludeAuditLogs: Boolean(parsed['exclude-audit']),
          user: { username: 'cli-admin' },
        });
        console.log(`\n✅ TẠO SAO LƯU THÀNH CÔNG!`);
        console.log(`   - Backup ID:   ${result.backupId}`);
        console.log(`   - Kích thước:  ${result.sizeBytes} bytes`);
        console.log(`   - Thời gian:   ${result.durationMs}ms`);
        console.log(`   - Mã hóa:      ${result.isEncrypted ? 'AES-256-GCM' : 'Không mã hóa'}`);
        break;
      }

      case 'list': {
        const backups = await backupService.listBackups();
        console.log(`\n--- DANH SÁCH BẢN SAO LƯU (${backups.length} bản ghi) ---`);
        if (backups.length === 0) {
          console.log('Chưa có bản sao lưu nào.');
        } else {
          console.table(
            backups.map((b) => {
              const m = b.manifest || {};
              return {
                'Backup ID': b.backupId,
                'Loại': m.type || 'full',
                'Kích thước (KB)': (b.sizeBytes / 1024).toFixed(1),
                'Động cơ': m.engine || 'mongodump',
                'Mã hóa': m.isEncrypted ? 'AES-256' : 'None',
                'Thời điểm': m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : 'N/A',
                'Ghi chú': m.note || '',
              };
            })
          );
        }
        break;
      }

      case 'verify': {
        const backupId = parsed._[0];
        if (!backupId) {
          console.error('❌ Lỗi: Cần truyền mã <backupId> cần kiểm tra.');
          process.exit(1);
        }
        console.log(`[CLI] Đang kiểm tra toàn vẹn bản sao lưu: ${backupId}...`);
        const report = await backupService.verifyBackup(backupId);
        if (report.passed) {
          console.log(`\n✅ TOÀN VẸN DỮ LIỆU ĐẠT CHUẨN (100%)`);
          console.log(`   - Files kiểm tra: ${report.filesVerified}`);
        } else {
          console.log(`\n❌ CẢNH BÁO: BẢN SAO LƯU BỊ SAI LỆCH HOẶC LỖI!`);
          report.errors.forEach((err) => console.log(`   - ${err}`));
          process.exit(1);
        }
        break;
      }

      case 'restore': {
        const backupId = parsed._[0];
        if (!backupId) {
          console.error('❌ Lỗi: Cần truyền mã <backupId> cần khôi phục.');
          process.exit(1);
        }

        const mode = parsed.mode || 'target-db';
        const isDryRun = Boolean(parsed['dry-run']);

        if (!isDryRun) {
          dbGuard.assertSafeFor(mode === 'in-place' ? 'destructive' : 'restore', {
            uri: env.MONGO_URI,
            appEnv: env.APP_ENV,
            scriptName: `backup-cli restore --mode ${mode}`,
            confirmedRemote: Boolean(parsed['confirm-remote'] || process.env.CONFIRM_REMOTE_ACTION === 'true'),
          });
        }

        console.log(`[CLI] Bắt đầu tiến trình khôi phục bản ${backupId}...`);
        console.log(`   - Chế độ:    ${mode}`);
        console.log(`   - Mô phỏng:  ${isDryRun ? 'CÓ (Dry-run)' : 'KHÔNG'}`);

        const result = await backupService.restoreBackup(backupId, {
          mode,
          targetDb: parsed['target-db'],
          confirmDbName: parsed['confirm-db-name'],
          dryRun: isDryRun,
          user: { username: 'cli-admin' },
        });

        if (isDryRun) {
          console.log(`\n🔍 KẾT QUẢ KIỂM TRA MÔ PHỎNG (DRY-RUN):`);
          console.log(`   - Database đích:   ${result.targetDb}`);
          console.log(`   - Số collections:  ${result.totalCollections}`);
          console.log(`   - Số bản ghi:      ${result.totalRecords}`);
        } else {
          console.log(`\n✅ KHÔI PHỤC CƠ SỞ DỮ LIỆU THÀNH CÔNG!`);
          console.log(`   - Database đích:   ${result.targetDb}`);
          console.log(`   - Số bản ghi:      ${result.totalRestored}`);
        }
        break;
      }

      case 'prune': {
        const count = parsed.count ? Number(parsed.count) : undefined;
        const days = parsed.days ? Number(parsed.days) : undefined;
        const isDryRun = Boolean(parsed['dry-run']);

        console.log(`[CLI] Thực hiện dọn dẹp bản sao lưu theo chính sách...`);
        const result = await backupService.pruneBackups({
          retentionCount: count,
          retentionDays: days,
          dryRun: isDryRun,
        });

        if (isDryRun) {
          console.log(`\n🔍 KẾT QUẢ MÔ PHỎNG DỌN DẸP (DRY-RUN):`);
          console.log(`   - Sẽ xóa: ${result.wouldPruneCount} bản sao lưu: ${result.backupsToPrune.join(', ') || 'None'}`);
          console.log(`   - Giữ lại: ${result.wouldKeepCount} bản sao lưu`);
        } else {
          console.log(`\n✅ ĐÃ DỌN DẸP XONG:`);
          console.log(`   - Đã xóa:  ${result.prunedCount} bản sao lưu`);
          console.log(`   - Giữ lại: ${result.keptCount} bản sao lưu`);
        }
        break;
      }

      default:
        console.error(`❌ Lệnh không hợp lệ: "${command}". Dùng --help để xem hướng dẫn.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ THAO TÁC THẤT BẠI: ${err.message}`);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  main();
}

