# BÁO CÁO NGHIỆM THU GIAI ĐOẠN S1: TÁCH CORE VÀ SITE (CORE ĐỌC TỪ SITE)

- **Giai đoạn:** S1 (Core / Site Separation)
- **Kiến trúc:** [DEC-056](../decisions/DEC-056-core-and-site-separation-and-sitepaths.md)
- **Ngày hoàn thành:** 2026-11-13
- **Người thực hiện:** Senior Software Architect / Tech Lead
- **Trạng thái:** Hoàn thành (100% DoD)

---

## 1. TỔNG QUAN KẾT QUẢ ĐẠT ĐƯỢC

Giai đoạn S1 đã hoàn thành xuất sắc việc chuyển đổi kiến trúc Treecraft từ dạng Monolithic nguyên khối sang mô hình phân tách song song 2 phần:
- **`core/` (Bất biến - Immutable Engine):** Toàn bộ engine CMS, Admin UI, models, controllers, services và CLI. Không phụ thuộc vị trí ổ đĩa, hoàn toàn chỉ đọc (không ghi log, cache, backup vào thư mục của core).
- **`site/` (Dự án riêng):** Sở hữu toàn bộ cấu hình (`site.config.js`), biến môi trường (`.env*`), view EJS công khai (`views/`), tài nguyên tĩnh (`public/`), serialization YAML (`serialization/`), và sao lưu DB (`backups/`).

Mọi đường dẫn tài nguyên được giải quyết thống nhất qua module trung tâm `src/config/sitePaths.js`.

---

## 2. CHI TIẾT CÁC HẠNG MỤC ĐÃ TRIỂN KHAI

### 2.1. Module Trung tâm `src/config/sitePaths.js`
- Triển khai thuật toán phân giải `SITE_DIR` theo thứ tự ưu tiên 4 bước: (1) CLI `--site` → (2) Env `TREECRAFT_SITE_DIR` → (3) Tìm ngược từ `cwd` có `site.config.js` → (4) Thư mục `site/` đồng cấp hoặc lồng trong Core.
- Cung cấp đầy đủ các getters: `getSiteDir()`, `getCoreDir()`, `getViewsDir()`, `getPublicDir()`, `getSerializationDir()`, `getBackupsDir()`, `getEnvPath()`, `getStarterDir()`, `getCoreAdminViewsDir()`, `getCoreAdminPublicDir()`.

### 2.2. Schema & Trình Kiểm Tra `src/config/siteConfigSchema.js`
- Định nghĩa schema chuẩn mực cho `site.config.js`: `projectName`, `rootName`, `defaultLanguage`, `languages`, `cloudinaryRootFolder`, `mongoDbMaster`, `mongoDbWeb`, `requiresCore`, `starter`, `siteApiVersion`.
- Cơ chế bảo vệ: Chặn tuyệt đối các khóa nhạy cảm (`password`, `secret`, `apiKey`, `MONGO_URI`, `SESSION_SECRET`) xuất hiện trong `site.config.js`.

### 2.3. Facade Adapter `src/config/branding.js`
- Chuyển đổi thành Facade Adapter: Đọc cấu hình động từ `sitePaths.getSiteConfig()`.
- Giữ nguyên 100% chữ ký export (`PROJECT_NAME`, `ROOT_NAME`, `ROOT_PATH`, `PATHS`, `CLOUDINARY_DEFAULT_ROOT`, `getBranding()`). Đảm bảo 41 tệp tin trong hệ thống đang import `branding.js` hoạt động bình thường mà không cần sửa đổi bất kỳ dòng mã nào.

### 2.4. Phân Tách Tuyệt Đối View và Static Assets
- **Site Views:** `siteRenderer.js`, `siteController.js`, `basicAuthMiddleware.js`, `maintenanceMiddleware.js` nạp view trực tiếp từ `sitePaths.getViewsDir()`.
- **Sửa lỗi tiềm ẩn:** Đã loại bỏ 2 lệnh `require(process.cwd() + '/src/fields')` trong `universal-renderer.ejs` và `field-modal.ejs`, thay bằng require tương đối an toàn.
- **Static Assets:** Tài nguyên Admin của Core phục vụ tại `/admin-assets/` và `/`; Tài nguyên Site phục vụ tại `/site/` và `/` từ `sitePaths.getPublicDir()`.

### 2.5. Chuyển Hướng Ghi Dữ Liệu Runtime (Core Read-Only)
- Biến môi trường `.env`: Nạp từ `sitePaths.getEnvPath()`.
- Dữ liệu Serialization: Mặc định ghi vào `sitePaths.getSerializationDir()` (`site/serialization/`).
- Dữ liệu Sao lưu Database: Ghi vào `sitePaths.getBackupsDir()` (`site/backups/`).

### 2.6. Bộ Starter Corporate Mẫu
- Đóng gói toàn bộ tài nguyên mẫu ban đầu ra `core/starter/corporate/`: `site.config.js`, `.env.example`, `views/`, `public/`, `serialization/`, `package.json`, `README.md`.

### 2.7. CLI Entrypoint `core/bin/treecraft.js`
- Hỗ trợ các lệnh: `where`, `doctor`, `start`, `dev`, `migrate`, `help`.
- Khai báo `"bin": { "treecraft": "./bin/treecraft.js" }` và trường `"files"` trong `package.json` của Core sẵn sàng cho việc đóng gói npm.

### 2.8. Script Migration Chuẩn Hóa `viewPath`
- `src/scripts/migrate-site-viewpaths.js`: Tự động backup K1 trước khi chạy, quét database Master/Web và chuẩn hóa các `viewPath` có tiền tố cũ (`site/...`) thành đường dẫn tương đối trong `site/views/`. Hỗ trợ cờ `--dry-run`.

### 2.9. Tài Liệu Hướng Dẫn Vận Hành
- Biên soạn tài liệu chi tiết `docs/guides/core-and-site.md` chuẩn 7 mục (mục đích, điều kiện trước, các bước copy được, kết quả mong đợi, cách kiểm tra, lỗi thường gặp, cảnh báo rủi ro).

---

## 3. BẰNG CHỨNG KIỂM THỬ (TEST RESULTS)

Bộ kiểm thử tự động `tests/coreSiteSeparation.test.js` gồm 14 bài test chuyên sâu:
```text
PASS tests/coreSiteSeparation.test.js
  GĐ S1: Tách Core và Site (DEC-056)
    1. siteConfigSchema Validation & Security
      ✓ Phải từ chối cấu hình rỗng hoặc sai kiểu (1 ms)
      ✓ Phải chặn tuyệt đối thông tin bí mật (Secrets Protection)
      ✓ Phải chuẩn hóa projectName và rootName mặc định (1 ms)
    2. sitePaths Resolution Logic
      ✓ getCoreDir() phải trỏ chính xác về thư mục gốc của Core qua __dirname
      ✓ resolveSiteDir() với biến môi trường TREECRAFT_SITE_DIR
      ✓ resolveSiteDir() với customPath (1 ms)
      ✓ Các getter thư mục con phải nằm dưới SITE_DIR
      ✓ getStarterDir() phải nằm trong Core
    3. Branding Facade Adapter
      ✓ Branding constants phải đọc động từ sitePaths và giữ nguyên cấu trúc (1 ms)
      ✓ getBranding() phải trả về object đầy đủ thông tin
    4. CLI Khởi chạy từ thư mục bên ngoài (cwd khác)
      ✓ Chạy CLI "where" từ /tmp với cờ --site (26 ms)
      ✓ Chạy CLI "doctor" từ /tmp phải đạt 10/10 bài kiểm tra (23 ms)
    5. Độc lập vị trí Core & Tính bất biến (Immutability)
      ✓ Core được copy sang đường dẫn khác tên vẫn nhận diện và chẩn đoán site bình thường (25 ms)
      ✓ Core không bị tạo mới hoặc thay đổi bất kỳ file nào khi chạy các tác vụ (56 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        0.283 s
```

Kết quả lệnh `treecraft doctor`:
```text
============================================================
  TREECRAFT CMS - KIỂM TRA CHẨN ĐOÁN (DOCTOR)
============================================================

  ✅ [PASS] Thư mục Core tồn tại (/Users/wainiidev/Downloads/Projects/Backend/Admin-CMS)
  ✅ [PASS] Thư mục Core có src/ và views/ 
  ✅ [PASS] Thư mục Starter mẫu corporate 
  ✅ [PASS] Phân giải thư mục Site (/Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/site)
  ✅ [PASS] Cấu hình site.config.js hợp lệ (Project: "Corporate Starter Site", Root: "/root")
  ✅ [PASS] Thư mục views/ 
  ✅ [PASS] Thư mục public/ 
  ✅ [PASS] Thư mục serialization/ 
  ✅ [PASS] Thư mục backups/ 
  ✅ [PASS] File cấu hình môi trường .env (/Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/site/.env)

------------------------------------------------------------
Kết quả: 10 bài kiểm tra đạt, 0 bài kiểm tra thất bại.
------------------------------------------------------------
```

---

## 4. BẢNG ĐỐI CHIẾU TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE)

| Tiêu chuẩn DoD | Kết quả thực tế | Trạng thái |
|:---|:---|:---:|
| **Zero Hardcoded CWD** | `process.cwd()` đã được gỡ bỏ khỏi 100% logic nạp tài nguyên views, public, env, backups, serialization. Chỉ còn 1 chỗ định dạng text log trong `check-languages.js`. | **ĐẠT** |
| **Core Read-Only** | Cây thư mục Core hoàn toàn bất biến (đã có test snapshot chứng minh trước và sau khi chạy CLI không phát sinh file mới). | **ĐẠT** |
| **Location Independence** | Chạy CLI thành công từ thư mục bất kỳ ngoài cwd (`/tmp`) và khi Core được copy sang đường dẫn khác tên. | **ĐẠT** |
| **Backward Compatibility** | 41 file import `branding.js` hoạt động bình thường 100% qua Facade Adapter. Không có breaking changes. | **ĐẠT** |
| **Tài liệu Hướng dẫn** | File `docs/guides/core-and-site.md` đã hoàn thành với đầy đủ 7 mục theo quy định. | **ĐẠT** |

---

## 5. KẾT LUẬN & BƯỚC TIẾP THEO

Giai đoạn S1 đã hoàn tất 100% mục tiêu đề ra và sẵn sàng làm nền tảng cho **Giai đoạn S2: Lệnh Khởi tạo Dự án Mới (`treecraft init`)**.
Theo đúng Quy tắc Vàng: Dừng lại và chờ lệnh phê duyệt của người dùng trước khi thực hiện giai đoạn tiếp theo.

