#!/usr/bin/env node
'use strict';

/**
 * Treecraft Direct JSON Restore Utility
 * Phục hồi nhanh toàn bộ Cây Nội Dung (Content Tree), Templates & Renderings từ tệp JSON sao lưu
 * Usage:
 *   node src/scripts/restore-from-json.js [path/to/backup.json]
 *   node core/src/scripts/restore-from-json.js [path/to/backup.json]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Tải cấu hình môi trường
const sitePaths = require('../config/sitePaths');
const env = require('../config/env');
const logger = require('../utils/logger');

async function restoreFromJson(filePath) {
  let targetFile = filePath;
  if (!targetFile) {
    const candidates = [
      path.join(sitePaths.getSiteDir(), 'starter', 'corporate', 'starter-corporate-backup.json'),
      path.join(sitePaths.getSiteDir(), 'backups', 'starter-corporate-backup.json'),
      path.join(sitePaths.getCoreDir(), 'starter', 'corporate', 'starter-corporate-backup.json'),
      path.join(sitePaths.getCoreDir(), 'backups', 'starter-corporate-backup.json'),
      path.join(__dirname, '..', '..', 'starter', 'corporate', 'starter-corporate-backup.json'),
      path.join(__dirname, '..', '..', 'backups', 'starter-corporate-backup.json'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        targetFile = c;
        break;
      }
    }
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`❌ Không tìm thấy tệp JSON tại: ${targetFile}`);
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`🚀 [Treecraft] Phục hồi Content Tree từ tệp JSON`);
  console.log(`📁 Tệp sao lưu : ${targetFile}`);
  console.log(`============================================================\n`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (err) {
    console.error(`❌ Lỗi phân tích cú pháp tệp JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(data.items) || !Array.isArray(data.templates)) {
    console.error(`❌ Tệp JSON không đúng cấu trúc (thiếu mảng "items" hoặc "templates").`);
    process.exit(1);
  }

  // Kết nối MongoDB
  const mongoUri = env.MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/admin_cms';
  console.log(`🔌 Đang kết nối MongoDB: ${mongoUri.split('@').pop()}...`);

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log(`✅ Kết nối MongoDB thành công.\n`);

    const Template = require('../models/Template');
    const Item = require('../models/Item');
    const PublishedItem = require('../models/PublishedItem');

    // 0. Dọn dẹp triệt để các node rác, node trùng lặp (/root/content/Home, /root/content/About-Us)
    console.log(`🧹 [0/3] Dọn dẹp các node rác/trùng lặp và giải phóng xung đột dữ liệu...`);
    await Item.deleteMany({
      $or: [
        { path: { $in: ['/root/content/Home', '/root/content/About-Us', '/root/content/AboutUs'] } },
        { path: { $in: data.items.map((i) => i.path) }, _id: { $nin: data.items.map((i) => i._id) } },
      ],
    });
    await PublishedItem.deleteMany({
      $or: [
        { path: { $in: ['/root/content/Home', '/root/content/About-Us', '/root/content/AboutUs'] } },
        { path: { $in: data.items.map((i) => i.path) }, _id: { $nin: data.items.map((i) => i._id) } },
      ],
    });

    const tplNames = data.templates.map((t) => t.name).filter(Boolean);
    const tplPaths = data.templates.map((t) => t.path).filter(Boolean);
    const tplIds = data.templates.map((t) => t._id).filter(Boolean);
    await Template.deleteMany({
      $or: [
        { name: { $in: tplNames }, _id: { $nin: tplIds } },
        { path: { $in: tplPaths }, _id: { $nin: tplIds } },
      ],
    });
    console.log(`   ✓ Dọn dẹp hoàn tất.\n`);

    // 1. Phục hồi Templates
    console.log(`📦 [1/3] Đang nạp ${data.templates.length} Templates...`);
    let tplCount = 0;
    for (const tpl of data.templates) {
      await Template.findByIdAndUpdate(
        tpl._id,
        {
          $set: {
            name: tpl.name,
            displayName: tpl.displayName || tpl.name,
            path: tpl.path,
            icon: tpl.icon || 'ti ti-file-text',
            description: tpl.description || '',
            isSystem: Boolean(tpl.isSystem),
            baseTemplates: tpl.baseTemplates || [],
            insertOptions: tpl.insertOptions || [],
            sections: tpl.sections || [],
            standardValues: tpl.standardValues || {},
          },
        },
        { upsert: true, new: true }
      );
      tplCount++;
    }
    console.log(`   ✓ Đã cập nhật thành công ${tplCount} templates.\n`);

    // 2. Phục hồi Items vào Master Database
    console.log(`🌳 [2/3] Đang nạp ${data.items.length} Items vào Content Tree (item_master)...`);
    let itemCount = 0;
    for (const item of data.items) {
      await Item.findByIdAndUpdate(
        item._id,
        {
          $set: {
            name: item.name,
            displayName: item.displayName || item.name,
            path: item.path,
            templateId: item.templateId,
            parentId: item.parentId || null,
            ancestors: item.ancestors || [],
            sortOrder: item.sortOrder || 100,
            icon: item.icon || '',
            sharedFields: item.sharedFields || {},
            languages: item.languages || [],
            presentation: item.presentation || { shared: { layoutId: null, renderings: [], devices: [] }, final: [] },
            deleted: false,
            isDeleted: false,
          },
        },
        { upsert: true, new: true }
      );
      itemCount++;
    }
    console.log(`   ✓ Đã cập nhật thành công ${itemCount} items vào item_master.\n`);

    // 3. Đồng bộ xuất bản sang Web Database (item_web) để Website hiển thị ngay
    console.log(`🌐 [3/3] Đồng bộ xuất bản sang Web Database (item_web)...`);
    let webCount = 0;
    for (const item of data.items) {
      await PublishedItem.findByIdAndUpdate(
        item._id,
        {
          $set: {
            name: item.name,
            displayName: item.displayName || item.name,
            path: item.path,
            templateId: item.templateId,
            parentId: item.parentId || null,
            ancestors: item.ancestors || [],
            sortOrder: item.sortOrder || 100,
            icon: item.icon || '',
            sharedFields: item.sharedFields || {},
            languages: item.languages || [],
            presentation: item.presentation || { shared: { layoutId: null, renderings: [], devices: [] }, final: [] },
            isDeleted: false,
            publishedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      webCount++;
    }
    console.log(`   ✓ Đã xuất bản ${webCount} items sang item_web.\n`);

    console.log(`============================================================`);
    console.log(`🎉 PHỤC HỒI HOÀN TẤT VÀ TỰ ĐỘNG CHUẨN HOÁ CẤU TRÚC THÀNH CÔNG!`);
    console.log(`============================================================`);
    console.log(`📊 Tổng kết:`);
    console.log(`   - Templates  : ${tplCount} mục`);
    console.log(`   - Items      : ${itemCount} mục (Gồm đầy đủ Content, Layout, Media, Templates, System)`);
    console.log(`   - Web Publish: ${webCount} mục\n`);
    console.log(`👉 Bây giờ bạn có thể mở Content Editor kiểm tra:`);
    console.log(`   http://localhost:4000/admin/content-editor\n`);
  } catch (err) {
    console.error(`❌ Lỗi trong quá trình phục hồi: ${err.message}`);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  const targetArg = process.argv[2];
  restoreFromJson(targetArg);
}

module.exports = { restoreFromJson };
