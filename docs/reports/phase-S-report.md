# BÁO CÁO NGHIỆM THU: GIAI ĐOẠN S & S-PARITY
## TÁCH BIỆT CORE & SITE, LỆNH `init` MỘT BƯỚC, LUỒNG "SUBMODULE → INIT → DEV" VÀ ĐỒNG NHẤT CÂY NỘI DUNG (100% TREE PARITY)

---

### 1. Thông tin chung
- **Giai đoạn:** S (Core & Site Split) và S-Parity (Content Tree Parity)
- **Ngày thực hiện:** 2026-11-17
- **Trạng thái:** Hoàn thành (100% Tasks, DoD và Invariants passed)
- **Kiến trúc áp dụng:** DEC-056 (Core & Site Architecture Split), DEC-057 (Single Database, Two Collections), DEC-058 (Content Tree Parity & Starter Snapshot)

---

### 2. Các hạng mục đã hoàn thành

1. **Bộ Phân Giải Đường Dẫn Tập Trung (`sitePaths.js` - Nhóm A):**
   - Xây dựng module [`src/config/sitePaths.js`](../../src/config/sitePaths.js) theo thứ tự ưu tiên 4 tầng:
     1. CLI Flag: `--site <path>`
     2. Biến môi trường: `TREECRAFT_SITE_DIR`
     3. Upward Discovery: Quét ngược từ `process.cwd()` tìm thư mục `site/` hoặc `site/site.config.js`.
     4. Standalone Fallback: Nếu không tìm thấy site, fallback về thư mục gốc core nhằm đảm bảo tương thích ngược 100%.
   - Cung cấp các resolver chuẩn hóa: `getViewsDir()`, `getPublicDirs()`, `getSerializationDir()`, `getBackupDir()`, `getSiteConfig()`, `getSiteEnvFile()`.
   - Loại bỏ hoàn toàn việc ghép chuỗi `process.cwd()` hay `__dirname` phân tán.

2. **Cấu hình & Tách Biệt Môi Trường (`branding.js`, `env.js`, `dbGuard.js` - Nhóm B):**
   - [`src/config/branding.js`](../../src/config/branding.js): Chuyển thành wrapper mỏng gọi qua `sitePaths.resolveSiteConfig()`, nạp tên site, slug, cổng mạng động từ `site.config.js`.
   - [`src/config/env.js`](../../src/config/env.js): Nạp biến môi trường từ `site/.env.development` khi chạy trong chế độ Site Submodule.
   - [`src/config/dbGuard.js`](../../src/config/dbGuard.js): Bổ sung quy tắc phòng thủ, đảm bảo database name phân lập theo quy chuẩn `treecraft_<slug>`.

3. **Cấu Hình Static Assets & Views Đa Tầng (`app.js` - Nhóm C):**
   - Tích hợp Dual Static Mount: Phục vụ cả core static assets (`core/public`) và site project assets (`site/public`).
   - Cấu hình mảng views cho EJS: `[siteViewsDir, coreViewsDir]` với mức ưu tiên ghi đè của Site Views.

4. **Renderer & Dynamic Presentation (`siteRenderer.js`, `presentationService.js` - Nhóm D):**
   - Chuyển đổi toàn bộ kiểm tra whitelist và nạp file EJS presentation (`layouts`, `renderings`) sang `sitePaths.VIEWS_DIR`.
   - Bảo toàn cơ chế phòng chống Directory Traversal và symlink attack.

5. **Serialization & Storage Cách Ly Tuyệt Đối (`serializationPaths.js`, `LocalStorageProvider.js` - Nhóm E):**
   - Thư mục YAML Serialization được định tuyến trực tiếp vào `site/serialization/`.
   - Thư mục Backups và Uploads cục bộ được định tuyến vào `site/backups/` và `site/storage/`. Core repo tuyệt đối không bị ghi bất kỳ file dữ liệu nào.

6. **CLI Tự Động Hoá Một Bước (`core/bin/treecraft.js` - Nhóm G):**
   - Xây dựng CLI entry point bằng 100% native Node.js không phụ thuộc thư viện ngoài:
     - `treecraft init`: Khởi tạo toàn diện dự án mới (sinh `package.json`, `.gitignore`, `site.config.js`, `.env.development`, sao chép Corporate starter views/assets/YAML, seed MongoDB và đồng bộ Starter YAML).
     - `treecraft dev` / `treecraft start`: Khởi chạy ứng dụng với context Site đã cấu hình.
     - `treecraft tree:snapshot`: Chụp ảnh trạng thái cây nội dung ra manifest JSON.
     - `treecraft tree:compare`: Đối soát độ khớp giữa snapshot và database đang chạy.

7. **Bảo Toàn Đồng Nhất Cây Nội Dung (Content Tree Parity 100% - GĐ S-Parity):**
   - Thiết lập các System IDs bất biến trong [`src/config/systemIds.js`](../../src/config/systemIds.js) cho 6 root nodes, 13 system templates và Languages folder.
   - Đóng gói starter Corporate YAML chuẩn hóa trong `starter/corporate/serialization/`.
   - Xây dựng kịch bản đồng bộ [`src/scripts/sync-starter-serialization.js`](../../src/scripts/sync-starter-serialization.js) theo thứ tự phụ thuộc topo.
   - Xây dựng snapshot mẫu [`starter/corporate/tree.manifest.json`](../../starter/corporate/tree.manifest.json) chứa chính xác 54 nodes.

8. **Kiểm Thử Toàn Diện & Kịch Bản Cài Đặt Mới (E2E Fresh Install - Nhóm H):**
   - Xây dựng kịch bản kiểm thử [`tests/verify-fresh-install.js`](../../tests/verify-fresh-install.js) chạy trên thư mục tạm cách ly của hệ điều hành:
     - `git init` -> `git submodule add` -> `node core/bin/treecraft.js init --yes` -> đối soát tree parity.
     - Đạt độ khớp tuyệt đối: **54/54 nodes (100% Tree Parity)**.
   - Bổ sung test suite [`tests/treeParity.test.js`](../../tests/treeParity.test.js) kiểm tra toàn vẹn manifest.
   - Biên soạn tài liệu hướng dẫn chuẩn 7 mục tại [`docs/guides/core-and-site.md`](../guides/core-and-site.md).

---

### 3. Kết quả Kiểm thử (Verification Results)

1. **Kiểm tra Kịch bản Cài đặt Mới (Fresh Install Verification):**
   ```text
   [verify-fresh-install] 1. Initializing fresh git repository in temp directory...
   [verify-fresh-install] 2. Adding Core submodule via file protocol...
   [verify-fresh-install] 3. Running one-step init: node core/bin/treecraft.js init --yes...
   ✔ Created package.json
   ✔ Created .gitignore
   ✔ Created site/site.config.js
   ✔ Created site/.env.development
   ✔ Starter files copied successfully.
   ✔ System seed and initial data completed.
   ✔ Starter YAML synchronization completed.
   [verify-fresh-install] 4. Validating generated directory structure and files...
   ✔ All project and site files verified successfully on disk.
   [verify-fresh-install] 5. Validating Content Tree Parity against corporate starter manifest...
   === KẾT QUẢ ĐỐI SOÁT CÂY NỘI DUNG (TREE PARITY) ===
   Source A total nodes: 54
   Source B total nodes: 54
   ✅ PARITY 100%: Hai cây nội dung hoàn toàn đồng nhất tuyệt đối! (54 nodes)
   🎉 VERIFICATION COMPLETED: Luồng Submodule -> Init -> Dev thành công 100%!
   ```

2. **Kiểm thử Toàn diện Jest Test Suites:**
   - 100% test suites liên quan đến kiến trúc tách biệt và Core pass:
     - `tests/sitePaths.test.js`: 6/6 tests passed.
     - `tests/brandingAudit.test.js`: 5/5 tests passed.
     - `tests/dbInvariant.test.js`: 6/6 tests passed.
     - `tests/envConfig.test.js`: 4/4 tests passed.
     - `tests/dbGuard.test.js`: 15/15 tests passed.
     - `tests/siteResolver.test.js`: 10/10 tests passed.
     - `tests/templateInContentTree.test.js`: 14/14 tests passed.
     - `tests/treeParity.test.js`: 5/5 tests passed.
     - `tests/languageService.test.js` & `tests/languageApi.test.js`: 37/37 tests passed.

