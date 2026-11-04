/**
 * Presentation Details Controller & UI Manager (GĐ 6)
 * Supports 100% Server-Side EJS Presentation, SortableJS Drag & Drop, and Datasource Picker
 */
window.PresentationDetails = (function () {
  let currentItemId = null;
  let currentLang = 'vi';
  let currentVersion = 1;
  let sortableInstances = [];

  // Helper to ensure CSRF token in requests
  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  // Helper toast notification
  function showToast(message, type = 'success') {
    const container = document.getElementById('adminToastContainer');
    if (container) {
      const toastType = type === 'error' ? 'danger' : type;
      const toastEl = document.createElement('div');
      toastEl.className = `toast align-items-center text-bg-${toastType} border-0 show shadow-sm mb-2`;
      toastEl.setAttribute('role', 'alert');
      toastEl.setAttribute('aria-live', 'assertive');
      toastEl.setAttribute('aria-atomic', 'true');
      toastEl.innerHTML = `
        <div class="d-flex">
          <div class="toast-body small fw-medium">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;
      container.appendChild(toastEl);
      setTimeout(() => {
        toastEl.classList.remove('show');
        toastEl.addEventListener('transitionend', () => toastEl.remove());
      }, 4000);
      return;
    }
    if (window.Toast && typeof window.Toast[type] === 'function') {
      window.Toast[type](message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Open Presentation Details Modal for an item
   */
  async function open(itemId, opts = {}) {
    if (!itemId) {
      showToast('Vui lòng chọn một item trước khi mở Presentation Details.', 'warning');
      return;
    }

    currentItemId = itemId;
    currentLang = opts.lang || window.currentLang || 'vi';
    currentVersion = opts.version || window.currentVersion || 1;

    let container = document.getElementById('presentationModalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'presentationModalContainer';
      document.body.appendChild(container);
    }

    try {
      const url = `/admin/content-editor/item/${itemId}/presentation?lang=${encodeURIComponent(
        currentLang
      )}&version=${encodeURIComponent(currentVersion)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const html = await res.text();
      container.innerHTML = html;

      // Render sub modals if not in DOM
      ensureSubModals(container);

      // Initialize Bootstrap Modal
      const modalEl = document.getElementById('presentationDetailsModal');
      if (!modalEl) {
        throw new Error('Không tìm thấy element #presentationDetailsModal.');
      }
      const ModalClass =
        (window.bootstrap && window.bootstrap.Modal) || (typeof bootstrap !== 'undefined' && bootstrap.Modal);
      if (!ModalClass) {
        throw new Error('Bootstrap Modal không khả dụng trên trang.');
      }
      const bsModal = new ModalClass(modalEl);
      bsModal.show();

      // Setup SortableJS & events
      initModalEvents(modalEl);
      initSortable();
    } catch (err) {
      showToast(`Không thể mở Presentation Details: ${err.message}`, 'error');
    }
  }

  /**
   * Open standalone Preview JSON / Structure modal
   */
  async function openPreviewJson(itemId, opts = {}) {
    if (!itemId) {
      showToast('Vui lòng chọn một item trước khi xem Preview.', 'warning');
      return;
    }

    const lang = opts.lang || window.currentLang || 'vi';
    const version = opts.version || window.currentVersion || 1;

    try {
      const url = `/admin/content-editor/item/${itemId}/presentation/preview?lang=${encodeURIComponent(
        lang
      )}&version=${encodeURIComponent(version)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const html = await res.text();

      let previewWrapper = document.getElementById('previewJsonModalWrapper');
      if (!previewWrapper) {
        previewWrapper = document.createElement('div');
        previewWrapper.id = 'previewJsonModalWrapper';
        document.body.appendChild(previewWrapper);
      }
      previewWrapper.innerHTML = html;

      const modalEl = document.getElementById('previewPresentationJsonModal');
      if (!modalEl) {
        throw new Error('Không tìm thấy element #previewPresentationJsonModal.');
      }
      const ModalClass =
        (window.bootstrap && window.bootstrap.Modal) || (typeof bootstrap !== 'undefined' && bootstrap.Modal);
      if (!ModalClass) {
        throw new Error('Bootstrap Modal không khả dụng trên trang.');
      }
      const bsModal = new ModalClass(modalEl);
      bsModal.show();

      const copyBtn = document.getElementById('btnCopyPresentationJson');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const code = document.getElementById('presentationJsonCodeBlock')?.textContent || '';
          navigator.clipboard.writeText(code).then(() => {
            copyBtn.innerHTML = '<i class="ti ti-check me-1"></i> Đã sao chép!';
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="ti ti-copy me-1"></i> Copy JSON';
            }, 2000);
          });
        });
      }
    } catch (err) {
      showToast(`Không thể tải Preview: ${err.message}`, 'error');
    }
  }

  function ensureSubModals(container) {
    if (!document.getElementById('selectRenderingModal')) {
      const selectHtml = `
        <div class="modal fade" id="selectRenderingModal" tabindex="-1" aria-hidden="true" style="z-index: 1055;">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header py-2 px-3 bg-light border-bottom">
                <h5 class="modal-title d-flex align-items-center gap-2">
                  <i class="ti ti-components text-primary fs-3"></i>
                  <span>Thêm Component vào Placeholder: <span class="text-primary font-monospace" id="selectRenderingPlaceholderTitle"></span></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-3">
                <div class="mb-3">
                  <div class="input-icon">
                    <span class="input-icon-addon"><i class="ti ti-search"></i></span>
                    <input type="text" class="form-control form-control-sm" id="searchRenderingInput" placeholder="Tìm component theo tên hoặc viewPath..." autocomplete="off">
                  </div>
                </div>
                <div class="row g-2 overflow-auto" id="renderingsGridContainer" style="max-height: 380px;"></div>
              </div>
              <div class="modal-footer py-2 px-3 bg-light">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', selectHtml);
    }

    if (!document.getElementById('renderingInstanceModal')) {
      const editHtml = `
        <div class="modal fade" id="renderingInstanceModal" tabindex="-1" aria-hidden="true" style="z-index: 1056;">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header py-2 px-3 bg-light border-bottom">
                <h5 class="modal-title d-flex align-items-center gap-2">
                  <i class="ti ti-adjustments text-primary fs-3"></i>
                  <span>Cấu Hình Component: <span class="text-primary" id="editRenderingTitle"></span></span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <form id="renderingInstanceForm">
                <input type="hidden" id="editRenderingUid" />
                <input type="hidden" id="editRenderingId" />
                <input type="hidden" id="editRenderingPlaceholder" />
                <input type="hidden" id="editRenderingSortOrder" />
                <div class="modal-body p-3">
                  <div class="mb-3 card border p-3 bg-light">
                    <label class="form-label fw-bold small text-dark d-flex align-items-center justify-content-between mb-1">
                      <span>Nguồn Dữ Liệu Riêng (Datasource Item):</span>
                      <span class="badge bg-secondary-lt fw-normal">Tùy chọn</span>
                    </label>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-white"><i class="ti ti-database text-muted"></i></span>
                      <input type="text" class="form-control" id="editRenderingDatasourcePath" placeholder="(Mặc định dùng nội dung của chính trang - Page context)" readonly>
                      <input type="hidden" id="editRenderingDatasourceId">
                      <button class="btn btn-outline-secondary" type="button" id="btnBrowseDatasource">
                        <i class="ti ti-folder-search me-1"></i> Chọn Item...
                      </button>
                      <button class="btn btn-outline-danger" type="button" id="btnClearDatasource" title="Xóa datasource (đọc lại từ trang)">
                        <i class="ti ti-x"></i>
                      </button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                      <label class="form-label fw-bold small text-dark m-0">Tham Số Hiển Thị (Parameters):</label>
                      <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" id="btnAddParameterRow">
                        <i class="ti ti-plus"></i> Thêm Tham Số
                      </button>
                    </div>
                    <div class="border rounded p-2 bg-white" style="max-height: 220px; overflow-y: auto;">
                      <table class="table table-sm table-vcenter mb-0" id="parametersTable">
                        <thead>
                          <tr class="text-muted small">
                            <th style="width: 40%;">Tên Tham Số (Key)</th>
                            <th style="width: 50%;">Giá Trị (Value)</th>
                            <th style="width: 10%; text-align: center;">Xóa</th>
                          </tr>
                        </thead>
                        <tbody id="parametersTableBody"></tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div class="modal-footer py-2 px-3 bg-light">
                  <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Hủy</button>
                  <button type="submit" class="btn btn-primary btn-sm d-flex align-items-center gap-1" id="btnSaveRenderingInstance">
                    <i class="ti ti-check"></i> Cập Nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', editHtml);
    }
  }

  function initModalEvents(modalEl) {
    // 1. Add Component button in each placeholder
    modalEl.querySelectorAll('.btn-add-rendering').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ph = btn.getAttribute('data-placeholder');
        openSelectRenderingModal(ph);
      });
    });

    // 2. Edit Rendering button
    modalEl.querySelectorAll('.btn-edit-rendering').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const itemCard = e.target.closest('.rendering-item');
        if (itemCard) openEditRenderingModal(itemCard);
      });
    });

    // 3. Remove Rendering button
    modalEl.querySelectorAll('.btn-remove-rendering').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const itemCard = e.target.closest('.rendering-item');
        if (itemCard) {
          const phDropzone = itemCard.closest('.renderings-dropzone');
          itemCard.remove();
          updateDropzoneState(phDropzone);
        }
      });
    });

    // 4. Reset to standard button
    const resetBtn = modalEl.querySelector('#btnResetToStandard');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa mọi ghi đè (override) và khôi phục về bố cục chuẩn của Template?')) {
          return;
        }
        try {
          const res = await fetch(`/api/presentation/item/${currentItemId}/reset`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({
              scope: 'all',
              lang: currentLang,
              version: currentVersion,
            }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('Đã khôi phục về bố cục Template!');
            open(currentItemId, { lang: currentLang, version: currentVersion });
          } else {
            showToast(data.message || 'Lỗi khôi phục.', 'error');
          }
        } catch (err) {
          showToast(`Lỗi: ${err.message}`, 'error');
        }
      });
    }

    // 5. Preview JSON / structure button
    const previewBtn = modalEl.querySelector('#btnPreviewPresentationJson');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        openPreviewJson(currentItemId, { lang: currentLang, version: currentVersion });
      });
    }

    // 6. Save Presentation button
    const saveBtn = modalEl.querySelector('#btnSavePresentation');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await saveCurrentPresentation(modalEl);
      });
    }
  }

  function initSortable() {
    sortableInstances.forEach((inst) => {
      if (typeof inst.destroy === 'function') inst.destroy();
    });
    sortableInstances = [];

    if (typeof window.Sortable !== 'function') {
      console.warn('SortableJS is not loaded yet.');
      return;
    }

    const dropzones = document.querySelectorAll('.renderings-dropzone');
    dropzones.forEach((dz) => {
      const sortable = new window.Sortable(dz, {
        group: 'shared-renderings',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: function (evt) {
          const itemEl = evt.item;
          const targetDz = evt.to;
          const newPlaceholder = targetDz.getAttribute('data-placeholder');
          itemEl.setAttribute('data-placeholder', newPlaceholder);
          updateDropzoneState(evt.from);
          updateDropzoneState(evt.to);
        },
      });
      sortableInstances.push(sortable);
    });
  }

  function updateDropzoneState(dropzone) {
    if (!dropzone) return;
    const cards = dropzone.querySelectorAll('.rendering-item');
    const ph = dropzone.getAttribute('data-placeholder');
    const cardHeader = dropzone.closest('.placeholder-card')?.querySelector('.count-badge');
    if (cardHeader) {
      cardHeader.textContent = `${cards.length} component`;
    }

    const emptyNotice = dropzone.querySelector('.empty-dropzone');
    if (cards.length === 0) {
      if (!emptyNotice) {
        dropzone.innerHTML = `
          <div class="empty-dropzone text-center py-3 text-muted small border border-dashed rounded bg-white">
            <i class="ti ti-drag-drop fs-2 text-muted mb-1"></i>
            <div>Chưa có component nào trong placeholder <strong>${ph}</strong>. Nhấn "Thêm Component" để bắt đầu.</div>
          </div>
        `;
      }
    } else if (emptyNotice) {
      emptyNotice.remove();
    }
  }

  async function openSelectRenderingModal(placeholder) {
    const titleEl = document.getElementById('selectRenderingPlaceholderTitle');
    if (titleEl) titleEl.textContent = placeholder;

    const grid = document.getElementById('renderingsGridContainer');
    if (grid) {
      grid.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
          <div>Đang tải danh sách components được phép...</div>
        </div>
      `;
    }

    const modalEl = document.getElementById('selectRenderingModal');
    const bsModal = new window.bootstrap.Modal(modalEl);
    bsModal.show();

    try {
      const res = await fetch(`/api/presentation/renderings/allowed?placeholder=${encodeURIComponent(placeholder)}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        grid.innerHTML = '<div class="alert alert-warning">Không tải được danh sách renderings.</div>';
        return;
      }

      grid.innerHTML = '';
      json.data.forEach((r) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 rendering-select-card';
        const compTplLabel = r.componentTemplateName ? `Template: ${r.componentTemplateName}` : '';
        col.innerHTML = `
          <div class="card card-sm border hover-bg-light cursor-pointer p-2 d-flex flex-row align-items-center gap-2" style="cursor: pointer;">
            <span class="avatar avatar-sm bg-blue-lt rounded">
              <i class="${r.icon || 'ti ti-box'} fs-3"></i>
            </span>
            <div class="flex-fill text-truncate">
              <div class="fw-bold text-dark text-truncate">${r.displayName || r.name}</div>
              <div class="text-muted small font-monospace">${r.viewPath || ''}</div>
              ${compTplLabel ? `<div class="badge bg-purple-lt text-purple small mt-1 font-monospace"><i class="ti ti-puzzle me-1"></i>${compTplLabel}</div>` : ''}
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2">
              <i class="ti ti-plus"></i> Chọn
            </button>
          </div>
        `;

        col.addEventListener('click', () => {
          bsModal.hide();
          addRenderingToPlaceholder(placeholder, r);
        });

        grid.appendChild(col);
      });

      const searchInput = document.getElementById('searchRenderingInput');
      if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
          const q = e.target.value.toLowerCase().trim();
          grid.querySelectorAll('.rendering-select-card').forEach((card) => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(q) ? '' : 'none';
          });
        };
      }
    } catch (err) {
      grid.innerHTML = `<div class="alert alert-danger">Lỗi: ${err.message}</div>`;
    }
  }

  function addRenderingToPlaceholder(placeholder, rendering) {
    const dropzone = document.querySelector(`.renderings-dropzone[data-placeholder="${placeholder}"]`);
    if (!dropzone) return;

    const emptyNotice = dropzone.querySelector('.empty-dropzone');
    if (emptyNotice) emptyNotice.remove();

    const scopeRadio = document.querySelector('input[name="presentationScope"]:checked');
    const currentScope = scopeRadio ? scopeRadio.value : 'shared';

    const card = document.createElement('div');
    card.className = 'card mb-2 rendering-item shadow-xs border cursor-move bg-white';
    card.setAttribute('data-uid', '');
    card.setAttribute('data-rendering-id', rendering._id || rendering.id);
    card.setAttribute('data-placeholder', placeholder);
    card.setAttribute('data-sort-order', (dropzone.querySelectorAll('.rendering-item').length + 1) * 100);
    card.setAttribute('data-datasource-id', '');
    card.setAttribute('data-parameters', '{}');
    card.setAttribute('data-origin', currentScope);
    card.setAttribute('data-hidden', 'false');

    card.innerHTML = `
      <div class="card-body p-2 d-flex align-items-center justify-content-between gap-2">
        <div class="d-flex align-items-center gap-2 flex-fill text-truncate">
          <span class="drag-handle text-muted cursor-move px-1" title="Kéo để sắp xếp">
            <i class="ti ti-grip-vertical fs-3"></i>
          </span>
          <span class="avatar avatar-xs bg-blue-lt rounded">
            <i class="${rendering.icon || 'ti ti-box'}"></i>
          </span>
          <div class="text-truncate">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-bold small text-dark">${rendering.displayName || rendering.name}</span>
              <span class="badge bg-light text-muted font-monospace small">${rendering.viewPath || ''}</span>
              <span class="badge bg-primary-lt">${currentScope.toUpperCase()}</span>
            </div>
            <div class="text-muted small d-flex align-items-center gap-2 mt-1">
              <span class="text-muted fst-italic"><i class="ti ti-arrow-guide me-1"></i>Đọc trường trực tiếp từ Page Item</span>
            </div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="btn btn-sm btn-ghost-secondary p-1 btn-edit-rendering" title="Chỉnh sửa datasource và parameters">
            <i class="ti ti-pencil fs-3"></i>
          </button>
          <button type="button" class="btn btn-sm btn-ghost-danger p-1 btn-remove-rendering" title="Xóa component này">
            <i class="ti ti-trash fs-3"></i>
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-edit-rendering').addEventListener('click', () => openEditRenderingModal(card));
    card.querySelector('.btn-remove-rendering').addEventListener('click', () => {
      card.remove();
      updateDropzoneState(dropzone);
    });

    dropzone.appendChild(card);
    updateDropzoneState(dropzone);
  }

  function openEditRenderingModal(card) {
    const modalEl = document.getElementById('renderingInstanceModal');
    const form = document.getElementById('renderingInstanceForm');
    const bsModal = new window.bootstrap.Modal(modalEl);

    const titleEl = document.getElementById('editRenderingTitle');
    const nameEl = card.querySelector('.fw-bold');
    if (titleEl && nameEl) titleEl.textContent = nameEl.textContent;

    document.getElementById('editRenderingUid').value = card.getAttribute('data-uid') || '';
    document.getElementById('editRenderingId').value = card.getAttribute('data-rendering-id') || '';
    document.getElementById('editRenderingPlaceholder').value = card.getAttribute('data-placeholder') || 'maincontent';
    document.getElementById('editRenderingSortOrder').value = card.getAttribute('data-sort-order') || 100;

    const dsId = card.getAttribute('data-datasource-id') || '';
    document.getElementById('editRenderingDatasourceId').value = dsId;
    document.getElementById('editRenderingDatasourcePath').value = dsId ? `Item: ${dsId}` : '';

    const tableBody = document.getElementById('parametersTableBody');
    tableBody.innerHTML = '';
    let params = {};
    try {
      params = JSON.parse(card.getAttribute('data-parameters') || '{}');
    } catch (e) {
      params = {};
    }

    Object.entries(params).forEach(([k, v]) => {
      tableBody.appendChild(createParameterRow(k, v));
    });

    const addParamBtn = document.getElementById('btnAddParameterRow');
    addParamBtn.onclick = () => {
      tableBody.appendChild(createParameterRow('', ''));
    };

    const browseBtn = document.getElementById('btnBrowseDatasource');
    browseBtn.onclick = () => {
      if (window.ItemPicker) {
        window.ItemPicker.open({
          title: 'Chọn Datasource cho Component',
          selectedId: document.getElementById('editRenderingDatasourceId').value,
          onSelect: function (selected) {
            if (selected) {
              document.getElementById('editRenderingDatasourceId').value = selected._id || selected.id;
              document.getElementById('editRenderingDatasourcePath').value = selected.path || selected.displayName;
            } else {
              document.getElementById('editRenderingDatasourceId').value = '';
              document.getElementById('editRenderingDatasourcePath').value = '';
            }
          },
        });
      }
    };

    const clearDsBtn = document.getElementById('btnClearDatasource');
    clearDsBtn.onclick = () => {
      document.getElementById('editRenderingDatasourceId').value = '';
      document.getElementById('editRenderingDatasourcePath').value = '';
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const updatedDsId = document.getElementById('editRenderingDatasourceId').value;
      const updatedDsPath = document.getElementById('editRenderingDatasourcePath').value;

      const newParams = {};
      tableBody.querySelectorAll('tr').forEach((row) => {
        const keyInput = row.querySelector('.param-key');
        const valInput = row.querySelector('.param-val');
        if (keyInput && keyInput.value.trim()) {
          newParams[keyInput.value.trim()] = valInput ? valInput.value : '';
        }
      });

      card.setAttribute('data-datasource-id', updatedDsId);
      card.setAttribute('data-parameters', JSON.stringify(newParams));

      const dsLabel = card.querySelector('.text-muted.small.d-flex');
      if (dsLabel) {
        const dsContent = updatedDsId
          ? `<span class="text-truncate text-azure" title="Datasource: ${updatedDsPath || updatedDsId}"><i class="ti ti-database me-1"></i>${updatedDsPath || updatedDsId}</span>`
          : '<span class="text-muted fst-italic"><i class="ti ti-arrow-guide me-1"></i>Đọc trường trực tiếp từ Page Item</span>';
        const paramsBadge =
          Object.keys(newParams).length > 0
            ? `<span class="badge bg-orange-lt ms-2" title="Có cấu hình parameters"><i class="ti ti-adjustments me-1"></i>${Object.keys(newParams).length} params</span>`
            : '';
        dsLabel.innerHTML = dsContent + paramsBadge;
      }

      bsModal.hide();
    };

    bsModal.show();
  }

  function createParameterRow(key = '', val = '') {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm param-key" value="${key}" placeholder="Tên tham số (key)..." />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm param-val" value="${val}" placeholder="Giá trị (value)..." />
      </td>
      <td class="text-center">
        <button type="button" class="btn btn-sm btn-ghost-danger p-1 btn-del-param">
          <i class="ti ti-x"></i>
        </button>
      </td>
    `;
    tr.querySelector('.btn-del-param').addEventListener('click', () => tr.remove());
    return tr;
  }

  async function saveCurrentPresentation(modalEl) {
    const layoutSelect = modalEl.querySelector('#presentationLayoutSelect');
    const layoutId = layoutSelect ? layoutSelect.value : null;

    if (!layoutId) {
      alert('Vui lòng chọn một Layout trang hợp lệ trước khi lưu.');
      return;
    }

    const scopeRadio = modalEl.querySelector('input[name="presentationScope"]:checked');
    const scope = scopeRadio ? scopeRadio.value : 'shared';

    const renderings = [];
    const itemCards = modalEl.querySelectorAll('.rendering-item');
    itemCards.forEach((card, index) => {
      let params = {};
      try {
        params = JSON.parse(card.getAttribute('data-parameters') || '{}');
      } catch (e) {
        params = {};
      }

      renderings.push({
        uid: card.getAttribute('data-uid') || '',
        renderingId: card.getAttribute('data-rendering-id'),
        placeholder: card.getAttribute('data-placeholder') || 'maincontent',
        placeholderKey: card.getAttribute('data-placeholder') || 'maincontent',
        sortOrder: (index + 1) * 100,
        datasourceId: card.getAttribute('data-datasource-id') || null,
        parameters: params,
        hidden: card.getAttribute('data-hidden') === 'true',
      });
    });

    const saveBtn = modalEl.querySelector('#btnSavePresentation');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="ti ti-loader animate-spin"></i> Đang lưu...';
    }

    try {
      const res = await fetch(`/api/presentation/item/${currentItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          layoutId,
          renderings,
          scope,
          lang: currentLang,
          version: currentVersion,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Lỗi HTTP ${res.status}`);
      }

      showToast('Đã lưu cấu hình Presentation thành công!');
      const bsModal = window.bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    } catch (err) {
      alert(`Lỗi khi lưu Presentation: ${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="ti ti-device-floppy"></i> Lưu Cấu Hình';
      }
    }
  }

  return {
    open,
    openPreviewJson,
  };
})();
