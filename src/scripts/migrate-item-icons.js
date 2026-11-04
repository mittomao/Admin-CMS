#!/usr/bin/env node
/**
 * Migration Script: Migrate item and template icons to canonical Icon Registry keys
 * 
 * Usage:
 *   node src/scripts/migrate-item-icons.js --dry-run
 *   node src/scripts/migrate-item-icons.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
const Template = require('../models/Template');
const Item = require('../models/Item');
const { resolveItemIcon, isFolderItem } = require('../config/icons');

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/admin_cms';

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('========================================================================');
  console.log('       MIGRATION: CHUẨN HÓA ICON ITEM & TEMPLATE THEO ICON REGISTRY     ');
  console.log('========================================================================');
  
  if (isDryRun) {
    console.log('[CHẾ ĐỘ] --dry-run (CHỈ MÔ PHỎNG, KHÔNG THAY ĐỔI CƠ SỞ DỮ LIỆU)');
  } else {
    console.log('[CẢNH BÁO BẢO MẬT & DỮ LIỆU]');
    console.log('>>> VUI LÒNG ĐẢM BẢO BẠN ĐÃ SAO LƯU DATABASE (mongodump) TRƯỚC KHI TIẾP TỤC! <<<');
  }
  console.log('------------------------------------------------------------------------');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB for icon migration.');
    }

    let templatesUpdated = 0;
    let itemsUpdated = 0;

    // 1. Cập nhật System Templates
    console.log('\n--- BƯỚC 1: Cập nhật Icon cho System Templates ---');
    const systemTemplateIconMap = {
      'Folder': 'folder',
      'Template Folder': 'folder',
      'Layout Folder': 'folder',
      'Rendering Folder': 'folder',
      'Media Folder': 'folder',
      'Layout': 'layout',
      'Placeholder': 'placeholder',
      'Rendering': 'rendering',
      'Template': 'template',
      'Standard Template': 'template',
      'Page': 'page',
    };

    const templates = await Template.find({});
    for (const tpl of templates) {
      let targetIcon = null;
      if (systemTemplateIconMap[tpl.name]) {
        targetIcon = systemTemplateIconMap[tpl.name];
      } else if (isFolderItem(null, tpl)) {
        targetIcon = 'folder';
      } else if (tpl.name.includes('Page')) {
        targetIcon = 'page';
      } else if (!tpl.icon || tpl.icon === 'ti ti-file-text' || tpl.icon === 'ti ti-template') {
        targetIcon = 'template';
      }

      if (targetIcon && tpl.icon !== targetIcon) {
        templatesUpdated++;
        console.log(`  [Template] "${tpl.name}": "${tpl.icon}" -> "${targetIcon}"`);
        if (!isDryRun) {
          tpl.icon = targetIcon;
          await tpl.save();
        }
      }
    }

    // 2. Cập nhật Root Item & Items có icon legacy/trống
    console.log('\n--- BƯỚC 2: Cập nhật Icon cho Items ---');
    const items = await Item.find({ deleted: false }).populate('templateId');
    for (const item of items) {
      const currentIcon = item.icon || '';
      let targetIcon = null;

      // Special case: /sitecore/content
      if (item.path === '/sitecore/content') {
        targetIcon = 'content-root';
      } else if (isFolderItem(item, item.templateId)) {
        targetIcon = 'folder';
      } else if (!currentIcon || currentIcon === 'ti ti-file-text' || currentIcon === 'ti ti-folder' || currentIcon === 'ti ti-box') {
        // Only normalize if empty or generic legacy icon, preserving user-customized icons
        targetIcon = resolveItemIcon(item, item.templateId);
      }

      if (targetIcon && currentIcon !== targetIcon) {
        itemsUpdated++;
        if (itemsUpdated <= 15) {
          console.log(`  [Item] "${item.path}": "${currentIcon || '(empty)'}" -> "${targetIcon}"`);
        }
        if (!isDryRun) {
          item.icon = targetIcon;
          await item.save();
        }
      }
    }

    if (itemsUpdated > 15) {
      console.log(`  ... và ${itemsUpdated - 15} item khác.`);
    }

    console.log('\n========================================================================');
    console.log('KẾT QUẢ MIGRATION:');
    console.log(`  - Templates đã chuẩn hóa icon: ${templatesUpdated}`);
    console.log(`  - Items đã chuẩn hóa icon:     ${itemsUpdated}`);
    console.log(`  - Trạng thái: ${isDryRun ? 'MÔ PHỎNG HOÀN TẤT (KHÔNG LƯU DỮ LIỆU)' : 'ĐÃ GHI DATABASE THÀNH CÔNG'}`);
    console.log('========================================================================\n');

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB.');
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
