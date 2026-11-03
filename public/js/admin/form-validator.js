/**
 * Form Validator & Notification Manager
 */

export const AdminNotifier = {
  showToast(message, type = 'success', title = 'Thông Báo') {
    const container = document.getElementById('adminToastContainer');
    if (!container) return;

    const iconMap = {
      success: 'ti-check text-success',
      error: 'ti-alert-circle text-danger',
      warning: 'ti-alert-triangle text-warning',
      info: 'ti-info-circle text-info',
    };

    const iconClass = iconMap[type] || iconMap.info;

    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center shadow-lg border-0 mb-2';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
      <div class="toast-header">
        <i class="ti ${iconClass} me-2 fs-2"></i>
        <strong class="me-auto">${title}</strong>
        <small class="text-muted">Vừa xong</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;

    container.appendChild(toastEl);
    if (window.bootstrap && window.bootstrap.Toast) {
      const toast = new window.bootstrap.Toast(toastEl, { delay: 4000 });
      toast.show();
      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    } else {
      setTimeout(() => toastEl.remove(), 4000);
    }
  },

  handleUrlToast() {
    const params = new URLSearchParams(window.location.search);
    const toast = params.get('toast');
    const status = params.get('status') || 'success';

    if (toast) {
      const messages = {
        saved: 'Dữ liệu đã được lưu thành công.',
        deleted: 'Đã xóa bản ghi thành công.',
        published: 'Đã xuất bản nội dung lên Web thành công.',
        login_success: 'Đăng nhập thành công vào hệ thống quản trị.',
      };

      const messageText = messages[toast] || toast;
      this.showToast(messageText, status);

      // Clean up URL query parameters without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  },
};

export function initFormValidator() {
  // 1. Initialize URL Toast listener
  AdminNotifier.handleUrlToast();

  // 2. Destructive Confirmation Modal (#adminConfirmModal)
  let pendingForm = null;
  const confirmModalEl = document.getElementById('adminConfirmModal');

  document.addEventListener('submit', (e) => {
    const form = e.target;
    const confirmMessage = form.getAttribute('data-confirm-delete');

    if (confirmMessage) {
      e.preventDefault();
      pendingForm = form;

      const messageEl = document.getElementById('adminConfirmModalMessage');
      if (messageEl) {
        messageEl.textContent = confirmMessage;
      }

      if (confirmModalEl && window.bootstrap && window.bootstrap.Modal) {
        const modal = new window.bootstrap.Modal(confirmModalEl);
        modal.show();

        // Focus safely on Cancel button by default
        setTimeout(() => {
          const cancelBtn = document.getElementById('adminConfirmModalCancelBtn');
          if (cancelBtn) cancelBtn.focus();
        }, 150);
      } else {
        // Fallback if modal DOM is missing
        if (window.confirm(confirmMessage)) {
          form.removeAttribute('data-confirm-delete');
          form.submit();
        }
      }
    }
  });

  const confirmBtn = document.getElementById('adminConfirmModalConfirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingForm) {
        pendingForm.removeAttribute('data-confirm-delete');
        pendingForm.submit();
      }
    });
  }

  // 3. Client Validation for forms without data-no-validate
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.getAttribute('data-no-validate') === 'true') return;

    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();

      const invalidInputs = form.querySelectorAll(':invalid');
      if (invalidInputs.length > 0) {
        invalidInputs.forEach((input) => input.classList.add('is-invalid'));
        invalidInputs[0].focus();
        invalidInputs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // Valid submission loading state
      const submitBtn = form.querySelector('button[type="submit"]:not(.no-spin)');
      if (submitBtn && !submitBtn.disabled) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <span>Đang xử lý...</span>
        `;
        // Fallback restore after 8s if network hangs
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 8000);
      }
    }
  });

  // Clear is-invalid on user input
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('is-invalid')) {
      e.target.classList.remove('is-invalid');
    }
  });
}

