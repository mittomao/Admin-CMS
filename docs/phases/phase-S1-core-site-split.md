---
phase: S1
name: Tách Core và Site (Core Đọc Từ Site)
depends_on: [0, 1, 2, 3, 4, 5.1, 6, 6.2, 7, 8, 8.1, 9, 10, 11, 11-Y2, 11-Y3, L1, F1, F2, F3, K1, E1]
status: Hoàn thành
start_date: 2026-11-13
end_date: 2026-11-13
lead: Senior Software Architect / Tech Lead
---

# GIAI ĐOẠN S1: TÁCH CORE VÀ SITE (CORE ĐỌC TỪ SITE)

## 1. MỤC TIÊU & TỔNG QUAN
Chuyển đổi kiến trúc Treecraft từ dạng Monolithic nguyên khối (trộn lẫn mã nguồn lõi hệ thống và tài nguyên riêng của từng website dự án) sang mô hình 2 phần tách biệt:
- **`core/` (Bất biến - Immutable Engine):** Chứa toàn bộ engine CMS, Admin UI, logic nghiệp vụ, migration, và CLI. Không ai được chỉnh sửa trực tiếp mã nguồn trong `core/`. Core không bao giờ ghi file vào thư mục của chính nó. Core không phụ thuộc vào vị trí cài đặt trên ổ đĩa (sẵn sàng trở thành npm package trong `node_modules`).
- **`site/` (Dự án - Project Space):** Chứa toàn bộ phần riêng của dự án: cấu hình dự án (`site.config.js`), file môi trường (`.env*`), view EJS công khai (`views/`), tài nguyên tĩnh (`public/`), dữ liệu đồng bộ (`serialization/`), sao lưu (`backups/`), và phần mở rộng (`extensions/`).

Tất cả đường dẫn tài nguyên được giải quyết duy nhất qua module trung tâm `src/config/sitePaths.js`.

---

## 2. BẢNG SO SÁNH HIỆN TRẠNG, THAY ĐỔI VÀ RỦI RO

| Hạng mục | Hiện trạng (Monolith) | Sau khi tách (Core / Site) | Rủi ro & Giải pháp phòng ngừa |
|:---|:---|:---|:---|
| **Bộ phân giải đường dẫn** | Dùng `process.cwd()` và `__dirname/..` rải rác ở 30+ vị trí. | Duy nhất module `src/config/sitePaths.js` chịu trách nhiệm resolve mọi path. | Rủi ro lệch path giữa Windows và POSIX. Giải pháp: Dùng `path.resolve` và chuẩn hóa slash `/`. |
| **Cấu hình thương hiệu & Site** | Cố định trong `src/config/branding.js` với các hằng số tĩnh. | Đọc động từ `site/site.config.js`. `branding.js` đóng vai trò Facade Adapter tương thích 100%. | Rủi ro thiếu file `site.config.js`. Giải pháp: Schema validator với thông báo lỗi chi tiết hướng dẫn chạy `init`. |
| **View Website công khai** | Nằm trong `src/views/site/` trộn lẫn với `src/views/admin/`. | Nằm độc lập tại `site/views/`. `viewPath` trong Layout/Rendering là tương đối đối với `site/views/`. | Rủi ro vỡ template cũ do `viewPath` có prefix `site/`. Giải pháp: Migration script chuẩn hóa idempotent kèm `--dry-run`. |
| **Tài nguyên tĩnh (Public)** | Phục vụ chung từ `public/`. Tài nguyên Admin và Site lẫn lộn. | Phục vụ riêng: Admin static từ `core/public` tại `/admin-assets/`; Site static từ `site/public/` tại `/site/` và `/`. | Rủi ro vỡ đường link ảnh/CSS trong EJS. Giải pháp: Giữ nguyên route `/site/...` trỏ tới `site/public/`. |
| **Biến môi trường (Env)** | Đọc từ file gốc `.env*` trong thư mục dự án theo GĐ E1. | Đọc từ `site/.env*`. Công cụ `check:env`, `doctor`, `dbGuard` đọc qua `sitePaths`. | Rủi ro không nạp được file env khi chạy CLI từ thư mục khác. Giải pháp: `sitePaths.getEnvPath()` tự động resolve theo `SITE_DIR`. |
| **Dữ liệu Serialization & Backups** | Lưu tại `Serialization/` và `storage/backups/` trong core. | Lưu tại `site/serialization/` và `site/backups/`. Core hoàn toàn chỉ đọc (read-only). | Rủi ro path traversal khi import. Giải pháp: Regex whitelist và chặn mọi truy cập ra ngoài `site/`. |
| **Điểm vào thực thi (Entrypoint)** | `src/app.js` và `src/server.js` khởi động trực tiếp bằng `npm start`. | CLI tập trung `core/bin/treecraft.js`. Mọi lệnh `npm run ...` là lớp mỏng gọi CLI. | Rủi ro thiếu shebang hoặc permission thực thi trên Unix. Giải pháp: Đảm bảo `chmod +x` và cấu hình `bin` chuẩn trong `package.json`. |

---

## 3. CHECKLIST CÔNG VIỆC CHI TIẾT (TASKS)

- [x] **Task S1.1: Xây dựng Module Trung tâm `src/config/sitePaths.js`**
  - [x] Triển khai hàm `resolveSiteDir(options)`: Thứ tự ưu tiên: Tham số `--site` → Biến môi trường `TREECRAFT_SITE_DIR` → Tìm ngược lên cây thư mục từ `process.cwd()` (dừng lại khi thấy `site.config.js`) → Thư mục `site/` đồng cấp với `core/`.
  - [x] Cung cấp các getter chuẩn: `getSiteDir()`, `getCoreDir()`, `getViewsDir()`, `getPublicDir()`, `getSerializationDir()`, `getBackupsDir()`, `getEnvPath()`, `getSiteConfigPath()`.
  - [x] Ném ngoại lệ chi tiết (kèm mã hướng dẫn chạy `treecraft init`) nếu không tìm thấy thư mục `site/` hợp lệ.

- [x] **Task S1.2: Định nghĩa Schema và Trình Kiểm tra `src/config/siteConfigSchema.js`**
  - [x] Định nghĩa schema cho `site.config.js`:
    - `projectName` (string, bắt buộc)
    - `rootName` (string, bắt buộc, ví dụ: "root")
    - `defaultLanguage` (string, mặc định: "vi")
    - `languages` (mảng string, ví dụ: `['vi', 'en']`)
    - `cloudinaryRootFolder` (object: `{ development, staging, production }`)
    - `mongoDbMaster` / `mongoDbWeb` (object: tên DB theo môi trường)
    - `requiresCore` (chuỗi SemVer range, ví dụ: ">=1.0.0 <2.0.0")
    - `starter` (tên starter đã dùng, ví dụ: "corporate")
    - `siteApiVersion` (chuỗi phiên bản API, ví dụ: "1.0.0")
  - [x] Hàm `validateSiteConfig(config)` trả về kết quả hợp lệ hoặc mảng lỗi chi tiết.
  - [x] Cấm tuyệt đối chứa mật khẩu, token, secret keys trong `site.config.js`.

- [x] **Task S1.3: Cải tạo `src/config/branding.js` Thành Facade Wrapper**
  - [x] Thay thế các hằng số cứng trong `branding.js` bằng cách đọc từ `sitePaths.getSiteConfig()`.
  - [x] Giữ nguyên 100% chữ ký export (`PROJECT_NAME`, `ROOT_NAME`, `ROOT_PATH`, `DEFAULT_BRANDING`, `getBranding()`) để đảm bảo không làm gãy 41 file đang import `branding.js`.

- [x] **Task S1.4: Tách Biệt Định Tuyến View (Admin Core vs Site EJS)**
  - [x] Điều chỉnh `src/app.js`: Phân định rõ ràng `coreViewsDir` (`src/views/admin`) và `siteViewsDir` (`sitePaths.getViewsDir()`).
  - [x] Cập nhật `src/services/siteRenderer.js`: Sử dụng `sitePaths.getViewsDir()`.
  - [x] Cập nhật `src/controllers/site/siteController.js`, `src/middlewares/basicAuthMiddleware.js`, `src/middlewares/maintenanceMiddleware.js` để tìm các trang lỗi (`401.ejs`, `404.ejs`, `500.ejs`, `503.ejs`) trong `sitePaths.getViewsDir()`. Nếu site thiếu, tự động fallback về trang lỗi mặc định của core (`src/views/admin/errors/`).
  - [x] Sửa lỗi tiềm ẩn: Thay thế `require(process.cwd() + '/src/fields')` trong `universal-renderer.ejs` và `field-modal.ejs` thành require tương đối an toàn.

- [x] **Task S1.5: Tách Biệt Phục Vụ Tài Nguyên Tĩnh (Static Assets)**
  - [x] Điều chỉnh `src/app.js`:
    - Phục vụ tài nguyên Admin của Core tại `/admin-assets/` từ `core/public/` (hoặc cấu hình tách biệt).
    - Phục vụ tài nguyên Site tại `/site/` và `/` từ `sitePaths.getPublicDir()`.
  - [x] Đảm bảo link ảnh, CSS, JS trên website công khai không bị thay đổi URL dẫn đến broken assets.

- [x] **Task S1.6: Điều chỉnh Nạp Môi Trường (Env) và Serialization / Backups**
  - [x] Cập nhật `src/config/env.js`: Nạp file cấu hình từ `sitePaths.getEnvPath()`.
  - [x] Cập nhật `src/config/serializationPaths.js`: Trỏ thư mục gốc serialization về `sitePaths.getSerializationDir()`.
  - [x] Cập nhật `src/services/backup/LocalStorageProvider.js`: Trỏ thư mục lưu trữ sao lưu về `sitePaths.getBackupsDir()`.
  - [x] Đảm bảo kiểm tra an toàn đường dẫn: Chặn tuyệt đối ghi file vào `core/`, `node_modules/`, `.git/`, hoặc `public/`.

- [x] **Task S1.7: Tạo Bộ Starter Mẫu `core/starter/corporate/`**
  - [x] Trích xuất toàn bộ tài nguyên mẫu của website hiện tại ra `core/starter/corporate/`:
    - `site.config.js`: Cấu hình mẫu.
    - `.env.example`: File mẫu biến môi trường.
    - `views/`: Layouts (`HomeLayout.ejs`), Components (`HeroBanner.ejs`, `Introduction.ejs`, `ImageText.ejs`), Partials (`Header.ejs`, `Footer.ejs`), Errors (`401.ejs`, `404.ejs`, `500.ejs`, `503.ejs`).
    - `public/`: CSS Tailwind compiled (`css/tailwind.css`), ảnh mẫu.
    - `serialization/`: Các file YAML cho Content (`home`, `about-us`), Layouts, Renderings, Placeholders.
    - `package.json`: Tệp tối thiểu cho `site/` chứa scripts trỏ tới CLI của core.

- [x] **Task S1.8: Xây dựng CLI Entrypoint `core/bin/treecraft.js`**
  - [x] Khởi tạo CLI với các lệnh cốt lõi:
    - `treecraft start [--site <path>]`: Khởi động ứng dụng.
    - `treecraft dev [--site <path>]`: Khởi động chế độ phát triển (kèm nodemon/watch).
    - `treecraft doctor [--site <path>]`: Kiểm tra tính toàn vẹn của Core và Site.
    - `treecraft where`: In thông tin đường dẫn Core, Site, Node, và môi trường hiện tại.
    - `treecraft migrate [--site <path>]`: Chạy migration DB.
  - [x] Khai báo `bin` và `files` trong `core/package.json` chuẩn hóa để sẵn sàng publish npm.
  - [x] Giữ các script `npm run ...` trong core là lớp mỏng gọi `node bin/treecraft.js`.

- [x] **Task S1.9: Migration Chuẩn Hóa `viewPath` (Idempotent Migration Script)**
  - [x] Tạo script `src/scripts/migrate-site-viewpaths.js`:
    - Quét toàn bộ Layout và Rendering trong database Master và Web.
    - Nếu `viewPath` có tiền tố dư thừa (ví dụ `site/components/HeroBanner.ejs` hoặc `views/site/...`), chuẩn hóa thành đường dẫn tương đối trong `site/views/` (ví dụ `components/HeroBanner.ejs`).
    - Hỗ trợ cờ `--dry-run` để kiểm tra trước. Tích hợp tự động kích hoạt backup K1 trước khi chạy thật.

- [x] **Task S1.10: Kiểm Thử Toàn Diện Ràng Buộc Vị Trí (Location Independence & Immutability Test)**
  - [x] Viết test tự động kiểm chứng:
    1. Chạy CLI từ thư mục bên ngoài (cwd khác cả core và site).
    2. Chạy với thư mục `core` được copy/rename sang một đường dẫn bất kỳ (ví dụ `/tmp/custom-core`).
    3. Kiểm chứng tính bất biến (Immutability): So sánh cây thư mục và hash của `core/` trước và sau khi server hoạt động; đảm bảo core không có bất kỳ file nào được tạo mới hoặc thay đổi.

---

## 4. DEFINITION OF DONE (DOD) CHO GIAI ĐOẠN S1
1. **Zero Hardcoded CWD:** Lệnh `git grep "process.cwd()"` không còn được dùng làm gốc tài nguyên trong mã nguồn xử lý view, public, serialization, backup (ngoại trừ module phân giải `sitePaths.js`).
2. **Core Read-Only:** Thư mục `core/` không bị ghi bất kỳ file log, cache, backup, serialization nào trong toàn bộ vòng đời ứng dụng.
3. **Location Independence:** Hệ thống khởi động bình thường khi `core/` nằm ở bất kỳ đâu trên hệ thống tệp và trỏ tới `site/` qua tham số hoặc biến môi trường.
4. **Backward Compatibility:** Toàn bộ 41 file đang import `src/config/branding.js` và hệ thống Admin CMS hiện tại hoạt động bình thường 100% không bị lỗi logic hay broken layout.
5. **Tài liệu Hướng dẫn:** Cập nhật đầy đủ hướng dẫn kiến trúc và vận hành trong `docs/guides/core-and-site.md` theo chuẩn 7 mục.

