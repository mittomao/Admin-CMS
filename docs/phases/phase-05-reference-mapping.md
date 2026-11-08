# BẢN ĐỐI CHIẾU KIẾN TRÚC & KẾ HOẠCH KẾ THỪA GIAI ĐOẠN 5: MEDIA LIBRARY & RICH TEXT EDITOR
> File: `docs/phases/phase-05-reference-mapping.md`  
> Giai đoạn: GĐ 5  
> Tài liệu nguồn tham chiếu: `/docs/modules/media-editor/` (9 tài liệu phân tích)  
> Ngày lập: 2026-11-03  
> Trạng thái: **Bước 1 - Phân tích & Đối chiếu (Chờ duyệt CONTINUE GĐ 5)**

---

## 1. Bảng Đối Chiếu Tính Năng & Hành Vi (Feature & Behavior Mapping Matrix)

Bảng đối chiếu toàn diện giữa tài liệu tham chiếu (`Blog_Express_App`) và kiến trúc hệ thống hiện tại (`Admin-CMS`):

| STT | Tính năng / Hành vi trong Tài liệu Tham chiếu | Hiện trạng Code Cũ | Phân loại Áp dụng | Cách áp dụng trong Project này & Lý do |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Client Image Compression** | `compressImageClient` (Canvas HTML5, 1600x1600, Q:0.85, bỏ qua gif) | 🟢 **Áp dụng nguyên** | Tái sử dụng nguyên vẹn logic nén client trong `public/js/utils/image-compressor.js`. Giảm 70-85% payload mạng trước khi gửi upload, tăng tốc UX đáng kể. |
| **2** | **XHR Upload Progress Tracking** | Lắng nghe sự kiện `xhr.upload.onprogress` hiển thị thanh % động (0-100%) | 🟢 **Áp dụng nguyên** | Giữ nguyên trải nghiệm thanh tiến độ XHR trực quan cho cả upload đơn và đa tệp tin. |
| **3** | **Dual-Mode Media Browser (Page & Modal)** | Cùng 1 class `MediaBrowser`, phân biệt bằng `data-is-picker` | 🟢 **Áp dụng nguyên** | Kế thừa mô hình Dual-Mode: Chạy độc lập tại `/admin/media-library` và dạng cửa sổ chọn Modal `MediaPicker.open()`. |
| **4** | **Live Search Debounce (300ms)** | Bắt sự kiện `input` với timer debounce 300ms, nút clear nhanh `x` | 🟢 **Áp dụng nguyên** | Giữ nguyên hành vi gõ tìm kiếm mượt mà, giảm tải gọi request API liên tục. |
| **5** | **Filter & Sorting Grid** | Lọc theo định dạng (`all`, `png`, `jpg`, `webp`, `gif`, `svg`), sắp xếp 6 tiêu chí | 🟢 **Áp dụng nguyên** | Áp dụng đầy đủ dropdown bộ lọc format và dropdown sắp xếp (mới nhất, cũ nhất, tên A-Z, dung lượng). |
| **6** | **Bulk Selection & Multi-delete** | Bật "Select Mode", chọn checkbox nhiều ảnh qua `Map<id, asset>`, xóa hàng loạt | 🟢 **Áp dụng nguyên** | Kế thừa UX chọn nhiều ảnh để xóa hoặc chèn hàng loạt (Bulk Insert/Delete). |
| **7** | **Asset Inspector Panel** | Preview ảnh lớn, thông số kích thước, dung lượng, ngày tạo, 1-click Copy URL | 🟡 **Điều chỉnh** | Giữ nguyên UX của Inspector nhưng bổ sung ô sửa **Alt Text theo ngôn ngữ** (kế thừa cơ chế GĐ 4), hiển thị thông tin Item Reference và nơi đang sử dụng (Usage). |
| **8** | **Storage Backend (Lưu trữ file)** | Cloudinary Search & Admin API trực tiếp (`multer-storage-cloudinary`), không lưu DB | 🟡 **Điều chỉnh** | **Chuyển sang `StorageProvider` trừu tượng**: Mặc định `LocalStorageProvider` (lưu đĩa nội bộ, xử lý thumbnail bằng `sharp`), sẵn sàng cắm `CloudinaryStorageProvider` qua env. Lưu metadata đầy đủ vào MongoDB. |
| **9** | **Mô hình Dữ liệu CSDL** | Model `imagesModel.js` mồ côi (không dùng); MongoDB chỉ lưu raw URL trong `blog.thumbnail` | 🟡 **Điều chỉnh** | **Tuân thủ triết lý "Mọi thứ là Item"**: Media là item dưới `/root/media library` với các template hệ thống (`Media Folder`, `Image`, `File`). Field Image lưu `mediaId` (ObjectId) chứ không lưu URL cứng. |
| **10** | **Cây Thư Mục (Folder Tree)** | Thư mục phẳng trên Cloudinary, không cho xóa folder nếu có tài nguyên con | 🟡 **Điều chỉnh** | Quản lý cây thư mục phân cấp Treecraft (`parentId`, `ancestors`, `path`). Hỗ trợ di chuyển (drag & drop move), đổi tên thư mục và cảnh báo item con trước khi xóa. |
| **11** | **Xử lý File & Thumbnail tại Server** | Cloudinary URL transformations (`c_limit,w_1600,q_auto`) | 🟡 **Điều chỉnh** | Sử dụng thư viện **`Sharp`** trên máy chủ để tạo thumbnail chuẩn (`150x150`, `400x400`), tự xoay theo EXIF và loại bỏ siêu dữ liệu nhạy cảm (GPS). |
| **12** | **Validate Tệp tin Upload** | Chỉ kiểm tra phần mở rộng file (`allowed_formats`) qua Multer | 🟡 **Điều chỉnh** | Bổ sung kiểm tra **Magic Bytes** chống giả mạo đuôi file (.exe -> .jpg), **Sanitize SVG** chống XSS, giới hạn dung lượng (10MB) cấu hình qua env. |
| **13** | **Cấu hình TinyMCE & Toolbar** | TinyMCE 6.3 với nút custom `cloudinary_media`, `file_picker_callback`, `images_upload_handler` | 🟡 **Điều chỉnh** | Kế thừa cấu hình TinyMCE 6.x nhưng đổi nút thành **Media Library**; ảnh chèn vào giữ `data-media-id` để liên kết bền vững; bổ sung chèn **Internal Link** (`data-item-id`). |
| **14** | **Làm Sạch Nội Dung (Sanitization)** | Chỉ kiểm tra độ dài chuỗi text >= 10 ký tự, lưu HTML thô vào MongoDB | 🟡 **Điều chỉnh** | Bắt buộc **Sanitize HTML tại tầng Server** bằng `sanitize-html` (DEC-013), cấu hình whitelist thẻ và giữ lại các thuộc tính `data-media-id`, `data-item-id`. |
| **15** | **Phục Vụ Tệp Tin (File Serving)** | Cloudinary CDN trực tiếp (`https://res.cloudinary.com/...`) | 🟡 **Điều chỉnh** | Cung cấp route `GET /media/file/:id` hoặc `GET /media/:id/:name` có `Cache-Control`, `ETag`, hỗ trợ resize an toàn (`?w=&h=&mode=`) có whitelist kích thước. |
| **16** | **Phân Quyền & Bảo Mật CSRF** | Chỉ kiểm tra `checkLogin` session, không có CSRF token cho upload | 🟡 **Điều chỉnh** | Tích hợp middleware bảo mật của hệ thống: kiểm tra quyền qua `canPerform('media:*')`, bắt buộc CSRF token (header hoặc form field). |
| **17** | **Gói FLMNGR Server Plugin** | `@flmngr/flmngr-server-node-express` gắn tại `/flmngr` (legacy dead code) | 🔴 **Bỏ qua** | Loại bỏ hoàn toàn, không cài đặt, không tạo route `/flmngr`. |
| **18** | **CDN Demo TinyMCE Flmngr** | `https://flmngr.com/js-demo/tinymce-6.3/tinymce.min.js` | 🔴 **Bỏ qua** | Không dùng link demo bên thứ ba. Sử dụng CDN chính thức của Tiny Technologies (jsDelivr / cdnjs) hoặc tự host file tĩnh. |
| **19** | **Model `imagesModel.js`** | Collection `images` mồ côi | 🔴 **Bỏ qua** | Thay thế bằng mô hình `Media` chuẩn hóa trong `docs/data-model/media.md`. |
| **20** | **Chỉnh sửa Cắt cúp Ảnh Trực Tiếp**| Image Cropping Tool trên trình duyệt | 🔴 **Bỏ qua** | Nằm ngoài phạm vi GĐ 5 (theo quy định của prompt). |

---

## 2. Phân Tích Các Điểm Lệch Kiến Trúc (Architectural Gaps & Divergences)

### 2.1. Điểm lệch 1: Storage Layer (Cloudinary vs LocalStorageProvider)
- **Dự án cũ:** Phụ thuộc 100% vào Cloudinary Search API và CDN ngoài. Gặp rủi ro rate limit (500 req/giờ trên gói miễn phí) và cần tài khoản bên ngoài.
- **Dự án này:** Ưu tiên tính độc lập và bảo mật cao của hệ thống Enterprise CMS. Giải pháp là xây dựng lớp `StorageProvider` trừu tượng. Ban đầu chạy bằng `LocalStorageProvider` (lưu tệp cục bộ vào thư mục `storage/uploads/` ngoài web root), có thumbnail generator bằng `Sharp`. Khi khách hàng có nhu cầu sử dụng Cloudinary hoặc AWS S3, chỉ cần khai báo biến `.env` mà không phải sửa logic nghiệp vụ.

### 2.2. Điểm lệch 2: Dữ Liệu Tham Chiếu Bền Vững (Persistent Media Reference vs Raw URL)
- **Dự án cũ:** Lưu URL tĩnh của ảnh (`https://res.cloudinary.com/...`) vào database. Khi ảnh bị đổi tên, thay thế hoặc chuyển thư mục, đường dẫn trong bài viết sẽ bị lỗi thời hoặc đứt gãy.
- **Dự án này:** Field `Image` lưu `mediaId` (ObjectId). Thẻ `<img>` trong Rich Text lưu thêm thuộc tính `data-media-id=":id"`. Liên kết nội bộ lưu `data-item-id=":id"`. Hệ thống cung cấp hàm tiện ích `resolveRichText(html)` để phân giải linh hoạt thành URL thực tế tại thời điểm render hoặc cung cấp cho Headless Layout Service (GĐ 10).

### 2.3. Điểm lệch 3: Đa Ngôn Ngữ Cho Siêu Dữ Liệu (Multi-language Metadata)
- **Dự án cũ:** Alt text chỉ lưu chung 1 giá trị duy nhất cho mỗi bài viết.
- **Dự án này:** Áp dụng thành quả của Giai đoạn 4. Tệp nhị phân dùng chung (`shared`), nhưng `altText`, `title`, `description` có thể biên tập và lưu trữ theo từng ngôn ngữ (`en`, `vi`), giúp tối ưu hóa SEO quốc tế.

### 2.4. Điểm lệch 4: Bảo Mật Upload & Chống Mã Độc
- **Dự án cũ:** Chưa kiểm tra Magic Bytes (chỉ tin đuôi mở rộng file do client gửi lên), chưa lọc nội dung file SVG.
- **Dự án này:** Áp dụng chính sách bảo mật nghiêm ngặt (`docs/rules/05-security.md`): Kiểm tra Magic Bytes nhị phân của tệp, từ chối file thực thi hoặc script độc hại; file SVG phải được sanitize loại bỏ thẻ `<script>` và các thuộc tính `onload/onerror`.

---

## 3. Rà Soát Phạm Vi Giai Đoạn 5 (Media Library & Rich Text Editor)

### 3.1. Phạm vi Media Library (Căn cứ Prompt & Tài liệu Đối chiếu)
- [x] **Cây thư mục Media phân cấp:** Quản lý dưới `/root/media library` bằng Materialized Path, hỗ trợ tạo thư mục, đổi tên, di chuyển (drag & drop), xóa thư mục.
- [x] **Upload & Xử lý File:** Upload đơn và đa tệp tin, kéo thả (Drag & Drop), thanh tiến độ XHR thời gian thực, nén ảnh client qua Canvas HTML5, sinh thumbnail đa kích thước qua Sharp, tự xoay theo EXIF.
- [x] **Lưới hiển thị & Thao tác:** Chuyển đổi lưới (Grid) tỉ lệ 1:1, tìm kiếm Live Search Debounce 300ms, lọc format, sắp xếp 6 tiêu chí, chế độ chọn hàng loạt (Bulk Selection Mode), Inspector Panel chi tiết (preview, metadata, copy URL, sửa alt text theo ngôn ngữ).
- [x] **Kiểm soát & Bảo vệ:** Validate Magic Bytes, sanitize SVG, phát hiện trùng file qua checksum (SHA-256), thay thế file (replace file) giữ nguyên ID, phân quyền `canPerform('media:*')`, CSRF protection.
- [x] **Phục vụ File:** Route stream `GET /media/file/:id` có cache (`Cache-Control`, `ETag`) và hỗ trợ tham số resize giới hạn an toàn (`?w=&h=&mode=`).

### 3.2. Phạm vi Rich Text Editor
- [x] **Tích hợp TinyMCE 6.x:** Sử dụng CDN chính thức / local build, loại bỏ hoàn toàn liên kết demo Flmngr.
- [x] **Nút Media Library trên Toolbar & Dialog:** Tích hợp mở `MediaPicker` modal, chèn ảnh có thuộc tính bền vững `data-media-id` và responsive style (`loading="lazy"`).
- [x] **Paste & Drag-Drop tự động upload:** Kế thừa `images_upload_handler`, tự động nén blob client trước khi upload ngầm và thay thế URL vào editor.
- [x] **Chèn Internal Link:** Hỗ trợ chèn liên kết trỏ tới Item nội bộ trong cây nội dung với thuộc tính `data-item-id`.
- [x] **Làm sạch tại Server & Phân giải URL:** Sanitize HTML bằng `sanitize-html` khi lưu vào database; cung cấp hàm `resolveRichText(html)` hỗ trợ Headless Delivery API.
- [x] **Đa ngôn ngữ & Khóa Lạc quan:** Nội dung Rich Text lưu theo từng version/ngôn ngữ (GĐ 4), kiểm tra xung đột version khi lưu.

---

## 4. Danh Sách Thư Viện / Dependency Cần Duyệt (Dependencies Approval List)

| STT | Package | Phiên bản đề xuất | Trạng thái trong Project | Vai trò & Lý do | Đã có trong `02-tech-stack.md`? |
| :---: | :--- | :--- | :---: | :--- | :---: |
| 1 | **`multer`** | `^1.4.5-lts.1` | **Chưa cài đặt** | Middleware stream multipart/form-data upload file. | **CÓ** (Quy định tại mục 1 bảng Tech Stack) |
| 2 | **`sharp`** | `^0.33.5` | **Chưa cài đặt** | Xử lý ảnh hiệu năng cao bằng C-lib (libvips), tạo thumbnail, resize an toàn, xóa GPS EXIF. | **CÓ** (Quy định tại mục 1 bảng Tech Stack) |
| 3 | **`file-type`** | `^19.6.0` (hoặc header sniffing buffer nội bộ) | **Chưa cài đặt** | Kiểm tra Magic Bytes nhị phân để ngăn chặn tải file giả mạo phần mở rộng. | *Đề xuất bổ sung để đạt chuẩn bảo mật* |
| 4 | **`cloudinary`** & **`multer-storage-cloudinary`** | `^1.41.0` & `^4.0.0` | **Chưa cài đặt** | Adapter Cloudinary cho StorageProvider (tùy chọn). | *Chỉ cài khi người dùng muốn bật Cloudinary* |
| 5 | **`@flmngr/flmngr-server-node-express`** | - | **Không cài** | Di sản lỗi thời từ dự án cũ. | **LOẠI BỎ** |

---

## 5. Tối Đa 8 Câu Hỏi Cần Xác Nhận (Đã ghi vào `docs/open-questions.md`)

Xem chi tiết đề xuất và các phương án tại [docs/open-questions.md](../open-questions.md) (Mục 9 → 16).

