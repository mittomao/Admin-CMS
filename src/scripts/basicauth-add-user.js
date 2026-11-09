#!/usr/bin/env node
'use strict';

/**
 * Emergency CLI tool to add a Basic Auth user via secure prompt (GĐ B1 / DEC-046)
 * Usage: npm run basicauth:add-user -- <username>
 */

const readline = require('readline');
const { Writable } = require('stream');
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const basicAuthService = require('../services/basicAuthService');

function askPassword(promptText) {
  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(promptText);
    muted = true;

    rl.question('', (answer) => {
      muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function run() {
  const username = process.argv[2];

  if (!username || username.startsWith('-')) {
    console.error('Lỗi: Thiếu tên người dùng.');
    console.error('Cú pháp sử dụng: npm run basicauth:add-user -- <username>');
    process.exit(1);
  }

  const cleanUser = username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUser)) {
    console.error('Lỗi: Tên người dùng phải từ 3 đến 30 ký tự (chữ cái, chữ số, _, -, .).');
    process.exit(1);
  }

  console.log(`=== Thêm tài khoản Basic Auth: ${cleanUser} ===`);
  const password = await askPassword('Nhập mật khẩu (tối thiểu 6 ký tự): ');

  if (!password || password.length < 6) {
    console.error('Lỗi: Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
    process.exit(1);
  }

  const confirmPassword = await askPassword('Xác nhận lại mật khẩu: ');

  if (password !== confirmPassword) {
    console.error('Lỗi: Mật khẩu xác nhận không khớp.');
    process.exit(1);
  }

  logger.info('[Basic Auth CLI] Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI, { autoIndex: true });

  await basicAuthService.addUser(
    { username: cleanUser, password, disabled: false },
    { user: { username: 'cli:add-user' } }
  );

  logger.info(`[Basic Auth CLI] Đã thêm thành công tài khoản '${cleanUser}'.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  logger.error(`[Basic Auth CLI] Thao tác thất bại: ${err.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect error on failure
  }
  process.exit(1);
});

