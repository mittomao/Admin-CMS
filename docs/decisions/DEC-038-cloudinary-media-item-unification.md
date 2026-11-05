# DEC-038: Tái Định Nghĩa Media Library — Cloudinary Cloud Storage & Hợp Nhất "Mọi Media Là Item"
> File: `docs/decisions/DEC-038-cloudinary-media-item-unification.md`  
> Giai đoạn: GĐ 5.1 (Tái định nghĩa Media Library)  
> Ngày quyết định: 2026-11-05  
> Trạng thái: **Đã chốt (Thay thế DEC-028)**  

---

## 1. Bối Cảnh & Vấn Đề (Context & Problem)
- Trong thiết kế ban đầu của GĐ 5 ([`DEC-028`](./DEC-028-media-richtext-reference.md)), hệ thống lưu trữ media trên đĩa cục bộ máy chủ (`storage/uploads/YYYY/MM/`) qua `LocalStorageProvider` và lưu metadata vào một MongoDB collection tách rời là `media` (`collection: 'media'`).
- Mô hình này bộc lộ các hạn chế:
  1. **Lệch khỏi triết lý Sitecore XM ("Mọi thứ là Item")**: Media tồn tại ở một collection độc lập, không kế thừa được hệ thống System Template, Insert Options, Quick Info, quy trình Workflow & Publish (GĐ 8) và Item-level ACL (GĐ 7).
  2. **Gánh nặng lưu trữ cục bộ (Local Storage overhead)**: Tệp tin lưu trên máy chủ Node.js dễ bị mất khi deploy nhiều instance hoặc restart container; phải dùng `sharp` tiêu tốn CPU/RAM để sinh thumbnails.
  3. **Không đồng nhất đường dẫn**: Cấu trúc `YYYY/MM` tự sinh làm mất đi sự liên kết tự nhiên giữa đường dẫn thư mục CMS và vị trí tệp tin trên CDN.
- Do đó, người dùng yêu cầu tái định nghĩa: **Mọi Media đều là Item** trong `items_master` dưới nhánh `/sitecore/media library`, và **Cloudinary là nơi lưu file thật** với cấu trúc thư mục khớp 1-1.

---

## 2. Quyết Định Kiến Trúc (Architectural Decisions)

### 2.1. Hợp Nhất Media vào Collection `items_master` ("Mọi Media là Item")
- **Xóa bỏ collection `media`**: Toàn bộ tài nguyên số (ảnh, tệp tài liệu, video, thư mục media) được định nghĩa là các `Item` chính thống trong collection `items_master` (và xuất bản sang `items_web` ở GĐ 8).
- **System Templates cho Media (tại `/sitecore/templates/System`)**:
  - `Media Folder`: Dành cho các thư mục tổ chức media (icon `folder`).
  - `Image`: Dành cho hình ảnh (icon `photo`), gồm các trường:
    - *Shared Fields:* `publicId` (Cloudinary), `assetId`, `resourceType` (`image`), `format`, `extension`, `secureUrl`, `fileSize`, `width`, `height`, `checksum`, `syncedAt`.
    - *Language/Version Fields:* `altText`, `title`, `description` (hỗ trợ đa ngôn ngữ độc lập).
  - `File`: Dành cho tài liệu/tệp chung (PDF, Zip, Word...) với `resourceType` là `raw`.
- **Quy tắc Tên Item:**
  - Tên Item **không bao gồm phần mở rộng** (ví dụ tệp `hero-banner.jpg` tạo item có `name: 'hero-banner'`).
  - Phần mở rộng được lưu trữ tại trường `extension` và `format`.
  - Không cho phép trùng tên item trong cùng một thư mục cha (nếu tải lên `hero-banner.png` khi đã có `hero-banner.jpg`, hệ thống báo lỗi xung đột tên và yêu cầu đổi tên).

### 2.2. Ánh Xạ Đường Dẫn Hai Chiều (CMS 1-1 Cloudinary) & Folder Mode
- **Thư mục gốc:** `/AdminCMS` trên Cloudinary ánh xạ chính xác với `/sitecore/media library` trên CMS.
- **Ánh xạ 1-1:**
  - Item `/sitecore/media library/Banners/Hero` ↔ File Cloudinary `AdminCMS/Banners/Hero.<ext>`.
  - Thư mục Item `/sitecore/media library/Banners` ↔ Thư mục Cloudinary `AdminCMS/Banners`.
- **Hàm `mediaPathMapper`:** Cung cấp logic chuyển đổi hai chiều chuẩn hóa giữa Item Path và Cloudinary `public_id` / `asset_folder`.
- **Chế độ Thư mục Cloudinary:** Tài khoản người dùng đang kích hoạt **Dynamic Folder Mode** (trả về cả `asset_folder` và `display_name`). Adapter sẽ gửi đồng thời `folder: AdminCMS/<subpath>` và `public_id: <cleanBaseName>`, bảo đảm tương thích cả hai cơ chế quản lý thư mục của Cloudinary.

### 2.3. Vòng Đời Thao Tác & Đồng Bộ Thời Gian Thực (CMS ↔ Cloudinary)
1. **Upload File:** Stream file nhị phân qua Multer buffer lên Cloudinary vào `AdminCMS/<subpath>`, sau đó tạo Item tương ứng trong `items_master`. Nếu Cloudinary lỗi, hủy thao tác và không tạo Item rác.
2. **Tạo Media Folder:** Tạo Item `Media Folder` trên CMS đồng thời tạo folder rỗng tương ứng trên Cloudinary qua Admin API.
3. **Rename Item:** Gọi `cloudinary.uploader.rename` cập nhật `public_id` và `display_name`, cập nhật lại `secureUrl` và `path` của Item.
4. **Move Item/Folder:** Di chuyển Item trên CMS, đồng thời đổi `public_id`/`asset_folder` cho toàn bộ nhánh con trên Cloudinary.
5. **Replace File:** Tải tệp mới lên đè đúng `public_id` cũ trên Cloudinary (`overwrite: true, invalidate: true`), giữ nguyên ID của Item và các liên kết cũ.
6. **Delete Item:** Khi người dùng xóa trên CMS, chỉ thực hiện **Soft-delete** (`isDeleted: true`), **không xóa file vật lý trên Cloudinary**. File chỉ bị xóa vĩnh viễn khỏi Cloudinary khi thực hiện dọn sạch thùng rác (Purge Recycle Bin) ở GĐ 9.

### 2.4. Công Cụ Đồng Bộ Ngược (Reverse Sync: Cloudinary → CMS)
- Cung cấp CLI `npm run media:sync [--dry-run]` và nút "Sync from Cloudinary" trên Ribbon:
  - Phân trang duyệt qua Cloudinary Admin API dưới thư mục `AdminCMS`.
  - Tự động tạo thư mục `Media Folder` và Item `Image`/`File` còn thiếu trên CMS.
  - Cập nhật metadata nếu có thay đổi.
  - Cảnh báo các asset có Item trên CMS nhưng file vật lý đã bị xóa khỏi Cloudinary (đánh dấu `missingOnCloudinary: true`, tuyệt đối không tự xóa Item).
  - Đảm bảo tính bất biến (Idempotent) khi chạy nhiều lần.

### 2.5. Thay Thế Lớp Storage & Phục Vụ File
- Xóa bỏ `LocalStorageProvider`. Lớp `CloudinaryStorageProvider` là implementation duy nhất trong factory `getStorageProvider()`.
- Thumbnail và kích thước ảnh chuyển sang sử dụng **Cloudinary Transformation URL** với các preset whitelisted (`thumb`, `medium`, `large`), thay thế hoàn toàn cho thư viện `sharp` trên server.
- Endpoint cũ `GET /media/file/:id`: Chuyển hướng **HTTP 302 Redirect** trực tiếp sang Cloudinary CDN `secure_url`.

### 2.6. Tương Thích & Tham Chiếu Trong Hệ Thống
- **Trường Image & MediaPicker:** Lưu `mediaId` (ID của Item media). Picker duyệt trực tiếp cây Item dưới `/sitecore/media library`.
- **Rich Text (TinyMCE):** Ảnh chèn có dạng `<img src="..." data-media-id=":itemId" />`. Hàm `resolveRichText` tìm Item trong `items_master` và thay thế `src` bằng Cloudinary CDN URL (hỗ trợ responsive transformation).
- **Public Site Renderer (EJS SSR):** Các component hiển thị ảnh trực tiếp từ CDN URL tốc độ cao.
- **Publishing (GĐ 8):** Xuất bản Item Media từ Master sang Web. File trên Cloudinary dùng chung, không nhân bản.

---

## 3. Hệ Quả & Lợi Ích (Consequences)
- **Tích cực:**
  - Kiến trúc đạt độ thuần khiết 100% chuẩn Sitecore XM ("Everything is an Item").
  - Loại bỏ hoàn toàn sự cồng kềnh và rủi ro mất file của local disk storage.
  - Tận dụng sức mạnh CDN toàn cầu và tính năng auto-format (`f_auto, q_auto`) của Cloudinary mà không tốn tài nguyên CPU/RAM máy chủ cho Sharp.
  - Liên kết media bền vững, không bao giờ bị đứt gãy khi di chuyển hay đổi tên.
- **Lưu ý & Điểm cần kiểm soát:**
  - Cần bảo vệ nghiêm ngặt Cloudinary API Secret ở tầng server (`env.js`).
  - Reverse Sync cần xử lý rate limit (500 req/giờ của Cloudinary Admin API).

