---
phase: 5
name: Media Library (Quản lý Tài nguyên Số & Media Picker Modal)
status: Chưa bắt đầu
depends_on: [2, 3]
estimate: 2.5 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 5 - Media Library (Quản lý Tài nguyên Số & Media Picker Modal)
> Ứng dụng Media Library phân cấp cây thư mục, upload ảnh/file đa tệp, Sharp thumbnail và cửa sổ chọn Media Picker modal.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/media.md`](../data-model/media.md)

## Mục tiêu
Xây dựng ứng dụng Media Library quản lý tài nguyên số (hình ảnh, tài liệu) dạng cây thư mục, hỗ trợ upload nhiều tệp tin, tự động tạo ảnh thu nhỏ (thumbnail), và cung cấp cửa sổ Media Picker tích hợp liền mạch vào các field kiểu Image trong Content Editor cũng như sẵn sàng cho Datasource Items và Rendering Parameters của Presentation.

## Phạm vi
- **Làm:** Cây thư mục Media (phân cấp dưới `/sitecore/media library`); Upload file đơn và đa tệp sử dụng Multer; Tự động xử lý resize và thumbnail bằng `sharp`; Xem trước chi tiết media (kích thước, dung lượng, đường dẫn URL, alt text); Modal Media Picker tích hợp với Content Editor (chọn ảnh cho field Image, xem trước và gỡ bỏ ảnh; thiết kế module hoá sẵn sàng dùng cho các field của Datasource Items hoặc Rendering Parameters ở các giai đoạn sau).
- **Không làm:** Chưa làm chỉnh sửa cắt cúp ảnh trực tiếp trên trình duyệt (image cropping tool).

## Checklist Task
- [ ] **Task 5.1:** Xây dựng Mongoose Model `Media` (`src/models/Media.js`) lưu trữ: `name`, `displayName`, `isFolder`, `parentId`, `ancestors`, `path`, `fileDetails` (storagePath, thumbnailPath, mimeType, fileSize, dimensions), `altText`.
- [ ] **Task 5.2:** Cấu hình middleware `uploadMiddleware.js` sử dụng Multer: lọc loại file an toàn (jpeg, png, webp, svg, pdf), giới hạn kích thước (tối đa 10MB), lưu file vào thư mục `storage/uploads/YYYY/MM/`.
- [ ] **Task 5.3:** Xây dựng `mediaService.js`:
  - Quản lý thư mục media: tạo thư mục, lấy danh sách theo thư mục cha.
  - Xử lý file upload: gọi thư viện Sharp tạo ảnh thu nhỏ lưu vào `storage/thumbnails/`.
  - Xóa file media (xóa bản ghi và xóa tệp vật lý trên đĩa).
- [ ] **Task 5.4:** Xây dựng `mediaController.js` và route `src/routes/admin/mediaRoutes.js`:
  - `GET /admin/media-library`: Màn hình ứng dụng Media Library đầy đủ.
  - `POST /admin/media/upload`: Tiếp nhận upload tệp tin.
  - `POST /admin/media/create-folder`: Tạo thư mục media mới.
  - `GET /admin/media/picker`: Modal chọn ảnh dành cho Content Editor.
  - `GET /media/file/:id`: Route stream trả về tệp ảnh gốc hoặc thumbnail.
- [ ] **Task 5.5:** Thiết kế giao diện EJS Media Library:
  - `src/views/admin/media/library.ejs`: Cây thư mục bên trái, lưới hiển thị thumbnail ở giữa, bảng thuộc tính chi tiết bên phải.
  - `src/views/admin/media/picker-modal.ejs`: Cửa sổ pop-up cho phép duyệt cây media và chọn 1 ảnh để gán vào form.
- [ ] **Task 5.6:** Tích hợp field `Image` vào Content Editor:
  - Khi field có `type === "Image"`, hiển thị khung xem trước ảnh, nút "Browse" (mở Media Picker), và nút "Clear".
  - Khi người dùng chọn ảnh từ modal -> cập nhật ID và URL ảnh vào field tương ứng và hiển thị ngay preview.

## File/Thư mục Dự kiến
- `src/models/Media.js`
- `src/middlewares/uploadMiddleware.js`
- `src/services/mediaService.js`
- `src/controllers/admin/mediaController.js`
- `src/routes/admin/mediaRoutes.js`
- `src/views/admin/media/library.ejs`, `src/views/admin/media/picker-modal.ejs`
- `src/public/js/media-library.js`, `src/public/js/media-picker.js`

## Route / API Dự kiến
- `GET /admin/media-library`
- `POST /admin/media/upload`
- `POST /admin/media/create-folder`
- `DELETE /admin/media/:id`
- `GET /admin/media/picker`
- `GET /media/file/:id`

## Thay đổi Database
Collection `media` với các index `{ parentId: 1 }`, `{ path: 1 }`.

## Definition of Done & Cách kiểm thử
- Mở ứng dụng Media Library từ Launchpad hoặc Taskbar.
- Tạo thư mục con "Banners" bên dưới Media Library.
- Upload thử 2 bức ảnh JPG vào thư mục "Banners" -> Hệ thống sinh thumbnail hiển thị mượt mà trên giao diện lưới.
- Click vào 1 ảnh -> Hiển thị chính xác kích thước (width x height), dung lượng (KB), và cho phép sửa `Alt Text`.
- Quay lại Content Editor, mở một trang có trường `Hero Image`.
- Bấm nút "Browse" -> Modal Media Picker mở ra, điều hướng tới thư mục "Banners" và chọn bức ảnh vừa upload.
- Bấm "Select" -> Modal đóng lại, form lập tức hiển thị hình ảnh preview vừa chọn. Bấm "Save" lưu thành công.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Người dùng tải lên mã độc trá hình (ví dụ file `.php`, `.exe` đổi đuôi thành `.jpg`).
- *Giảm thiểu:* Kiểm tra MIME-type thực tế dựa trên magic bytes thay vì chỉ dựa vào phần mở rộng tệp tin; lưu tệp ngoài thư mục thực thi công khai và stream qua controller.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 5`)*

