# Kế Hoạch Triển Khai Thành Phần (Component Implementation Plan)
**Dự Án: Treecraft Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**

---

## 1. Kiến Trúc Thư Viện Thành Phần Tái Sử Dụng (Reusable Component System)

Hệ thống thành phần sẽ được đóng gói thông qua các **EJS Partials** và các lớp **CSS Utility Chuẩn Tabler** để tái sử dụng xuyên suốt toàn bộ các màn hình quản trị của CMS:

```text
src/views/partials/
├── head.ejs                 # CDN Tabler Core, Tabler Icons, Inter Font, Theme Script
├── topbar.ejs               # Header chuẩn: Brand, Waffle App Switcher, Search, Theme Toggle, User
├── taskbar.ejs              # Bottom Taskbar chuẩn Treecraft (hiện đại hóa bằng Tabler tokens)
├── flash.ejs                # Thông báo server-side (Toast / Alert)
├── modals/
│   ├── confirm-modal.ejs    # Modal xác nhận xóa toàn cục (#adminConfirmModal)
│   └── unsaved-modal.ejs    # Modal cảnh báo dữ liệu chưa lưu (#adminUnsavedModal)
└── block-scripts.ejs        # Tabler JS Bundle, Admin Runtime JS
```

---

## 2. Đặc Tả Triển Khai Chi Tiết Từng Thành Phần

### 2.1. Topbar Header & Waffle App Switcher (Menu 9 Chấm)
- **Vị trí file:** `src/views/partials/topbar.ejs`.
- **Mục đích:** Thanh điều hướng trung tâm cố định (`sticky-top`) cho mọi màn hình quản trị.
- **Thành phần con:**
  1. *Brand Logo:* Biểu tượng chữ S màu đỏ Treecraft accent (`#eb1c24`), tên hệ thống `Treecraft CMS`.
  2. *Waffle Menu Button:* Nút 9 chấm (`ti ti-apps`) mở menu thẻ `dropdown-menu-card` (bề ngang 340px) phân chia 3 nhóm chức năng:
     - Nhóm 1: Content Management (Content Editor, Experience Editor).
     - Nhóm 2: Media & Workflows (Media Library, Workbox).
     - Nhóm 3: Security & Control Panel (User Manager, Role Manager, Access Viewer, Control Panel, Recycle Bin, Audit Log).
  3. *Breadcrumb Ngữ Cảnh:* Hiển thị màn hình hiện tại (ví dụ: `Launchpad` hoặc `Content Editor /root/content/home`).
  4. *Global Quick Search:* Ô tìm kiếm nhanh với shortcut bàn phím `<kbd>Ctrl K</kbd>`.
  5. *Dark / Light Mode Toggle:* Nút chuyển đổi giao diện với 2 icon `ti-sun` và `ti-moon`.
  6. *User Profile Menu:* Avatar bo tròn, hiển thị họ tên, vai trò hiện tại và nút Đăng xuất.

### 2.2. Bottom Taskbar Chuẩn Hóa
- **Vị trí file:** `src/views/partials/taskbar.ejs`.
- **Mục đích:** Giữ trọn vẹn trải nghiệm Desktop App Treecraft ở chân màn hình nhưng nâng cấp độ sắc nét:
  - Cố định ở đáy màn hình (`fixed-bottom`, chiều cao `38px`).
  - Nền sẫm màu tự động tương thích Dark/Light (`var(--tblr-dark)` hoặc `#1f2429`).
  - Viền trên màu đỏ Treecraft accent (`border-top: 2px solid var(--sc-red)`).
  - Các nút ứng dụng: icon vector Tabler (`ti ti-layout-grid`, `ti ti-article`, `ti ti-photo`, `ti ti-inbox`), có vạch sáng active indicator phía trên.

### 2.3. Khung Thẻ 2 Tầng (2-Tier Card Hierarchy)
- **Tầng 1 - Thẻ Khung Chức Năng (Main Container Card):**
  - Cấu trúc: `<div class="card shadow-sm border-0 mb-4">`.
  - Header: Có icon chủ đề cỡ `fs-3` mang màu ngữ nghĩa (`text-primary`, `text-purple`, `text-success`...), cụm tiêu đề 2 dòng (tiêu đề in đậm kèm tên kỹ thuật tiếng Anh, phụ đề mô tả) và nút thao tác nhanh ở góc phải.
- **Tầng 2 - Thẻ Hành Động / Lưới Ứng Dụng (Sub-card / Launchpad Tile):**
  - Cấu trúc: `<div class="card card-link card-link-pop h-100 border text-decoration-none p-3 shadow-sm app-tile-card">`.
  - Khối icon đại diện đặt trong `.avatar.avatar-md.rounded-3` với nền màu nhạt Light Tint (`bg-primary-lt`, `bg-purple-lt`, `bg-danger-lt`...).
  - Hiệu ứng hover: Nâng nhẹ `translateY(-2px)`, đổ bóng `var(--admin-shadow-md)`, đổi viền sang màu chính.

### 2.4. Biểu Mẫu & Input Addon Bền Vững (Forms & Input Icons)
- **Quy chuẩn:** Mọi trường nhập liệu đều bọc trong `.input-icon`:
  ```html
  <div class="mb-3">
      <label class="form-label fw-bold mb-1 required">Tiêu Đề Item</label>
      <div class="input-icon">
          <span class="input-icon-addon"><i class="ti ti-typography"></i></span>
          <input type="text" name="displayName" class="form-control form-control-sm" placeholder="Nhập tên hiển thị..." required>
          <div class="invalid-feedback">Vui lòng nhập tên hiển thị.</div>
      </div>
      <small class="form-hint text-muted mt-2 d-block">
          <i class="ti ti-info-circle text-primary me-1"></i> Tên này sẽ xuất hiện trên cây nội dung.
      </small>
  </div>
  ```
- **Khắc phục lỗi:** Áp dụng bộ quy tắc CSS chuyên biệt trong `public/css/admin.css` đảm bảo icon không đè lên chữ, không bị nhảy dòng khi có thông báo lỗi `.is-invalid` hoặc `.invalid-feedback`.

### 2.5. Nút Bấm & Nhóm Thao Tác (Buttons & DELETE Form Support)
- Toàn bộ nút bấm có kích thước thu gọn thanh thoát `btn-sm`, bo góc `6px`, có icon vector đi kèm nhãn.
- Nút bấm khi nhấn thụt nhẹ 1px (`transform: translateY(1px)`).
- Chuẩn hóa bo góc khi bọc thẻ `<form method="POST">` có `_method=DELETE` bên trong `.btn-group.btn-group-sm`.

### 2.6. Hộp Thoại Xác Nhận Phá Hủy Toàn Cục (#adminConfirmModal)
- **Vị trí file:** `src/views/partials/modals/confirm-modal.ejs`.
- **Cơ chế hoạt động:**
  - Form xóa chỉ cần gắn thuộc tính `data-confirm-delete="Bạn có chắc chắn muốn xóa item này?"`.
  - Script client tự động chặn submit mặc định, mở `#adminConfirmModal` có thanh viền trạng thái đỏ `<div class="modal-status bg-danger"></div>`.
  - Tiêu điểm bàn phím (focus) tự động đặt vào nút **Hủy Bỏ (Cancel)** để đảm bảo an toàn nếu người dùng vô tình gõ phím.
  - Khi người dùng bấm "Đồng Ý Xóa", script thực hiện gửi form chính xác.

### 2.7. Hệ Thống Thông Báo Toàn Cục (Toast Notifications & URL Toast Loop)
- **Vị trí file:** Container `#adminToastContainer` đặt cố định ở góc trên bên phải màn hình (`top-0 end-0 p-3`, `z-index: 1090`).
- **Cơ chế URL Toast Feedback:**
  - Controller redirect kèm query: `/admin/content-editor?toast=item_saved&status=success`.
  - Client script đọc query param, kích hoạt Toast thông báo với icon đẹp mắt, và tự động dùng `window.history.replaceState()` làm sạch URL thanh địa chỉ để khi người dùng ấn F5 không bị lặp lại thông báo.

### 2.8. Bảng Dữ Liệu Quản Trị (Datatable) & Phân Trang
- Class chuẩn: `.table.card-table.table-vcenter.table-hover.table-nowrap.datatable`.
- Cột tiêu đề áp dụng co giãn thông minh: `.table-title-truncate` (`max-width: clamp(220px, 32vw, 500px)`).
- Thanh phân trang: `.pagination.admin-pagination`, nút vuông bo góc `38px x 38px` (`32px x 32px` trên mobile), trang active có nền gradient nổi bật.

---

## 3. Mã Nguồn Runtime Phía Client (Client-Side Scripts)

Để hiện thực hóa toàn bộ các tương tác trên, chúng ta sẽ xây dựng bộ script modular tại `public/js/`:

1. **`public/js/admin/theme-engine.js`:**
   - Đọc và lưu `tablerTheme` trong `localStorage`.
   - Lắng nghe sự kiện click `[data-theme-toggle]` để đảo trạng thái giữa `light` và `dark`.
   - Cập nhật biểu tượng mặt trời / mặt trăng tương ứng.
2. **`public/js/admin/form-validator.js`:**
   - Kiểm tra validation client-side, đánh dấu `.is-invalid` và cuộn mượt đến ô lỗi đầu tiên.
   - Lắng nghe `data-confirm-delete` và điều khiển modal `#adminConfirmModal`.
   - Lắng nghe URL search params để kích hoạt Toast thông báo (`AdminNotifier.showToast`).
   - Khóa nút submit và bật spinner xoay tròn khi form đang được gửi.
3. **`public/js/admin.js`:**
   - Entry point: Tự động khởi tạo Bootstrap Tooltips, Popovers, phím tắt `Ctrl + K`, và liên kết các module con.
4. **`public/css/admin.css`:**
   - Tệp CSS mở rộng chứa toàn bộ các quy chuẩn: Launchpad tiles, input-icon addon resilience, table truncate, modern pagination, modal status borders, và màu đỏ Treecraft accent accent.

