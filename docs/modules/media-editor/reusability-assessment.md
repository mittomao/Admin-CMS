# Reusability Assessment – Đánh Giá Khả Năng Tái Sử Dụng & Nợ Kỹ Thuật

Tài liệu này cung cấp báo cáo đánh giá kiến trúc độc lập (Architecture Audit Report) của Senior Full-stack Engineer về toàn bộ các thành phần trong module Media Library và Rich Text Editor.

Mọi thành phần được phân loại thành 4 cấp độ:
- 🟢 **Reusable (Tái sử dụng trực tiếp)**: Mã nguồn hoàn chỉnh, chuẩn hóa, có thể copy & paste với ít hoặc không cần sửa đổi.
- 🟡 **Adaptable (Cần tùy biến)**: Logic rất tốt nhưng cần điều chỉnh để khớp với framework, CSS hoặc cơ chế xác thực của dự án mới.
- 🔵 **Project-specific (Đặc thù dự án)**: Thành phần gắn chặt với cấu trúc riêng của `Blog_Express_App`.
- 🔴 **Deprecated / Broken (Lỗi thời / Hỏng / Không sử dụng)**: Mã nguồn di sản, schema mồ côi hoặc liên kết demo cần loại bỏ.

---

## 1. Bảng Phân Loại Tổng Thể Các Thành Phần (Component Matrix)

| Thành phần | Đường dẫn tệp tin | Phân loại | Đánh giá & Khuyến nghị kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Client Compressor** | `public/js/admin/utils.js` (`compressImageClient`) | 🟢 **Reusable** | Thuần HTML5 Canvas, không phụ thuộc thư viện ngoài. Tự động nén ảnh giữ tỷ lệ, giảm 70-85% dung lượng trước khi upload. |
| **TinyMCE Controller** | `public/js/admin/tinymce.js` | 🟢 **Reusable** | Cấu hình chuẩn TinyMCE 6, đăng ký button và interceptor `file_picker_callback` rất mượt mà. |
| **Storage Helper** | `utils/cloudinary.js` | 🟢 **Reusable** | Đầy đủ tính năng: Search API, Sub-folders, Cursor pagination, Multer storage và Error fallback. |
| **MediaBrowser SPA** | `public/js/admin/media-browser.js` | 🟡 **Adaptable** | Lớp OOP 1027 dòng xử lý cực tốt State, Tree, Grid, Bulk mode, Drag&Drop. Cần điều chỉnh nếu dự án mới không dùng jQuery/Tabler. |
| **Media Core View** | `views/admin/partials/media-browser-core.ejs` | 🟡 **Adaptable** | Giao diện EJS chuẩn Tabler / Bootstrap 5. Cần chuyển đổi sang JSX / TSX nếu dự án mới dùng React / Next.js / Vue. |
| **Media Controllers**| `controllers/indexController.js` (phần media) | 🟡 **Adaptable** | Logic xử lý request/response RESTful chuẩn. Cần tách thành một controller độc lập `mediaController.js`. |
| **Modal Wrapper** | `views/admin/partials/cloudinary-modal.ejs` | 🟡 **Adaptable** | Modal Bootstrap 5 bọc giao diện lõi. Cần chỉnh sửa class nếu dùng Tailwind Dialog / Radix UI. |
| **Session Middleware**| `utils/middleware.js` (`checkLogin`) | 🔵 **Project-specific** | Phụ thuộc vào biến `req.session.account.loggedin`. Dự án mới dùng JWT / Bearer Token cần thay thế. |
| **Post Persistence** | `controllers/blogController.js`, `blogModel.js` | 🔵 **Project-specific** | Cấu trúc dữ liệu bài viết gắn riêng với blog hiện tại. |
| **FLMNGR Server** | `@flmngr/flmngr-server-node-express` & `bindFlmngr` | 🔴 **Deprecated/Broken** | **Không dùng**. Code thừa từ phiên bản cũ, ghi file cục bộ vào `./public/images`, không có bất kỳ client nào gọi. |
| **Demo TinyMCE Link** | `views/admin/partials/block-script.ejs` (link flmngr.com) | 🔴 **Deprecated/Broken** | **Không an toàn cho Production**. Là đường link demo từ trang web thứ ba. Phải thay bằng official CDN hoặc npm package. |
| **Images Model** | `models/imagesModel.js` | 🔴 **Deprecated/Broken** | **Schema mồ côi**. Không có controller nào gọi, không có dữ liệu thực tế trong MongoDB. |
| **FLMNGR Key Env** | `env.example` (`FLMNGR_KEY`) | 🔴 **Deprecated/Broken** | Tàn dư cấu hình cũ, không có tác dụng trong luồng chạy. |

---

## 2. Phân Tích Chi Tiết Các Vấn Đề Tồn Tại & Nợ Kỹ Thuật (Technical Debts & Gotchas)

Khi trích xuất sang dự án mới, kỹ sư bắt buộc phải lưu ý 5 vấn đề kỹ thuật sau:

### 2.1. Hạn Mức Tốc Độ Của Cloudinary Search API (Rate Limiting)
- **Vấn đề**: Cloudinary Search API trên gói miễn phí (Free Tier) có giới hạn khoảng **500 requests/giờ**.
- **Hiện trạng trong code**: Trong `utils/cloudinary.js`, tác giả đã khéo léo bọc khối `try...catch` để tự động chuyển sang `cloudinary.api.resources()` nếu Search API vượt hạn mức hoặc lỗi. Tuy nhiên, ở chế độ fallback này, việc lọc format và từ khóa phải thực hiện trong bộ nhớ RAM (`list.filter(...)`), chỉ giới hạn được trong 100 tài nguyên gần nhất.
- **Khuyến nghị cho dự án lớn**: Nếu dự án mới có quy mô nhiều người dùng truy cập cùng lúc, nên áp dụng kiến trúc lưu metadata vào CSDL MongoDB như đã mô tả trong `database-api-design.md`, thay vì truy vấn trực tiếp Cloudinary Search API ở mỗi lượt gõ phím tìm kiếm.

### 2.2. Hạn Chế Khi Xóa Thư Mục Trên Cloudinary
- **Vấn đề**: Cloudinary quy định một thư mục chỉ có thể bị xóa khi nó **hoàn toàn trống** (không chứa tệp tin và không chứa bất kỳ thư mục con nào).
- **Hiện trạng trong code**: Nút "Delete Folder" trong `media-browser.js` đã có thông báo nhắc nhở người dùng: *"The folder must be completely empty"*. Tuy nhiên, nếu người dùng vẫn cố bấm xóa một thư mục có chứa ảnh, API sẽ trả về lỗi HTTP 500 kèm thông báo từ Cloudinary.
- **Khuyến nghị cho dự án mới**: Cần bổ sung tính năng "Xóa đệ quy" (Recursive Delete): Lấy toàn bộ tài nguyên bên trong thư mục con, xóa sạch tài nguyên trước, sau đó mới gọi lệnh xóa thư mục.

### 2.3. Quy Tắc Đặt Tên File Để Tránh Trùng Lặp (Public ID Collision)
- **Vấn đề**: Trong `utils/cloudinary.js`, public_id được sinh bằng:
  ```javascript
  public_id: `${Date.now()}-${name}`
  ```
- Nếu người dùng upload đồng thời 10 ảnh trong cùng 1 mili-giây, `Date.now()` có thể bị trùng nếu các file có cùng tên gốc.
- **Khuyến nghị cho dự án mới**: Bổ sung chuỗi ngẫu nhiên hoặc UUID:
  ```javascript
  const crypto = require('crypto');
  public_id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${name}`
  ```

### 2.4. Sự Phụ Thuộc Vào Toàn Cục (Global State / Window Object)
- Trong `public/js/admin.js`, các hàm điều khiển modal được gắn vào `window`:
  ```javascript
  window.AdminNotifier = AdminNotifier;
  window.showMediaBrowserModal = showMediaBrowserModal;
  window.hideMediaBrowserModal = hideMediaBrowserModal;
  window.setMediaPickerCallback = setMediaPickerCallback;
  ```
- **Khuyến nghị cho dự án mới**: Nếu dự án mới dùng TypeScript hoặc Module bundler hiện đại (Vite / Webpack / Turbopack), nên đóng gói các hàm này vào một Event Emitter hoặc Custom Event (`window.dispatchEvent(new CustomEvent('open-media-picker', { detail: callback }))`) để tránh làm ô nhiễm namespace toàn cục.

### 2.5. Xử Lý Giữ Session Đăng Nhập Khi Upload Ảnh Dài
- Trong TinyMCE `images_upload_handler`, nếu người dùng viết bài trong 2-3 tiếng và phiên session bị hết hạn, khi kéo thả ảnh vào editor, server sẽ trả về mã `HTTP 401`.
- Mã nguồn hiện tại đã xử lý rất tốt: Gọi `reject('Session expired. Please login again.')` và không làm crash editor. Tuy nhiên, người dùng có thể mất nội dung đang viết dở nếu điều hướng đi đăng nhập lại.
- **Khuyến nghị cho dự án mới**: Khi gặp lỗi 401, mở một popup nhỏ hoặc modal đăng nhập nhanh ngay trên màn hình (re-authentication modal) mà không reload lại trang để bảo vệ nội dung bài viết.

