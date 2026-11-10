#!/usr/bin/env node
'use strict';

/**
 * Treecraft Maintenance Mode CLI (GĐ K1 / DEC-051)
 * Usage:
 *   node src/scripts/maintenance-cli.js on [--reason "Nâng cấp hệ thống"]
 *   node src/scripts/maintenance-cli.js off
 *   node src/scripts/maintenance-cli.js status
 */

const { connectDB, disconnectDB } = require('../config/db');
const maintenanceService = require('../services/maintenanceService');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
Treecraft Maintenance Mode CLI
Usage:
  node src/scripts/maintenance-cli.js <on|off|status> [--reason "Lý do"]
`);
    process.exit(0);
  }

  try {
    await connectDB();

    switch (command) {
      case 'on': {
        const reasonIdx = args.indexOf('--reason');
        const reason = reasonIdx !== -1 && args[reasonIdx + 1] ? args[reasonIdx + 1] : 'Bảo trì hệ thống qua CLI';
        const result = await maintenanceService.setMaintenanceMode(true, reason, { username: 'cli-admin' });
        console.log(`\n⚠️  ĐÃ BẬT CHẾ ĐỘ BẢO TRÌ (MAINTENANCE MODE ON)`);
        console.log(`   - Website công khai: Trả về HTTP 503`);
        console.log(`   - Admin CMS: Khóa thao tác ghi`);
        console.log(`   - Lý do: ${result.reason}`);
        break;
      }

      case 'off': {
        const result = await maintenanceService.setMaintenanceMode(false, '', { username: 'cli-admin' });
        console.log(`\n✅ ĐÃ TẮT CHẾ ĐỘ BẢO TRÌ (MAINTENANCE MODE OFF)`);
        console.log(`   - Website công khai và Admin CMS hoạt động bình thường.`);
        break;
      }

      case 'status': {
        const status = await maintenanceService.getStatus();
        console.log(`\n--- TRẠNG THÁI CHẾ ĐỘ BẢO TRÌ ---`);
        console.log(`   - Đang bật:     ${status.enabled ? 'CÓ (BẬT)' : 'KHÔNG (TẮT)'}`);
        console.log(`   - Ghi đè bởi env: ${status.isOverriddenByEnv ? 'CÓ (MAINTENANCE_MODE)' : 'KHÔNG'}`);
        if (status.reason) {
          console.log(`   - Lý do:        ${status.reason}`);
        }
        if (status.enabledAt) {
          console.log(`   - Thời điểm:    ${new Date(status.enabledAt).toLocaleString('vi-VN')}`);
        }
        break;
      }

      default:
        console.error(`❌ Lệnh không hợp lệ: "${command}". Dùng on, off hoặc status.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Lỗi: ${err.message}`);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  main();
}

