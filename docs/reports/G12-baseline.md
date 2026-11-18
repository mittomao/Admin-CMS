# BÁO CÁO BASELINE TOÀN DIỆN HỆ THỐNG — GIAI ĐOẠN 12 (HOÀN THIỆN)
> **Mục tiêu:** Ghi nhận số liệu đo lường thực tế, hiện trạng kiểm thử, an ninh bảo mật, hiệu năng truy vấn, cấu hình môi trường, đóng gói container và tài liệu làm căn cứ tối ưu hoá cho Giai đoạn 12.  
> **Thời điểm đo:** 18/11/2026 | **Phiên bản:** Treecraft CMS v1.0.0 | **Branch:** `master`

---

## 1. TỔNG QUAN PHƯƠNG PHÁP ĐO LƯỜNG
- **Môi trường đo:** Windows 11 x64, Node.js v26.13.0, MongoDB v8.0.3 (Docker Single-node Replica Set `rs0` trên `127.0.0.1:27017`).
- **Phạm vi mã nguồn:** Toàn bộ thư mục `src/`, `public/`, `tests/`, `bin/`, `starter/`, `docs/`.
- **Nguyên tắc an toàn:** Không in bí mật, không chạy trên production, không sửa mã nguồn ở Bước 1.

---

## 2. HIỆN TRẠNG KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

### 2.1. Số liệu thực thi
| Chỉ số | Giá trị thực tế | Đánh giá Tech Lead |
| :--- | :--- | :--- |
| **Tổng số Test Suites** | **59 suites** | Đạt độ bao phủ hầu hết các modules từ GĐ 0 → S |
| **Tổng số Tests** | **574 tests** | 100% PASS (574 passed, 0 failed, 0 pending) |
| **Thời gian chạy test** | **101.4s – 111.2s** | Chạy tuần tự (`--runInBand` / `--detectOpenHandles`) do MongoDB replica set |
| **Tỷ lệ Flaky / Bất ổn** | **0%** | Không có test skip, các suite chạy độc lập qua DB tạm |
| **Smoke Test độc lập** | **6/6 passed** | `tests/smoke-fresh-project.js` test HTTP live endpoints |
| **Fresh Install Verification** | **100% passed** | `tests/verify-fresh-install.js` kiểm tra tạo site từ repo trống |
| **Tree Parity Check** | **54/54 passed** | `npm run tree:compare` xác nhận 100% khớp snapshot |

### 2.2. Khoảng trống kiểm thử (Test Gaps)
1. **Chưa có bộ E2E Test hoàn chỉnh chuẩn bị 12 kịch bản SSR EJS:** Hiện các test phân tán ở `tests/unit/` và `tests/integration/`, chưa có bộ runner e2e kiểm thử luồng xuyên suốt từ tạo page -> nhập component -> workflow -> publish -> site renderer `GET /about-us` -> unpublish -> 404 -> recycle bin -> khôi phục.
2. **Thiếu Unit Test cho `sitePaths.js`:** Module cốt lõi định tuyến đường dẫn giữa Core Standalone và Site Submodule chưa có suite test unit độc lập.
3. **Thiếu Test kịch bản tải cây lớn (Performance Benchmark Test):** Chưa có bài test đo lường thời gian tải với 1.000 đến 10.000 nodes cây phân cấp.
4. **Thiếu Test Backup $\rightarrow$ Migration thử $\rightarrow$ Restore:** Chưa có kiểm thử tự động cho kịch bản khôi phục dữ liệu mã hoá khi gặp sự cố migration.

---

## 3. KIỂM TRA TĨNH VÀ AN TOÀN MÃ NGUỒN (STATIC ANALYSIS)

### 3.1. Các lệnh kiểm tra tự động (`npm run check:*` & `lint`)
| Công cụ | Kết quả | Chi tiết phát hiện |
| :--- | :--- | :--- |
| `npm run check:languages` | **PASS** | 100% không có chuỗi ngôn ngữ hardcoded; đồng bộ động qua item language. |
| `npm run check:env` | **PASS** | 33 biến môi trường hợp lệ, `dbGuard` kiểm soát chốt chặn an toàn. |
| `npm run check:branding` | **FAIL (4 lỗi)** | Phát hiện 4 file tài liệu còn chứa từ "sitecore": `DEC-053:16`, `DEC-054:70`, `docs/guides/serialization.md:12`, `docs/reports/serialization-path-diagnosis.md:60`. |
| `npm run lint` | **FAIL (1 lỗi, 49 cảnh báo)** | **Lỗi nghiêm trọng:** `src/config/env.js:123:3` Duplicate key `SERIALIZATION_DIR`.<br>49 cảnh báo biến chưa sử dụng (unused variables). |
| `npm audit` | **44 lỗ hổng** | - **2 Moderate:** `sanitize-html` <=2.17.7 (CVE Stored XSS / URI scheme validation bypass), `minimatch`.<br>- **42 High:** `picomatch` ReDoS (trong devDependencies của jest, chokidar, tailwindcss). |

### 3.2. Quét mẫu mã nguồn (Static Grep Audit)
| Mẫu quét mã | Số lượng phát hiện | Đánh giá & Rủi ro |
| :--- | :--- | :--- |
| **Kiểm tra role cứng** (`role ===`, `roles.includes`) | **0** | Tuyệt vời. Toàn bộ phân quyền dùng `canPerform` và ACL phân cấp. |
| **Mã động nguy hiểm** (`eval(`, `new Function(`) | **0** | An toàn tuyệt đối, không có hàm thực thi chuỗi động. |
| **Giả định 2 DB cũ** (`MONGO_DB_WEB`) | **0** | Đã dọn sạch hoàn toàn, 100% tuân thủ mô hình 1 DB 2 collections. |
| **Đường dẫn cứng `process.cwd()`** trong `src/` | **10** | Rủi ro: Một số service/script dùng `process.cwd()` thay vì `sitePaths`, gây sai lệch khi chạy submodule. |
| **Ghi log thô** (`console.log`) trong `src/` | **458** | Cao: Cần thay thế bằng `logger.info/warn/error` có cấu trúc JSON. |
| **Hộp thoại native** (`alert(`, `confirm(`) | **148** | Trung bình: Trải nghiệm người dùng desktop-like chưa đồng bộ (cần modal UI). |
| **Thao tác DOM trực tiếp** (`innerHTML`) trong `public/` | **154** | Trung bình: Tiềm ẩn nguy cơ DOM-based XSS nếu client chèn dữ liệu chưa sanitize. |
| **Render EJS thô** (`<%-`) trong `src/views/` | **104** | Cao: Cần rà soát 100% vị trí xem đã qua `sanitizeHtml` hoặc `include` an toàn chưa. |

---

## 4. BẢNG KIỂM TOÁN ROUTE TOÀN DIỆN (ROUTE AUDIT TABLE)

Toàn hệ thống có **185 routes** (45 Admin HTML/Partial, 139 API, 1 Site SSR Renderer):

### 4.1. Thống kê theo phân loại bảo vệ
* **Tổng số route thay đổi trạng thái (POST, PUT, DELETE, PATCH):** 92 routes.
* **Route thay đổi trạng thái THIẾU CSRF middleware:** **7 routes** (Phát hiện nghiêm trọng).
  1. `POST /admin/login` (`authRoutes.js`) — Thiếu CSRF & Rate Limit.
  2. `POST /admin/logout` (`authRoutes.js`) — Thiếu CSRF.
  3. `POST /admin/content-editor/item/:id/presentation` (`presentationRoutes.js`) — **Thiếu CSRF**.
  4. `POST /admin/content-editor/item/:id/presentation/reset` (`presentationRoutes.js`) — **Thiếu CSRF**.
  5. `PUT /api/presentation/item/:id` (`presentationRoutes.js`) — **Thiếu CSRF**.
  6. `POST /api/presentation/item/:id/reset` (`presentationRoutes.js`) — **Thiếu CSRF**.
  7. `PUT /api/presentation/template/:id/standard` (`presentationRoutes.js`) — **Thiếu CSRF**.
* **Route nhận `:id` nhưng thiếu middleware `canPerform` độc lập:** **57 routes** (Phát hiện IDOR tiềm ẩn: Một số endpoint kiểm tra quyền thủ công bên trong controller, nhưng nhiều partial HTML endpoint như `/admin/content-editor/item/:id/form` chỉ có `requireAuth` chung mà không xác thực quyền `read` cụ thể trên item đó).

---

## 5. CƠ SỞ DỮ LIỆU LOCAL (MONGODB COLLECTIONS & EXECUTION PLANS)

### 5.1. Thống kê Collections & Indexes
Cơ sở dữ liệu: `admin_cms` (Development Local):

| Collection | Số lượng Docs | Số lượng Indexes | Các trường Index chính |
| :--- | :--- | :--- | :--- |
| **`items_master`** | 54 docs | **19 indexes** | `_id`, `path+deleted`, `parentId+sortOrder+deleted`, `languages.code`, `templateId`, `_fts` (Full-Text), `languages.versions.workflowState` |
| **`items_web`** | 53 docs | **6 indexes** | `_id`, `path`, `parentId+sortOrder+isDeleted`, `ancestors`, `templateId`, `languages.code` |
| **`access_control_lists`** | 58 docs | **4 indexes** | `_id`, `itemId`, `itemId+principalType+principalId+right`, `principalType+principalId` |
| **`templates`** | 26 docs | **5 indexes** | `_id`, `name`, `baseTemplates`, `path`, `isSystem` |
| **`audit_logs`** | 78 docs | **11 indexes** | `_id`, `at`, `userId+at`, `itemId+at`, `action+at`, `itemPath+at` |
| **`workflow_histories`** | 23 docs | **5 indexes** | `_id`, `itemId`, `toState`, `itemId+lang+version+at` |
| **`publish_histories`** | 18 docs | **4 indexes** | `_id`, `startedAt`, `status`, `rootItemId` |
| **`publish_jobs`** | 8 docs | **3 indexes** | `_id`, `status+createdAt`, `lockToken` |
| **`media`** | 7 docs | **12 indexes** | `_id`, `path`, `parentId+isFolder+isDeleted+sortOrder`, `fileDetails.checksum`, `_fts` |
| **`users`** | 3 docs | **3 indexes** | `_id`, `username` (unique), `email` (unique) |
| **`roles`** | 5 docs | **2 indexes** | `_id`, `name` (unique) |
| **`sessions`** | 1 docs | **2 indexes** | `_id`, `expires` (TTL index) |

### 5.2. Kết quả Execution Plan (`explain('executionStats')`)
1. **Truy vấn lấy con phân cấp (Children query):**
   - Query: `{ parentId: ObjectId(...), deleted: false }` sort `{ sortOrder: 1 }`
   - Stage: `FETCH` $\rightarrow$ Index: `parentId_1_sortOrder_1_deleted_1` (**INDEX SCAN — Tối ưu tuyệt đối, 0 collscan**).
2. **Truy vấn tìm theo Path Master:**
   - Query: `{ path: '/root/content/home', deleted: false }`
   - Stage: `FETCH` $\rightarrow$ Index: `path_1_deleted_1` (**INDEX SCAN**).
3. **Truy vấn phân giải URL Public Site Web:**
   - Query: `{ path: '/root/content/home' }` trên `items_web`
   - Stage: `EXPRESS_IXSCAN` $\rightarrow$ Index: `path_1` (**INDEX SCAN — Tốc độ < 1ms**).
4. **Truy vấn bảng quyền ACL:**
   - Query: `{ itemId: ObjectId(...) }`
   - Stage: `FETCH` $\rightarrow$ Index: `itemId_1` (**INDEX SCAN**).

---

## 6. CẤU HÌNH, PHIÊN LÀM VIỆC VÀ BẢO MẬT (CONFIGURATION AUDIT)

### 6.1. Phiên làm việc (Session & Cookie)
- Module: `express-session` + `connect-mongo`.
- Cấu hình Cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure: env.isProd`, `maxAge: 86400000` (24h).
- **Lỗ hổng Session Fixation:** Khi đăng nhập thành công tại `authController.js`, hệ thống gán trực tiếp `req.session.user = user` mà **không gọi `req.session.regenerate()`**. Kẻ tấn công có thể gán session id trước để chiếm quyền tài khoản sau khi nạn nhân đăng nhập.
- **Lỗ hổng Brute Force:** Endpoint `POST /admin/login` không áp dụng rate limit, không có thời gian trễ chống brute force, không có cơ chế khoá tài khoản tạm thời sau 5 lần thử sai.

### 6.2. Header HTTP & Content Security Policy (Helmet)
- Hiện tại Helmet áp dụng chung cho cả Admin và Public Site với cấu hình nới lỏng:
  `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net']`.
- Cho phép `'unsafe-eval'` và `'unsafe-inline'` làm suy giảm nghiêm trọng khả năng phòng thủ XSS của CSP.
- Thiếu phân tách chính sách CSP riêng: Admin cần các CDN cho Tabler/TinyMCE, trong khi Public Site cần CSP chặt chẽ hơn nhiều.

### 6.3. Giới hạn Payload Body Parser
- `app.use(express.json());` và `app.use(express.urlencoded({ extended: true }));` chưa khai báo tham số `limit` (ví dụ `limit: '2mb'`), tiềm ẩn nguy cơ DoS bộ nhớ khi nhận payload JSON dung lượng lớn.

---

## 7. TRIỂN KHAI VÀ CONTAINERIZATION (DEPLOYMENT AUDIT)

1. **Dockerfile:** Chưa có file `Dockerfile` cho ứng dụng Node.js trong repo (mới chỉ có `docker-compose.yml` cho MongoDB replica set).
2. **Docker Compose Triển khai Staging:** Cần cấu hình compose kết nối Node.js Monolith + MongoDB container kèm volume đồng bộ `site/` và `site/backups`.
3. **Health & Readiness Endpoints:**
   - Endpoint `/health` hiện có trả về HTTP 200 ngay cả khi MongoDB mất kết nối (`status: 'ok'`).
   - Chưa có endpoint `/ready` để kiểm tra toàn diện: kết nối database, khởi tạo collection, Cloudinary readiness.
4. **Graceful Shutdown:** `src/server.js` đã lắng nghe SIGTERM/SIGINT và đóng HTTP server + ngắt scheduler, nhưng chưa có timeout ngắt kết nối cưỡng bức nếu còn request treo, và chưa flush log queue.

---

## 8. KIẾN TRÚC TÁCH BIỆT CORE & SITE (SUBMODULE AUDIT)
1. **Tree Parity:** 54 nodes khởi tạo đạt 100% Tree Parity với Snapshot Manifest.
2. **Bảo vệ tính bất biến Core (`requiresCore`):** Hiện mới có hướng dẫn quy ước, chưa có hook runtime tự động cảnh báo hoặc chặn thực thi nếu phát hiện thư mục `core/` bị sửa đổi (`dirty git state`) trong môi trường staging / production.

---

## 9. HƯỚNG DẪN AI VÀ QUY TẮC DỰ ÁN (AI GUIDANCE AUDIT)
1. **Kích thước `AGENTS.md`:** Hiện có **45 dòng** (đạt chuẩn $\le 120$ dòng), cấu trúc rõ ràng, thứ tự đọc tuần tự, có bảng cheat-sheet.
2. **Cấu hình `.agents/rules/`:** Chưa tồn tại thư mục `.agents/rules/`. Antigravity khuyến nghị có 2–4 file quy tắc súc tích tại `.agents/rules/` để tự động nạp ngữ cảnh cho các agent hỗ trợ.
