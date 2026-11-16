---
phase: S4
name: Kiểm Tra và Hoàn Thiện Luồng Repo Mới "Submodule -> Init -> Dev" (Fresh Install)
depends_on: [S1, S2, E1]
status: Hoàn thành
start_date: 2026-11-16
end_date: 2026-11-16
lead: Senior Software Architect / Tech Lead
---

# GIAI ĐOẠN S4: KIỂM TRA VÀ HOÀN THIỆN LUỒNG REPO MỚI "SUBMODULE → INIT → DEV"

## 1. MỤC TIÊU & TỔNG QUAN
Giai đoạn S4 tập trung hoàn thiện trải nghiệm khởi tạo dự án mới từ Core submodule sao cho **chỉ đúng 2 thao tác là đủ để Core chạy** và sau đó **chỉ cần lệnh `npm run dev` là truy cập được trang quản trị `/admin` và website `/`**.

Luồng mục tiêu chuẩn duy nhất:
```bash
git init my-project && cd my-project
git submodule add <url-core> core        # BƯỚC 1: Kéo Core Engine
node core/bin/treecraft.js init           # BƯỚC 2: Tự động hoá 100% (cài deps, dựng DB, seed, sync, publish)
npm run dev                               # → Mở trình duyệt vào ngay http://localhost:4000/admin
```

### Kiến Trúc Dữ Liệu Cốt Lõi (Đã Chốt - DEC-058):
- Mỗi dự án chỉ dùng **DUY NHẤT MỘT DATABASE**: `treecraft_<slug>` (ví dụ dự án `celphones` → `treecraft_celphones`).
- **Không có DB Web riêng**, không có hậu tố `_web` hay `_master` trong tên database, không có biến môi trường `MONGO_URI_WEB`.
- Master và Web là **hai collection trong cùng DB**: `items_master` (soạn thảo) và `items_web` (xuất bản).
- Mọi collection khác (`templates`, `roles`, `users`, `languages`, `launchpad_apps`, `media`, `access_control_lists`, `audit_logs`, `settings`,...) giữ nguyên tên gốc.
- `dbGuard` kiểm tra duy nhất một DB. K1 backup dump duy nhất một DB.

---

## 2. BẢNG SO SÁNH HIỆN TRẠNG, THAY ĐỔI VÀ RỦI RO

| Hạng mục | Hiện trạng trước S4 | Sau khi hoàn thiện S4 | Rủi ro & Giải pháp phòng ngừa |
|:---|:---|:---|:---|
| **Dependencies Core** | `core/node_modules` bị thiếu khi kéo qua submodule ➔ Lỗi `Cannot find module`. | `init` tự động phát hiện thiếu và chạy `npm install` bên trong `core/`. | Rủi ro: Lỗi mạng. Giải pháp: Bắt lỗi, hiển thị thông báo hướng dẫn rõ ràng rồi dừng. |
| **Kiến trúc Database** | Sinh ra `_master` và `_web` (`MONGO_URI_WEB`) gây hiểu lầm và lỗi kết nối. | Chuẩn hóa **MỘT Database duy nhất `treecraft_<slug>`**, 2 collection `items_master` và `items_web`. | Rủi ro: Test suite cũ assert tên DB cũ. Giải pháp: Cập nhật toàn bộ test suite theo DEC-058. |
| **Khởi động Server (`dev`)** | `bin/treecraft.js` chỉ require server mà không gọi `startServer()`, cổng HTTP không mở. | `bin/treecraft.js` gọi tường minh `await startServer()`, in banner đầy đủ và mở cổng. | Rủi ro: Treo tiến trình. Giải pháp: Đảm bảo lifecycle `server.listen()` hoàn tất mới báo ready. |
| **Đường dẫn lệnh tiếp theo** | Hướng dẫn `cd site` gây lỗi Module Not Found khi chạy `node core/bin/treecraft.js`. | Không cần `cd site`. Đứng tại thư mục gốc repo và chạy `npm run dev` (hoặc `node core/bin/treecraft.js dev`). | Rủi ro: Người dùng chạy từ thư mục con. Giải pháp: Hỗ trợ `sitePaths` phân giải cả 2 trường hợp. |
| **Cô lập nhiều dự án** | Container Docker và Volume dùng chung tên gây xung đột giữa các dự án. | Container đặt tên theo slug `${slug}-mongo-dev`, volume `${slug}_mongodb_data`, tự chọn cổng nếu 27017 bận. | Rủi ro: Xung đột cổng. Giải pháp: Tự động cấp phát cổng kế tiếp và lưu vào `.env.development`. |
| **Bảo mật & Đăng nhập Admin** | Mật khẩu in ra màn hình dễ bị trôi; chưa có công cụ reset mật khẩu nhanh tại chỗ. | Mật khẩu in rõ ràng, cơ chế `mustChangePassword` không lặp redirect; hỗ trợ lệnh reset mật khẩu admin. | Rủi ro: Quên mật khẩu sau khi tắt terminal. Giải pháp: Cung cấp lệnh `treecraft admin:reset`. |

---

## 3. CHECKLIST CÔNG VIỆC CHI TIẾT (TASKS)

- [x] **Task S4.1: Chẩn đoán lỗi và đóng băng kiến trúc Một Database Hai Collection**
  - [x] Lập báo cáo chẩn đoán tại `docs/reports/S4-diagnosis.md`.
  - [x] Ban hành quyết định kiến trúc [DEC-058](../decisions/DEC-058-single-database-dual-collection-architecture.md).
  - [x] Đăng ký DEC-058 vào `docs/decisions/README.md`.
  - [x] Cập nhật bảng tiến độ tại `docs/phases/README.md`.

- [x] **Task S4.2: Tự động kiểm tra và cài đặt dependencies cho Core**
  - [x] Kiểm tra `core/node_modules/` trong `step1_CheckPreflight`.
  - [x] Nếu thiếu, tự động kích hoạt `npm install` bên trong `coreDir` với thông báo tiến độ.
  - [x] Bắt lỗi mạng/quyền hạn, in hướng dẫn khắc phục chi tiết và dừng an toàn.

- [x] **Task S4.3: Chuẩn hóa `initService.js` theo kiến trúc Một Database `treecraft_<slug>`**
  - [x] Xóa bỏ hoàn toàn biến `MONGO_URI_WEB`, `mongoUriWeb`, `mongoDbWeb`, và các hậu tố `_master`/`_web`.
  - [x] Sinh `.env.development` với duy nhất một biến `MONGO_URI=mongodb://127.0.0.1:27017/treecraft_<slug>?replicaSet=rs0`.
  - [x] Sinh `site.config.js` với `dbName: 'treecraft_<slug>'` (chuẩn hóa slug: ký tự thường, bỏ dấu, không khoảng trắng).
  - [x] Cập nhật `starter/corporate/` (bỏ `mongoDbWeb`, `staging_master`, `prod_master`).
  - [x] Cập nhật `siteConfigSchema.js` và `sitePaths.js` đồng bộ theo một DB.

- [x] **Task S4.4: Chuẩn hóa Docker Compose của Site và cô lập đa dự án**
  - [x] Cập nhật `docker-compose.dev.yml` sinh ra: `container_name: ${slug}-mongo-dev`, volume `${slug}_mongodb_data`.
  - [x] Xử lý trường hợp cổng 27017 bị chiếm bởi tiến trình không phải Mongo (tự chọn cổng rảnh hoặc thông báo).
  - [x] Kiểm tra chạy hai dự án khác slug cùng lúc: Không xung đột container, volume hay dữ liệu.

- [x] **Task S4.5: Tạo `package.json` tối thiểu cho thư mục gốc repo dự án**
  - [x] Khởi tạo hoặc cập nhật `package.json` tại gốc dự án có scripts:
    - `"dev": "node core/bin/treecraft.js dev"`
    - `"start": "node core/bin/treecraft.js start"`
    - `"doctor": "node core/bin/treecraft.js doctor"`
    - `"db:up": "node core/bin/treecraft.js db:up"`
    - `"db:down": "node core/bin/treecraft.js db:down"`
  - [x] Đảm bảo người dùng chỉ cần gõ `npm run dev` từ thư mục gốc dự án.

- [x] **Task S4.6: Hoàn thiện lệnh `treecraft dev` và vòng đời khởi động**
  - [x] `bin/treecraft.js` gọi tường minh `const { startServer } = require('../src/server'); await startServer();`.
  - [x] Nạp chính xác `.env.development` từ `site/`.
  - [x] Kiểm tra kết nối MongoDB, nếu tắt thì báo rõ lệnh bật (`npm run db:up`).
  - [x] In Banner đầy đủ: Môi trường `development`, tên DB `treecraft_<slug>`, URL trang public và admin.

- [x] **Task S4.7: Quản trị tài khoản Admin và kiểm soát đăng nhập**
  - [x] Sinh mật khẩu ngẫu nhiên mạnh (16 ký tự chữ, số, ký tự đặc biệt).
  - [x] Đặt cờ `mustChangePassword: true`.
  - [x] Kiểm tra luồng đăng nhập đầu tiên: chuyển hướng đến form đổi mật khẩu, đổi thành công thì vào thẳng `/admin` (không bị vòng lặp redirect).
  - [x] Cung cấp cờ `treecraft init --reset-admin` hoặc lệnh phụ để đặt lại mật khẩu admin khi cần.

- [x] **Task S4.8: Cập nhật tài liệu hướng dẫn vận hành `docs/guides/core-and-site.md`**
  - [x] Cập nhật theo chuẩn mẫu 7 mục bắt buộc.
  - [x] Hướng dẫn đúng 2 bước chuẩn: `git submodule add` → `node core/bin/treecraft.js init` → `npm run dev`.
  - [x] Giải thích rõ mô hình một database `treecraft_<slug>` và hai collection `items_master` / `items_web`.
  - [x] Hướng dẫn khắc phục sự cố, xử lý lỗi giữa chừng và chạy nhiều dự án song song.

- [x] **Task S4.9: Xây dựng công cụ kiểm tra tự động `npm run verify:fresh-install`**
  - [x] Tạo script `src/scripts/verify-fresh-install.js`.
  - [x] Thực thi hoàn toàn trong thư mục tạm của hệ điều hành (`os.tmpdir()`), tuyệt đối không đụng repo hiện tại.
  - [x] Kịch bản tự động: `git init` → `git submodule add` (core local) → `init` → khởi động server ngầm → kiểm tra HTTP `/admin/login`, đăng nhập, đổi mật khẩu, kiểm tra `/` và `/about-us` HTTP 200 → kiểm tra DB chỉ có 1 DB với `items_master` và `items_web` → dọn dẹp thư mục tạm.
  - [x] Hỗ trợ cờ `--keep` và `--slug <name>`.
  - [x] Thêm script vào `package.json` của Core: `"verify:fresh-install": "node src/scripts/verify-fresh-install.js"`.

- [x] **Task S4.10: Dọn dẹp mã nguồn, kiểm thử hồi quy và nghiệm thu**
  - [x] Rà soát grep toàn bộ mã nguồn, bảo đảm không còn tàn dư `MONGO_URI_WEB`, `MONGO_DB_WEB`, `_master`/`_web` trong tên DB.
  - [x] Chạy toàn bộ test suite (`npm test`), đảm bảo 100% test pass.
  - [x] Chạy ESLint (`npm run lint`), đảm bảo 0 lỗi.
  - [x] Lập báo cáo nghiệm thu tại `docs/reports/phase-S4-report.md`.

---

## 4. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DoD)
- [x] Repo mới chỉ cần 2 thao tác (`git submodule add` + `init`) là xong mọi thứ; sau đó `npm run dev` mở được ngay `/admin` và `/`.
- [x] Cơ sở dữ liệu tuân thủ nghiêm ngặt mô hình **Một Database duy nhất** `treecraft_<slug>`, Master và Web là `items_master` và `items_web`.
- [x] Toàn bộ nội dung mẫu tự sinh đầy đủ trên `items_master` và xuất bản sang `items_web`; route `/` và `/about-us` trả về 200.
- [x] Tài khoản admin đăng nhập được, đổi mật khẩu lần đầu suôn sẻ không lặp redirect.
- [x] Script `npm run verify:fresh-install` chạy thành công rực rỡ trên OS hiện tại.
- [x] Grep toàn bộ repo không còn dấu vết của giả định 2 database vật lý.
- [x] `docs/guides/core-and-site.md` cập nhật đầy đủ theo mẫu 7 mục.
- [x] Toàn bộ test suite và lint vượt qua 100%.
- [x] Tuân thủ tuyệt đối quy tắc Git: **Không có bất kỳ commit nào được tạo tự động**.

