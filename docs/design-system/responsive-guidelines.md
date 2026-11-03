# Quy Chuẩn Thích Ứng Đa Thiết Bị (Responsive Guidelines)

Tài liệu này quy chuẩn các nguyên tắc và kỹ thuật thích ứng đa thiết bị (Responsive Design) của hệ thống Admin CMS, đảm bảo trải nghiệm quản trị mượt mà trên cả 3 nền tảng: **Màn hình lớn (Desktop)**, **Máy tính bảng (Tablet)** và **Điện thoại di động (Mobile)**.

---

## 1. Chiến Lược Thích Ứng Tổng Thể (Responsive Strategy)

1. **Graceful Degradation (Thoái biến linh hoạt)**: Hệ thống cung cấp trải nghiệm quản trị đa tính năng nhất trên Desktop, sau đó tự động tinh giản các thành phần phụ và mở rộng vùng chạm (Touch Target) trên thiết bị di động.
2. **Column Priority Hiding (Ẩn cột bảng theo độ ưu tiên)**: Không cố gắng nhồi nhét toàn bộ các cột dữ liệu vào màn hình nhỏ. Các thông tin phụ (ngày tạo, chuyên mục, ID) sẽ tự động ẩn dần, nhường toàn bộ diện tích cho Tiêu đề, Trạng thái và Nút hành động.
3. **No Horizontal Scrollbar on Page (Không cuộn ngang toàn trang)**: Mọi sự tràn dữ liệu bảng đều được khoanh vùng cục bộ bên trong khối `.table-responsive`.

---

## 2. Bảng Phân Tầng Thiết Bị & Điểm Ngắt (Breakpoints Hierarchy)

```text
       < 576px                768px               992px               1200px
+--------------------+-------------------+-------------------+-------------------+
|    Mobile (xs)     |    Tablet (md)    |   Desktop (lg)    |  Wide Screen (xl) |
|  Single col cards  |  2-col KPI cards  |  4-col KPI cards  |  container-xl     |
|  Stacked headers   |  Partial table cols|  Mini-sidebar mode|  1320px max width |
|  Touch 36px btns   |  Header search on |  Expanded navbar  |  Balanced margins |
+--------------------+-------------------+-------------------+-------------------+
```

---

## 3. Thích Ứng Thanh Điều Hướng (Navigation Responsiveness)

### 3.1. Thanh Header Trên Cùng
- **Trên Desktop (`>= 992px`)**: Hiển thị đầy đủ Brand Logo, Launchpad Direct link, Waffle App Switcher, Breadcrumb tiêu đề, Ô tìm kiếm nhanh với phím tắt `Ctrl + K`, Theme Toggle, Chuông thông báo, Nút "+ Tạo Mới" và Dropdown tài khoản.
- **Trên Mobile (`< 576px`)**:
  - Ẩn ô tìm kiếm toàn cục (chuyển sang nút icon tìm kiếm khi cần).
  - Ẩn dải chữ Breadcrumb tiêu đề trang.
  - Nút "+ Tạo Mới" thu gọn về icon `ti-plus` (`.d-none .d-sm-inline`).
  - Tên người dùng ẩn đi, chỉ giữ lại ảnh đại diện Avatar tròn.

### 3.2. Sidebar Điều Hướng Dọc
- **Trên Desktop (`>= 992px`)**:
  - Hỗ trợ chế độ mở rộng (`15.5rem`) và chế độ thu nhỏ Mini Mode (`4.8rem` - class `body.sidebar-collapsed`).
- **Trên Mobile (`< 992px`)**:
  - Tuyệt đối **không dùng chế độ Mini Mode** trên điện thoại vì diện tích quá nhỏ gây bấm nhầm.
  - Sidebar chuyển thành dạng menu trượt hoặc collapse sổ xuống từ đỉnh màn hình với giới hạn chiều cao:
  ```css
  @media (max-width: 991.98px) {
    .navbar-vertical .navbar-collapse.show,
    .navbar-vertical .navbar-collapse.collapsing {
      max-height: 75vh;
      overflow-y: auto;
    }
  }
  ```

---

## 4. Thích Ứng Bảng Dữ Liệu (Responsive Data Tables)

### 4.1. Quy Tắc Ẩn Cột Theo Thứ Tự Ưu Tiên
Sử dụng các class utility hiển thị của Bootstrap 5 trực tiếp trên thẻ `<th>` và `<td>`:

| Cột dữ liệu | Class hiển thị | Ngưỡng hiển thị |
| :--- | :--- | :--- |
| **Checkbox chọn tất cả** | `w-1` | Luôn hiển thị |
| **STT (#)** | `w-1 d-none d-sm-table-cell` | Chỉ hiện từ màn hình Mobile lớn (`>= 576px`) |
| **Tiêu đề & Tóm tắt** | *Không có class ẩn* | **Luôn luôn hiển thị trên mọi thiết bị** |
| **Tác giả** | `d-none d-md-table-cell` | Chỉ hiện từ Tablet (`>= 768px`) |
| **Chủ đề / Chuyên mục** | `d-none d-lg-table-cell` | Chỉ hiện từ Desktop (`>= 992px`) |
| **Thẻ Tags** | `d-none d-sm-table-cell` | Hiện từ Mobile lớn (`>= 576px`) |
| **Trạng thái & Lượt xem**| `text-center` | **Luôn luôn hiển thị trên mọi thiết bị** |
| **Ngày tạo** | `d-none d-lg-table-cell` | Chỉ hiện từ Desktop (`>= 992px`) |
| **Nút thao tác** | `text-end` | **Luôn luôn hiển thị trên mọi thiết bị** |

### 4.2. Mở Rộng Vùng Chạm Cảm Ứng (Touch Target Expansion)
Trên điện thoại di động, các nút bấm thao tác trong bảng được tự động mở rộng kích thước tối thiểu **36px x 36px** để ngón tay chạm chính xác, không bị bấm nhầm:

```css
@media (max-width: 575.98px) {
  /* Tăng kích thước touch target cho action buttons */
  .btn-group-sm > .btn {
    min-width: 36px;
    min-height: 36px;
    padding: 0.35rem 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
```

### 4.3. Bẻ Dòng Văn Bản Trên Mobile
Trên màn hình siêu nhỏ, các ô bảng được phép tự động bẻ dòng thay vì bắt buộc cắt ngắn vô tận:

```css
@media (max-width: 575.98px) {
  .table-nowrap td,
  .table-nowrap th {
    white-space: normal;
  }
  .table-title-truncate {
    max-width: 160px !important;
  }
}
```

---

## 5. Thích Ứng Thẻ & Thanh Công Cụ Lọc (Cards & Filter Toolbar)

### 5.1. Xếp Chồng Đầu Thẻ (Stacked Card Header)
Trên Desktop, `card-header` dàn ngang hai đầu (`justify-content: space-between`). Khi về màn hình di động, header tự động chuyển thành cột dọc (`flex-direction: column`) để tiêu đề và nút bấm không đè lên nhau:

```css
@media (max-width: 575.98px) {
  .card-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start !important;
  }
}
```

### 5.2. Thanh Tabs Vuốt Ngang (Swipeable Horizontal Tabs)
Khi danh sách tab trạng thái (`.card-header-tabs` hoặc tab lọc) có nhiều mục, trên mobile thanh tab sẽ không bị vỡ dòng mà cho phép người dùng **vuốt ngang mượt mà bằng ngón tay (Touch Scroll)**:

```css
@media (max-width: 575.98px) {
  .card-header-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .card-header-tabs::-webkit-scrollbar {
    display: none;
  }
  .card-header-tabs .nav-link {
    white-space: nowrap;
  }
}
```

---

## 6. Thích Ứng Thanh Phân Trang (Responsive Pagination)

Để hàng nút phân trang không bị tràn màn hình khi có nhiều trang:
- **Trên Desktop**: Kích thước nút `38px x 38px`, khoảng cách `gap: 6px`.
- **Trên Mobile (`< 576px`)**: Tự động thu nhỏ về `32px x 32px`, khoảng cách `gap: 3px`, cỡ chữ `12px` và bo góc mềm `6px`:

```css
@media (max-width: 575.98px) {
  .pagination .page-item .page-link,
  .admin-pagination .page-item .page-link {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    font-size: 12px;
    border-radius: 6px !important;
  }
  .pagination,
  .admin-pagination {
    gap: 3px;
  }
}
```

---

## 7. Khung Giả Lập Xem Trước Đa Thiết Bị (Live Viewport Preview)

Dành cho tính năng xem trước trực tiếp bài viết hoặc trang đích (Live Post Preview):

```html
<div class="post-preview-canvas-wrapper p-3">
    <!-- Viewport Container có thể chuyển đổi class qua JavaScript -->
    <div class="post-preview-viewport post-preview-desktop">
        <!-- Nội dung xem trước -->
    </div>
</div>
```

| Chế độ xem trước | Class tương ứng | Chiều rộng giới hạn | Đặc điểm khung thiết bị |
| :--- | :--- | :--- | :--- |
| **Desktop** | `.post-preview-desktop` | `100%` | Bo góc tiêu chuẩn `8px` |
| **Máy tính bảng** | `.post-preview-tablet` | `768px` | Bo góc `16px`, đổ bóng sâu đa tầng, viền xám 2px |
| **Điện thoại** | `.post-preview-mobile` | `390px` | Bo góc `28px` chuẩn khung viền iPhone 14/15, viền kim loại 3px |

