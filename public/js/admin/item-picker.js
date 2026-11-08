/**
 * ItemPicker - Modal Browser & Selector for Items (Datasource, Layouts, Renderings)
 * Reusable component for Treecraft Admin CMS
 */
window.ItemPicker = (function () {
  let modalInstance = null;
  let options = {};
  let selectedItem = null;

  function initModal() {
    const el = document.getElementById('itemPickerModal');
    if (!el) return;

    if (!modalInstance && window.bootstrap && window.bootstrap.Modal) {
      modalInstance = new window.bootstrap.Modal(el);
    }

    const confirmBtn = document.getElementById('itemPickerConfirmBtn');
    const clearBtn = document.getElementById('itemPickerClearBtn');
    const searchInput = document.getElementById('itemPickerSearchInput');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (typeof options.onSelect === 'function') {
          options.onSelect(selectedItem);
        }
        if (modalInstance) modalInstance.hide();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedItem = null;
        updateSelectedUI();
      });
    }

    if (searchInput) {
      let debounceTimeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          filterTree(e.target.value.trim().toLowerCase());
        }, 250);
      });
    }
  }

  function updateSelectedUI() {
    const badge = document.getElementById('itemPickerSelectedBadge');
    const pathEl = document.getElementById('itemPickerSelectedPath');
    const confirmBtn = document.getElementById('itemPickerConfirmBtn');

    if (selectedItem) {
      if (badge) badge.textContent = selectedItem.displayName || selectedItem.name;
      if (pathEl) pathEl.textContent = selectedItem.path || '';
      if (confirmBtn) confirmBtn.disabled = false;
    } else {
      if (badge) badge.textContent = 'Chưa chọn item';
      if (pathEl) pathEl.textContent = '';
      if (confirmBtn) confirmBtn.disabled = false; // Allow confirming "null" to clear datasource
    }
  }

  async function loadTree() {
    const container = document.getElementById('itemPickerTreeContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
        <div>Đang tải cây thư mục...</div>
      </div>
    `;

    try {
      const rootUrl = options.rootPath
        ? `/api/items/root/children?path=${encodeURIComponent(options.rootPath)}`
        : '/api/items/root/children';

      const res = await fetch(rootUrl);
      const data = await res.json();
      const itemsList = Array.isArray(data) ? data : (data.data || []);

      if (!itemsList || itemsList.length === 0) {
        container.innerHTML = '<div class="alert alert-warning m-2">Không tìm thấy thư mục hoặc item nào.</div>';
        return;
      }

      container.innerHTML = '';
      const listEl = document.createElement('ul');
      listEl.className = 'list-unstyled m-0';

      itemsList.forEach((item) => {
        listEl.appendChild(createTreeNode(item));
      });

      container.appendChild(listEl);
    } catch (err) {
      container.innerHTML = `<div class="alert alert-danger m-2">Lỗi: ${err.message}</div>`;
    }
  }

  function createTreeNode(item) {
    const li = document.createElement('li');
    const itemId = item.key || item._id || item.id;
    const itemPath = item.data?.path || item.path || '';
    const itemDisplayName = item.title || item.displayName || item.name || '';
    const templateName = item.data?.templateName || item.templateName || '';

    li.className = 'tree-item py-1';
    li.setAttribute('data-id', itemId);
    li.setAttribute('data-path', itemPath);
    li.setAttribute('data-name', itemDisplayName.toLowerCase());
    li.setAttribute('data-template', templateName);

    const isSelected = selectedItem && (selectedItem.id === itemId || selectedItem._id === itemId);
    const hasChildren = item.lazy !== false && item.hasChildren !== false && !item.isLeaf;

    // Check if this item is allowed to be picked as the final value
    const isAllowedType = !options.allowedTemplate || templateName === options.allowedTemplate;

    const row = document.createElement('div');
    row.className = `d-flex align-items-center gap-1 px-2 py-1 rounded tree-row ${
      isSelected ? 'bg-primary-lt text-primary fw-bold' : 'hover-bg-light'
    }`;
    row.style.cursor = isAllowedType ? 'pointer' : 'default';

    // Expand icon
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle text-muted text-center cursor-pointer';
    toggle.style.width = '18px';
    toggle.style.cursor = 'pointer';
    toggle.innerHTML = hasChildren ? '<i class="ti ti-chevron-right fs-4"></i>' : '<span style="display:inline-block; width:14px;"></span>';

    // Item icon
    const iconContainer = document.createElement('span');
    iconContainer.className = 'tree-item-icon me-1 d-inline-flex align-items-center justify-content-center flex-shrink-0';
    iconContainer.style.width = '18px';
    iconContainer.style.height = '18px';
    const iconKey = item.data?.iconKey || item.icon;
    if (window.CMS_ICONS) {
      iconContainer.innerHTML = window.CMS_ICONS.renderIconHtml(iconKey, 16);
    } else {
      iconContainer.innerHTML = `<i class="${item.icon || 'ti ti-file-text'} text-muted"></i>`;
    }

    // Item text
    const label = document.createElement('span');
    label.className = `tree-label small flex-fill text-truncate ${!isAllowedType ? 'text-muted fst-italic' : ''}`;
    label.textContent = itemDisplayName;

    // Badge showing template type if allowedTemplate is specified
    if (templateName) {
      const typeBadge = document.createElement('span');
      typeBadge.className = `badge font-monospace ${isAllowedType ? 'bg-blue-lt' : 'bg-light text-muted'}`;
      typeBadge.style.fontSize = '0.65rem';
      typeBadge.textContent = templateName;
      row.appendChild(toggle);
      row.appendChild(iconContainer);
      row.appendChild(label);
      row.appendChild(typeBadge);
    } else {
      row.appendChild(toggle);
      row.appendChild(iconContainer);
      row.appendChild(label);
    }

    li.appendChild(row);

    let childrenLoaded = false;
    let subUl = null;

    const toggleChildren = async () => {
      if (!hasChildren) return;

      if (!subUl) {
        subUl = document.createElement('ul');
        subUl.className = 'list-unstyled ps-3 m-0 d-none';
        li.appendChild(subUl);
      }

      const isExpanded = !subUl.classList.contains('d-none');
      if (isExpanded) {
        subUl.classList.add('d-none');
        toggle.innerHTML = '<i class="ti ti-chevron-right fs-4"></i>';
      } else {
        subUl.classList.remove('d-none');
        toggle.innerHTML = '<i class="ti ti-chevron-down fs-4"></i>';

        if (!childrenLoaded) {
          subUl.innerHTML = '<li class="text-muted small ps-2 py-1"><i class="ti ti-loader animate-spin"></i> Đang tải...</li>';
          try {
            const res = await fetch(`/api/items/${itemId}/children`);
            const json = await res.json();
            const children = Array.isArray(json) ? json : (json.data || []);
            subUl.innerHTML = '';
            if (children.length > 0) {
              children.forEach((child) => {
                subUl.appendChild(createTreeNode(child));
              });
            } else {
              subUl.innerHTML = '<li class="text-muted small ps-2 py-1">(Trống)</li>';
            }
            childrenLoaded = true;
          } catch (err) {
            subUl.innerHTML = '<li class="text-danger small ps-2 py-1">Lỗi tải dữ liệu</li>';
          }
        }
      }
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChildren();
    });

    row.addEventListener('click', () => {
      if (!isAllowedType) {
        // If not selectable, clicking expands/collapses folder for convenience
        toggleChildren();
        return;
      }

      document.querySelectorAll('#itemPickerTreeContainer .tree-row').forEach((r) => {
        r.classList.remove('bg-primary-lt', 'text-primary', 'fw-bold');
      });
      row.classList.add('bg-primary-lt', 'text-primary', 'fw-bold');

      selectedItem = {
        _id: itemId,
        id: itemId,
        name: item.name || itemDisplayName,
        displayName: itemDisplayName,
        path: itemPath,
        templateName,
      };

      updateSelectedUI();
    });

    return li;
  }

  function filterTree(query) {
    const items = document.querySelectorAll('#itemPickerTreeContainer .tree-item');
    if (!query) {
      items.forEach((it) => (it.style.display = ''));
      return;
    }

    items.forEach((it) => {
      const name = it.getAttribute('data-name') || '';
      const path = (it.getAttribute('data-path') || '').toLowerCase();
      if (name.includes(query) || path.includes(query)) {
        it.style.display = '';
        // Expand parents
        let parent = it.parentElement;
        while (parent && parent.id !== 'itemPickerTreeContainer') {
          if (parent.tagName === 'UL') parent.classList.remove('d-none');
          parent = parent.parentElement;
        }
      } else {
        it.style.display = 'none';
      }
    });
  }

  return {
    open: function (opts = {}) {
      options = opts;
      selectedItem = opts.selectedId
        ? { _id: opts.selectedId, id: opts.selectedId, displayName: opts.selectedName || 'ID: ' + opts.selectedId, path: opts.selectedPath || '' }
        : null;

      initModal();
      updateSelectedUI();

      const titleEl = document.getElementById('itemPickerTitle');
      if (titleEl && opts.title) {
        titleEl.textContent = opts.title;
      }

      if (modalInstance) {
        modalInstance.show();
      }
      loadTree();
    },
  };
})();

