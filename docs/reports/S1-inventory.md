# BẢN KIỂM KÊ VỊ TRÍ FILE VÀ ĐƯỜNG DẪN TÀI NGUYÊN (PHASE S1 INVENTORY)
## PHÂN TÍCH HIỆN TRẠNG PHỤ THUỘC ĐƯỜNG DẪN TRƯỚC KHI TÁCH CORE VÀ SITE

- **Tài liệu:** `docs/reports/S1-inventory.md`
- **Giai đoạn:** S1 (Core / Site Split) & S2 (Lệnh `init` Starter)
- **Ngày lập:** 2026-11-13
- **Mục tiêu:** Kiểm kê 100% vị trí đang cố định (hardcode) đường dẫn tới view site, public site, env, serialization, backup, cache, seed, và các lệnh gọi `process.cwd()`, `__dirname` để thiết kế module trung tâm `src/config/sitePaths.js`.

---

### 1. Bản đồ Kiểm kê theo Nhóm Chức năng

#### Nhóm 1: View của Website Công Khai (`views/site`)
Hiện tại view của website công khai đang nằm chung trong thư mục `src/views/site/` cùng cấp với view quản trị `src/views/admin/`.

| File mã nguồn | Dòng | Đoạn mã hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| `src/app.js` | 104 | `app.set('views', path.join(__dirname, 'views'));` | Trộn lẫn view admin của core và view site | Tách biệt: Admin view dùng `coreViewsDir`, Site view dùng `sitePaths.getViewsDir()` |
| `src/services/siteRenderer.js` | 16 | `const VIEWS_SITE_DIR = path.resolve(__dirname, '../views/site');` | Cố định vào thư mục `src/views/site` của core | Đổi thành `sitePaths.getViewsDir()` |
| `src/controllers/site/siteController.js` | 11, 79, 102 | `const VIEWS_SITE_DIR = path.resolve(__dirname, '../../views/site');` | Hardcode tìm `errors/404.ejs`, `errors/500.ejs` trong core | Đổi thành `sitePaths.getViewsDir()` |
| `src/middlewares/basicAuthMiddleware.js` | 16, 113 | `const VIEWS_SITE_DIR = path.resolve(__dirname, '../views/site');` | Hardcode tìm `errors/401.ejs` trong core | Đổi thành `sitePaths.getViewsDir()` |
| `src/middlewares/maintenanceMiddleware.js` | 43 | `res.render('site/errors/503')` | Dựa vào view engine mặc định | Render trực tiếp từ `sitePaths.getViewsDir() + '/errors/503.ejs'` |
| `src/services/presentationService.js` | 81 | `path.join(process.cwd(), 'src', 'views', cleanPath)` | Dùng `process.cwd()` và cố định `src/views` | Kiểm tra tồn tại qua `path.join(sitePaths.getViewsDir(), cleanPath)` |

*Tổng số vị trí Nhóm 1:* **7 vị trí**.

---

#### Nhóm 2: Tài nguyên Tĩnh của Site (`public/site`)
Tài nguyên CSS/JS/IMG của website công khai đang nằm xen kẽ với tài nguyên của Admin CMS trong `public/`.

| File mã nguồn | Dòng | Đoạn mã hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| `src/app.js` | 100 | `app.use(express.static(path.join(__dirname, '../public')));` | Phục vụ chung toàn bộ thư mục `public/` | Phục vụ admin static từ core: `/admin-assets`; Phục vụ site static từ `sitePaths.getPublicDir()` tại `/site` và `/` |
| `package.json` | 9, 12 | `tailwindcss ... -i ./src/styles/site/main.css -o ./public/site/css/tailwind.css` | Script build CSS site nằm trong package core | Chuyển sang `site/package.json` của từng dự án |
| `tailwind.site.config.js` | 3 | `content: ['./src/views/site/**/*.ejs']` | Cố định quét view site trong core | Cấu hình trong `site/` quét `./views/**/*.ejs` |

*Tổng số vị trí Nhóm 2:* **3 vị trí**.

---

#### Nhóm 3: Cấu hình Môi trường (`.env*`)
Các file `.env`, `.env.example` đang đặt tại thư mục gốc của core.

| File mã nguồn | Dòng | Đoạn mã hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| `src/config/env.js` | 10 | `const mainEnvPath = path.resolve(process.cwd(), '.env');` | Dùng `process.cwd()` | Đổi thành `path.join(sitePaths.getSiteDir(), '.env')` |
| `src/config/env.js` | 49 | `const overrideEnvPath = path.resolve(process.cwd(), overrideEnvFile);` | Dùng `process.cwd()` | Đổi thành `path.join(sitePaths.getSiteDir(), overrideEnvFile)` |
| `src/scripts/check-env.js` | 18 | `const rootDir = process.cwd();` | Giả định file env nằm tại `process.cwd()` | Đọc `.env.example` và `.env` từ `sitePaths.getSiteDir()` |
| `src/scripts/clone-from-remote.js` | 58, 63, 94 | `path.resolve(process.cwd(), sourceEnvFile)` | Dùng `process.cwd()` | Đổi thành `path.join(sitePaths.getSiteDir(), ...)` |

*Tổng số vị trí Nhóm 3:* **5 vị trí**.

---

#### Nhóm 4: Thư mục Serialization YAML (`Serialization/`)
Các tệp YAML xuất nhập item đang đặt tại thư mục `Serialization/` trong gốc dự án.

| File mã nguồn | Dòng | Đoạn mã hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| `src/config/serializationPaths.js` | 13, 14 | `const PROJECT_ROOT = path.resolve(__dirname, '../../');`<br/>`path.join(PROJECT_ROOT, 'Serialization');` | Buộc thư mục Serialization phải nằm cùng cấp với core | Đổi thành `sitePaths.getSerializationDir()` (`site/serialization`) |
| `src/config/serializationPaths.js` | 17-24 | `FORBIDDEN_DIRS` chứa `path.join(PROJECT_ROOT, 'src')`... | Giả định cấu trúc thư mục của core | Bổ sung thư mục gốc của core vào danh sách cấm ghi |
| `src/services/yamlSectionService.js` | Nhiều | Gọi `serializationPaths.getSerializationDir()` | An toàn nếu `serializationPaths` được cập nhật | Tự động hưởng lợi khi `serializationPaths` trỏ về `site/` |

*Tổng số vị trí Nhóm 4:* **3 vị trí**.

---

#### Nhóm 5: Thư mục Sao lưu Dữ liệu (`storage/backups`)

| File mã nguồn | Dòng | Đoạn mã hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| `src/config/env.js` | 113 | `path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'storage', 'backups', appEnv))` | Mặc định ghi vào `storage/backups` trong core | Mặc định trỏ về `sitePaths.getBackupsDir()` (`site/backups/<appEnv>`) |
| `src/services/backup/LocalStorageProvider.js` | - | Đọc `env.BACKUP_DIR` | An toàn nếu `env.BACKUP_DIR` trỏ về site | Tự động chuyển hướng ghi file sao lưu ra `site/backups/` |

*Tổng số vị trí Nhóm 5:* **2 vị trí**.

---

#### Nhóm 6: Cấu hình Thương hiệu & Metadata (`src/config/branding.js`)

| File mã nguồn | Số lần import | Nội dung hiện tại | Vấn đề / Rủi ro | Giải pháp với `sitePaths` |
|:---|:---:|:---|:---|:---|
| 41 files trong `src/` | 150+ vị trí | `PROJECT_NAME = 'Treecraft'`, `ROOT_NAME = 'root'`, `PATHS = {...}` | Tên dự án bị hardcode trong core, không tuỳ biến theo từng site | Chuyển `branding.js` thành lớp bọc đọc `site.config.js` qua `sitePaths.getSiteConfig()`, giữ nguyên 100% chữ ký export |

*Tổng số vị trí Nhóm 6:* **1 module tập trung làm facade wrapper**.

---

#### Nhóm 7: Seed Dữ liệu Mẫu Website (`seed-sample-site.js`)

| File mã nguồn | Nội dung hiện tại | Vấn đề | Giải pháp cho S1/S2 |
|:---|:---|:---|:---|
| `src/scripts/seed-sample-site.js` | Khởi tạo HomeLayout, HeroBanner, Introduction, ImageText, trang Home/About us | Thuộc về mẫu dự án (Site/Starter), không thuộc Core Engine | Tách toàn bộ nội dung mẫu thành starter `core/starter/corporate/` (chứa views, public, YAML). Thay thế `seed:sample` bằng lệnh `treecraft init` |
| `package.json` | `"seed:sample": "node src/scripts/seed-sample-site.js"` | Script core phụ thuộc dữ liệu site mẫu | Loại bỏ `"seed:sample"`, chuyển quyền dựng site sang `treecraft init` |

*Tổng số vị trí Nhóm 7:* **2 vị trí**.

---

#### Nhóm 8: Toàn bộ Lệnh gọi `process.cwd()` trong Core

| File | Dòng | Mục đích hiện tại | Giải pháp chuẩn hoá |
|:---|:---:|:---|:---|
| `src/config/env.js` | 10 | Tìm `.env` | Dùng `sitePaths.getSiteDir()` |
| `src/config/env.js` | 49 | Tìm `.env.${appEnv}` | Dùng `sitePaths.getSiteDir()` |
| `src/config/env.js` | 113 | Tìm `storage/backups` | Dùng `sitePaths.getBackupsDir()` |
| `src/services/presentationService.js` | 81 | Tìm file view EJS | Dùng `sitePaths.getViewsDir()` |
| `src/scripts/check-branding.js` | 107 | Quét file trong repo | Giữ nguyên cho việc audit nội bộ của core |
| `src/scripts/check-env.js` | 18 | Tìm file env | Dùng `sitePaths.getSiteDir()` |
| `src/scripts/check-languages.js` | 85 | In đường dẫn tương đối | Giữ nguyên cho audit nội bộ |
| `src/scripts/clone-from-remote.js` | 58, 63, 94 | Tìm file env | Dùng `sitePaths.getSiteDir()` |
| `src/views/admin/templates/modals/field-modal.ejs` | 52 | `require(process.cwd() + '/src/fields')` | **Lỗi nguy hiểm khi chạy từ cwd khác!** Đổi thành `require('../../../fields')` hoặc helper core |
| `src/views/content-editor/fields/universal-renderer.ejs` | 4 | `require(process.cwd() + '/src/fields')` | **Lỗi nguy hiểm khi chạy từ cwd khác!** Đổi thành `require('../../fields')` hoặc helper core |

*Tổng số vị trí Nhóm 8:* **10 vị trí** (trong đó có 2 vị trí bug tiềm ẩn trong EJS template khi chạy từ thư mục khác).

---

#### Nhóm 9: Các Vị trí Core Ghi Dữ liệu vào Đĩa (Core Write Operations)

| Vị trí ghi | Thư mục đích hiện tại | Nguy cơ khi core là `node_modules` | Giải pháp với S1 |
|:---|:---|:---|:---|
| Sao lưu DB (`backupService.js`) | `storage/backups/<appEnv>` | Lỗi EACCES khi core là package chỉ đọc | Ghi ra `SITE_DIR/backups/<appEnv>` |
| Xuất YAML (`yamlItemSerializer.js`) | `Serialization/<Section>/` | Lỗi EACCES | Ghi ra `SITE_DIR/serialization/` |
| File tạm bảo trì / restore | Biến cờ trong RAM / DB | Đang lưu trong Mongo settings | An toàn, giữ nguyên trong MongoDB |
| Logging (`logger.js`) | Console stream | Không ghi ra file trong core | An toàn, giữ nguyên Console transport |
| Upload media (`uploadMiddleware.js`) | Memory storage | Stream trực tiếp lên Cloudinary | An toàn, không ghi file tạm trên đĩa |

---

### 2. Tổng kết Thống kê Thay đổi

- **Số tệp tin trong Core cần hiệu chỉnh đường dẫn:** ~12 tệp tin.
- **Số tệp tin tài nguyên cần bóc tách ra Starter (`core/starter/corporate/`):**
  - Views: 12 tệp EJS (layouts, components, partials, errors).
  - Public: 1 tệp CSS Tailwind.
  - Serialization: Toàn bộ thư mục YAML hiện tại (Templates, Layouts, Placeholders, Renderings).
- **Module mới cần tạo trong Core:**
  - `src/config/sitePaths.js` (Bộ phân giải đường dẫn duy nhất).
  - `src/config/siteConfigSchema.js` (Trình xác thực schema `site.config.js`).
  - `bin/treecraft.js` (CLI entrypoint cho core).
- **Rủi ro lớn nhất:** Quá trình render EJS của site và resolution `viewPath` có thể bị lỗi nếu đường dẫn không được chuẩn hóa triệt để không phân biệt hệ điều hành (Windows `\` vs POSIX `/`).

