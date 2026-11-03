# Tổng Quan Triết Lý & Phong Cách Thiết Kế (Design System Overview)

Tài liệu này xác lập nền tảng triết lý, giá trị cốt lõi và kiến trúc công nghệ của **Tabler Modern Admin Design System** — một hệ thống thiết kế giao diện quản trị (Admin CMS Design System) chuyên nghiệp, hiện đại, tối ưu cho năng suất vận hành và có khả năng tái sử dụng độc lập trên bất kỳ nền tảng công nghệ nào.

---

## 1. Triết Lý Thiết Kế Cốt Lõi (Core Design Principles)

### 1.1. Content-First & Information Density (Ưu Tiên Nội Dung & Tối Ưu Mật Độ Thông Tin)
- Giao diện quản trị là công cụ làm việc hằng ngày của biên tập viên, nhà quản lý và kỹ sư. Vì vậy, hệ thống ưu tiên **mật độ thông tin vừa phải nhưng chặt chẽ** (Compact & Dense), tránh lãng phí diện tích màn hình bởi các khoảng trống thừa.
- Kích thước chuẩn cho các thanh công cụ, bảng biểu và form là phiên bản thu gọn (`form-control-sm`, `form-select-sm`, `btn-sm`, `py-2`, `gap-2`).
- Dữ liệu định lượng (KPIs, trạng thái, ngày tháng) được trình bày với độ tương phản cao, định dạng rõ ràng, cho phép người dùng quét mắt (scanability) và nắm bắt tình hình hệ thống trong vòng 3 giây.

### 1.2. Semantic Visual Affordance (Chỉ Dẫn Tương Tác Trực Quan Qua Ngữ Nghĩa)
- Mọi màu sắc và biểu tượng trong hệ thống đều mang **ý nghĩa chức năng cố định (Functional Semantics)**:
  - **Azure / Primary (`#206bc4` / `#4f46e5`)**: Điều hướng chính, bài viết, hành động tạo mới/lưu trữ.
  - **Green / Success (`#2fb344`)**: Trạng thái đã xuất bản, đã kích hoạt, xuất dữ liệu an toàn.
  - **Yellow / Warning (`#f59f00`)**: Bản nháp, thao tác nhập dữ liệu (import), cảnh báo thay đổi chưa lưu.
  - **Red / Danger (`#d63939`)**: Hành động phá hủy (xóa vĩnh viễn, thùng rác), lỗi nhập liệu, bảo mật.
  - **Purple (`#ae3ec9`)**: Tương tác cộng đồng, độc giả bản tin, tin nhắn khách hàng.
  - **Teal / Cyan (`#0ca678`)**: Thống kê lưu lượng, phân tích hiệu suất hệ thống.
- Sử dụng biến thể **Light Tint (`-lt`)** của Tabler (`bg-primary-lt`, `bg-danger-lt`, `bg-success-lt`...) cho các huy hiệu (badges) và avatar nền icon để tạo cảm giác dịu mắt, tránh gây mỏi thị giác khi làm việc kéo dài.

### 1.3. Structured Two-Tier Hierarchy (Cấu Trúc Khối 2 Tầng Rõ Ràng)
- Mọi màn hình chức năng đều tuân theo hệ thống phân cấp 2 tầng thẻ:
  - **Cấp 1 - Thẻ Khung Chức Năng (Main Container Card)**: Chứa icon chủ đề `fs-3`, tiêu đề in đậm kèm tên kỹ thuật tiếng Anh (nếu có), phụ đề mô tả mục đích và thanh công cụ thao tác góc phải.
  - **Cấp 2 - Thẻ Hành Động / Lưới Ứng Dụng (Sub-card / Launchpad Tile)**: Nằm bên trong thẻ chính với nền xám nhạt (`bg-light`), viền bo góc nhẹ (`border-radius: 8px`), đổ bóng khi hover (`translateY(-2px)`) và nút CTA toàn chiều rộng (`w-100`).

### 1.4. Server-Side Rendering First (Tương Thích Tự Nhiên Với Kiến Trúc SSR & MPA)
- Khác với các thư viện ràng buộc chặt với React (Ant Design, MUI, Mantine), Design System này được tối ưu hóa cho mô hình **Multi-Page Application (MPA)** và **Server-Side Rendering (SSR)**.
- Hoạt động trơn tru 100% với EJS, Pug, Handlebars, Blade (Laravel), Django Templates, ERB (Rails), Go Templates mà **không yêu cầu build pipeline phức tạp** (Webpack/Vite/Babel).
- Đồng thời hoàn toàn tương thích nếu áp dụng vào client-side frameworks (Vue, React, Svelte, Alpine.js).

### 1.5. Native Dark / Light Theme Harmony (Chuyển Đổi Giao Diện Không Gây FOUC)
- Chuyển đổi giao diện sáng/tối đồng bộ dựa trên thuộc tính tiêu chuẩn `data-bs-theme="light"` và `data-bs-theme="dark"` trên thẻ `<html>`.
- Tích hợp động cơ kiểm tra inline script trước khi render để chống hiện tượng chớp nháy giao diện khi tải trang (FOUC - Flash of Unstyled Content).
- Lưu giữ tùy chọn người dùng qua `localStorage` và tự động kế thừa thiết lập hệ điều hành (`prefers-color-scheme`).

---

## 2. Nền Tảng Công Nghệ & Thành Phần Cốt Lõi (Tech Stack & Assets)

```text
+-----------------------------------------------------------------------------------+
|                        APPLICATION LAYER (CMS Pages & Views)                     |
|    Dashboard  *  Posts Table  *  Forms  *  Settings  *  Contacts  *  Analytics    |
+-----------------------------------------------------------------------------------+
|                     CUSTOM EXTENSION LAYER (public/css/admin.css)                 |
|   App Launchpad  *  Input-Icon Addons  *  Pagination  *  Preview  *  Toasts       |
+-----------------------------------------------------------------------------------+
|                       CORE FRAMEWORK & ICON SYSTEM                                |
|        Tabler Core CSS (v1.0.0-beta20)       *       Tabler Icons (v2.47.0)       |
|            Bootstrap 5 Runtime Engine        *       Google Font Inter            |
+-----------------------------------------------------------------------------------+
```

### 2.1. Thư Viện Cốt Lõi (Core Libraries)
1. **Framework Giao Diện**: `@tabler/core` (phiên bản `1.0.0-beta20`), kế thừa nền tảng CSS Grid và Flexbox của Bootstrap 5.
2. **Bộ Biểu Tượng (Icon System)**: `@tabler/icons-webfont` (phiên bản `2.47.0`) với hơn 4,000 vector icons dạng font, cú pháp nhất quán `ti ti-[name]`.
3. **Phông Chữ (Typography)**: Google Font **Inter** (weights: 300, 400, 500, 600, 700), hiển thị sắc nét trên cả màn hình Retina và màn hình tiêu chuẩn.
4. **Custom Production CSS**: `public/css/admin.css` chứa các quy chuẩn mở rộng (Launchpad tiles, input-icon addon resilience, modern pagination, live preview viewport, responsive tables).

### 2.2. Thư Viện Bổ Trợ (Complementary Plugins)
- **Select2 & Select2 Bootstrap 5 Theme**: Lựa chọn thẻ tag đa giá trị (multi-select), tìm kiếm nhanh trong dropdown.
- **TinyMCE 6.3**: Trình biên tập văn bản WYSIWYG tích hợp quản lý media.
- **SweetAlert2 / Bootstrap Native Toast**: Thông báo kết quả và phản hồi lỗi tương tác.

---

## 3. Kiến Trúc Điều Hướng (Navigation Architecture)

Hệ thống hỗ trợ 2 mô hình bố cục điều hướng linh hoạt:

1. **Mô Hình Sitecore Experience Launchpad (Unified Topbar + Launchpad Grid)**:
   - Thanh Topbar cố định trên cùng (`navbar-expand-lg sticky-top border-bottom`).
   - Tích hợp menu thả dạng lưới 9 chấm (Waffle / App Switcher) để truy cập nhanh các module.
   - Trang chủ Dashboard đóng vai trò trung tâm chỉ huy (Launchpad) với các Tile thẻ ứng dụng phân nhóm rõ ràng (Content, Media & Community, System & Admin).
2. **Mô Hình Sidebar Truyền Thống (Collapsible Vertical Navbar)**:
   - Sidebar cố định bên trái (`navbar-vertical`), hỗ trợ thu nhỏ thành dạng mini sidebar (`sidebar-collapsed` - `width: 4.8rem`) trên màn hình Desktop.
   - Tự động hiển thị Tooltip nổi khi rê chuột vào các icon menu trong chế độ mini sidebar.
   - Thẻ thông tin tài khoản người dùng ghim chắc chắn ở chân sidebar (`sidebar-user-card`).

---

## 4. Mục Tiêu Tái Sử Dụng (Portability Goals)

Bộ tài liệu trong thư mục `/docs/design-system/` được thiết kế sao cho:
1. **Độc lập hoàn toàn**: Không chứa mã nguồn logic nghiệp vụ (business logic) của riêng dự án blog.
2. **Đầy đủ định lượng**: Mọi thông số (màu sắc, kích thước font, padding, border-radius, z-index) đều được định lượng bằng giá trị cụ thể (`px`, `rem`, `hex`).
3. **Sẵn sàng cho AI Coding Agent**: Một AI Agent ở bất kỳ dự án mới nào chỉ cần đọc bộ tài liệu này là có thể tạo ra các giao diện quản trị chuẩn mực, đồng nhất 100% với chuẩn UI của hệ thống.

