---
phase: 12
name: Hoàn thiện, Bảo mật, Hiệu năng, Đóng gói Container, Vận hành & Tài liệu
status: Hoàn thành
depends_on: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, K1, E1, S]
estimate: 3 tiểu giai đoạn (12a, 12b, 12c) ~ 45h làm việc
started: 2026-11-18
completed: 2026-11-18
updated: 2026-11-18
---

# GĐ 12 - Hoàn thiện (Kiểm thử, Bảo mật, Hiệu năng, Triển khai, Tài liệu)
> Giai đoạn ổn định hoá toàn diện: Không phát triển tính năng mới. Tập trung vá lỗ hổng an ninh, củng cố kiểm thử tự động (E2E SSR), tối ưu hoá hiệu năng và ngân sách truy vấn, đóng gói Docker đa tầng, hoàn thiện quy trình vận hành và tài liệu hướng dẫn chuẩn 7 mục.

---

## 1. TÀI LIỆU CẦN ĐỌC TRƯỚC KHI LÀM
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/rules/06-testing.md`](../rules/06-testing.md)
- [`docs/reports/G12-baseline.md`](../reports/G12-baseline.md)
- [`docs/reports/G12-findings.md`](../reports/G12-findings.md)
- [`docs/decisions/DEC-056-sitepaths-and-dual-directory-structure.md`](../decisions/DEC-056-sitepaths-and-dual-directory-structure.md)
- [`docs/decisions/DEC-058-content-tree-parity-and-starter-snapshot.md`](../decisions/DEC-058-content-tree-parity-and-starter-snapshot.md)

---

## 2. MỤC TIÊU VÀ PHẠM VI
- **Mục tiêu:** Đưa hệ thống Treecraft CMS lên trạng thái Production-Ready:
  1. Bảo vệ toàn diện an ninh: Xoá bỏ session fixation, vá thư viện XSS, đóng chặt CSRF/IDOR, thiết lập CSP phân tách, chống brute force.
  2. Kiểm thử tự động đạt chuẩn: Bộ E2E 12 kịch bản SSR hoàn chỉnh, unit test bao phủ các dịch vụ lõi, bảo vệ ngân sách hiệu năng.
  3. Đóng gói container chuẩn mực: Dockerfile đa tầng non-root an toàn, compose staging, endpoints `/health` & `/ready` chuẩn xác, graceful shutdown.
  4. Vận hành tin cậy: JSON logger có cấu trúc, che dữ liệu nhạy cảm, giao diện giám sát sức khoẻ hệ thống (System Health).
  5. Tài liệu đầy đủ: 100% tài liệu hướng dẫn vận hành theo cấu trúc chuẩn 7 mục tiếng Việt, cấu hình `.agents/rules/` cho AI.
- **Phạm vi nghiêm ngặt:**
  - **KHÔNG thêm tính năng mới**.
  - **TUYỆT ĐỐI KHÔNG commit** vào git repo trong quá trình làm việc.
  - Sử dụng mô hình 1 DB với 2 collections `items_master` và `items_web`.
  - Phân chia thành 3 tiểu giai đoạn để thẩm định độc lập: **12a**, **12b**, **12c**.

---

## 3. PHÂN CHIA TIỂU GIAI ĐOẠN

### 🔹 GĐ 12a: Kiểm thử (Nhóm A) + Bảo mật (Nhóm B) + Hiệu năng (Nhóm C)
*Tập trung vào tính toàn vẹn của mã nguồn, độ tin cậy của kiểm thử và an ninh ứng dụng.*

#### Nhóm A — Củng cố Kiểm thử Tự động (Automated Testing)
- [x] **Task 12.A1 (Cao | 1.5h):** Viết bộ kiểm thử Unit Test cho `sitePaths.js` (`tests/unit/sitePaths.test.js` & `tests/sitePaths.test.js`) kiểm tra độc lập các chế độ: Standalone, Site Submodule, Custom path overrides.
- [x] **Task 12.A2 (Cao | 5.0h):** Xây dựng bộ kiểm thử End-to-End (`tests/e2e-ssr-flow.test.js`) bao phủ 12 kịch bản thực tế:
  1. Khởi tạo DB sạch $\rightarrow$ Tạo trang từ template $\rightarrow$ Nhập dữ liệu field $\rightarrow$ Submit & Approve workflow $\rightarrow$ Publish $\rightarrow$ `GET /about-us` trả về HTML đúng cấu trúc thứ tự components.
  2. Sửa nháp trong Content Editor nhưng chưa publish $\rightarrow$ Public site giữ nguyên nội dung cũ.
  3. Chuyển trạng thái Unpublish $\rightarrow$ Public site trả về 404 Not Found.
  4. Đổi tên trang đã publish $\rightarrow$ Phân giải URL theo đường dẫn mới.
  5. Đa ngôn ngữ: `GET /about-us` (tiếng Việt mặc định) và `GET /en/about-us` (tiếng Anh).
  6. Phân quyền ACL: Tài khoản biên tập viên chỉ có quyền sửa nhánh `/content/Home` không thể chỉnh sửa `/templates`.
  7. Xoá an toàn: Chặn xoá item đang được liên kết/sử dụng; xoá hợp lệ $\rightarrow$ đưa vào Recycle Bin $\rightarrow$ khôi phục hoàn chỉnh.
  8. Ghi nhận Audit Log: Toàn bộ hành động publish, unpublish, xoá đều lưu vết chi tiết trong `audit_logs`.
  9. Kiểm tra lá chắn Basic Auth perimeter.
  10. Kịch bản khôi phục sự cố: Backup K1 mã hoá $\rightarrow$ Sửa dữ liệu $\rightarrow$ Restore $\rightarrow$ Xác nhận vẹn toàn.
  11. Đồng bộ Serialization: Reserialize $\rightarrow$ Sync vào DB sạch $\rightarrow$ `npm run tree:compare` đạt 100% Parity.
  12. Fresh Project Submodule: Kiểm tra cài đặt và khởi động site từ repo trống (`verify:fresh-install`).
- [x] **Task 12.A3 (Trung bình | 3.0h):** Viết integration test cho luồng Backup $\rightarrow$ Restore $\rightarrow$ Thử nghiệm migration khôi phục (`tests/backupRestoreIntegration.test.js`).
- [x] **Task 12.A4 (Trung bình | 2.5h):** Viết benchmark test kiểm tra tải cây lớn (1.000 đến 10.000 items), bảo đảm query time không suy giảm (`tests/performance-budget.test.js`).

#### Nhóm B — Tăng cường An ninh Bảo mật (Security Hardening)
- [x] **Task 12.B1 (Nghiêm trọng | 0.5h):** Sửa lỗi duplicate key `SERIALIZATION_DIR` tại `src/config/env.js:123`, khôi phục hoạt động của `sitePaths.getSerializationDir()`.
- [x] **Task 12.B2 (Nghiêm trọng | 1.0h):** Khắc phục lỗ hổng Session Fixation tại `src/controllers/admin/authController.js` bằng cách gọi `req.session.regenerate()` trước khi lưu thông tin người dùng đăng nhập.
- [x] **Task 12.B3 (Nghiêm trọng | 1.0h):** Nâng cấp package `sanitize-html` lên phiên bản `^2.18.2` (kèm CJS override) để triệt tiêu các lỗ hổng CVE Stored XSS và URI bypass.
- [x] **Task 12.B4 (Cao | 1.5h):** Bổ sung CSRF Token validation (`csrfMiddleware.verifyToken`) và phân quyền `canPerform('write')` cho 5 routes ghi/reset cấu hình layout trong `src/routes/admin/presentationRoutes.js` và `src/routes/api/presentationRoutes.js`.
- [x] **Task 12.B5 (Cao | 2.0h):** Tích hợp Rate Limiting và cơ chế phòng vệ Brute Force cho `POST /admin/login` (giới hạn 5 lần sai / 15 phút, tăng thời gian trễ phản hồi, zero-dependency `rateLimiter.js`).
- [x] **Task 12.B6 (Cao | 2.5h):** Rà soát và vá lỗi IDOR trên toàn bộ các route nhận tham số `:id`: Bổ sung middleware `canPerform('read')` cho các endpoint nạp form HTML partials trong `contentEditorController.js`.
- [x] **Task 12.B7 (Cao | 2.5h):** Tách biệt cấu hình Content Security Policy (Helmet): CSP nghiêm ngặt cho Public Site (chặn `'unsafe-eval'`), CSP phù hợp cho Admin CMS; bổ sung HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **Task 12.B8 (Trung bình | 0.5h):** Cấu hình tường minh giới hạn kích thước payload `limit: '2mb'` cho `express.json()` và `express.urlencoded()`.
- [x] **Task 12.B9 (Trung bình | 3.0h):** Rà soát toàn bộ vị trí `<%-` trong EJS views để bảo đảm dữ liệu người dùng luôn được lọc qua `sanitizeHtml`.
- [x] **Task 12.B10 (Trung bình | 2.0h):** Bổ sung cơ chế runtime từ chối chạy hoặc cảnh báo nghiêm ngặt nếu phát hiện thư mục `core/` bị sửa đổi khi ứng dụng chạy ở môi trường `production` (`sitePaths.verifyCoreImmutability`).

#### Nhóm C — Tối ưu Hiệu năng & Bộ nhớ (Performance Budget)
- [x] **Task 12.C1 (Cao | 2.0h):** Thiết lập bài test tự động bảo vệ Ngân sách Hiệu năng (`tests/performance-budget.test.js`):
  - Mở node cây phân cấp: $< 300\text{ms}$ với 1.000 items.
  - Phản hồi trang Public Site từ Render Cache: $< 50\text{ms}$.
  - Nạp form biên tập Content Editor: $< 500\text{ms}$.
- [x] **Task 12.C2 (Trung bình | 2.0h):** Kiểm tra và tối ưu bộ nhớ đệm `siteCache`: Đảm bảo cơ chế tự động xoá cache chính xác (invalidation) khi publish/unpublish, và giới hạn LRU 500 trang.
- [x] **Task 12.C3 (Trung bình | 1.5h):** Tối ưu hoá bundle CSS/JS: Kiểm tra purge CSS cho Tailwind Public Site và Admin, nén gzip bằng `compression`.

---

### 🔹 GĐ 12b: Đóng gói Container (Nhóm D) + Vận hành & Giám sát (Nhóm E)
*Tập trung vào môi trường triển khai thực tế, CI/CD, đóng gói Docker và giám sát runtime.*

#### Nhóm D — Đóng gói, Container & Triển khai (Packaging & Deployment)
- [x] **Task 12.D1 (Cao | 3.0h):** Xây dựng `Dockerfile` đa tầng (multi-stage build):
  - Stage 1: Build assets (Tailwind CSS, compile).
  - Stage 2: Runtime image tối giản trên `node:20-alpine`, chỉ chứa production dependencies.
  - Thiết lập bảo mật: Chạy dưới quyền người dùng non-root `node` (UID 1000).
  - Tích hợp lệnh Docker HEALTHCHECK trỏ tới `/health`.
  - Tạo file `.dockerignore` chuẩn loại trừ `node_modules`, `.git`, `.env*`, `backups`.
- [x] **Task 12.D2 (Cao | 2.5h):** Xây dựng file `docker-compose.staging.yml` hoàn chỉnh kết nối container ứng dụng Treecraft Web và MongoDB replica set container, cấu hình volume lưu trữ database và `site/backups`.
- [x] **Task 12.D3 (Cao | 2.0h):** Nâng cấp endpoint `/health` và bổ sung endpoint `/ready`:
  - `GET /health`: Liveness probe (trả về 200 nếu Node.js process còn phản hồi, trả về 503 nếu lỗi nghiêm trọng).
  - `GET /ready`: Readiness probe (xác nhận kết nối MongoDB active, replica set healthy, các collections then chốt đã sẵn sàng).
- [x] **Task 12.D4 (Trung bình | 1.5h):** Hoàn thiện cơ chế Graceful Shutdown tại `src/server.js`:
  - Lắng nghe tín hiệu `SIGTERM` và `SIGINT`.
  - Ngừng tiếp nhận kết nối HTTP mới, thiết lập timeout giải phóng (10 giây).
  - Dừng scheduler backup nền, xả sạch hàng đợi log của Winston.
  - Ngắt kết nối Mongoose sạch sẽ.
- [x] **Task 12.D5 (Trung bình | 2.0h):** Cung cấp lệnh chẩn đoán hệ thống chỉ đọc: `npm run doctor` để kiểm tra toàn bộ cấu hình, kết nối DB, quyền thư mục và môi trường trước khi chạy.
- [x] **Task 12.D6 (Tùy chọn | Chờ duyệt):** Xây dựng workflow GitHub Actions CI (`.github/workflows/ci.yml`): Lint, test, audit, Docker build.

#### Nhóm E — Vận hành, Giám sát & Quản trị Hệ thống (Operations)
- [x] **Task 12.E1 (Trung bình | 3.5h):** Chuẩn hoá hệ thống ghi log:
  - Thay thế các lệnh `console.log` thô trong `src/` bằng `logger.info/warn/error`.
  - Bổ sung `correlationId` qua middleware (gán UUID cho mỗi HTTP request để theo dõi vết).
  - Tự động che giấu (redact) các trường nhạy cảm (`password`, `token`, `secret`, `authorization`).
- [x] **Task 12.E2 (Trung bình | 2.5h):** Nâng cấp trang System Health trong Admin Control Panel: Hiển thị trạng thái kết nối DB, thông số Memory RSS, Heap Usage, Uptime và trạng thái bộ nhớ đệm Site Cache.
- [x] **Task 12.E3 (Trung bình | 2.0h):** Hoàn thiện quy trình nâng cấp Core an toàn kèm Rollback tự động (Backup K1 $\rightarrow$ Thay Core submodule $\rightarrow$ Migrate $\rightarrow$ Kiểm tra `/ready`).

---

### 🔹 GĐ 12c: Hoàn thiện Tài liệu (Nhóm F) & Quy tắc AI
*Tập trung vào bộ tài liệu hướng dẫn vận hành chuẩn mẫu 7 mục tiếng Việt và tối ưu hoá tệp hướng dẫn AI.*

#### Nhóm F — Tài liệu Vận hành & Quy tắc AI (Documentation)
- [x] **Task 12.F1 (Thấp | 0.5h):** Sửa triệt để các vị trí residual branding trong tài liệu để lệnh `npm run check:branding` đạt kết quả PASS 100%.
- [x] **Task 12.F2 (Trung bình | 4.0h):** Rà soát và hoàn thiện bộ tài liệu hướng dẫn trong `docs/guides/` theo **cấu trúc chuẩn 7 mục (tiếng Việt)**:
  1. Mục đích / Khi nào sử dụng.
  2. Điều kiện tiên quyết.
  3. Các bước thực hiện (Lệnh copy chạy được trên Windows / macOS / Linux).
  4. Kết quả mong đợi.
  5. Cách kiểm tra xác nhận.
  6. Xử lý sự cố và lỗi thường gặp.
  7. Cảnh báo và lưu ý quan trọng.
  - Các tài liệu bắt buộc chuẩn hoá:
    - `docs/guides/fresh-install.md` (Khởi tạo dự án mới từ Core).
    - `docs/guides/backup-and-restore.md` (Sao lưu và phục hồi thảm hoạ K1).
    - `docs/guides/core-and-site.md` (Kiến trúc Core Submodule và quy tắc phát triển).
    - `docs/guides/deployment-docker.md` (Triển khai ứng dụng bằng Docker & Compose).
    - `docs/guides/security-hardening.md` (Hướng dẫn thiết lập an ninh môi trường Production).
- [x] **Task 12.F3 (Thấp | 1.5h):** Thiết lập thư mục quy tắc AI `.agents/rules/` theo chuẩn Antigravity (gồm 3 file ngắn gọn $\le 12.000$ ký tự trỏ về `docs/rules/`).
- [x] **Task 12.F4 (Thấp | 1.0h):** Soạn thảo `README.md` chính của repository: Giới thiệu kiến trúc Treecraft, yêu cầu hệ thống, hướng dẫn khởi động nhanh 1 bước, các lệnh CLI và liên kết tới tài liệu chi tiết.

---

## 4. DEFINITION OF DONE (DoD) CỦA GIAI ĐOẠN 12
Giai đoạn 12 được nghiệm thu khi đáp ứng đầy đủ các tiêu chuẩn sau:
1. `npm test` vượt qua **100% test suites** (bao gồm bộ E2E 12 kịch bản SSR), không có test nào bị skip hoặc flaky.
2. `npm run check:branding`, `npm run check:env`, `npm run check:languages` đều đạt **PASS 100%**.
3. `npm run lint` đạt kết quả **0 errors** (lỗi duplicate key đã được vá).
4. `npm audit` không còn lỗ hổng mức High / Critical liên quan đến runtime dependencies (`sanitize-html` đã nâng cấp).
5. Toàn bộ 7 routes thay đổi trạng thái thiếu CSRF đã được gắn middleware bảo vệ; lỗ hổng Session Fixation và Brute force đã được xử lý.
6. Ngân sách hiệu năng đạt chuẩn: Cây mở node $< 300\text{ms}$, Site cache $< 50\text{ms}$, Form $< 500\text{ms}$.
7. Lệnh `docker compose -f docker-compose.staging.yml up --build` khởi động thành công toàn bộ hệ thống trên môi trường Docker sạch; endpoint `/ready` trả về HTTP 200.
8. 100% tài liệu hướng dẫn trong `docs/guides/` tuân thủ mẫu chuẩn 7 mục tiếng Việt.
9. Báo cáo nghiệm thu `docs/reports/phase-12-report.md` được soạn thảo đầy đủ kèm `git status --short`.

---

## 5. RỦI RO VÀ GIẢI PHÁP GIẢM THIỂU
| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| **Nâng cấp `sanitize-html` gây vỡ format Rich Text cũ** | Trung bình | Kiểm tra kỹ cấu hình allowlist tags & attributes; chạy lại toàn bộ test suite của Content Editor để bảo đảm tương thích ngược 100%. |
| **Bổ sung CSRF cho Presentation routes làm lỗi AJAX modal** | Trung bình | Kiểm tra các hàm JavaScript client trong `presentation.js` để bảo đảm header `X-CSRF-Token` được gửi kèm mọi request `fetch` / `axios`. |
| **Build Docker image quá nặng do dính devDependencies** | Thấp | Áp dụng Multi-stage build với Alpine Linux; chỉ copy `node_modules` từ stage `--omit=dev`. |
| **Test E2E chạy chậm làm tăng thời gian CI** | Trung bình | Tách riêng suite E2E và chạy trên in-memory DB hoặc MongoDB tmp database riêng biệt. |
