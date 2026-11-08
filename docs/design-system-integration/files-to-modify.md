# Danh Sách Tập Tin Cần Tạo & Chỉnh Sửa (Files to Create & Modify)
**Dự Án: Treecraft Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**

---

## 1. Danh Sách Tập Tin Tạo Mới (New Files to Create)

| Đường Dẫn Tập Tin | Loại | Mục Đích & Nội Dung |
| :--- | :--- | :--- |
| `public/css/admin.css` | CSS | Tệp CSS mở rộng cốt lõi: Quy chuẩn Launchpad App Tile, input-icon addon resilience, datatable co giãn (`clamp`), thanh phân trang `admin-pagination`, vạch trạng thái modal (`modal-status`), và biến thể thương hiệu Treecraft Red. |
| `public/js/admin/theme-engine.js` | JS Module | Động cơ chuyển đổi Sáng / Tối (Dark / Light Theme), lưu `localStorage`, đồng bộ `prefers-color-scheme`, cập nhật icon `ti-sun` / `ti-moon`. |
| `public/js/admin/form-validator.js` | JS Module | Động cơ kiểm tra form client-side, tự động scroll/focus vào ô lỗi đầu tiên, chặn duplicate submit, kích hoạt Toast qua URL search params, điều khiển `#adminConfirmModal`. |
| `public/js/admin.js` | JS Entrypoint | Khởi tạo tổng thể: nạp theme engine, form validator, kích hoạt Bootstrap Tooltips, Popovers, xử lý phím tắt toàn cục `Ctrl + K`. |
| `src/views/partials/modals/confirm-modal.ejs` | EJS Partial | Hộp thoại xác nhận thao tác xóa toàn cục (`#adminConfirmModal`) với vạch đỏ cảnh báo và focus an toàn vào nút Cancel. |
| `src/views/partials/modals/unsaved-modal.ejs` | EJS Partial | Hộp thoại cảnh báo dữ liệu chưa lưu (`#adminUnsavedModal`) bảo vệ form khi người dùng vô tình chuyển trang. |

---

## 2. Danh Sách Tập Tin Cần Chỉnh Sửa (Existing Files to Modify)

| Đường Dẫn Tập Tin | Mục Đích Chỉnh Sửa |
| :--- | :--- |
| **`src/app.js`** | Cập nhật cấu hình **Helmet Content-Security-Policy (CSP)**: Cho phép nạp font từ `fonts.googleapis.com`, `fonts.gstatic.com`, và stylesheet/script từ `cdn.jsdelivr.net` (Tabler Core & Tabler Icons). |
| **`src/views/partials/head.ejs`** | Bổ sung đoạn script inline chống FOUC (chớp màn hình theme), link Google Font Inter, Tabler Core CSS, Tabler Icons Webfont và `public/css/admin.css`. |
| **`src/views/layouts/shell.ejs`** | Chuyển đổi khung vỏ sang cấu trúc chuẩn Tabler (`.page` &rarr; `.page-wrapper` &rarr; `.page-body` &rarr; `.container-xl`). Tích hợp `#adminToastContainer`, modal xác nhận toàn cục, và script `public/js/admin.js`. |
| **`src/views/layouts/auth.ejs`** | Hiện đại hóa layout đăng nhập với font Inter, nền tối chuẩn Tabler Slate, và theme engine. |
| **`src/views/partials/topbar.ejs`** | Xây dựng thanh Topbar chuẩn Tabler (`navbar sticky-top bg-body shadow-sm`): Brand Treecraft, Waffle Menu 9 chấm (`ti-apps`), Breadcrumb ngữ cảnh, ô tìm kiếm nhanh `Ctrl + K`, nút Dark/Light Toggle, và avatar dropdown. |
| **`src/views/partials/taskbar.ejs`** | Hiện đại hóa thanh Taskbar Treecraft dưới đáy: thay thế emoji bằng icon vector Tabler, sử dụng biến màu CSS của Tabler, giữ nguyên vạch đỏ active indicator phía trên. |
| **`src/views/admin/launchpad/index.ejs`** | Tái cấu trúc theo hệ thống 2 tầng thẻ chuẩn Tabler: Nhóm ứng dụng thành Card cấp 1 (`card shadow-sm border-0 mb-4`), lưới các tile ứng dụng cấp 2 (`.app-tile-card`) với avatar nền icon Light Tint (`-lt`). |
| **`src/views/admin/auth/login.ejs`** | Nâng cấp form đăng nhập: Dùng thẻ bo góc 12px (`rounded-4`), đổ bóng `shadow-lg`, input bọc `.input-icon` với icon `ti-user` và `ti-lock`, nút submit đỏ Treecraft accent nổi bật. |
| **`src/views/content-editor/index.ejs`** | Hòa quyện Ribbon Tabs và 3-pane layout với Tabler Tokens: Thay emoji bằng Tabler Icons, chuẩn hóa thanh search input-icon, form editor dùng Card cấp 2 xám nhạt (`bg-light`). |
| **`src/views/errors/404.ejs` & `500.ejs`** | Chuẩn hóa giao diện lỗi theo mẫu **Empty State** của Tabler: icon `ti-alert-circle`, thông điệp rõ ràng, nút quay lại trang chủ dạng `btn-primary btn-sm`. |

---

## 3. Thứ Tự Triển Khai (Execution Sequence)

Quy trình triển khai trong Phase 4 sẽ tuân thủ nghiêm ngặt theo 5 bước logic sau:

```text
[ Bước 1: Hạ Tầng CSS & Helmet CSP ]
       |---> Cập nhật CSP trong src/app.js
       |---> Tạo public/css/admin.css (Tokens, Launchpad, Inputs, Pagination)
       |
       v
[ Bước 2: Hạ Tầng JavaScript Client-side ]
       |---> Tạo public/js/admin/theme-engine.js (FOUC & Dark/Light toggle)
       |---> Tạo public/js/admin/form-validator.js (Validation & Toast loop)
       |---> Tạo public/js/admin.js (Bootstrap Tooltips, Popovers, Ctrl+K)
       |
       v
[ Bước 3: Chuẩn Hóa Layouts & Partials Toàn Cục ]
       |---> Cập nhật src/views/partials/head.ejs (CDNs & Inter font)
       |---> Tạo src/views/partials/modals/confirm-modal.ejs & unsaved-modal.ejs
       |---> Cập nhật src/views/partials/topbar.ejs (Waffle 9 chấm, theme toggle)
       |---> Cập nhật src/views/partials/taskbar.ejs (Modernized Treecraft taskbar)
       |---> Cập nhật src/views/layouts/shell.ejs & auth.ejs
       |
       v
[ Bước 4: Tái Cấu Trúc Các Màn Hình Chức Năng ]
       |---> src/views/admin/auth/login.ejs (Modern Card & Input Icons)
       |---> src/views/admin/launchpad/index.ejs (2-Tier Card Hierarchy & Tiles)
       |---> src/views/content-editor/index.ejs (Harmonized Ribbon & Workspace)
       |---> src/views/errors/404.ejs & 500.ejs (Tabler Empty States)
       |
       v
[ Bước 5: Kiểm Thử Tự Động & Hồi Quy ]
       |---> Chạy npm test (Đảm bảo 12/12 tests PASS)
       |---> Chạy npm run lint (Đảm bảo 0 lỗi lint)
```

