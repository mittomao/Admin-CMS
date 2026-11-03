# Hướng Dẫn Tích Hợp Vào Dự Án Mới (Implementation Guide)

Tài liệu này cung cấp hướng dẫn từng bước (Step-by-step) để kỹ sư phát triển hoặc AI Agent có thể tích hợp toàn bộ Design System này vào một **dự án hoàn toàn mới** trong vòng 5 phút mà không gặp bất kỳ lỗi xung đột hay thiếu hụt phụ thuộc nào.

---

## 1. Yêu Cầu Cài Đặt & Thư Viện Cốt Lõi (Prerequisites)

Hệ thống hoạt động theo nguyên tắc **Zero Build Toolchain Required** — không bắt buộc cài đặt Webpack hay Vite, có thể tích hợp trực tiếp qua CDN hoặc tải tệp tĩnh về thư mục `public/`.

### 1.1. Các Thư Viện Cần Nạp Trong Thẻ `<head>`
```html
<!-- 1. Google Font Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- 2. Tabler Core CSS & Tabler Icons Webfont -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/css/tabler.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css">

<!-- 3. Tùy Chọn: Select2 & Bootstrap 5 Theme -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.6-rc.0/css/select2.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2-bootstrap-5-theme@1.3.0/dist/select2-bootstrap-5-theme.min.css">

<!-- 4. Tệp CSS Mở Rộng Của Design System -->
<link rel="stylesheet" href="/css/admin.css">
```

### 1.2. Thư Viện JavaScript Nạp Trước Thẻ Đóng `</body>`
```html
<!-- Tabler Core JS (Bao gồm Bootstrap 5 Bundle: Popper + Modal + Toast + Dropdown) -->
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/js/tabler.min.js"></script>

<!-- Tùy Chọn: jQuery & Select2 (nếu có dùng Multi-select) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.6-rc.0/js/select2.min.js"></script>

<!-- JS Controller Quản Trị Hệ Thống -->
<script type="module" src="/js/admin.js"></script>
```

---

## 2. Tổ Chức Thư Mục Mã Nguồn Đề Xuất (Recommended File Structure)

Trong dự án mới, cấu trúc tệp tin tĩnh và template nên được sắp xếp khoa học như sau:

```text
project-root/
│
├── public/
│   ├── css/
│   │   └── admin.css            # Sao chép tệp CSS mở rộng của hệ thống
│   └── js/
│       ├── admin.js             # Entrypoint chính khởi tạo các module
│       └── admin/
│           ├── form-validator.js# Động cơ kiểm tra form, toast và modal xác nhận
│           ├── sidebar.js       # Quản lý toggle mini sidebar (nếu dùng menu dọc)
│           └── utils.js         # Nén ảnh canvas, highlight cú pháp
│
└── views/ (hoặc templates/)
    └── admin/
        ├── layouts/
        │   └── admin-layout.ejs # Khung Master Layout chứa header, modals, toasts
        ├── partials/
        │   ├── meta.ejs         # Chứa CDN CSS và engine theme chống FOUC
        │   ├── header.ejs       # Topbar điều hướng thống nhất
        │   └── block-script.ejs # CDN scripts và theme toggle handler
        └── pages/
            ├── dashboard.ejs    # Màn hình chỉ huy Launchpad
            └── ...              # Các màn hình CRUD chức năng
```

---

## 3. Khung Master HTML Hoàn Chỉnh (Production Master Template)

Dưới đây là mã nguồn khung chuẩn của `admin-layout.ejs` sẵn sàng copy vào dự án mới:

```html
<!DOCTYPE html>
<html lang="vi" data-bs-theme="light">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>Hệ Thống Quản Trị CMS</title>

    <!-- Động cơ Theme chống chớp nháy giao diện (FOUC Engine) -->
    <script>
        (function () {
            var theme = localStorage.getItem('tablerTheme');
            if (!theme) {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.setAttribute('data-bs-theme', theme);
        })();
    </script>

    <!-- CSS CDN Libraries -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/css/tabler.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css">
    <link rel="stylesheet" href="/css/admin.css">
</head>

<body class="layout-fluid">
    <div class="page">
        <div class="page-wrapper">
            <!-- 1. Thanh Topbar Header Thống Nhất -->
            <header class="navbar navbar-expand-lg d-print-none border-bottom sticky-top bg-body shadow-sm">
                <div class="container-xl">
                    <div class="d-flex align-items-center gap-2 me-auto">
                        <a href="/admin/dashboard" class="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
                            <i class="ti ti-layout-grid text-primary fs-1"></i>
                            <span class="fw-bold fs-2 text-heading">CMS Admin</span>
                        </a>
                    </div>
                    <div class="navbar-nav flex-row align-items-center gap-2">
                        <!-- Nút đổi theme Sáng/Tối -->
                        <a href="javascript:void(0);" class="nav-link px-2 text-muted" data-theme-toggle title="Đổi giao diện Sáng / Tối">
                            <i class="ti ti-sun theme-icon-sun fs-2"></i>
                            <i class="ti ti-moon theme-icon-moon fs-2"></i>
                        </a>
                    </div>
                </div>
            </header>

            <!-- 2. Nội dung trang thay đổi động -->
            <div class="page-body">
                <div class="container-xl">
                    <!-- Dynamic Page Content Goes Here -->
                </div>
            </div>
        </div>
    </div>

    <!-- 3. Khung chứa Thông Báo Toast Toàn Cục -->
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1090;" id="adminToastContainer" aria-live="polite" aria-atomic="true"></div>

    <!-- 4. Modal Xác Nhận Xóa Dữ Liệu An Toàn -->
    <div class="modal modal-blur fade" id="adminConfirmModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
            <div class="modal-content">
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                <div class="modal-status bg-danger"></div>
                <div class="modal-body text-center py-4">
                    <i class="ti ti-alert-triangle text-danger fs-1 mb-2"></i>
                    <h3 id="adminConfirmModalTitle" class="fw-bold">Bạn có chắc chắn?</h3>
                    <div class="text-muted" id="adminConfirmModalMessage">Thao tác này không thể hoàn tác.</div>
                </div>
                <div class="modal-footer">
                    <div class="w-100">
                        <div class="row">
                            <div class="col">
                                <button type="button" class="btn btn-outline-secondary w-100" data-bs-dismiss="modal" id="adminConfirmModalCancelBtn">Hủy Bỏ</button>
                            </div>
                            <div class="col">
                                <button type="button" class="btn btn-danger w-100" id="adminConfirmModalConfirmBtn">Đồng Ý Xóa</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 5. Scripts Khởi Động -->
    <script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/js/tabler.min.js"></script>
    <script type="module" src="/js/admin.js"></script>
</body>
</html>
```

---

## 4. Mẫu Trang Quản Trị Chuẩn Vàng (Golden Standard Page Template)

Dưới đây là mã nguồn mẫu mực của một trang danh sách quản lý hoàn chỉnh với đầy đủ: KPI Overview, Thanh công cụ lọc/tìm kiếm, Bảng dữ liệu có highlight dòng và Thanh phân trang.

```html
<div class="page-wrapper">
    <!-- Header nội dung trang -->
    <div class="page-body">
        <div class="container-xl">
            <!-- 1. Hàng Thẻ Chỉ Số KPI -->
            <div class="row row-cards mb-4">
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
            </div>

            <!-- 2. Thẻ Quản Trị Chính (Cấp 1) -->
            <div class="card shadow-sm border-0 mb-4">
                <div class="card-header border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <i class="ti ti-news text-primary fs-3"></i>
                        <div>
                            <h3 class="card-title fw-bold m-0">Quản Lý Bài Viết (Articles)</h3>
                            <div class="text-muted small">Danh sách các bài viết, tìm kiếm và phân loại</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <a href="/admin/posts/new" class="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 shadow-sm px-3 py-2">
                            <i class="ti ti-plus"></i>
                            <span>Tạo Mới</span>
                        </a>
                    </div>
                </div>

                <!-- Thanh công cụ tìm kiếm và lọc -->
                <div class="card-body border-bottom bg-light py-3">
                    <form method="get" action="/admin/posts" data-no-validate="true">
                        <div class="row g-2 align-items-center">
                            <div class="col-12 col-md-4">
                                <div class="input-icon">
                                    <span class="input-icon-addon"><i class="ti ti-search"></i></span>
                                    <input type="text" name="q" class="form-control form-control-sm" placeholder="Tìm kiếm tiêu đề...">
                                </div>
                            </div>
                            <div class="col-6 col-md-3">
                                <select name="status" class="form-select form-select-sm">
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="published">Đã xuất bản</option>
                                    <option value="draft">Bản nháp</option>
                                </select>
                            </div>
                            <div class="col-auto ms-auto">
                                <button type="submit" class="btn btn-primary btn-sm px-3">
                                    <i class="ti ti-filter"></i> Lọc
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Bảng dữ liệu -->
                <div class="table-responsive">
                    <table class="table card-table table-vcenter table-hover table-nowrap datatable">
                        <thead>
                            <tr>
                                <th class="w-1">#</th>
                                <th>Tiêu Đề</th>
                                <th>Trạng Thái</th>
                                <th class="text-end">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-muted">1</td>
                                <td>
                                    <div class="fw-semibold">Tiêu đề bài viết mẫu</div>
                                </td>
                                <td><span class="badge bg-green-lt">Đã xuất bản</span></td>
                                <td class="text-end">
                                    <div class="btn-group btn-group-sm">
                                        <a href="/admin/posts/1/edit" class="btn btn-outline-secondary" title="Chỉnh sửa"><i class="ti ti-edit"></i></a>
                                        <form action="/admin/posts/1" method="post" class="d-inline" data-confirm-delete="Bạn có chắc muốn xóa bài này?">
                                            <input type="hidden" name="_method" value="DELETE">
                                            <button type="submit" class="btn btn-outline-danger" title="Xóa"><i class="ti ti-trash"></i></button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Chân trang phân trang -->
                <div class="card-footer d-flex align-items-center justify-content-between">
                    <p class="m-0 text-muted small">Hiển thị 1 đến 10 trong 24 kết quả</p>
                    <ul class="pagination admin-pagination m-0">
                        <li class="page-item disabled"><span class="page-link"><i class="ti ti-chevron-left"></i></span></li>
                        <li class="page-item active"><span class="page-link">1</span></li>
                        <li class="page-item"><a class="page-link" href="?page=2">2</a></li>
                        <li class="page-item"><a class="page-link" href="?page=2"><i class="ti ti-chevron-right"></i></a></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
```

