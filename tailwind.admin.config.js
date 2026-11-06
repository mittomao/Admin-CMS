/** @type {import('tailwindcss').Config} */
const tokens = require('./src/styles/tokens/sitecore-tokens');

module.exports = {
  content: [
    './src/views/admin/**/*.ejs',
    './src/views/content-editor/**/*.ejs',
    './src/views/layouts/**/*.ejs',
    './src/views/partials/**/*.ejs',
    './src/views/errors/**/*.ejs',
    './src/views/launchpad/**/*.ejs',
    './public/js/**/*.js'
  ],
  darkMode: ['class', '[data-bs-theme="dark"]'],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fontFamily,
      boxShadow: tokens.boxShadow
    }
  },
  corePlugins: {
    preflight: false, // Tắt Preflight để không xung đột với Bootstrap/Tabler CSS Reboot
    container: false, // Tắt container utility để sử dụng 100% container responsive grid của Tabler
    visibility: false // Tắt visibility utility để không sinh ra .collapse { visibility: collapse } đè lên Bootstrap Accordion/Collapse
  },
  plugins: []
};

