---
phase: 12
name: Hoàn thiện, Bảo mật, Hiệu năng, Tài liệu & Docker
status: Chưa bắt đầu
depends_on: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
estimate: 3 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 12 - Hoàn thiện, Bảo mật, Hiệu năng, Tài liệu & Docker
> Kiểm thử toàn diện (Unit, Integration, E2E Headless flow), rà soát bảo mật, tối ưu MongoDB indexes, Docker containerization và README.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/rules/06-testing.md`](../rules/06-testing.md)

## Mục tiêu
Kiểm thử toàn diện hệ thống (Unit / Integration / E2E Test), tối ưu hóa hiệu năng truy vấn database, rà soát lỗ hổng bảo mật, đóng gói container hóa bằng Docker & Docker Compose, và hoàn thiện bộ tài liệu hướng dẫn vận hành.

## Phạm vi
- **Làm:**
  - Viết bộ test tự động (Jest / Supertest) kiểm thử các service trọng yếu (Item CRUD, Tree calculation, ACL calculation, Presentation calculation, Publish, Layout Service).
  - **Kiểm thử End-to-End (E2E Test) luồng Headless Presentation:** Admin cấu hình Presentation Details (chọn Layout, gán Rendering, gán Datasource) -> Chuyển Workflow & Publish sang Web -> Gọi Layout Service `GET /api/v1/layout` -> Xác nhận JSON trả về đúng layout, đúng placeholders và datasource resolved chuẩn xác.
  - Rà soát bảo mật: kiểm tra escape EJS, chống NoSQL Injection, kiểm tra CSRF token toàn bộ forms, bảo vệ HTTP headers với Helmet, bảo vệ API Delivery với Rate Limit và API Key.
  - Tối ưu hóa hiệu năng: kiểm tra execution plan MongoDB (`explain()`), bảo đảm 100% các câu truy vấn cây và presentation đều sử dụng index tối ưu.
  - Container hóa: Viết `Dockerfile` và `docker-compose.yml` (bao gồm App Node.js và MongoDB sẵn sàng chạy chỉ với 1 lệnh).
  - Tài liệu: `README.md` hoàn chỉnh hướng dẫn cài đặt, cấu hình, kiến trúc và vận hành.
- **Không làm:** Chưa triển khai hạ tầng Kubernetes phân tán.

## Checklist Task
- [ ] **Task 12.1:** Thiết lập framework kiểm thử tự động với Jest và Supertest.
- [ ] **Task 12.2:** Viết bộ kiểm thử Unit Test cho `aclService.js` (tính toán quyền kế thừa và quyền ghi đè, quyền presentation).
- [ ] **Task 12.3:** Viết bộ kiểm thử Unit Test cho `presentationService.js` (gộp Standard Presentation + Shared Layout + Final Layout delta override).
- [ ] **Task 12.4:** Viết bộ kiểm thử Integration Test cho các luồng: Đăng nhập -> Tạo Template -> Tạo Item -> Cấu hình Presentation -> Chuyển Workflow -> Publish ra Web -> Gọi Layout Service.
- [ ] **Task 12.5:** Rà soát và vá các lỗ hổng bảo mật tiềm ẩn (CSRF, XSS, NoSQL Injection, Brute Force).
- [ ] **Task 12.6:** Tối ưu hóa Database: Tạo compound index cho các truy vấn phức tạp, loại bỏ các index dư thừa.
- [ ] **Task 12.7:** Xây dựng `Dockerfile` đa tầng (multi-stage build) tối ưu kích thước image và thiết lập người dùng non-root an toàn.
- [ ] **Task 12.8:** Xây dựng `docker-compose.yml` kết nối container ứng dụng Node.js với container MongoDB kèm persistent volume.
- [ ] **Task 12.9:** Soạn thảo tài liệu `README.md` và tài liệu hướng dẫn sử dụng giao diện CMS cho người dùng cuối.

## File/Thư mục Dự kiến
- `tests/unit/aclService.test.js`, `tests/unit/presentationService.test.js`, `tests/integration/presentationFlow.test.js`
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`
- `README.md`

## Route / API Dự kiến
Đảm bảo toàn bộ route hiện hữu hoạt động ổn định và đạt chuẩn kiểm thử.

## Thay đổi Database
Bổ sung các compound indexes hoàn thiện.

## Definition of Done & Cách kiểm thử
- Chạy `npm test` -> 100% các ca kiểm thử tự động đều PASS, bao gồm test e2e luồng Presentation và Layout Service.
- Chạy lệnh `docker compose up --build` -> Toàn bộ hệ thống khởi chạy trơn tru, seed data tự động được nạp, truy cập web hoạt động hoàn hảo.
- Kiểm tra rà soát bảo mật không phát hiện lỗi rò rỉ token hoặc không escape mã HTML.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Dung lượng Docker image quá nặng hoặc kết nối giữa container app và container mongo bị timeout.
- *Giảm thiểu:* Sử dụng base image `node:20-alpine`, sử dụng Docker healthcheck để đảm bảo MongoDB sẵn sàng trước khi app khởi động.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 12`)*

