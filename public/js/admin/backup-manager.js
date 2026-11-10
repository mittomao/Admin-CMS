/**
 * Treecraft Backup & Restore Manager Client Script (GĐ K1 / DEC-051)
 */

(function () {
  'use strict';

  function getCsrfToken() {
    const input = document.querySelector('input[name="_csrf"]');
    if (input) return input.value;
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function showNotification(message, type = 'info') {
    if (typeof window.toast === 'function') {
      window.toast(message, type);
      return;
    }
    // Fallback bootstrap toast or banner
    alert(`[${type.toUpperCase()}] ${message}`);
  }

  // 1. Create Backup Action
  const btnSubmitCreate = document.getElementById('btn-submit-create-backup');
  if (btnSubmitCreate) {
    btnSubmitCreate.addEventListener('click', async function () {
      const form = document.getElementById('form-create-backup');
      const noteInput = document.getElementById('backup-note');
      const engineSelect = document.getElementById('backup-engine');
      const excludeAuditCheck = document.getElementById('backup-exclude-audit');

      const note = noteInput ? noteInput.value.trim() : '';
      if (!note) {
        alert('Vui lòng nhập ghi chú cho bản sao lưu.');
        if (noteInput) noteInput.focus();
        return;
      }

      btnSubmitCreate.disabled = true;
      const originalHtml = btnSubmitCreate.innerHTML;
      btnSubmitCreate.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Đang sao lưu...';

      try {
        const response = await fetch('/api/backups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            note,
            engine: engineSelect ? engineSelect.value : 'mongodump',
            excludeAuditLogs: excludeAuditCheck ? excludeAuditCheck.checked : false,
            _csrf: getCsrfToken(),
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Khởi tạo sao lưu thất bại.');
        }

        showNotification(data.message || 'Tạo bản sao lưu thành công!', 'success');
        const modalEl = document.getElementById('modal-create-backup');
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
        window.location.reload();
      } catch (err) {
        alert('Lỗi: ' + err.message);
      } finally {
        btnSubmitCreate.disabled = false;
        btnSubmitCreate.innerHTML = originalHtml;
      }
    });
  }

  // 2. Verify Backup Action
  document.querySelectorAll('.btn-verify').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const backupId = this.dataset.id;
      if (!backupId) return;

      const originalHtml = this.innerHTML;
      this.disabled = true;
      this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(backupId)}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ _csrf: getCsrfToken() }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Kiểm tra thất bại.');
        }

        const report = data.data || {};
        const badge = document.getElementById(`verify-badge-${backupId}`);
        if (report.passed) {
          if (badge) {
            badge.className = 'badge bg-success-lt d-inline-flex align-items-center gap-1';
            badge.innerHTML = '<i class="ti ti-shield-check"></i>Đạt chuẩn (100%)';
          }
          showNotification(`Bản sao lưu ${backupId} đạt chuẩn toàn vẹn dữ liệu (${report.filesVerified} files verified).`, 'success');
        } else {
          if (badge) {
            badge.className = 'badge bg-danger-lt d-inline-flex align-items-center gap-1';
            badge.innerHTML = '<i class="ti ti-shield-x"></i>Sai lệch!';
          }
          alert(`CẢNH BÁO TOÀN VẸN: Bản sao lưu ${backupId} bị lỗi: \n` + report.errors.join('\n'));
        }
      } catch (err) {
        alert('Lỗi kiểm tra toàn vẹn: ' + err.message);
      } finally {
        this.disabled = false;
        this.innerHTML = originalHtml;
      }
    });
  });

  // 3. Details Modal
  document.querySelectorAll('.btn-details').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const backupId = this.dataset.id;
      if (!backupId) return;

      const modalEl = document.getElementById('modal-backup-details');
      const loadingEl = document.getElementById('details-loading');
      const contentEl = document.getElementById('details-content');

      if (loadingEl) loadingEl.classList.remove('d-none');
      if (contentEl) contentEl.classList.add('d-none');

      let modalInstance = null;
      if (modalEl && window.bootstrap) {
        modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
      }

      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(backupId)}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Không thể tải chi tiết.');

        const data = json.data || {};
        const m = data.manifest || {};
        const media = data.mediaManifest || {};

        document.getElementById('det-backup-id').textContent = data.backupId;
        document.getElementById('det-created-at').textContent = m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : 'N/A';
        document.getElementById('det-engine').textContent = m.engine || 'mongodump';
        document.getElementById('det-encrypted').textContent = m.isEncrypted ? 'Mã hóa AES-256-GCM' : 'Không mã hóa';
        document.getElementById('det-user').textContent = m.initiatedBy || 'system';

        const sizeKb = data.sizeBytes ? (data.sizeBytes / 1024).toFixed(1) : '0';
        document.getElementById('det-size').textContent = `${sizeKb} KB`;

        // Collections table
        const tbody = document.getElementById('det-collections-tbody');
        tbody.innerHTML = '';
        if (Array.isArray(m.collections) && m.collections.length > 0) {
          m.collections.forEach((c) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${c.name}</strong></td>
              <td class="text-end">${c.count || 0}</td>
              <td class="text-end font-mono text-slate-400 text-2xs truncate max-w-xs" title="${c.checksum || ''}">${(c.checksum || '').substring(0, 16)}...</td>
            `;
            tbody.appendChild(tr);
          });
        } else if (m.archiveFile) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${m.archiveFile}</strong> (Toàn bộ DB)</td>
            <td class="text-end">Full</td>
            <td class="text-end font-mono text-slate-400 text-2xs truncate max-w-xs" title="${m.archiveChecksum || ''}">${(m.archiveChecksum || '').substring(0, 16)}...</td>
          `;
          tbody.appendChild(tr);
        }

        document.getElementById('det-media-count').textContent = media.totalAssets || m.mediaAssetsCount || 0;

        if (loadingEl) loadingEl.classList.add('d-none');
        if (contentEl) contentEl.classList.remove('d-none');
      } catch (err) {
        alert('Lỗi tải chi tiết: ' + err.message);
        if (modalInstance) modalInstance.hide();
      }
    });
  });

  // 4. Restore Wizard Modal
  const modalRestoreEl = document.getElementById('modal-restore-backup');
  const modeTargetDbRadio = document.getElementById('mode-target-db');
  const modeInPlaceRadio = document.getElementById('mode-in-place');
  const sectionTargetDb = document.getElementById('section-target-db');
  const sectionInPlace = document.getElementById('section-in-place');
  const targetDbInput = document.getElementById('restore-target-db-name');
  const confirmDbInput = document.getElementById('restore-confirm-db');
  const btnSubmitRestore = document.getElementById('btn-submit-restore');
  const btnRunDryRun = document.getElementById('btn-run-dry-run');

  function updateRestoreSubmitState() {
    if (!btnSubmitRestore) return;
    const isTargetDb = modeTargetDbRadio && modeTargetDbRadio.checked;
    if (isTargetDb) {
      const val = targetDbInput ? targetDbInput.value.trim() : '';
      btnSubmitRestore.disabled = !val || !/^[a-zA-Z0-9_-]+$/.test(val);
    } else {
      const expectedDb = confirmDbInput ? confirmDbInput.placeholder.trim() : '';
      const actualDb = confirmDbInput ? confirmDbInput.value.trim() : '';
      btnSubmitRestore.disabled = !actualDb || actualDb !== expectedDb;
    }
  }

  if (modeTargetDbRadio && modeInPlaceRadio) {
    modeTargetDbRadio.addEventListener('change', () => {
      sectionTargetDb.classList.remove('d-none');
      sectionInPlace.classList.add('d-none');
      updateRestoreSubmitState();
    });
    modeInPlaceRadio.addEventListener('change', () => {
      sectionTargetDb.classList.add('d-none');
      sectionInPlace.classList.remove('d-none');
      updateRestoreSubmitState();
    });
  }

  if (targetDbInput) {
    targetDbInput.addEventListener('input', updateRestoreSubmitState);
  }
  if (confirmDbInput) {
    confirmDbInput.addEventListener('input', updateRestoreSubmitState);
  }

  document.querySelectorAll('.btn-open-restore').forEach((btn) => {
    btn.addEventListener('click', function () {
      const backupId = this.dataset.id;
      const type = this.dataset.type || 'full';
      const size = this.dataset.size || '';
      const note = this.dataset.note || '';

      document.getElementById('restore-backup-id').value = backupId;
      document.getElementById('restore-summary-id').textContent = backupId;
      document.getElementById('restore-summary-type').textContent = type;
      document.getElementById('restore-summary-size').textContent = size;
      document.getElementById('restore-summary-note').textContent = note ? `Ghi chú: ${note}` : '';

      // Reset fields
      if (modeTargetDbRadio) modeTargetDbRadio.checked = true;
      if (sectionTargetDb) sectionTargetDb.classList.remove('d-none');
      if (sectionInPlace) sectionInPlace.classList.add('d-none');
      if (targetDbInput) targetDbInput.value = `${backupId.replace(/[^a-zA-Z0-9_]/g, '_')}_test`;
      if (confirmDbInput) confirmDbInput.value = '';

      const dryRunBox = document.getElementById('dry-run-results');
      if (dryRunBox) dryRunBox.classList.add('d-none');

      updateRestoreSubmitState();

      if (modalRestoreEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modalRestoreEl).show();
      }
    });
  });

  // Quick Enable Maintenance from Restore Modal
  const btnQuickEnable = document.getElementById('btn-quick-enable-maintenance');
  if (btnQuickEnable) {
    btnQuickEnable.addEventListener('click', async function () {
      btnQuickEnable.disabled = true;
      try {
        const res = await fetch('/api/backups/maintenance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            enabled: true,
            reason: 'Bật bảo trì để thực hiện khôi phục đè trực tiếp (in-place)',
            _csrf: getCsrfToken(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Không thể bật bảo trì.');
        showNotification('Đã kích hoạt Chế độ Bảo trì thành công.', 'success');
        const st = document.getElementById('restore-maintenance-status');
        if (st) st.innerHTML = '<span class="badge bg-success-lt"><i class="ti ti-check me-1"></i>Đang bật (Đủ điều kiện phục hồi)</span>';
        btnQuickEnable.classList.add('d-none');
      } catch (err) {
        alert('Lỗi: ' + err.message);
      } finally {
        btnQuickEnable.disabled = false;
      }
    });
  }

  // Dry Run Button
  if (btnRunDryRun) {
    btnRunDryRun.addEventListener('click', async function () {
      const backupId = document.getElementById('restore-backup-id').value;
      const isTargetDb = modeTargetDbRadio && modeTargetDbRadio.checked;
      const mode = isTargetDb ? 'target-db' : 'in-place';
      const targetDb = targetDbInput ? targetDbInput.value.trim() : '';
      const confirmDbName = confirmDbInput ? confirmDbInput.value.trim() : '';

      btnRunDryRun.disabled = true;
      const originalHtml = btnRunDryRun.innerHTML;
      btnRunDryRun.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Đang kiểm tra...';

      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(backupId)}/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            mode,
            targetDb,
            confirmDbName,
            dryRun: true,
            _csrf: getCsrfToken(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Kiểm tra mô phỏng thất bại.');

        const result = data.data || {};
        const dryRunBox = document.getElementById('dry-run-results');
        const summaryText = document.getElementById('dry-run-summary-text');
        const tbody = document.getElementById('dry-run-tbody');

        if (dryRunBox) dryRunBox.classList.remove('d-none');
        if (summaryText) {
          summaryText.innerHTML = `Mô phỏng khôi phục vào <strong>${result.targetDb || targetDb}</strong>: Tổng cộng <strong>${result.totalCollections || 0} collections</strong>, <strong>${result.totalRecords || 0} bản ghi</strong> sẽ được khôi phục.`;
        }

        if (tbody) {
          tbody.innerHTML = '';
          if (Array.isArray(result.collections)) {
            result.collections.forEach((c) => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td class="text-end">${c.count || 0}</td>
                <td class="text-end"><span class="badge bg-info-lt">Sẵn sàng</span></td>
              `;
              tbody.appendChild(tr);
            });
          }
        }

        showNotification('Kiểm tra mô phỏng hoàn tất an toàn.', 'info');
      } catch (err) {
        alert('Lỗi kiểm tra mô phỏng: ' + err.message);
      } finally {
        btnRunDryRun.disabled = false;
        btnRunDryRun.innerHTML = originalHtml;
      }
    });
  }

  // Submit Restore
  if (btnSubmitRestore) {
    btnSubmitRestore.addEventListener('click', async function () {
      const backupId = document.getElementById('restore-backup-id').value;
      const isTargetDb = modeTargetDbRadio && modeTargetDbRadio.checked;
      const mode = isTargetDb ? 'target-db' : 'in-place';
      const targetDb = targetDbInput ? targetDbInput.value.trim() : '';
      const confirmDbName = confirmDbInput ? confirmDbInput.value.trim() : '';

      if (!isTargetDb) {
        const confirmed = confirm('CẢNH BÁO QUAN TRỌNG: Bạn đang thực hiện khôi phục ĐÈ TRỰC TIẾP lên cơ sở dữ liệu đang chạy. Hệ thống sẽ tự động tạo bản sao lưu an toàn pre-restore trước. Bạn có chắc chắn muốn tiếp tục?');
        if (!confirmed) return;
      }

      btnSubmitRestore.disabled = true;
      const originalHtml = btnSubmitRestore.innerHTML;
      btnSubmitRestore.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Đang khôi phục...';

      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(backupId)}/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            mode,
            targetDb,
            confirmDbName,
            dryRun: false,
            _csrf: getCsrfToken(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Khôi phục thất bại.');

        alert('KHÔI PHỤC THÀNH CÔNG: ' + (data.message || 'Cơ sở dữ liệu đã được phục hồi hoàn tất.'));

        if (mode === 'in-place') {
          // In-place restore invalidated sessions, reload to login
          window.location.href = '/admin/login';
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert('LỖI KHÔI PHỤC: ' + err.message);
        btnSubmitRestore.disabled = false;
        btnSubmitRestore.innerHTML = originalHtml;
      }
    });
  }

  // 5. Delete Backup Action
  document.querySelectorAll('.btn-delete-backup').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const backupId = this.dataset.id;
      if (!backupId) return;

      const confirmed = confirm(`Bạn có chắc chắn muốn xóa bản sao lưu "${backupId}"?\nLưu ý: Không thể hoàn tác hành động này.`);
      if (!confirmed) return;

      this.disabled = true;
      try {
        const res = await fetch(`/api/backups/${encodeURIComponent(backupId)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ _csrf: getCsrfToken() }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Xóa thất bại.');

        showNotification('Đã xóa bản sao lưu thành công.', 'success');
        const row = document.getElementById(`row-${backupId}`);
        if (row) row.remove();
      } catch (err) {
        alert('Lỗi: ' + err.message);
        this.disabled = false;
      }
    });
  });

  // 6. Retention Prune Actions
  const btnPruneDryRun = document.getElementById('btn-prune-dry-run');
  const btnSubmitPrune = document.getElementById('btn-submit-prune');
  const pruneBox = document.getElementById('prune-preview-box');
  const pruneBody = document.getElementById('prune-preview-body');

  async function executePrune(dryRun) {
    const count = document.getElementById('prune-count').value;
    const days = document.getElementById('prune-days').value;

    try {
      const res = await fetch('/api/backups/prune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          dryRun,
          retentionCount: count,
          retentionDays: days,
          _csrf: getCsrfToken(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Dọn dẹp thất bại.');

      const r = data.data || {};
      if (dryRun) {
        if (pruneBox) pruneBox.classList.remove('d-none');
        if (pruneBody) {
          pruneBody.innerHTML = `Sẽ xóa: <strong>${r.wouldPruneCount || 0}</strong> bản sao lưu. Giữ lại: <strong>${r.wouldKeepCount || 0}</strong> bản sao lưu.<br><span class="text-slate-400 font-mono text-2xs">${(r.backupsToPrune || []).join(', ') || 'Không có bản nào cần xóa.'}</span>`;
        }
      } else {
        alert(`Đã dọn dẹp thành công ${r.prunedCount || 0} bản sao lưu cũ. Giữ lại ${r.keptCount || 0} bản.`);
        window.location.reload();
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  }

  if (btnPruneDryRun) {
    btnPruneDryRun.addEventListener('click', () => executePrune(true));
  }
  if (btnSubmitPrune) {
    btnSubmitPrune.addEventListener('click', () => {
      const confirmed = confirm('Bạn có chắc chắn muốn dọn dẹp các bản sao lưu cũ theo chính sách lưu trữ?');
      if (confirmed) executePrune(false);
    });
  }

  // 7. Global Maintenance Toggle Button
  const btnToggleMaintGlobal = document.getElementById('btn-toggle-maintenance-global');
  const btnQuickDisableMaint = document.getElementById('btn-quick-disable-maintenance');

  async function toggleMaintenance(targetEnabled) {
    const msg = targetEnabled
      ? 'Kích hoạt Chế độ Bảo trì sẽ làm website công khai trả về HTTP 503 và tạm khóa các thao tác ghi trên admin. Tiếp tục?'
      : 'Tắt Chế độ Bảo trì để mở lại website công khai và quyền ghi admin bình thường. Tiếp tục?';
    if (!confirm(msg)) return;

    try {
      const res = await fetch('/api/backups/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          enabled: targetEnabled,
          reason: targetEnabled ? 'Bật bảo trì từ trang quản trị Backup & Restore' : 'Hoàn tất bảo trì hệ thống',
          _csrf: getCsrfToken(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể đổi trạng thái bảo trì.');

      showNotification(data.message || 'Cập nhật trạng thái bảo trì thành công.', 'success');
      window.location.reload();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  }

  if (btnToggleMaintGlobal) {
    btnToggleMaintGlobal.addEventListener('click', function () {
      const isMaint = this.dataset.isMaintenance === 'true';
      toggleMaintenance(!isMaint);
    });
  }

  if (btnQuickDisableMaint) {
    btnQuickDisableMaint.addEventListener('click', () => toggleMaintenance(false));
  }
})();

