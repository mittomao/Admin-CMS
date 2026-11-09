'use strict';

/**
 * Treecraft CMS - Language Manager Frontend Script (GĐ L1 / DEC-048)
 * Handles client-side interactions, AJAX calls, drag-and-drop sorting,
 * URL prefix previews, and Toast notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = document.getElementById('langCsrfToken')?.value || '';
  const toastEl = document.getElementById('languageToast');
  const toastMsg = document.getElementById('languageToastMessage');
  const bsToast = toastEl && window.bootstrap ? new window.bootstrap.Toast(toastEl, { delay: 4000 }) : null;

  function showToast(message, type = 'success') {
    if (!toastEl || !toastMsg) return;
    toastEl.className = `toast align-items-center border-0 shadow-lg rounded-xl text-white ${
      type === 'success' ? 'bg-green-600' : type === 'danger' ? 'bg-red-600' : 'bg-amber-600'
    }`;
    const icon = type === 'success' ? 'ti ti-circle-check' : type === 'danger' ? 'ti ti-alert-circle' : 'ti ti-alert-triangle';
    toastMsg.innerHTML = `<i class="${icon} fs-2"></i><span>${message}</span>`;
    if (bsToast) bsToast.show();
  }

  // --- Modal Instances ---
  const modalLangEl = document.getElementById('modalLanguage');
  const bsModalLang = modalLangEl && window.bootstrap ? new window.bootstrap.Modal(modalLangEl) : null;

  const modalDefEl = document.getElementById('modalConfirmDefault');
  const bsModalDef = modalDefEl && window.bootstrap ? new window.bootstrap.Modal(modalDefEl) : null;

  const modalDelEl = document.getElementById('modalConfirmDelete');
  const bsModalDel = modalDelEl && window.bootstrap ? new window.bootstrap.Modal(modalDelEl) : null;

  // --- Form & Inputs ---
  const formLang = document.getElementById('formLanguage');
  const isEditInput = document.getElementById('langIsEdit');
  const expectedUpdatedAtInput = document.getElementById('langExpectedUpdatedAt');
  const codeInput = document.getElementById('langCode');
  const displayNameInput = document.getElementById('langDisplayName');
  const nativeNameInput = document.getElementById('langNativeName');
  const directionSelect = document.getElementById('langDirection');
  const urlPrefixInput = document.getElementById('langUrlPrefix');
  const fallbackSelect = document.getElementById('langFallback');
  const sortOrderInput = document.getElementById('langSortOrder');
  const flagIconInput = document.getElementById('langFlagIcon');
  const enabledCheckbox = document.getElementById('langEnabled');
  const previewUrlSpan = document.getElementById('previewUrlPrefix');
  const modalTitleSpan = document.getElementById('modalLanguageTitleText');
  const btnSubmitText = document.getElementById('btnSubmitLanguageText');
  const commonPresets = document.getElementById('commonPresetsContainer');

  // URL Prefix Live Preview
  function updateUrlPreview() {
    if (!previewUrlSpan) return;
    const prefix = (urlPrefixInput.value || codeInput.value || 'xx').trim().toLowerCase();
    previewUrlSpan.textContent = `https://domain.com/${prefix}/about-us`;
  }

  if (codeInput) codeInput.addEventListener('input', updateUrlPreview);
  if (urlPrefixInput) urlPrefixInput.addEventListener('input', updateUrlPreview);

  // Preset Chips Click Handler
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (codeInput && !codeInput.readOnly) {
        codeInput.value = btn.dataset.code || '';
        displayNameInput.value = btn.dataset.name || '';
        nativeNameInput.value = btn.dataset.native || '';
        directionSelect.value = btn.dataset.dir || 'ltr';
        if (urlPrefixInput) urlPrefixInput.value = (btn.dataset.code || '').toLowerCase();
        updateUrlPreview();
      }
    });
  });

  // --- Open Add Language Modal ---
  const btnAdd = document.getElementById('btn-add-language');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      formLang.reset();
      isEditInput.value = '0';
      expectedUpdatedAtInput.value = '';
      codeInput.readOnly = false;
      codeInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
      if (commonPresets) commonPresets.style.display = 'block';
      modalTitleSpan.textContent = 'Thêm Ngôn Ngữ Mới';
      btnSubmitText.textContent = 'Lưu Ngôn Ngữ';
      enabledCheckbox.checked = true;
      updateUrlPreview();
      if (bsModalLang) bsModalLang.show();
    });
  }

  // --- Open Edit Language Modal ---
  document.querySelectorAll('.btn-edit-language').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.code;
      if (!code) return;

      try {
        const res = await fetch(`/api/languages/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.message || 'Không thể tải thông tin ngôn ngữ.');
        }

        const data = json.data;
        isEditInput.value = '1';
        expectedUpdatedAtInput.value = data.updatedAt || '';
        codeInput.value = data.code || '';
        codeInput.readOnly = true;
        codeInput.classList.add('bg-slate-100', 'cursor-not-allowed');
        if (commonPresets) commonPresets.style.display = 'none';

        displayNameInput.value = data.displayName || '';
        nativeNameInput.value = data.nativeName || '';
        directionSelect.value = data.direction || 'ltr';
        urlPrefixInput.value = data.urlPrefix || '';
        fallbackSelect.value = data.fallbackLanguage || '';
        sortOrderInput.value = data.sortOrder || 100;
        flagIconInput.value = data.flagIcon || 'ti ti-world';
        enabledCheckbox.checked = Boolean(data.enabled);

        modalTitleSpan.textContent = `Chỉnh Sửa Ngôn Ngữ: ${data.displayName} (${data.code})`;
        btnSubmitText.textContent = 'Lưu Thay Đổi';
        updateUrlPreview();

        if (bsModalLang) bsModalLang.show();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  });

  // --- Form Submit (Create / Update) ---
  if (formLang) {
    formLang.addEventListener('submit', async (e) => {
      e.preventDefault();

      const isEdit = isEditInput.value === '1';
      const code = codeInput.value.trim();
      const payload = {
        code,
        displayName: displayNameInput.value.trim(),
        nativeName: nativeNameInput.value.trim(),
        direction: directionSelect.value,
        urlPrefix: urlPrefixInput.value.trim(),
        fallbackLanguage: fallbackSelect.value.trim(),
        sortOrder: parseInt(sortOrderInput.value, 10) || 100,
        flagIcon: flagIconInput.value.trim(),
        enabled: enabledCheckbox.checked,
        expectedUpdatedAt: expectedUpdatedAtInput.value || undefined,
        _csrf: csrfToken,
      };

      const url = isEdit ? `/api/languages/${encodeURIComponent(code)}` : '/api/languages';
      const method = isEdit ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Lỗi xử lý yêu cầu.');
        }

        if (bsModalLang) bsModalLang.hide();
        showToast(json.message || 'Thao tác thành công.', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // --- Toggle Enable / Disable Switch ---
  document.querySelectorAll('.lang-status-toggle').forEach((switchInput) => {
    switchInput.addEventListener('change', async () => {
      const code = switchInput.dataset.code;
      const willEnable = switchInput.checked;
      const endpoint = willEnable ? 'enable' : 'disable';

      try {
        const res = await fetch(`/api/languages/${encodeURIComponent(code)}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ _csrf: csrfToken }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không thể thay đổi trạng thái.');
        }

        showToast(json.message, 'success');
      } catch (err) {
        // Revert switch on error
        switchInput.checked = !willEnable;
        showToast(err.message, 'danger');
      }
    });
  });

  // --- Set Default Language ---
  let pendingDefaultCode = null;
  document.querySelectorAll('.btn-set-default').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDefaultCode = btn.dataset.code;
      const codeHolder = document.getElementById('confirmDefaultLangCode');
      if (codeHolder) codeHolder.textContent = pendingDefaultCode;
      if (bsModalDef) bsModalDef.show();
    });
  });

  const btnConfirmDef = document.getElementById('btnConfirmSetDefault');
  if (btnConfirmDef) {
    btnConfirmDef.addEventListener('click', async () => {
      if (!pendingDefaultCode) return;
      try {
        const res = await fetch('/api/languages/default', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ code: pendingDefaultCode, _csrf: csrfToken }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không thể đổi ngôn ngữ mặc định.');
        }

        if (bsModalDef) bsModalDef.hide();
        showToast(json.message, 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // --- Delete Language ---
  let pendingDeleteCode = null;
  document.querySelectorAll('.btn-delete-language').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDeleteCode = btn.dataset.code;
      const codeHolder = document.getElementById('confirmDeleteLangCode');
      if (codeHolder) codeHolder.textContent = pendingDeleteCode;
      if (bsModalDel) bsModalDel.show();
    });
  });

  const btnConfirmDel = document.getElementById('btnConfirmDeleteLanguage');
  if (btnConfirmDel) {
    btnConfirmDel.addEventListener('click', async () => {
      if (!pendingDeleteCode) return;
      try {
        const res = await fetch(`/api/languages/${encodeURIComponent(pendingDeleteCode)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ _csrf: csrfToken }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không thể xóa ngôn ngữ.');
        }

        if (bsModalDel) bsModalDel.hide();
        showToast(json.message, 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // --- Native Drag & Drop Reordering ---
  const tbody = document.getElementById('languagesTableBody');
  let draggedRow = null;

  if (tbody) {
    tbody.querySelectorAll('.language-row').forEach((row) => {
      row.draggable = true;

      row.addEventListener('dragstart', (e) => {
        draggedRow = row;
        row.classList.add('opacity-50', 'bg-blue-50');
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        if (draggedRow) draggedRow.classList.remove('opacity-50', 'bg-blue-50');
        draggedRow = null;
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetRow = e.target.closest('.language-row');
        if (targetRow && targetRow !== draggedRow) {
          const rect = targetRow.getBoundingClientRect();
          const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
          tbody.insertBefore(draggedRow, next ? targetRow.nextSibling : targetRow);
        }
      });

      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        const orderedCodes = Array.from(tbody.querySelectorAll('.language-row')).map(
          (r) => r.dataset.code
        );

        try {
          const res = await fetch('/api/languages/reorder', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ orderedCodes, _csrf: csrfToken }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.message || 'Không thể lưu thứ tự ngôn ngữ.');
          }

          showToast('Đã lưu thứ tự sắp xếp ngôn ngữ mới.', 'success');
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    });
  }
});

