/**
 * Treecraft CMS - Universal Custom Field System
 * Repeater Field Engine (Client-side interactivity, SortableJS, Array Serialization)
 */

(function () {
  'use strict';

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  function updateRepeaterPayload(container) {
    if (!container) return;
    const fieldId = container.dataset.fieldId;
    const listEl = container.querySelector('.repeater-list');
    const payloadInput = container.querySelector('.repeater-payload-input');
    const countBadge = container.querySelector('.repeater-count');
    if (!listEl || !payloadInput) return;

    const rows = listEl.querySelectorAll('.repeater-row');
    const result = [];

    rows.forEach((row, idx) => {
      // Update index badge
      const indexEl = row.querySelector('.repeater-row-index');
      if (indexEl) indexEl.textContent = String(idx + 1);

      const item = {
        _uid: row.dataset.uid || generateUUID(),
      };
      row.dataset.uid = item._uid;

      // Extract subfields
      const subInputs = row.querySelectorAll('.repeater-subfield-input');
      subInputs.forEach((input) => {
        const name = input.dataset.subfieldName;
        if (!name) return;

        if (input.type === 'checkbox') {
          item[name] = input.checked;
        } else if (input.type === 'number') {
          item[name] = input.value !== '' ? Number(input.value) : null;
        } else {
          item[name] = input.value;
        }
      });

      // Update row title preview from first text field
      const titleEl = row.querySelector('.repeater-row-title');
      if (titleEl && subInputs[0]) {
        const previewVal = subInputs[0].value.trim();
        titleEl.textContent = previewVal || 'Mục #' + (idx + 1);
      }

      result.push(item);
    });

    if (countBadge) countBadge.textContent = String(result.length);
    payloadInput.value = JSON.stringify(result);

    // Notify form of changes
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    payloadInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function initSortableOnList(listEl, container) {
    if (!listEl || typeof window.Sortable === 'undefined') return;
    if (listEl._sortable) return; // already initialized

    listEl._sortable = new window.Sortable(listEl, {
      handle: '.repeater-drag-handle',
      animation: 150,
      ghostClass: 'bg-blue-50/70',
      onEnd: function () {
        updateRepeaterPayload(container);
      },
    });
  }

  function checkEmptyState(container) {
    const listEl = container.querySelector('.repeater-list');
    if (!listEl) return;
    const rows = listEl.querySelectorAll('.repeater-row');
    const emptyEl = listEl.querySelector('.repeater-empty');

    if (rows.length === 0) {
      if (!emptyEl) {
        const div = document.createElement('div');
        div.className =
          'repeater-empty text-center py-4 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 select-none';
        div.innerHTML = `
          <i class="ti ti-list-details text-2xl text-slate-400 mb-1 d-block"></i>
          <div class="text-xs text-slate-500 font-medium">Chưa có mục nào được thêm vào danh sách</div>
          <div class="text-[11px] text-slate-400 mt-0.5">Bấm nút bên dưới để bắt đầu thêm mục đầu tiên.</div>
        `;
        listEl.appendChild(div);
      }
    } else {
      if (emptyEl) emptyEl.remove();
    }
  }

  function initRepeater(container) {
    if (container._repeaterInitialized) return;
    container._repeaterInitialized = true;

    const fieldId = container.dataset.fieldId;
    const listEl = container.querySelector('.repeater-list');
    const templateEl = document.getElementById('repeater-row-tpl-' + fieldId);
    const maxItems = container.dataset.maxItems ? Number(container.dataset.maxItems) : null;

    initSortableOnList(listEl, container);

    // Add Row Handler
    const addBtn = container.querySelector('.btn-add-repeater-row');
    if (addBtn && templateEl) {
      addBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const currentCount = listEl.querySelectorAll('.repeater-row').length;
        if (maxItems && currentCount >= maxItems) {
          alert('Đã đạt giới hạn tối đa ' + maxItems + ' mục.');
          return;
        }

        const clone = templateEl.content.cloneNode(true);
        const rowEl = clone.querySelector('.repeater-row');
        rowEl.dataset.uid = generateUUID();

        const emptyEl = listEl.querySelector('.repeater-empty');
        if (emptyEl) emptyEl.remove();

        listEl.appendChild(rowEl);
        updateRepeaterPayload(container);
      });
    }

    // Delegated List Click Events (Delete, Clone, Collapse)
    listEl.addEventListener('click', function (e) {
      // 1. Delete Row
      const removeBtn = e.target.closest('.btn-remove-row');
      if (removeBtn) {
        e.preventDefault();
        const row = removeBtn.closest('.repeater-row');
        if (row) {
          row.remove();
          checkEmptyState(container);
          updateRepeaterPayload(container);
        }
        return;
      }

      // 2. Clone Row
      const cloneBtn = e.target.closest('.btn-clone-row');
      if (cloneBtn) {
        e.preventDefault();
        const row = cloneBtn.closest('.repeater-row');
        if (row) {
          const currentCount = listEl.querySelectorAll('.repeater-row').length;
          if (maxItems && currentCount >= maxItems) {
            alert('Đã đạt giới hạn tối đa ' + maxItems + ' mục.');
            return;
          }

          const clonedRow = row.cloneNode(true);
          clonedRow.dataset.uid = generateUUID();
          row.after(clonedRow);
          updateRepeaterPayload(container);
        }
        return;
      }

      // 3. Toggle Collapse
      const collapseBtn = e.target.closest('.btn-toggle-collapse');
      if (collapseBtn) {
        e.preventDefault();
        const row = collapseBtn.closest('.repeater-row');
        const body = row ? row.querySelector('.repeater-row-body') : null;
        const icon = collapseBtn.querySelector('i');
        if (body) {
          const isHidden = body.classList.toggle('d-none');
          if (icon) {
            icon.className = isHidden ? 'ti ti-chevron-right text-xs' : 'ti ti-chevron-down text-xs';
          }
        }
      }
    });

    // Delegated Input Change Events
    listEl.addEventListener('input', function (e) {
      if (e.target.classList.contains('repeater-subfield-input')) {
        updateRepeaterPayload(container);
      }
    });

    listEl.addEventListener('change', function (e) {
      if (e.target.classList.contains('repeater-subfield-input')) {
        updateRepeaterPayload(container);
      }
    });
  }

  function initAllRepeaters() {
    document.querySelectorAll('.repeater-container').forEach(initRepeater);
  }

  // Auto-init on page load and dynamically on content editor reloads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllRepeaters);
  } else {
    initAllRepeaters();
  }

  window.TreecraftRepeater = {
    initAll: initAllRepeaters,
    init: initRepeater,
  };
})();

