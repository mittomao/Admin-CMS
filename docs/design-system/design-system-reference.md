# Tài Liệu Tham Chiếu Chuẩn Hệ Thống Thiết Kế (Design System AI Reference)

> [!IMPORTANT]
> **Dành Cho AI Coding Agents & Kỹ Sư Phát Triển**:
> Đây là tài liệu tóm tắt cô đọng nhất (Cheat-Sheet / System Prompt Friendly). Khi nhận tác vụ thiết kế hoặc sinh mã nguồn giao diện CMS Admin trong bất kỳ dự án nào, Agent chỉ cần đọc và tuân thủ nghiêm ngặt các quy tắc trong tài liệu này để đảm bảo độ đồng nhất 100%.

---

## 1. Mô Hình Khái Niệm Cốt Lõi (Mental Model)

1. **Nền tảng**: Tabler UI (`@tabler/core@1.0.0-beta20`) + Bootstrap 5 Engine + Tabler Icons (`@tabler/icons-webfont@2.47.0`) + Font Inter.
2. **Kiến trúc**: Multi-Page Application (MPA) / Server-Side Rendering (SSR) thân thiện, không ràng buộc React/Vue, không cần build pipeline.
3. **Mật độ thông tin**: Gọn gàng, thanh thoát (`form-control-sm`, `form-select-sm`, `btn-sm`, `py-2`, `gap-2`).
4. **Phân cấp thẻ**: Thẻ cấp 1 (`card shadow-sm border-0 mb-4`) bọc ngoài &rarr; Thẻ cấp 2 (`bg-light border-0`) bên trong.
5. **Màu sắc ngữ nghĩa**: Luôn ưu tiên biến thể màu nhạt dịu mắt (`-lt`) cho badges và avatar icons.

---

## 2. Danh Sách Quy Tắc Bất Biến (Strict Design Invariants)

Khi sinh mã HTML/CSS, Agent **bắt buộc tuân thủ 10 quy tắc sau**:

1. **Card Khung Cấp 1**: Luôn dùng class `card shadow-sm border-0 mb-4`.
2. **Card Header**: Bắt buộc có `card-header border-bottom d-flex align-items-center gap-2`.
   - Có icon chủ đề cỡ `fs-3` mang màu ngữ nghĩa (`text-primary`, `text-purple`, `text-success`...).
   - Cụm tiêu đề gồm **2 dòng**: `<h3 class="card-title fw-bold m-0">Tiêu Đề (English Key)</h3>` và phụ đề `<div class="text-muted small">Mô tả ngắn gọn mục đích</div>`.
3. **Input với Icon**: Mọi `<input>` hoặc `<select>` bắt buộc bọc trong `.input-icon`:
   - Phải có `<span class="input-icon-addon"><i class="ti ti-[name]"></i></span>`.
   - Phải có `<div class="invalid-feedback"></div>` phía dưới để hiển thị lỗi validation.
4. **Nút Bấm & Biểu Tượng**: Nút bấm luôn có icon đi kèm nhãn (`btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-2`).
5. **Thao Tác Xóa & Phá Hủy**: Tuyệt đối không xóa trực tiếp. Form xóa bắt buộc có thuộc tính `data-confirm-delete="Lời cảnh báo xác nhận?"` để kích hoạt `#adminConfirmModal`.
6. **Form GET Lọc/Tìm Kiếm**: Bắt buộc thêm `data-no-validate="true"` để không bị chặn bởi form validator client.
7. **Bảng Dữ Liệu**: Dùng class `table card-table table-vcenter table-hover table-nowrap datatable`.
   - Tiêu đề cột `th` in hoa nhẹ, màu xám nhạt `var(--tblr-muted)`.
   - Cột tiêu đề dùng `.table-title-truncate` để co giãn theo `clamp(220px, 32vw, 500px)`.
8. **Huy Hiệu Trạng Thái**: Sử dụng huy hiệu nhạt Tabler: `bg-green-lt`, `bg-warning-lt`, `bg-danger-lt`, `bg-azure-lt`, `bg-purple-lt`.
9. **Phân Trang**: Dùng class `.pagination.admin-pagination`, nút vuông bo góc `8px`, kích thước chuẩn `38px x 38px` (thu nhỏ `32px x 32px` trên mobile). Trang active có nền gradient tím-xanh.
10. **Theme Switcher**: Hỗ trợ Dark/Light mode qua thuộc tính `data-bs-theme="light|dark"` trên thẻ `<html>` và script inline chống chớp màn hình (FOUC).

---

## 3. Ma Trận Design Tokens Nhanh (Cheat-Sheet Matrix)

```css
/* Color Palette */
--tblr-primary: #206bc4;      /* Solid Brand Action */
--tblr-success: #2fb344;      /* Published / CSV Export */
--tblr-warning: #f59f00;      /* Draft / Restore JSON / Warning */
--tblr-danger:  #d63939;      /* Delete / Trash / Errors */
--tblr-azure:   #4299e1;      /* Messages / Media / General Stats */
--tblr-purple:  #ae3ec9;      /* Subscribers / Community / Tags */
--tblr-teal:    #0ca678;      /* Analytics / Traffic / Uptime */

/* Surfaces & Borders */
Light Theme: Surface=#ffffff | Surface2=#f1f5f9 | Border=#e2e8f0 | Text=#1e293b | Muted=#64748b
Dark Theme:  Surface=#1e293b | Surface2=#172033 | Border=#334155 | Text=#e2e8f0 | Muted=#94a3b8

/* Typography (Google Font Inter) */
Heading: 700 bold | Label: 600 semibold | Body: 400/500 | Table Th: 700 uppercase 11px
Sizes: fs-1=24px, fs-2=20px, fs-3=18px, base=14px, sm=13px, micro=11px

/* Spacing & Radii */
Spacing: g-1=4px, g-2=8px, g-3=16px, g-4=24px | Container: container-xl (max 1320px)
Radius: Controls=6px, Cards/Tiles=8px, Modals=12px, Avatars=rounded-3 (8px) / rounded-circle (50%)
Shadows: shadow-sm (default cards), shadow-md (hover elevation translateY(-2px))
```

---

## 4. Thư Viện Code Mẫu Chuẩn (Ready-to-Use Snippets)

### 4.1. Thẻ Cấp 1 & Thẻ Cấp 2 (Main Card & Action Sub-card)
```html
<div class="card shadow-sm border-0 mb-4">
    <div class="card-header border-bottom d-flex align-items-center gap-2">
        <i class="ti ti-settings text-primary fs-3"></i>
        <div>
            <h3 class="card-title fw-bold m-0">Cấu Hình Tính Năng (Feature Config)</h3>
            <div class="text-muted small">Tùy chỉnh thông số vận hành cho tính năng này</div>
        </div>
        <div class="ms-auto">
            <span class="badge bg-primary-lt">Active</span>
        </div>
    </div>
    <div class="card-body">
        <div class="row g-3">
            <div class="col-12 col-md-6">
                <div class="card card-body bg-light border-0 h-100 d-flex flex-column justify-content-between p-3">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <i class="ti ti-database text-blue fs-3"></i>
                            <h4 class="m-0 fw-bold">Sao Lưu</h4>
                        </div>
                        <p class="text-muted small mb-3">Xuất dữ liệu an toàn ra tệp JSON.</p>
                    </div>
                    <a href="/admin/export" class="btn btn-primary btn-sm w-100 shadow-sm py-2">
                        <i class="ti ti-download me-1"></i> Tải Về
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 4.2. Thẻ Chỉ Số Tổng Quan (KPI Card)
```html
<div class="col-6 col-sm-6 col-lg-3">
    <div class="card card-sm shadow-sm border-0">
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-auto">
                    <span class="avatar bg-primary-lt text-primary rounded-3">
                        <i class="ti ti-article fs-2"></i>
                    </span>
                </div>
                <div class="col">
                    <div class="font-weight-medium">Tổng Bài Viết</div>
                    <div class="text-muted small"><strong>24</strong> bài</div>
                </div>
            </div>
        </div>
    </div>
</div>
```

### 4.3. Ô Nhập Liệu Chuẩn Bền Vững (Input with Icon Addon & Validation)
```html
<div class="mb-3">
    <label class="form-label fw-bold mb-1 required">Tiêu Đề Bài Viết</label>
    <div class="input-icon">
        <span class="input-icon-addon"><i class="ti ti-pencil"></i></span>
        <input type="text" name="title" class="form-control form-control-sm" placeholder="Nhập tiêu đề..." required>
        <div class="invalid-feedback">Vui lòng không để trống tiêu đề.</div>
    </div>
    <small class="form-hint text-muted mt-2 d-block">
        <i class="ti ti-info-circle text-primary me-1"></i> Tiêu đề nên chứa từ khóa SEO chính.
    </small>
</div>
```

### 4.4. Hàng Nút Thao Tác Bảng (Action Buttons with DELETE Form)
```html
<div class="btn-group btn-group-sm">
    <a href="/admin/items/1/edit" class="btn btn-outline-secondary" title="Sửa"><i class="ti ti-edit"></i></a>
    <form action="/admin/items/1" method="post" class="d-inline" data-confirm-delete="Bạn có chắc chắn muốn xóa mục này?">
        <input type="hidden" name="_method" value="DELETE">
        <button type="submit" class="btn btn-outline-danger" title="Xóa"><i class="ti ti-trash"></i></button>
    </form>
</div>
```

### 4.5. Thanh Phân Trang Hiện Đại (Pagination Bar)
```html
<div class="card-footer d-flex align-items-center justify-content-between">
    <p class="m-0 text-muted small">Hiển thị 1 đến 10 kết quả</p>
    <ul class="pagination admin-pagination m-0">
        <li class="page-item disabled"><span class="page-link"><i class="ti ti-chevron-left"></i></span></li>
        <li class="page-item active"><span class="page-link">1</span></li>
        <li class="page-item"><a class="page-link" href="?page=2">2</a></li>
        <li class="page-item"><a class="page-link" href="?page=2"><i class="ti ti-chevron-right"></i></a></li>
    </ul>
</div>
```

---

## 5. Các Lỗi Thường Gặp Cần Tuyệt Đối Tránh (Anti-Patterns)

| Lỗi sai thường gặp | Hậu quả | Cách khắc phục chuẩn mực |
| :--- | :--- | :--- |
| Dùng `btn` không có icon đi kèm | Giao diện thô cứng, thiếu affordance trực quan | Luôn thêm `<i class="ti ti-[icon]"></i>` trước chữ |
| Dùng `window.confirm()` trình duyệt | Giao diện xấu, chặn luồng UI, không hỗ trợ bàn phím | Dùng thuộc tính `data-confirm-delete` kích hoạt `#adminConfirmModal` |
| Dùng badge đậm `bg-primary` cho trạng thái | Gây chói mắt, khó đọc khi có nhiều dòng bảng | Dùng biến thể nhạt `-lt` (`bg-primary-lt`, `bg-green-lt`...) |
| Form GET tìm kiếm không có `data-no-validate` | Bị script validator chặn khi submit tìm kiếm rỗng | Thêm `data-no-validate="true"` vào thẻ `<form>` |
| Không bọc input trong `.input-icon` | Thiếu tính nhất quán visual với toàn bộ hệ thống | Luôn bọc trong `.input-icon` kèm `.input-icon-addon` |
| Quên `<div class="invalid-feedback">` | Script form validator không có chỗ hiển thị thông báo lỗi | Bố trí sẵn thẻ rỗng phía dưới input |

