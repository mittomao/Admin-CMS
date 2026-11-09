# DEC-046: Bảo Vệ Website Công Khai Bằng HTTP Basic Authentication

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày quyết định:** 2026-11-09
- **Người đề xuất:** Senior Full-stack Developer / Tech Lead
- **Phạm vi ảnh hưởng:** GĐ B1, Public Site Renderer, Middleware, Admin Launchpad, Settings Storage

---

## 1. Ngữ cảnh (Context)
Trong môi trường UAT / Staging hoặc trước khi ra mắt chính thức, website công khai cần được bảo vệ để chỉ những người dùng nội bộ hoặc khách hàng có thẩm quyền mới có thể truy cập, xem trước và kiểm thử nội dung. Yêu cầu đặt ra:
1. Xác thực nhanh chóng, chuẩn giao thức HTTP (RFC 7617), không dựng form HTML đăng nhập tùy biến cho trang công khai mà tận dụng hộp thoại gốc của trình duyệt.
2. Không ảnh hưởng đến trang quản trị `/admin`, các API nội bộ `/api`, và endpoint giám sát `/health`.
3. Cho phép cấu hình bật/tắt, quản lý tài khoản người dùng trực quan ngay trên Launchpad Admin (nhóm Control Panel).
4. Phải có cơ chế vô hiệu hóa khẩn cấp bằng biến môi trường và dòng lệnh (CLI) trong trường hợp có sự cố.

---

## 2. Quyết định Kỹ thuật (Decisions)

### 2.1. Lưu trữ Cấu hình trong Collection `settings`
- Sử dụng collection riêng `settings` với `key: 'basicAuth'`, không đưa cấu hình này thành Item trên cây nội dung để tránh phụ thuộc vào quy trình xuất bản (Publishing Engine) và tách biệt tuyệt đối giữa Content và Môi trường vận hành (Environment Settings).
- Cấu trúc dữ liệu:
  ```json
  {
    "key": "basicAuth",
    "value": {
      "enabled": false,
      "realm": "Treecraft Staging",
      "excludePaths": ["/health", "/robots.txt"],
      "ipAllowlist": [],
      "users": [
        {
          "username": "tester",
          "passwordHash": "$2a$10$...",
          "disabled": false,
          "createdAt": "2026-11-09T...",
          "createdBy": "admin"
        }
      ]
    },
    "updatedAt": "2026-11-09T...",
    "updatedBy": "admin"
  }
  ```

### 2.2. Vị trí và Cơ Chế Middleware (`basicAuthMiddleware`)
- Middleware được gắn trước Site Renderer (`siteRoutes`) và static site, sau `/health`.
- Bỏ qua kiểm tra đối với:
  - Yêu cầu tới `/admin`, `/api`, `/health`, `/admin/preview`.
  - Các đường dẫn nằm trong mảng `excludePaths`.
  - Địa chỉ IP client thuộc `ipAllowlist` (hỗ trợ kiểm tra IP / CIDR).
- Parse header `Authorization: Basic <base64>` an toàn:
  - Tách ở dấu `:` đầu tiên (cho phép mật khẩu chứa ký tự `:`).
  - So sánh mật khẩu bằng `bcrypt.compare` kết hợp `crypto.timingSafeEqual`.
  - Thông điệp 401 đồng nhất, không tiết lộ tài khoản có tồn tại hay không.

### 2.3. Chống Dò Mật Khẩu (Brute-Force Rate Limiting)
- Triển khai cơ chế In-Memory Token Bucket / Sliding Window gắn liền với middleware.
- Giới hạn tối đa 5 lần thử sai trong 15 phút theo cặp `(ip, username)`.
- Khi vượt ngưỡng: Trả về HTTP 429 Too Many Requests kèm header `Retry-After: 900`.

### 2.4. Phản hồi Bộ Nhớ Đệm (Caching) & Technical SEO
- Với mọi response trang công khai khi Basic Auth bật: thiết lập `Cache-Control: private, no-cache, no-store, must-revalidate` để ngăn CDN và proxy công khai lưu lại bản HTML nhạy cảm.
- Khi Basic Auth bật: Endpoint `GET /robots.txt` tự động trả về `User-agent: *\nDisallow: /` ngăn web crawler thu thập.

### 2.5. Cơ Chế Thoát Khẩn Cấp (Emergency Override & CLI)
- Biến môi trường `BASIC_AUTH_ENABLED=false` lập tức ghi đè và tắt Basic Auth ở tầng middleware bất kể trạng thái trong MongoDB.
- Cung cấp 2 công cụ CLI:
  - `npm run basicauth:disable`: Tắt trực tiếp cờ `enabled` trong database.
  - `npm run basicauth:add-user -- <username>`: Tạo tài khoản mới với mật khẩu nhập an toàn ẩn ký tự qua CLI prompt.

---

## 3. Hệ quả & Đánh giá (Consequences)
- **Tích cực:** Đáp ứng toàn diện các tiêu chuẩn bảo mật cho UAT/staging; không phụ thuộc thư viện bên ngoài; giao diện quản trị desktop-like đồng nhất với hệ thống Treecraft.
- **Lưu ý:** Cần cấu hình đúng `trust proxy` khi ứng dụng chạy sau reverse proxy (Nginx/Cloudflare) để `ipAllowlist` và rate limit IP hoạt động chính xác.

