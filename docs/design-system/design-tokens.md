# Định Chuẩn Giá Trị Thiết Kế (Design Tokens Specification)

Tài liệu này chi tiết hóa toàn bộ các thông số định lượng (Design Tokens) của hệ thống bao gồm: Bảng màu (Color Palette), Kiểu chữ (Typography), Khoảng cách (Spacing Scale), Bo góc (Border Radius), Đổ bóng (Box Shadow), Thứ tự hiển thị (Z-Index) và Điểm ngắt màn hình (Breakpoints).

---

## 1. Bảng Màu Hệ Thống (Color Palette)

### 1.1. Bảng Màu Ngữ Nghĩa & Thương Hiệu (Brand & Semantic Colors)
Các màu sắc được cấu hình thông qua biến CSS của Tabler/Bootstrap và hỗ trợ đầy đủ 2 phiên bản: **Đậm (Solid)** và **Dịu (Light Tint - `-lt`)**.

| Tên màu Token | Biến CSS Tabler | Mã Hex Solid | Phiên bản Tint (`-lt`) | Mục đích & Ngữ cảnh sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Brand / Action)** | `--tblr-primary` | `#206bc4` / `#4f46e5` | `bg-primary-lt` (12% opacity) | Nút hành động chính (Tạo mới, Lưu), liên kết điều hướng, thẻ active |
| **Secondary (Muted / Neutral)** | `--tblr-secondary` | `#64748b` | `bg-secondary-lt` | Nút hủy, huy hiệu phụ, văn bản giải thích phụ trợ |
| **Success (Green)** | `--tblr-success` | `#2fb344` | `bg-success-lt` / `bg-green-lt` | Trạng thái "Đã xuất bản", thành công, xuất file CSV |
| **Warning (Amber / Yellow)** | `--tblr-warning` | `#f59f00` | `bg-warning-lt` / `bg-yellow-lt` | Trạng thái "Bản nháp", khôi phục dữ liệu, cảnh báo unsaved changes |
| **Danger (Red)** | `--tblr-danger` | `#d63939` | `bg-danger-lt` / `bg-red-lt` | Nút xóa, thùng rác, lỗi validation, cảnh báo rủi ro cao |
| **Info / Azure** | `--tblr-azure` | `#4299e1` | `bg-azure-lt` | Hộp thư liên hệ, tài nguyên media, chỉ số thống kê tổng hợp |
| **Purple** | `--tblr-purple` | `#ae3ec9` | `bg-purple-lt` | Độc giả bản tin, tương tác cộng đồng, danh mục thẻ tag |
| **Teal / Cyan** | `--tblr-teal` | `#0ca678` | `bg-teal-lt` | Phân tích lưu lượng, giám sát tốc độ và thời gian uptime |
| **Dark / Muted Black** | `--tblr-dark` | `#1e293b` | `bg-dark-lt` | Sao lưu kỹ thuật, cấu hình cấp cao, mã nguồn JSON |

```css
/* CSS Token Reference */
:root {
  --tblr-primary: #206bc4;
  --tblr-primary-rgb: 32, 107, 196;
  --tblr-secondary: #64748b;
  --tblr-success: #2fb344;
  --tblr-warning: #f59f00;
  --tblr-danger: #d63939;
  --tblr-info: #4299e1;
  --tblr-purple: #ae3ec9;
  --tblr-teal: #0ca678;
}
```

### 1.2. Màu Nền, Bề Mặt & Độ Tương Phản (Surfaces & Backgrounds)
Thiết kế hỗ trợ tương thích hoàn hảo giữa 2 chế độ Sáng (`[data-bs-theme="light"]`) và Tối (`[data-bs-theme="dark"]`).

| Vị trí / Thuộc tính | Chế độ Sáng (Light Theme) | Chế độ Tối (Dark Theme) | Biến CSS |
| :--- | :--- | :--- | :--- |
| **Nền trang chính (Body Background)** | `#f8fafc` | `#0f172a` | `var(--tblr-body-bg)` |
| **Bề mặt Card / Modal / Dropdown** | `#ffffff` | `#1e293b` | `var(--tblr-bg-surface)` |
| **Bề mặt thứ cấp (Table Head / Toolbar)** | `#f1f5f9` (hoặc `rgba(248, 250, 252, 1)`) | `#172033` (hoặc `rgba(15, 23, 42, 0.6)`) | `var(--tblr-bg-surface-secondary)` |
| **Đường viền ngăn cách (Border Color)** | `#e2e8f0` | `#334155` | `var(--tblr-border-color)` |
| **Văn bản chính (Body Text)** | `#1e293b` (Slate 800) | `#e2e8f0` (Slate 200) | `var(--tblr-body-color)` |
| **Văn bản tiêu đề (Heading Text)** | `#0f172a` (Slate 900) | `#ffffff` (White) | `var(--tblr-heading-color)` |
| **Văn bản thứ cấp (Muted / Subtitle)** | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | `var(--tblr-muted)` |

---

## 2. Hệ Thống Kiểu Chữ (Typography)

### 2.1. Phông Chữ Cốt Lõi (Font Family Stack)
```css
:root {
  --admin-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --tblr-font-sans-serif: var(--admin-font);
  --tblr-font-monospace: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

body {
  font-family: var(--admin-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 2.2. Thang Cỡ Chữ & Chiều Cao Dòng (Type Scale & Line Heights)
Hệ thống sử dụng thang kích cỡ chữ theo chuẩn modular 1.125:

| Tên Token / Class | Kích thước (`rem` / `px`) | Line Height | Độ đậm (Font Weight) | Trường hợp sử dụng tiêu biểu |
| :--- | :--- | :--- | :--- | :--- |
| `fs-1` / Page Title | `1.5rem` (24px) | `1.25` | 700 (Bold) | Tiêu đề màn hình chính, số liệu KPI nổi bật |
| `fs-2` / Card Title | `1.25rem` (20px) | `1.3` | 700 (Bold) | Tiêu đề khối Card lớn, tiêu đề Modal xác nhận |
| `fs-3` / Header Icon | `1.125rem` (18px) | `1.35` | 600 (Semibold) | Icon tiêu đề `card-header`, tiêu đề Sub-card |
| `fs-4` / Sub-heading | `1.0rem` (16px) | `1.4` | 600 (Semibold) | Tiêu đề nhóm chức năng, tiêu đề bảng con |
| Base Body Text | `0.875rem` (14px) | `1.5` | 400 / 500 | Văn bản nội dung bảng, mô tả thẻ, chữ nút bấm (`btn`) |
| `small` / Form Text | `0.8125rem` (13px) | `1.45` | 500 / 600 | Nhãn trường (`form-label`), input thu gọn (`form-control-sm`) |
| Micro / Caption | `0.6875rem` (11px) | `1.4` | 600 / 700 | Heading tiêu đề cột bảng (`th`), nhãn danh mục sidebar |

---

## 3. Thang Khoảng Cách (Spacing Scale)

Dựa trên đơn vị chuẩn **4px / 8px Grid System**:

| Spacing Token | Class Tiêu Chuẩn | Giá Trị Cụ Thể | Ứng Dụng Trong Hệ Thống |
| :--- | :--- | :--- | :--- |
| **Space-1** | `gap-1`, `p-1`, `m-1` | `0.25rem` (4px) | Khoảng cách giữa icon và text trong nút bấm, khoảng cách các nút icon nhỏ |
| **Space-2** | `gap-2`, `p-2`, `py-2` | `0.5rem` (8px) | Padding dọc cho `card-header`, khoảng cách các phần tử trong form row |
| **Space-3** | `gap-3`, `p-3`, `mb-3` | `1.0rem` (16px) | Padding bên trong `card-body`, khoảng cách giữa các cột trong lưới (`row g-3`) |
| **Space-4** | `gap-4`, `p-4`, `mb-4` | `1.5rem` (24px) | Khoảng cách giữa các khối Card chính, khoảng cách các phân khu lớn (`row g-4`) |
| **Space-5** | `py-5`, `my-5` | `3.0rem` (48px) | Padding cho các khối rỗng dữ liệu (Empty State), màn hình đăng nhập |

---

## 4. Quy Chuẩn Bo Góc (Border Radius)

| Radius Token | Giá Trị | Class Tiêu Chuẩn | Thành Phần Áp Dụng |
| :--- | :--- | :--- | :--- |
| **Radius-XS** | `3px` - `4px` | `rounded-1` | Tag choice trong Select2, badge siêu nhỏ |
| **Radius-SM** | `6px` | `rounded-2` / default | Nút bấm (`btn`, `btn-sm`), ô nhập liệu (`form-control-sm`), dropdown menu |
| **Radius-MD** | `8px` | `rounded-3` | Khung thẻ chính (`card`), tile ứng dụng (`app-tile-card`), nút phân trang (`page-link`), preview avatar |
| **Radius-LG** | `12px` | `rounded-4` | Hộp thoại Modal (`modal-content`), card thông tin người dùng (`sidebar-user-card`) |
| **Radius-Pill / Full** | `50%` / `50rem` | `rounded-circle` / `rounded-pill` | Avatar đại diện tài khoản, badge đếm thông báo, chấm trạng thái online |

---

## 5. Thang Đổ Bóng (Box Shadow)

```css
:root {
  /* Bóng mờ siêu nhẹ cho nút và thẻ tĩnh */
  --admin-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  
  /* Bóng mờ tiêu chuẩn cho Card chính */
  --admin-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  
  /* Bóng nổi bật khi rê chuột (Hover State) */
  --admin-shadow-md: 0 4px 14px rgba(0, 0, 0, 0.08);
  
  /* Bóng mềm cho Dropdown Menu, Modal và Toasts */
  --admin-shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
}
```

---

## 6. Thứ Tự Hiển Thị (Z-Index Scale)

Để loại bỏ hoàn toàn các lỗi xung đột che khuất giao diện (z-index collision), hệ thống tuân thủ nghiêm ngặt thang phân tầng sau:

```text
1090 +---------------------------------------------------------------+ (Global Toast Container: #adminToastContainer)
1060 |   Tooltips & Popovers (Bootstrap Tooltip)                     |
1055 |   Confirmation & Destructive Modals (#adminConfirmModal)      |
1050 |   Standard Modal Backdrops & Dialogs (Media Browser, Preview) |
1030 |   Collapsible Vertical Sidebar (navbar-vertical)              |
1020 |   Sticky Top Navigation Header (navbar sticky-top)            |
   4 |   Input-Icon Addon (Fixed inside control)                     |
   3 |   Active Pagination Page Link (Active Link)                   |
   2 |   Hovered Elements / Focus Outline                            |
   1 |   Default Surface Stacking Context                            |
   0 +---------------------------------------------------------------+ (Canvas Background)
```

---

## 7. Điểm Ngắt Thích Ứng (Responsive Breakpoints)

Kế thừa chuẩn Grid 12 cột của Bootstrap 5:

| Điểm ngắt | Ký hiệu Class | Kích thước màn hình | Hành vi giao diện chính |
| :--- | :--- | :--- | :--- |
| **Mobile Nhỏ** | `< 576px` (`xs`) | Dưới 576px | Header chia cột dọc, bảng cho phép cuộn ngang hoặc wrap, button chuyển full-width, nút phân trang thu nhỏ còn 32x32px |
| **Mobile Lớn / Phablet**| `>= 576px` (`sm`) | 576px - 767px | Grid 2 cột cho các thẻ KPI, hiển thị nút thao tác kèm icon |
| **Tablet** | `>= 768px` (`md`) | 768px - 991px | Hiện đầy đủ một số cột dữ liệu bảng, hiển thị thanh tìm kiếm header |
| **Desktop Tiêu Chuẩn** | `>= 992px` (`lg`) | 992px - 1199px | Kích hoạt chế độ thu nhỏ Sidebar (Mini Mode `4.8rem`), grid 4 cột cho thẻ KPI |
| **Desktop Màn Rộng** | `>= 1200px` (`xl`) | 1200px - 1399px | Bố cục `container-xl` giới hạn bề ngang thanh thoát, không kéo dãn vô tận |
| **Ultra Wide** | `>= 1400px` (`xxl`) | 1400px trở lên | Giữ nguyên bề ngang `container-xl` (~1320px) với lề căn giữa hoàn hảo |

