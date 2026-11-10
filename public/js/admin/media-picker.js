/**
 * MediaPicker - Cầu nối toàn cục mở Media Picker Modal cho Field Image, Rich Text Editor, và Presentation
 * API chuẩn: MediaPicker.open({ type: 'image', multiple: false, onSelect: (assets) => void })
 */

import { MediaBrowser } from './media-browser.js?v=2';

let modalInstance = null;
let browserInstance = null;
let currentCallback = null;
let escListener = null;

function updateFooterSummary(asset) {
  if (!modalInstance) return;
  const summaryEl = modalInstance.querySelector('.js-picker-selected-summary');
  const confirmBtn = modalInstance.querySelector('.js-media-picker-confirm');

  if (!summaryEl || !confirmBtn) return;

  if (asset) {
    const isImg =
      asset.fileDetails?.mimeType?.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(asset.displayName || asset.name);

    const dims = asset.fileDetails?.dimensions;
    const dimsStr = dims && dims.width && dims.height ? ` • ${dims.width}x${dims.height}` : '';
    const sizeStr = browserInstance ? browserInstance.formatBytes(asset.fileDetails?.fileSize || 0) : '';
    const iconClass = isImg ? 'ti ti-photo text-primary' : 'ti ti-file-text text-secondary';

    summaryEl.className = 'picker-selected-summary js-picker-selected-summary text-xs text-slate-600 font-medium flex items-center gap-2 overflow-hidden';
    summaryEl.innerHTML = `
      <i class="${iconClass} text-base shrink-0"></i>
      <div class="flex items-center gap-1.5 overflow-hidden text-truncate" style="max-width: 480px;">
        <span class="fw-semibold text-slate-800 text-truncate" title="${asset.displayName || asset.name}">${asset.displayName || asset.name}</span>
        <span class="text-slate-400 font-mono text-[11px] shrink-0">(${sizeStr}${dimsStr})</span>
      </div>
    `;
    confirmBtn.disabled = false;
  } else {
    summaryEl.className = 'picker-selected-summary js-picker-selected-summary text-xs text-slate-600 font-medium';
    summaryEl.innerHTML = '<span class="text-muted text-slate-400 italic">No asset selected</span>';
    confirmBtn.disabled = true;
  }
}

export const MediaPicker = {
  /**
   * Mở cửa sổ Media Picker Modal
   * @param {Object} options
   * @param {string} options.type - 'image' | 'file' | 'all'
   * @param {boolean} options.multiple - Cho phép chọn nhiều tệp tin
   * @param {Function} options.onSelect - Callback nhận kết quả: (assets: Array) => void
   */
  async open(options = {}) {
    const { onSelect } = options;
    currentCallback = onSelect;

    let modalEl = document.getElementById('mediaPickerModal');

    // Nếu modal chưa có trong DOM, fetch partial về chèn vào body
    if (!modalEl) {
      try {
        const res = await fetch('/admin/media/picker');
        const html = await res.text();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        modalEl = wrapper.firstElementChild;
        document.body.appendChild(modalEl);
      } catch (err) {
        console.error('Failed to load media picker modal:', err);
        return;
      }
    }

    modalInstance = modalEl;

    // Khởi tạo MediaBrowser instance cho modal nếu chưa có
    const rootEl = modalEl.querySelector('#modalMediaBrowser');
    if (rootEl && !browserInstance) {
      const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      browserInstance = new MediaBrowser(rootEl, {
        csrfToken: rootEl.dataset?.csrfToken || metaCsrf || '',
        onSelect: (assets) => {
          if (typeof currentCallback === 'function') {
            currentCallback(assets);
          }
          MediaPicker.close();
        },
        onAssetActive: (asset) => {
          updateFooterSummary(asset);
        }
      });
      browserInstance.init();
    } else if (browserInstance) {
      // Cập nhật lại callbacks
      browserInstance.onSelect = (assets) => {
        if (typeof currentCallback === 'function') {
          currentCallback(assets);
        }
        MediaPicker.close();
      };
      browserInstance.onAssetActive = (asset) => {
        updateFooterSummary(asset);
      };
      browserInstance.loadAssets();
    }

    // Reset footer ban đầu
    updateFooterSummary(browserInstance?.activeAsset || null);

    // Hiển thị modal
    modalEl.classList.remove('d-none');
    document.body.classList.add('modal-open');

    // Gắn sự kiện đóng modal
    const closeBtn = modalEl.querySelector('.js-media-picker-close');
    if (closeBtn) {
      closeBtn.onclick = () => MediaPicker.close();
    }

    const cancelBtn = modalEl.querySelector('.js-media-picker-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => MediaPicker.close();
    }

    const confirmBtn = modalEl.querySelector('.js-media-picker-confirm');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (browserInstance && browserInstance.activeAsset) {
          if (typeof currentCallback === 'function') {
            currentCallback([browserInstance.activeAsset]);
          }
          MediaPicker.close();
        }
      };
    }

    modalEl.onclick = (e) => {
      if (e.target === modalEl) {
        MediaPicker.close();
      }
    };

    // Phím Escape để đóng modal
    if (!escListener) {
      escListener = (e) => {
        if (e.key === 'Escape' && modalInstance && !modalInstance.classList.contains('d-none')) {
          MediaPicker.close();
        }
      };
      document.addEventListener('keydown', escListener);
    }
  },

  /**
   * Đóng modal picker
   */
  close() {
    if (modalInstance) {
      modalInstance.classList.add('d-none');
      document.body.classList.remove('modal-open');
    }
    currentCallback = null;
  }
};

// Gán toàn cục vào window để các script EJS / TinyMCE gọi dễ dàng
if (typeof window !== 'undefined') {
  window.MediaPicker = MediaPicker;
}

