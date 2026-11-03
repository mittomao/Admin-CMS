# Technical Dependencies & Configuration – Thư Viện & Cấu Hình Kỹ Thuật

Tài liệu này tổng hợp toàn bộ các phụ thuộc phần mềm (dependencies), phiên bản runtime, thư viện CDN phía client, danh mục biến môi trường và cấu trúc tệp tin liên quan trực tiếp đến hai module Media Library và Rich Text Editor.

---

## 1. Yêu Cầu Runtime & Môi Trường Chạy (System Requirements)

- **Node.js**: Phiên bản **`18.x`** (theo cấu hình `"engines": { "node": "18.x" }` trong `package.json`).
- **NPM**: Phiên bản `8.x` hoặc `9.x+`.
- **Cơ sở dữ liệu**: MongoDB `5.x` hoặc `6.x+`.
- **Trình duyệt Client**: Các trình duyệt hiện đại hỗ trợ ES6 Modules, Fetch API, HTML5 Canvas và CSS Grid/Flexbox (Chrome, Firefox, Safari, Edge phiên bản mới).

---

## 2. Danh Mục Gói Phụ Thuộc Backend (NPM Dependencies)

Bảng dưới đây phân loại chi tiết các gói npm đang có trong dự án gốc và trạng thái khuyến nghị khi mang sang dự án mới:

| Tên Package | Phiên bản gốc | Mục đích sử dụng | Khuyến nghị cho Dự án Mới |
| :--- | :--- | :--- | :--- |
| `cloudinary` | `^1.41.0` | SDK Cloudinary v2, gọi Search API, Folder API, Resource API | **Bắt buộc** (nếu dùng Cloudinary) |
| `multer` | `^1.4.5-lts.1` | Middleware xử lý multipart/form-data upload | **Bắt buộc** |
| `multer-storage-cloudinary` | `^4.0.0` | Storage engine nối Multer trực tiếp với Cloudinary | **Bắt buộc** (nếu dùng Cloudinary) |
| `express` | `^4.18.2` | Framework Web máy chủ | **Bắt buộc** |
| `express-session` | `^1.17.3` | Quản lý phiên đăng nhập admin bảo vệ route media | **Bắt buộc** |
| `dotenv` | `^16.0.3` | Đọc biến môi trường từ tệp `.env` | **Bắt buộc** |
| `mongoose` | `^5.9.9` | ODM thao tác MongoDB lưu bài viết (`blogModel`) | Tùy chọn (khuyến nghị nâng lên Mongoose 7.x/8.x) |
| `@flmngr/flmngr-server-node-express`| `^1.5.1` | Server binding cho file manager cũ | **LOẠI BỎ (DEPRECATED)** – Không cần cài đặt ở dự án mới! |

---

## 3. Danh Mục Thư Viện Frontend (Client CDN & Styles)

Trong view layout `views/admin/layouts/admin-layout.ejs` và partial `views/admin/partials/block-script.ejs`, các thư viện sau được tải qua CDN:

```html
<!-- 1. jQuery Core (3.7.1) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js" 
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" 
        crossorigin="anonymous"></script>

<!-- 2. Tabler Core UI (Bootstrap 5 Bundle) -->
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta20/dist/js/tabler.min.js"></script>

<!-- 3. Tabler Icons (Webfont) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">

<!-- 4. TinyMCE 6.3 Rich Text Editor -->
<script src="https://flmngr.com/js-demo/tinymce-6.3/tinymce.min.js"></script>
```

> [!TIP]
> **Thay Thế TinyMCE CDN Cho Dự Án Mới**:
> Thay vì dùng link demo `flmngr.com`, dự án mới nên dùng CDN chính thống của TinyMCE 6 Community Edition:
> ```html
> <script src="https://cdn.jsdelivr.net/npm/tinymce@6.8.3/tinymce.min.js"></script>
> ```
> Hoặc cài đặt qua npm: `npm install tinymce@^6.8.3` để tự host file tĩnh nội bộ.

---

## 4. Danh Mục Biến Môi Trường (Environment Variables Specification)

Dưới đây là mẫu cấu hình biến môi trường chuẩn không chứa thông tin nhạy cảm (dựa theo `env.example`):

```bash
# ==============================================================================
# 1. ỨNG DỤNG MÁY CHỦ (APP SERVER)
# ==============================================================================
PORT=9000
NODE_ENV=development
SESSION_SECRET=your_super_secret_session_key_minimum_32_characters

# ==============================================================================
# 2. LƯU TRỮ ĐA PHƯƠNG TIỆN CLOUDINARY (MEDIA STORAGE)
# ==============================================================================
# Tên Cloud tài khoản Cloudinary của bạn
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name

# API Key công khai từ Cloudinary Dashboard
CLOUDINARY_API_KEY=your_cloudinary_api_key

# API Secret bảo mật (BẮT BUỘC GIỮ BÍ MẬT, KHÔNG ĐƯA VÀO GIT)
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Thư mục gốc trên Cloudinary để nhóm toàn bộ media của ứng dụng (ví dụ: Blog, CMS, MediaApp)
CLOUDINARY_API_FOLDER=Blog

# ==============================================================================
# 3. BIẾN DI SẢN (LEGACY - BỎ QUA Ở DỰ ÁN MỚI)
# ==============================================================================
# FLMNGR_KEY= (Không cần thiết lập)
```

---

## 5. Bản Đồ Thành Phần Mã Nguồn (Code Mapping Inventory)

Bảng tổng hợp vị trí các khối mã nguồn tương ứng cần trích xuất:

### 5.1. Tầng Backend
- **Storage Service Engine**:
  - `utils/cloudinary.js`: Chứa hàm nạp cấu hình, cấu hình Multer `CloudinaryStorage`, các hàm API: `getSubFolders`, `createFolder`, `deleteFolder`, `getMediaAssets`, `deleteResources`, `getAllResources`.
- **Upload Route Middleware**:
  - `routes/index.js` (dòng 22-33): Middleware `handleUpload` (sử dụng `upload.any()` để hỗ trợ cả upload đơn lẫn nhiều file đồng thời).
- **Controller Endpoints**:
  - `controllers/indexController.js` (dòng 1072-1305):
    - `viewUpload`: Render view media độc lập.
    - `getMediaFolders`: API lấy danh sách folder.
    - `createMediaFolder`: API tạo folder.
    - `deleteMediaFolder`: API xóa folder.
    - `getMediaAssets`: API tìm kiếm, lọc và phân trang ảnh.
    - `uploadImage`: API tiếp nhận upload và chuẩn hóa response JSON.
    - `deleteMediaAssets`: API xóa ảnh đơn hoặc xóa hàng loạt.

### 5.2. Tầng Frontend
- **SPA Media Component**:
  - `public/js/admin/media-browser.js`: Lớp `MediaBrowser` (1027 dòng) xử lý toàn bộ logic cây thư mục, lưới ảnh, kéo thả, nén ảnh client, inspector, bulk mode và callbacks.
- **Editor Module**:
  - `public/js/admin/tinymce.js`: Cấu hình khởi tạo TinyMCE 6, đăng ký button `cloudinary_media`, `file_picker_callback`, và `images_upload_handler`.
- **Client Utilities**:
  - `public/js/admin/utils.js`: Chứa hàm nén ảnh `compressImageClient(file, maxWidth, maxHeight, quality)`.
- **Modal Bridge**:
  - `public/js/admin/media-modal.js`: Cung cấp các hàm xuất `showMediaBrowserModal`, `hideMediaBrowserModal`, `setMediaPickerCallback`.
- **Templates / Views**:
  - `views/admin/partials/media-browser-core.ejs`: Giao diện lõi của Media Browser.
  - `views/admin/partials/cloudinary-modal.ejs`: Modal bọc giao diện lõi.
  - `views/admin/pages/upload.ejs`: Trang quản lý media độc lập.

---

## 6. Các Phụ Thuộc Tối Thiểu Để Mang Sang Dự Án Mới (Minimal Viable Bundle)

Khi bạn muốn chuyển module này sang một dự án mới hoàn toàn (ví dụ: Next.js, NestJS, Laravel hoặc một Express app sạch), bạn chỉ cần mang theo **4 khối cốt lõi**:

1. **Khối 1 (Backend Storage)**: File `utils/cloudinary.js` (cần cài `cloudinary`, `multer`, `multer-storage-cloudinary`).
2. **Khối 2 (Backend Routes)**: 6 RESTful API endpoints trong `controllers/mediaController.js`.
3. **Khối 3 (Frontend Media Engine)**: File `media-browser.js` và template HTML `media-browser-core.ejs`.
4. **Khối 4 (Frontend Editor)**: File `tinymce.js` kết hợp thư viện TinyMCE 6.x.

