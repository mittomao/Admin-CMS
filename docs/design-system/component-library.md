# Thư Viện Thành Phần Giao Diện (Component Library Specification)

Tài liệu này đặc tả chi tiết cấu trúc HTML, lớp CSS, biến thể (Variants), trạng thái (States) và cách sử dụng của toàn bộ các thành phần giao diện (UI Components) trong hệ thống CMS.

---

## 1. Nút Bấm & Nhóm Nút (Buttons & Button Groups)

### 1.1. Cấu Trúc Nút Tiêu Chuẩn (Standard Button)
Mọi nút bấm trong hệ thống đều tuân thủ nguyên tắc: **Bắt buộc có icon đại diện đi kèm nhãn văn bản**, bo góc `6px` và hiệu ứng lún nhẹ khi click (`translateY(1px)`).

```html
<!-- Nút chính (Primary CTA) -->
<button type="submit" class="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-2">
    <i class="ti ti-check"></i>
    <span>Lưu Thay Đổi</span>
</button>

<!-- Nút viền phụ (Outline Secondary) -->
<a href="/admin/posts" class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-2">
    <i class="ti ti-x"></i>
    <span>Hủy Thao Tác</span>
</a>

<!-- Nút chỉ có biểu tượng (Icon-only Button) -->
<button type="button" class="btn btn-sm btn-icon btn-ghost-secondary" title="Xem chi tiết" aria-label="Xem chi tiết">
    <i class="ti ti-eye fs-2"></i>
</button>
```

### 1.2. Bảng Phân Định Màu Sắc Nút Ngữ Nghĩa (Semantic Button Variants)
| Nhóm chức năng | Class Nút | Icon khuyến nghị | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **Primary** | `btn-primary` | `ti-plus`, `ti-device-floppy` | Tạo bài viết mới, lưu form, áp dụng bộ lọc chính |
| **Success** | `btn-success` / `btn-outline-success` | `ti-table-export`, `ti-download` | Xuất file CSV, tải backup JSON |
| **Warning** | `btn-warning` | `ti-cloud-upload`, `ti-rotate-clockwise` | Khôi phục dữ liệu, hoàn tác thao tác |
| **Danger** | `btn-danger` / `btn-outline-danger` | `ti-trash`, `ti-alert-triangle` | Xóa bản ghi, dọn sạch thùng rác, đổi mật khẩu |
| **Ghost / Muted** | `btn-ghost-primary`, `btn-ghost-secondary` | `ti-layout-grid`, `ti-dots-vertical` | Nút trên thanh tiêu đề, menu ngữ cảnh |

### 1.3. Nhóm Nút (Button Groups) & Sửa Lỗi Bo Góc Form Xóa
Khi bọc form xóa bằng phương thức DELETE bên trong `.btn-group`, hệ thống sử dụng luật CSS chuyên biệt để đảm bảo bo góc ngoài cùng luôn vuông vắn, không bị vỡ giao diện:

```html
<div class="btn-group btn-group-sm">
    <a href="/admin/posts/123/edit" class="btn btn-outline-secondary" title="Sửa bài viết">
        <i class="ti ti-edit"></i>
    </a>
    <a href="/posts/123" target="_blank" class="btn btn-outline-secondary" title="Xem công khai">
        <i class="ti ti-external-link"></i>
    </a>
    <!-- Form xóa nằm trong btn-group được tự động chuẩn hóa bo góc qua CSS -->
    <form action="/admin/posts/123" method="post" class="d-inline" data-confirm-delete="Bạn có chắc chắn muốn xóa bài viết này?">
        <input type="hidden" name="_method" value="DELETE">
        <button type="submit" class="btn btn-outline-danger" title="Xóa bài viết">
            <i class="ti ti-trash"></i>
        </button>
    </form>
</div>
```

---

## 2. Thẻ & Lưới Khung Chức Năng (Cards, Sub-Cards & Tiles)

### 2.1. Thẻ Khung Cấp 1 (Main Container Card)
Đóng vai trò là khối bao quanh một tính năng hoàn chỉnh:

```html
<div class="card shadow-sm border-0 mb-4">
    <!-- Header gồm icon fs-3, cụm tiêu đề 2 dòng và nút thao tác phải -->
    <div class="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div class="d-flex align-items-center gap-2">
            <i class="ti ti-messages text-purple fs-3"></i>
            <div>
                <h3 class="card-title fw-bold m-0">Hộp Thư Liên Hệ (Contact Messages)</h3>
                <div class="text-muted small">Quản lý các phản hồi và đề xuất hợp tác từ độc giả</div>
            </div>
        </div>
        <div class="d-flex align-items-center gap-2">
            <span class="badge bg-purple-lt">24 tin nhắn</span>
            <a href="/admin/contacts/export" class="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-2">
                <i class="ti ti-table-export"></i>
                <span>Xuất CSV</span>
            </a>
        </div>
    </div>
    <div class="card-body">
        <!-- Nội dung tính năng -->
    </div>
</div>
```

### 2.2. Thẻ Hành Động Cấp 2 (Action Sub-card)
Thường được bố trí theo dạng lưới 2 cột hoặc 3 cột bên trong `card-body`:

```html
<div class="card card-body bg-light border-0 h-100 d-flex flex-column justify-content-between p-3">
    <div>
        <div class="d-flex align-items-center gap-2 mb-2">
            <i class="ti ti-file-code text-blue fs-3"></i>
            <h4 class="m-0 fw-bold">Sao Lưu Bài Viết</h4>
        </div>
        <p class="text-muted small mb-3">
            Xuất toàn bộ bài viết, nội dung HTML, slug, tags và metadata SEO ra file JSON.
        </p>
    </div>
    <a href="/admin/backup/export/posts" class="btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 shadow-sm py-2">
        <i class="ti ti-download"></i>
        <span>Tải Backup JSON</span>
    </a>
</div>
```

### 2.3. Thẻ Chỉ Số Định Lượng (KPI Overview Card)
Hiển thị ở hàng trên cùng của Dashboard:

```html
<div class="col-6 col-sm-6 col-lg-3">
    <div class="card card-sm shadow-sm border-0">
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-auto">
                    <span class="avatar bg-primary-lt text-primary rounded-3">
                        <i class="ti ti-inbox fs-2"></i>
                    </span>
                </div>
                <div class="col">
                    <div class="font-weight-medium">Tổng Tin Nhắn</div>
                    <div class="text-muted small"><strong>142</strong> tin nhắn</div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 2.4. Thẻ Ứng Dụng Launchpad (Application Tile Card)
Khối đại diện cho một phân hệ ứng dụng trong Launchpad:

```html
<div class="col-6 col-md-4 col-xl-3">
    <a href="/admin/posts" class="card card-link card-link-pop h-100 border text-decoration-none p-3 shadow-sm app-tile-card">
        <div class="d-flex align-items-center gap-3 mb-2">
            <span class="avatar avatar-md bg-primary-lt text-primary rounded-3">
                <i class="ti ti-article fs-2"></i>
            </span>
            <div>
                <h4 class="m-0 fw-bold text-dark">Quản Lý Bài Viết</h4>
                <span class="badge bg-primary-lt mt-1">24 bài viết</span>
            </div>
        </div>
        <p class="text-muted small mb-0 line-clamp-2">Biên tập nội dung, tối ưu SEO, phân loại thẻ tag và kiểm duyệt bài nháp.</p>
    </a>
</div>
```

---

## 3. Bảng Dữ Liệu Quản Trị (Data Tables)

### 3.1. Cấu Trúc Bảng Chuẩn
```html
<div class="table-responsive">
    <table class="table card-table table-vcenter table-hover table-nowrap datatable">
        <thead>
            <tr>
                <th class="w-1"><input type="checkbox" class="form-check-input" id="checkAll"></th>
                <th class="w-1 d-none d-sm-table-cell">#</th>
                <th>Tiêu Đề Bài Viết</th>
                <th class="d-none d-md-table-cell">Tác Giả</th>
                <th>Trạng Thái</th>
                <th class="d-none d-lg-table-cell">Ngày Tạo</th>
                <th class="text-end">Thao Tác</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><input type="checkbox" class="form-check-input"></td>
                <td class="text-muted d-none d-sm-table-cell">1</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <span class="avatar avatar-sm rounded flex-shrink-0 bg-primary-lt"><i class="ti ti-article"></i></span>
                        <div class="text-truncate table-title-truncate" title="Tiêu đề bài viết dài...">
                            <a href="/admin/posts/1/edit" class="text-reset fw-semibold text-decoration-none">Tiêu đề bài viết dài...</a>
                            <div class="text-muted small">Tóm tắt ngắn gọn của bài viết...</div>
                        </div>
                    </div>
                </td>
                <td class="d-none d-md-table-cell text-muted">Admin</td>
                <td><span class="badge bg-green-lt">Đã xuất bản</span></td>
                <td class="d-none d-lg-table-cell text-muted">02/11/2026</td>
                <td class="text-end">
                    <!-- Action Button Group -->
                </td>
            </tr>
        </tbody>
    </table>
</div>
```

### 3.2. Cắt Ngắn Tiêu Đề Linh Hoạt (`.table-title-truncate`)
Sử dụng CSS hàm `clamp()` để tiêu đề bài viết tự động co giãn theo kích thước màn hình mà không phá vỡ bảng:
```css
.table-title-truncate {
  max-width: clamp(220px, 32vw, 500px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## 4. Hệ Thống Biểu Mẫu & Input Addon Bền Vững (Forms & Input Icons)

### 4.1. Hệ Thống `.input-icon` Chống Lỗi Giao Diện
Đây là giải pháp CSS độc quyền trong `admin.css` giúp giải quyết triệt để vấn đề:
1. Icon không đè lên văn bản hoặc placeholder.
2. Icon không bị xê dịch hay rớt dòng khi class `.is-invalid` hoặc thẻ `<div class="invalid-feedback">` xuất hiện.
3. Hoạt động ổn định với cả `input`, `select`, `textarea` nhiều dòng và `input[type="file"]`.

```html
<!-- Input có icon bên trái -->
<div class="mb-3">
    <label class="form-label fw-bold mb-1 required">Địa chỉ Email</label>
    <div class="input-icon">
        <span class="input-icon-addon"><i class="ti ti-mail"></i></span>
        <input type="email" name="email" class="form-control form-control-sm" placeholder="nhap.email@example.com" required>
        <div class="invalid-feedback">Vui lòng nhập địa chỉ email hợp lệ.</div>
    </div>
    <small class="form-hint text-muted mt-2 d-block">
        <i class="ti ti-info-circle text-primary me-1"></i> Chúng tôi cam kết bảo mật thông tin liên hệ của bạn.
    </small>
</div>

<!-- Select có icon -->
<div class="mb-3">
    <label class="form-label fw-bold mb-1">Chủ đề bài viết</label>
    <div class="input-icon">
        <span class="input-icon-addon"><i class="ti ti-category"></i></span>
        <select name="topic" class="form-select form-select-sm">
            <option value="tech">Công Nghệ</option>
            <option value="life">Cuộc Sống</option>
        </select>
    </div>
</div>
```

---

## 5. Hộp Thoại & Cảnh Báo Phá Hủy (Modals & Confirmation Dialogs)

### 5.1. Modal Xác Nhận Xóa Dữ Liệu (`#adminConfirmModal`)
Bắt buộc sử dụng cho mọi hành động xóa vĩnh viễn dữ liệu. Được kích hoạt tự động thông qua thuộc tính `data-confirm-delete` trên thẻ `<form>`.

```html
<div class="modal modal-blur fade" id="adminConfirmModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
        <div class="modal-content">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            <div class="modal-status bg-danger"></div>
            <div class="modal-body text-center py-4">
                <i class="ti ti-alert-triangle text-danger fs-1 mb-2"></i>
                <h3 id="adminConfirmModalTitle" class="fw-bold">Bạn có chắc chắn?</h3>
                <div class="text-muted" id="adminConfirmModalMessage">Thao tác này sẽ xóa vĩnh viễn bản ghi và không thể hoàn tác.</div>
            </div>
            <div class="modal-footer">
                <div class="w-100">
                    <div class="row">
                        <div class="col">
                            <button type="button" class="btn btn-outline-secondary w-100" data-bs-dismiss="modal" id="adminConfirmModalCancelBtn">
                                Hủy Bỏ
                            </button>
                        </div>
                        <div class="col">
                            <button type="button" class="btn btn-danger w-100" id="adminConfirmModalConfirmBtn">
                                Đồng Ý Xóa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 5.2. Modal Cảnh Báo Thay Đổi Chưa Lưu (`#adminUnsavedModal`)
Tự động kích hoạt khi người dùng chỉnh sửa form nhưng cố tình nhấn chuyển trang hoặc đóng tab mà chưa lưu:
- Thanh trạng thái viền vàng: `<div class="modal-status bg-warning"></div>`.
- Lựa chọn an toàn mặc định: Nút "Ở Lại Trang" được bôi đậm để tránh mất dữ liệu do sơ suất.

---

## 6. Thanh Phân Trang Hiện Đại (Modern Admin Pagination)

Nút phân trang được chuẩn hóa với kích thước hình vuông bo góc mềm mại **38px x 38px** (thu nhỏ **32px x 32px** trên mobile), hỗ trợ đầy đủ trạng thái Active với nền gradient cao cấp:

```html
<ul class="pagination admin-pagination justify-content-center m-0">
    <!-- Nút Trang trước -->
    <li class="page-item disabled" aria-disabled="true">
        <span class="page-link"><i class="ti ti-chevron-left"></i></span>
    </li>
    <!-- Trang hiện tại (Active) -->
    <li class="page-item active" aria-current="page">
        <span class="page-link">1</span>
    </li>
    <!-- Trang thường -->
    <li class="page-item">
        <a class="page-link" href="?page=2">2</a>
    </li>
    <!-- Dấu ba chấm phân tách -->
    <li class="page-item disabled">
        <span class="page-link">...</span>
    </li>
    <!-- Nút Trang kế tiếp -->
    <li class="page-item">
        <a class="page-link" href="?page=2"><i class="ti ti-chevron-right"></i></a>
    </li>
</ul>
```

---

## 7. Huy Hiệu Trạng Thái & Khối Rỗng Dữ Liệu (Badges & Empty States)

### 7.1. Huy Hiệu Trạng Thái Dịu Mắt (Light Tint Badges)
```html
<span class="badge bg-green-lt">Đã Xuất Bản</span>
<span class="badge bg-warning-lt">Bản Nháp</span>
<span class="badge bg-danger-lt">Chưa Đọc</span>
<span class="badge bg-azure-lt">Đã Trả Lời</span>
<span class="badge bg-secondary-lt">Đã Lưu Trữ</span>
<span class="badge bg-purple-lt">Nổi Bật</span>
```

### 7.2. Khối Trạng Thái Rỗng (Empty State)
Hiển thị khi kết quả tìm kiếm không có dữ liệu hoặc danh mục trống:

```html
<div class="empty py-4 text-center">
    <div class="empty-icon mb-3"><i class="ti ti-folder-off fs-1 text-muted"></i></div>
    <p class="empty-title fw-bold">Không tìm thấy dữ liệu</p>
    <p class="empty-subtitle text-muted">Thử thay đổi từ khóa hoặc điều kiện bộ lọc để tìm kiếm.</p>
    <div class="empty-action">
        <a href="/admin/posts" class="btn btn-outline-primary btn-sm">
            <i class="ti ti-rotate-clockwise me-1"></i> Đặt Lại Bộ Lọc
        </a>
    </div>
</div>
```

