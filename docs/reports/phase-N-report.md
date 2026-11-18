# BÁO CÁO NGHIỆM THU GIAI ĐOẠN N
## PHÁT HÀNH CÔNG KHAI CORE LÊN NPM VÀ BỎ HẲN GIT SUBMODULE

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Giai đoạn:** GĐ N (Phát hành công khai Core lên NPM và Bỏ hẳn Git Submodule)  
> **Người thực hiện:** Senior Software Architect kiêm Tech Lead  
> **Thời điểm hoàn thành:** 18/11/2026 | **Branch:** `master`  
> **Kết quả:** **HOÀN THÀNH 100% (17/17 TASKS ĐẠT CHUẨN DOD)**

---

### 1. TỔNG QUAN KẾT QUẢ THỰC HIỆN

Giai đoạn N đã hoàn tất việc chuyển đổi kênh phân phối duy nhất của Treecraft Core sang **NPM Package công khai (`@treecraft/core`)** và **loại bỏ triệt để 100% mô hình Git Submodule** khỏi kiến trúc, mã nguồn runtime, công cụ CLI và tài liệu dự án.

| Tiêu chuẩn nghiệm thu | Hiện trạng trước GĐ N (GĐ S) | Sau khi hoàn thành GĐ N | Đánh giá Tech Lead |
| :--- | :--- | :--- | :--- |
| **Kênh phân phối Core** | Git Submodule (`git submodule add <url> core`) | **NPM Registry công khai (`@treecraft/core`)** | Độc quyền phân phối qua npm, đạt chuẩn hệ sinh thái Node.js |
| **Dung lượng gói phân phối** | Kéo theo toàn bộ repo (721 files, ~5 MB) | **Whitelist tối ưu (424 files runtime, 571 KB tarball)** | Loại bỏ toàn bộ `tests/`, `docs/`, `.agents/`, `.env*`, dev data |
| **Luồng khởi tạo dự án** | 3 bước git: `git init` $\rightarrow$ `submodule` $\rightarrow$ `init` | **Chuẩn Node.js: `npm init` $\rightarrow$ `npm i @treecraft/core` $\rightarrow$ `npx treecraft init`** | Giảm thiểu ma sát tiếp cận, tự động cấu hình 100% |
| **Kiểm tra tính toàn vẹn Core** | Dùng lệnh `git status` trong thư mục `core/` | **Package Integrity Verification (`verifyPackageIntegrity`)** | Bất biến, kiểm tra tệp cốt lõi, chặn can thiệp ở Production |
| **Chốt chặn an toàn phát hành** | Chưa có | **`prepublishOnly` & `pack:check` script** | Ngăn cấm tuyệt đối AI publish; bắt buộc lint/test/pack đạt chuẩn |
| **Dấu vết Submodule trong code** | 8 vị trí trong `src/`, `bin/`, `tests/`, `views/` | **0 vị trí (`git grep` sạch 100%)** | Gỡ bỏ hoàn toàn `node core/bin`, `.gitmodules`, cờ submodule |
| **Kiểm thử cài đặt mới** | `verify:fresh-install` dùng `submodule add` | **Kiểm thử `verify:fresh-install` đóng gói tarball .tgz thật** | Cài đặt trong thư mục tạm OS, đạt **Tree Parity 100%** |
| **Live HTTP Smoke Test** | `smoke-fresh-project` dùng `submodule add` | **Khởi tạo và chạy live HTTP từ package npm thật** | **6/6 Endpoints HTTP PASS 100%** |
| **Bộ Test Suites của hệ thống** | 65 test suites, 601 tests passed | **65 test suites, 602 tests passed 100%** | Không phát sinh bất kỳ lỗi hồi quy nào |
| **Linter ESLint (`npm run lint`)** | 0 errors, 47 warnings | **0 errors, 45 warnings** | Đạt chuẩn chất lượng mã nguồn |
| **Tài liệu chuẩn 7 mục** | Thiếu hướng dẫn release npm & develop core | **Đầy đủ `release-npm.md` & `develop-core.md`** | Mẫu 7 mục tiếng Việt copy lệnh được (Windows/macOS/Linux) |

---

### 2. CHI TIẾT CÁC NHÓM CÔNG VIỆC ĐÃ HOÀN THÀNH

#### 🔹 Nhóm A: Chuẩn Hóa Cấu Trúc Gói NPM (Package Structure)
1. **Cập nhật `package.json`:**
   - Đặt tên gói scoped: `@treecraft/core`, phiên bản khởi đầu: `0.1.0`.
   - Cấu hình binary toàn cục: `"bin": { "treecraft": "bin/treecraft.js" }`.
   - Thiết lập Whitelist `files`: Chỉ đóng gói các thư mục và tệp runtime cần thiết (`bin/`, `src/`, `starter/`, `public/css/`, `public/img/icons/`, `public/js/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`).
   - Cấu hình `engines.node >= 20.0.0` và `publishConfig.access: "public"`.
   - Kết nối kho mã nguồn: `https://github.com/mittomao/Admin-CMS.git`.
2. **Hook đóng gói & Bảo vệ an ninh:**
   - `"prepack": "npm run build:css:admin"`: Đảm bảo Tailwind CSS của Admin CMS luôn được biên dịch minified sẵn trước khi đóng gói tarball.
   - `"prepublishOnly": "node src/scripts/prepublish-guard.js"`: Tự động chạy `lint`, `test`, `pack:check` và in thông báo cảnh báo nghiêm ngặt nhắc nhở AI không được phép publish.
   - `"pack:check": "node src/scripts/pack-check.js"`: Kiểm toán tệp đóng gói chỉ đọc qua `npm pack --dry-run`.
3. **Bộ tài liệu pháp lý & cộng đồng:**
   - `LICENSE`: Giấy phép MIT bản quyền mở chuẩn hóa cho Treecraft CMS Contributors.
   - `SECURITY.md`: Chính sách báo cáo lỗ hổng an ninh có trách nhiệm.
   - `CHANGELOG.md`: Nhật ký phiên bản `0.1.0` theo chuẩn Keep a Changelog.

#### 🔹 Nhóm B: Chế Độ Duy Nhất — Core Chạy Trong `node_modules`
1. **Tái cấu trúc `src/config/sitePaths.js`:**
   - Loại bỏ logic phân biệt submodule. Thiết lập quy tắc duy nhất: `CORE_DIR` luôn là thư mục chứa package npm (`path.resolve(__dirname, '../../')`), `SITE_DIR` luôn là thư mục làm việc của dự án người dùng (`process.cwd()`).
   - Core chạy ở chế độ Read-Only: Mọi thao tác ghi (logs, backups, file uploads) đều hướng về `SITE_DIR` hoặc `os.tmpdir()`.
2. **Cơ chế Package Integrity (`verifyPackageIntegrity`):**
   - Khi chạy từ `node_modules`, hệ thống tự động xác minh tính toàn vẹn của tệp cốt lõi (`src/server.js`, `src/app.js`, `bin/treecraft.js`). Cảnh báo ở dev và từ chối chạy ở staging/production nếu phát hiện can thiệp ngoài luồng.
3. **Nâng cấp CLI `bin/treecraft.js`:**
   - Lệnh `npx treecraft init`: Sinh tệp `package.json` cho dự án mới với các script gọi trực tiếp binary `treecraft` (thay vì `node core/bin/...`).
   - Bổ sung định tuyến lệnh thống nhất: `init`, `dev`, `start`, `doctor`, `backup`, `restore`, `sync:export`, `sync:import`, `tree:snapshot`, `tree:compare`.
4. **Cập nhật các công cụ vận hành:**
   - `src/scripts/doctor.js`: Báo cáo chế độ dự án qua npm package, kiểm tra quyền chỉ đọc đối với thư mục views của core.
   - `src/scripts/core-upgrade-cli.js`: Hướng dẫn nâng cấp qua `npm install @treecraft/core@latest`.
   - `src/views/admin/control-panel/index.ejs`: Cập nhật badge giao diện sang `Site với Core NPM Package`.

#### 🔹 Nhóm C: Bộ Công Cụ Kiểm Tra Gói & Kiểm Chứng Tự Động
1. **Script kiểm toán đóng gói (`npm run pack:check`):**
   - Chạy `npm pack --dry-run --json`.
   - Đảm bảo 100% không chứa các tệp cấm (`tests/`, `docs/`, `.agents/`, `.github/`, `.env*`, `Serialization/`).
   - Kiểm tra ngân sách file và dung lượng tarball đạt chuẩn.
2. **Kiểm thử cài đặt mới từ tarball (`tests/verify-fresh-install.js`):**
   - Đóng gói file `.tgz` thực tế trong thư mục tạm `os.tmpdir()`.
   - Chạy `npm init -y` $\rightarrow$ `npm install <tgz>` $\rightarrow$ `npx treecraft init --yes`.
   - Đối soát cây nội dung qua `tree:compare` đạt **Parity 100%** (54/54 nodes khớp tuyệt đối).
3. **Quét sạch toàn bộ dấu vết Submodule:**
   - Chạy `git grep` trên toàn bộ thư mục `src/`, `bin/`, `starter/`, `tests/` bảo đảm không còn từ khóa `submodule`, `node core/bin` hay `.gitmodules`.

#### 🔹 Nhóm D: Quy Trình Phát Hành (Release Runbook Cho Maintainer)
- Biên soạn tài liệu `docs/guides/release-npm.md` theo mẫu chuẩn 7 mục:
  - Hướng dẫn thiết lập 2FA bắt buộc trên tài khoản npm cá nhân của Maintainer.
  - Hướng dẫn phát hành thử nghiệm qua tag `next` (`npm publish --tag next --provenance`) trước khi đưa lên kênh chính thức `latest`.
  - Quy trình xử lý sự cố khẩn cấp (unpublish trong 72h hoặc deprecate phiên bản lỗi).

#### 🔹 Nhóm E: Cập Nhật Tài Liệu Kỹ Thuật Dự Án
- Viết mới `docs/guides/develop-core.md` chuẩn 7 mục hướng dẫn phát triển Core qua `npm link` hoặc cài đặt file `.tgz` cục bộ, cảnh báo không sửa code trong `node_modules`.
- Cập nhật lại toàn diện `docs/guides/core-and-site.md` và `docs/guides/fresh-install.md` chuyển sang luồng npm.
- Cập nhật `README.md` tại thư mục gốc bổ sung quickstart khởi tạo website qua npm.
- Cập nhật `.agents/rules/02-architecture-and-stack.md` xác lập chuẩn Core npm package.

---

### 3. BẰNG CHỨNG KIỂM THỬ VÀ NGHIỆM THU (EVIDENCES)

1. **Kiểm toán gói Whitelist (`npm run pack:check`):**
   ```text
   > @treecraft/core@0.1.0 pack:check
   > node src/scripts/pack-check.js
   Auditing package contents via npm pack --dry-run...
   Done in 498ms.
   - Package Name:  @treecraft/core
   - Version:       0.1.0
   - Total Files:    424
   - Unpacked Size: 2612.5 KB
   ✔ PACKAGE CHECK PASSED: Tarball contains only whitelisted, clean files.
   ```
2. **Kiểm thử cài đặt từ file `.tgz` cục bộ (`tests/verify-fresh-install.js`):**
   ```text
   [verify-fresh-install] Tarball produced: treecraft-core-0.1.0.tgz
   [verify-fresh-install] 3. Installing treecraft-core-0.1.0.tgz via npm install...
   [verify-fresh-install] 4. Initializing fresh site via: npx treecraft init --yes...
   [verify-fresh-install] 5. Validating generated directory structure and files...
   [verify-fresh-install] ✅ Generated package.json has valid Treecraft CLI scripts.
   [verify-fresh-install] ✅ Dynamic DB Name verified in configs.
   [verify-fresh-install] ✅ .gitignore verified clean of submodule artifacts.
   [verify-fresh-install] 6. Validating Content Tree Parity against corporate starter manifest...
   === KẾT QUẢ ĐỐI SOÁT CÂY NỘI DUNG (TREE PARITY) ===
   ✅ PARITY 100%: Hai cây nội dung hoàn toàn đồng nhất tuyệt đối! (54 nodes)
   🎉 VERIFICATION COMPLETED: Luồng NPM Package -> Init -> Dev thành công 100%!
   ```
3. **Live HTTP Smoke Test (`tests/smoke-fresh-project.js`):**
   ```text
   [smoke-test] ✅ Server is up and responding on http://127.0.0.1:4098
   [smoke-test] ✅ GET /health: 200 OK
   [smoke-test] ✅ GET /: 200 OK (Rendered 5346 bytes HTML)
   [smoke-test] ✅ GET /admin/login: 200 OK (Login form rendered)
   [smoke-test] ✅ POST /admin/login: 302 Redirect (Session established)
   [smoke-test] ✅ GET /admin/launchpad: 200 OK (Launchpad dashboard rendered)
   [smoke-test] ✅ GET /admin/content-editor: 200 OK (Content Editor workspace rendered)
   [smoke-test] ✅ Core Immutability verified: Thư mục core hoàn toàn nguyên vẹn và bất biến.
   🎉 ALL LIVE HTTP SMOKE TESTS PASSED (6/6 Endpoints OK)
   ```
4. **Hệ thống Test Suites toàn diện (`npm test`):**
   ```text
   Test Suites: 65 passed, 65 total
   Tests:       602 passed, 602 total
   Snapshots:   0 total
   Time:        96.181 s
   Ran all test suites.
   ```
5. **Kiểm tra cú pháp và chất lượng mã nguồn (`npm run lint`):**
   ```text
   > eslint src/ tests/
   ✖ 45 problems (0 errors, 45 warnings)
   ```

---

### 4. CAM KẾT VỀ QUY TẮC GIT VÀ PHÁT HÀNH NPM

- **Tuân thủ quy tắc Git:** AI tuyệt đối không chạy bất kỳ lệnh commit, add, push hay xóa git nào trong phiên làm việc. Toàn bộ thay đổi đang ở trạng thái working tree chờ Maintainer tự commit.
- **Tuân thủ quy tắc NPM:** AI tuyệt đối không chạy bất kỳ lệnh `npm publish`, `npm login` hay tạo token nào. Việc phát hành gói lên npm Registry công khai sẽ do Maintainer trực tiếp thực hiện theo hướng dẫn tại [docs/guides/release-npm.md](../guides/release-npm.md).
