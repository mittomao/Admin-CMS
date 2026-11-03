/**
 * Admin CMS Frontend Entrypoint
 */
import { initThemeEngine } from './admin/theme-engine.js';
import { initFormValidator } from './admin/form-validator.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme Engine (Dark/Light)
  initThemeEngine();

  // 2. Initialize Form Validator & Toast Manager
  initFormValidator();

  // 3. Initialize Bootstrap Tooltips & Popovers if available
  if (window.bootstrap) {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((el) => new window.bootstrap.Tooltip(el));

    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    popoverTriggerList.forEach((el) => new window.bootstrap.Popover(el));
  }

  // 4. Global Keyboard Shortcut: Ctrl + K / Cmd + K to focus Global Search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  });
});

