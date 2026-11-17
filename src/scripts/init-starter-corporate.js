'use strict';

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 1. Create starter directories
fs.mkdirSync('starter/corporate', { recursive: true });

// 2. Copy views
copyDir('src/views/site', 'starter/corporate/views');

// 3. Copy public (minimal)
fs.mkdirSync('starter/corporate/public/css', { recursive: true });
fs.mkdirSync('starter/corporate/public/js', { recursive: true });
fs.mkdirSync('starter/corporate/public/images', { recursive: true });
if (fs.existsSync('public/css/site.css')) {
  fs.copyFileSync('public/css/site.css', 'starter/corporate/public/css/site.css');
}

// 4. Copy serialization
copyDir('Serialization', 'starter/corporate/serialization');

// 5. Create default site.config.js in starter
const starterConfig = `module.exports = {
  name: 'Corporate Site',
  slug: 'corporate',
  title: 'Corporate Website',
  description: 'Corporate website built with Treecraft CMS',
  domain: 'corporate.local',
  port: 4000,
  dbPrefix: 'treecraft_',
  dbName: 'treecraft_corporate',
  admin: {
    path: '/admin',
  },
};
`;
fs.writeFileSync('starter/corporate/site.config.js', starterConfig);

console.log('Starter corporate initialized successfully!');

