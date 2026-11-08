---
phase: 1
name: Nền tảng xác thực & Dashboard Launchpad
status: Hoàn thành
depends_on: [0]
estimate: 1.5 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
updated: 2026-11-03
---

# GĐ 1 - Nền tảng Xác thực & Dashboard Launchpad
> Xây dựng User/Role model, phiên làm việc MongoDB, màn hình Login Treecraft và Launchpad chia nhóm ứng dụng theo role.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/data-model/users-roles-acl.md`](../data-model/users-roles-acl.md)
- [`docs/decisions/DEC-008-session-mongo-store.md`](../decisions/DEC-008-session-mongo-store.md)
- [`docs/decisions/DEC-009-bcrypt-password-hashing.md`](../decisions/DEC-009-bcrypt-password-hashing.md)
- [`docs/decisions/DEC-010-role-based-launchpad.md`](../decisions/DEC-010-role-based-launchpad.md)

## Mục tiêu
Xây dựng hệ thống đăng nhập, đăng xuất, lưu trữ phiên làm việc an toàn với MongoDB Store, và màn hình điều khiển Launchpad hiển thị các ô ứng dụng (Tiles) theo phân quyền của người dùng.

## Phạm vi
- **Làm:** Model `User`, `Role`, `LaunchpadApp`; mã hóa mật khẩu với `bcryptjs`; phiên làm việc `express-session` lưu trong MongoStore; middleware bảo vệ route `authMiddleware`; màn hình đăng nhập theo chuẩn Treecraft; màn hình Launchpad phân nhóm các ứng dụng (Content Editing, Marketing, Media, Security, Control Panel); script tạo tài khoản `admin` mặc định (Seed data).
- **Không làm:** Chưa làm phân quyền chi tiết từng nút trong cây (ACL theo Item để sang GĐ 7).

## Checklist Task
- [x] **Task 1.1:** Định nghĩa Mongoose Model `User` (`src/models/User.js`) và `Role` (`src/models/Role.js`).
- [x] **Task 1.2:** Định nghĩa Mongoose Model `LaunchpadApp` (`src/models/LaunchpadApp.js`) chứa thông tin icon, tên, mô tả, nhóm, URL, và danh sách Role được phép truy cập.
- [x] **Task 1.3:** Cấu hình session `src/config/session.js` sử dụng `express-session` và `connect-mongo`.
- [x] **Task 1.4:** Xây dựng `authService.js` xử lý logic xác thực đăng nhập, so sánh mật khẩu băm, và cập nhật `lastLogin`.
- [x] **Task 1.5:** Xây dựng `authController.js` và routes `src/routes/admin/authRoutes.js` (`GET /admin/login`, `POST /admin/login`, `POST /admin/logout`).
- [x] **Task 1.6:** Thiết kế giao diện EJS đăng nhập `src/views/admin/auth/login.ejs` (logo Treecraft, form nhập username/password, thông báo lỗi).
- [x] **Task 1.7:** Xây dựng `authMiddleware.js` bảo vệ toàn bộ các route tiền tố `/admin/*` (chuyển hướng về `/admin/login` nếu chưa đăng nhập).
- [x] **Task 1.8:** Xây dựng `launchpadController.js` và route `src/routes/admin/launchpadRoutes.js` (`GET /admin/launchpad`).
- [x] **Task 1.9:** Thiết kế giao diện Launchpad `src/views/admin/launchpad/index.ejs` hiển thị danh sách ứng dụng chia nhóm (Content Editing, Media, Control Panel) dựa trên role của user hiện tại.
- [x] **Task 1.10:** Viết script seed data `src/scripts/seed-initial-data.js` khởi tạo các role mặc định (`Administrator`, `Author`, `Editor`) và tài khoản `admin` / `admin123`.

## File/Thư mục Dự kiến
- `src/models/User.js`, `src/models/Role.js`, `src/models/LaunchpadApp.js`
- `src/config/session.js`
- `src/services/authService.js`
- `src/controllers/admin/authController.js`, `src/controllers/admin/launchpadController.js`
- `src/routes/admin/authRoutes.js`, `src/routes/admin/launchpadRoutes.js`
- `src/middlewares/authMiddleware.js`
- `src/views/admin/auth/login.ejs`, `src/views/admin/launchpad/index.ejs`
- `src/scripts/seed-initial-data.js`

## Route / API Dự kiến
- `GET /admin/login`: Hiển thị form đăng nhập.
- `POST /admin/login`: Tiếp nhận thông tin đăng nhập, thiết lập session.
- `POST /admin/logout`: Hủy session, đăng xuất.
- `GET /admin/launchpad`: Trang chủ Launchpad hiển thị các ứng dụng.

## Thay đổi Database
- Collections: `users`, `roles`, `launchpad_apps`, `sessions`.
- Dữ liệu ban đầu: Tài khoản admin, các role hệ thống, danh mục 6-8 apps chuẩn Treecraft.

## Definition of Done & Cách kiểm thử
- Chạy `node src/scripts/seed-initial-data.js` tạo thành công user admin.
- Truy cập bất kỳ route `/admin/launchpad` khi chưa đăng nhập -> Tự động redirect về `/admin/login`.
- Đăng nhập với sai mật khẩu -> Hiển thị cảnh báo lỗi màu đỏ trên form.
- Đăng nhập đúng với `admin` -> Chuyển hướng tới `/admin/launchpad`, hiển thị đầy đủ các Tile ứng dụng với tên user `System Administrator` trên header.
- Ấn nút Đăng xuất -> Hủy session, chuyển về trang đăng nhập, ấn nút Back trên trình duyệt không thể quay lại trang trước.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Lỗ hổng session fixation hoặc mất session khi restart server.
- *Giảm thiểu:* Thiết lập cookie options an toàn (`httpOnly: true`, `sameSite: 'lax'`, `maxAge`), lưu session bền vững trong MongoDB qua `connect-mongo`.

## Ghi chú / Kết quả
Đã hoàn thành toàn bộ checklist và xác nhận auth flow mượt mà ngày 2026-11-03.

