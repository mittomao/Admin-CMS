# BẢNG TỔNG HỢP PHÁT HIỆN VÀ PHÂN LOẠI — GIAI ĐOẠN 12 (HOÀN THIỆN)
> **Tài liệu theo dõi kỹ thuật:** Tổng hợp toàn bộ các vấn đề, lỗi tiềm ẩn, thiếu sót bảo mật, hiệu năng, triển khai và tài liệu được phát hiện từ quá trình đo Baseline hệ thống Treecraft CMS v1.0.0.

---

## 1. THỐNG KÊ PHÂN LOẠI MỨC ĐỘ RỦI RO
* **Nghiêm trọng (Critical):** 3 phát hiện (Vá ngay ở 12a).
* **Cao (High):** 8 phát hiện (Bảo mật route, chống brute force, Dockerfile, E2E).
* **Trung bình (Medium):** 9 phát hiện (Hiệu năng cache, sanitize `<%-`, audit log).
* **Thấp (Low):** 5 phát hiện (Dọn cảnh báo lint, modal thay alert, rules AI).
* **Tổng cộng:** **25 phát hiện**.

---

## 2. BẢNG CHI TIẾT TỪNG PHÁT HIỆN THEO NHÓM (A – F)

| Mã ID | Nhóm | Tên phát hiện | Mức độ | Mô tả chi tiết & Vị trí | Đề xuất giải pháp xử lý | Công sức (h) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **B** | Duplicate Key trong `env.js` | **Nghiêm trọng** | `src/config/env.js:123:3` khai báo đè `SERIALIZATION_DIR`, làm vô hiệu hoá `sitePaths.getSerializationDir()`. Gây lỗi `npm run lint`. | Xoá dòng 123 trùng lặp, giữ lại dòng 122 dùng `sitePaths.getSerializationDir()`. | 0.5h |
| **SEC-02** | **B** | Lỗ hổng Session Fixation khi Login | **Nghiêm trọng** | `src/controllers/admin/authController.js:25`: Gán session trực tiếp mà không gọi `req.session.regenerate()`. Kẻ tấn công có thể cố định session ID trước. | Bổ sung `req.session.regenerate()` trước khi lưu thông tin user vào session. | 1.0h |
| **SEC-03** | **B** | Lỗ hổng Thư viện `sanitize-html` | **Nghiêm trọng** | `npm audit` báo 2 CVE Moderate (GHSA-vccv-cmxp-4j9h, GHSA-g8qq-57p8-ggw5): Stored XSS qua bypass URI scheme trong Rich Text. | Nâng cấp package `sanitize-html` lên phiên bản an toàn mới nhất (`^2.18.2`). | 1.0h |
| **SEC-04** | **B** | Thiếu CSRF & ACL trên Presentation Routes | **Cao** | `src/routes/admin/presentationRoutes.js` và `src/routes/api/presentationRoutes.js`: 5 route POST/PUT lưu & reset presentation thiếu middleware `validateToken` và `canPerform('write')`. | Bổ sung `csrfMiddleware.validateToken` và `canPerform('write')` vào toàn bộ route ghi presentation. | 1.5h |
| **SEC-05** | **B** | Thiếu Rate Limit & Account Lockout Login | **Cao** | `POST /admin/login` không có rate limit, không ghi nhận số lần thất bại, dễ bị tấn công Brute Force từ điển mật khẩu. | Tích hợp `express-rate-limit` (5 lần sai / 15 phút), thêm thời gian trễ cấp số nhân hoặc khoá tạm. | 2.0h |
| **SEC-06** | **B** | Rủi ro IDOR trên các Partial HTML Form | **Cao** | Một số partials như `/admin/content-editor/item/:id/form` nhận `:id` nhưng chỉ có `requireAuth`, chưa kiểm tra quyền `read` trực tiếp trên item đó trước khi render form. | Bổ sung middleware `canPerform('read')` cho toàn bộ endpoint nhận `:id`. | 2.5h |
| **SEC-07** | **B** | CSP quá lỏng lẻo (`'unsafe-eval'`, `'unsafe-inline'`) | **Cao** | `src/app.js:68`: Helmet CSP dùng chung cho cả Admin và Public Site, cho phép `'unsafe-eval'`. Public Site không nên có `'unsafe-eval'`. | Phân tách CSP cho Admin (cho phép các CDN cần thiết) và Public Site (CSP nghiêm ngặt, nonce nếu khả thi). | 2.5h |
| **SEC-08** | **B** | Express Body Parser thiếu giới hạn dung lượng | **Trung bình** | `src/app.js:92-93`: `express.json()` và `express.urlencoded()` không chỉ định `limit`, tiềm ẩn nguy cơ DoS bộ nhớ. | Cấu hình tường minh `limit: '2mb'` cho body parser JSON và URL encoded. | 0.5h |
| **SEC-09** | **B** | Rà soát Render EJS thô (`<%-`) | **Trung bình** | 104 vị trí sử dụng `<%-` trong `src/views/`. Cần bảo đảm mọi biến dữ liệu người dùng render qua `<%-` đều đã qua `sanitizeHtml`. | Lập danh mục 104 vị trí, bổ sung sanitize cho các trường Rich Text và xác nhận các layout/partial là an toàn. | 3.0h |
| **SEC-10** | **B** | Ngăn chặn sửa đổi Core ở môi trường Production | **Trung bình** | Chưa có cơ chế runtime kiểm tra tính bất biến của thư mục `core/` khi chạy trong môi trường `staging` hoặc `production`. | Bổ sung hàm kiểm tra `git status --porcelain` hoặc file checksum trong `core` khi khởi động server. | 2.0h |
| **TST-01** | **A** | Thiếu Bộ E2E Test SSR EJS Xuyên suốt 12 luồng | **Cao** | Các bài test hiện tại chạy độc lập từng component, thiếu bài test E2E tích hợp mô phỏng hoàn chỉnh 12 bước nghiệp vụ thực tế. | Xây dựng bộ test `tests/e2e/ssr-flow.test.js` kiểm thử toàn bộ 12 luồng yêu cầu bằng Jest + Supertest trên DB tạm. | 5.0h |
| **TST-02** | **A** | Thiếu Unit Test cho `sitePaths.js` | **Cao** | Module `src/config/sitePaths.js` định đoạt toàn bộ đường dẫn Core/Site nhưng chưa có bộ unit test bảo vệ độ bao phủ. | Viết unit test `tests/unit/sitePaths.test.js` kiểm tra các chế độ: Core Standalone, Site Submodule, Custom path env. | 1.5h |
| **TST-03** | **A** | Thiếu Integration Test cho Backup $\rightarrow$ Restore $\rightarrow$ Migration | **Trung bình** | Chưa có kiểm thử tự động xác minh quy trình rollback an toàn khi nâng cấp core hoặc gặp sự cố dữ liệu. | Viết integration test kịch bản: Seed data $\rightarrow$ Backup K1 mã hoá $\rightarrow$ Sửa dữ liệu $\rightarrow$ Restore $\rightarrow$ Xác nhận tính vẹn toàn. | 3.0h |
| **TST-04** | **A** | Thiếu Benchmark Test cây lớn (10.000 items) | **Trung bình** | Chưa có kiểm thử hiệu năng tự động để phát hiện suy giảm tốc độ khi số lượng node cây tăng cao. | Viết script benchmark đo thời gian truy vấn cây 1.000 và 10.000 nodes trong DB tạm, xác nhận đạt ngân sách. | 2.5h |
| **PER-01** | **C** | Thiếu Ngân sách Hiệu năng (Performance Budget) Test | **Cao** | Chưa có assertion tự động trong test suite để bảo vệ ngưỡng thời gian phản hồi (Cây < 300ms, Site Cache < 50ms, Form < 500ms). | Viết assertions đo thời gian phản hồi trong integration test suite, tự động fail nếu vượt ngân sách. | 2.0h |
| **PER-02** | **C** | Kiểm soát Giới hạn Kích thước Cache & Invalidation | **Trung bình** | Bộ nhớ đệm Public Site (`siteCache`) cần bảo đảm invalidate chính xác từng URL khi item được publish/unpublish, và giới hạn LRU 500 items. | Viết test kiểm tra cache hit, cache miss, và cache invalidation theo đường dẫn phân cấp. | 2.0h |
| **PER-03** | **C** | Tối ưu Kích thước Bundle Public Site CSS/JS | **Trung bình** | Tailwind CSS và client script cần bảo đảm purge sạch các class không dùng, nén gzip/brotli tối đa. | Kiểm tra cấu hình Tailwind purge và compression middleware. | 1.5h |
| **DOP-01** | **D** | Thiếu Dockerfile Multi-stage Chuẩn Production | **Cao** | Dự án chưa có `Dockerfile` đa tầng cho ứng dụng Node.js (tách build-stage và run-stage, non-root user `node`, minimal Alpine). | Viết `Dockerfile` đa tầng tối ưu dung lượng, bảo mật user non-root và `.dockerignore`. | 3.0h |
| **DOP-02** | **D** | Cấu hình Docker Compose Staging Đầy đủ | **Cao** | `docker-compose.yml` hiện tại chỉ có MongoDB. Cần compose hoàn chỉnh kết hợp ứng dụng Web Treecraft + Mongo + persistent volumes. | Xây dựng `docker-compose.staging.yml` kết nối container ứng dụng và container MongoDB, cấu hình internal network. | 2.5h |
| **DOP-03** | **D** | Endpoint `/ready` & Chuẩn hoá `/health` | **Cao** | `/health` hiện tại trả về 200 ngay cả khi MongoDB mất kết nối. Chưa có endpoint `/ready` cho orchestration checks. | Viết endpoint `/ready` kiểm tra MongoDB connection, ping replica set, collection sẵn sàng; sửa `/health` trả về mã lỗi 503 khi DB down. | 2.0h |
| **DOP-04** | **D** | Hoàn thiện Graceful Shutdown | **Trung bình** | `src/server.js` cần cơ chế timeout cưỡng bức (ví dụ 10s) khi đóng server để giải phóng kết nối còn treo và flush winston log queue. | Cập nhật hàm `gracefulShutdown` với timeout an toàn và `logger.end()`. | 1.5h |
| **OPS-01** | **E** | Chuyển đổi 458 `console.log` sang Structured Logger | **Trung bình** | Có 458 vị trí `console.log` thô trong `src/`, làm loãng log và không định dạng JSON ở môi trường production. | Thay thế các log nghiệp vụ bằng `logger.info/warn/error`, thêm Correlation ID cho request. | 3.5h |
| **OPS-02** | **E** | Nâng cấp Giao diện System Health trong Admin | **Trung bình** | Trang Control Panel / Ping hiện tại còn đơn giản. Cần mở rộng hiển thị trạng thái DB, Uptime, Memory Usage, Storage. | Bổ sung dashboard thông số System Health trực quan trong Admin Control Panel. | 2.5h |
| **DOC-01** | **F** | Sửa 4 Lỗi Residual Branding trong Tài liệu | **Thấp** | 4 file tài liệu còn chứa từ "sitecore": `DEC-053`, `DEC-054`, `serialization.md`, `serialization-path-diagnosis.md`. | Bổ sung allowlist hoặc chỉnh sửa từ ngữ chuẩn Treecraft để `npm run check:branding` PASS 100%. | 0.5h |
| **DOC-02** | **F** | Hoàn thiện Hướng dẫn Vận hành Mẫu 7 Mục | **Trung bình** | Bộ tài liệu `docs/guides/` cần hoàn thiện các quy trình: Fresh Install, Backup & Restore, Disaster Recovery, Nâng cấp Core theo chuẩn 7 mục. | Rà soát và bổ sung toàn bộ hướng dẫn tiếng Việt theo đúng cấu trúc chuẩn 7 mục. | 4.0h |
| **DOC-03** | **F** | Thiết lập Quy tắc AI `.agents/rules/` | **Thấp** | Chưa có cấu hình `.agents/rules/` cho trợ lý AI Antigravity. | Tạo 3 file quy tắc ngắn gọn: `01-general.md`, `02-architecture.md`, `03-git-safety.md` trỏ về `docs/rules/`. | 1.5h |

---

## 3. LỘ TRÌNH TRIỂN KHAI ĐỀ XUẤT (3 TIỂU GIAI ĐOẠN)
1. **GĐ 12a — Củng cố Kiểm thử, An ninh Bảo mật & Tối ưu Hiệu năng (Ước tính: ~25h làm việc):**
   - Xử lý các phát hiện: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, TST-01, TST-02, TST-03, TST-04, PER-01, PER-02, PER-03.
2. **GĐ 12b — Đóng gói Container, Triển khai & Vận hành Hệ thống (Ước tính: ~14h làm việc):**
   - Xử lý các phát hiện: DOP-01, DOP-02, DOP-03, DOP-04, OPS-01, OPS-02, SEC-10.
3. **GĐ 12c — Hoàn thiện Tài liệu Mẫu 7 Mục & Quy tắc AI (Ước tính: ~6h làm việc):**
   - Xử lý các phát hiện: DOC-01, DOC-02, DOC-03.
