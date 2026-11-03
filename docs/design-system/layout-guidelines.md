# Quy Chuẩn Bố Cục & Cấu Trúc Khung (Layout Guidelines)

Tài liệu này đặc tả cấu trúc khung tổng thể của Admin CMS, chi tiết hóa hai kiến trúc điều hướng: **Sitecore Experience Launchpad** và **Collapsible Vertical Sidebar**, cùng các quy tắc dàn trang bằng hệ thống lưới (Grid System).

---

## 1. Cấu Trúc Khung Tổng Thể (Overall Layout Architecture)

Trang quản trị được bọc trong cấu trúc khung chuẩn mực của Tabler UI:

```html
<!DOCTYPE html>
<html lang="vi" data-bs-theme="light">
<head>
    <!-- Meta, Theme Engine & Stylesheets -->
</head>
<body class="layout-fluid">
    <div class="page">
        <!-- 1. Thanh điều hướng dọc (Sidebar - tùy chọn) -->
        <!-- <aside class="navbar navbar-vertical ..."></aside> -->

        <div class="page-wrapper">
            <!-- 2. Thanh điều hướng ngang trên cùng (Unified Top Header) -->
            <header class="navbar navbar-expand-lg d-print-none border-bottom sticky-top bg-body shadow-sm">
                <!-- Brand, App Switcher, Search, Notifications, User Menu -->
            </header>

            <!-- 3. Khu vực nội dung chính (Main Content Area) -->
            <div class="page-body">
                <div class="container-xl">
                    <!-- Page Grid & Component Cards -->
                </div>
            </div>

            <!-- 4. Chân trang (Footer - nếu có) -->
        </div>
    </div>

    <!-- 5. Các thành phần toàn cục (Global Modals, Toasts) -->
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1090;" id="adminToastContainer"></div>
</body>
</html>
```

### 1.1. Container Giới Hạn Bề Ngang (`.container-xl`)
- Mọi nội dung bên trong `.page-body` đều phải được đặt trong `.container-xl`.
- Chiều rộng tối đa của `container-xl` là **1320px** trên màn hình lớn. Điều này ngăn việc các dòng văn bản và bảng biểu bị kéo dài quá mức trên màn hình UltraWide (2K/4K), giúp giảm chuyển động cổ và mỏi mắt cho người dùng.

---

## 2. Thanh Điều Hướng Ngang (Unified Top Header)

Thanh Topbar đóng vai trò trung tâm điều hướng, hiển thị cố định ở đầu trang (`sticky-top`) với chiều cao chuẩn **56px - 60px**.

```text
+-----------------------------------------------------------------------------------------------------------------+
| [LOGO] CMS Launchpad  |  [:::] Ứng Dụng v  |  Breadcrumb  ||  [Search Ctrl+K]  (Sun)  [Bell*]  [+ Tạo Mới]  (Avatar) |
+-----------------------------------------------------------------------------------------------------------------+
```

### 2.1. Cụm Bên Trái (Brand & App Switcher)
1. **Brand Logo & Tiêu đề**:
   - Logo hình ảnh kích thước `32px x 32px` (`object-fit: contain`).
   - Tên hệ thống in đậm `fw-bold fs-2 text-heading`.
2. **Nút Về Launchpad**:
   - `btn btn-sm btn-ghost-primary` kèm icon `ti-layout-grid`. Tự động nhận trạng thái `active` khi đang ở trang Dashboard.
3. **App Switcher Dropdown (Kiểu Waffle Menu 9 Chấm)**:
   - Nút kích hoạt: `btn btn-sm btn-outline-secondary` kèm icon `ti-apps`.
   - Bảng thực đơn dạng thẻ (`dropdown-menu-card`, `min-width: 320px`) phân chia theo 3-4 nhóm chức năng rõ ràng:
     - *Nhóm 1: Quản Lý Nội Dung* (Bài viết, Viết bài mới, Thẻ tag, Widget).
     - *Nhóm 2: Media & Độc Giả* (Media Library, Bản tin, Hộp thư liên hệ có badge đếm số chưa đọc).
     - *Nhóm 3: Hệ Thống* (Phân tích lưu lượng, Cài đặt & Sao lưu, Phân quyền người dùng).
4. **Đường Dẫn Ngữ Cảnh (Page Breadcrumb)**:
   - Dải ngăn cách mờ `border-start ps-3` hiển thị tên màn hình hiện tại để người dùng luôn biết rõ vị trí của mình trong hệ thống.

### 2.2. Cụm Bên Phải (Search, Utility Controls & Profile)
1. **Ô Tìm Kiếm Toàn Cục (Global Quick Search)**:
   - Đặt trong `.input-icon`, kích thước `form-control-sm`, chiều rộng tối thiểu `190px`.
   - Tích hợp phím tắt hiển thị trực quan: `<kbd class="kbd kbd-sm">Ctrl K</kbd>`.
2. **Nút Đổi Giao Diện Sáng / Tối (Theme Toggle)**:
   - Chứa hai biểu tượng `ti-sun` và `ti-moon`. Tự động ẩn/hiện biểu tượng tương ứng với trạng thái theme hiện hành.
3. **Menu Thông Báo (Notifications Dropdown)**:
   - Icon chuông `ti-bell fs-2` kèm chấm đỏ nhấp nháy `<span class="badge badge-sm bg-red badge-blink"></span>`.
   - Danh sách tóm tắt các tác vụ cần chú ý (bản tin mới, bài nháp chờ duyệt, liên hệ chưa đọc).
4. **Nút Hành Động Nhanh (+ Tạo Mới)**:
   - `btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3`.
5. **Thực Đơn Người Dùng (User Profile Dropdown)**:
   - Avatar tròn `avatar-sm rounded-circle` kèm menu: Hồ sơ cá nhân, Đổi mật khẩu, Xem website công khai, Đăng xuất.

---

## 3. Thanh Điều Hướng Dọc (Collapsible Vertical Sidebar)

Dành cho các layout CMS sử dụng menu dọc truyền thống.

### 3.1. Kích Thước & Trạng Thái Mở Rộng (Expanded State)
- **Chiều rộng chuẩn**: `15.5rem` (248px).
- **Màu nền**: `var(--tblr-bg-surface)` kết hợp đường viền phải `1px solid var(--tblr-border-color)`.
- **Thứ tự hiển thị**: `z-index: 1030`.
- **Thanh cuộn nội bộ**: Tùy biến thanh cuộn mỏng (`width: 4px`, `scrollbar-width: thin`) để không làm thô giao diện.

### 3.2. Cấu Trúc Các Mục Điều Hướng
1. **Tiêu Đề Nhóm Danh Mục (`.sidebar-section-heading`)**:
   - Chữ in hoa siêu nhỏ `font-size: 0.6875rem`, `font-weight: 700`, khoảng cách ký tự rộng `letter-spacing: 0.085em`, màu sắc `var(--tblr-muted)`.
2. **Mục Menu Tiêu Chuẩn (`.nav-link`)**:
   - `border-radius: 8px`, `padding: 0.625rem 0.85rem`, `margin: 2px 10px`.
   - Hiệu ứng rê chuột: Nền đổi sang `bg-surface-secondary`, chữ đổi màu `text-primary`, trượt nhẹ sang phải `transform: translateX(3px)`.
3. **Mục Menu Đang Được Chọn (Active State)**:
   - Nền dải màu gradient tinh tế: `linear-gradient(90deg, rgba(79, 70, 229, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)`.
   - Vạch chỉ thị dọc bên trái (Active Indicator Pill): Rộng `4px`, bo góc tròn, màu gradient `linear-gradient(180deg, #4f46e5, #6366f1)`.
4. **Menu Đa Tầng Dạng Cây (Accordion Tree List)**:
   - Đường kẻ dẫn dọc (`.sidebar-tree-list::before`) mảnh `1.5px`, màu xám viền.
   - Khi mục con active: Xuất hiện chấm tròn phát sáng (`box-shadow: 0 0 6px rgba(79, 70, 229, 0.6)`).

### 3.3. Chế Độ Thu Nhỏ (Desktop Mini Sidebar Mode)
- Kích hoạt qua class trên thẻ body: `body.sidebar-collapsed`.
- Chiều rộng thu gọn: **`4.8rem` (76.8px)**.
- Toàn bộ chữ tiêu đề, phụ đề, mũi tên accordion và thẻ thông tin tài khoản tự động ẩn (`display: none !important; opacity: 0;`).
- Các icon điều hướng căn chính giữa (`justify-content: center`).
- Tự động kích hoạt **Bootstrap Tooltip nổi sang phải (`placement: right`)** khi người dùng rê chuột qua các icon menu.

---

## 4. Hệ Thống Lưới & Phân Chia Cột (Grid & Spacing System)

Hệ thống sử dụng lưới 12 cột với các quy tắc phối hợp khoảng cách:

### 4.1. Khối Chỉ Số Tổng Quan (KPIs Grid)
```html
<div class="row row-cards mb-4">
    <!-- 4 cards phân bổ đều: 1 cột trên mobile, 2 cột trên tablet, 4 cột trên desktop -->
    <div class="col-12 col-sm-6 col-lg-3">...</div>
    <div class="col-12 col-sm-6 col-lg-3">...</div>
    <div class="col-12 col-sm-6 col-lg-3">...</div>
    <div class="col-12 col-sm-6 col-lg-3">...</div>
</div>
```

### 4.2. Khối Lưới Thẻ Ứng Dụng Launchpad (Tile Cards Grid)
```html
<div class="row row-cards g-3">
    <!-- 3 hoặc 4 cột tùy nhóm chức năng -->
    <div class="col-6 col-md-4 col-xl-3">
        <a href="/admin/posts" class="card card-link card-link-pop h-100 border text-decoration-none p-3 shadow-sm app-tile-card">
            <!-- Icon Avatar, Tiêu đề, Badge đếm, Mô tả ngắn -->
        </a>
    </div>
</div>
```

### 4.3. Bố Cục Trang Biểu Mẫu & Cài Đặt (Form / Master-Detail Layout)
- Bố cục 2 cột bất đối xứng theo tỷ lệ vàng:
  - Cột chính (Nội dung / Form chính): `col-12 col-lg-7` hoặc `col-12 col-lg-8`.
  - Cột phụ (Metadata / Xuất bản / Trạng thái): `col-12 col-lg-5` hoặc `col-12 col-lg-4`.

