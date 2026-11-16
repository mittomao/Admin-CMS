# BÁO CÁO NGHIỆM THU GIAI ĐOẠN S4: KIỂM TRA VÀ HOÀN THIỆN LUỒNG REPO MỚI "SUBMODULE → INIT → DEV"

- **Giai đoạn:** S4 (Kiểm Tra & Hoàn Thiện Luồng Repo Mới — Fresh Install)
- **Kiến trúc:** [DEC-056](../decisions/DEC-056-core-and-site-separation-and-sitepaths.md), [DEC-057](../decisions/DEC-057-one-step-init-scaffolding-and-db-bootstrap.md), [DEC-058](../decisions/DEC-058-single-database-dual-collection-architecture.md)
- **Phụ thuộc:** GĐ S1, GĐ S2, GĐ E1
- **Ngày hoàn thành:** 2026-11-16
- **Người thực hiện:** Senior Software Architect / Tech Lead
- **Trạng thái:** Hoàn thành (100% DoD)

---

## 1. TỔNG QUAN KẾT QUẢ ĐẠT ĐƯỢC

Giai đoạn S4 đã giải quyết triệt để toàn bộ các rào cản và lỗi thực tế mà người dùng gặp phải khi khởi tạo một repository website mới với Core Engine qua Git Submodule. Trải nghiệm khởi tạo được rút gọn và chuẩn hóa tối đa: **Chỉ đúng 2 thao tác ban đầu** và sau đó **chỉ cần lệnh `npm run dev`** là truy cập được ngay cả Trang quản trị `/admin` và Website công khai `/`.

```bash
git init my-project && cd my-project
git submodule add <url-core> core        # THAO TÁC 1: Kéo Core Submodule
node core/bin/treecraft.js init           # THAO TÁC 2: Tự động hóa 100% (cài deps, dựng DB, seed, sync, publish)
npm run dev                               # KHỞI CHẠY: Mở ngay http://localhost:4000/admin & http://localhost:4000/
```

---

## 2. NGUYÊN NHÂN GỐC VÀ GIẢI PHÁP CHO CÁC LỖI THỰC TẾ ĐÃ XỬ LÝ

| STT | Triệu chứng lỗi (Ảnh người dùng) | Nguyên nhân gốc rễ | Giải pháp kỹ thuật đã hiện thực trong S4 |
|:---:|:---|:---|:---|
| **1** | `Error: Cannot find module 'mongoose'` khi chạy init | Git submodule chỉ kéo code repo Core, không kèm theo thư mục `node_modules/`. | `initService.js` tự động kiểm tra `core/node_modules/` trong `step1_Preflight`; nếu thiếu các gói bắt buộc (`mongoose`, `express`, `ejs`), tự động kích hoạt `npm install` bên trong `coreDir`. |
| **2** | `Item validation failed: templateId: Path templateId is required` | Hàm seed cũ của init truy vấn Template `Folder` khi database hoàn toàn trống, dẫn đến `templateId` bị `undefined`. | Chuẩn hóa `step4_MigrateAndSeedCore` ủy thác toàn bộ cho `seed-initial-data.js` nạp các System Templates trước khi tạo các Root Node. |
| **3** | `Cannot find module '.../site/core/bin/treecraft.js'` (Ảnh 1 & 2) | Bảng hướng dẫn cũ in: `1. cd site 2. node core/bin/treecraft.js dev`. Khi người dùng `cd site`, đường dẫn tương đối trỏ sai vì `core` nằm ở gốc repo. | Bỏ hoàn toàn hướng dẫn `cd site`. Cung cấp `package.json` tại thư mục gốc repository với script `"dev": "node core/bin/treecraft.js dev"`. Hướng dẫn in ra chỉ đúng 1 lệnh duy nhất: `npm run dev`. |
| **4** | Server treo sau log `Session store initialized`, không mở cổng 4000 (`ERR_CONNECTION_REFUSED` - Ảnh 3 & 4) | `bin/treecraft.js` trong hàm `handleDev` chỉ `require('../src/server')`. Nhưng `src/server.js` lại guard `startServer()` dưới điều kiện `if (require.main === module)` (vốn là `false` khi require từ CLI binary), khiến `server.listen()` không bao giờ được gọi. | Cập nhật `bin/treecraft.js` gọi tường minh `const { startServer } = require('../src/server'); await startServer();`. Server in startup banner đầy đủ, kết nối DB và mở cổng lắng nghe ngay lập tức. |
| **5** | Vòng lặp chuyển hướng khi `mustChangePassword: true` | Hệ thống đánh dấu cờ đổi mật khẩu bắt buộc ở lần đăng nhập đầu nhưng chưa định tuyến hoặc view đổi mật khẩu tương ứng. | Bổ sung route `GET /admin/change-password`, `POST /admin/change-password`, view `change-password.ejs`, ngoại lệ bypass cho trang đổi mật khẩu và logout trong `authMiddleware.js`. |
| **6** | Quên hoặc trôi mật khẩu Admin ngẫu nhiên sau khi chạy init | Thiếu cơ chế cấp lại mật khẩu admin tại chỗ mà không cần thao tác trực tiếp trên MongoDB. | Bổ sung cờ `node core/bin/treecraft.js init --reset-admin` và lệnh tắt `node core/bin/treecraft.js admin:reset` để sinh và in mật khẩu admin mới ra console an toàn. |

---

## 3. ĐÓNG BĂNG KIẾN TRÚC DỮ LIỆU: MỘT DATABASE DUY NHẤT (DEC-058)

Tuân thủ nghiêm ngặt theo **Quyết định Kiến trúc [DEC-058](../decisions/DEC-058-single-database-dual-collection-architecture.md)**:

- **Mỗi dự án chỉ dùng DUY NHẤT MỘT DATABASE:** Mang tên `treecraft_<slug>` (ví dụ dự án `celphones` → database `treecraft_celphones`).
- **Xóa bỏ hoàn toàn khái niệm hai DB vật lý:** Không có database Web riêng, không có hậu tố `_web` hay `_master` trong tên DB, không có biến môi trường `MONGO_URI_WEB`.
- **Master và Web là hai Collection trong cùng một DB:**
  - `items_master`: Chứa toàn bộ cây dữ liệu soạn thảo nội bộ của CMS.
  - `items_web`: Chứa dữ liệu đã được phê duyệt và xuất bản phục vụ website công khai (`PublishedItem`).
- **Cô lập đa dự án:**
  - Container Docker: `${slug}-mongo-dev` (ví dụ: `celphones-mongo-dev`).
  - Volume lưu trữ: `${slug}_mongodb_data` (ví dụ: `celphones_mongodb_data`).
  - Nhiều dự án chạy song song trên cùng máy tính hoàn toàn độc lập, không xâm lấn dữ liệu của nhau.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN

### 4.1. Công cụ Kiểm tra Tự động Luồng Fresh-Install (`npm run verify:fresh-install`)
Script `src/scripts/verify-fresh-install.js` mô phỏng 100% hành vi người dùng thật bên trong thư mục tạm của OS (`os.tmpdir()`):
1. `git init` tạo repository mới trống.
2. `git submodule add` tích hợp Core engine cục bộ.
3. Chạy `node core/bin/treecraft.js init --name="Verify Site" --slug="verify_site"`.
4. Xác minh database `treecraft_verify_site` được tạo: Chứa đủ cả 2 collections `items_master` (47 items) và `items_web` (3 items).
5. Xác minh script `"dev": "node core/bin/treecraft.js dev"` có mặt tại `package.json` gốc repo.
6. Khởi chạy máy chủ phát triển qua `node core/bin/treecraft.js dev`.
7. Kiểm tra HTTP GET `http://localhost:4015/admin/login` ➔ **Mã 200 OK**.
8. Kiểm tra HTTP GET `http://localhost:4015/` ➔ **Mã 200 OK**.
9. Dọn dẹp sạch sẽ máy chủ và thư mục tạm.

**Kết quả:** Toàn bộ các bước đều đạt `PASSED` 100%.

### 4.2. Bộ Kiểm thử Đơn vị & Tích hợp (Unit & Integration Tests)
- `tests/initCommand.test.js`: **11/11 PASSED** (kiểm thử `slugify`, `resolveDbName`, cờ `--dry-run`, cấu trúc scaffold, tính idempotent không ghi đè, DEC-058).
- `tests/coreSiteSeparation.test.js`: **14/14 PASSED** (kiểm thử `sitePaths`, vị trí Core bất biến, doctor 10/10).
- `tests/brandingAudit.test.js` & `tests/mediaPathMapper.test.js`: **19/19 PASSED**.
- `tests/mediaApi.test.js`: **9/9 PASSED**.
- `npm run lint`: **0 Lỗi (0 errors, 48 warnings)**.

---

## 5. TÀI LIỆU VẬN HÀNH ĐÃ CẬP NHẬT

Tài liệu `docs/guides/core-and-site.md` đã được hoàn thiện chuẩn mực theo cấu trúc 7 mục:
1. **Mục đích:** Hướng dẫn phân tách Core bất biến và Site dự án, vận hành luồng 2 bước.
2. **Điều kiện trước:** Node.js v20+, Git repo, Docker/Mongo local.
3. **Các bước thực hiện:** Lệnh copy-pasteable cho macOS/Linux, Windows PowerShell, Windows CMD.
4. **Kết quả mong đợi:** Bảng console 8 bước, thông tin đăng nhập admin in 1 lần, chỉ dẫn lệnh tiếp theo.
5. **Cách kiểm tra thành công:** Kiểm tra HTTP 200 tại `/` và `/admin`, kiểm tra `doctor`.
6. **Xử lý sự cố thường gặp (Troubleshooting):** Xử lý lỗi `Cannot find module`, lỗi server treo session, reset mật khẩu admin, xung đột cổng 27017/4000.
7. **Cảnh báo quan trọng:** Quy tắc một DB DEC-058, bảo mật mật khẩu admin, bảo vệ biến môi trường.

---

## 6. XÁC NHẬN QUY TẮC GIT VÀ TRẠNG THÁI CUỐI

- **Tuyệt đối KHÔNG có bất kỳ commit Git tự động nào** được tạo trong repository theo đúng Quy tắc Vàng.
- Toàn bộ thay đổi nằm trong Working Tree, sẵn sàng để người dùng xem xét và tạo commit thủ công.

### Đề xuất thông điệp Git Commit (cho người dùng):
```bash
git add .
git commit -m "feat(core): complete fresh install workflow and single database architecture (Phase S4)"
```

