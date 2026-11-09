#!/usr/bin/env node
'use strict';

/**
 * Migration Script for Phase L1: Languages to Items Architecture
 * 
 * - Ensures System Templates (/root/templates/System/Language, Languages Folder) exist
 * - Ensures System node /root/system/Languages exists
 * - Migrates existing distinct languages from items_master and legacy languages collection to /root/system/Languages/*
 * - Upserts Launchpad tile for Language Manager
 * 
 * Flags:
 *   --dry-run: Simulate operations without writing to MongoDB
 * 
 * Usage:
 *   node src/scripts/migrate-languages-to-items.js [--dry-run]
 */

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const branding = require('../config/branding');
const languageService = require('../services/languageService');
const LaunchpadApp = require('../models/LaunchpadApp');
const Role = require('../models/Role');
const { Item } = require('../models');

const isDryRun = process.argv.includes('--dry-run');

const PRESET_METADATA = {
  vi: { displayName: 'Tiếng Việt', nativeName: 'Tiếng Việt', direction: 'ltr', flagIcon: 'ti ti-flag' },
  en: { displayName: 'English', nativeName: 'English', direction: 'ltr', flagIcon: 'ti ti-flag' },
  ja: { displayName: 'Japanese', nativeName: '日本語', direction: 'ltr', flagIcon: 'ti ti-flag' },
  ko: { displayName: 'Korean', nativeName: '한국어', direction: 'ltr', flagIcon: 'ti ti-flag' },
  zh: { displayName: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', flagIcon: 'ti ti-flag' },
  fr: { displayName: 'French', nativeName: 'Français', direction: 'ltr', flagIcon: 'ti ti-flag' },
  de: { displayName: 'German', nativeName: 'Deutsch', direction: 'ltr', flagIcon: 'ti ti-flag' },
  es: { displayName: 'Spanish', nativeName: 'Español', direction: 'ltr', flagIcon: 'ti ti-flag' },
  ar: { displayName: 'Arabic', nativeName: 'العربية', direction: 'rtl', flagIcon: 'ti ti-flag' },
};

async function run() {
  console.log('================================================================');
  console.log('Treecraft CMS - Migration GĐ L1: Language Manager (Item-based)');
  if (isDryRun) {
    console.log('>>> CHẾ ĐỘ DRY-RUN: KHÔNG GHI THAY ĐỔI VÀO DATABASE <<<');
  }
  console.log('================================================================');
  console.warn('⚠️  QUAN TRỌNG: Hãy đảm bảo bạn đã SAO LƯU (BACKUP) DATABASE trước khi chạy!');
  console.log('----------------------------------------------------------------\n');

  try {
    await mongoose.connect(env.MONGO_URI, { autoIndex: true });
    logger.info('Đã kết nối MongoDB thành công.');

    // 1. Quét các mã ngôn ngữ đang xuất hiện trong items_master
    logger.info('Đang quét các mã ngôn ngữ xuất hiện trong hệ thống...');
    const versionLangs = await Item.distinct('versions.lang');
    const unversionedLangs = await Item.distinct('unversionedFields.lang');
    
    const foundCodes = new Set(['vi', 'en']); // Luôn bao gồm 2 ngôn ngữ cơ sở
    (versionLangs || []).forEach((c) => c && foundCodes.add(c.trim()));
    (unversionedLangs || []).forEach((c) => c && foundCodes.add(c.trim()));

    // Kiểm tra legacy collection languages nếu có
    try {
      const legacyLangs = await mongoose.connection.collection('languages').find({}).toArray();
      (legacyLangs || []).forEach((l) => l.code && foundCodes.add(l.code.trim()));
    } catch {
      // Legacy collection có thể không tồn tại
    }

    const uniqueCodes = Array.from(foundCodes).filter(Boolean);
    logger.info(`Tìm thấy ${uniqueCodes.length} mã ngôn ngữ cần đảm bảo: ${uniqueCodes.join(', ')}`);

    if (isDryRun) {
      logger.info('[DRY-RUN] Sẽ đảm bảo cấu trúc /root/templates/System và /root/system/Languages.');
      for (const code of uniqueCodes) {
        logger.info(`[DRY-RUN] Sẽ tạo/cập nhật item ngôn ngữ: ${code} tại ${branding.PATHS.SYSTEM_LANGUAGES}/${code}`);
      }
    } else {
      // 2. Khởi tạo cấu trúc System Template và node /root/system/Languages
      logger.info('Đang khởi tạo cấu trúc System Templates & Languages Node...');
      await languageService.ensureSystemStructure();

      // 3. Tạo các item Language dưới /root/system/Languages
      let sortOrder = 10;
      for (const code of uniqueCodes) {
        const existing = await languageService.getByCode(code);
        if (!existing) {
          const meta = PRESET_METADATA[code] || {
            displayName: code.toUpperCase(),
            nativeName: code.toUpperCase(),
            direction: 'ltr',
            flagIcon: 'ti ti-flag',
          };

          await languageService.create({
            code,
            displayName: meta.displayName,
            nativeName: meta.nativeName,
            direction: meta.direction || 'ltr',
            enabled: true,
            sortOrder,
            fallbackLanguage: code === 'en' ? 'vi' : '',
            urlPrefix: code === branding.SITE_DEFAULT_LANGUAGE ? '' : code,
            flagIcon: meta.flagIcon || 'ti ti-flag',
          }, { username: 'migration_script' });

          logger.info(`✓ Đã tạo thành công Language Item: ${code} (${meta.displayName})`);
        } else {
          logger.info(`- Language Item: ${code} đã tồn tại, bỏ qua.`);
        }
        sortOrder += 10;
      }

      // 4. Upsert Launchpad Tile cho Language Manager
      logger.info('Đang cập nhật tile Launchpad cho Language Manager...');
      const adminRole = await Role.findOne({ name: 'Administrator' });
      const allowedRoles = adminRole ? [adminRole._id] : [];

      const tileData = {
        name: 'Language Manager',
        description: 'Quản lý danh mục ngôn ngữ, hướng đọc LTR/RTL và ngôn ngữ mặc định',
        icon: 'ti ti-language',
        iconBg: 'emerald',
        group: 'Control Panel & Maintenance',
        url: '/admin/languages',
        sortOrder: 45,
        isEnabled: true,
        isStub: false,
        allowedRoles,
      };

      await LaunchpadApp.findOneAndUpdate(
        { name: 'Language Manager' },
        tileData,
        { upsert: true, new: true }
      );
      logger.info('✓ Đã cập nhật thành công Launchpad Tile: Language Manager');
    }

    logger.info('=== Migration GĐ L1 hoàn thành thành công! ===');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration thất bại: ${err.message}`, err);
    process.exit(1);
  }
}

run();
