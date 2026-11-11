/**
 * Treecraft CMS - Section-Based YAML Synchronization Client (DEC-053 / Phase 11-Y2)
 * Handles section status polling, interactive dry-run previews, dependency warnings,
 * and deterministic sync/reserialize execution.
 */

(function () {
  'use strict';

  // Retrieve CSRF token from page
  const metaCsrf = document.querySelector('meta[name="csrf-token"]');
  const CSRF_TOKEN = metaCsrf ? metaCsrf.getAttribute('content') : '';

  // State
  let currentSections = [];
  let activeModalAction = null; // 'reserialize' | 'sync'
  let activeModalTarget = null; // sectionKey | 'all' | 'selected'
  let currentDryRunHash = null;

  // DOM Elements
  const container = document.getElementById('yamlSectionsList');
  const cbSelectAll = document.getElementById('cbSelectAllYamlSections');
  const btnReserializeSelected = document.getElementById('btnReserializeSelected');
  const btnSyncSelected = document.getElementById('btnSyncSelected');
  const btnRefreshStatus = document.getElementById('btnRefreshYamlStatus');

  // Modal Elements
  const modalEl = document.getElementById('yamlSyncModal');
  const modal = modalEl && window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
  const modalTitle = document.getElementById('yamlModalTitle');
  const modalSubtitle = document.getElementById('yamlModalSubtitle');
  const modalIcon = document.getElementById('yamlModalIcon');
  const modalIconBox = document.getElementById('yamlModalIconBox');
  const badgeSection = document.getElementById('yamlBadgeSection');
  const badgeFolder = document.getElementById('yamlBadgeFolder');
  const badgeDb = document.getElementById('yamlBadgeDb');

  const syncConfigBox = document.getElementById('yamlSyncConfigBox');
  const reserializeConfigBox = document.getElementById('yamlReserializeConfigBox');
  const modeCreateOnly = document.getElementById('yamlModeCreateOnly');
  const modeOverwrite = document.getElementById('yamlModeOverwrite');
  const contentOverwriteWarning = document.getElementById('yamlContentOverwriteWarning');
  const cbDeleteMissing = document.getElementById('yamlModalDeleteMissing');
  const cbDeleteMissingFieldsContainer = document.getElementById('yamlModalDeleteMissingFieldsContainer');
  const cbDeleteMissingFields = document.getElementById('yamlModalDeleteMissingFields');
  const cbPruneOrphans = document.getElementById('yamlModalPruneOrphans');

  const dryRunBox = document.getElementById('yamlDryRunBox');
  const dryStatCreate = document.getElementById('dryStatCreate');
  const dryStatUpdate = document.getElementById('dryStatUpdate');
  const dryStatSkip = document.getElementById('dryStatSkip');
  const dryStatTotal = document.getElementById('dryStatTotal');
  const dryRunAlerts = document.getElementById('yamlDryRunAlerts');
  const dryRunFieldDiffs = document.getElementById('yamlDryRunFieldDiffs');
  const fieldDiffsBody = document.getElementById('yamlFieldDiffsBody');
  const dryRunStatusBadge = document.getElementById('yamlDryRunStatusBadge');

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const progressBox = document.getElementById('yamlProgressBox');
  const terminalLogBox = document.getElementById('yamlTerminalLogBox');
  const terminalLogLines = document.getElementById('yamlTerminalLogLines');

  const btnDryRun = document.getElementById('yamlModalDryRunBtn');
  const btnExecute = document.getElementById('yamlModalExecuteBtn');
  const btnExecuteText = document.getElementById('yamlModalExecuteBtnText');
  const btnCancel = document.getElementById('yamlModalCancelBtn');

  /**
   * Helper to append lines to live terminal in modal
   */
  function logToTerminal(msg, colorClass = '') {
    if (!terminalLogBox || !terminalLogLines) return;
    terminalLogBox.classList.remove('d-none');
    const div = document.createElement('div');
    div.className = colorClass || 'text-slate-300';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    terminalLogLines.appendChild(div);
    terminalLogBox.scrollTop = terminalLogBox.scrollHeight;
  }

  function clearTerminal() {
    if (terminalLogLines) terminalLogLines.innerHTML = '';
    if (terminalLogBox) terminalLogBox.classList.add('d-none');
  }

  /**
   * Fetch and render section cards and comparison statuses
   */
  async function loadSections() {
    if (!container) return;
    try {
      const res = await fetch('/api/serialization/sections', {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        if (window.showToast) window.showToast('danger', 'Lỗi', data.message || 'Không thể tải trạng thái sections.');
        return;
      }

      currentSections = data.sections || [];
      renderSectionsList(currentSections);
    } catch (err) {
      if (window.showToast) window.showToast('danger', 'Lỗi kết nối', err.message);
    }
  }

  /**
   * Render section cards HTML
   */
  function renderSectionsList(sections) {
    if (!container) return;
    if (sections.length === 0) {
      container.innerHTML = `
        <div class="text-center p-6 text-slate-400">
          <i class="ti ti-folder-off fs-1 d-block mb-2"></i>
          Không có section nào được cấu hình.
        </div>
      `;
      return;
    }

    let html = '';
    sections.forEach((sec) => {
      const depBadge =
        sec.dependsOn && sec.dependsOn.length > 0
          ? `<span class="badge bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-mono text-[10px] rounded-md px-2 py-0.5" title="Phụ thuộc: ${sec.dependsOn.join(', ')}">
               Dep: ${sec.dependsOn.length}
             </span>`
          : '';

      const lastRes = sec.lastReserializedAt
        ? new Date(sec.lastReserializedAt).toLocaleString('vi-VN')
        : 'Chưa xuất';
      const lastSync = sec.lastSyncedAt
        ? new Date(sec.lastSyncedAt).toLocaleString('vi-VN')
        : 'Chưa sync';

      html += `
        <div class="card p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 shadow-xs mb-3 hover:border-slate-300 transition-all select-none" id="section-card-${sec.key}">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
            
            <!-- Checkbox & Title & Description -->
            <div class="d-flex align-items-start gap-3 flex-grow-1" style="min-width: 280px;">
              <input type="checkbox" class="form-check-input mt-1 cursor-pointer yaml-section-cb" data-key="${sec.key}" id="cb-sec-${sec.key}">
              <div class="flex-grow-1">
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <div class="font-bold text-slate-900 dark:text-slate-100 text-sm d-flex align-items-center gap-1.5">
                    <i class="${sec.icon || 'ti ti-folder'} text-${sec.color || 'primary'}"></i>
                    <span>${sec.label}</span>
                  </div>
                  ${depBadge}
                  <span class="${sec.comparisonClass || 'badge bg-slate-100 text-slate-600'}">
                    ${sec.comparisonLabel}
                  </span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  ${sec.description}
                </div>

                <!-- Counts & Timestamps Bar -->
                <div class="d-flex flex-wrap align-items-center gap-3 text-[11px] text-slate-400">
                  <span><strong>DB:</strong> ${sec.dbCount} items</span>
                  <span>&bull;</span>
                  <span><strong>YAML:</strong> ${sec.yamlCount} files</span>
                  <span>&bull;</span>
                  <span><strong>Lần xuất:</strong> ${lastRes}</span>
                  <span>&bull;</span>
                  <span><strong>Lần sync:</strong> ${lastSync}</span>
                </div>

                <!-- Show Config Accordion Link -->
                <div class="mt-2">
                  <a class="text-[11px] font-semibold text-primary d-inline-flex align-items-center gap-1 cursor-pointer hover:underline" data-bs-toggle="collapse" href="#config-${sec.key}" role="button" aria-expanded="false">
                    <i class="ti ti-adjustments text-xs"></i>
                    <span>Show Config</span>
                  </a>
                  <div class="collapse mt-2" id="config-${sec.key}">
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono">
                      <div><strong>Roots:</strong> ${sec.roots.join(', ')}</div>
                      <div><strong>Folder:</strong> Serialization/${sec.dir || sec.folder}</div>
                      <div><strong>Default Mode:</strong> ${sec.defaultMode}</div>
                      <div><strong>Phụ thuộc:</strong> ${sec.dependsOn.length > 0 ? sec.dependsOn.join(', ') : '(Không)'}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Action Buttons for this Section -->
            <div class="d-flex align-items-center gap-2 shrink-0">
              <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs transition-all active:scale-95 js-btn-reserialize" data-key="${sec.key}">
                <i class="ti ti-upload"></i>
                <span>Reserialize</span>
              </button>
              <button type="button" class="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs transition-all active:scale-95 js-btn-sync" data-key="${sec.key}">
                <i class="ti ti-download"></i>
                <span>Sync</span>
              </button>
            </div>

          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    bindSectionButtons();
  }

  /**
   * Bind event listeners for section card buttons
   */
  function bindSectionButtons() {
    container.querySelectorAll('.js-btn-reserialize').forEach((btn) => {
      btn.addEventListener('click', function () {
        const key = this.getAttribute('data-key');
        openModal('reserialize', key);
      });
    });

    container.querySelectorAll('.js-btn-sync').forEach((btn) => {
      btn.addEventListener('click', function () {
        const key = this.getAttribute('data-key');
        openModal('sync', key);
      });
    });
  }

  /**
   * Open the confirmation / dry-run modal
   */
  function openModal(action, target) {
    if (!modal) return;
    activeModalAction = action;
    activeModalTarget = target;
    currentDryRunHash = null;

    clearTerminal();
    if (progressBox) progressBox.classList.add('d-none');
    if (dryRunBox) dryRunBox.classList.add('d-none');

    const sec = currentSections.find((s) => s.key === target);
    const targetLabel = target === 'all' ? 'Tất Cả Sections' : sec ? sec.label : target;
    const targetFolder = sec ? `Serialization/${sec.dir || sec.folder}` : 'Serialization/...';

    if (badgeSection) badgeSection.textContent = `Section: ${targetLabel}`;
    if (badgeFolder) badgeFolder.textContent = `Thư mục: ${targetFolder}`;
    if (badgeDb) badgeDb.textContent = `DB: Master`;

    if (action === 'reserialize') {
      // Setup Reserialize Modal
      modalTitle.textContent = `Xác Nhận Xuất Dữ Liệu (Reserialize) &bull; ${targetLabel}`;
      modalSubtitle.textContent = 'Hướng dữ liệu: Cơ sở dữ liệu (DB) &rarr; Tệp tin YAML';
      modalIcon.className = 'ti ti-upload fs-2 text-primary';
      modalIconBox.className = 'w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-primary d-flex align-items-center justify-center font-bold';

      syncConfigBox.classList.add('d-none');
      reserializeConfigBox.classList.remove('d-none');
      btnDryRun.classList.add('d-none');
      btnExecute.classList.remove('d-none');
      btnExecute.disabled = false;
      btnExecuteText.textContent = 'Bắt đầu Xuất (Reserialize)';
    } else {
      // Setup Sync Modal
      modalTitle.textContent = `Xác Nhận Đồng Bộ Dữ Liệu (Sync) &bull; ${targetLabel}`;
      modalSubtitle.textContent = 'Hướng dữ liệu: Tệp tin YAML &rarr; Cơ sở dữ liệu (DB)';
      modalIcon.className = 'ti ti-download fs-2 text-success';
      modalIconBox.className = 'w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-success d-flex align-items-center justify-center font-bold';

      syncConfigBox.classList.remove('d-none');
      reserializeConfigBox.classList.add('d-none');
      btnDryRun.classList.remove('d-none');
      btnExecute.classList.remove('d-none');
      btnExecute.disabled = true; // MUST dry run first!
      btnExecuteText.textContent = 'Thực Hiện Sync';

      // Set default mode
      const defMode = sec ? sec.defaultMode : 'createOnly';
      if (defMode === 'overwrite') {
        modeOverwrite.checked = true;
      } else {
        modeCreateOnly.checked = true;
      }
      checkContentOverwriteWarning(target);

      // Show/hide Delete Missing Fields checkbox (DEC-055)
      if (target === 'template' || target === 'all') {
        cbDeleteMissingFieldsContainer?.classList.remove('d-none');
      } else {
        cbDeleteMissingFieldsContainer?.classList.add('d-none');
      }
      if (cbDeleteMissingFields) cbDeleteMissingFields.checked = false;
    }

    modal.show();
  }

  function checkContentOverwriteWarning(targetKey) {
    if (!contentOverwriteWarning) return;
    const isContent = targetKey === 'content' || targetKey === 'all';
    const isOverwrite = modeOverwrite && modeOverwrite.checked;
    if (isContent && isOverwrite) {
      contentOverwriteWarning.classList.remove('d-none');
    } else {
      contentOverwriteWarning.classList.add('d-none');
    }
  }

  [modeCreateOnly, modeOverwrite].forEach((radio) => {
    radio?.addEventListener('change', () => {
      checkContentOverwriteWarning(activeModalTarget);
      // Invalidate dry run hash if mode changes
      currentDryRunHash = null;
      if (btnExecute) btnExecute.disabled = true;
    });
  });

  /**
   * Execute Dry Run from Modal
   */
  btnDryRun?.addEventListener('click', async function () {
    btnDryRun.disabled = true;
    btnDryRun.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang phân tích...';
    clearTerminal();
    logToTerminal(`Bắt đầu chạy Xem trước (Dry-Run) cho section: ${activeModalTarget}...`, 'text-cyan');

    try {
      const mode = modeOverwrite && modeOverwrite.checked ? 'overwrite' : 'createOnly';
      const deleteMissingFields = Boolean(cbDeleteMissingFields && cbDeleteMissingFields.checked);
      const endpoint = `/api/serialization/sections/${activeModalTarget}/sync/dry-run`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': CSRF_TOKEN,
        },
        body: JSON.stringify({ mode, deleteMissingFields }),
      });

      const data = await res.json();
      if (!data.success && !data.result && !data.results) {
        throw new Error(data.message || 'Lỗi khi chạy Dry-Run.');
      }

      const result = data.result || (data.results && data.results[0]) || {};
      currentDryRunHash = result.hash || 'valid-hash';

      dryStatCreate.textContent = result.toCreate || 0;
      dryStatUpdate.textContent = result.toUpdate || 0;
      dryStatSkip.textContent = result.toSkip || 0;
      dryStatTotal.textContent = result.totalFiles || 0;

      // Render Field Diffs Table if any (DEC-055)
      if (dryRunFieldDiffs && fieldDiffsBody) {
        if (result.fieldDiffs && result.fieldDiffs.length > 0) {
          fieldDiffsBody.innerHTML = '';
          for (const d of result.fieldDiffs) {
            const tr = document.createElement('tr');
            let badgeClass = 'bg-blue-50 text-blue-700';
            let actionLabel = 'Sửa';
            if (d.action === 'add') {
              badgeClass = 'bg-emerald-50 text-emerald-700';
              actionLabel = '+ Thêm mới';
            } else if (d.action === 'remove') {
              badgeClass = 'bg-red-50 text-red-700';
              actionLabel = '- Xoá';
            } else if (d.action === 'rename') {
              badgeClass = 'bg-purple-50 text-purple-700';
              actionLabel = 'Đổi tên';
            } else if (d.action === 'reorder') {
              badgeClass = 'bg-slate-100 text-slate-700';
              actionLabel = 'Thứ tự';
            } else if (d.action === 'keep_missing') {
              badgeClass = 'bg-amber-50 text-amber-700';
              actionLabel = 'Giữ nguyên';
            }

            tr.innerHTML = `
              <td class="font-medium">${escapeHtml(d.templateName || '')}</td>
              <td class="font-mono text-[10px]">${escapeHtml(d.fieldName || '')}</td>
              <td><span class="badge ${badgeClass} text-[10px]">${actionLabel}</span></td>
              <td class="text-slate-500">${escapeHtml(d.change || '')}</td>
              <td class="text-center font-bold ${d.usageCount > 0 ? 'text-amber-600' : 'text-slate-400'}">${d.usageCount || 0}</td>
            `;
            fieldDiffsBody.appendChild(tr);
          }
          dryRunFieldDiffs.classList.remove('d-none');
        } else {
          dryRunFieldDiffs.classList.add('d-none');
        }
      }

      // Handle alerts (Missing dependencies & Errors)
      if (dryRunAlerts) {
        dryRunAlerts.innerHTML = '';
        let hasErrors = false;

        if (result.missingDependencies && result.missingDependencies.length > 0) {
          const depDiv = document.createElement('div');
          depDiv.className = 'alert alert-warning p-2 rounded-lg text-xs mt-2 mb-1';
          depDiv.innerHTML = `
            <strong><i class="ti ti-alert-triangle me-1"></i>Thiếu ${result.missingDependencies.length} tham chiếu:</strong>
            <ul class="mb-0 ps-3 mt-1">
              ${result.missingDependencies
                .slice(0, 3)
                .map((d) => `<li>${d.itemPath}: Thiếu ${d.dependencyType} "${d.reference}"</li>`)
                .join('')}
              ${result.missingDependencies.length > 3 ? `<li>... và ${result.missingDependencies.length - 3} mục khác</li>` : ''}
            </ul>
            <div class="mt-1 font-semibold">Khuyến nghị: Vui lòng đồng bộ (Sync) section Template hoặc Layout trước.</div>
          `;
          dryRunAlerts.appendChild(depDiv);
        }

        if (result.errors && result.errors.length > 0) {
          hasErrors = true;
          const errDiv = document.createElement('div');
          errDiv.className = 'alert alert-danger p-2 rounded-lg text-xs mt-2 mb-0';
          errDiv.innerHTML = `
            <strong><i class="ti ti-x me-1"></i>Phát hiện ${result.errors.length} lỗi cấu trúc:</strong>
            <ul class="mb-0 ps-3 mt-1">
              ${result.errors.map((e) => `<li>${e.file}: ${e.error}</li>`).join('')}
            </ul>
          `;
          dryRunAlerts.appendChild(errDiv);
        }

        if (dryRunAlerts.innerHTML !== '') {
          dryRunAlerts.classList.remove('d-none');
        } else {
          dryRunAlerts.classList.add('d-none');
        }

        if (hasErrors) {
          dryRunStatusBadge.className = 'badge bg-red-50 text-red-700 font-mono text-[10px]';
          dryRunStatusBadge.textContent = 'Có Lỗi';
          btnExecute.disabled = true;
        } else {
          dryRunStatusBadge.className = 'badge bg-emerald-50 text-emerald-700 font-mono text-[10px]';
          dryRunStatusBadge.textContent = 'Hợp Lệ';
          btnExecute.disabled = false; // Enabled after successful dry-run!
        }
      }

      dryRunBox.classList.remove('d-none');
      logToTerminal(`✓ Hoàn thành Dry-Run. Sẽ tạo: ${result.toCreate}, Cập nhật: ${result.toUpdate}, Bỏ qua: ${result.toSkip}`, 'text-emerald-400');
    } catch (err) {
      logToTerminal(`x Lỗi Dry-Run: ${err.message}`, 'text-red-400');
      if (window.showToast) window.showToast('danger', 'Lỗi Dry-Run', err.message);
    } finally {
      btnDryRun.disabled = false;
      btnDryRun.innerHTML = '<i class="ti ti-eye"></i> <span>Chạy Xem Trước (Dry-Run)</span>';
    }
  });

  /**
   * Execute Action from Modal (Reserialize or Sync)
   */
  btnExecute?.addEventListener('click', async function () {
    btnExecute.disabled = true;
    btnExecute.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang xử lý...';
    if (btnDryRun) btnDryRun.disabled = true;
    if (progressBox) progressBox.classList.remove('d-none');

    try {
      if (activeModalAction === 'reserialize') {
        logToTerminal(`Bắt đầu xuất dữ liệu (Reserialize) cho ${activeModalTarget}...`, 'text-cyan');
        const pruneOrphans = cbPruneOrphans && cbPruneOrphans.checked;

        const res = await fetch(`/api/serialization/sections/${activeModalTarget}/reserialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': CSRF_TOKEN,
          },
          body: JSON.stringify({ pruneOrphans }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Lỗi khi Reserialize.');

        logToTerminal(`✓ Hoàn tất Reserialize! ${data.message}`, 'text-emerald-400');
        if (window.showToast) window.showToast('success', 'Xuất Hoàn Tất', data.message);
      } else {
        logToTerminal(`Bắt đầu đồng bộ vào Database (Sync) cho ${activeModalTarget}...`, 'text-cyan');
        const mode = modeOverwrite && modeOverwrite.checked ? 'overwrite' : 'createOnly';
        const deleteMissing = cbDeleteMissing && cbDeleteMissing.checked;
        const deleteMissingFields = Boolean(cbDeleteMissingFields && cbDeleteMissingFields.checked);

        const res = await fetch(`/api/serialization/sections/${activeModalTarget}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': CSRF_TOKEN,
          },
          body: JSON.stringify({
            mode,
            dryRunHash: currentDryRunHash,
            deleteMissing,
            deleteMissingFields,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Lỗi khi Sync vào Database.');

        logToTerminal(`✓ Hoàn tất Sync! ${data.message}`, 'text-emerald-400');
        if (window.showToast) window.showToast('success', 'Sync Hoàn Tất', data.message);
      }

      await loadSections();
      setTimeout(() => {
        if (modal) modal.hide();
      }, 1500);
    } catch (err) {
      logToTerminal(`x Lỗi thực thi: ${err.message}`, 'text-red-400');
      if (window.showToast) window.showToast('danger', 'Lỗi Thực Thi', err.message);
    } finally {
      btnExecute.disabled = false;
      btnExecute.innerHTML = '<i class="ti ti-player-play"></i> <span>Thực Hiện</span>';
      if (btnDryRun) btnDryRun.disabled = false;
      if (progressBox) progressBox.classList.add('d-none');
    }
  });

  // Select all checkbox
  cbSelectAll?.addEventListener('change', function () {
    const isChecked = this.checked;
    container.querySelectorAll('.yaml-section-cb').forEach((cb) => {
      cb.checked = isChecked;
    });
  });

  // Refresh status button
  btnRefreshStatus?.addEventListener('click', async function () {
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang nạp...';
    await loadSections();
    this.innerHTML = '<i class="ti ti-refresh me-1"></i> Làm mới trạng thái';
  });

  // Batch actions
  btnReserializeSelected?.addEventListener('click', function () {
    const checked = Array.from(container.querySelectorAll('.yaml-section-cb:checked')).map((cb) =>
      cb.getAttribute('data-key')
    );
    if (checked.length === 0) {
      if (window.showToast) window.showToast('warning', 'Chưa chọn mục', 'Vui lòng chọn ít nhất một section để reserialize.');
      return;
    }
    openModal('reserialize', checked.length === currentSections.length ? 'all' : checked[0]);
  });

  btnSyncSelected?.addEventListener('click', function () {
    const checked = Array.from(container.querySelectorAll('.yaml-section-cb:checked')).map((cb) =>
      cb.getAttribute('data-key')
    );
    if (checked.length === 0) {
      if (window.showToast) window.showToast('warning', 'Chưa chọn mục', 'Vui lòng chọn ít nhất một section để sync.');
      return;
    }
    openModal('sync', checked.length === currentSections.length ? 'all' : checked[0]);
  });

  // Initial load
  document.addEventListener('DOMContentLoaded', loadSections);
})();

