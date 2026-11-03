# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 5: THƯ VIỆN ĐA PHƯƠNG TIỆN & TRÌNH SOẠN THẢO VĂN BẢN (MEDIA LIBRARY & RICH TEXT EDITOR)
> File: `docs/reports/phase-05-report.md`  
> Giai đoạn: 5  
> Ngày nghiệm thu: 2026-11-03  
> Trạng thái: **Hoàn thành**

---

## 1. Tổng quan Giai đoạn
- **Mục tiêu:** Xây dựng Media Library dạng cây phân cấp (Materialized Path `/sitecore/media library`), hỗ trợ tải lên đa tệp an toàn (quét Magic Bytes nhị phân, khử độc XML SVG), tự động nén ảnh client trước khi truyền mạng và sinh thumbnail WebP bằng thư viện Sharp; cung cấp giao diện Standalone Page (`/admin/media-library`) cùng Media Picker Modal tương tác hai chiều; tích hợp hoàn chỉnh trường `Image` và trình soạn thảo `Rich Text` (TinyMCE 6 Community Edition via CDN).
- **Tài liệu tham chiếu:** Đã phân tích đối chiếu toàn bộ 9 tài liệu từ `/docs/modules/media-editor/`, ban hành quyết định kiến trúc [`DEC-028`](../decisions/DEC-028-media-richtext-reference.md) và bảng ánh xạ [`phase-05-reference-mapping.md`](../phases/phase-05-reference-mapping.md).
- **Phạm vi hoàn thành:**
  - Cài đặt 2 thư viện đã phê duyệt: `multer@^1.4.5-lts.1` và `sharp@^0.33.5`.
  - Thiết kế kiến trúc trừu tượng `StorageProvider` (`LocalStorageProvider` lưu trữ cục bộ theo cấu trúc `storage/uploads/YYYY/MM/`, tự động sinh thumbnail `storage/thumbnails/YYYY/MM/`, bảo vệ chống path traversal).
  - Hoàn thiện model Mongoose `Media` (hỗ trợ tệp tin, thư mục, metadata kích thước, mã băm SHA-256 phát hiện trùng lặp, trường `altText` hỗ trợ đa ngôn ngữ Map `vi`/`en`).
  - Xây dựng tầng middleware an toàn: `uploadMiddleware` (Multer memory storage giới hạn 10MB) kết hợp `fileSniffer.js` kiểm tra Magic Bytes (chặn file độc đổi đuôi giả mạo) và làm sạch SVG bằng `sanitize-html`.
  - Hoàn thiện nghiệp vụ tại `mediaService`: CRUD thư mục, cây phân cấp Fancytree-ready, breadcrumbs, danh sách tài nguyên (phân trang, sắp xếp, lọc theo loại, tìm kiếm text), kiểm tra trùng lặp checksum, thay thế tệp, cập nhật metadata, di chuyển có chống vòng lặp (cycle detection), xóa mềm (soft-delete), xóa hàng loạt (bulk delete), kiểm tra liên kết sử dụng (usage check), phân quyền `canPerform`.
  - Cung cấp endpoint serving tệp tin tĩnh bảo mật `GET /media/file/:id` (`?thumb=1`) hỗ trợ HTTP Caching (`Cache-Control`, `ETag`, phản hồi 304 Not Modified).
  - Phát triển giao diện lõi 3 cột `media-browser-core.ejs` dùng chung cho cả trang quản trị độc lập `library.ejs` và cửa sổ chọn tệp `media-picker-modal.ejs`.
  - Xây dựng client-side OOP scripts: `MediaBrowser` (quản lý cây, lưới, thanh công cụ tìm kiếm debounce, inspector xem trước, upload đa tệp kèm thanh tiến trình XHR) và `MediaPicker` (cung cấp API mở modal dạng Promise `MediaPicker.open({ type, multiple, onSelect })`).
  - Xây dựng tiện ích nén ảnh client `public/js/utils/image-compressor.js` dựa trên HTML5 Canvas.
  - Tích hợp trường dữ liệu `Image`: Cập nhật `image.ejs` với nút Browse mở modal MediaPicker, xem trước thumbnail, nút Clear và hỗ trợ alt text override theo ngôn ngữ.
  - Tích hợp trình soạn thảo `Rich Text`: Nạp TinyMCE 6 Community Edition qua CDN, tùy biến plugin `media_library`, tự động nén và upload ảnh dán/kéo thả, chèn Internal Link bền vững (`data-item-id`), bảo mật phía server với `sanitizeRichText` và hàm phân giải URL `resolveRichText`.
  - Bảo đảm 100% test pass (11 suites, 95 tests, bao gồm 21 tests mới cho Media và toàn bộ 74 tests cũ của GĐ 0→4) và ESLint 0 lỗi.

---

## 2. Checklist Công việc Hoàn thành (100%)

- [x] **2.1. Phân tích, Đối chiếu & Quyết định Kiến trúc:**
  - [x] Đọc và đối chiếu toàn bộ 9 tài liệu tham chiếu tại `/docs/modules/media-editor/`.
  - [x] Ban hành `docs/decisions/DEC-028-media-richtext-reference.md`.
  - [x] Hoàn thiện bảng ánh xạ `docs/phases/phase-05-reference-mapping.md`.
  - [x] Cập nhật các câu hỏi liên quan vào `docs/open-questions.md`.
- [x] **2.2. Package & Tầng Lưu trữ (Storage Layer):**
  - [x] Cài đặt `multer@^1.4.5-lts.1` và `sharp@^0.33.5`.
  - [x] Xây dựng `src/services/storage/LocalStorageProvider.js` (quản lý thư mục, sinh thumbnail Sharp WebP tỉ lệ vuông 200x200, chống path traversal, stream tệp).
  - [x] Tạo `src/services/storage/index.js` (Adapter factory `getStorageProvider`).
- [x] **2.3. Model, Index & Seed Data:**
  - [x] Tạo `src/models/Media.js` (name, displayName, isFolder, parentId, ancestors, path, fileDetails, checksum, dimensions, altText Map đa ngôn ngữ, isDeleted).
  - [x] Thiết lập chỉ mục hiệu năng cao (path unique, parentId, ancestors, checksum, text search).
  - [x] Cập nhật `src/scripts/seed-initial-data.js` seed node gốc `/sitecore/media library`, các thư mục mẫu `banners`, `editor-uploads` và link Launchpad `/admin/media-library`.
- [x] **2.4. Bảo mật & Xác thực Tệp tin (Security & Sniffer):**
  - [x] Xây dựng `src/utils/fileSniffer.js` nhận diện Magic Bytes (JPEG, PNG, GIF, WebP, PDF) và text XML SVG.
  - [x] Xây dựng `src/middlewares/uploadMiddleware.js` (Multer memory storage 10MB, quét Magic Bytes, khử độc thẻ script trong SVG bằng `sanitize-html`).
- [x] **2.5. Tầng Nghiệp vụ (Media Service):**
  - [x] Tạo `src/services/mediaService.js` đầy đủ các hàm: `getOrCreateRootFolder`, `createFolder`, `getFolderTree`, `getBreadcrumbs`, `listAssets`, `uploadFile`, `findDuplicates`, `replaceFile`, `updateMetadata`, `moveMedia`, `renameMedia`, `deleteMedia`, `bulkDelete`, `getUsage`, `canPerform`.
  - [x] Xử lý phát hiện vòng lặp khi di chuyển thư mục cha vào thư mục con của chính nó.
- [x] **2.6. Tiện ích Rich Text:**
  - [x] Tạo `src/utils/richTextHelper.js`: `sanitizeRichText` (làm sạch XSS, giữ nguyên `data-media-id` và `data-item-id`), `resolveRichText` (phân giải URL ảnh sang `/media/file/:id` và link item sang path).
- [x] **2.7. Controller & Routes:**
  - [x] Tạo `src/controllers/admin/mediaController.js` phục vụ cả Full Page, Modal Partial HTML, JSON APIs và file streaming ETag.
  - [x] Tạo `src/routes/admin/mediaRoutes.js` (`GET /admin/media-library`, `GET /admin/media/picker`).
  - [x] Tạo `src/routes/api/mediaRoutes.js` (toàn bộ JSON APIs có kiểm tra CSRF token và upload middleware).
  - [x] Đăng ký các route trong `src/app.js` (bao gồm `GET /media/file/:id`).
- [x] **2.8. Giao diện & Client Scripts:**
  - [x] Tạo `public/js/utils/image-compressor.js` (Canvas HTML5 client-side compression).
  - [x] Tạo `public/js/admin/media-browser.js` (Lớp `MediaBrowser` quản lý UI tương tác 3 vùng, upload AJAX progress, debounce live search, hỗ trợ Rename và Replace file).
  - [x] Tạo `public/js/admin/media-picker.js` (Cầu nối toàn cục `MediaPicker.open`, hỗ trợ phím Escape, click backdrop, đồng bộ summary và nút Select ở Modal Footer).
  - [x] Tạo `public/js/admin/tinymce-config.js` (Cấu hình TinyMCE 6, custom button Media Library, kéo thả auto-upload).
  - [x] Xây dựng views: `src/views/admin/media/partials/media-browser-core.ejs`, `src/views/admin/media/library.ejs`, `src/views/admin/media/modals/media-picker-modal.ejs` (thiết kế chuẩn Bootstrap/Tabler với Header, Body, Footer Cancel/Select).
  - [x] Nâng cấp trường ảnh `src/views/content-editor/fields/image.ejs` (nút Browse mở MediaPicker, xem trước thumbnail, Clear, alt text).
  - [x] Nạp TinyMCE CDN và modal picker trong `src/views/content-editor/index.ejs`.
  - [x] Cập nhật `public/js/admin/content-editor.js` tích hợp trình xử lý Browse/Clear cho trường Image và đồng bộ `tinymce.triggerSave()`.
  - [x] Chuẩn hóa styles CSS chuyên nghiệp cho Media Library và Picker trong `public/css/components.css` (khắc phục triệt để flex height overflow, `min-height: 0`, co giãn responsive).
- [x] **2.9. Kiểm thử & Đo kiểm:**
  - [x] Viết `tests/mediaService.test.js` (10/10 passed).
  - [x] Viết `tests/mediaApi.test.js` (8/8 passed).
  - [x] Viết `tests/richTextHelper.test.js` (3/3 passed).
  - [x] Kiểm thử toàn bộ hệ thống (`npm test`): 11/11 suites, 95/95 tests pass.
  - [x] Kiểm tra linting (`npm run lint`): 0 errors, 0 warnings.
  - [x] Cập nhật tiến độ `docs/phases/README.md`, data model `docs/data-model/media.md`, rules bảo mật và định tuyến.

---

## 3. Bằng chứng Kiểm thử & Đo kiểm (DoD Verification)

### 3.1. Kết quả Toàn bộ Test Suite (`npm test`)
```text
PASS tests/richTextHelper.test.js
PASS tests/mediaService.test.js
PASS tests/mediaApi.test.js
PASS tests/versionApi.test.js
PASS tests/versionService.test.js
PASS tests/templateInheritance.test.js
PASS tests/templateService.test.js
PASS tests/itemService.test.js
PASS tests/auth.test.js
PASS tests/api.test.js
PASS tests/smoke.test.js

Test Suites: 11 passed, 11 total
Tests:       95 passed, 95 total
Snapshots:   0 total
Time:        4.843 s
Ran all test suites.
```

### 3.2. Kết quả Linting Codebase (`npm run lint`)
```text
$ npm run lint
> admin-cms@1.0.0 lint
> eslint .
(0 errors, 0 warnings)
```

### 3.3. Đo kiểm Bảo mật & Hành vi Hệ thống
- **Chặn tệp tin giả mạo đuôi (Magic Bytes Verification):**
  - Tải lên tệp `fake.jpg` với nội dung text giả định mã thực thi `MZ...` bị middleware `uploadMiddleware` từ chối ngay lập tức với mã lỗi HTTP 400 (`Invalid file signature / Magic bytes mismatch`).
- **Khử độc SVG (SVG Sanitization):**
  - Tải lên tệp vector SVG chứa `<script>alert('XSS')</script>` và `<rect onclick="...">`: Toàn bộ mã script và event handler bị `sanitize-html` bóc tách triệt để trước khi lưu trữ vào đĩa.
- **Chống duyệt thư mục (Path Traversal Guard):**
  - Thử nghiệm truy cập `storagePath` với chuỗi `../../etc/passwd` bị `LocalStorageProvider` phát hiện và ném lỗi truy cập bất hợp pháp.
- **Hiệu năng Caching (HTTP ETag & 304 Not Modified):**
  - Lần 1: `GET /media/file/:id` trả về HTTP 200 kèm `ETag: "..."` và `Cache-Control: public, max-age=86400`.
  - Lần 2: `GET /media/file/:id` kèm header `If-None-Match` trả về HTTP 304 Not Modified không tốn băng thông truyền file.

---

## 4. Quyết định Kỹ thuật Phát sinh

1. **[`DEC-028: Áp dụng và Điều chỉnh Tài liệu Tham chiếu Media Library & Rich Text Editor`](../decisions/DEC-028-media-richtext-reference.md):**
   - **Lưu trữ Cục bộ có Trừu tượng hóa:** Thay vì chỉ hỗ trợ Cloudinary như project tham chiếu, hệ thống xây dựng interface `StorageProvider` với cài đặt mặc định `LocalStorageProvider` và thư viện xử lý ảnh hàng đầu `sharp`, sẵn sàng cắm Cloudinary/S3 qua biến môi trường mà không cần sửa code nghiệp vụ.
   - **Bảo mật Tệp nghiêm ngặt:** Bổ sung cơ chế Magic Bytes nhị phân cho 5 định dạng phổ biến và SVG Sanitizer cho ảnh vector.
   - **Mô hình Dữ liệu MongoDB Độc lập:** Thay vì phụ thuộc vào Search API của nhà cung cấp bên ngoài để lấy danh sách tệp/thư mục, hệ thống quản lý trọn vẹn cây thư mục và metadata trong MongoDB Collection `media` với Materialized Path `/sitecore/media library`.
   - **Liên kết Bền vững trong Rich Text:** Sử dụng thuộc tính `data-media-id` và `data-item-id` trong thẻ `<img>` và `<a>`, hỗ trợ hàm `resolveRichText` giải quyết URL thời gian thực, ngăn ngừa triệt để lỗi gãy liên kết (broken links) khi item hoặc file media được đổi tên hoặc di chuyển thư mục.

---

## 5. Hướng dẫn cho Phiên Tiếp theo (Ready for Phase 6)

- Hệ thống đã hoàn tất trọn vẹn Giai đoạn 5 và ở trạng thái ổn định tuyệt đối:
  - Trường `Image` và `Rich Text` đã sẵn sàng hoạt động trong Content Editor.
  - Cửa sổ `MediaPicker` độc lập sẵn sàng được tái sử dụng cho cấu hình Datasource và Rendering Parameters của Presentation trong GĐ 6.
  - Cấu hình phân giải `resolveRichText` sẵn sàng tích hợp vào Headless Delivery API / Layout Service.
- **Lệnh phê duyệt giai đoạn tiếp theo:**
  ```text
  APPROVE GĐ 6
  ```
  *(Lưu ý: Tuyệt đối không code trước khi nhận được lệnh này từ người dùng).*

