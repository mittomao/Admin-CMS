/**
 * MediaBrowser - Lớp điều khiển giao diện Media Library (Dual-mode: Page & Modal)
 * Kế thừa toàn bộ hành vi và UX từ tài liệu tham chiếu /docs/modules/media-editor/
 */

import { compressImageClient } from '../utils/image-compressor.js';

export class MediaBrowser {
  constructor(rootEl, options = {}) {
    this.rootEl = typeof rootEl === 'string' ? document.getElementById(rootEl) : rootEl;
    if (!this.rootEl) return;

    this.isPicker = this.rootEl.dataset.isPicker === 'true';
    this.csrfToken =
      options.csrfToken ||
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
      '';

    this.currentFolder = null;
    this.currentFolderId = null;
    this.folderTree = [];
    this.assets = [];
    this.selectedAssets = new Map();
    this.activeAsset = null;
    this.isBulkMode = false;
    this.format = 'all';
    this.sort = 'created_at_desc';
    this.searchQuery = '';
    this.page = 1;
    this.limit = 40;
    this.totalCount = 0;
    this.isLoading = false;
    this.activeAltLang = 'en';

    // Callbacks khi chạy ở chế độ Picker
    this.onSelect = options.onSelect || null;
    this.onAssetActive = options.onAssetActive || null;

    // Cache các phần tử DOM
    this.dom = {
      breadcrumbs: this.rootEl.querySelector('.js-media-breadcrumbs'),
      uploadTrigger: this.rootEl.querySelector('.js-upload-trigger'),
      fileInput: this.rootEl.querySelector('.js-file-input'),
      newFolderBtn: this.rootEl.querySelector('.js-new-folder-btn'),
      toggleBulkBtn: this.rootEl.querySelector('.js-toggle-bulk-mode'),
      refreshBtn: this.rootEl.querySelector('.js-refresh-btn'),
      formatFilter: this.rootEl.querySelector('.js-format-filter'),
      sortFilter: this.rootEl.querySelector('.js-sort-filter'),
      searchInput: this.rootEl.querySelector('.js-search-input'),
      searchClear: this.rootEl.querySelector('.js-search-clear'),
      progressContainer: this.rootEl.querySelector('.js-progress-container'),
      progressBar: this.rootEl.querySelector('.js-progress-bar'),
      progressLabel: this.rootEl.querySelector('.js-progress-label'),
      progressPercent: this.rootEl.querySelector('.js-progress-percent'),
      bulkBar: this.rootEl.querySelector('.js-bulk-bar'),
      bulkCount: this.rootEl.querySelector('.js-bulk-count'),
      bulkInsertBtn: this.rootEl.querySelector('.js-bulk-insert-btn'),
      bulkDeleteBtn: this.rootEl.querySelector('.js-bulk-delete-btn'),
      bulkClearBtn: this.rootEl.querySelector('.js-bulk-clear-btn'),
      folderTreeContainer: this.rootEl.querySelector('.js-folder-tree-container'),
      dropzoneContainer: this.rootEl.querySelector('.js-dropzone-container'),
      dropzoneOverlay: this.rootEl.querySelector('.js-dropzone-overlay'),
      grid: this.rootEl.querySelector('.js-media-grid'),
      emptyState: this.rootEl.querySelector('.js-empty-state'),
      emptyUploadBtn: this.rootEl.querySelector('.js-empty-upload-btn'),
      gridFooter: this.rootEl.querySelector('.js-grid-footer'),
      footerCount: this.rootEl.querySelector('.js-footer-count'),
      loadMoreBtn: this.rootEl.querySelector('.js-load-more-btn'),
      inspectorPanel: this.rootEl.querySelector('.js-inspector-panel'),
      inspectorEmpty: this.rootEl.querySelector('.js-inspector-empty'),
      inspectorContent: this.rootEl.querySelector('.js-inspector-content'),
      inspectorPreview: this.rootEl.querySelector('.js-inspector-preview'),
      inspectorFileIcon: this.rootEl.querySelector('.js-inspector-file-icon'),
      inspectorName: this.rootEl.querySelector('.js-inspector-name'),
      inspectorFormat: this.rootEl.querySelector('.js-inspector-format'),
      inspectorSize: this.rootEl.querySelector('.js-inspector-size'),
      inspectorDimensions: this.rootEl.querySelector('.js-inspector-dimensions'),
      inspectorDate: this.rootEl.querySelector('.js-inspector-date'),
      inspectorAlt: this.rootEl.querySelector('.js-inspector-alt'),
      inspectorAltLang: this.rootEl.querySelector('.js-inspector-alt-lang'),
      altLangBadge: this.rootEl.querySelector('.js-alt-lang-badge'),
      saveAltBtn: this.rootEl.querySelector('.js-inspector-save-alt'),
      usageContainer: this.rootEl.querySelector('.js-inspector-usage'),
      inspectorInsertBtn: this.rootEl.querySelector('.js-inspector-insert-btn'),
      inspectorRenameBtn: this.rootEl.querySelector('.js-inspector-rename-btn'),
      inspectorReplaceBtn: this.rootEl.querySelector('.js-inspector-replace-btn'),
      replaceFileInput: this.rootEl.querySelector('.js-replace-file-input'),
      inspectorViewBtn: this.rootEl.querySelector('.js-inspector-view-btn'),
      inspectorCopyBtn: this.rootEl.querySelector('.js-inspector-copy-btn'),
      inspectorDeleteBtn: this.rootEl.querySelector('.js-inspector-delete-btn')
    };
  }

  /**
   * Khởi tạo và gắn các sự kiện
   */
  init() {
    this.bindEvents();
    this.loadFolders().then(() => {
      this.loadAssets();
    });
  }

  bindEvents() {
    // 1. Upload trigger & file input
    if (this.dom.uploadTrigger && this.dom.fileInput) {
      this.dom.uploadTrigger.addEventListener('click', () => this.dom.fileInput.click());
      this.dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleUpload(e.target.files);
          e.target.value = ''; // Reset input
        }
      });
    }

    if (this.dom.emptyUploadBtn && this.dom.fileInput) {
      this.dom.emptyUploadBtn.addEventListener('click', () => this.dom.fileInput.click());
    }

    // 2. Drag & Drop events
    if (this.dom.dropzoneContainer) {
      let dragCounter = 0;
      this.dom.dropzoneContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (this.dom.dropzoneOverlay) this.dom.dropzoneOverlay.classList.remove('d-none');
      });

      this.dom.dropzoneContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          if (this.dom.dropzoneOverlay) this.dom.dropzoneOverlay.classList.add('d-none');
        }
      });

      this.dom.dropzoneContainer.addEventListener('dragover', (e) => e.preventDefault());

      this.dom.dropzoneContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (this.dom.dropzoneOverlay) this.dom.dropzoneOverlay.classList.add('d-none');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleUpload(e.dataTransfer.files);
        }
      });
    }

    // 3. New folder button
    if (this.dom.newFolderBtn) {
      this.dom.newFolderBtn.addEventListener('click', () => this.promptCreateFolder());
    }

    // 4. Filters & Sort
    if (this.dom.formatFilter) {
      this.dom.formatFilter.addEventListener('change', (e) => {
        this.format = e.target.value;
        this.page = 1;
        this.loadAssets();
      });
    }

    if (this.dom.sortFilter) {
      this.dom.sortFilter.addEventListener('change', (e) => {
        this.sort = e.target.value;
        this.page = 1;
        this.loadAssets();
      });
    }

    // 5. Search with Debounce (300ms)
    if (this.dom.searchInput) {
      let debounceTimer = null;
      this.dom.searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.dom.searchClear) {
          if (val) this.dom.searchClear.classList.remove('d-none');
          else this.dom.searchClear.classList.add('d-none');
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = val;
          this.page = 1;
          this.loadAssets();
        }, 300);
      });
    }

    if (this.dom.searchClear) {
      this.dom.searchClear.addEventListener('click', () => {
        this.dom.searchInput.value = '';
        this.dom.searchClear.classList.add('d-none');
        this.searchQuery = '';
        this.page = 1;
        this.loadAssets();
      });
    }

    // 6. Bulk mode & Selection
    if (this.dom.toggleBulkBtn) {
      this.dom.toggleBulkBtn.addEventListener('click', () => this.toggleBulkMode());
    }

    if (this.dom.bulkClearBtn) {
      this.dom.bulkClearBtn.addEventListener('click', () => this.clearSelection());
    }

    if (this.dom.bulkDeleteBtn) {
      this.dom.bulkDeleteBtn.addEventListener('click', () => this.handleBulkDelete());
    }

    if (this.dom.bulkInsertBtn) {
      this.dom.bulkInsertBtn.addEventListener('click', () => this.handleBulkInsert());
    }

    // 7. Refresh button
    if (this.dom.refreshBtn) {
      this.dom.refreshBtn.addEventListener('click', () => {
        this.loadFolders();
        this.loadAssets();
      });
    }

    // 8. Load More button
    if (this.dom.loadMoreBtn) {
      this.dom.loadMoreBtn.addEventListener('click', () => {
        this.page++;
        this.loadAssets(true);
      });
    }

    // 9. Inspector controls
    if (this.dom.inspectorCopyBtn) {
      this.dom.inspectorCopyBtn.addEventListener('click', () => {
        if (!this.activeAsset) return;
        const url = `${window.location.origin}/media/file/${this.activeAsset._id}`;
        navigator.clipboard.writeText(url).then(() => {
          this.showToast('Copied file URL to clipboard!');
        });
      });
    }

    if (this.dom.inspectorDeleteBtn) {
      this.dom.inspectorDeleteBtn.addEventListener('click', () => {
        if (!this.activeAsset) return;
        if (confirm(`Are you sure you want to delete "${this.activeAsset.displayName}"?`)) {
          this.deleteSingleAsset(this.activeAsset._id);
        }
      });
    }

    if (this.dom.inspectorRenameBtn) {
      this.dom.inspectorRenameBtn.addEventListener('click', async () => {
        if (!this.activeAsset) return;
        const currentName = this.activeAsset.displayName || this.activeAsset.name;
        const newName = prompt('Enter new display name for asset:', currentName);
        if (!newName || !newName.trim() || newName.trim() === currentName) return;

        try {
          const res = await fetch(`/api/media/${this.activeAsset._id}/rename`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'CSRF-Token': this.csrfToken
            },
            body: JSON.stringify({ displayName: newName.trim() })
          });
          const data = await res.json();
          if (data.success) {
            this.showToast('Asset renamed successfully.');
            this.activeAsset.displayName = data.media?.displayName || newName.trim();
            this.renderInspector(this.activeAsset);
            this.loadAssets();
          } else {
            alert(data.message || 'Failed to rename asset.');
          }
        } catch (err) {
          console.error('Error renaming asset:', err);
        }
      });
    }

    if (this.dom.inspectorReplaceBtn && this.dom.replaceFileInput) {
      this.dom.inspectorReplaceBtn.addEventListener('click', () => {
        if (!this.activeAsset) return;
        this.dom.replaceFileInput.click();
      });

      this.dom.replaceFileInput.addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0 || !this.activeAsset) return;
        const file = e.target.files[0];
        e.target.value = '';

        if (!confirm(`Replace "${this.activeAsset.displayName}" with new file "${file.name}"?`)) {
          return;
        }

        try {
          this.showProgress(30, 'Uploading replacement file...');
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`/api/media/${this.activeAsset._id}/replace`, {
            method: 'POST',
            headers: {
              'CSRF-Token': this.csrfToken
            },
            body: formData
          });

          this.hideProgress();
          const data = await res.json();
          if (data.success) {
            this.showToast('File replaced successfully.');
            this.activeAsset = data.media;
            this.renderInspector(this.activeAsset);
            this.loadAssets();
          } else {
            alert(data.message || 'Failed to replace file.');
          }
        } catch (err) {
          this.hideProgress();
          console.error('Error replacing file:', err);
          alert('Failed to replace file.');
        }
      });
    }

    if (this.dom.inspectorInsertBtn) {
      this.dom.inspectorInsertBtn.addEventListener('click', () => {
        if (this.activeAsset) {
          this.insertSingleAsset(this.activeAsset);
        }
      });
    }

    if (this.dom.inspectorAltLang) {
      this.dom.inspectorAltLang.addEventListener('change', (e) => {
        this.activeAltLang = e.target.value;
        if (this.dom.altLangBadge) this.dom.altLangBadge.textContent = this.activeAltLang;
        this.updateInspectorAltInput();
      });
    }

    if (this.dom.saveAltBtn) {
      this.dom.saveAltBtn.addEventListener('click', () => this.saveAltText());
    }
  }

  /**
   * Tải danh sách cây thư mục
   */
  async loadFolders() {
    try {
      const res = await fetch('/api/media/folders');
      const data = await res.json();
      if (data.success) {
        this.folderTree = data.folders || [];
        this.renderFolderTree();
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  }

  renderFolderTree() {
    if (!this.dom.folderTreeContainer) return;

    let html = `
      <div class="tree-item ${!this.currentFolderId ? 'active' : ''}" data-folder-id="">
        <i class="ti ti-folder text-primary"></i>
        <span class="tree-name">Media Library (Root)</span>
      </div>
    `;

    for (const folder of this.folderTree) {
      const isActive = this.currentFolderId === folder._id;
      html += `
        <div class="tree-item tree-sub-item ${isActive ? 'active' : ''}" data-folder-id="${folder._id}">
          <i class="ti ti-folder${isActive ? '-open text-primary' : ''}"></i>
          <span class="tree-name" title="${folder.displayName}">${folder.displayName}</span>
        </div>
      `;
    }

    this.dom.folderTreeContainer.innerHTML = html;

    // Gắn sự kiện click node thư mục
    this.dom.folderTreeContainer.querySelectorAll('.tree-item').forEach((item) => {
      item.addEventListener('click', () => {
        const folderId = item.dataset.folderId || null;
        this.selectFolder(folderId);
      });
    });
  }

  selectFolder(folderId) {
    this.currentFolderId = folderId;
    this.currentFolder = this.folderTree.find((f) => f._id === folderId) || null;
    this.page = 1;
    this.clearSelection();
    this.renderFolderTree();
    this.updateBreadcrumbs();
    this.loadAssets();
  }

  updateBreadcrumbs() {
    if (!this.dom.breadcrumbs) return;

    let html = '<span class="breadcrumb-item js-crumb" data-folder-id=""><i class="ti ti-folder text-primary me-1"></i> Media Library</span>';
    if (this.currentFolder) {
      html += ` <span class="breadcrumb-separator">/</span> <span class="breadcrumb-item active">${this.currentFolder.displayName}</span>`;
    }
    this.dom.breadcrumbs.innerHTML = html;

    this.dom.breadcrumbs.querySelectorAll('.js-crumb').forEach((crumb) => {
      crumb.addEventListener('click', () => this.selectFolder(crumb.dataset.folderId || null));
    });
  }

  /**
   * Tải danh sách assets
   */
  async loadAssets(append = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const params = new URLSearchParams({
        page: this.page,
        limit: this.limit,
        format: this.format,
        sort: this.sort
      });

      if (this.currentFolderId) params.append('folderId', this.currentFolderId);
      if (this.searchQuery) params.append('q', this.searchQuery);

      const res = await fetch(`/api/media/assets?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        this.totalCount = data.pagination?.totalCount || 0;
        if (append) {
          this.assets.push(...(data.assets || []));
        } else {
          this.assets = data.assets || [];
        }
        this.renderGrid(append);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    } finally {
      this.isLoading = false;
    }
  }

  renderGrid(append = false) {
    if (!this.dom.grid) return;

    if (this.assets.length === 0) {
      this.dom.grid.innerHTML = '';
      if (this.dom.emptyState) this.dom.emptyState.classList.remove('d-none');
      if (this.dom.gridFooter) this.dom.gridFooter.classList.add('d-none');
      this.clearInspector();
      return;
    }

    if (this.dom.emptyState) this.dom.emptyState.classList.add('d-none');
    if (this.dom.gridFooter) this.dom.gridFooter.classList.remove('d-none');

    let html = '';
    for (const asset of this.assets) {
      html += this.renderCardHtml(asset);
    }

    this.dom.grid.innerHTML = html;

    // Cập nhật số lượng và nút load more
    if (this.dom.footerCount) {
      this.dom.footerCount.textContent = `Showing ${this.assets.length} of ${this.totalCount} items`;
    }

    if (this.dom.loadMoreBtn) {
      if (this.assets.length < this.totalCount) {
        this.dom.loadMoreBtn.classList.remove('d-none');
      } else {
        this.dom.loadMoreBtn.classList.add('d-none');
      }
    }

    this.bindCardEvents();

    // Nếu chưa có active asset và không phải append, chọn asset đầu tiên
    if (!append && this.assets.length > 0 && !this.activeAsset) {
      this.selectAsset(this.assets[0]);
    }
  }

  renderCardHtml(asset) {
    const isSelected = this.selectedAssets.has(asset._id);
    const isActive = this.activeAsset && this.activeAsset._id === asset._id;
    const isImg = asset.fileDetails?.mimeType?.startsWith('image/');
    const thumbUrl = asset.fileDetails?.thumbnailPath
      ? `/media/file/${asset._id}?thumb=1`
      : `/media/file/${asset._id}`;
    const ext = (asset.fileDetails?.extension || '').toUpperCase();
    const sizeStr = this.formatBytes(asset.fileDetails?.fileSize || 0);

    return `
      <div class="media-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}" data-id="${asset._id}">
        <div class="card-thumb-box">
          ${
            isImg
              ? `<img src="${thumbUrl}" alt="${asset.displayName}" class="card-thumb-img" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" /><div class="card-file-icon" style="display: none;">🖼️</div>`
              : `<div class="card-file-icon">📄</div>`
          }
          <span class="card-badge badge-${ext.toLowerCase()}">${ext}</span>
          <div class="card-checkbox-box ${this.isBulkMode ? '' : 'd-none'}">
            <input type="checkbox" class="card-checkbox js-card-checkbox" ${isSelected ? 'checked' : ''} />
          </div>
        </div>
        <div class="card-info">
          <span class="card-title" title="${asset.displayName}">${asset.displayName}</span>
          <span class="card-sub">${sizeStr}</span>
        </div>
      </div>
    `;
  }

  bindCardEvents() {
    this.dom.grid.querySelectorAll('.media-card').forEach((card) => {
      const id = card.dataset.id;
      const asset = this.assets.find((a) => a._id === id);
      if (!asset) return;

      // Click: Chọn xem chi tiết (Single Click)
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('js-card-checkbox')) {
          this.toggleAssetSelection(asset, e.target.checked);
          return;
        }

        if (this.isBulkMode) {
          const checkbox = card.querySelector('.js-card-checkbox');
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            this.toggleAssetSelection(asset, checkbox.checked);
          }
        }

        this.selectAsset(asset);
      });

      // Double Click: Chèn ảnh ngay lập tức nếu đang ở chế độ Picker
      card.addEventListener('dblclick', () => {
        if (this.isPicker) {
          this.insertSingleAsset(asset);
        }
      });
    });
  }

  selectAsset(asset) {
    this.activeAsset = asset;

    // Highlight card
    this.dom.grid.querySelectorAll('.media-card').forEach((c) => {
      if (c.dataset.id === asset._id) c.classList.add('active');
      else c.classList.remove('active');
    });

    this.renderInspector(asset);

    if (typeof this.onAssetActive === 'function') {
      this.onAssetActive(asset);
    }
  }

  renderInspector(asset) {
    if (!this.dom.inspectorContent) return;

    if (this.dom.inspectorEmpty) this.dom.inspectorEmpty.classList.add('d-none');
    this.dom.inspectorContent.classList.remove('d-none');

    const isImg = asset.fileDetails?.mimeType?.startsWith('image/');
    const fileUrl = `/media/file/${asset._id}`;

    if (isImg) {
      if (this.dom.inspectorPreview) {
        this.dom.inspectorPreview.src = fileUrl;
        this.dom.inspectorPreview.classList.remove('d-none');
      }
      if (this.dom.inspectorFileIcon) this.dom.inspectorFileIcon.classList.add('d-none');
    } else {
      if (this.dom.inspectorPreview) this.dom.inspectorPreview.classList.add('d-none');
      if (this.dom.inspectorFileIcon) this.dom.inspectorFileIcon.classList.remove('d-none');
    }

    if (this.dom.inspectorName) this.dom.inspectorName.value = asset.displayName || asset.name;
    if (this.dom.inspectorFormat)
      this.dom.inspectorFormat.textContent = (asset.fileDetails?.extension || '').toUpperCase();
    if (this.dom.inspectorSize)
      this.dom.inspectorSize.textContent = this.formatBytes(asset.fileDetails?.fileSize || 0);

    const dims = asset.fileDetails?.dimensions;
    if (this.dom.inspectorDimensions) {
      this.dom.inspectorDimensions.textContent =
        dims && dims.width && dims.height ? `${dims.width} x ${dims.height} px` : 'N/A';
    }

    if (this.dom.inspectorDate) {
      this.dom.inspectorDate.textContent = new Date(asset.createdAt).toLocaleDateString('vi-VN');
    }

    if (this.dom.inspectorViewBtn) {
      this.dom.inspectorViewBtn.href = fileUrl;
    }

    this.updateInspectorAltInput();
    this.loadUsage(asset._id);
  }

  updateInspectorAltInput() {
    if (!this.dom.inspectorAlt || !this.activeAsset) return;
    const altMap = this.activeAsset.altText || {};
    const val = typeof altMap.get === 'function' ? altMap.get(this.activeAltLang) : altMap[this.activeAltLang];
    this.dom.inspectorAlt.value = val || '';
  }

  async saveAltText() {
    if (!this.activeAsset) return;
    const val = this.dom.inspectorAlt ? this.dom.inspectorAlt.value.trim() : '';

    try {
      const res = await fetch(`/api/media/${this.activeAsset._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({
          altText: {
            [this.activeAltLang]: val
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        this.activeAsset.altText = data.media.altText;
        this.showToast(`Saved Alt text for [${this.activeAltLang.toUpperCase()}]`);
      }
    } catch (err) {
      console.error('Error saving alt text:', err);
    }
  }

  async loadUsage(mediaId) {
    if (!this.dom.usageContainer) return;
    this.dom.usageContainer.innerHTML = '<span class="text-muted small">Checking usage...</span>';

    try {
      const res = await fetch(`/api/media/${mediaId}/usage`);
      const data = await res.json();
      if (data.success && data.usage && data.usage.length > 0) {
        let html = '<ul class="usage-list-ul">';
        for (const item of data.usage) {
          html += `<li><a href="/admin/content-editor?item=${item._id}" target="_blank">📄 ${item.displayName || item.name}</a></li>`;
        }
        html += '</ul>';
        this.dom.usageContainer.innerHTML = html;
      } else {
        this.dom.usageContainer.innerHTML = '<span class="text-muted small">Not used in any items yet</span>';
      }
    } catch {
      this.dom.usageContainer.innerHTML = '<span class="text-muted small">Failed to load usage</span>';
    }
  }

  clearInspector() {
    this.activeAsset = null;
    if (this.dom.inspectorEmpty) this.dom.inspectorEmpty.classList.remove('d-none');
    if (this.dom.inspectorContent) this.dom.inspectorContent.classList.add('d-none');

    if (typeof this.onAssetActive === 'function') {
      this.onAssetActive(null);
    }
  }

  /**
   * Xử lý tải lên nhiều tệp tin (Multi-upload kèm XHR Progress)
   */
  async handleUpload(fileList) {
    if (!fileList || fileList.length === 0) return;

    this.showProgress(0, `Compressing ${fileList.length} file(s)...`);

    const compressedFiles = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const blob = await compressImageClient(file, 1600, 1600, 0.85);
      compressedFiles.push({ blob, originalName: file.name });
    }

    const formData = new FormData();
    if (this.currentFolderId) {
      formData.append('folderId', this.currentFolderId);
    }

    for (const item of compressedFiles) {
      formData.append('files', item.blob, item.originalName);
    }

    // Gửi XHR để theo dõi tiến độ
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');
    xhr.setRequestHeader('CSRF-Token', this.csrfToken);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        this.showProgress(percent, `Uploading ${fileList.length} item(s) (${percent}%)...`);
      }
    };

    xhr.onload = () => {
      this.hideProgress();
      if (xhr.status >= 200 && xhr.status < 300) {
        this.showToast(`Uploaded ${fileList.length} file(s) successfully!`);
        this.page = 1;
        this.activeAsset = null;
        this.loadAssets();
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          alert(`Upload failed: ${err.message || xhr.statusText}`);
        } catch {
          alert(`Upload failed with status ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      this.hideProgress();
      alert('Network error occurred during upload.');
    };

    xhr.send(formData);
  }

  showProgress(percent, label) {
    if (!this.dom.progressContainer) return;
    this.dom.progressContainer.classList.remove('d-none');
    if (this.dom.progressBar) this.dom.progressBar.style.width = `${percent}%`;
    if (this.dom.progressPercent) this.dom.progressPercent.textContent = `${percent}%`;
    if (this.dom.progressLabel) this.dom.progressLabel.textContent = label;
  }

  hideProgress() {
    if (this.dom.progressContainer) this.dom.progressContainer.classList.add('d-none');
  }

  /**
   * Chế độ Chọn nhiều (Bulk Selection Mode)
   */
  toggleBulkMode() {
    this.isBulkMode = !this.isBulkMode;
    if (this.dom.toggleBulkBtn) {
      if (this.isBulkMode) this.dom.toggleBulkBtn.classList.add('active');
      else this.dom.toggleBulkBtn.classList.remove('active');
    }

    this.dom.grid.querySelectorAll('.card-checkbox-box').forEach((box) => {
      if (this.isBulkMode) box.classList.remove('d-none');
      else box.classList.add('d-none');
    });

    if (!this.isBulkMode) {
      this.clearSelection();
    }
  }

  toggleAssetSelection(asset, isChecked) {
    if (isChecked) {
      this.selectedAssets.set(asset._id, asset);
    } else {
      this.selectedAssets.delete(asset._id);
    }
    this.updateBulkBar();
  }

  clearSelection() {
    this.selectedAssets.clear();
    this.dom.grid.querySelectorAll('.js-card-checkbox').forEach((cb) => (cb.checked = false));
    this.dom.grid.querySelectorAll('.media-card').forEach((c) => c.classList.remove('selected'));
    this.updateBulkBar();
  }

  updateBulkBar() {
    if (!this.dom.bulkBar) return;
    const count = this.selectedAssets.size;

    if (count > 0) {
      this.dom.bulkBar.classList.remove('d-none');
      if (this.dom.bulkCount) this.dom.bulkCount.textContent = `${count} item(s) selected`;
    } else {
      this.dom.bulkBar.classList.add('d-none');
    }
  }

  async handleBulkDelete() {
    const ids = Array.from(this.selectedAssets.keys());
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${ids.length} selected items?`)) {
      return;
    }

    try {
      const res = await fetch('/api/media/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({ mediaIds: ids })
      });

      const data = await res.json();
      if (data.success) {
        this.showToast(`Deleted ${data.deleted} items successfully.`);
        this.clearSelection();
        this.page = 1;
        this.loadAssets();
      }
    } catch (err) {
      console.error('Error in bulk delete:', err);
    }
  }

  handleBulkInsert() {
    const assets = Array.from(this.selectedAssets.values());
    if (assets.length === 0) return;

    if (typeof this.onSelect === 'function') {
      this.onSelect(assets);
    }
  }

  insertSingleAsset(asset) {
    if (typeof this.onSelect === 'function') {
      this.onSelect([asset]);
    }
  }

  async deleteSingleAsset(assetId) {
    try {
      const res = await fetch(`/api/media/${assetId}`, {
        method: 'DELETE',
        headers: {
          'CSRF-Token': this.csrfToken
        }
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('Item deleted.');
        this.clearInspector();
        this.page = 1;
        this.loadAssets();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  }

  async promptCreateFolder() {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      const res = await fetch('/api/media/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': this.csrfToken
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: this.currentFolderId
        })
      });

      const data = await res.json();
      if (data.success) {
        this.showToast(`Folder "${folderName}" created.`);
        await this.loadFolders();
        this.selectFolder(data.folder._id);
      } else {
        alert(data.message || 'Failed to create folder.');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showToast(message) {
    // Tận dụng notification system của admin nếu có
    const toast = document.createElement('div');
    toast.className = 'media-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

