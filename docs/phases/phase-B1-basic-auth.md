---
phase: B1
name: Basic Authentication for Public Site
status: Hoàn thành
depends_on: [0, 1, 10]
estimate: 1 ngày
started: 2026-11-09
completed: 2026-11-09
updated: 2026-11-09
---

# GĐ B1 — Bảo Vệ Website Công Khai Bằng HTTP Basic Authentication

> Kích hoạt cơ chế bảo vệ HTTP Basic Authentication chuẩn RFC 7617 cho toàn bộ Website công khai (`/`, `/:slug`), dùng cho môi trường UAT/Staging. Quản lý cấu hình, bật/tắt và quản lý tài khoản người dùng trực tiếp từ Admin qua tile Launchpad "Basic Auth". Hỗ trợ công tắc ghi đè khẩn cấp qua biến môi trường `BASIC_AUTH_ENABLED` và công cụ dòng lệnh (CLI).

---

## Tài liệu cần đọc trước khi làm
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/decisions/DEC-046-basic-auth-public-site-protection.md`](../decisions/DEC-046-basic-auth-public-site-protection.md)

---

## 1. Mục Tiêu & Phạm Vi (Scope)

### Trong phạm vi (In-Scope)
1. **Phạm vi bảo vệ:** Chỉ áp dụng cho Website công khai (`/`, `/:slug`, các trang EJS SSR công khai).
2. **Loại trừ mặc định:** Tuyệt đối không chặn `/admin`, `/api`, `/health`, `/admin/preview`. Cho phép cấu hình danh sách `excludePaths` bổ sung và `ipAllowlist`.
3. **Cơ chế xác thực:**
   - Sử dụng hộp thoại Sign-in gốc của trình duyệt qua header `WWW-Authenticate: Basic realm="<realm>", charset="UTF-8"`.
   - Khi chưa xác thực / sai thông tin / nhấn Cancel: trả về HTTP 401 cùng giao diện riêng `src/views/site/errors/401.ejs`.
4. **Lưu trữ & Bảo mật:**
   - Collection `settings`, key `basicAuth`: lưu `enabled`, `realm`, `excludePaths`, `ipAllowlist`, `users` (mật khẩu băm qua `bcryptjs`). Không lưu mật khẩu rõ. Không trả `passwordHash` qua API.
   - Parse Base64 an toàn, so sánh timing-safe qua `crypto.timingSafeEqual`, thông điệp 401 đồng nhất, chống lộ username.
   - Chống brute-force: Giới hạn số lần đăng nhập sai theo IP + username (in-memory counter), khoá tạm (429 Too Many Requests + `Retry-After`).
   - Header bảo vệ: `Cache-Control: private, no-cache, no-store, must-revalidate` đối với response yêu cầu xác thực.
   - Không log thông tin nhạy cảm (header `Authorization`, mật khẩu).
5. **Ghi đè khẩn cấp & CLI:**
   - Biến môi trường `BASIC_AUTH_ENABLED=false` lập tức vô hiệu hoá Basic Auth bất kể cài đặt DB.
   - CLI: `npm run basicauth:disable` và `npm run basicauth:add-user -- <username>`.
6. **Quản trị Admin & Launchpad:**
   - Tile **Basic Auth** trong Control Panel (icon cánh cửa `ti ti-door-enter`), kiểm tra quyền qua `canPerform('basicauth:read')`.
   - Giao diện quản trị `GET /admin/basic-auth`: Bật/tắt, cấu hình Realm, danh sách tài khoản (thêm, sửa, khoá/mở, xoá), Optimistic Locking (HTTP 409 khi xung đột phiên bản).
   - Quyền hạn: `basicauth:read`, `basicauth:manage` (mặc định chỉ Administrator, không hardcode role).
7. **Sự kiện & SEO:**
   - Phát sự kiện qua `eventBus` (`basicauth.enabled`, `basicauth.disabled`, `basicauth.config.changed`, `basicauth.user.added`, `basicauth.user.removed`, `basicauth.user.password.changed`).
   - Tự động cấu hình `robots.txt` trả về `Disallow: /` khi Basic Auth đang bật.

### Ngoài phạm vi (Out-of-Scope)
- Không làm OAuth/SSO/2FA/Digest Auth.
- Không bảo vệ `/admin` hoặc `/api` bằng Basic Auth.
- Không phân quyền Basic Auth theo từng trang/nhánh nội dung riêng lẻ.
- Không thay đổi cơ chế đăng nhập của trang Admin (`/admin/login`).
- Không cài đặt thêm package ngoài nếu chưa thảo luận.

---

## 2. Checklist Triển Khai (Tasks)

- [x] **Task 1: Model & Cấu hình Settings**
  - [x] Tạo model `Setting` (`src/models/Setting.js`) quản lý collection `settings` với schema `{ key: String, value: Mixed, updatedAt, updatedBy }`.
  - [x] Đăng ký model trong `src/models/index.js`.
  - [x] Cập nhật `src/config/env.js` và `.env.example` với `BASIC_AUTH_ENABLED`, `BASIC_AUTH_REALM`, `TRUST_PROXY`.
  - [x] Bổ sung các hằng số hành động trong `src/config/permissions.js` (`BASICAUTH_READ`, `BASICAUTH_MANAGE`).

- [x] **Task 2: Service Quản lý Basic Auth (`basicAuthService.js`)**
  - [x] Tạo `src/services/basicAuthService.js`: đọc/ghi cấu hình, quản lý user, băm mật khẩu qua `bcryptjs`.
  - [x] Triển khai bộ nhớ cache cấu hình in-memory với TTL ngắn và vô hiệu hoá tức thì khi có cập nhật.
  - [x] Tích hợp kiểm tra Optimistic Locking qua `updatedAt`.
  - [x] Bắn sự kiện ra `eventBus` cho các hành động thay đổi cấu hình/người dùng.

- [x] **Task 3: Middleware Xác Thực (`basicAuthMiddleware.js`)**
  - [x] Tạo `src/middlewares/basicAuthMiddleware.js`.
  - [x] Kiểm tra bypass: Env `BASIC_AUTH_ENABLED === 'false'`, kiểm tra đường dẫn loại trừ (`/admin`, `/api`, `/health`, `excludePaths`), kiểm tra `ipAllowlist`.
  - [x] Phân tích header `Authorization: Basic ...` an toàn: Base64 decode, tách ở dấu `:` đầu tiên, UTF-8, giới hạn độ dài header.
  - [x] So sánh mật khẩu an toàn timing-safe qua `bcrypt.compare` và `crypto.timingSafeEqual`.
  - [x] Chống brute-force: Cơ chế in-memory rate limiter theo `(ip, username)`, trả về HTTP 429 và header `Retry-After` khi vượt ngưỡng.
  - [x] Header response: Thiết lập `Cache-Control: private, no-cache, no-store` cho các phản hồi thuộc site được bảo vệ.
  - [x] Gắn `basicAuthMiddleware` vào `src/app.js` tại vị trí chuẩn xác (trước Site Renderer và static site public, sau `/health`, bỏ qua `/admin` và `/api`).

- [x] **Task 4: Template Giao diện & Technical SEO**
  - [x] Tạo view `src/views/site/errors/401.ejs` hiển thị thông báo yêu cầu xác thực tối giản, thân thiện, không rò rỉ thông tin hệ thống.
  - [x] Cập nhật `siteController.getRobotsTxt` trả về `Disallow: /` khi Basic Auth kích hoạt.

- [x] **Task 5: Controller & Giao diện Quản trị Admin**
  - [x] Tạo `src/controllers/admin/basicAuthController.js`:
    - `index`: Render giao diện quản trị `GET /admin/basic-auth`.
    - `getConfig`: `GET /api/basic-auth`.
    - `updateConfig`: `PUT /api/basic-auth` (kiểm tra `expectedUpdatedAt` chống ghi đè đồng thời).
    - `addUser`: `POST /api/basic-auth/users`.
    - `updateUser`: `PUT /api/basic-auth/users/:username` (đổi mật khẩu, khoá/mở).
    - `deleteUser`: `DELETE /api/basic-auth/users/:username`.
  - [x] Tạo các tuyến đường `src/routes/admin/basicAuthRoutes.js` và `src/routes/api/basicAuthRoutes.js`.
  - [x] Gắn các routes vào `src/app.js` với CSRF và xác thực quyền qua `canPerform`.
  - [x] Tạo view quản trị `src/views/admin/basic-auth/index.ejs`: Công tắc bật/tắt, ô Realm, bảng người dùng, modal thêm/đổi mật khẩu/khoá, phần Nâng cao (excludePaths, ipAllowlist), nút Test mở tab mới.

- [x] **Task 6: Tích Hợp Launchpad & Phân Quyền**
  - [x] Cập nhật `src/controllers/admin/launchpadController.js`: Thêm tile **Basic Auth** trong nhóm "Control Panel & Maintenance" (icon `ti ti-door-enter`, màu cyan/amber).
  - [x] Ẩn tile đối với người dùng không có quyền `basicauth:read`.
  - [x] Bổ sung seed dữ liệu cho tile trong `src/scripts/seed-initial-data.js`.

- [x] **Task 7: CLI Quản Trị Khẩn Cấp**
  - [x] Tạo script `src/scripts/basicauth-disable.js` (`npm run basicauth:disable`) để tắt nhanh Basic Auth trong DB.
  - [x] Tạo script `src/scripts/basicauth-add-user.js` (`npm run basicauth:add-user -- <username>`) nhập mật khẩu an toàn qua console prompt (ẩn ký tự).
  - [x] Đăng ký các scripts vào `package.json`.

- [x] **Task 8: Kiểm Thử & Nghiệm Thu**
  - [x] Viết test suite `tests/basicAuthMiddleware.test.js`:
    - Tắt: truy cập site bình thường (200).
    - Bật: không có header / sai thông tin -> 401 + `WWW-Authenticate`.
    - Bật: thông tin đúng -> 200.
    - Không chặn `/admin`, `/api`, `/health`, `excludePaths`.
    - Bypass theo `ipAllowlist`.
    - Parse dị thường: Base64 hỏng, thiếu `:`, mật khẩu chứa `:`, độ dài vượt mức.
    - Chống brute-force: khoá tạm sau 5 lần sai -> 429 + `Retry-After`.
    - Header `Cache-Control` cho response được bảo vệ.
    - Env `BASIC_AUTH_ENABLED=false` ghi đè DB.
  - [x] Viết test suite `tests/basicAuthApi.test.js`:
    - CRUD cấu hình và tài khoản qua API.
    - Chặn bật khi danh sách tài khoản rỗng.
    - Không lộ hash mật khẩu qua API.
    - Optimistic locking (409 Conflict).
    - Quyền hạn qua `canPerform`.
  - [x] Chạy toàn bộ regression test (`npm test`) đảm bảo 100% test suites pass.
  - [x] Kiểm tra linter (`npm run lint`).

- [x] **Task 9: Tài Liệu Hóa**
  - [x] Ghi Decision Log `docs/decisions/DEC-046-basic-auth-public-site-protection.md`.
  - [x] Cập nhật `docs/rules/04-routing.md`, `docs/rules/05-security.md`.
  - [x] Cập nhật bảng tiến độ tại `docs/phases/README.md`.
  - [x] Soạn thảo báo cáo nghiệm thu `docs/reports/phase-B1-report.md`.

---

## 3. Definition of Done (DoD)
1. Khi Basic Auth bật: Mọi truy cập vào `/` hoặc trang công khai bật hộp thoại xác thực gốc của trình duyệt. Nhập đúng tài khoản truy cập bình thường, nhập sai hoặc Cancel hiện trang 401 tùy chỉnh `401.ejs`.
2. Tuyệt đối không ảnh hưởng đến `/admin`, `/api`, `/health`, `/admin/preview`, và các đường dẫn thuộc `excludePaths`.
3. Mật khẩu lưu trữ băm an toàn 100% bằng bcrypt, không bao giờ xuất hiện ở dạng rõ trong database, log, audit hay API response.
4. Cơ chế chống brute-force hoạt động: khóa tạm IP + username sau N lần thử sai (429 + `Retry-After`).
5. Response bảo vệ gửi header `Cache-Control` chống caching công khai; `robots.txt` trả `Disallow: /` khi đang bật.
6. Hai cơ chế gỡ khóa khẩn cấp (`BASIC_AUTH_ENABLED=false` và CLI `npm run basicauth:disable`) hoạt động tin cậy.
7. Tile Basic Auth trên Launchpad hiển thị đúng giao diện, ẩn với người dùng không có quyền.
8. 100% test suites pass (bao gồm regression test), 0 ESLint errors. Không có commit Git nào được tạo.

