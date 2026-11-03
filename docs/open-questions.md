# CÂU HỎI CẦN XÁC NHẬN (OPEN QUESTIONS)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần Product Owner / Tech Lead xác nhận, kèm theo đề xuất mặc định của kiến trúc sư và trạng thái hiện tại.

---

### 1. Quản lý Layout/Rendering/Placeholder Settings trong Content Editor hay trang riêng?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-024: Quản lý Layout/Rendering như Item Hệ thống](decisions/DEC-024-presentation-items-in-content-tree.md)
- **Lựa chọn A (Đề xuất mặc định):** Quản lý ngay trong Content Editor dưới nhánh cây hệ thống `/sitecore/layout/*` (Everything is an Item), form biên tập tự động sinh theo System Template (`Layout`, `Rendering`, `Placeholder Settings`).
- **Lựa chọn B:** Xây dựng ứng dụng quản trị riêng biệt ngoài Content Editor (ví dụ giao diện "Presentation Manager" trên Launchpad).
- **Lý do đề xuất:** Tuân thủ triệt để triết lý Sitecore "Mọi thứ là Item", tái sử dụng 100% nền tảng Content Editor (Fancytree, CRUD, ACL, Template inheritance) mà không phải viết thêm trang quản trị riêng.

---

### 2. Cơ chế lưu trữ Presentation của Item (Lưu toàn bộ hay Delta Override)?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-020](decisions/DEC-020-presentation-shared-vs-final.md), [DEC-021: Phân giải Delta Override](decisions/DEC-021-presentation-delta-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Delta Override** so với Standard Presentation của Template. Item chỉ lưu danh sách thay đổi (thêm rendering mới, ghi đè datasource/parameters/sortOrder, hoặc đánh dấu ẩn rendering từ Standard).
- **Lựa chọn B:** Lưu trọn vẹn toàn bộ mảng Renderings của Item khi biên tập.
- **Lý do đề xuất:** Khi cấu hình Standard Presentation ở Template thay đổi (ví dụ thêm footer component), tất cả các item chưa override sẽ tự động thừa hưởng thay đổi đó ngay lập tức; đồng thời tối ưu kích thước document MongoDB.

---

### 3. Cú pháp Placeholder Key động (`column-{*}`) ở MVP
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-022: Quy tắc Khớp Dynamic Placeholder Keys](decisions/DEC-022-dynamic-placeholder-matching.md)
- **Lựa chọn A (Đề xuất mặc định):** Có hỗ trợ ở mức đơn giản bằng ánh xạ Wildcard sang Regular Expression (ví dụ: `column-{*}` khớp với `column-1`, `column-left`, `column-2`).
- **Lựa chọn B:** Chỉ hỗ trợ các key placeholder tĩnh tuyệt đối (như `main`, `header`, `footer`).
- **Lý do đề xuất:** Cực kỳ quan trọng để frontend React xây dựng các component layout dạng lưới (Grid 2 cột, 3 cột) mà không phải cấu hình hàng chục Placeholder Settings thủ công.

---

### 4. Tách Presentation theo Device ngay từ GĐ 6
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-019](decisions/DEC-019-presentation-phase-position.md), [phase-06-presentation.md](phases/phase-06-presentation.md)
- **Lựa chọn A (Đề xuất mặc định):** Có, thiết kế hỗ trợ 2 device cơ bản là `Default` và `Mobile` (với `Mobile` có thể fallback về `Default`).
- **Lựa chọn B:** Chỉ hỗ trợ 1 thiết bị duy nhất ở MVP.
- **Lý do đề xuất:** Định hình cấu trúc dữ liệu schema chuẩn hóa ngay từ đầu tránh phải migration phức tạp sau này; giao diện tab Device đơn giản, dễ sử dụng.

---

### 5. Xử lý Datasource chưa publish khi Publish Item
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-023: Xử lý Datasource Chưa Publish](decisions/DEC-023-publish-datasource-warning.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cảnh báo (Warning)** trong Publish Dialog và cung cấp checkbox "Publish kèm các Datasource liên đới", cho phép người dùng quyết định tiếp tục publish.
- **Lựa chọn B:** Chặn cứng (Hard Block), không cho phép publish item nếu có bất kỳ datasource nào chưa được publish lên Web.
- **Lý do đề xuất:** Giúp trải nghiệm biên tập linh hoạt; trên frontend React, nếu datasource thiếu thì Layout Service trả `fields: null` và component tự xử lý fallback an toàn mà không làm gãy toàn bộ trang.

---

### 6. Định dạng JSON của Layout Service đối với React Frontend
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-021](decisions/DEC-021-presentation-delta-resolution.md), [phase-10-delivery-layout-api.md](phases/phase-10-delivery-layout-api.md)
- **Lựa chọn A (Đề xuất mặc định):** Định dạng chuẩn Headless tương tự Sitecore JSS Layout Service (gồm đối tượng `route` và bản đồ `placeholders: { [key]: components[] }`), tối giản phù hợp với Component Factory của React.
- **Lựa chọn B:** Tuân thủ 100% toàn bộ metadata phức tạp của Sitecore Layout Service (kể cả context tracking, visitor data).
- **Lý do đề xuất:** Giữ JSON tinh gọn, giảm payload network, tối ưu tốc độ render cho Next.js/React.

---

### 7. Bổ sung Tile "Presentation" riêng trên Dashboard Launchpad
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-010: Role-based Launchpad](decisions/DEC-010-role-based-launchpad.md), [DEC-024](decisions/DEC-024-presentation-items-in-content-tree.md)
- **Lựa chọn A (Đề xuất mặc định):** Không cần tile riêng; người dùng thao tác Presentation Details trực tiếp qua Ribbon tab `Presentation` trong Content Editor, và cấu hình Layout/Rendering tại nhánh `/sitecore/layout/`.
- **Lựa chọn B:** Tạo một tile "Presentation Designer" riêng trên Launchpad.
- **Lý do đề xuất:** Giữ Launchpad gọn gàng, đúng luồng tác vụ Sitecore tiêu chuẩn.

---

### 8. Mức độ ưu tiên của Experience Editor đơn giản (WYSIWYG Preview trong iframe)
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [phase-11-extensions.md](phases/phase-11-extensions.md)
- **Lựa chọn A (Đề xuất mặc định):** Xếp vào danh sách mở rộng ở **GĐ 11 với mức ưu tiên thấp (Optional)**. Trọng tâm cốt lõi là hoàn thiện Content Editor form-based và Headless Layout Service ổn định.
- **Lựa chọn B:** Làm ngay Experience Editor WYSIWYG cùng lúc ở GĐ 6.
- **Lý do đề xuất:** Làm WYSIWYG in-line cho headless React rất tốn thời gian (cần iframe bridge, postMessage sync, content editable tags), trong khi MVP headless chỉ cần Layout Service trả JSON chính xác cho frontend.

---

### 9. Lựa chọn Storage Provider mặc định cho GĐ 5 (Local Disk vs Cloudinary)
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md), [phase-05-reference-mapping.md](phases/phase-05-reference-mapping.md)
- **Lựa chọn A (Đề xuất mặc định):** Triển khai lớp trừu tượng `StorageProvider` với **`LocalStorageProvider` làm mặc định** (lưu đĩa nội bộ tại `storage/uploads/YYYY/MM/`, tạo thumbnail tự động bằng `sharp`). Thiết kế sẵn adapter interface để có thể cấu hình `CloudinaryStorageProvider` qua biến `.env` sau này mà không sửa đổi nghiệp vụ.
- **Lựa chọn B:** Bắt buộc tích hợp trực tiếp Cloudinary SDK ngay từ đầu bằng tài khoản Cloudinary của người dùng.
- **Lý do đề xuất:** Giúp hệ thống tự vận hành độc lập (self-contained), không phụ thuộc mạng hay tài khoản ngoài, chạy test Jest/CI cực nhanh và tránh bị rate limit (500 req/giờ của Cloudinary free tier).

---

### 10. Kiểm tra Magic Bytes nhị phân khi Upload: Dùng thư viện hay Sniffing Buffer nội bộ?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md), [docs/rules/05-security.md](rules/05-security.md)
- **Lựa chọn A (Đề xuất mặc định):** Xây dựng **Sniffing Buffer nội bộ thuần Node.js** (đọc vài bytes đầu file kiểm tra chữ ký chuẩn của JPEG `FF D8 FF`, PNG `89 50 4E 47`, GIF `47 49 46 38`, WebP `52 49 46 46`, PDF `25 50 44 46`), không cần cài thêm thư viện ngoài; đồng thời dùng `sanitize-html` để làm sạch SVG.
- **Lựa chọn B:** Cài đặt package bên ngoài `file-type`.
- **Lý do đề xuất:** Không phát sinh thêm package ngoài (thư viện `file-type` hiện là Pure ESM có thể gây xung đột với CommonJS của dự án), đáp ứng trọn vẹn yêu cầu bảo mật chống đổi đuôi file giả mạo (.exe/.php -> .jpg).

---

### 11. Thư mục đích mặc định cho tệp tải lên từ Rich Text Editor (Paste / Drag-Drop)
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md)
- **Lựa chọn A (Đề xuất mặc định):** Tự động lưu vào thư mục hệ thống chuyên biệt: `/sitecore/media library/Editor Uploads/YYYY/MM/`.
- **Lựa chọn B:** Lưu thẳng vào thư mục gốc `/sitecore/media library/`.
- **Lựa chọn C:** Yêu cầu người dùng chọn thư mục đích mỗi lần paste/kéo ảnh.
- **Lý do đề xuất:** Tránh làm rác và lộn xộn thư mục gốc Media Library, phân tách rõ ràng tài nguyên được upload nhanh qua bài viết và tài nguyên được biên tập có chủ đích trong Media Library.

---

### 12. Phương thức Tải Thư viện TinyMCE 6 cho Rich Text Editor
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md)
- **Lựa chọn A (Đề xuất mặc định):** Tải bản TinyMCE 6 Community Edition chính thức từ CDN jsDelivr (`https://cdn.jsdelivr.net/npm/tinymce@6.8.3/tinymce.min.js`), loại bỏ hoàn toàn liên kết demo `flmngr.com`.
- **Lựa chọn B:** Cài đặt npm package `tinymce` và copy tài nguyên tĩnh vào thư mục `public/vendor/tinymce`.
- **Lý do đề xuất:** jsDelivr CDN nhẹ, nhanh, ổn định, không làm tăng dung lượng Git repository, hoàn toàn miễn phí và không có rủi ro phụ thuộc demo bên thứ ba.

---

### 13. Cơ chế Lưu trữ Hình ảnh trong Nội dung Rich Text HTML
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-013](decisions/DEC-013-sanitize-html-server.md), [DEC-028](decisions/DEC-028-media-richtext-reference.md)
- **Lựa chọn A (Đề xuất mặc định):** Thẻ `<img>` lưu thuộc tính bất biến: `<img src="/media/file/:id" data-media-id=":id" alt="..." />`. Khi xuất ra Layout Service (GĐ 10) hoặc render preview, hệ thống gọi hàm `resolveRichText(html)` để phân giải link động.
- **Lựa chọn B:** Chỉ lưu đường dẫn cứng `src="https://..."` như dự án blog cũ.
- **Lý do đề xuất:** Nếu media bị di chuyển thư mục, đổi tên hoặc thay thế tệp (replace), định danh `data-media-id` vẫn giữ liên kết nguyên vẹn không bao giờ bị gãy hình ảnh (broken image).

---

### 14. Cơ chế Chèn Liên kết Nội bộ (Internal Link) tới Item trong Rich Text
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md)
- **Lựa chọn A (Đề xuất mặc định):** Xây dựng hộp thoại Modal chọn Item từ cây nội dung (tái sử dụng cấu trúc Fancytree), chèn thẻ `<a href="/sitecore/content/..." data-item-id=":id">`.
- **Lựa chọn B:** Chỉ cho phép người dùng nhập tay đường dẫn URL vào hộp thoại Link chuẩn của TinyMCE.
- **Lý do đề xuất:** Biên tập viên dễ dàng duyệt cây để chọn trang đích mà không cần nhớ đường dẫn URL, và khi item đích đổi slug/path thì `data-item-id` vẫn giúp hàm `resolveRichText` sửa link chính xác.

---

### 15. Quy tắc Xử lý khi Phát hiện Tệp tin Trùng lặp (Checksum Match)
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md)
- **Lựa chọn A (Đề xuất mặc định):** Khi upload, hệ thống tính hash SHA-256. Nếu trong cùng thư mục đã có file cùng checksum, hiển thị thông báo phát hiện trùng và cho phép người dùng chọn: **"Dùng lại file hiện có"** hoặc **"Tải lên bản sao mới"** (sinh tên `filename (1).ext`).
- **Lựa chọn B:** Tự động ghi đè tệp tin cũ không hỏi.
- **Lựa chọn C:** Chặn cứng (báo lỗi không cho upload).
- **Lý do đề xuất:** Tiết kiệm dung lượng lưu trữ, giúp người dùng nhận biết tránh trùng lặp nhưng vẫn linh hoạt cho phép tạo bản sao nếu họ muốn.

---

### 16. Hành vi Xóa Item Media đối với Tệp tin Vật lý trên Đĩa
- **Trạng thái:** Đã có đề xuất mặc định (Chờ User chốt)
- **Quyết định liên quan:** [DEC-028](decisions/DEC-028-media-richtext-reference.md), [phase-09-recycle-bin-audit.md](phases/phase-09-recycle-bin-audit.md)
- **Lựa chọn A (Đề xuất mặc định):** Chỉ thực hiện **Soft Delete** (đánh dấu `isDeleted: true`, gán `deletedAt`), giữ nguyên tệp vật lý trên đĩa. Việc dọn dẹp vĩnh viễn tệp vật lý sẽ được thực hiện khi người dùng dọn Thùng rác (Recycle Bin - GĐ 9).
- **Lựa chọn B:** Xóa vĩnh viễn file vật lý trên đĩa ngay lập tức khi xóa item.
- **Lý do đề xuất:** Bảo vệ dữ liệu chống thao tác xóa nhầm của người dùng, đảm bảo khả năng khôi phục (Restore) nguyên vẹn từ Recycle Bin ở Giai đoạn 9.

---

### 17. Vị trí Lưu trữ của Devices và Placeholder Settings trong Cây Nội dung
- **Trạng thái:** Đã có đề xuất mặc định (Chờ PO chốt)
- **Quyết định liên quan:** [DEC-024](decisions/DEC-024-presentation-items-in-content-tree.md), [DEC-030](decisions/DEC-030-layout-tree-structure-and-node-protection.md)
- **Lựa chọn A (Đề xuất mặc định):** Đặt trực tiếp dưới nhánh `/sitecore/layout` làm các node cùng cấp:
  - `/sitecore/layout/Layouts` (sortOrder: 100)
  - `/sitecore/layout/Renderings` (sortOrder: 200)
  - `/sitecore/layout/Devices` (sortOrder: 300)
  - `/sitecore/layout/Placeholder Settings` (sortOrder: 400)
- **Lựa chọn B:** Chỉ giữ `Layouts` và `Renderings` dưới `/sitecore/layout`; chuyển `Devices` và `Placeholder Settings` sang nhánh `/sitecore/system/` (ví dụ `/sitecore/system/Settings/Devices`).
- **Lý do đề xuất:** Gom trọn vẹn toàn bộ cấu hình Presentation vào duy nhất một nhánh gốc `/sitecore/layout`, chuẩn theo cấu trúc truyền thống của Sitecore, giúp phân quyền `presentation:write` tập trung, rõ ràng và nhất quán.


