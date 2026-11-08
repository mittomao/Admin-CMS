/** @type {import('tailwindcss').Config} */
const tokens = require('./src/styles/tokens/theme-tokens');

module.exports = {
  content: [
    './src/views/site/**/*.ejs'
  ],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.fontFamily,
      boxShadow: tokens.boxShadow
    }
  },
  corePlugins: {
    preflight: true // Full modern reset for Public Website
  },
  plugins: []
};

