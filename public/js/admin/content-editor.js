/**
 * Content Editor Client Application
 * Sitecore XM-style Tree, Ribbon Controls, Form Validation & Optimistic Locking
 */

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

document.addEventListener('DOMContentLoaded', () => {
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
async function loadItemWorkspace(itemId, mode = 'content') {
  const workspace = document.getElementById('editorWorkspace');
  if (!workspace || !itemId) return;

  workspace.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <span class="ms-2 text-muted">Loading ${mode === 'folder' ? 'child items' : 'item form'}...</span>
    </div>
  `;

  try {
    const endpoint = mode === 'folder'
      ? `/admin/content-editor/item/${itemId}/folder-view`
      : `/admin/content-editor/item/${itemId}/form`;

    const res = await fetch(endpoint, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const html = await res.text();
    workspace.innerHTML = html;

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
}

async function submitItemForm() {
  const form = document.getElementById('itemEditForm');
  if (!form || !currentItemId) return;

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
      body: JSON.stringify({ fields, expectedUpdatedAt }),
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
