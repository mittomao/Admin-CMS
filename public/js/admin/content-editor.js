/**
 * Content Editor Client Application
 * Sitecore XM-style Tree, Ribbon Controls, Form Validation & Optimistic Locking
 */

import { MediaPicker } from './media-picker.js';
import { initRichTextEditors } from './tinymce-config.js';

// Helper to get CSRF Token from meta tag
const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
};

// Global State
let treeInstance = null;
let currentItemId = window.__INITIAL_ITEM_ID__ || null;
let currentViewMode = 'content'; // 'content' or 'folder'
let isFormDirty = false;

// Version & Language State (GĐ 4)
const initialUrlParams = new URLSearchParams(window.location.search);
let currentLang = (initialUrlParams.get('lang') || 'vi').toLowerCase();
let currentVersion = parseInt(initialUrlParams.get('version'), 10) || 1;

document.addEventListener('DOMContentLoaded', () => {
  window.__markFormDirty = () => {
    isFormDirty = true;
    updateDirtyState(true);
  };
  initContentTree();
  initRibbonEvents();
  initWorkspaceEvents();
  initTreeSearch();
  initDirtyTracker();
});

// ==========================================
// 1. Content Tree Initialization (Fancytree)
// ==========================================
function initContentTree() {
  if (typeof window.jQuery === 'undefined' || !window.jQuery.fn.fancytree) {
    console.error('Fancytree or jQuery is not loaded.');
    return;
  }

  const $ = window.jQuery;

  $('#contentTree').fancytree({
    extensions: ['filter', 'dnd5'],
    autoScroll: true,
    quicksearch: true,
    clickFolderMode: 3, // Click on folder activates and expands/collapses
    filter: {
      autoApply: true,
      autoExpand: true,
      counter: true,
      fuzzy: false,
      hideExpandedCounter: true,
      hideExpanders: false,
      highlight: true,
      leavesOnly: false,
      nodata: true,
      mode: 'dimm',
    },
    dnd5: {
      autoExpandMS: 400,
      preventRecursion: true,
      preventVoidMoves: true,
      dragStart: (node) => {
        // Disallow dragging root node
        return node.parent && node.parent.key !== 'root_node';
      },
      dragEnter: (node, data) => {
        // Only allow dropping on valid nodes
        return true;
      },
      dragDrop: async (node, data) => {
        const sourceNode = data.otherNode;
        const targetParent = node;

        if (!sourceNode || !targetParent) return;

        try {
          const res = await fetch(`/api/items/${sourceNode.key}/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({ targetParentId: targetParent.key }),
          });

          const result = await res.json();
          if (!res.ok || !result.success) {
            showToast(result.message || 'Failed to move item.', 'danger');
            return;
          }

          sourceNode.moveTo(targetParent, 'child');
          targetParent.setExpanded(true);
          showToast(result.message || 'Item moved successfully.', 'success');
        } catch (err) {
          showToast(`Network error: ${err.message}`, 'danger');
        }
      },
    },
    source: {
      url: '/api/items/root/children',
      cache: false,
    },
    lazyLoad: (event, data) => {
      const node = data.node;
      data.result = {
        url: `/api/items/${node.key}/children`,
        cache: false,
      };
    },
    init: (event, data) => {
      treeInstance = $.ui.fancytree.getTree('#contentTree');
      updateTreeStatus('Tree loaded');

      // Expand root and activate initial item
      const rootNode = treeInstance.getRootNode().getFirstChild();
      if (rootNode) {
        rootNode.setExpanded(true).done(() => {
          if (currentItemId) {
            activateNodeById(currentItemId);
          } else {
            rootNode.setActive(true);
          }
        });
      }
    },
    activate: (event, data) => {
      const node = data.node;
      if (!node) return;

      if (isFormDirty) {
        // Show confirmation before discarding
        if (!confirm('You have unsaved changes. Discard changes and navigate to selected item?')) {
          // Revert selection
          return;
        }
        isFormDirty = false;
        updateDirtyState(false);
      }

      currentItemId = node.key;
      updateRibbonContext(node);

      // Auto-expand node on click if it has children and is collapsed
      if (node.isLazy() && !node.isExpanded()) {
        node.setExpanded(true);
      }

      loadItemWorkspace(node.key, currentViewMode);
      window.history.pushState(null, '', `/admin/content-editor/${node.key}`);
    },
  });
}

function activateNodeById(id) {
  if (!treeInstance || !id) return;
  const node = treeInstance.getNodeByKey(id);
  if (node) {
    node.setActive(true);
    node.makeVisible();
  }
}

function updateTreeStatus(text) {
  const statusEl = document.getElementById('treeStatusText');
  if (statusEl) statusEl.textContent = text;
}

// ==========================================
// 2. Workspace Content Loading
// ==========================================
async function loadItemWorkspace(itemId, mode = 'content', lang = null, version = null) {
  const workspace = document.getElementById('editorWorkspace');
  if (!workspace || !itemId) return;

  if (lang) currentLang = lang.toLowerCase();
  if (version) currentVersion = parseInt(version, 10);

  workspace.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <span class="ms-2 text-muted">Loading ${mode === 'folder' ? 'child items' : 'item form'}...</span>
    </div>
  `;

  try {
    const query = `?lang=${encodeURIComponent(currentLang)}&version=${encodeURIComponent(currentVersion)}`;
    const endpoint = mode === 'folder'
      ? `/admin/content-editor/item/${itemId}/folder-view${query}`
      : `/admin/content-editor/item/${itemId}/form${query}`;

    const res = await fetch(endpoint, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const html = await res.text();
    workspace.innerHTML = html;

    // Read active values from form dataset if rendered
    const renderedForm = document.getElementById('itemEditForm');
    if (renderedForm) {
      currentLang = (renderedForm.getAttribute('data-lang') || currentLang).toLowerCase();
      currentVersion = parseInt(renderedForm.getAttribute('data-version'), 10) || currentVersion;
    }

    // Reflect in URL without page reload
    window.history.pushState(null, '', `/admin/content-editor/${itemId}?lang=${currentLang}&version=${currentVersion}`);

    // Reset dirty state
    isFormDirty = false;
    updateDirtyState(false);

    // Re-attach form events
    attachItemFormEvents();
    attachFolderViewEvents();
  } catch (err) {
    workspace.innerHTML = `
      <div class="alert alert-danger m-3">
        <h4 class="alert-title">Failed to load item</h4>
        <div class="text-secondary">${err.message}</div>
      </div>
    `;
  }
}

// ==========================================
// 3. Ribbon Toolbar Controls & Actions
// ==========================================
function initRibbonEvents() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    handleRibbonAction(action);
  });
}

async function handleRibbonAction(action) {
  if (!currentItemId) {
    showToast('Please select an item first.', 'warning');
    return;
  }

  const activeNode = treeInstance ? treeInstance.getActiveNode() : null;

  switch (action) {
    case 'save':
      submitItemForm();
      break;

    case 'refresh':
      loadItemWorkspace(currentItemId, currentViewMode);
      showToast('Item reloaded.', 'info');
      break;

    case 'insert-modal':
      openInsertModal();
      break;

    case 'duplicate':
      handleDuplicateItem();
      break;

    case 'copy-modal':
    case 'move-modal':
      openMoveModal();
      break;

    case 'rename-modal':
      openRenameModal();
      break;

    case 'delete-modal':
      openDeleteModal();
      break;

    case 'sort-up':
      handleSortItem('up');
      break;

    case 'sort-down':
      handleSortItem('down');
      break;

    case 'sort-first':
      handleSortItem('first');
      break;

    case 'sort-last':
      handleSortItem('last');
      break;

    // GĐ 4: Version & Language Ribbon Actions
    case 'add-version':
      openAddVersionModal();
      break;

    case 'version-history-modal':
      openVersionHistoryModal();
      break;

    case 'compare-versions-modal':
      openCompareVersionsModal();
      break;

    case 'restore-version-modal':
      openVersionHistoryModal();
      break;

    case 'delete-version-modal':
      openDeleteVersionModal();
      break;

    case 'add-language-modal':
      openAddLanguageModal();
      break;
  }
}

function updateRibbonContext(node) {
  const isRoot = !node.parent || node.parent.key === 'root_node' || (node.data && node.data.path === '/sitecore');

  const btnDelete = document.getElementById('btn-delete');
  const btnRename = document.getElementById('btn-rename');
  const btnMoveTo = document.getElementById('btn-move-to');

  if (btnDelete) btnDelete.disabled = isRoot;
  if (btnRename) btnRename.disabled = isRoot;
  if (btnMoveTo) btnMoveTo.disabled = isRoot;
}

// ==========================================
// 4. Form Submission & Optimistic Locking
// ==========================================
function attachItemFormEvents() {
  const form = document.getElementById('itemEditForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitItemForm();
  });

  const quickSaveBtn = document.getElementById('quickSaveBtn');
  if (quickSaveBtn) {
    quickSaveBtn.addEventListener('click', () => submitItemForm());
  }

  const btnDiscard = document.getElementById('btnDiscardChanges');
  if (btnDiscard) {
    btnDiscard.addEventListener('click', () => {
      loadItemWorkspace(currentItemId, currentViewMode);
    });
  }

  // Quick switch to folder view when on an empty folder item
  const btnSwitchToFolder = document.getElementById('btnSwitchToFolderView');
  if (btnSwitchToFolder) {
    btnSwitchToFolder.addEventListener('click', () => {
      const btnFolder = document.getElementById('btnModeFolder');
      const btnContent = document.getElementById('btnModeContent');
      if (btnFolder) btnFolder.classList.add('active');
      if (btnContent) btnContent.classList.remove('active');
      currentViewMode = 'folder';
      loadItemWorkspace(currentItemId, 'folder');
    });
  }

  // Keyboard shortcut Ctrl+S
  form.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      submitItemForm();
    }
  });

  // Track inputs for dirty state
  const inputs = form.querySelectorAll('.item-field-input');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      isFormDirty = true;
      updateDirtyState(true);
    });
    input.addEventListener('change', () => {
      isFormDirty = true;
      updateDirtyState(true);
    });
  });

  // Reset field to Standard Value
  const resetBtns = form.querySelectorAll('.btn-reset-std-val');
  resetBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const fieldId = btn.getAttribute('data-field-id');
      const fieldName = btn.getAttribute('data-field-name') || 'Field';

      if (!confirm(`Reset "${fieldName}" to its standard value from the template?`)) {
        return;
      }

      btn.disabled = true;
      try {
        const res = await fetch(`/api/items/${currentItemId}/reset-standard-value`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ fieldId }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || 'Failed to reset field');
        }

        showToast('Field has been reset to its template standard value.', 'success');
        await loadItemWorkspace(currentItemId, currentViewMode);
      } catch (err) {
        showToast(err.message, 'danger');
        btn.disabled = false;
      }
    });
  });

  // Language Switcher items (GĐ 4)
  const langItems = form.querySelectorAll('.lang-switcher-item');
  langItems.forEach((itemLink) => {
    itemLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetLang = itemLink.getAttribute('data-lang-code');
      if (targetLang === currentLang) return;

      const doSwitch = () => {
        loadItemWorkspace(currentItemId, currentViewMode, targetLang, 1);
      };

      if (isFormDirty) {
        showDirtyConfirmModal(doSwitch);
      } else {
        doSwitch();
      }
    });
  });

  // Version Switcher items (GĐ 4)
  const versionItems = form.querySelectorAll('.version-switcher-item');
  versionItems.forEach((verLink) => {
    verLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetVer = parseInt(verLink.getAttribute('data-version'), 10);
      if (targetVer === currentVersion) return;

      const doSwitch = () => {
        loadItemWorkspace(currentItemId, currentViewMode, currentLang, targetVer);
      };

      if (isFormDirty) {
        showDirtyConfirmModal(doSwitch);
      } else {
        doSwitch();
      }
    });
  });

  // Header quick buttons
  const btnHeaderAddVersion = form.querySelector('#btnHeaderAddVersion');
  if (btnHeaderAddVersion) {
    btnHeaderAddVersion.addEventListener('click', (e) => {
      e.preventDefault();
      openAddVersionModal();
    });
  }

  const btnHeaderAddLanguage = form.querySelector('#btnHeaderAddLanguage');
  if (btnHeaderAddLanguage) {
    btnHeaderAddLanguage.addEventListener('click', (e) => {
      e.preventDefault();
      openAddLanguageModal();
    });
  }

  const btnHeaderViewHistory = form.querySelector('#btnHeaderViewHistory');
  if (btnHeaderViewHistory) {
    btnHeaderViewHistory.addEventListener('click', (e) => {
      e.preventDefault();
      openVersionHistoryModal();
    });
  }



  // Media Library Integration: Image Field Browse & Clear
  form.querySelectorAll('.field-container').forEach((container) => {
    const browseBtn = container.querySelector('.js-image-browse-btn');
    const clearBtn = container.querySelector('.js-image-clear-btn');
    const input = container.querySelector('.js-image-field-input');
    const previewBox = container.querySelector('.js-image-preview-box');
    const previewImg = container.querySelector('.js-image-preview-img');

    if (browseBtn && input) {
      browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        MediaPicker.open({
          type: 'image',
          onSelect: (assets) => {
            if (!assets || assets.length === 0) return;
            const asset = assets[0];
            input.value = asset._id;
            if (previewBox && previewImg) {
              previewImg.src = `/media/file/${asset._id}?thumb=1`;
              previewBox.classList.remove('d-none');
            }
            isFormDirty = true;
            updateDirtyState(true);
          }
        });
      });
    }

    if (clearBtn && input) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = '';
        if (previewBox) {
          previewBox.classList.add('d-none');
        }
        isFormDirty = true;
        updateDirtyState(true);
      });
    }
  });

  // Rich Text Editor TinyMCE 6 Integration
  initRichTextEditors(form, { csrfToken: getCsrfToken() });
}

async function submitItemForm() {
  const form = document.getElementById('itemEditForm');
  if (!form || !currentItemId) return;

  // Đồng bộ nội dung từ các TinyMCE iframes về thẻ textarea
  if (typeof tinymce !== 'undefined') {
    tinymce.triggerSave();
  }

  const formData = new FormData(form);
  const fields = {};
  const expectedUpdatedAt = document.getElementById('formExpectedUpdatedAt')?.value;

  for (const [key, val] of formData.entries()) {
    if (key.startsWith('fields[')) {
      const fieldName = key.slice(7, -1);
      fields[fieldName] = val;
    }
  }

  // Handle checkboxes not checked in FormData
  const checkboxes = form.querySelectorAll('input[type="checkbox"].item-field-input');
  checkboxes.forEach((cb) => {
    const nameMatch = cb.name.match(/fields\[(.*?)\]/);
    if (nameMatch) {
      fields[nameMatch[1]] = cb.checked;
    }
  });

  try {
    const res = await fetch(`/api/items/${currentItemId}/fields`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({
        fields,
        expectedUpdatedAt,
        lang: currentLang,
        version: currentVersion,
      }),
    });

    const result = await res.json();

    if (res.status === 409) {
      // 409 Conflict - Optimistic Lock triggered
      showToast(
        'Conflict: Item was modified by another session. Please reload to review changes.',
        'warning'
      );
      return;
    }

    if (!res.ok || !result.success) {
      showToast(result.message || 'Validation error while saving item.', 'danger');
      return;
    }

    // Success: update updatedAt timestamp and clear dirty flag
    if (result.data) {
      const updatedIso = result.data.updatedAt;
      const expectedEl = document.getElementById('formExpectedUpdatedAt');
      if (expectedEl) expectedEl.value = updatedIso;

      const footerUpdated = document.getElementById('footerUpdatedAt');
      if (footerUpdated) footerUpdated.textContent = new Date(updatedIso).toLocaleString();

      // If title field changed, update tree node title
      const newTitle = result.data.displayName || result.data.name;
      const activeNode = treeInstance?.getActiveNode();
      if (activeNode && newTitle) {
        activeNode.setTitle(newTitle);
      }
    }

    isFormDirty = false;
    updateDirtyState(false);
    showToast('Item saved successfully.', 'success');
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'danger');
  }
}

function updateDirtyState(dirty) {
  const indicator = document.getElementById('dirtyIndicator');
  if (indicator) {
    if (dirty) {
      indicator.classList.remove('d-none');
    } else {
      indicator.classList.add('d-none');
    }
  }
}

function initDirtyTracker() {
  window.addEventListener('beforeunload', (e) => {
    if (isFormDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ==========================================
// 5. Folder View Child Navigation
// ==========================================
function attachFolderViewEvents() {
  const tiles = document.querySelectorAll('.folder-child-tile');
  tiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const childId = tile.getAttribute('data-item-id');
      if (childId) {
        activateNodeById(childId);
      }
    });
  });

  const folderInsertBtn = document.getElementById('folderViewInsertBtn');
  if (folderInsertBtn) {
    folderInsertBtn.addEventListener('click', () => openInsertModal());
  }
}

// ==========================================
// 6. View Mode Switcher (Content / Folder)
// ==========================================
function initWorkspaceEvents() {
  const btnContent = document.getElementById('btnModeContent');
  const btnFolder = document.getElementById('btnModeFolder');

  if (btnContent && btnFolder) {
    btnContent.addEventListener('click', () => {
      if (currentViewMode === 'content') return;
      currentViewMode = 'content';
      btnContent.classList.add('active');
      btnFolder.classList.remove('active');
      if (currentItemId) loadItemWorkspace(currentItemId, 'content');
    });

    btnFolder.addEventListener('click', () => {
      if (currentViewMode === 'folder') return;
      currentViewMode = 'folder';
      btnFolder.classList.add('active');
      btnContent.classList.remove('active');
      if (currentItemId) loadItemWorkspace(currentItemId, 'folder');
    });
  }

  // Breadcrumb item jump link
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.breadcrumb-jump-link');
    if (link) {
      e.preventDefault();
      const targetId = link.getAttribute('data-item-id');
      if (targetId) activateNodeById(targetId);
    }
  });

  // Tree Reload & Collapse All
  const btnReload = document.getElementById('btnReloadTree');
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      if (treeInstance) treeInstance.reload();
    });
  }

  const btnCollapseAll = document.getElementById('btnCollapseAllTree');
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener('click', () => {
      if (treeInstance) {
        treeInstance.getRootNode().visit((node) => {
          node.setExpanded(false);
        });
      }
    });
  }
}

// ==========================================
// 7. Modals: Insert, Rename, Duplicate, Delete, Move, Sort
// ==========================================
async function openInsertModal() {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) {
    showToast('Please select a parent item in the tree first.', 'warning');
    return;
  }

  const modalEl = document.getElementById('insertItemModal');
  if (!modalEl || !window.bootstrap) return;

  // Set parent information in modal
  document.getElementById('modalParentItemId').value = activeNode.key;
  document.getElementById('modalParentItemPath').textContent =
    (activeNode.data && activeNode.data.path) || activeNode.title;

  document.getElementById('modalItemName').value = '';
  document.getElementById('modalItemDisplayName').value = '';
  document.getElementById('modalSelectedTemplateId').value = '';

  const container = document.getElementById('modalInsertOptionsContainer');
  container.innerHTML = `
    <div class="text-center py-3 text-muted">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <span class="ms-2">Loading allowed templates...</span>
    </div>
  `;

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();

  // Fetch allowed insert options
  try {
    const res = await fetch(`/admin/content-editor/item/${activeNode.key}/insert-options`);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = '<div class="p-3 text-muted">No templates available.</div>';
      return;
    }

    container.innerHTML = result.data
      .map(
        (tpl, idx) => `
        <label class="list-group-item list-group-item-action d-flex align-items-center gap-2 cursor-pointer ${idx === 0 ? 'active' : ''}">
          <input type="radio" name="templateRadio" class="form-check-input me-1 template-radio-option" value="${tpl._id}" ${idx === 0 ? 'checked' : ''} />
          <i class="${tpl.icon || 'ti ti-file-text'} fs-2"></i>
          <div>
            <div class="fw-bold">${tpl.displayName || tpl.name}</div>
            <div class="small opacity-75">${tpl.description || ''}</div>
          </div>
        </label>
      `
      )
      .join('');

    // Pre-select first
    if (result.data[0]) {
      document.getElementById('modalSelectedTemplateId').value = result.data[0]._id;
    }

    // Radio change handlers
    const radios = container.querySelectorAll('.template-radio-option');
    radios.forEach((r) => {
      r.addEventListener('change', () => {
        radios.forEach((rb) => rb.closest('.list-group-item').classList.remove('active'));
        r.closest('.list-group-item').classList.add('active');
        document.getElementById('modalSelectedTemplateId').value = r.value;
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="p-3 text-danger">Error loading templates: ${err.message}</div>`;
  }
}

// Handle Insert Form Submission
const insertForm = document.getElementById('insertItemForm');
if (insertForm) {
  insertForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const parentId = document.getElementById('modalParentItemId').value;
    const templateId = document.getElementById('modalSelectedTemplateId').value;
    const name = document.getElementById('modalItemName').value;
    const displayName = document.getElementById('modalItemDisplayName').value;

    if (!templateId) {
      alert('Please select a template.');
      return;
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ parentId, templateId, name, displayName }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to create item.');
        return;
      }

      // Close modal
      const modalEl = document.getElementById('insertItemModal');
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      showToast(result.message, 'success');

      // Append node to tree and activate
      const parentNode = treeInstance.getNodeByKey(parentId);
      if (parentNode) {
        parentNode.setExpanded(true).done(() => {
          parentNode.addChildren(result.node);
          const newNode = treeInstance.getNodeByKey(result.node.key);
          if (newNode) newNode.setActive(true);
        });
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  });
}

function openRenameModal() {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) return;

  const modalEl = document.getElementById('renameItemModal');
  if (!modalEl || !window.bootstrap) return;

  document.getElementById('renameItemId').value = activeNode.key;
  document.getElementById('renameInputName').value = activeNode.data?.name || activeNode.title;
  document.getElementById('renameInputDisplayName').value =
    activeNode.data?.displayName || activeNode.title;

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

const renameForm = document.getElementById('renameItemForm');
if (renameForm) {
  renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('renameItemId').value;
    const name = document.getElementById('renameInputName').value;
    const displayName = document.getElementById('renameInputDisplayName').value;

    try {
      const res = await fetch(`/api/items/${id}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ name, displayName }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to rename item.');
        return;
      }

      const modalEl = document.getElementById('renameItemModal');
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      showToast('Item renamed successfully.', 'success');

      // Update tree node
      const node = treeInstance.getNodeByKey(id);
      if (node && result.data) {
        node.setTitle(result.data.displayName || result.data.name);
        node.data.name = result.data.name;
        node.data.displayName = result.data.displayName;
        node.data.path = result.data.path;
      }

      // Reload form
      loadItemWorkspace(id, currentViewMode);
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  });
}

async function handleDuplicateItem() {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) return;

  if (!confirm(`Duplicate item "${activeNode.title}"?`)) return;

  try {
    const res = await fetch(`/api/items/${activeNode.key}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ withSubitems: true }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      showToast(result.message || 'Failed to duplicate item.', 'danger');
      return;
    }

    showToast(result.message, 'success');

    // Reload parent node in tree
    if (activeNode.parent) {
      activeNode.parent.load(true).done(() => {
        activateNodeById(result.node.key);
      });
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'danger');
  }
}

function isNodeDescendant(node, potentialAncestor) {
  let curr = node.parent;
  while (curr) {
    if (curr.key === potentialAncestor.key) return true;
    curr = curr.parent;
  }
  return false;
}

function openMoveModal() {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) return;

  const modalEl = document.getElementById('moveItemModal');
  if (!modalEl || !window.bootstrap) return;

  document.getElementById('moveItemId').value = activeNode.key;
  document.getElementById('moveItemCurrentPath').textContent =
    activeNode.data?.path || activeNode.title;
  document.getElementById('moveTargetParentId').value = '';

  const picker = document.getElementById('movePickerTree');
  if (picker && treeInstance) {
    let optionsHtml = '<div class="list-group list-group-flush">';
    treeInstance.getRootNode().visit((node) => {
      const isSelf = node.key === activeNode.key;
      const isDescendant = isNodeDescendant(node, activeNode);
      if (!isSelf && !isDescendant) {
        optionsHtml += `
          <label class="list-group-item list-group-item-action d-flex align-items-center gap-2 cursor-pointer py-1">
            <input type="radio" name="moveTargetRadio" value="${node.key}" class="form-check-input me-1 move-target-radio" />
            <i class="${node.data?.icon || 'ti ti-folder'} fs-3 text-muted"></i>
            <div>
              <div class="fw-semibold small">${node.title}</div>
              <div class="font-monospace text-muted" style="font-size: 0.65rem;">${node.data?.path || ''}</div>
            </div>
          </label>
        `;
      }
    });
    optionsHtml += '</div>';
    picker.innerHTML = optionsHtml;

    picker.querySelectorAll('.move-target-radio').forEach((rb) => {
      rb.addEventListener('change', () => {
        picker.querySelectorAll('.list-group-item').forEach((item) => item.classList.remove('active'));
        rb.closest('.list-group-item').classList.add('active');
        document.getElementById('moveTargetParentId').value = rb.value;
      });
    });
  }

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

const moveForm = document.getElementById('moveItemForm');
if (moveForm) {
  moveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('moveItemId').value;
    const targetParentId = document.getElementById('moveTargetParentId').value;

    if (!targetParentId) {
      alert('Please select a destination parent item.');
      return;
    }

    try {
      const res = await fetch(`/api/items/${id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ targetParentId }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to move item.');
        return;
      }

      const modalEl = document.getElementById('moveItemModal');
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      showToast('Item moved successfully.', 'success');

      // Reload tree
      if (treeInstance) {
        treeInstance.reload().done(() => {
          activateNodeById(id);
        });
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  });
}

function openDeleteModal() {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) return;

  const modalEl = document.getElementById('deleteItemModal');
  if (!modalEl || !window.bootstrap) return;

  document.getElementById('deleteItemId').value = activeNode.key;
  document.getElementById('deleteModalItemPath').textContent =
    activeNode.data?.path || activeNode.title;

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

const btnConfirmDelete = document.getElementById('btnConfirmDelete');
if (btnConfirmDelete) {
  btnConfirmDelete.addEventListener('click', async () => {
    const id = document.getElementById('deleteItemId').value;
    if (!id) return;

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast(result.message || 'Failed to delete item.', 'danger');
        return;
      }

      const modalEl = document.getElementById('deleteItemModal');
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      showToast('Item deleted successfully.', 'success');

      // Remove from tree and activate parent
      const node = treeInstance.getNodeByKey(id);
      if (node) {
        const parent = node.parent;
        node.remove();
        if (parent) parent.setActive(true);
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, 'danger');
    }
  });
}

async function handleSortItem(direction) {
  const activeNode = treeInstance?.getActiveNode();
  if (!activeNode) return;

  try {
    const res = await fetch(`/api/items/${activeNode.key}/sort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ direction }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      showToast(result.message || 'Failed to sort item.', 'danger');
      return;
    }

    showToast(result.message, 'success');

    // Reload parent node children to reflect new order
    if (activeNode.parent) {
      const currentKey = activeNode.key;
      activeNode.parent.load(true).done(() => {
        activateNodeById(currentKey);
      });
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'danger');
  }
}

// ==========================================
// 8. Tree Search & Instant Filter
// ==========================================
function initTreeSearch() {
  const searchInput = document.getElementById('treeSearchInput');
  const clearBtn = document.getElementById('clearTreeSearch');
  const resultsDropdown = document.getElementById('treeSearchResults');

  if (!searchInput) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (clearBtn) {
      if (query) clearBtn.classList.remove('d-none');
      else clearBtn.classList.add('d-none');
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!query) {
        if (treeInstance) treeInstance.clearFilter();
        if (resultsDropdown) resultsDropdown.classList.add('d-none');
        return;
      }

      // Filter in loaded tree nodes
      if (treeInstance) {
        treeInstance.filterNodes(query);
      }

      // Search backend API
      try {
        const res = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
        const result = await res.json();

        if (resultsDropdown && result.success && result.data.length > 0) {
          resultsDropdown.innerHTML = result.data
            .map(
              (item) => `
              <a href="#" class="list-group-item list-group-item-action py-1 px-2 search-result-item" data-item-id="${item._id}">
                <div class="fw-semibold text-truncate small">${item.displayName || item.name}</div>
                <div class="text-muted font-monospace" style="font-size: 0.65rem;">${item.path}</div>
              </a>
            `
            )
            .join('');
          resultsDropdown.classList.remove('d-none');

          resultsDropdown.querySelectorAll('.search-result-item').forEach((itemLink) => {
            itemLink.addEventListener('click', (ev) => {
              ev.preventDefault();
              const targetId = itemLink.getAttribute('data-item-id');
              resultsDropdown.classList.add('d-none');
              activateNodeById(targetId);
            });
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('d-none');
      if (treeInstance) treeInstance.clearFilter();
      if (resultsDropdown) resultsDropdown.classList.add('d-none');
    });
  }
}

// ==========================================
// 9. Toast Notification Helper
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) {
    console.log(`[Toast ${type}]: ${message}`);
    return;
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type} border-0 show shadow-sm mb-2`;
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
}

// ==========================================
// 10. GĐ 4: Version & Language Operations
// ==========================================

/**
 * Show system modal asking user how to handle unsaved changes
 */
function showDirtyConfirmModal(onProceed) {
  const modalEl = document.getElementById('dirtyConfirmModal');
  if (!modalEl || typeof bootstrap === 'undefined') {
    if (confirm('Bạn có thay đổi chưa lưu. Tiếp tục chuyển mà không lưu?')) {
      onProceed();
    }
    return;
  }

  const bsModal = new bootstrap.Modal(modalEl);

  const btnDiscard = document.getElementById('btnDirtyDiscard');
  const btnSave = document.getElementById('btnDirtySaveAndContinue');

  const cleanListeners = () => {
    if (btnDiscard) btnDiscard.replaceWith(btnDiscard.cloneNode(true));
    if (btnSave) btnSave.replaceWith(btnSave.cloneNode(true));
  };

  cleanListeners();

  const freshBtnDiscard = document.getElementById('btnDirtyDiscard');
  const freshBtnSave = document.getElementById('btnDirtySaveAndContinue');

  freshBtnDiscard.addEventListener('click', () => {
    bsModal.hide();
    isFormDirty = false;
    updateDirtyState(false);
    onProceed();
  });

  freshBtnSave.addEventListener('click', async () => {
    freshBtnSave.disabled = true;
    try {
      await submitItemForm();
      bsModal.hide();
      onProceed();
    } catch (err) {
      showToast('Lỗi khi lưu: ' + err.message, 'danger');
    } finally {
      freshBtnSave.disabled = false;
    }
  });

  bsModal.show();
}

/**
 * Open Modal to Add a new Version
 */
async function openAddVersionModal() {
  if (!currentItemId) return;
  const modalEl = document.getElementById('addVersionModal');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  const langInput = document.getElementById('addVersionLang');
  if (langInput) langInput.value = currentLang;

  const copySelect = document.getElementById('addVersionCopyFrom');
  if (copySelect) {
    copySelect.innerHTML = '<option value="">Đang tải danh sách version...</option>';
    try {
      const res = await fetch(`/api/items/${currentItemId}/versions?lang=${encodeURIComponent(currentLang)}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        copySelect.innerHTML = `
          <option value="">(Mặc định: Sao chép từ version mới nhất v${result.data[0].version})</option>
          <option value="empty">(Bản trống - Không sao chép trường nào)</option>
          ${result.data.map((v) => `<option value="${v.version}">Version ${v.version} (${v.note || 'Không có ghi chú'})</option>`).join('')}
        `;
      } else {
        copySelect.innerHTML = '<option value="empty">(Tạo phiên bản trống)</option>';
      }
    } catch (err) {
      copySelect.innerHTML = '<option value="">(Mặc định)</option>';
    }
  }

  const form = document.getElementById('addVersionForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitAddVersion');
      if (btn) btn.disabled = true;

      const copyVal = copySelect ? copySelect.value : null;
      const noteVal = document.getElementById('addVersionNote')?.value || '';

      try {
        const res = await fetch(`/api/items/${currentItemId}/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            lang: currentLang,
            copyFromVersion: copyVal || null,
            note: noteVal,
          }),
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'Không thể tạo phiên bản mới.');
        }

        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();

        showToast(result.message, 'success');
        // Load newly created version
        await loadItemWorkspace(currentItemId, currentViewMode, currentLang, result.data.version);
      } catch (err) {
        showToast(err.message, 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

/**
 * Open Modal to Add a new Language translation
 */
async function openAddLanguageModal(preselectedLang = null) {
  if (!currentItemId) return;
  const modalEl = document.getElementById('addLanguageModal');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  const langSelect = document.getElementById('addLanguageSelect');
  if (langSelect) {
    langSelect.innerHTML = '<option value="">Đang tải danh sách ngôn ngữ...</option>';
    try {
      const [allLangsRes, itemLangsRes] = await Promise.all([
        fetch('/api/languages'),
        fetch(`/api/items/${currentItemId}/languages`),
      ]);

      const allLangs = (await allLangsRes.json()).data || [];
      const itemLangs = (await itemLangsRes.json()).data || [];
      const itemLangSet = new Set(itemLangs.filter((l) => l.hasContent).map((l) => l.code.toLowerCase()));

      const available = allLangs.filter((l) => !itemLangSet.has(l.code.toLowerCase()));

      if (available.length === 0) {
        langSelect.innerHTML = '<option value="">Item đã có đầy đủ tất cả các ngôn ngữ!</option>';
      } else {
        langSelect.innerHTML = available
          .map((l) => `<option value="${l.code}" ${preselectedLang && preselectedLang.toLowerCase() === l.code ? 'selected' : ''}>${l.name} (${l.code})</option>`)
          .join('');
      }

      // Populate copyFrom options
      const copySelect = document.getElementById('addLanguageCopyFrom');
      if (copySelect) {
        const sourceOptions = itemLangs.filter((l) => l.hasContent);
        copySelect.innerHTML = `
          <option value="">(Không sao chép - Tạo bản dịch trống)</option>
          ${sourceOptions.map((l) => `<option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>${l.name} (${l.code})</option>`).join('')}
        `;
      }
    } catch (err) {
      langSelect.innerHTML = '<option value="vi">Vietnamese (vi)</option>';
    }
  }

  const form = document.getElementById('addLanguageForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitAddLanguage');
      if (btn) btn.disabled = true;

      const chosenLang = langSelect ? langSelect.value : '';
      const copyFromLang = document.getElementById('addLanguageCopyFrom')?.value || null;
      const note = document.getElementById('addLanguageNote')?.value || '';

      if (!chosenLang) {
        showToast('Vui lòng chọn một ngôn ngữ.', 'warning');
        if (btn) btn.disabled = false;
        return;
      }

      try {
        const res = await fetch(`/api/items/${currentItemId}/languages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            lang: chosenLang,
            copyFromLang,
            note,
          }),
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'Không thể thêm ngôn ngữ mới.');
        }

        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();

        showToast(result.message, 'success');
        // Switch to the newly added language
        await loadItemWorkspace(currentItemId, currentViewMode, chosenLang, 1);
      } catch (err) {
        showToast(err.message, 'danger');
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

/**
 * Open Modal to View Version History
 */
async function openVersionHistoryModal() {
  if (!currentItemId) return;

  try {
    const res = await fetch(`/admin/content-editor/item/${currentItemId}/versions?lang=${encodeURIComponent(currentLang)}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) throw new Error('Không thể tải lịch sử phiên bản.');

    const html = await res.text();
    const dynamicContainer = document.getElementById('dynamicModalsContainer');
    if (dynamicContainer) dynamicContainer.innerHTML = html;

    const modalEl = document.getElementById('versionHistoryModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;

    const bsModal = new bootstrap.Modal(modalEl);

    // Attach actions inside history table
    modalEl.querySelectorAll('.btn-action-view-version').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ver = parseInt(btn.getAttribute('data-version'), 10);
        bsModal.hide();
        loadItemWorkspace(currentItemId, currentViewMode, currentLang, ver);
      });
    });

    modalEl.querySelectorAll('.btn-action-restore-version').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ver = parseInt(btn.getAttribute('data-version'), 10);
        if (!confirm(`Khôi phục nội dung từ Version ${ver}? Thao tác này sẽ tạo một Version mới chứa nội dung của Version ${ver}.`)) {
          return;
        }

        try {
          const restoreRes = await fetch(`/api/items/${currentItemId}/versions/${currentLang}/${ver}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
          });
          const result = await restoreRes.json();
          if (!restoreRes.ok || !result.success) throw new Error(result.message || 'Lỗi khi khôi phục.');

          bsModal.hide();
          showToast(result.message, 'success');
          await loadItemWorkspace(currentItemId, currentViewMode, currentLang, result.data.version);
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    });

    modalEl.querySelectorAll('.btn-action-delete-version').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ver = parseInt(btn.getAttribute('data-version'), 10);
        openDeleteVersionModal(ver);
        bsModal.hide();
      });
    });

    const btnAddFromHist = document.getElementById('btnModalAddVersionFromHistory');
    if (btnAddFromHist) {
      btnAddFromHist.addEventListener('click', () => {
        bsModal.hide();
        openAddVersionModal();
      });
    }

    const btnCompareFromHist = document.getElementById('btnModalCompareFromHistory');
    if (btnCompareFromHist) {
      btnCompareFromHist.addEventListener('click', () => {
        bsModal.hide();
        openCompareVersionsModal();
      });
    }

    bsModal.show();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

/**
 * Open Modal to Compare two Versions
 */
async function openCompareVersionsModal(v1 = null, v2 = null) {
  if (!currentItemId) return;

  try {
    let url = `/admin/content-editor/item/${currentItemId}/compare?lang=${encodeURIComponent(currentLang)}`;
    if (v1 && v2) url += `&v1=${v1}&v2=${v2}`;

    const res = await fetch(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) throw new Error('Không thể tải màn hình so sánh.');

    const html = await res.text();
    const dynamicContainer = document.getElementById('dynamicModalsContainer');
    if (dynamicContainer) dynamicContainer.innerHTML = html;

    const modalEl = document.getElementById('compareVersionsModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;

    const bsModal = new bootstrap.Modal(modalEl);

    const btnRefresh = document.getElementById('btnRefreshCompare');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        const selV1 = document.getElementById('compareSelectV1')?.value;
        const selV2 = document.getElementById('compareSelectV2')?.value;
        bsModal.hide();
        openCompareVersionsModal(selV1, selV2);
      });
    }

    bsModal.show();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

/**
 * Open Modal to Delete a Version
 */
function openDeleteVersionModal(targetVersion = null) {
  if (!currentItemId) return;
  const verToDelete = targetVersion || currentVersion;

  const modalEl = document.getElementById('deleteVersionModal');
  if (!modalEl || typeof bootstrap === 'undefined') return;

  const titleEl = document.getElementById('deleteVersionTitle');
  if (titleEl) titleEl.textContent = `Version ${verToDelete}`;

  const langEl = document.getElementById('deleteVersionLang');
  if (langEl) langEl.textContent = currentLang.toUpperCase();

  const btnConfirm = document.getElementById('btnConfirmDeleteVersion');
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      try {
        const res = await fetch(`/api/items/${currentItemId}/versions/${currentLang}/${verToDelete}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'Không thể xóa phiên bản.');
        }

        const bsModal = bootstrap.Modal.getInstance(modalEl);
        if (bsModal) bsModal.hide();

        showToast(result.message, 'success');
        // Switch to fallback version
        await loadItemWorkspace(currentItemId, currentViewMode, currentLang, result.data.fallbackVersion);
      } catch (err) {
        showToast(err.message, 'danger');
      } finally {
        btnConfirm.disabled = false;
      }
    };
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}
