# Công nghệ và Thư viện Lựa chọn
> File: `docs/rules/02-tech-stack.md`  
> Mô tả: Danh mục công nghệ, thư viện chính trong dự án, vai trò và lý do lựa chọn kỹ thuật.

---

## 1. Bảng Công nghệ & Thư viện Chính

| Công nghệ / Thư viện | Vai trò | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Node.js (v20+ LTS) + Express.js** | Backend Web Framework | Nền tảng hướng sự kiện, non-blocking I/O tối ưu cho các thao tác đọc/ghi cây dữ liệu; pipeline middleware linh hoạt, dễ tích hợp bảo mật và session. Phục vụ chung cả Admin CMS (`/admin`) và Public Website (`/`) trên cùng cổng 4000. |
| **EJS (Embedded JavaScript)** | Server-Side Rendering (SSR) | Cú pháp JavaScript tự nhiên, hỗ trợ layout/partials mạnh mẽ qua `express-ejs-layouts`. Render nhanh chóng phía server cả giao diện Admin lẫn 100% Website công khai qua cơ chế Site Renderer; loại bỏ hoàn toàn React, Next.js và overhead của SPA. |
| **Client Script (Vanilla JS + Alpine.js)** | UI Interactivity | Giữ mã client nhẹ, tối giản dependencies; Alpine.js cung cấp reactive state cục bộ mượt mà cho các modal, dropdown, tabs mà không cần build step phức tạp. |
| **Fancytree** | Cây nội dung (Content Tree) | Hỗ trợ Lazy Loading node qua AJAX, Virtual Scrolling xử lý hàng chục ngàn item mượt mà, hỗ trợ Context Menu, Drag & Drop HTML5 native (`dnd5`), và Keyboard Navigation chuyên nghiệp. |
| **SortableJS** | Kéo thả sắp xếp | Thư viện kéo thả nhẹ (~10KB), ổn định để sắp xếp thứ tự Fields, Sections, Form Controls và danh sách Renderings trong Presentation Details. |
| **TinyMCE** | Rich Text WYSIWYG Editor | Chuẩn công nghiệp cho CMS doanh nghiệp; hỗ trợ plugin Media Picker tùy biến, kiểm soát chặt chẽ mã HTML đầu ra. |
| **MongoDB + Mongoose** | Cơ sở dữ liệu NoSQL | Cấu trúc Item linh hoạt (schema-less ở cấp độ fields động do template quy định), hỗ trợ truy vấn phân cấp mạnh mẽ qua Ancestors Array / Materialized Path và Transaction ACID khi cần. |
| **express-session + connect-mongo** | Quản lý Session | Lưu trữ session tập trung trong collection `sessions` của MongoDB, an toàn, hỗ trợ mở rộng nhiều node server và không bị mất đăng nhập khi khởi động lại ứng dụng. |
| **Multer + Cloudinary SDK** | File Upload & Lưu trữ Đám mây (GĐ 5.1 & DEC-038) | Multer kiểm soát upload file streaming trong bộ nhớ (memory buffer); Cloudinary SDK truyền tải nhị phân lên Cloudinary (`AdminCMS`), sinh transformation URL tự động (thay thế xử lý cục bộ của `sharp`). |
| **Helmet + CSURF / Double-Submit Cookie** | Bảo mật Web | Thiết lập các HTTP response headers bảo vệ (X-Frame-Options, CSP, HSTS); cơ chế chống giả mạo yêu cầu chéo trang (CSRF) cho cả Form POST và Fetch/AJAX. |
| **DOMPurify / sanitize-html** | Làm sạch dữ liệu Rich Text | Ngăn chặn triệt để tấn công Stored XSS khi biên tập viên dán mã HTML/JS từ bên ngoài vào; cấu hình lọc script, iframe tại tầng server. |
| **bcryptjs** | Băm mật khẩu | Tiêu chuẩn mã hóa một chiều an toàn chống rainbow table và brute-force với salt rounds = 10 đóng gói trực tiếp trong User Mongoose schema. |
| **Winston / Morgan** | Logging hệ thống | Morgan ghi nhận HTTP request logs; Winston quản lý application logging tập trung đa cấp độ (info, warn, error) có màu console trong dev và JSON trong production. |

---

## 2. Nguyên tắc Bổ sung Thư viện Mới
- Không tự ý cài đặt thêm các thư viện nằm ngoài bảng danh mục trên nếu chưa thảo luận và được sự chấp thuận của người dùng.
- Ưu tiên sử dụng thư viện native của Node.js (ví dụ `crypto`, `path`, `fs`) trước khi cân nhắc cài thêm package bên thứ ba.

