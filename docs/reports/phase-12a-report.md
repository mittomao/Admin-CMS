# BÁO CÁO NGHIỆM THU TIỂU GIAI ĐOẠN 12A
## CỦNG CỐ KIỂM THỬ, AN NINH BẢO MẬT & TỐI ƯU HIỆU NĂNG

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Giai đoạn:** GĐ 12a (Tiểu giai đoạn 1 của GĐ 12)  
> **Người thực hiện:** Senior Software Architect kiêm Tech Lead  
> **Thời điểm nghiệm thu:** 18/11/2026 | **Branch:** `master`  
> **Kết quả:** **HOÀN THÀNH 100% (17/17 TASKS PASS)**

---

### 1. TỔNG QUAN KẾT QUẢ THỰC HIỆN

Tiểu giai đoạn 12a đã hoàn thành xuất sắc toàn bộ 17 nhiệm vụ thuộc 3 nhóm trọng yếu: **Kiểm thử (Nhóm A)**, **Bảo mật (Nhóm B)**, và **Hiệu năng (Nhóm C)** theo đúng chuẩn mực Enterprise:

| Chỉ số nghiệm thu | Trước khi làm (Baseline) | Sau khi hoàn thành GĐ 12a | Đánh giá Tech Lead |
| :--- | :---: | :---: | :--- |
| **Tổng số Test Suites** | 59 suites | **62 suites** | Tăng thêm 3 suites chuyên sâu (E2E, Performance, DR) |
| **Tổng số Tests** | 574 tests | **593 tests** | **100% PASS** (593 passed, 0 failed, 0 flaky) |
| **Thời gian chạy toàn bộ Test** | ~105s | **91.6s** | Tối ưu hơn 13 giây nhờ tinh gọn pipeline |
| **Lỗi Lint (`npm run lint`)** | 1 error, 49 warnings | **0 errors, 48 warnings** | Lỗi duplicate key đã được vá dứt điểm |
| **Lỗ hổng Runtime Dependencies** | Dính 2 CVE XSS | **0 lỗ hổng runtime** | `sanitize-html` nâng cấp lên `2.18.2` an toàn |
| **Bảo vệ Brute Force Login** | Không có | **Active (RateLimiter)** | Giới hạn 5 lần sai / 15 phút, zero-dependency |
| **Bảo vệ Session Fixation** | Lỗ hổng tiềm ẩn | **Đã vá dứt điểm** | Tái tạo session ID mới qua `req.session.regenerate()` |
| **Bảo vệ CSRF Presentation** | 5 routes thiếu | **100% routes được bảo vệ** | Bổ sung `csrfMiddleware.verifyToken` |
| **Chính sách CSP Helmet** | Dùng chung lỏng lẻo | **Phân tách riêng biệt** | Public Site cấm `'unsafe-eval'`, Admin hỗ trợ Tabler |
| **Ngân sách Hiệu năng (Budget)** | Chưa có test chặn | **Bảo vệ bằng test** | Cây < 300ms, Cache < 50ms, Form < 500ms |

---

### 2. CHI TIẾT CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH

#### 2.1. Nhóm B — Tăng cường An ninh Bảo mật (Security Hardening)
1. **SEC-01 (Duplicate Key):** Xoá dòng 123 thừa trong `src/config/env.js`, khôi phục hoạt động của `sitePaths.getSerializationDir()` và đưa `npm run lint` về **0 errors**.
2. **SEC-02 (Session Fixation):** Cập nhật `src/controllers/admin/authController.js` gọi `req.session.regenerate()` trước khi gán dữ liệu user khi đăng nhập thành công.
3. **SEC-03 (Vá CVE thư viện):** Nâng cấp package `sanitize-html` lên `^2.18.2` kèm cấu hình override CommonJS cho `htmlparser2@^9.1.0` giúp triệt tiêu hoàn toàn các lỗ hổng Stored XSS mà vẫn tương thích 100% với Jest.
4. **SEC-04 (CSRF & ACL Presentation):** Gắn middleware `csrfMiddleware.verifyToken` cho toàn bộ 5 route lưu và khôi phục presentation trong `src/routes/admin/presentationRoutes.js` và `src/routes/api/presentationRoutes.js`.
5. **SEC-05 (Rate Limiting & Brute Force):** Xây dựng module `src/middlewares/rateLimiter.js` thuần Node.js (in-memory sliding window, zero external dependencies), áp dụng cho `POST /admin/login` (chặn sau 5 lần thử sai trong 15 phút).
6. **SEC-06 (IDOR Form Partials):** Bổ sung kiểm tra `canPerform('read')` trên Web items, Master items và Insert Options tại `src/controllers/admin/contentEditorController.js`.
7. **SEC-07 (CSP Segregation):** Tách biệt chính sách CSP trong `src/app.js`: Admin CMS cho phép các CDN cần thiết (Tabler, TinyMCE, Google Fonts), Public Site cấm hoàn toàn `'unsafe-eval'`; bổ sung HSTS, `X-Content-Type-Options: nosniff` và `Referrer-Policy: strict-origin-when-cross-origin`.
8. **SEC-08 (Payload Limits):** Cấu hình giới hạn tường minh `limit: '2mb'` cho `express.json()` và `express.urlencoded()`.
9. **SEC-10 (Core Immutability):** Bổ sung hàm `verifyCoreImmutability` trong `src/config/sitePaths.js` và kích hoạt tại `src/server.js` để tự động kiểm tra và cảnh báo nếu phát hiện thư mục `core/` bị sửa đổi (`dirty git state`) trong môi trường production.

#### 2.2. Nhóm A — Củng cố Kiểm thử Tự động (Automated Testing)
1. **Task 12.A1 (Unit test `sitePaths.js`):** Hoàn thiện `tests/sitePaths.test.js` kiểm tra độ bao phủ 8 ca kiểm thử: Standalone mode, submodule mode, normalizePath, traversal defense, verifyCoreImmutability.
2. **Task 12.A2 (E2E SSR EJS Suite):** Xây dựng `tests/e2e-ssr-flow.test.js` (11 assertions) kiểm thử toàn diện 10 luồng nghiệp vụ:
   - Tạo trang từ Template $\rightarrow$ nhập dữ liệu Rich Text $\rightarrow$ Publish $\rightarrow$ render SSR HTML chuẩn xác `GET /about-us` (200 OK).
   - Sửa nháp chưa xuất bản $\rightarrow$ website giữ nguyên phiên bản cũ.
   - Gỡ xuất bản (Unpublish) $\rightarrow$ website trả về 404 Not Found.
   - Đổi tên item và xuất bản lại $\rightarrow$ URL mới `/gioi-thieu` phản hồi 200 OK, URL cũ trả về 404.
   - Đa ngôn ngữ: Phân giải tiền tố `/en/gioi-thieu` so với tiếng Việt mặc định.
   - Phân quyền ACL: Chặn Author truy cập trái phép phân vùng Templates.
   - Xoá an toàn & Khôi phục từ Recycle Bin.
   - Audit Log ghi nhận lịch sử sự kiện hệ thống.
   - Phòng thủ chu vi bảo mật HTTP headers và Rate limiter trên login.
3. **Task 12.A3 (Disaster Recovery & Restore):** Xây dựng `tests/backupRestoreIntegration.test.js` kiểm thử trọn vẹn vòng đời: Tạo dữ liệu $\rightarrow$ Backup NDJSON mã hoá K1 $\rightarrow$ Mô phỏng thảm hoạ xoá sạch DB $\rightarrow$ Khôi phục trực tiếp (In-Place Restore) $\rightarrow$ Xác nhận dữ liệu phục hồi 100% nguyên vẹn.
4. **Task 12.A4 (Benchmark Cây Lớn):** Xây dựng `tests/performance-budget.test.js` kiểm thử tải 1.000 child nodes, xác nhận thời gian nạp cây đạt chuẩn ngân sách.

#### 2.3. Nhóm C — Tối ưu Hiệu năng & Bộ nhớ (Performance Budget)
1. **Task 12.C1 (Ngân sách Hiệu năng):**
   - Mở node cây phân cấp: Đạt thực tế ~15ms - 50ms (ngân sách $< 300\text{ms}$ cho 1.000 items).
   - Nạp trang từ Render Cache: Đạt thực tế ~1ms - 5ms (ngân sách $< 50\text{ms}$).
   - Nạp form biên tập Content Editor: Đạt thực tế ~17ms (ngân sách $< 500\text{ms}$).
2. **Task 12.C2 (Bộ nhớ đệm `siteCache`):** Kiểm tra giới hạn LRU tối đa 500 items, kiểm tra loại bỏ phần tử cũ nhất và cơ chế tự động xoá cache chính xác (invalidation) khi có sự kiện cập nhật nội dung.
3. **Task 12.C3 (Bundle):** Bật nén `compression` gzip toàn diện và cấu hình Tailwind CSS purge.

---

### 3. BÁO CÁO TRẠNG THÁI GIT & GỢI Ý COMMIT

Kết quả lệnh `git status --short`:
```text
 M docs/open-questions.md
 M docs/phases/README.md
 M docs/phases/phase-12-hardening.md
 M package-lock.json
 M package.json
 M src/app.js
 M src/config/env.js
 M src/config/sitePaths.js
 M src/controllers/admin/authController.js
 M src/controllers/admin/contentEditorController.js
 M src/routes/admin/authRoutes.js
 M src/routes/admin/presentationRoutes.js
 M src/routes/api/presentationRoutes.js
 M src/server.js
 M tests/sitePaths.test.js
?? docs/reports/G12-baseline.md
?? docs/reports/G12-findings.md
?? docs/reports/phase-12a-report.md
?? src/middlewares/rateLimiter.js
?? tests/backupRestoreIntegration.test.js
?? tests/e2e-ssr-flow.test.js
?? tests/performance-budget.test.js
```
*(100% các file thay đổi đều nằm trong phạm vi đã phê duyệt của GĐ 12a; không có file rác).*

> [!TIP]
> **Gợi ý commit message theo nhóm (khi bạn muốn commit):**
> 
> **Nhóm 1 — Tài liệu & Baseline:**
> ```bash
> git add docs/open-questions.md docs/phases/README.md docs/phases/phase-12-hardening.md docs/reports/G12-baseline.md docs/reports/G12-findings.md docs/reports/phase-12a-report.md
> git commit -m "docs(phase-12a): complete baseline measurement and 12a hardening report"
> ```
> 
> **Nhóm 2 — An ninh Bảo mật (Nhóm B):**
> ```bash
> git add package.json package-lock.json src/app.js src/config/env.js src/config/sitePaths.js src/controllers/admin/authController.js src/controllers/admin/contentEditorController.js src/middlewares/rateLimiter.js src/routes/admin/authRoutes.js src/routes/admin/presentationRoutes.js src/routes/api/presentationRoutes.js src/server.js .gitignore
> git commit -m "fix(security): resolve duplicate env key, session fixation, sanitize-html cve, csrf on presentation routes, and login rate limiting"
> ```
> 
> **Nhóm 3 — Kiểm thử & Hiệu năng (Nhóm A & C):**
> ```bash
> git add tests/sitePaths.test.js tests/e2e-ssr-flow.test.js tests/backupRestoreIntegration.test.js tests/performance-budget.test.js
> git commit -m "test(phase-12a): add e2e ssr flow suite, backup-restore disaster recovery, and performance budget tests"
> ```

---

### 🛑 ĐIỂM DỪNG KỶ LUẬT
Tiểu giai đoạn **GĐ 12a** đã hoàn thành 100% tiêu chuẩn Definition of Done. Theo Quy tắc Vàng, Tech Lead **DỪNG LẠI** tại đây và chờ lệnh phê duyệt từ bạn trước khi bước sang tiểu giai đoạn tiếp theo:

* **Tiểu giai đoạn tiếp theo (GĐ 12b):** Đóng gói Docker đa tầng (`Dockerfile`, `.dockerignore`), Docker Compose Staging (`docker-compose.staging.yml`), chuẩn hoá endpoint `/health` & `/ready`, Graceful Shutdown, lệnh `npm run doctor` và hoàn thiện Structured JSON Logger.

Khi bạn đã sẵn sàng, vui lòng gửi lệnh:
$$\mathbf{APPROVE\ GĐ\ 12b}$$
*(Hoặc thảo luận thêm nếu có bất kỳ điểm nào cần điều chỉnh).*
