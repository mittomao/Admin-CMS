/**
 * Template Manager Client Controller
 * SortableJS Drag & Drop, Tab Switching, Dynamic Inheritance & Validation
 */

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
};

const getActiveTemplateId = () => {
  const wrapper = document.getElementById('templateEditorWrapper');
  if (wrapper && wrapper.getAttribute('data-template-id')) {
    return wrapper.getAttribute('data-template-id');
  }
  return window.__ACTIVE_TEMPLATE_ID__ || null;
};

let currentTab = 'builder';
let isDirty = false;

function initTemplateWorkspace() {
  currentTab = 'builder';
  initTabSwitching();
  initRibbonEvents();
  initTabEvents('builder');
}

window.initTemplateWorkspace = initTemplateWorkspace;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('templateWorkspaceTabs')) {
    initTemplateWorkspace();
  }
  initTemplateSearch();
});

// ==========================================
// 1. Tab Switching & Partial Loading
// ==========================================
function initTabSwitching() {
  const tabBtns = document.querySelectorAll('#templateWorkspaceTabs .nav-link');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const tabName = btn.getAttribute('data-tab');
      if (tabName === currentTab) return;

      if (isDirty) {
        if (!confirm('You have unsaved changes. Discard and switch tab?')) {
          return;
        }
        setDirty(false);
      }

      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = tabName;

      await loadTabContent(tabName);
    });
  });
}

async function loadTabContent(tabName) {
  const container = document.getElementById('templateTabContent');
  const activeId = getActiveTemplateId();
  if (!container || !activeId) return;

  container.innerHTML = `
    <div class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <span class="ms-2 text-muted">Loading tab...</span>
    </div>
  `;

  try {
    const res = await fetch(`/admin/template-manager/${activeId}/${tabName}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    container.innerHTML = html;

    setDirty(false);
    initTabEvents(tabName);
  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-danger m-3">
        <h4 class="alert-title">Failed to load tab</h4>
        <div>${err.message}</div>
      </div>
    `;
  }
}

function initTabEvents(tabName) {
  if (tabName === 'builder') {
    initBuilderEvents();
    initSortables();
  } else if (tabName === 'standard-values') {
    initStandardValuesEvents();
  } else if (tabName === 'insert-options') {
    initInsertOptionsEvents();
  } else if (tabName === 'inheritance') {
    initInheritanceEvents();
  }
}

// ==========================================
// 2. SortableJS Drag & Drop
// ==========================================
function initSortables() {
  if (typeof window.Sortable === 'undefined') return;

  // 1. Reorder Sections
  const secContainer = document.getElementById('builderSectionsContainer');
  if (secContainer) {
    window.Sortable.create(secContainer, {
      handle: '.section-drag-handle',
      animation: 150,
      onEnd: async () => {
        const sectionItems = secContainer.querySelectorAll('.builder-section-item');
        const sectionIds = Array.from(sectionItems).map((el) => el.getAttribute('data-section-id'));

        try {
          const res = await fetch(`/api/templates/${getActiveTemplateId()}/sections/reorder`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({ sectionIds }),
          });
          const result = await res.json();
          if (!res.ok || !result.success) {
            showToast(result.message || 'Failed to reorder sections.', 'danger');
          } else {
            showToast('Sections reordered.', 'success');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'danger');
        }
      },
    });
  }

  // 2. Reorder & Move Fields across Sections
  const fieldLists = document.querySelectorAll('.builder-fields-list');
  fieldLists.forEach((listEl) => {
    window.Sortable.create(listEl, {
      group: 'template-fields',
      handle: '.field-drag-handle',
      animation: 150,
      onEnd: async (evt) => {
        const itemEl = evt.item;
        const fieldId = itemEl.getAttribute('data-field-id');
        const oldSectionId = evt.from.getAttribute('data-section-id');
        const newSectionId = evt.to.getAttribute('data-section-id');

        if (oldSectionId !== newSectionId) {
          // Moved between sections
          try {
            const res = await fetch(
              `/api/templates/${getActiveTemplateId()}/sections/${oldSectionId}/fields/${fieldId}/move`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': getCsrfToken(),
                },
                body: JSON.stringify({ targetSectionId: newSectionId }),
              }
            );
            const result = await res.json();
            if (!res.ok || !result.success) {
              showToast(result.message || 'Failed to move field.', 'danger');
              await loadTabContent('builder');
              return;
            }
            showToast('Field moved to section.', 'success');
          } catch (err) {
            showToast(`Error: ${err.message}`, 'danger');
            await loadTabContent('builder');
          }
        }

        // Reorder fields in target section
        const targetFieldItems = evt.to.querySelectorAll('.builder-field-item');
        const fieldIds = Array.from(targetFieldItems).map((el) => el.getAttribute('data-field-id'));

        try {
          await fetch(`/api/templates/${getActiveTemplateId()}/sections/${newSectionId}/fields/reorder`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({ fieldIds }),
          });
        } catch (err) {
          console.error('Field reorder error:', err);
        }
      },
    });
  });
}

// ==========================================
// 3. Builder Tab Events
// ==========================================
function initBuilderEvents() {
  const addSecBtn = document.getElementById('builderAddSectionBtn');
  if (addSecBtn) {
    addSecBtn.addEventListener('click', () => openSectionModal());
  }

  // Edit Section
  document.querySelectorAll('.btn-edit-section').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      const secName = btn.getAttribute('data-section-name');
      openSectionModal(secId, secName);
    });
  });

  // Delete Section
  document.querySelectorAll('.btn-delete-section').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      const secName = btn.getAttribute('data-section-name');

      if (!confirm(`Delete section "${secName}" and all its fields?`)) return;

      try {
        const res = await fetch(`/api/templates/${getActiveTemplateId()}/sections/${secId}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          showToast(result.message || 'Failed to delete section.', 'danger');
        } else {
          showToast('Section deleted.', 'success');
          await loadTabContent('builder');
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, 'danger');
      }
    });
  });

  // Add Field to Section
  document.querySelectorAll('.btn-add-field-to-section').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      openFieldModal(secId);
    });
  });

  // Edit Field
  document.querySelectorAll('.btn-edit-field').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      const fieldData = {
        id: btn.getAttribute('data-field-id'),
        name: btn.getAttribute('data-field-name'),
        title: btn.getAttribute('data-field-title'),
        type: btn.getAttribute('data-field-type'),
        required: btn.getAttribute('data-field-required') === 'true',
        defaultValue: btn.getAttribute('data-field-default') || '',
        source: btn.getAttribute('data-field-source') || '',
        shared: btn.getAttribute('data-field-shared') === 'true',
        helpText: btn.getAttribute('data-field-help') || '',
      };
      openFieldModal(secId, fieldData);
    });
  });

  // Delete Field
  document.querySelectorAll('.btn-delete-field').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      const fieldId = btn.getAttribute('data-field-id');
      const fieldName = btn.getAttribute('data-field-name');

      if (!confirm(`Delete field "${fieldName}"?`)) return;

      try {
        const res = await fetch(`/api/templates/${getActiveTemplateId()}/sections/${secId}/fields/${fieldId}`, {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          showToast(result.message || 'Failed to delete field.', 'danger');
        } else {
          showToast('Field deleted.', 'success');
          await loadTabContent('builder');
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, 'danger');
      }
    });
  });

  // Override Field
  document.querySelectorAll('.btn-override-field').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const secId = btn.getAttribute('data-section-id');
      const fieldData = {
        name: btn.getAttribute('data-field-name'),
        title: btn.getAttribute('data-field-title'),
        type: btn.getAttribute('data-field-type'),
      };
      openFieldModal(secId, fieldData);
    });
  });
}

// ==========================================
// 4. Standard Values Events
// ==========================================
function initStandardValuesEvents() {
  const form = document.getElementById('templateStandardValuesForm');
  if (!form) return;

  form.addEventListener('input', () => setDirty(true));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const standardValues = {};

    for (const [key, val] of formData.entries()) {
      if (key.startsWith('fields[')) {
        const fieldKey = key.slice(7, -1);
        standardValues[fieldKey] = val;
      }
    }

    form.querySelectorAll('input[type="checkbox"].item-field-input').forEach((cb) => {
      const match = cb.name.match(/fields\[(.*?)\]/);
      if (match) {
        standardValues[match[1]] = cb.checked;
      }
    });

    try {
      const res = await fetch(`/api/templates/${getActiveTemplateId()}/standard-values`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ standardValues }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast(result.message || 'Failed to save standard values.', 'danger');
      } else {
        setDirty(false);
        showToast('Standard values saved successfully.', 'success');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  });
}

// ==========================================
// 5. Insert Options Events
// ==========================================
function initInsertOptionsEvents() {
  const form = document.getElementById('templateInsertOptionsForm');
  const searchInput = document.getElementById('insertOptionsSearch');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.insert-option-col').forEach((col) => {
        const name = col.getAttribute('data-tpl-name') || '';
        const display = col.getAttribute('data-tpl-display') || '';
        if (!q || name.includes(q) || display.includes(q)) {
          col.style.display = '';
        } else {
          col.style.display = 'none';
        }
      });
    });
  }

  if (form) {
    form.addEventListener('change', () => setDirty(true));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const checkedBoxes = form.querySelectorAll('input[name="insertOptions[]"]:checked');
      const insertOptions = Array.from(checkedBoxes).map((cb) => cb.value);

      try {
        const res = await fetch(`/api/templates/${getActiveTemplateId()}/insert-options`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ insertOptions }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          showToast(result.message || 'Failed to save insert options.', 'danger');
        } else {
          setDirty(false);
          showToast('Insert options updated.', 'success');
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, 'danger');
      }
    });
  }
}

// ==========================================
// 6. Inheritance Events
// ==========================================
function initInheritanceEvents() {
  const form = document.getElementById('templateInheritanceForm');
  if (!form) return;

  form.addEventListener('change', () => setDirty(true));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const checkedBoxes = form.querySelectorAll('input[name="baseTemplateIds[]"]:checked');
    const baseTemplateIds = Array.from(checkedBoxes).map((cb) => cb.value);

    try {
      const res = await fetch(`/api/templates/${getActiveTemplateId()}/base-templates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ baseTemplateIds }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast(result.message || 'Failed to update base templates.', 'danger');
      } else {
        setDirty(false);
        showToast('Base templates updated.', 'success');
        await loadTabContent('inheritance');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  });
}

// ==========================================
// 7. Modals (Template, Section, Field, Preview)
// ==========================================
function openSectionModal(sectionId = null, sectionName = '') {
  const modalEl = document.getElementById('sectionModal');
  if (!modalEl || !window.bootstrap) return;

  document.getElementById('sectionModalId').value = sectionId || '';
  document.getElementById('sectionModalName').value = sectionName || '';
  document.getElementById('sectionModalTitle').textContent = sectionId ? 'Edit Section' : 'Add Section';

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

const sectionForm = document.getElementById('sectionForm');
if (sectionForm) {
  sectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const secId = document.getElementById('sectionModalId').value;
    const name = document.getElementById('sectionModalName').value;

    const url = secId
      ? `/api/templates/${getActiveTemplateId()}/sections/${secId}`
      : `/api/templates/${getActiveTemplateId()}/sections`;
    const method = secId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to save section.');
        return;
      }

      window.bootstrap.Modal.getInstance(document.getElementById('sectionModal'))?.hide();
      showToast(result.message, 'success');
      await loadTabContent('builder');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });
}

function openFieldModal(sectionId, fieldData = null) {
  const modalEl = document.getElementById('fieldModal');
  if (!modalEl || !window.bootstrap) return;

  document.getElementById('fieldModalSectionId').value = sectionId;
  document.getElementById('fieldModalId').value = (fieldData && fieldData.id) || '';
  document.getElementById('fieldModalName').value = (fieldData && fieldData.name) || '';
  document.getElementById('fieldModalTitle').value = (fieldData && fieldData.title) || '';
  document.getElementById('fieldModalType').value = (fieldData && fieldData.type) || 'Single-Line Text';
  const colSpanInput = document.getElementById('fieldModalColSpan');
  if (colSpanInput) {
    colSpanInput.value = (fieldData && fieldData.layout && fieldData.layout.colSpan) || '12';
  }
  document.getElementById('fieldModalRequired').checked = Boolean(fieldData && fieldData.required);
  document.getElementById('fieldModalSource').value = (fieldData && fieldData.source) || '';
  document.getElementById('fieldModalShared').checked = Boolean(fieldData && fieldData.shared);
  const unversionedInput = document.getElementById('fieldModalUnversioned');
  if (unversionedInput) {
    unversionedInput.checked = Boolean(fieldData && fieldData.unversioned);
  }
  document.getElementById('fieldModalHelpText').value = (fieldData && fieldData.helpText) || '';

  toggleSourceField();

  const headingEl = document.getElementById('fieldModalHeading');
  if (headingEl) {
    headingEl.textContent = fieldData && fieldData.id ? 'Edit Field' : 'Add Field';
  }

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

function toggleSourceField() {
  const typeSelect = document.getElementById('fieldModalType');
  const sourceContainer = document.getElementById('fieldSourceContainer');
  if (typeSelect && sourceContainer) {
    if (typeSelect.value === 'Droplist') {
      sourceContainer.style.display = 'block';
    } else {
      sourceContainer.style.display = 'none';
    }
  }
}

document.getElementById('fieldModalType')?.addEventListener('change', toggleSourceField);

const fieldForm = document.getElementById('fieldForm');
if (fieldForm) {
  fieldForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const secId = document.getElementById('fieldModalSectionId').value;
    const fieldId = document.getElementById('fieldModalId').value;

    const payload = {
      name: document.getElementById('fieldModalName').value,
      title: document.getElementById('fieldModalTitle').value,
      type: document.getElementById('fieldModalType').value,
      required: document.getElementById('fieldModalRequired').checked,
      source: document.getElementById('fieldModalSource').value,
      shared: document.getElementById('fieldModalShared').checked,
      unversioned: document.getElementById('fieldModalUnversioned')?.checked || false,
      helpText: document.getElementById('fieldModalHelpText').value,
      layout: {
        colSpan: Number(document.getElementById('fieldModalColSpan')?.value || 12),
      },
    };

    const url = fieldId
      ? `/api/templates/${getActiveTemplateId()}/sections/${secId}/fields/${fieldId}`
      : `/api/templates/${getActiveTemplateId()}/sections/${secId}/fields`;
    const method = fieldId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to save field.');
        return;
      }

      window.bootstrap.Modal.getInstance(document.getElementById('fieldModal'))?.hide();
      showToast(result.message, 'success');
      await loadTabContent('builder');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });
}

function openTemplateMetaModal(isEdit = false) {
  const modalEl = document.getElementById('templateMetaModal');
  if (!modalEl || !window.bootstrap) return;

  const form = document.getElementById('templateMetaForm');
  form.reset();

  if (isEdit) {
    document.getElementById('templateMetaModalTitle').textContent = 'Edit Template Details';
    document.getElementById('metaTemplateId').value = getActiveTemplateId() || '';
    document.getElementById('metaTemplateName').value = document.querySelector('h2.fw-bold, h3.fw-bold')?.textContent?.trim() || '';
  } else {
    document.getElementById('templateMetaModalTitle').textContent = 'New Template';
    document.getElementById('metaTemplateId').value = '';
  }

  const modal = new window.bootstrap.Modal(modalEl);
  modal.show();
}

const templateMetaForm = document.getElementById('templateMetaForm');
if (templateMetaForm) {
  templateMetaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('metaTemplateId').value;
    const payload = {
      name: document.getElementById('metaTemplateName').value,
      displayName: document.getElementById('metaTemplateDisplayName').value,
      icon: document.getElementById('metaTemplateIcon').value,
      description: document.getElementById('metaTemplateDescription').value,
    };

    const url = id ? `/api/templates/${id}` : '/api/templates';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Failed to save template details.');
        return;
      }

      window.bootstrap.Modal.getInstance(document.getElementById('templateMetaModal'))?.hide();
      window.location.href = `/admin/content-editor/${result.data._id}`;
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });
}

// ==========================================
// 8. Ribbon Actions
// ==========================================
function initRibbonEvents() {
  document.getElementById('btnNewTemplate')?.addEventListener('click', () => openTemplateMetaModal(false));
  document.getElementById('btnEditTemplateMeta')?.addEventListener('click', () => openTemplateMetaModal(true));

  document.getElementById('btnAddSection')?.addEventListener('click', () => openSectionModal());
  document.getElementById('btnAddField')?.addEventListener('click', () => {
    const firstSec = document.querySelector('.builder-section-item');
    if (firstSec) {
      openFieldModal(firstSec.getAttribute('data-section-id'));
    } else {
      openSectionModal();
    }
  });

  document.getElementById('btnDuplicateTemplate')?.addEventListener('click', async () => {
    const activeId = getActiveTemplateId();
    if (!activeId) return;
    if (!confirm('Duplicate current template and all its sections/fields?')) return;

    try {
      const res = await fetch(`/api/templates/${activeId}/duplicate`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast(result.message || 'Failed to duplicate template.', 'danger');
      } else {
        window.location.href = `/admin/content-editor/${result.data._id}`;
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  });

  document.getElementById('btnDeleteTemplate')?.addEventListener('click', async () => {
    const activeId = getActiveTemplateId();
    if (!activeId) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/templates/${activeId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': getCsrfToken() },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || 'Cannot delete template.');
      } else {
        window.location.href = '/admin/content-editor?path=/root/templates';
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });

  document.getElementById('btnPreviewForm')?.addEventListener('click', async () => {
    const activeId = getActiveTemplateId();
    if (!activeId) return;
    const modalEl = document.getElementById('previewModal');
    const content = document.getElementById('previewModalContent');
    if (!modalEl || !content || !window.bootstrap) return;

    content.innerHTML = `
      <div class="p-5 text-center text-muted">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2">Rendering form preview...</div>
      </div>
    `;

    const modal = new window.bootstrap.Modal(modalEl);
    modal.show();

    try {
      const res = await fetch(`/admin/template-manager/${activeId}/preview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = `<div class="alert alert-danger m-3">${err.message}</div>`;
    }
  });

  document.getElementById('btnSaveTemplate')?.addEventListener('click', () => {
    // If on standard values or insert options or inheritance, trigger form submit
    if (currentTab === 'standard-values') {
      document.getElementById('templateStandardValuesForm')?.requestSubmit();
    } else if (currentTab === 'insert-options') {
      document.getElementById('templateInsertOptionsForm')?.requestSubmit();
    } else if (currentTab === 'inheritance') {
      document.getElementById('templateInheritanceForm')?.requestSubmit();
    } else {
      showToast('Schema changes in Builder are saved automatically.', 'info');
    }
  });

  // Shortcut Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.getElementById('btnSaveTemplate')?.click();
    }
  });
}

function initTemplateSearch() {
  const searchInput = document.getElementById('templateSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.template-nav-item').forEach((item) => {
      const name = item.getAttribute('data-template-name') || '';
      const display = item.getAttribute('data-template-display') || '';
      if (!q || name.includes(q) || display.includes(q)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

function setDirty(dirty) {
  isDirty = dirty;
  const indicator = document.getElementById('tplDirtyIndicator');
  if (indicator) {
    if (dirty) indicator.classList.remove('d-none');
    else indicator.classList.add('d-none');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type} border-0 show shadow-sm mb-2`;
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body small fw-medium">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);
  setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.addEventListener('transitionend', () => toastEl.remove());
  }, 4000);
}

