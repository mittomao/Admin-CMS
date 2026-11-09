# DEC-050: Bảo Vệ Phân Vùng Quản Trị (Admin CMS) Bằng HTTP Basic Authentication

- **Trạng thái:** Đã duyệt
- **Ngày quyết định:** 2026-11-09
- **Người đề xuất:** Tech Lead / System Architect
- **Phạm vi ảnh hưởng:** GĐ B1, Admin CMS (`/admin`), Admin APIs (`/api`), Middleware, Launchpad

---

## 1. Ngữ cảnh (Context)
Trước đây (DEC-046), HTTP Basic Authentication được thiết kế để bảo vệ Website công khai (`/`, `/:slug`) trong môi trường UAT/Staging.
Tuy nhiên, theo yêu cầu nghiệp vụ thực tế của dự án:
- Website công khai khi xuất bản cần hoạt động tự do (Open Access), không làm phiền khách truy cập hoặc crawler bằng hộp thoại đăng nhập HTTP.
- Thay vào đó, phân vùng Quản trị (**Admin CMS** bao gồm `/admin` và các API nội bộ `/api`) cần được gia cố bảo mật bằng lớp bảo vệ chu vi **HTTP Basic Authentication** chuẩn RFC 7617.
- Điều này tạo nên kiến trúc bảo mật **Phòng thủ Theo Chiều sâu (Defense-in-Depth - 2 lớp xác thực)**:
  - **Lớp 1 (Perimeter Defense):** HTTP Basic Authentication ở cấp độ giao thức HTTP, chặn đứng các cuộc tấn công brute-force quét cổng hoặc quét endpoint `/admin`.
  - **Lớp 2 (Application Auth):** Đăng nhập phiên tài khoản Treecraft (`/admin/login`, Session Cookie, Phân quyền RBAC & ACL `canPerform`).

---

## 2. Quyết định Kỹ thuật (Decisions)

### 2.1. Phạm vi Can Thiệp của `basicAuthMiddleware`
- **Áp dụng:** Toàn bộ request có đường dẫn bắt đầu bằng `/admin` hoặc `/api`.
- **Miễn trừ:**
  - Endpoint giám sát trạng thái `/health`.
  - Toàn bộ website công khai (`/`, `/:slug`, `/media/file/...`, `/robots.txt`, `/sitemap.xml`, các tài nguyên tĩnh CSS/JS công khai).
  - Các địa chỉ IP nằm trong `ipAllowlist` (hỗ trợ so khớp chính xác và dải IPv4 CIDR).
  - Các đường dẫn cấu hình trong `excludePaths`.
  - Khi biến môi trường `BASIC_AUTH_ENABLED=false` (công tắc ngắt khẩn cấp).

### 2.2. Phản hồi Khi Chưa Xác Thực (HTTP 401)
- Header chuẩn: `WWW-Authenticate: Basic realm="<realm>", charset="UTF-8"`.
- Header bảo vệ: `Cache-Control: no-store, no-cache, must-revalidate, private`.
- **Phân biệt kiểu phản hồi:**
  - Yêu cầu trang HTML (`/admin/*`): Trả về mã HTTP 401 kèm giao diện thiết kế chuyên dụng cho Admin CMS ("401 - Yêu Cầu Xác Thực Phân Vùng Quản Trị").
  - Yêu cầu JSON / API (`/api/*` hoặc `Accept: application/json`): Trả về JSON `{ success: false, message: 'Authentication Required (Basic Auth for Admin API)' }`.

### 2.3. Chống Brute-Force Rate Limiting
- Lưu trữ trong bộ nhớ (In-memory Sliding Window / Rate Limit Store) theo cặp `(clientIp, username)`.
- Tối đa 5 lần thử sai trong cửa sổ 15 phút. Khi vượt ngưỡng, tạm khoá 15 phút với mã lỗi HTTP 429 (Too Many Requests) cùng header `Retry-After`.

### 2.4. Công cụ Khẩn cấp (CLI)
- Tắt khẩn cấp không cần khởi động lại máy chủ: `npm run basicauth:disable`.
- Thêm hoặc cập nhật tài khoản quản trị viên Basic Auth: `npm run basicauth:add-user -- <username>`.

---

## 3. Hệ Quả & Tác Động (Consequences)
- Website công khai hoàn toàn tự do truy cập, không bị ảnh hưởng bởi cờ Basic Auth.
- `robots.txt` không còn trả về `Disallow: /` khi Basic Auth bật.
- Mọi quản trị viên khi truy cập `/admin` cần xác thực qua hộp thoại Basic Auth một lần trên trình duyệt trước khi tiếp cận form đăng nhập Treecraft.

