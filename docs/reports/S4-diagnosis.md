# BÁO CÁO CHẨN ĐOÁN TOÀN DIỆN LUỒNG REPO MỚI "SUBMODULE → INIT → DEV" (GĐ S4)

> **Mục tiêu:** Xác định và phân loại toàn bộ các lỗi phát sinh trong trải nghiệm khởi tạo dự án mới từ Core submodule, đồng thời đối soát kiến trúc dữ liệu Một Database - Hai Collection (`items_master` / `items_web`).
> **Ngày thực hiện:** 2026-11-16
> **Trạng thái:** Hoàn tất chẩn đoán (Bước 1)

---

## 1. BẢNG TỔNG HỢP CHẨN ĐOÁN LỖI

| Bước trong luồng | Triệu chứng lỗi | Nguyên nhân gốc | Mức độ | Giải pháp xử lý triệt để |
| :--- | :--- | :--- | :---: | :--- |
| **0. Thao tác ban đầu** | `zsh: command not found: treecraft` khi gõ lệnh CLI | Người dùng kỳ vọng `treecraft` là CLI toàn cục nhưng submodule không tự đăng ký binary vào PATH hệ thống; chưa cài package npm toàn cục. | **Trung bình** | Cung cấp script trong `site/package.json` và `package.json` gốc; hướng dẫn dùng `node core/bin/treecraft.js <cmd>` hoặc `npm run <cmd>` mà không yêu cầu `npm link` hay `sudo`. |
| **1. Tải submodule** | `Cannot find module 'mongoose'` (hoặc package khác của core) | Git submodule chỉ kéo mã nguồn core, không chứa thư mục `node_modules/`. File `initService.js` từng require thư viện ở cấp đầu file trước khi kiểm tra. | **Nghiêm trọng** | `initService.js` tự động phát hiện `core/node_modules` bị thiếu, hiển thị thanh tiến độ và tự động chạy `npm install` bên trong thư mục `core/`. Chỉ require lazy sau khi dependencies đã sẵn sàng. |
| **2. Scaffolding Site** | Tạo cấu hình `.env.development` với 2 database `_master` và `_web` (`MONGO_URI_WEB`) | Tàn dư của giả định kiến trúc cũ trong S1/S2 xem Master và Web là hai database vật lý riêng rẽ. | **Nghiêm trọng** | Chuẩn hóa mô hình **MỘT Database duy nhất** `treecraft_<slug>`. Bỏ hoàn toàn `_web`, `MONGO_URI_WEB`, `mongoDbWeb`. Master và Web chỉ là hai collection `items_master` và `items_web` trong cùng một DB. |
| **3. Dựng Database** | DB chưa được tạo trên Docker; hoặc xung đột cổng 27017 | Kiểm tra cổng 27017 nếu mở thì kết nối local mongod hiện có; nếu đóng mới chạy docker compose. Nhưng tên container/volume chưa cô lập theo slug dự án. | **Cao** | Đặt tên container `${slug}-mongo-dev`, volume `${slug}_mongodb_data`. Nếu cổng 27017 bị chiếm bởi tiến trình khác không phải Mongo, tự động tìm cổng khả dụng tiếp theo (hoặc cấu hình rõ) và lưu vào `.env.development`. |
| **4. Migrate & Seed** | `Item validation failed: templateId: Path templateId is required` | Khởi tạo Root Node `/root` khi System Template `Folder` chưa được nạp vào DB rỗng (`Template.findOne({ name: 'Folder' })` trả về `null`). | **Nghiêm trọng** | Đã xử lý: Ủy thác toàn bộ quy trình khởi tạo nền tảng cho `src/scripts/seed-initial-data.js` nạp tuần tự: Roles → Languages → Core Templates (`Folder`, `Page`,...) → Root Nodes → Presentation Templates. |
| **5. Sync YAML** | Sync thất bại hoặc thiếu các nhánh hệ thống cấp 1 | Nếu serialization YAML thiếu hoặc lỗi cú pháp, DB bị bỏ dở giữa chừng. | **Cao** | Cơ chế Dry-run ngầm kiểm tra cú pháp trước khi ghi thật; kiểm tra tính toàn vẹn cây phân cấp sau khi sync (đủ 5 nhánh cấp 1, không mồ côi). |
| **6. Tạo Admin** | Người dùng không lưu kịp mật khẩu ngẫu nhiên; hỏi "Password khi chạy npm link là gì?" | Mật khẩu in một lần ra console, nếu đóng terminal là mất; chưa có cơ chế reset mật khẩu nhanh tại chỗ; cơ chế `mustChangePassword` cần đảm bảo không lặp redirect. | **Trung bình** | Thêm cờ `treecraft init --reset-admin` hoặc lệnh `treecraft admin:reset` đặt lại mật khẩu rõ ràng. Đảm bảo form đổi mật khẩu lần đầu hoạt động mượt mà. |
| **7. Xuất bản mẫu** | Website công khai `/` không có nội dung nếu `item_web` rỗng | Publish sang Web DB cần đảm bảo ghi đúng collection `items_web` trong cùng DB đó. | **Cao** | `publishService` ghi bản ghi đã duyệt sang `items_web` trong cùng kết nối DB duy nhất. Kiểm tra `/` và `/about-us` trả về HTTP 200. |
| **8. Khởi chạy `dev`** | `Cannot find module '.../site/core/bin/treecraft.js'` (MODULE_NOT_FOUND) | Hướng dẫn in ra bảo `cd site` rồi mới gõ `node core/bin/treecraft.js dev`. Đứng trong `site/` thì đường dẫn tới core là `../core/`. | **Nghiêm trọng** | Sửa hướng dẫn: Không cần `cd site`. Đứng tại thư mục gốc repository dự án và chạy `npm run dev` (hoặc `node core/bin/treecraft.js dev`). `sitePaths` tự động phân giải `site/` nằm cạnh `core/`. |
| **9. Khởi chạy HTTP** | Terminal dừng sau `Session store initialized`, server không mở cổng, trình duyệt báo `ERR_CONNECTION_REFUSED` | Trong `bin/treecraft.js`, hàm `handleDev` và `handleStart` chỉ `require('../src/server')`. Nhưng `src/server.js` chỉ chạy `startServer()` khi `require.main === module` (`false`). Lệnh `server.listen()` chưa bao giờ được gọi! | **Nghiêm trọng** | Đã xử lý: `bin/treecraft.js` gọi tường minh `const { startServer } = require('../src/server'); await startServer();`. |
| **10. Cổng mặc định** | Trình duyệt vào port 4000 bị từ chối kết nối | File `.env.development` sinh ra với `PORT=3000` trong khi tài liệu và `AGENTS.md` quy ước cổng `4000`. | **Trung bình** | Đã chuẩn hóa `PORT=4000` và `APP_URL=http://localhost:4000` trong `initService.js` và starter. |

---

## 2. RÀ SOÁT CÁC ĐIỂM CÒN GIẢ ĐỊNH MÔ HÌNH HAI DATABASE TRONG MÃ NGUỒN VÀ TÀI LIỆU

Dưới đây là danh sách chi tiết các vị trí cần dọn sạch để chuyển đổi hoàn toàn sang **MỘT Database duy nhất (`treecraft_<slug>`), hai collection (`items_master` và `items_web`)**:

1. **`src/services/initService.js`**:
   - Dòng 310-312: Cấu hình `mongoDbMaster: { development: '..._master' }` và `mongoDbWeb: { development: '..._web' }`. ➔ **Cần sửa:** Chỉ còn một thuộc tính database duy nhất: `mongoDb: { development: 'treecraft_<slug>', ... }` hoặc `dbName`.
   - Dòng 338-339: `mongoUri` và `mongoUriWeb`. ➔ **Cần sửa:** Bỏ hoàn toàn `mongoUriWeb` và `MONGO_URI_WEB`.
   - Dòng 353: Sinh biến `MONGO_URI_WEB` trong `.env.development`. ➔ **Cần sửa:** Xóa bỏ biến này.
   - Dòng 492: Kết nối default với `${options.dbPrefix}_master`. ➔ **Cần sửa:** Kết nối default là `treecraft_${slug}`.

2. **`src/config/siteConfigSchema.js` & `src/config/sitePaths.js`**:
   - `mongoDbMaster` và `mongoDbWeb` trong schema của `site.config.js`. ➔ **Cần sửa:** Thay bằng `database: { name: 'treecraft_<slug>' }` hoặc `dbName: 'treecraft_<slug>'`, không chia tách Master/Web ở cấp database.

3. **`starter/corporate/`**:
   - `site.config.js`: Đang khai báo `mongoDbMaster` và `mongoDbWeb`. ➔ **Cần sửa:** Quy về một DB duy nhất `treecraft_corporate`.
   - `.env.staging.example` & `.env.production.example`: Đang chứa `staging_master` và `prod_master`. ➔ **Cần sửa:** Chuyển thành `staging` và `production` thuần nhất.

4. **`src/controllers/admin/databaseController.js` & `src/views/admin/databases/index.ejs`**:
   - Các nhãn hiển thị và mô tả ghi "Master Database" và "Web Database". ➔ **Cần sửa:** Điều chỉnh câu chữ thành "Master Collection (`items_master`)" và "Web Collection (`items_web`)" trong cùng một database dự án.

5. **`tests/initCommand.test.js` & `tests/coreSiteSeparation.test.js`**:
   - Các đoạn kiểm thử assert `mongoDbMaster` và `beta_enterprise_master`. ➔ **Cần cập nhật:** Test assert tên DB chuẩn `treecraft_<slug>`.

---

## 3. KẾT LUẬN VÀ HÀNH ĐỘNG TIẾP THEO

- Toàn bộ các lỗi khiến luồng repo mới bị tắc nghẽn đã được định vị chính xác nguyên nhân gốc rễ.
- Mô hình kiến trúc đã được đồng thuận: **Duy nhất một Database `treecraft_<slug>`**, chứa cả hai collection `items_master` (soạn thảo) và `items_web` (phân phối công khai).
- Bước 1 sẵn sàng chuyển sang tạo DEC-058, cập nhật Phase S4 và chờ phê duyệt để tiến hành Bước 2.

