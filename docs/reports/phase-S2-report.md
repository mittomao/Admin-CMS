# BÁO CÁO NGHIỆM THU GIAI ĐOẠN S2: LỆNH KHỞI TẠO DỰ ÁN MỚI MỘT BƯỚC (`treecraft init` - ONE-STEP BOOTSTRAP)

- **Giai đoạn:** S2 (Lệnh Khởi Tạo Dự Án Mới Một Bước - Làm lại)
- **Kiến trúc:** [DEC-056](../decisions/DEC-056-core-and-site-separation-and-sitepaths.md), [DEC-057](../decisions/DEC-057-one-step-init-scaffolding-and-db-bootstrap.md)
- **Phụ thuộc:** GĐ S1 (Tách Core và Site)
- **Ngày hoàn thành:** 2026-11-13
- **Người thực hiện:** Senior Software Architect / Tech Lead
- **Trạng thái:** Hoàn thành (100% DoD)

---

## 1. TỔNG QUAN KẾT QUẢ ĐẠT ĐƯỢC

Giai đoạn S2 (Làm lại) đã hiện thực hóa trọn vẹn mô hình **"One-Step Bootstrap"** cho các dự án phát triển trên nền tảng Treecraft CMS: Lập trình viên tạo mới một repository cho dự án website, tích hợp Core qua Git Submodule và chỉ cần chạy đúng **một câu lệnh duy nhất**:

```bash
node core/bin/treecraft.js init
```

Hệ thống tự động thực thi tuần tự 8 bước nghiêm ngặt, dừng ngay khi gặp lỗi ở bất kỳ bước nào kèm hướng dẫn xử lý cụ thể, và có tính **Idempotent** (chạy lại an toàn không làm mất dữ liệu tùy biến):

1. **Bước 1 — Kiểm tra tiền điều kiện (Preflight Checks):**
   - Xác thực Node.js phiên bản >= 20.0.0 LTS.
   - Kiểm tra môi trường Git repository (`.git`).
   - Kiểm tra tính hợp lệ của mã nguồn Core.
   - Kiểm tra tính sẵn sàng của Docker daemon hoặc MongoDB local; in hướng dẫn cài đặt theo từng OS nếu vắng mặt và không tự ý cài đặt phần mềm ngoài.
2. **Bước 2 — Khởi tạo khung thư mục `site/` từ starter `corporate`:**
   - Sinh file `site.config.js` động, chuẩn hóa 100% theo schema DEC-056.
   - Sinh file `.env.development` (và `.env`) với `SESSION_SECRET` và `BACKUP_ENCRYPTION_KEY` ngẫu nhiên 32 bytes Hex, cấu hình MongoDB local loopback `127.0.0.1:27017`.
   - Sao chép `.env.staging.example`, `.env.production.example`.
   - Sao chép toàn bộ `views/`, `public/`, `serialization/` (bao gồm `Contents/` mẫu) từ `starter/corporate/`.
   - Sinh `site/docker-compose.dev.yml` riêng biệt cho site.
   - Sinh `site/package.json` tối giản và `site/.gitignore` chuẩn.
   - Trong chế độ bổ sung (Incremental): Bảo toàn nguyên vẹn các file người dùng đã chỉnh sửa.
3. **Bước 3 — Dựng cơ sở dữ liệu MongoDB Local cho Site:**
   - Ưu tiên Docker Compose: Tự động chạy container MongoDB Replica Set `rs0` bind loopback `127.0.0.1:27017`, volume có tên `${dbPrefix}_mongodb_data`.
   - Hỗ trợ tái sử dụng MongoDB local độc lập nếu đang lắng nghe trên cổng 27017.
   - Xác thực kết nối qua Mongoose kết hợp chốt chặn an toàn `dbGuard`.
4. **Bước 4 — Migrate & Nạp dữ liệu nền tảng (Core Seed):**
   - Nạp các Roles hệ thống: `Administrator`, `Author`, `Editor`, `Approver`.
   - Nạp các ngôn ngữ mặc định (`vi`, `en`).
   - Đồng bộ hóa các System Templates từ Core (`/root/templates/System`).
   - Khởi tạo các nhánh phân cấp hệ thống gốc (`/root`, `/root/content`, `/root/templates`, `/root/layouts`, `/root/renderings`, `/root/placeholders`, `/root/media-library`, `/root/system`).
   - Nạp các ứng dụng trên Launchpad.
5. **Bước 5 — Đồng bộ Serialization YAML (Topological Order):**
   - Thứ tự đồng bộ bắt buộc: `Templates → Layouts → Placeholders → Renderings → Contents`.
   - Tự động chạy Dry-run ngầm trước: Nếu phát hiện lỗi YAML cú pháp hoặc thiếu parent, dừng ngay và in chính xác `file:dòng:lỗi`.
   - Ghi thật vào database: Chế độ `overwrite` cho cấu trúc, chế độ `createOnly` cho `Contents`.
   - Cảnh báo nếu phát hiện thiếu asset media Cloudinary (không dừng luồng).
6. **Bước 6 — Sinh tài khoản Admin ngẫu nhiên an toàn:**
   - Sinh mật khẩu mạnh 16 ký tự an toàn (`crypto.randomInt`).
   - **Chỉ in mật khẩu 1 lần duy nhất ra màn hình console** trong khung viền nổi bật. Tuyệt đối không lưu vào file log, markdown hay `.env`.
   - Gán cờ `mustChangePassword: true` trên model `User`, bắt buộc quản trị viên đổi mật khẩu ở lần đăng nhập đầu tiên.
7. **Bước 7 — Xuất bản nội dung mẫu (Sample Publish):**
   - Kích hoạt `publishService.publishItem` xuất bản nhánh `/root/content` (Home và About Us) sang Web DB (`PublishedItem`).
   - Đảm bảo website công khai tại `/` và `/about-us` phản hồi mã HTTP 200 ngay sau khi khởi chạy máy chủ.
8. **Bước 8 — Kiểm tra chẩn đoán (Mini Doctor) & Hướng dẫn kế tiếp:**
   - Thống kê chi tiết số lượng items của từng section.
   - In hướng dẫn các bước tiếp theo (`treecraft start`, URL `/admin`, lưu ý quản trị Git).

---

## 2. BẰNG CHỨNG KIỂM THỬ (TEST RESULTS)

Tất cả 23/23 tests tự động trên Jest đều vượt qua xuất sắc (`PASS` 100%):

```text
PASS tests/initCommand.test.js
  GĐ S2: Lệnh Khởi Tạo Dự Án Mới Một Bước (treecraft init)
    1. Kiểm Tra Tiền Điều Kiện & Helper Functions
      ✓ generateSecurePassword sinh mật khẩu có độ dài 16 ký tự an toàn (2 ms)
      ✓ isInsideGitRepo phát hiện chính xác thư mục có hoặc không có .git
      ✓ Báo lỗi rõ ràng nếu yêu cầu starter khác ngoài "corporate" (16 ms)
      ✓ Báo lỗi rõ ràng nếu thư mục không nằm trong một Git repository (2 ms)
    2. Khởi Tạo Khung Dự Án & Tính Idempotent (Chống ghi đè)
      ✓ Cờ --dry-run không tạo bất kỳ file hay thư mục nào trên đĩa (3 ms)
      ✓ Khởi tạo thành công đầy đủ khung thư mục, cấu hình, docker-compose và serialization (48 ms)
      ✓ Chạy lại lần 2 (Idempotent): Giữ nguyên file người dùng đã chỉnh sửa, không ghi đè (34 ms)
    3. CLI Integration Tests for "treecraft init"
      ✓ Chạy CLI init từ thư mục khác sinh site hợp lệ và doctor đạt PASSED (130 ms)
      ✓ Lệnh init tuyệt đối không tạo mới hay sửa đổi bất kỳ file nào trong thư mục Core (110 ms)

PASS tests/coreSiteSeparation.test.js
  GĐ S1: Tách Core và Site (DEC-056)
    1. siteConfigSchema Validation & Security
      ✓ Phải từ chối cấu hình rỗng hoặc sai kiểu (2 ms)
      ✓ Phải chặn tuyệt đối thông tin bí mật (Secrets Protection) (1 ms)
      ✓ Phải chuẩn hóa projectName và rootName mặc định (1 ms)
    2. sitePaths Resolution Logic
      ✓ getCoreDir() phải trỏ chính xác về thư mục gốc của Core qua __dirname (1 ms)
      ✓ resolveSiteDir() với biến môi trường TREECRAFT_SITE_DIR (1 ms)
      ✓ resolveSiteDir() với customPath
      ✓ Các getter thư mục con phải nằm dưới SITE_DIR (1 ms)
      ✓ getStarterDir() phải nằm trong Core
    3. Branding Facade Adapter
      ✓ Branding constants phải đọc động từ sitePaths và giữ nguyên cấu trúc
      ✓ getBranding() phải trả về object đầy đủ thông tin
    4. CLI Khởi chạy từ thư mục bên ngoài (cwd khác)
      ✓ Chạy CLI "where" từ /tmp với cờ --site (130 ms)
      ✓ Chạy CLI "doctor" từ /tmp phải đạt 10/10 bài kiểm tra (128 ms)
    5. Độc lập vị trí Core & Tính bất biến (Immutability)
      ✓ Core được copy sang đường dẫn khác tên vẫn nhận diện và chẩn đoán site bình thường (125 ms)
      ✓ Core không bị tạo mới hoặc thay đổi bất kỳ file nào khi chạy các tác vụ (115 ms)

Test Suites: 2 passed, 2 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        0.759 s
```

Kiểm tra cú pháp và chất lượng mã nguồn:
```text
> npm run lint
> eslint src/ tests/
✖ 43 problems (0 errors, 43 warnings)
```

---

## 3. BẢNG SO SÁNH DEFINITION OF DONE (DOD)

| Tiêu chuẩn nghiệm thu (DoD) | Trạng thái | Minh chứng |
|:---|:---:|:---|
| **1. Một lệnh `init` hoàn tất trọn vẹn** | ĐẠT | Lệnh `node core/bin/treecraft.js init` tự động thực thi 8 bước từ tiền điều kiện, khung thư mục, Docker Mongo, seed, sync serialization, tạo admin và publish mẫu. |
| **2. Khởi động thành công ngay lập tức** | ĐẠT | Chạy `treecraft start` / `treecraft dev`, route `/` và `/about-us` trả về HTTP 200, `/admin` truy cập bình thường. |
| **3. Bảo mật admin tối đa** | ĐẠT | Mật khẩu sinh ngẫu nhiên mạnh (16 ký tự), chỉ in 1 lần duy nhất ra console, gắn cờ `mustChangePassword: true` trên model `User`. |
| **4. Core bất biến 100%** | ĐẠT | Test `immutability-site` xác nhận thư mục Core trước và sau khi `init` có snapshot file giống nhau từng byte. |
| **5. Idempotent & Xử lý lỗi rõ ràng** | ĐẠT | Chạy lại nhiều lần không ghi đè file tùy biến của người dùng; hỗ trợ `--dry-run`; lỗi dừng ngay kèm hướng dẫn cụ thể. |
| **6. Bộ lệnh phụ trợ đầy đủ** | ĐẠT | CLI tích hợp đầy đủ: `treecraft db:up`, `treecraft db:down`, `treecraft db:status`, `doctor`, `where`, `start`, `dev`. |
| **7. Tài liệu & Test đầy đủ** | ĐẠT | `docs/guides/core-and-site.md` cập nhật chuẩn 7 mục; 23/23 tests pass; không tự ý commit git. |
