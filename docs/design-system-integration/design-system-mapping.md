# Ánh Xạ Hệ Thống Thiết Kế (Design System Mapping)
**Dự Án: Treecraft Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**

---

## 1. Bối Cảnh & Đánh Giá Hiện Trạng Kiến Trúc (Architecture Audit)

### 1.1. Công Nghệ & Khung Ứng Dụng Hiện Tại
- **Backend & View Engine:** Node.js (v20+) + Express.js + EJS Server-Side Rendering (kết hợp `express-ejs-layouts`).
- **Giao diện hiện tại (GĐ 0 - GĐ 1):**
  - Đang dùng bộ CSS thủ công (`variables.css`, `base.css`, `layout.css`, `components.css`) mô phỏng truyền thống.
  - Biểu tượng đang dùng Emoji thô sơ (`📑`, `🖼️`, `👥`, `⚙️`, `📥`...).
  - Chưa có hệ thống Design Tokens nhất quán cho chế độ Sáng / Tối (Dark / Light mode).
  - Chưa có cơ chế client validation, toast feedback, và modal xác nhận accessible.
- **Bảo mật Header (Helmet):**
  - CSP đang được kích hoạt trong `src/app.js`. Cần nới lỏng chính sách cho phép nạp Font Inter và Tabler CDN an toàn.

### 1.2. Khả Năng Tương Thích Với Tabler Modern Admin Design System
- **Mức độ tương thích:** **100% (Hoàn hảo)**.
- **Lý do:** Design System trong `/docs/design-system/` được xây dựng trên triết lý **Server-Side Rendering First** và **Zero Build Toolchain Required**, kết hợp `@tabler/core` (Bootstrap 5 engine) và Tabler Icons webfont. Đây là sự kết hợp lý tưởng nhất cho kiến trúc Express + EJS hiện tại mà không phải cài thêm build tools (Webpack/Vite).

---

## 2. Bảng Ánh Xạ Design Tokens Sang Kiến Trúc Hiện Tại

### 2.1. Ánh Xạ Bảng Màu & Biến Thể Dịu (Color Tokens & Light Tint)

| Token Ngữ Nghĩa | Tabler CSS Variable | Mã Hex Solid | Phiên Bản Dịu (`-lt`) | Ánh Xạ Vào CMS Quản Trị |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Brand / Action)** | `--tblr-primary` | `#206bc4` / `#4f46e5` | `bg-primary-lt` | Nút Lưu, nút Thêm Item, liên kết điều hướng chính |
| **Secondary (Neutral)** | `--tblr-secondary` | `#64748b` | `bg-secondary-lt` | Nút Hủy, nhãn giải thích phụ trợ, border phân cách |
| **Success (Green)** | `--tblr-success` | `#2fb344` | `bg-success-lt` | Trạng thái "Published", nút Publish Master &rarr; Web |
| **Warning (Amber)** | `--tblr-warning` | `#f59f00` | `bg-warning-lt` | Trạng thái "Draft", cảnh báo thay đổi chưa lưu |
| **Danger (Red)** | `--tblr-danger` | `#d63939` | `bg-danger-lt` | Nút Xóa, Thùng rác (Recycle Bin), cấm quyền (ACL Deny) |
| **Info / Azure** | `--tblr-azure` | `#4299e1` | `bg-azure-lt` | Thư viện Media Library, chỉ số tổng hợp |
| **Purple** | `--tblr-purple` | `#ae3ec9` | `bg-purple-lt` | Quản lý bảo mật (User Manager, Role Manager, ACL) |
| **Teal / Cyan** | `--tblr-teal` | `#0ca678` | `bg-teal-lt` | Audit Log, nhật ký kiểm toán, lịch sử Publish |
| **Dark (Surface Black)** | `--tblr-dark` | `#1e293b` | `bg-dark-lt` | Serialization, sao lưu JSON, Control Panel |

### 2.2. Ánh Xạ Bề Mặt & Chế Độ Sáng / Tối (Surfaces & Dark Mode)

| Vị trí Giao Diện | Chế Độ Sáng (Light Theme) | Chế Độ Tối (Dark Theme) | Cơ Chế Áp Dụng Trong Express / EJS |
| :--- | :--- | :--- | :--- |
| **Nền Canvas (`body`)** | `#f8fafc` | `#0f172a` | `data-bs-theme="light\|dark"` trên thẻ `<html>` |
| **Bề mặt Card / Modal** | `#ffffff` | `#1e293b` | Class `.card`, `.modal-content` của Tabler |
| **Đường viền (Border)** | `#e2e8f0` | `#334155` | `var(--tblr-border-color)` |
| **Văn bản chính** | `#1e293b` (Slate 800) | `#e2e8f0` (Slate 200) | `var(--tblr-body-color)` |
| **Văn bản thứ cấp** | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | `var(--tblr-muted)` |
| **Engine Chống FOUC** | - | - | Inline script trong `<head>` đọc `localStorage.getItem('tablerTheme')` |

### 2.3. Ánh Xạ Typography (Font & Scale)

| Token Typography | Giá Trị Cũ | Thiết Lập Mới Theo Design System | Áp Dụng Trong EJS |
| :--- | :--- | :--- | :--- |
| **Font Family** | Segoe UI / System | Google Font **Inter** (weights: 300, 400, 500, 600, 700) | Nạp qua `<link>` trong `head.ejs` |
| **Page Title** | 22px custom | `fs-1 fw-bold` (24px, line-height 1.25) | Tiêu đề trang, tiêu đề Header |
| **Card Title** | 16px custom | `fs-2 fw-bold` (20px) | Tiêu đề khối Card cấp 1 |
| **Section Title** | 14px bold | `fs-3 fw-bold` (18px) | Tiêu đề phân khu Content Editor |
| **Sub-heading** | 13px | `fs-4 fw-semibold` (16px) | Tiêu đề Tile ứng dụng Launchpad |
| **Body Base** | 13px | `0.875rem` (14px, line-height 1.5) | Toàn bộ văn bản nội dung, form input |
| **Small / Label** | 12px | `0.8125rem` (13px, weight 600) | Nhãn trường `.form-label.required` |
| **Micro Caption** | 11px | `0.6875rem` (11px, weight 700 uppercase) | Tiêu đề cột bảng, badge đếm |

### 2.4. Ánh Xạ Hệ Thống Icon (Emoji &rarr; Tabler Icons Font)

Toàn bộ icon dạng emoji hoặc thiếu thống nhất trong project sẽ được chuẩn hóa 100% sang font vector Tabler Icons (`ti ti-[name]`):

| Thành Phần / Ứng Dụng | Icon Cũ | Class Icon Tabler Mới | Màu Ngữ Nghĩa |
| :--- | :---: | :--- | :--- |
| **Content Editor** | 📑 | `ti ti-article` | `text-primary` (Blue) |
| **Experience Editor** | 🖥️ | `ti ti-device-desktop` | `text-indigo` (Indigo) |
| **Media Library** | 🖼️ | `ti ti-photo` | `text-success` (Green) |
| **Workbox** | 📥 | `ti ti-inbox` | `text-warning` (Amber) |
| **User Manager** | 👥 | `ti ti-users` | `text-purple` (Purple) |
| **Role Manager** | 🛡️ | `ti ti-shield-lock` | `text-purple` (Purple) |
| **Access Viewer** | 🔍 | `ti ti-lock-access` | `text-purple` (Purple) |
| **Control Panel** | ⚙️ | `ti ti-settings` | `text-danger` (Rose/Red) |
| **Recycle Bin** | 🗑️ | `ti ti-trash` | `text-danger` (Red) |
| **Audit Log** | 📜 | `ti ti-history` | `text-teal` (Teal) |
| **Lưu Thay Đổi (Save)** | 💾 | `ti ti-device-floppy` | `text-primary` |
| **Thêm Mới (Insert)** | ➕ | `ti ti-plus` | `text-success` |
| **Nhân Bản (Duplicate)**| 📋 | `ti ti-copy` | `text-secondary` |
| **Đổi Tên (Rename)** | ✏️ | `ti ti-edit` | `text-secondary` |
| **Di Chuyển (Move)** | 📦 | `ti ti-folder-symlink` | `text-secondary` |
| **Sắp Xếp (Sort)** | ↕️ | `ti ti-arrows-sort` | `text-secondary` |

---

## 3. Ánh Xạ Bố Cục (Layout Mapping)

### 3.1. Master Shell Layout (`src/views/layouts/shell.ejs`)
- **Trước:** Dùng khung `.sc-app-shell` với CSS Flexbox tự viết, không có giới hạn `container-xl`, không có Toast container hay Modal xác nhận toàn cục.
- **Sau:** 
  - Khung chuẩn Tabler: `<body class="layout-fluid">` &rarr; `<div class="page">` &rarr; `<div class="page-wrapper">` &rarr; `<div class="page-body">` &rarr; `<div class="container-xl">`.
  - Giới hạn độ rộng tối đa 1320px thanh thoát trên màn hình lớn.
  - Bổ sung Toast Container toàn cục: `#adminToastContainer` (`z-index: 1090`).
  - Bổ sung Modal xác nhận xóa toàn cục: `#adminConfirmModal` (`modal modal-blur fade`).
  - Duy trì thanh Taskbar cố định dưới đáy màn hình của Treecraft (`.sc-taskbar`), nhưng chuẩn hóa màu sắc và hiệu ứng bo viền hòa quyện với theme Tabler.

### 3.2. Topbar Header (`src/views/partials/topbar.ejs`)
- Cấu trúc: `header.navbar.navbar-expand-lg.d-print-none.border-bottom.sticky-top.bg-body.shadow-sm`.
- Cụm trái:
  - Brand Logo Treecraft Logo (`width: 32px; height: 32px; border-radius: 6px; background: var(--sc-red)`).
  - Tên CMS: `Treecraft CMS` (`fw-bold fs-2`).
  - Nút trực tiếp về Launchpad: icon `ti-layout-grid`.
  - **App Switcher Dropdown (Waffle Menu 9 Chấm)**: icon `ti-apps`, dropdown dạng thẻ `dropdown-menu-card` phân 3 nhóm ứng dụng (Content Editing, Access Management, Control Panel).
  - Breadcrumb hiển thị tên trang hiện tại.
- Cụm phải:
  - Ô tìm kiếm nhanh với shortcut `<kbd class="kbd kbd-sm">Ctrl K</kbd>`.
  - Nút chuyển giao diện Sáng / Tối (`data-theme-toggle` với icon `ti-sun` / `ti-moon`).
  - Avatar đại diện tròn + Dropdown tài khoản và nút Đăng xuất.

### 3.3. Launchpad Dashboard (`src/views/admin/launchpad/index.ejs`)
- Chuyển đổi từ danh sách ô thuần sang **Hệ thống 2 tầng thẻ chuẩn Tabler**:
  - **Tầng 1 (Main Container Card):** `card shadow-sm border-0 mb-4`. Header chứa icon nhóm `fs-3` có màu ngữ nghĩa, tiêu đề nhóm in đậm kèm tên kỹ thuật tiếng Anh, và badge tổng số ứng dụng.
  - **Tầng 2 (Application Tile Card):** Grid `col-6 col-md-4 col-xl-3` chứa thẻ `.app-tile-card.card.card-link.card-link-pop`. Icon đại diện đặt trong `.avatar.avatar-md.rounded-3` với màu nền Light Tint (`-lt`), hover nổi bật nhẹ nhàng `translateY(-2px)`.

### 3.4. Content Editor Layout (`src/views/content-editor/index.ejs`)
- Nâng cấp Ribbon Tabs thành dạng thẻ Tabler chuẩn với viền nhấn màu đỏ Treecraft accent.
- Các nút Ribbon: Chuẩn hóa thành `btn-sm` kết hợp icon Tabler sắc nét.
- 3-Pane Workspace (Tree + Form Workspace): Bọc trong `card shadow-sm border-0`, khung Tree có ô tìm kiếm `.input-icon`, form soạn thảo sử dụng các Section Card cấp 2 (`card bg-light border-0 mb-3`) và các trường nhập liệu chuẩn `.input-icon` kèm validation feedback.

### 3.5. Login Page (`src/views/admin/auth/login.ejs`)
- Kế thừa `layouts/auth.ejs` với nền gradient tối Tabler Slate (`#0f172a`).
- Thẻ đăng nhập trung tâm bo góc 12px (`rounded-4`), đổ bóng sâu `shadow-lg`, input sử dụng `.input-icon` với icon `ti-user` và `ti-key`, nút đăng nhập đỏ Treecraft accent (`btn-danger` hoặc `btn-primary` đỏ).

