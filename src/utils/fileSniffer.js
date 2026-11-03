'use strict';

/**
 * File Sniffer Utility
 * Xác định định dạng tệp tin dựa trên Magic Bytes (file signatures) nhị phân
 * Thay vì chỉ dựa vào phần mở rộng tệp tin do client gửi lên.
 */

const fs = require('fs');

/**
 * Danh sách Magic Bytes chuẩn cho các định dạng được phép
 */
const SIGNATURES = {
  jpeg: [
    [0xff, 0xd8, 0xff]
  ],
  png: [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  ],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
  ],
  pdf: [
    [0x25, 0x50, 0x44, 0x46] // %PDF
  ]
};

/**
 * Kiểm tra xem buffer có khớp với signature không
 * @param {Buffer} buffer
 * @param {number[]} signature
 * @param {number} offset
 * @returns {boolean}
 */
function matchSignature(buffer, signature, offset = 0) {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Nhận diện MIME type từ Buffer (tối thiểu 64 bytes đầu tiên)
 * @param {Buffer} buffer
 * @returns {{ mime: string, ext: string } | null}
 */
function sniffBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // 1. JPEG
  for (const sig of SIGNATURES.jpeg) {
    if (matchSignature(buffer, sig)) {
      return { mime: 'image/jpeg', ext: 'jpg' };
    }
  }

  // 2. PNG
  for (const sig of SIGNATURES.png) {
    if (matchSignature(buffer, sig)) {
      return { mime: 'image/png', ext: 'png' };
    }
  }

  // 3. GIF
  for (const sig of SIGNATURES.gif) {
    if (matchSignature(buffer, sig)) {
      return { mime: 'image/gif', ext: 'gif' };
    }
  }

  // 4. WebP: RIFF (4 bytes) + file size (4 bytes) + WEBP (4 bytes)
  if (
    matchSignature(buffer, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    matchSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8) // WEBP at offset 8
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // 5. PDF
  for (const sig of SIGNATURES.pdf) {
    if (matchSignature(buffer, sig)) {
      return { mime: 'application/pdf', ext: 'pdf' };
    }
  }

  // 6. SVG (Text / XML): kiểm tra text chứa thẻ <svg
  const textHeader = buffer.slice(0, Math.min(buffer.length, 1024)).toString('utf8').trim();
  if (
    (textHeader.startsWith('<?xml') || textHeader.startsWith('<svg') || textHeader.includes('<svg')) &&
    textHeader.includes('xmlns') &&
    !textHeader.includes('<?php') &&
    !textHeader.includes('<%')
  ) {
    return { mime: 'image/svg+xml', ext: 'svg' };
  }

  return null;
}

/**
 * Đọc bytes đầu tiên của file trên đĩa để nhận diện
 * @param {string} filePath
 * @returns {Promise<{ mime: string, ext: string } | null>}
 */
async function sniffFile(filePath) {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await fd.read(buffer, 0, 1024, 0);
    return sniffBuffer(buffer.slice(0, bytesRead));
  } finally {
    await fd.close();
  }
}

module.exports = {
  sniffBuffer,
  sniffFile
};

