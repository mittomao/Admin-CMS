/**
 * Client-Side Security Editor & Access Viewer Module (Sitecore XM &bull; Phase 7)
 */

let cachedUsers = null;
let cachedRoles = null;
let currentSecItemId = null;
let currentSecItemPath = null;
let localMatrixData = null;
let isSecMatrixDirty = false;

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

/**
 * Open Security Editor Matrix Modal
 */
export async function openSecurityEditorModal(itemId, itemPath = null) {
  if (!itemId) return;
  currentSecItemId = itemId;
  currentSecItemPath = itemPath || itemId;

  const modalEl = document.getElementById('modalSecurityEditor');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('secModalItemPath').textContent = currentSecItemPath;
  document.getElementById('secAddPrincipalBar').classList.add('d-none');
  isSecMatrixDirty = false;

  modal.show();
  await loadSecurityMatrix(itemId);
}

/**
 * Load Security Matrix from API
 */
async function loadSecurityMatrix(itemId) {
  const tbody = document.getElementById('secMatrixBody');
  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="text-center py-5 text-slate-400">
        <div class="spinner-border spinner-border-sm text-primary mb-2"></div>
        <div>Đang nạp ma trận phân quyền của Item...</div>
      </td>
    </tr>
  `;

  try {
    const res = await fetch(`/api/security/items/${itemId}/acl`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi tải phân quyền');

    localMatrixData = json.data;
    renderMatrixTable(localMatrixData);
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4 text-red-500">
          <i class="ti ti-alert-triangle fs-2 d-block mb-1"></i>
          ${err.message}
        </td>
      </tr>
    `;
  }
}

/**
 * Render matrix rows
 */
function renderMatrixTable(data) {
  const tbody = document.getElementById('secMatrixBody');
  const rightsList = data.rightsList || ['read', 'write', 'create', 'rename', 'delete', 'publish', 'administer'];
  const matrix = data.matrix || [];

  if (matrix.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-5 text-slate-400">
          <i class="ti ti-shield-off fs-1 d-block mb-2 text-slate-300"></i>
          Chưa có quy tắc phân quyền nào được gán trên mục này hoặc kế thừa từ mục cha.
          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-primary text-xs" onclick="document.getElementById('btnSecAddPrincipal').click()">
              <i class="ti ti-plus"></i> Thêm User hoặc Role đầu tiên
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  matrix.forEach((row, pIdx) => {
    const p = row.principal;
    const isUser = p.type === 'user';
    const typeBadge = isUser
      ? '<span class="badge bg-purple-50 text-purple-700 border border-purple-200 text-[9px] py-0 px-1 me-1">User</span>'
      : '<span class="badge bg-blue-50 text-blue-700 border border-blue-200 text-[9px] py-0 px-1 me-1">Role</span>';

    html += `
      <tr data-pidx="${pIdx}">
        <td class="ps-4">
          <div class="d-flex align-items-center gap-1.5">
            ${typeBadge}
            <div>
              <div class="font-bold text-slate-900 dark:text-white text-xs">${p.name}</div>
              <div class="text-[10px] text-slate-400 font-mono">${p.domain}\\${p.name}</div>
            </div>
          </div>
        </td>
    `;

    // Render 7 right cells
    rightsList.forEach((r) => {
      const rightData = row.rights[r] || { state: 'inherit', isDirect: false, inheritance: 'both' };
      const state = rightData.state; // 'allow', 'deny', 'inherit'
      const isDirect = Boolean(rightData.isDirect);

      let btnClass = 'bg-slate-50 text-slate-400 border border-dashed border-slate-200';
      let icon = 'ti-circle-dotted';
      let title = isDirect ? 'Quy tắc trực tiếp: Kế thừa' : 'Kế thừa từ mục cha';

      if (state === 'allow') {
        btnClass = isDirect
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-400 shadow-2xs font-bold'
          : 'bg-emerald-50/60 text-emerald-600/70 border border-dashed border-emerald-300';
        icon = 'ti-check';
        title = isDirect ? 'Quy tắc trực tiếp: Cho phép (Allow)' : 'Kế thừa: Cho phép';
      } else if (state === 'deny') {
        btnClass = isDirect
          ? 'bg-red-100 text-red-800 border border-red-400 shadow-2xs font-bold'
          : 'bg-red-50/60 text-red-600/70 border border-dashed border-red-300';
        icon = 'ti-ban';
        title = isDirect ? 'Quy tắc trực tiếp: Từ chối (Deny)' : 'Kế thừa: Từ chối';
      }

      html += `
        <td class="text-center p-1">
          <button
            type="button"
            class="btn btn-sm btn-cell-right rounded-md p-1 d-inline-flex align-items-center justify-content-center transition-all ${btnClass}"
            data-pidx="${pIdx}"
            data-right="${r}"
            title="${title}"
            style="width: 32px; height: 26px;"
          >
            <i class="ti ${icon}"></i>
          </button>
        </td>
      `;
    });

    // Inheritance scope dropdown (applies to this principal)
    // Pick the scope of the first direct rule or default to 'both'
    let currentScope = 'both';
    for (const r of rightsList) {
      if (row.rights[r]?.isDirect && row.rights[r]?.inheritance) {
        currentScope = row.rights[r].inheritance;
        break;
      }
    }

    html += `
        <td class="text-center p-1">
          <select class="form-select form-select-sm text-[11px] rounded-lg py-0.5 px-2 select-principal-scope" data-pidx="${pIdx}">
            <option value="both" ${currentScope === 'both' ? 'selected' : ''}>Mục này và con</option>
            <option value="thisItem" ${currentScope === 'thisItem' ? 'selected' : ''}>Chỉ mục này</option>
            <option value="descendants" ${currentScope === 'descendants' ? 'selected' : ''}>Chỉ mục con</option>
          </select>
        </td>
        <td class="text-end pe-4 p-1">
          <button type="button" class="btn btn-xs btn-ghost-danger btn-remove-principal-acl p-1 text-slate-400 hover:text-red-600" data-pidx="${pIdx}" title="Xoá tất cả quyền trực tiếp của đối tượng này">
            <i class="ti ti-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  bindMatrixEvents();
}

/**
 * Bind interactive click cycles for matrix cells
 */
function bindMatrixEvents() {
  document.querySelectorAll('.btn-cell-right').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pIdx = parseInt(btn.getAttribute('data-pidx'), 10);
      const right = btn.getAttribute('data-right');
      const row = localMatrixData.matrix[pIdx];
      if (!row) return;

      const rightObj = row.rights[right] || { state: 'inherit', isDirect: false, inheritance: 'both' };
      const currentState = rightObj.state;

      // Cycle: allow -> deny -> inherit -> allow
      let nextState = 'allow';
      if (currentState === 'allow') nextState = 'deny';
      else if (currentState === 'deny') nextState = 'inherit';
      else nextState = 'allow';

      rightObj.state = nextState;
      rightObj.isDirect = nextState !== 'inherit'; // explicit rule if allow or deny
      isSecMatrixDirty = true;

      renderMatrixTable(localMatrixData);
    });
  });

  document.querySelectorAll('.select-principal-scope').forEach((sel) => {
    sel.addEventListener('change', () => {
      const pIdx = parseInt(sel.getAttribute('data-pidx'), 10);
      const newScope = sel.value;
      const row = localMatrixData.matrix[pIdx];
      if (row) {
        Object.values(row.rights).forEach((rObj) => {
          if (rObj.isDirect) {
            rObj.inheritance = newScope;
          }
        });
        isSecMatrixDirty = true;
      }
    });
  });

  document.querySelectorAll('.btn-remove-principal-acl').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pIdx = parseInt(btn.getAttribute('data-pidx'), 10);
      const row = localMatrixData.matrix[pIdx];
      if (!row) return;

      Object.values(row.rights).forEach((rObj) => {
        rObj.state = 'inherit';
        rObj.isDirect = false;
      });
      isSecMatrixDirty = true;
      renderMatrixTable(localMatrixData);
    });
  });
}

/**
 * Initialize toolbar & action buttons inside modal
 */
export function initSecurityEditorModal() {
  const btnAdd = document.getElementById('btnSecAddPrincipal');
  const barAdd = document.getElementById('secAddPrincipalBar');
  const btnCancelAdd = document.getElementById('btnCancelAddPrincipal');
  const btnConfirmAdd = document.getElementById('btnConfirmAddPrincipal');
  const typeSelect = document.getElementById('secNewPrincipalType');
  const principalSelect = document.getElementById('secNewPrincipalSelect');
  const btnSave = document.getElementById('btnSecSaveAcl');
  const btnReset = document.getElementById('btnSecResetInherited');

  if (btnAdd && barAdd) {
    btnAdd.addEventListener('click', async () => {
      barAdd.classList.toggle('d-none');
      if (!barAdd.classList.contains('d-none')) {
        await populateNewPrincipalDropdown();
      }
    });
  }

  if (btnCancelAdd && barAdd) {
    btnCancelAdd.addEventListener('click', () => {
      barAdd.classList.add('d-none');
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', async () => {
      await populateNewPrincipalDropdown();
    });
  }

  if (btnConfirmAdd) {
    btnConfirmAdd.addEventListener('click', () => {
      const type = typeSelect.value;
      const selectedOpt = principalSelect.options[principalSelect.selectedIndex];
      if (!selectedOpt) return;

      const id = selectedOpt.value;
      const name = selectedOpt.getAttribute('data-name');
      const domain = selectedOpt.getAttribute('data-domain') || 'sitecore';

      // Check if already in matrix
      const existing = localMatrixData.matrix.find(
        (m) => m.principal.type === type && m.principal.id === id
      );

      if (existing) {
        alert(`Đối tượng "${name}" đã có trong ma trận phân quyền.`);
        return;
      }

      // Add new row with default inherit
      const newRow = {
        principal: { type, id, name, displayName: name, domain },
        rights: {},
      };
      (localMatrixData.rightsList || []).forEach((r) => {
        newRow.rights[r] = { state: 'inherit', isDirect: false, inheritance: 'both' };
      });

      localMatrixData.matrix.push(newRow);
      barAdd.classList.add('d-none');
      isSecMatrixDirty = true;
      renderMatrixTable(localMatrixData);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm('Bạn có chắc chắn muốn xoá TẤT CẢ các quy tắc phân quyền trực tiếp trên mục này để kế thừa hoàn toàn từ thư mục cha?')) {
        return;
      }

      try {
        const res = await fetch(`/api/security/items/${currentSecItemId}/acl/reset`, {
          method: 'POST',
          headers: { 'X-CSRF-Token': getCsrfToken() },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Lỗi khôi phục quyền kế thừa');

        alert(`Đã khôi phục trạng thái kế thừa thành công.`);
        await loadSecurityMatrix(currentSecItemId);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!currentSecItemId || !localMatrixData) return;

      btnSave.disabled = true;
      btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang lưu...';

      try {
        const rightsList = localMatrixData.rightsList || [];

        // Save each direct rule on item
        for (const row of localMatrixData.matrix) {
          const p = row.principal;
          for (const r of rightsList) {
            const rightObj = row.rights[r];
            if (rightObj && rightObj.isDirect && (rightObj.state === 'allow' || rightObj.state === 'deny')) {
              await fetch(`/api/security/items/${currentSecItemId}/acl`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
                body: JSON.stringify({
                  principalType: p.type,
                  principalId: p.id,
                  right: r,
                  access: rightObj.state,
                  inheritance: rightObj.inheritance || 'both',
                }),
              });
            } else if (rightObj && rightObj.entryId && rightObj.state === 'inherit') {
              // Rule was reverted to inherit: delete the explicit rule entry
              await fetch(`/api/security/entries/${rightObj.entryId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-Token': getCsrfToken() },
              });
            }
          }
        }

        isSecMatrixDirty = false;
        alert('Đã cập nhật phân quyền Item thành công!');
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalSecurityEditor'));
        if (modal) modal.hide();
      } catch (err) {
        alert(`Lỗi khi lưu phân quyền: ${err.message}`);
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="ti ti-device-floppy me-1"></i><span>Lưu phân quyền</span>';
      }
    });
  }
}

/**
 * Populate add principal dropdown
 */
async function populateNewPrincipalDropdown() {
  const typeSelect = document.getElementById('secNewPrincipalType');
  const principalSelect = document.getElementById('secNewPrincipalSelect');
  if (!typeSelect || !principalSelect) return;

  const type = typeSelect.value;
  principalSelect.innerHTML = '<option value="">Đang tải...</option>';

  try {
    if (type === 'role') {
      if (!cachedRoles) {
        const res = await fetch('/api/security/roles');
        const json = await res.json();
        cachedRoles = json.data || [];
      }
      principalSelect.innerHTML = cachedRoles
        .map((r) => `<option value="${r._id}" data-name="${r.name}" data-domain="${r.domain}">${r.name} (${r.domain})</option>`)
        .join('');
    } else {
      if (!cachedUsers) {
        const res = await fetch('/api/security/users?limit=100');
        const json = await res.json();
        cachedUsers = json.data?.users || [];
      }
      principalSelect.innerHTML = cachedUsers
        .map((u) => `<option value="${u._id}" data-name="${u.username}" data-domain="${u.domain}">${u.username} - ${u.fullName || u.displayName} (${u.domain})</option>`)
        .join('');
    }
  } catch (err) {
    principalSelect.innerHTML = `<option value="">Lỗi nạp dữ liệu: ${err.message}</option>`;
  }
}

/**
 * Open Access Viewer Modal for current item
 */
export async function openAccessViewerModal(itemId, itemPath = null) {
  if (!itemId) return;
  const modalEl = document.getElementById('modalAccessViewer');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('accessModalItemPath').textContent = itemPath || itemId;

  modal.show();
  await initModalAccessDropdowns(itemId);
  await loadModalAccessExplanation(itemId);
}

async function initModalAccessDropdowns(itemId) {
  const typeSelect = document.getElementById('modalAccessPrincipalType');
  const principalSelect = document.getElementById('modalAccessPrincipalId');
  const btnRefresh = document.getElementById('btnModalRefreshAccess');

  const populate = async () => {
    const isUser = typeSelect.value === 'user';
    principalSelect.innerHTML = '<option value="">Đang tải...</option>';

    if (isUser) {
      if (!cachedUsers) {
        const res = await fetch('/api/security/users?limit=100');
        const json = await res.json();
        cachedUsers = json.data?.users || [];
      }
      principalSelect.innerHTML = cachedUsers
        .map((u) => `<option value="${u._id}">${u.username} (${u.fullName || u.username})</option>`)
        .join('');
    } else {
      if (!cachedRoles) {
        const res = await fetch('/api/security/roles');
        const json = await res.json();
        cachedRoles = json.data || [];
      }
      principalSelect.innerHTML = cachedRoles
        .map((r) => `<option value="${r._id}">${r.name} (${r.domain})</option>`)
        .join('');
    }
  };

  typeSelect.onchange = async () => {
    await populate();
    await loadModalAccessExplanation(itemId);
  };

  btnRefresh.onclick = async () => {
    await loadModalAccessExplanation(itemId);
  };

  await populate();
}

async function loadModalAccessExplanation(itemId) {
  const typeSelect = document.getElementById('modalAccessPrincipalType');
  const principalSelect = document.getElementById('modalAccessPrincipalId');
  const tbody = document.getElementById('modalAccessTableBody');

  const principalType = typeSelect.value;
  const principalId = principalSelect.value;
  if (!principalId) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-4 text-slate-400">
        <div class="spinner-border spinner-border-sm text-primary mb-2"></div>
        <div>Đang tính toán quyền hiệu lực theo cây...</div>
      </td>
    </tr>
  `;

  try {
    const res = await fetch(`/api/security/items/${itemId}/access-explain?principalType=${principalType}&principalId=${principalId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Lỗi tra cứu quyền');

    const data = json.data;
    const rights = ['read', 'write', 'create', 'rename', 'delete', 'publish', 'administer'];
    let html = '';

    rights.forEach((r) => {
      const itemRule = data[r] || { isAllowed: false, access: 'deny', origin: 'default', reason: 'Mặc định Từ chối' };
      const isAllowed = itemRule.isAllowed;

      const badge = isAllowed
        ? '<span class="badge bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold"><i class="ti ti-check"></i> Cho phép (Allow)</span>'
        : '<span class="badge bg-red-100 text-red-800 border border-red-300 text-[10px] font-bold"><i class="ti ti-ban"></i> Từ chối (Deny)</span>';

      let originBadge = '<span class="badge bg-slate-100 text-slate-600 text-[10px]">Mặc định</span>';
      if (itemRule.origin === 'administrator') originBadge = '<span class="badge bg-purple-100 text-purple-700 border border-purple-200 text-[10px]">Administrator</span>';
      else if (itemRule.origin === 'explicit') originBadge = '<span class="badge bg-blue-100 text-blue-700 border border-blue-200 text-[10px]">Trực tiếp</span>';
      else if (itemRule.origin === 'inherited') originBadge = `<span class="badge bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">Kế thừa</span>`;

      html += `
        <tr>
          <td class="font-bold uppercase tracking-wider text-[11px] ps-4">${r}</td>
          <td class="text-center">${badge}</td>
          <td class="text-center">${originBadge}</td>
          <td class="text-slate-600 dark:text-slate-300 text-[11px]">${itemRule.reason || '-'}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-3">${err.message}</td></tr>`;
  }
}

