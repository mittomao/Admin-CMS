# BÁO CÁO KHẢO SÁT HIỆN TRẠNG (INVENTORY) — GIAI ĐOẠN S: TÁCH CORE & SITE

> **Mã tài liệu:** `docs/reports/S-inventory.md`  
> **Ngày lập:** 17/11/2026  
> **Phạm vi khảo sát:** Toàn bộ mã nguồn `src/`, `bin/`, `scripts/`, cấu hình, kiểm thử và tài nguyên liên quan.

---

## 1. MỤC TIÊU KHẢO SÁT

Khảo sát toàn diện để chuẩn bị cho kiến trúc tách **Treecraft Core (bất biến, submodule)** và **Site (repo người dùng)**:
1. Xác định tất cả các vị trí hardcode đường dẫn (`views`, `public`, `env`, `serialization`, `backups`, `uploads`, `logs`, `temp`).
2. Thống kê toàn bộ việc sử dụng `process.cwd()` và đường dẫn tương đối qua `__dirname`.
3. Thống kê các file import `branding.js` (`PROJECT_NAME`, `ROOT_NAME`, `ROOT_PATH`, `PATHS`).
4. Liệt kê các nơi Core tự ghi file vào thư mục nội bộ của chính nó (vi phạm tính bất biến).
5. Kiểm tra tính nhất quán của mô hình Database (1 DB duy nhất vs 2 collections `items_master` và `items_web`).

---

## 2. DANH MỤC ĐƯỜNG DẪN CẦN TRỪU TƯỢNG HOÁ QUA `sitePaths.js`

| Tài nguyên | Hiện trạng trong Core | Đường dẫn mới khi tách Core / Site | Mức độ rủi ro |
| :--- | :--- | :--- | :--- |
| **Site Config** | Không có (chỉ có `src/config/branding.js`) | `<SITE_DIR>/site.config.js` | Cao (phải có fallback cho chế độ core standalone) |
| **Env files** | `process.cwd()/.env`, `.env.<APP_ENV>` (`src/config/env.js`) | `<SITE_DIR>/.env.<APP_ENV>`, `.env` | Cao (ảnh hưởng toàn bộ biến môi trường) |
| **Admin Views** | `src/views/` (layout `layouts/shell.ejs`) | `core/src/views/` (giữ nguyên trong Core) | Thấp (chỉ admin truy cập) |
| **Site Views** | `src/views/site/` (`siteController.js`, `siteRenderer.js`) | `<SITE_DIR>/views/` (chứa layouts, components, errors) | Rất cao (quyết định render public site) |
| **Admin Static** | `public/` (`express.static(path.join(__dirname, '../public'))`) | `core/public/` (mount tại `/admin` hoặc route tĩnh core) | Trung bình |
| **Site Static** | Dùng chung `public/` | `<SITE_DIR>/public/` (mount tại root `/` cho static assets dự án) | Trung bình |
| **Serialization** | `path.join(PROJECT_ROOT, 'Serialization')` (`serializationPaths.js`) | `<SITE_DIR>/serialization/` (hoặc cấu hình trong `site.config.js`) | Cao (liên quan đến sync YAML) |
| **Backups** | `data/backups/`, `storage/backups/` (`LocalStorageProvider.js`) | `<SITE_DIR>/backups/` | Trung bình |
| **Media Uploads** | `public/uploads/` hoặc Cloudinary | Cloudinary hoặc `<SITE_DIR>/public/uploads/` | Trung bình |
| **Logs** | `logs/` (Winston logger ghi vào root cwd) | `<SITE_DIR>/logs/` (nếu ghi file) | Thấp |
| **Starter Data** | Nằm rải rác trong `src/scripts/` | `core/starter/corporate/` (chứa serialization + manifest mẫu) | Cao (dùng cho lệnh `init`) |

---

## 3. THỐNG KÊ CHI TIẾT SỬ DỤNG `process.cwd()` VÀ `__dirname`

Trong thư mục `src/`, các file sau hiện đang trực tiếp phụ thuộc vào `process.cwd()`:

1. `src/config/env.js`:
   - Dòng 17: `path.resolve(process.cwd(), '.env')`
   - Dòng 21: `path.resolve(process.cwd(), \`.env.\${appEnv}\`)`
   - Dòng 99: `BACKUP_DIR: process.env.BACKUP_DIR || path.join(process.cwd(), 'data', 'backups')`
   - *Giải pháp:* Chuyển sang đọc qua `sitePaths.resolveEnvFile()` và `sitePaths.BACKUP_DIR`.

2. `src/services/presentationService.js`:
   - Dòng 81: `path.join(process.cwd(), 'src', 'views', cleanPath)`
   - *Giải pháp:* Thay bằng `path.join(sitePaths.VIEWS_DIR, cleanPath)`.

3. `src/services/siteRenderer.js`:
   - Dòng 16: `const VIEWS_SITE_DIR = path.resolve(__dirname, '../views/site');`
   - *Giải pháp:* Khởi tạo `this.viewsSiteDir = sitePaths.VIEWS_DIR`.

4. `src/controllers/site/siteController.js`:
   - Dòng 11: `const VIEWS_SITE_DIR = path.resolve(__dirname, '../../views/site');`
   - *Giải pháp:* Nạp từ `sitePaths.VIEWS_DIR`.

5. `src/config/serializationPaths.js`:
   - Dòng 11: `const PROJECT_ROOT = path.resolve(__dirname, '../../');`
   - Dòng 12: `const DEFAULT_SERIALIZATION_DIR = path.join(PROJECT_ROOT, 'Serialization');`
   - *Giải pháp:* Sử dụng `sitePaths.SERIALIZATION_DIR`.

6. `src/scripts/check-branding.js`, `src/scripts/check-env.js`, `src/scripts/check-languages.js`, `src/scripts/clone-from-remote.js`:
   - Sử dụng `process.cwd()` cho các script bảo trì dev nội bộ. Sẽ cập nhật để tương thích cả khi chạy từ root site hoặc từ core.

---

## 4. KHẢO SÁT SỰ PHỤ THUỘC VÀO `src/config/branding.js`

Có **51 vị trí** trực tiếp import `src/config/branding.js`.  
Các hằng số được sử dụng:
- `PROJECT_NAME`: Tên hiển thị dự án (ví dụ `Treecraft`). Hiện đang hardcode.
- `ROOT_NAME`: Luôn là `'root'`. Bất biến.
- `ROOT_PATH`: Luôn là `'/root'`. Bất biến.
- `PATHS.*`: Các đường dẫn chuẩn của cây phân cấp (`CONTENT`, `LAYOUT`, `TEMPLATES`, `MEDIA`, `SYSTEM`, etc.). Bất biến.

**Chiến lược xử lý để không làm vỡ 51 file hiện có:**
- `src/config/branding.js` tiếp tục đóng vai trò là module facade/wrapper.
- `branding.js` nạp cấu hình từ `sitePaths.resolveSiteConfig()`.
- Nếu có file `site.config.js` ở Site, các giá trị `PROJECT_NAME`, `PROJECT_TITLE`, `PROJECT_DESCRIPTION` sẽ được ghi đè từ cấu hình dự án.
- Các hằng số cây phân cấp (`ROOT_NAME`, `ROOT_PATH`, `PATHS`) được giữ nguyên tuyệt đối đảm bảo tương thích 100%.

---

## 5. CÁC ĐIỂM CORE GHI FILE VÀO NỘI BỘ (VI PHẠM BẤT BIẾN)

Khi chạy ở dạng submodule, thư mục `core/` phải là **Read-Only**. Các vị trí Core ghi file:

1. **Serialization YAML Export:**
   - Hiện tại: Ghi vào `PROJECT_ROOT/Serialization/`.
   - Cần sửa: Phải ghi vào `sitePaths.SERIALIZATION_DIR` (nằm trong thư mục của Site).
2. **Database Backup (NDJSON / ZIP):**
   - Hiện tại: Ghi vào `PROJECT_ROOT/data/backups/`.
   - Cần sửa: Ghi vào `sitePaths.BACKUP_DIR` (nằm trong thư mục của Site).
3. **Log files:**
   - Winston logger không ghi vào `core/logs/` nếu không có quyền ghi; mặc định stream console hoặc ghi vào `<SITE_DIR>/logs/`.
4. **Media Uploads:**
   - Không lưu vào `core/public/uploads/`. Ảnh tải lên cục bộ chuyển vào `<SITE_DIR>/public/uploads/` (hoặc Cloudinary).

---

## 6. KHẢO SÁT MÔ HÌNH DATABASE: 1 DATABASE DUY NHẤT, 2 COLLECTIONS

- **Xác minh mã nguồn:**
  - Model `Item.js`: collection `items_master`.
  - Model `PublishedItem.js`: collection `items_web`.
  - Cả hai model cùng dùng chung một `mongoose.connection` duy nhất (kết nối bởi `src/config/db.js`).
  - Không tồn tại biến môi trường `MONGO_DB_WEB` hay `MONGO_URI_WEB` trong mã nguồn ứng dụng hiện tại.
- **Quy chuẩn tên Database cho dự án mới:**
  - Định dạng: `treecraft_<slug>` (ví dụ dự án có slug `corporate` thì DB tên `treecraft_corporate`).
  - Cấu hình qua `.env.development`: `MONGO_DB_NAME=treecraft_<slug>`.
  - Kiểm tra `dbGuard.js`: Cập nhật fingerprint và whitelist để cho phép tiền tố `treecraft_` trên môi trường local development.

---

## 7. KẾT LUẬN & ĐỀ XUẤT

1. Kiến trúc hiện tại của Treecraft đã rất gần với mô hình Core/Site: đã có phân tầng rõ rệt giữa Admin UI và Public Site Rendering.
2. Nút thắt lớn nhất là việc hardcode đường dẫn cục bộ tới thư mục `src/views/site/` và `Serialization/`.
3. Việc tạo module duy nhất `src/config/sitePaths.js` sẽ giải quyết dứt điểm toàn bộ sự phụ thuộc đường dẫn mà không gây phân mảnh hay breaking changes.

