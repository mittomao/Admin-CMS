# DEC-028: Đối Chiếu Kiến Trúc & Kế Thừa Module Media Library + Rich Text Editor từ Dự Án Tham Chiếu
> File: `docs/decisions/DEC-028-media-richtext-reference.md`  
> Giai đoạn: GĐ 5 (Media Library & Rich Text Editor)  
> Ngày quyết định: 2026-11-03 (Điều chỉnh: 2026-11-05)  
> Trạng thái: **Đã được thay thế (Superseded by DEC-038)**

---

## 1. Bối Cảnh & Nguồn Tài Liệu Tham Chiếu
Trong Giai đoạn 5, dự án cần phát triển hai phân hệ quan trọng: **Media Library** và **Rich Text Editor** tích hợp sâu với Content Editor. Người dùng cung cấp bộ tài liệu kỹ thuật từ một dự án đã chạy thực tế tại `/docs/modules/media-editor/` bao gồm 9 tài liệu (`overview.md`, `media-library.md`, `richtext-editor.md`, `database-api-design.md`, `integration-flow.md`, `dependencies-config.md`, `reusability-assessment.md`, `new-project-implementation-guide.md`, `cloudinary-integration.md`).

Kiến trúc hiện tại của dự án chúng ta tuân thủ triết lý Sitecore XM ("Mọi thứ là Item", phân cấp cây nội dung, Master/Web, đa ngôn ngữ & đa phiên bản tại GĐ 4, kiểm soát bảo mật CSRF và ACL qua `canPerform`). Do đó, việc tái sử dụng tài liệu tham chiếu cần được chọn lọc, phân tích đối chiếu và thống nhất các điểm khác biệt trước khi triển khai code.

---

## 2. Quyết Định Kiến Trúc Đối Chiếu (Mapping Decisions)

### 2.1. Về Tầng Lưu Trữ (Storage Architecture)
- **Tài liệu tham chiếu:** Sử dụng Cloudinary Search API & Cloudinary Admin API hoàn toàn không lưu metadata vào CSDL (Cloud-native).
- **Quyết định cho dự án này:** 
  - Xây dựng **lớp trừu tượng `StorageProvider`** với implementation mặc định là `LocalStorageProvider` (lưu file vật lý trên đĩa máy chủ tại `storage/uploads/YYYY/MM/`, tạo thumbnail tự động bằng `sharp`).
  - Thiết kế sẵn adapter interface để có thể cấu hình `CloudinaryStorageProvider` hoặc `S3StorageProvider` qua biến môi trường `STORAGE_PROVIDER` mà không làm thay đổi tầng Service hay Controller.
  - Phục vụ file qua route an toàn `GET /media/file/:id` có cache (`Cache-Control`, `ETag`) và hỗ trợ tham số resize có whitelist (`?w=&h=&mode=`).

### 2.2. Về Mô Hình Dữ Liệu (Data Model)
- **Tài liệu tham chiếu:** Mô hình CSDL mồ côi (`imagesModel.js` không dùng), chỉ lưu URL chuỗi thô vào bài viết.
- **Quyết định cho dự án này:** 
  - Tuân thủ nguyên tắc **"Mọi thứ là Item"**: Media được định nghĩa và quản lý dưới nhánh cây `/sitecore/media library` với các System Templates: `Media Folder`, `Image`, `File` (và `Video`).
  - Lưu trữ bản ghi trong collection `media` (hoặc `items_master`) với các trường: `name`, `displayName`, `isFolder`, `parentId`, `ancestors`, `path`, `fileDetails` (`originalName`, `storagePath`, `thumbnailPath`, `mimeType`, `fileSize`, `dimensions`, `checksum`), `altText` theo ngôn ngữ (tương thích đa ngôn ngữ GĐ 4), `isDeleted`.
  - Field `Image` trong Content Editor lưu tham chiếu `mediaId` (ObjectId) chứ không lưu URL cứng, đảm bảo khi đổi tên hoặc di chuyển media, liên kết không bị hỏng.

### 2.3. Về Thư Viện Xử Lý File & Ảnh (Dependencies)
- **Tài liệu tham chiếu:** Dùng `multer` + `multer-storage-cloudinary` + Canvas HTML5 nén client. Bỏ qua hoàn toàn `@flmngr`.
- **Quyết định cho dự án này:**
  - **Phía Client:** Kế thừa hàm `compressImageClient` (HTML5 Canvas) từ tài liệu tham chiếu để nén ảnh trước khi upload, tiết kiệm băng thông và tăng tốc độ truyền tải.
  - **Phía Server:** Sử dụng **`Multer`** (xử lý upload multipart) kết hợp với **`Sharp`** (xử lý resize, thumbnail, xoay ảnh EXIF, xóa metadata nhạy cảm GPS) theo đúng danh mục đã phê duyệt tại `docs/rules/02-tech-stack.md`.
  - Kiểm tra an toàn tệp tin: Kiểm tra **Magic Bytes** bằng `file-type` hoặc buffer header sniffing nội bộ, từ chối file thực thi, và **làm sạch SVG** bằng `sanitize-html` trước khi lưu trữ.

### 2.4. Về Giao Diện & Trải Nghiệm Người Dùng (Frontend MediaBrowser SPA)
- **Tài liệu tham chiếu:** Lớp OOP ES6 `MediaBrowser` (Dual-Mode: Standalone Page và Modal Picker) với các tính năng: Cây thư mục, Breadcrumbs, Grid ảnh tỉ lệ 1:1, Inspector panel chi tiết, tìm kiếm Debounce 300ms, lọc format, sắp xếp 6 tiêu chí, chế độ chọn hàng loạt (Bulk mode), thanh tiến độ upload thời gian thực (XHR progress).
- **Quyết định cho dự án này:**
  - **Kế thừa 100% các tính năng và hành vi người dùng** trên của `MediaBrowser`.
  - Điều chỉnh styling và cấu trúc DOM để đồng bộ với Sitecore Theme (màu sắc xám/xanh doanh nghiệp, ribbon bar, desktop window/taskbar modal, thay vì phụ thuộc vào thư viện CSS ngoài Tabler).
  - Tách giao diện thành component độc lập, cung cấp API toàn cục chuẩn hóa: `MediaPicker.open({ type, multiple, onSelect })`.

### 2.5. Về Tích Hợp Rich Text Editor (TinyMCE)
- **Tài liệu tham chiếu:** TinyMCE 6.3 với custom button, `file_picker_callback`, và `images_upload_handler` tự động upload khi paste/drag&drop.
- **Quyết định cho dự án này:**
  - Sử dụng **TinyMCE phiên bản chính thức** (Community Edition via CDN chính thức jsDelivr/cdnjs hoặc npm package), loại bỏ hoàn toàn đường link demo `flmngr.com`.
  - Đổi nút custom thành **Media Library** tích hợp mở `MediaPicker`.
  - Khi chèn ảnh vào nội dung: Chèn thẻ `<img src="/media/file/:id" data-media-id=":id" alt="..." />` để duy trì định danh media bền vững.
  - Khi chèn liên kết nội bộ: Cung cấp modal chọn Item cây nội dung, chèn `<a href="/sitecore/content/..." data-item-id=":id">...</a>`.
  - **Làm sạch tại Server (Server-side Sanitization):** Bắt buộc chạy qua `sanitize-html` trước khi lưu vào MongoDB, giữ lại các thuộc tính an toàn `data-media-id` và `data-item-id` (DEC-013).
  - Cung cấp hàm tiện ích `resolveRichText(html)` để thay thế các tham chiếu `data-media-id`/`data-item-id` thành URL thật phục vụ cho Headless Layout Service (GĐ 10).

### 2.6. Về Phân Quyền & Bảo Mật
- **Tài liệu tham chiếu:** Chỉ kiểm tra session login chung chung `checkLogin`, chưa có CSRF trên upload.
- **Quyết định cho dự án này:**
  - Bổ sung kiểm tra quyền chi tiết qua helper `canPerform`: `media:read`, `media:upload`, `media:write`, `media:delete`.
  - Bắt buộc kiểm tra token CSRF trên tất cả các request mutating (upload, tạo thư mục, đổi tên, xóa, thay thế file).

---

## 3. Hệ Quả & Tác Động (Consequences)
- **Tích cực:** Tận dụng được toàn bộ thiết kế UX/UI tinh hoa và logic tương tác đã được kiểm chứng của `MediaBrowser` và TinyMCE; đồng thời chuẩn hóa kiến trúc dữ liệu theo đúng chuẩn Sitecore XM, độc lập với dịch vụ Cloud bên ngoài, nâng cao bảo mật và sẵn sàng cho kiến trúc Headless CMS.
- **Lưu ý:** Cần cài đặt thêm 2 package backend đã định hình trong Tech Stack: `multer` và `sharp`.

