---
phase: 0
name: Khởi tạo nền tảng dự án & Layout Shell
status: Hoàn thành
depends_on: []
estimate: 1 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
updated: 2026-11-03
---

# GĐ 0 - Khởi tạo Nền tảng Dự án & Layout Shell
> Thiết lập khung sườn dự án Express, EJS layout engine, CSS Treecraft theme và kết nối MongoDB.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/decisions/DEC-004-centralized-logging-winston.md`](../decisions/DEC-004-centralized-logging-winston.md)
- [`docs/decisions/DEC-005-ejs-layouts-separation.md`](../decisions/DEC-005-ejs-layouts-separation.md)
- [`docs/decisions/DEC-006-vanilla-css-treecraft-theme.md`](../decisions/DEC-006-vanilla-css-treecraft-theme.md)
- [`docs/decisions/DEC-007-graceful-mongodb-connection.md`](../decisions/DEC-007-graceful-mongodb-connection.md)

## Mục tiêu
Thiết lập khung sườn dự án vững chắc với Node.js, Express, MongoDB, EJS Layout Engine, cấu hình bảo mật cơ bản và bộ giao diện khung vỏ (CSS/Layout Shell) theo đúng theo chuẩn Treecraft.

## Phạm vi
- **Làm:** Cấu trúc thư mục chuẩn; khởi tạo `package.json`, cài đặt dependencies; kết nối MongoDB; cấu hình EJS layout với thư mục views/partials; thiết lập CSS giao diện theo chuẩn Treecraft (Header Treecraft, taskbar xám tro, cửa sổ window frame, font Segoe UI / Open Sans); trang chủ tạm kiểm tra layout.
- **Không làm:** Chưa làm xác thực người dùng thật (chưa login session); chưa làm tương tác cây nội dung.

## Checklist Task
- [x] **Task 0.1:** Khởi tạo `package.json`, khai báo các thư viện (express, mongoose, ejs, express-ejs-layouts, helmet, morgan, dotenv, cors, express-session, connect-mongo).
- [x] **Task 0.2:** Thiết lập module kết nối cơ sở dữ liệu `src/config/database.js` kết nối tới MongoDB với cơ chế retry và log trạng thái.
- [x] **Task 0.3:** Tạo ứng dụng Express `src/app.js` và file thực thi `src/server.js`, tích hợp các middleware bảo mật cơ bản (helmet, body-parser, cookie-parser, morgan logger).
- [x] **Task 0.4:** Cấu hình EJS View Engine và hệ thống layout mẫu (`src/views/layouts/main.ejs`, `src/views/layouts/minimal.ejs`, `src/views/partials/header.ejs`, `src/views/partials/taskbar.ejs`).
- [x] **Task 0.5:** Xây dựng bộ CSS Treecraft chuẩn (`src/public/css/treecraft-theme.css`) mô phỏng màu sắc, typography (Segoe UI), thanh taskbar dưới đáy và phong cách Ribbon bar phía trên.
- [x] **Task 0.6:** Tạo route test `GET /` hiển thị trang shell giao diện mẫu xác nhận layout render mượt mà không lỗi.
- [x] **Task 0.7:** Thiết lập cấu hình biến môi trường `.env.example`, `.env` và file `.gitignore` tiêu chuẩn.

## File/Thư mục Dự kiến
- `package.json`, `.env.example`, `.gitignore`
- `src/server.js`, `src/app.js`
- `src/config/database.js`, `src/config/constants.js`
- `src/views/layouts/main.ejs`, `src/views/layouts/minimal.ejs`
- `src/views/partials/header.ejs`, `src/views/partials/taskbar.ejs`, `src/views/partials/alerts.ejs`
- `src/views/index.ejs`
- `src/public/css/treecraft-theme.css`, `src/public/js/treecraft-shell.js`

## Route / API Dự kiến
- `GET /`: Trang chủ hiển thị khung vỏ layout shell để kiểm tra CSS và partials.
- `GET /health`: Endpoint kiểm tra trạng thái hoạt động của server và database.

## Thay đổi Database
Kiểm tra kết nối thành công tới database MongoDB `treecraft_cms_master`.

## Definition of Done & Cách kiểm thử
- Khởi động server bằng `npm start` không phát sinh cảnh báo lỗi.
- Truy cập trình duyệt `http://localhost:3000` hiển thị đầy đủ giao diện shell: thanh tiêu đề Treecraft trên cùng, thanh taskbar bên dưới, theme màu xám/xanh chuẩn enterprise.
- Endpoint `http://localhost:3000/health` trả về `{ status: "ok", db: "connected" }`.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Lỗi kết nối MongoDB do sai URI hoặc phiên bản Node.js không tương thích.
- *Giảm thiểu:* Bọc kết nối trong khối try/catch với log chi tiết, cung cấp URI mặc định kết nối localhost.

## Ghi chú / Kết quả
Đã hoàn thành toàn bộ checklist và smoke tests thành công ngày 2026-11-03.

