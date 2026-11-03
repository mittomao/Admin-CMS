---
phase: 5
name: Media Library & Rich Text Editor (Quản lý Tài nguyên Số & Trình soạn thảo văn bản)
status: Hoàn thành
depends_on: [2, 3, 4]
estimate: 3.0 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
updated: 2026-11-03
---

# GĐ 5 - Media Library & Rich Text Editor (Quản lý Tài nguyên Số & Trình soạn thảo văn bản)
> Ứng dụng Media Library phân cấp cây thư mục, upload ảnh/file đa tệp, Sharp thumbnail, cửa sổ chọn Media Picker modal, và Rich Text Editor (TinyMCE 6) tích hợp sâu vào Content Editor theo tài liệu tham chiếu `/docs/modules/media-editor/`.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/media.md`](../data-model/media.md)
- [`docs/modules/media-editor/`](../modules/media-editor/) (Toàn bộ 9 tài liệu đặc tả kiến trúc tham chiếu)
- [`docs/phases/phase-05-reference-mapping.md`](./phase-05-reference-mapping.md) (Bản đối chiếu kiến trúc và kế hoạch kế thừa chi tiết)
- [`docs/decisions/DEC-028-media-richtext-reference.md`](../decisions/DEC-028-media-richtext-reference.md)

## Mục tiêu
Xây dựng ứng dụng Media Library quản lý tài nguyên số (hình ảnh, tài liệu) dạng cây thư mục Sitecore, hỗ trợ upload nhiều tệp tin, nén ảnh client bằng Canvas, tự động tạo ảnh thu nhỏ (thumbnail) bằng Sharp, cung cấp cửa sổ Media Picker tích hợp liền mạch vào các field kiểu Image trong Content Editor, và tích hợp Rich Text Editor (TinyMCE 6) hỗ trợ chèn ảnh, liên kết nội bộ, tự động upload khi paste/kéo thả, làm sạch mã độc tại server và sẵn sàng cho Headless Layout Service.

## Phạm vi
- **Làm:**
  - Cây thư mục Media (phân cấp dưới `/sitecore/media library` theo Materialized Path); các System Template (`Media Folder`, `Image`, `File`).
  - Lớp trừu tượng `StorageProvider` (`LocalStorageProvider` lưu tại `storage/uploads/YYYY/MM/`, sẵn sàng cắm Cloudinary/S3 qua env).
  - Upload file đơn và đa tệp sử dụng Multer; nén ảnh client qua Canvas HTML5 (`compressImageClient`); thanh tiến độ XHR thời gian thực.
  - Tự động xử lý resize và thumbnail bằng `sharp`; tự xoay theo EXIF; xóa GPS metadata.
  - Kiểm tra Magic Bytes nhị phân chống file giả mạo; sanitize file SVG chống XSS; tính checksum SHA-256 cảnh báo file trùng.
  - Giao diện Dual-Mode (`MediaBrowser`): Trang quản lý độc lập (`/admin/media-library`) và Modal chọn ảnh (`MediaPicker.open()`); Live Search Debounce 300ms; lọc định dạng; sắp xếp 6 tiêu chí; chế độ chọn nhiều (Bulk Selection Mode); Inspector Panel chi tiết (preview, sửa alt text theo ngôn ngữ, copy URL, tra cứu nơi sử dụng).
  - Tích hợp field `Image`: Lưu `mediaId` (ObjectId), hiển thị thumbnail preview, Browse/Clear, alt text override.
  - Tích hợp Rich Text Editor (TinyMCE 6 Community Edition): Custom toolbar button mở Media Picker, tự động upload khi paste/drag-drop blob (`images_upload_handler`), chèn liên kết nội bộ tới Item (`data-item-id`), sanitize server-side bằng `sanitize-html`, hàm tiện ích `resolveRichText(html)`.
  - Bảo mật `canPerform('media:*')`, CSRF token cho mọi request mutating.
- **Không làm:**
  - Chưa làm chỉnh sửa cắt cúp ảnh trực tiếp trên trình duyệt (image cropping tool).
  - Chưa làm phân quyền ACL chi tiết từng item media riêng lẻ (GĐ 7).
  - Chưa làm Workflow duyệt và Publish media sang Web database (GĐ 8).
  - Chưa làm giao diện Thùng rác Recycle Bin (GĐ 9).

## Checklist Task Chi Tiết (Sau Phân Tích & Đối Chiếu Bước 1)

### Nhóm 1: Model, Storage & Security (Backend Cốt Lõi)
- [x] **Task 5.1:** Xây dựng Mongoose Model `Media` (`src/models/Media.js`): `name`, `displayName`, `isFolder`, `parentId`, `ancestors`, `path`, `fileDetails` (`originalName`, `storagePath`, `thumbnailPath`, `mimeType`, `fileSize`, `dimensions`, `checksum`), `altText` (hỗ trợ đa ngôn ngữ), `isDeleted`.
- [x] **Task 5.2:** Xây dựng lớp trừu tượng `StorageProvider` (`src/services/storage/index.js`):
  - Interface chuẩn: `saveFile(file, options)`, `getStream(storagePath)`, `deleteFile(storagePath)`, `generateThumbnail(sourcePath, options)`.
  - Triển khai `LocalStorageProvider` (`src/services/storage/LocalStorageProvider.js`) kết hợp thư viện `Sharp`.
- [x] **Task 5.3:** Cấu hình Middleware Upload & Kiểm Soát An Toàn (`src/middlewares/uploadMiddleware.js`):
  - Cấu hình Multer nhận multipart/form-data.
  - Kiểm tra Magic Bytes nhị phân bằng Sniffing Buffer nội bộ thuần Node.js.
  - Sanitize file SVG bằng `sanitize-html` loại bỏ thẻ `<script>` và các thuộc tính `on*`.
  - Giới hạn dung lượng tối đa (10MB) và kích thước ảnh tối đa.

### Nhóm 2: Media Service & File Serving API
- [x] **Task 5.4:** Xây dựng `mediaService.js` (`src/services/mediaService.js`):
  - Quản lý thư mục: `createFolder`, `getFolderTree`, `getBreadcrumbs`, `renameFolder`, `moveFolder`, `deleteFolder`.
  - Quản lý tệp tin: `uploadFiles`, `replaceFile`, `updateMetadata`, `findDuplicatesByChecksum`, `getMediaDetails`, `listAssets({ folderId, page, limit, format, sort, q })`, `getUsage(mediaId)`.
  - Thao tác hàng loạt: `bulkDelete(mediaIds)`, `bulkMove(mediaIds, targetFolderId)`.
- [x] **Task 5.5:** Xây dựng `mediaController.js` và Routes (`src/routes/admin/mediaRoutes.js`, `src/routes/api/mediaRoutes.js`):
  - Full Page: `GET /admin/media-library` (Ứng dụng Media Library trên Desktop Taskbar / Launchpad).
  - File Serving: `GET /media/file/:id` (hoặc thumbnail `?thumb=1`) có `Cache-Control`, `ETag`, và whitelist kích thước resize an toàn (`?w=&h=&mode=`).
  - Partial SSR: `GET /admin/media/picker` (Modal picker dùng chung).
  - JSON RESTful APIs: `GET/POST /api/media/folders`, `GET /api/media/assets`, `POST /api/media/upload`, `POST /api/media/replace`, `DELETE /api/media/assets`, `PUT /api/media/:id`.
  - Tích hợp kiểm tra quyền `canPerform('media:*')` và middleware bảo vệ CSRF.

### Nhóm 3: Giao Diện Frontend MediaBrowser & Media Picker Modal
- [x] **Task 5.6:** Xây dựng Component Client Image Compressor (`public/js/utils/image-compressor.js`):
  - Kế thừa hàm `compressImageClient` sử dụng HTML5 Canvas nén ảnh trước khi upload.
- [x] **Task 5.7:** Xây dựng Lớp Điều Khiển OOP `MediaBrowser` (`public/js/admin/media-browser.js`):
  - Quản lý trạng thái: Cây thư mục (Folder Tree), Breadcrumbs, Lưới ảnh (Grid), Phân trang con trỏ/load more.
  - Thanh tiến độ XHR upload thời gian thực (0% -> 100%).
  - Tìm kiếm Live Search Debounce 300ms, bộ lọc định dạng, sắp xếp 6 tiêu chí.
  - Chế độ chọn nhiều (Bulk Selection Mode) qua `Map<id, asset>`.
  - Bảng Inspector chi tiết: Xem preview ảnh lớn, metadata, sao chép URL 1-click, chỉnh sửa Alt Text theo ngôn ngữ.
- [x] **Task 5.8:** Xây dựng Template EJS Media Library:
  - `src/views/admin/media/library.ejs`: Trang quản lý độc lập phong cách Desktop Window.
  - `src/views/admin/media/partials/media-browser-core.ejs`: Giao diện lõi dùng chung cho cả trang và modal.
  - `src/views/admin/media/modals/media-picker-modal.ejs`: Modal bọc chế độ chọn ảnh.
- [x] **Task 5.9:** Xây dựng Cầu Nối Toàn Cục `MediaPicker` (`public/js/admin/media-picker.js`):
  - Cung cấp API: `MediaPicker.open({ type, multiple, onSelect })`.

### Nhóm 4: Tích Hợp Field Image & Rich Text Editor trong Content Editor
- [x] **Task 5.10:** Tích hợp Field Type `Image` trong Content Editor:
  - Cập nhật view `src/views/content-editor/fields/field-image.ejs`: Khung xem trước thumbnail, nút "Browse" mở `MediaPicker`, nút "Clear", ô sửa Alt Text override theo ngôn ngữ.
  - Cập nhật client script `public/js/admin/content-editor.js` kết nối sự kiện chọn ảnh.
- [x] **Task 5.11:** Tích hợp Rich Text Editor (TinyMCE 6):
  - Tải TinyMCE 6 Community Edition qua CDN chính thức jsDelivr.
  - Cấu hình file `public/js/admin/tinymce-config.js`: Custom button **Media Library**, chặn `file_picker_callback` mở `MediaPicker`.
  - Tự động upload khi paste hoặc kéo thả ảnh vào editor (`images_upload_handler`) qua `image-compressor`.
  - Chèn ảnh vào editor có thuộc tính bền vững `data-media-id=":id"`.
  - Hỗ trợ chèn **Internal Link** tới Item nội bộ trong cây nội dung với `data-item-id=":id"`.
  - Xây dựng hàm tiện ích `resolveRichText(html)` (`src/utils/richTextHelper.js`) phục vụ phân giải URL cho Delivery API / Layout Service.
  - Sanitize mã HTML tại server bằng `sanitize-html` trước khi lưu vào MongoDB (giữ nguyên `data-media-id` và `data-item-id`).

### Nhóm 5: Migration, Seed & Kiểm Thử Toàn Diện
- [x] **Task 5.12:** Seed Data & Migration Script:
  - Seed các System Template (`Media Folder`, `Image`, `File`) và thư mục gốc `/sitecore/media library/`.
  - Seed một số ảnh mẫu và thư mục mẫu.
  - Viết script migration an toàn, idempotent chuyển đổi dữ liệu URL cũ sang định dạng mới.
- [x] **Task 5.13:** Kiểm thử Tự động & Hồi quy:
  - Viết unit & integration tests cho `mediaService`, `storageProvider`, upload validate, Magic Bytes sniffing, SVG sanitization, `resolveRichText`.
  - Đảm bảo 100% test suites (kể cả hồi quy GĐ 0→4) đều pass.
  - Kiểm tra `npm run lint` đạt 0 errors, 0 warnings.
- [x] **Task 5.14:** Nghiệm thu & Báo cáo Nghiệm thu `docs/reports/phase-05-report.md`.

## File/Thư mục Dự kiến
- `src/models/Media.js`
- `src/services/storage/index.js`, `src/services/storage/LocalStorageProvider.js`
- `src/middlewares/uploadMiddleware.js`
- `src/services/mediaService.js`
- `src/utils/fileSniffer.js`, `src/utils/richTextHelper.js`
- `src/controllers/admin/mediaController.js`
- `src/routes/admin/mediaRoutes.js`, `src/routes/api/mediaRoutes.js`
- `src/views/admin/media/library.ejs`, `src/views/admin/media/partials/media-browser-core.ejs`, `src/views/admin/media/modals/media-picker-modal.ejs`
- `src/views/content-editor/fields/field-image.ejs`
- `public/js/utils/image-compressor.js`, `public/js/admin/media-browser.js`, `public/js/admin/media-picker.js`, `public/js/admin/tinymce-config.js`
- `tests/mediaService.test.js`, `tests/mediaApi.test.js`, `tests/richTextHelper.test.js`

## Definition of Done (DoD)
- [x] Bản đối chiếu tài liệu tham chiếu đã được duyệt; mọi điểm lệch có quyết định (DEC-028).
- [x] Upload nhiều file (kéo thả, tiến trình XHR), thumbnail Sharp đúng tỉ lệ, metadata đọc/sửa được; Alt text hỗ trợ đa ngôn ngữ.
- [x] Quản lý thư mục: Tạo, đổi tên, di chuyển, xóa thư mục an toàn.
- [x] File giả mạo (.exe/.php đổi đuôi) bị chặn bởi Magic Bytes; file quá lớn bị chặn; SVG độc hại được sanitize sạch sẽ.
- [x] Phục vụ file qua route stream an toàn có `Cache-Control`, `ETag`, giới hạn tham số resize.
- [x] Modal Media Picker mở mượt mà từ field Image và Rich Text Editor; upload ngay trong picker; chọn đơn/nhiều ảnh.
- [x] Field Image lưu `mediaId`, hiển thị preview thumbnail, validate server-side; tương thích ngược URL cũ.
- [x] Rich Text: Chèn ảnh từ Media Library (`data-media-id`), chèn link nội bộ (`data-item-id`), paste sạch, XSS bị chặn bởi `sanitize-html`.
- [x] `resolveRichText` có unit test đầy đủ.
- [x] Launchpad và Taskbar mở được Media Library; phân quyền `canPerform('media:*')` và CSRF hoạt động chuẩn xác.
- [x] Toàn bộ test suites (bao gồm hồi quy GĐ 2-4) pass 100%, `npm run lint` đạt 0 errors.
- [x] Báo cáo nghiệm thu `docs/reports/phase-05-report.md` hoàn thành; cập nhật đồng bộ `docs/phases/README.md`.

## Ghi chú Điều chỉnh GĐ 4.1 (2026-11-03)
> [!NOTE]
> Theo **DEC-029**, hệ thống đã chuyển ngôn ngữ mặc định sang Tiếng Việt (`vi`). Khi biên tập viên lưu Alt Text hoặc metadata ảnh theo ngôn ngữ mà không chỉ định `lang`, hệ thống tự động áp dụng ngôn ngữ `vi` (thay vì `en`). Các bản dịch metadata `en` cũ vẫn được bảo toàn nguyên vẹn.



