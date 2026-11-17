---
phase: S
name: Tách Core và Site, Lệnh init Một Bước, Luồng Submodule -> Init -> Dev
status: Hoàn thành
depends_on: [11-Y3, R2]
estimate: 3-4 ngày làm việc
started: 2026-11-17
completed: 2026-11-17
updated: 2026-11-17
---

# GĐ S - Tách Core và Site, Lệnh `init` Một Bước, Luồng "Submodule → Init → Dev"

> Biến Treecraft thành Core Repository bất biến (git submodule). Các dự án mới (A, B, C) sử dụng Core qua submodule và chứa toàn bộ logic, views, assets, serialization của riêng mình trong thư mục `site/`. Cung cấp lệnh CLI một bước `node core/bin/treecraft.js init` tự động hóa toàn diện từ cài đặt đến cấu hình DB, không thao tác thủ công.

---

## 1. Mục tiêu Giai đoạn S

1. **Kiến trúc Core Bất Biến (Read-Only Submodule):**
   - Core repository độc lập tuyệt đối, không chứa code riêng của từng site.
   - Core không bao giờ tự ghi file vào thư mục nội bộ của chính mình khi chạy ở chế độ submodule.
2. **Thư mục Dự Án `site/` Hoàn Toàn Độc Lập:**
   - Dự án mới lưu trữ: `site/site.config.js`, `site/.env.development`, `site/views/`, `site/public/`, `site/serialization/`, `site/backups/`.
3. **Bộ Phân Giải Đường Dẫn Độc Lập Vị Trí (`src/config/sitePaths.js`):**
   - Thay thế toàn bộ việc dùng `process.cwd()` trực tiếp hoặc relative `__dirname` xuyên tầng.
   - Hỗ trợ cả 2 chế độ: Site Submodule Mode và Core Standalone Mode (tương thích ngược 100%).
4. **Mô Hình Một Database Duy Nhất, Hai Collections (`items_master`, `items_web`):**
   - Mỗi dự án sở hữu 1 database MongoDB duy nhất: `treecraft_<slug>`.
   - Master Store và Web Store là 2 collections trong cùng database.
5. **Lệnh CLI Một Bước `node core/bin/treecraft.js init`:**
   - Hoàn tất mọi khâu: sinh cấu hình, tạo DB, nạp seed hệ thống, sync starter serialization, tạo admin user, cài đặt dependencies.
   - Lập trình viên chỉ cần gõ `npm run dev` là vào được ngay `/admin`.
6. **Script Kiểm Chứng Cài Đặt Sạch `npm run verify:fresh-install`:**
   - Tạo repo tạm thời trong OS temp dir, submodule add core, chạy `init`, verify HTTP 200 `/admin/login` và public site, sau đó dọn sạch.

---

## 2. Bảng Phân Tích Các Nhóm Công Việc: Hiện Trạng $\rightarrow$ Thay Đổi $\rightarrow$ Rủi Ro

| Nhóm | Hiện trạng trong Core | Thay đổi sang Core / Site | Mức độ rủi ro & Cách khắc phục |
| :--- | :--- | :--- | :--- |
| **Nhóm A: Bộ phân giải `sitePaths.js`** | Chưa có; code dùng phân mảnh `process.cwd()`, `__dirname`. | Tạo `src/config/sitePaths.js` resolve: `SITE_DIR`, `CORE_DIR`, `VIEWS_DIR`, `PUBLIC_DIR`, `SERIALIZATION_DIR`, `BACKUP_DIR`. | **Cao:** Nếu không nhận diện đúng mode sẽ vỡ path. *Khắc phục:* Có fallback standalone mode tự động. |
| **Nhóm B: Thích ứng `branding.js` & `env.js`** | `branding.js` hardcode tên 'Treecraft'. `env.js` đọc `.env` ở `process.cwd()`. | `branding.js` bọc `site.config.js`. `env.js` nạp file `.env` từ `sitePaths.SITE_DIR`. | **Cao:** Có 51 file import `branding.js`. *Khắc phục:* Giữ nguyên toàn bộ exports của `branding.js`. |
| **Nhóm C: Phục vụ Static & View Engine** | `app.js` mount duy nhất `core/public` và `core/src/views`. | Mount cả `core/public` (ưu tiên cho admin) và `site/public` (cho site). View engine trỏ đúng site views. | **Trung bình:** Trùng tên file static. *Khắc phục:* Định tuyến rõ ràng namespace admin và public site. |
| **Nhóm D: Rendering & Bảo mật ViewPath** | `siteRenderer.js` và `presentationService.js` whitelist `src/views/site/`. | Whitelist `sitePaths.VIEWS_DIR`. Giữ nguyên cơ chế chặn path traversal `..`. | **Cao:** Lỗi DEC-033 từ chối view ngoài core. *Khắc phục:* Cập nhật kiểm tra root view an toàn theo `sitePaths`. |
| **Nhóm E: Serialization & Backup Storage** | `serializationPaths.js` ghi vào `PROJECT_ROOT/Serialization`. Backup ghi vào `data/backups/`. | Trỏ vào `sitePaths.SERIALIZATION_DIR` và `sitePaths.BACKUP_DIR`. | **Trung bình:** Lệch đường dẫn lưu file. *Khắc phục:* Kiểm tra thư mục đích tồn tại an toàn. |
| **Nhóm F: Bảo vệ Tính Bất Biến của Core** | Winston ghi log vào `logs/` trong core. Media upload lưu vào `public/uploads/`. | Không ghi vào core. Log và Uploads chuyển vào thư mục của Site hoặc OS temp. | **Trung bình:** Quyền ghi đĩa bị từ chối nếu submodule ở chế độ read-only. |
| **Nhóm G: CLI Entry Point `core/bin/treecraft.js`** | Chỉ có một số script rời rạc trong `src/scripts/`. | Viết CLI đa năng bằng thuần Node.js built-in: `init`, `dev`, `build`, `start`, `sync:*`, `backup`, `restore`. | **Cao:** Crash nếu require package ngoài trước khi npm install. *Khắc phục:* Top-level chỉ dùng built-in. |
| **Nhóm H: Kiểm chứng Cài Đặt Sạch** | Chưa có kịch bản kiểm chứng tự động từ zero. | Tạo `scripts/verify-fresh-install.js` tự động hóa toàn bộ luồng trong thư mục tạm OS. | **Thấp:** Chỉ chạy trong môi trường test tạm thời. |

---

## 3. Checklist Công Việc Chi Tiết

### Nhóm A: Bộ phân giải đường dẫn độc lập `sitePaths.js`
- [x] Tạo `src/config/sitePaths.js` với thuật toán nhận diện: CLI flag `--site` $\rightarrow$ `TREECRAFT_SITE_DIR` $\rightarrow$ Search upward tìm `site.config.js` hoặc `site/` $\rightarrow$ Fallback Core Standalone.
- [x] Cung cấp các getter: `SITE_DIR`, `CORE_DIR`, `CONFIG_FILE`, `ENV_FILE`, `VIEWS_DIR`, `PUBLIC_DIR`, `SERIALIZATION_DIR`, `BACKUP_DIR`, `STARTER_DIR`.
- [x] Viết unit tests kiểm thử độ bền của `sitePaths.js` (`tests/sitePaths.test.js`).

### Nhóm B: Adapter cho `branding.js` và `env.js`
- [x] Tái cấu trúc `src/config/branding.js` thành wrapper nạp động các trường brand identity từ `site.config.js` trong khi bảo toàn các hằng số cây phân cấp.
- [x] Cập nhật `src/config/env.js` nạp file `.env` và `.env.<APP_ENV>` theo đường dẫn do `sitePaths` cung cấp.
- [x] Cập nhật `src/config/dbGuard.js` cho phép tiền tố DB `treecraft_*` trên môi trường development.

### Nhóm C: Cấu hình Express App (`app.js`, `server.js`)
- [x] Cấu hình Express static: mount `core/public` cho tài nguyên quản trị và mount `sitePaths.PUBLIC_DIR` cho tài nguyên website công khai.
- [x] Cấu hình EJS view lookup đa tầng hoặc cô lập theo router.

### Nhóm D: Tích hợp Site Renderer & Presentation Service
- [x] Cập nhật `src/services/siteRenderer.js` dùng `sitePaths.VIEWS_DIR`.
- [x] Cập nhật `src/services/presentationService.js` validate `viewPath` hợp lệ bên trong `sitePaths.VIEWS_DIR`.
- [x] Cập nhật `src/controllers/site/siteController.js` render trang lỗi 404/500 từ thư mục site views.

### Nhóm E: Tích hợp Serialization và Backup
- [x] Cập nhật `src/config/serializationPaths.js` dùng `sitePaths.SERIALIZATION_DIR`.
- [x] Cập nhật `src/services/backup/LocalStorageProvider.js` dùng `sitePaths.BACKUP_DIR`.

### Nhóm F: Đảm bảo Tính Bất Biến (Read-Only Core)
- [x] Cấu hình Logger Winston không ghi file vào core khi chạy ở chế độ submodule (stream Console).
- [x] Đảm bảo thư mục `core/` không bị bất kỳ tiến trình nào tạo file rác (uploads qua Cloudinary, backups/serialization trong `site/`).

### Nhóm G: CLI Entry Point `core/bin/treecraft.js`
- [x] Xây dựng `core/bin/treecraft.js` bằng pure Node.js (không phụ thuộc external deps ở top-level).
- [x] Triển khai lệnh `treecraft init`:
  - [x] Nhận tham số hoặc hỏi interactive: `--name`, `--slug`, `--db-prefix`, `--admin-user`, `--admin-pass`, `--yes`.
  - [x] Kiểm tra và tự động chạy `npm install` bên trong `core` nếu thiếu.
  - [x] Sinh `package.json` và `.gitignore` tại root của Site.
  - [x] Sinh `site/site.config.js` và `site/.env.development`.
  - [x] Khởi tạo thư mục `site/views/`, `site/public/`, `site/serialization/`, `site/backups/`.
  - [x] Chạy Core System Seed (Fixed System IDs).
  - [x] Copy starter templates & components vào `site/serialization/` và thực thi Sync.
  - [x] Tạo tài khoản Admin.
- [x] Triển khai các lệnh wrapper: `treecraft dev`, `treecraft start`, `treecraft sync:export`, `treecraft sync:import`, `treecraft backup`, `treecraft restore`.

### Nhóm H: Xác minh & Tài liệu hóa
- [x] Tạo script `tests/verify-fresh-install.js` mô phỏng luồng hoàn chỉnh trên OS temp directory.
- [x] Biên soạn tài liệu hướng dẫn chuẩn 7 mục tại `docs/guides/core-and-site.md`.
- [x] Đảm bảo 100% test suites hiện có tiếp tục pass.

---

## 4. Định Nghĩa Hoàn Thành (Definition of Done - DoD)

1. [x] Không có file nào trong `src/` trực tiếp hardcode đường dẫn tới `src/views/site/` hoặc `PROJECT_ROOT/Serialization`.
2. [x] Lệnh `node core/bin/treecraft.js init --yes` chạy thành công trên một thư mục trống có submodule `core`, không báo lỗi thiếu package.
3. [x] Sau khi `init`, chạy `npm run dev` vào được `/admin/login` và truy cập được trang chủ `/`.
4. [x] Cây nội dung `items_master` sau khi `init` đạt 100% đồng nhất (Parity) với snapshot chuẩn.
5. [x] Script `verify:fresh-install` chạy pass trên thư mục tạm.
6. [x] Không vi phạm Quy tắc Git: không commit, `git status --short` kiểm soát chặt chẽ.
7. [x] Toàn bộ test suites hiện có đều pass.

