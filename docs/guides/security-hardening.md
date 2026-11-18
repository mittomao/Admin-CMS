# Hướng Dẫn Thiết Lập An Ninh Môi Trường Production (Security Hardening Runbook)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Áp dụng cho:** Quản trị viên hệ thống (SecOps, DevOps) và Tech Lead

---

## 1. Mục Đích / Khi Nào Sử Dụng
- Hướng dẫn thiết lập, kiểm tra và bảo đảm an ninh toàn diện trước khi phát hành Treecraft CMS ra môi trường Internet (Production).
- Áp dụng khi:
  - Chuẩn bị Go-Live hệ thống website chính thức.
  - Định kỳ rà soát lỗ hổng an ninh (Security Audit & Compliance).
  - Cấu hình chốt chặn phòng thủ Brute Force, Session Fixation, XSS, CSRF, IDOR và bảo vệ chu vi Basic Auth.

---

## 2. Điều Kiện Tiên Quyết
- Quyền root/sudo hoặc quyền quản trị trên máy chủ hoặc container.
- Chứng chỉ SSL/TLS (HTTPS) đã được thiết lập qua Reverse Proxy (Nginx, Cloudflare, Traefik, AWS ALB).
- Phiên bản Node.js LTS `v20.x` trở lên.

---

## 3. Các Bước Thực Hiện (Windows / macOS / Linux)

### Bước 1: Thiết lập biến môi trường an toàn

Tạo file `.env.production` trên máy chủ với các giá trị nghiêm ngặt:
```env
# 1. Chế độ môi trường nghiêm ngặt
APP_ENV=production
NODE_ENV=production

# 2. Khóa bí mật Session (Tối thiểu 32 ký tự ngẫu nhiên entropy cao)
SESSION_SECRET=c5f78b12e34a901842d5f8120e983421b87a912c45d3e0291f
SESSION_MAX_AGE=86400000

# 3. Kích hoạt ủy quyền tin cậy qua Reverse Proxy
TRUST_PROXY=true

# 4. Khóa mã hóa sao lưu dữ liệu K1 (AES-256-GCM)
BACKUP_ENCRYPTION_KEY=my_ultra_secure_backup_key_2026_aes256

# 5. Lá chắn chu vi bảo vệ Admin (Basic Auth Perimeter Defense - Khuyến nghị cho Production)
BASIC_AUTH_ENABLED=true
```

---

### Bước 2: Kích hoạt lá chắn chu vi Basic Auth (Bảo vệ URL `/admin`)

Để ngăn chặn botnet và hacker quét đường dẫn `/admin/login`, kích hoạt Basic Auth perimeter:
```bash
# Thêm người dùng truy cập lớp bảo vệ chu vi
npm run basicauth:add-user -- --username secureops --password "UltraSecretPass2026!"
```

---

### Bước 3: Đổi mật khẩu tài khoản Quản trị viên mặc định (`admin`)

Đăng nhập vào `/admin` và đổi mật khẩu cho tài khoản `admin`:
- Yêu cầu mật khẩu tối thiểu: 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
- Hệ thống tự động tái tạo session ID (`req.session.regenerate()`) để chống Session Fixation.

---

### Bước 4: Kiểm tra tính bất biến của Core Submodule

Chạy lệnh xác minh để bảo đảm không ai chỉnh sửa mã nguồn lõi:
```bash
npm run core:check
```

---

### Bước 5: Chạy công cụ chẩn đoán tổng thể (Doctor)

```bash
npm run doctor
```

---

## 4. Kết Quả Mong Đợi
- **Content Security Policy (CSP):**
  - Public Site: Chặn hoàn toàn `'unsafe-eval'`.
  - HSTS (`Strict-Transport-Security`): Kích hoạt với thời hạn `maxAge: 31536000` (1 năm).
  - `X-Content-Type-Options: nosniff` và `Referrer-Policy: strict-origin-when-cross-origin` được kích hoạt trên 100% phản hồi HTTP.
- **Phòng chống Brute Force:**
  - Nếu nhập sai mật khẩu quá 5 lần trong 15 phút tại `/admin/login`, IP sẽ bị tạm khóa và trả về cảnh báo `Tài khoản hoặc IP tạm thời bị hạn chế đăng nhập`.
- **Bảo vệ CSRF & IDOR:**
  - 100% routes thay đổi trạng thái (POST, PUT, DELETE) đều xác thực CSRF Token.
  - Mọi thao tác truy cập item qua `:id` đều được phân quyền chặt chẽ (`canPerform`).

---

## 5. Cách Kiểm Tra Xác Nhận
1. **Kiểm tra Security Headers qua cURL:**
   ```bash
   curl -I https://your-domain.com/
   ```
   Xác nhận có các headers:
   - `strict-transport-security`
   - `x-content-type-options: nosniff`
   - `referrer-policy: strict-origin-when-cross-origin`
2. **Kiểm tra Rate Limiter:**
   Gửi 6 requests đăng nhập sai liên tiếp tới `POST /admin/login`. Request thứ 6 sẽ bị chặn với mã lỗi tương ứng.
3. **Kiểm tra Correlation ID:**
   Gửi request tới `/health` và kiểm tra response header:
   ```bash
   curl -i https://your-domain.com/health
   ```
   Xác nhận header `X-Correlation-ID: <uuid>` hiện diện.

---

## 6. Xử Lý Sự Cố & Lỗi Thường Gặp
1. **Lỗi `403 Forbidden - Invalid CSRF Token` khi submit form:**
   - *Khắc phục:* Đảm bảo thẻ input `<input type="hidden" name="_csrf" value="<%= csrfToken %>">` hoặc header `X-CSRF-Token` được gửi kèm form data.
2. **Bị khóa IP do thử sai mật khẩu quá số lần quy định:**
   - *Khắc phục:* Chờ 15 phút để sliding window của `rateLimiter.js` tự động giải phóng, hoặc khởi động lại tiến trình server nếu đang trong trường hợp khẩn cấp của quản trị viên.
3. **Trình duyệt cảnh báo Mixed Content hoặc mất định dạng:**
   - *Khắc phục:* Kiểm tra Reverse Proxy đã truyền đúng header `X-Forwarded-Proto: https` và đặt biến `TRUST_PROXY=true` trong `.env`.

---

## 7. Cảnh Báo & Lưu Ý Quan Trọng
- ⚠️ **Không bao giờ dùng SESSION_SECRET mặc định:** Sử dụng secret mặc định trên Production sẽ cho phép kẻ tấn công giả mạo session cookie của người dùng khác.
- ⚠️ **Chốt chặn dbGuard:** Khi `APP_ENV=production`, `dbGuard` sẽ giám sát chặt chẽ dấu vân tay môi trường (`settings.environmentFingerprint`) để ngăn chặn việc chạy nhầm script reset/seed trên dữ liệu thật.
