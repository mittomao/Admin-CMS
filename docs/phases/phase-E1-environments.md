---
phase: E1
name: Tách Môi Trường Database (Local / Cloud) và Chốt Chặn An Toàn
status: Hoàn thành
depends_on: [0, 1, 5.1, 7, 8, 8.1, 9, 10, 11, K1]
estimate: 2-3 ngày làm việc
started: 2026-11-10
completed: 2026-11-10
updated: 2026-11-10
---

# GĐ E1 — Tách Môi Trường Database (Local / Cloud) và Chốt Chặn An Toàn

> Tách môi trường độc lập: MongoDB Local (Docker) cho `development`, Cloud cho `staging` và `production`. Giữ nguyên 100% tên Database (`admin_cms`) và 19 collections hiện hữu. Thiết lập chốt chặn an toàn `dbGuard` dựa trên phân loại Host và Fingerprint môi trường, cô lập kiểm thử Jest bằng DB tạm `_tmp_*`, ngăn chặn tuyệt đối nguy cơ dev/seed/migration/test chạm nhầm dữ liệu thật.

---

## 1. Tài liệu cần đọc trước khi làm
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/reports/E1-baseline.md`](../reports/E1-baseline.md)
- [`docs/decisions/DEC-051-database-backup-and-restore-architecture.md`](../decisions/DEC-051-database-backup-and-restore-architecture.md)
- [`docs/decisions/DEC-052-environment-database-separation-and-dbguard.md`](../decisions/DEC-052-environment-database-separation-and-dbguard.md)

---

## 2. Bảng Hiện trạng → Thay đổi → Rủi ro

| Hạng mục | Hiện trạng (Trước GĐ E1) | Thay đổi trong GĐ E1 | Rủi ro & Giải pháp phòng ngừa |
| :--- | :--- | :--- | :--- |
| **Môi trường Database** | Cả dev, migration, test đều trỏ trực tiếp vào MongoDB Atlas Cloud (`admin_cms`). | `development` chạy 100% trên Mongo Local Docker (`127.0.0.1:27017`), chỉ `staging` và `production` mới trỏ Cloud. | **Rủi ro:** Lệch schema hoặc tính năng giữa local và cloud.<br/>**Giải pháp:** Dùng đúng phiên bản Mongo 8.0, chạy replica set đơn nút (`--replSet rs0`), giữ nguyên 100% tên DB và 19 collections. |
| **Tên Database & Collections** | Tên DB là `admin_cms`, gồm 19 collections (`items_master`, `items_web`, `templates`...). | Giữ nguyên 100% tên DB `admin_cms` và 19 collections ở cả 3 môi trường; tuyệt đối không dùng hậu tố `_dev/_uat/_prod`. | **Rủi ro:** Nhầm lẫn môi trường do cùng tên DB.<br/>**Giải pháp:** Chốt chặn `dbGuard` phân loại Host (Local vs Remote) + Fingerprint môi trường + Banner/Nhãn màu Admin. |
| **Chốt chặn An toàn Code** | Không có chốt chặn; dựa hoàn toàn vào kỷ luật cá nhân khi sửa file `.env`. | Xây dựng module duy nhất `src/config/dbGuard.js`. Từ chối kết nối Remote Host ở `development`; từ chối Local Host ở `production`; chặn lệnh phá hoại trên Remote. | **Rủi ro:** Chốt chặn bị bypass trong các script CLI.<br/>**Giải pháp:** Mọi script (`seed*`, `migrate*`, `backup*`) bắt buộc nạp qua `dbGuard.connectDB()` hoặc gọi `assertSafeFor('destructive')`. |
| **Cấu hình File Môi trường** | Chỉ có 1 tệp `.env.example` chung; nạp qua `dotenv.config()` không phân biệt môi trường. | Chuẩn hóa 3 file mẫu `.env.development.example`, `.env.staging.example`, `.env.production.example`. Nạp đúng 1 file theo `APP_ENV`; cấm giá trị lạ (`develop`, `test`, `prod`). | **Rủi ro:** Vô tình commit file env thật chứa credentials.<br/>**Giải pháp:** Bổ sung cấu hình `.gitignore`, kiểm tra `git ls-files`, công cụ kiểm tra `npm run check:env`. |
| **Kiểm thử Tự động (Jest)** | Dùng `mongodb-memory-server` chạy in-memory hoặc có nguy cơ chạm DB thật nếu thiếu cấu hình. | Chạy kiểm thử trên Mongo Local với Database tạm `<tênDB>_tmp_<workerId>` theo từng worker; tự động dọn sạch sau khi test; từ chối chạy nếu phát hiện URI remote. | **Rủi ro:** DB tạm bị sót lại sau các lần test fail.<br/>**Giải pháp:** Script `npm run db:clean-tmp` chỉ dọn sạch các DB có tiền tố `_tmp_`. |
| **Chuyển dữ liệu Cloud &rarr; Local** | Tự dump/restore thủ công không có quy trình chuẩn, nguy cơ rò rỉ email/mật khẩu thật ra máy dev. | Cung cấp lệnh `npm run db:clone-from-remote`: kéo 1 chiều Cloud &rarr; Local, tự động Anonymize (che email, reset mật khẩu dev, xóa Basic Auth hash), tự gắn Fingerprint dev. | **Rủi ro:** Kéo nhầm chiều từ Local ghi đè lên Cloud.<br/>**Giải pháp:** Script chỉ có chiều Remote &rarr; Local; `dbGuard` chặn mọi thao tác ghi ngược lên Remote. |

---

## 3. Mục tiêu Giai đoạn E1

1. **Cô lập tuyệt đối môi trường phát triển (Development):** 100% công việc code, seed dữ liệu mẫu, chạy migration thử nghiệm và chạy test diễn ra trên máy cục bộ với Docker MongoDB local, không bao giờ chạm đến dữ liệu thật trên Cloud.
2. **Bảo toàn nguyên vẹn cấu trúc cơ sở dữ liệu:** Tên database `admin_cms` và 19 collections trên local giống hệt 100% với cloud baseline, không làm phát sinh bất kỳ sự khác biệt nào về schema hay logic nghiệp vụ.
3. **Chốt chặn đa tầng bằng mã nguồn (`dbGuard`):** Ngăn chặn chủ động mọi sai sót con người (cấu hình nhầm, gõ nhầm lệnh) thông qua phân loại Host, Fingerprint môi trường, cấm lệnh phá hoại trên Remote và kiểm tra tính toàn vẹn môi trường.
4. **Chuẩn hóa quy trình vận hành:** Cung cấp bộ lệnh `db:up`, `db:down`, `db:status`, `db:clone-from-remote`, `check:env` và tài liệu hướng dẫn chuẩn 7 mục tại `docs/guides/environments-and-databases.md`.

---

## 4. Phạm vi Thực hiện

### Làm:
- Thiết lập dịch vụ MongoDB 8.0 local bằng Docker Compose (`docker-compose.dev.yml`) hỗ trợ replica set đơn nút (`--replSet rs0`), volume bền vững, chỉ bind `127.0.0.1`.
- Chuẩn hóa hệ thống tệp môi trường: `.env.development.example`, `.env.staging.example`, `.env.production.example`. Cập nhật `src/config/env.js` nạp file duy nhất theo `APP_ENV`.
- Xây dựng module chốt chặn an toàn trung tâm [`src/config/dbGuard.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/dbGuard.js).
- Quản lý Fingerprint cơ sở dữ liệu trong collection `settings` (`environmentFingerprint`).
- Bảo vệ các lệnh phá hoại (`seed:reset`, `db:reset-local`, `seed`, `migrate*`, `backup:restore`).
- Tích hợp hiển thị Banner khởi động console và Nhãn màu môi trường trên Topbar Admin CMS.
- Thiết lập cơ chế kiểm thử Jest chạy trên Mongo Local với Database tạm `_tmp_*` và chốt chặn cấm URI remote.
- Xây dựng lệnh `npm run db:clone-from-remote` kéo dữ liệu 1 chiều từ Cloud về Local kèm Anonymization cơ bản.
- Xây dựng công cụ kiểm tra tính hợp lệ cấu hình `npm run check:env`.
- Soạn thảo tài liệu hướng dẫn vận hành chi tiết: `docs/guides/environments-and-databases.md`.

### Không làm:
- Không di chuyển hay thay đổi nhà cung cấp Cloud MongoDB Atlas hiện tại.
- Không đổi tên database hay tên bất kỳ collection nào.
- Không thiết lập cụm sharding hay replica set đa nút phức tạp.
- Không tạo môi trường `test` riêng (không `APP_ENV=test`, không `.env.test`).
- Không cài đặt thêm bất kỳ thư viện npm bên thứ ba nào ngoài danh mục `02-tech-stack.md`.

---

## 5. Checklist Chi tiết Công việc (Tasks)

- [x] **Task E1.1:** Khảo sát và lập tài liệu hiện trạng baseline kết nối, danh mục 19 collections và indexes: `docs/reports/E1-baseline.md`.
- [x] **Task E1.2:** Xây dựng tệp cấu hình Docker Compose `docker-compose.dev.yml` khởi chạy MongoDB 8.0 local (replica set đơn nút `rs0`, volume lưu trữ `treecraft-mongo-dev-data`, healthcheck, bind `127.0.0.1:27017`).
- [x] **Task E1.3:** Xây dựng 3 tệp cấu hình mẫu chuẩn hóa có chú thích đầy đủ:
  - `.env.development.example`
  - `.env.staging.example`
  - `.env.production.example`
  Đề xuất cập nhật `.gitignore` bảo vệ các tệp `.env.*` thật.
- [x] **Task E1.4:** Nâng cấp [`src/config/env.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/env.js):
  - Kiểm tra và bắt buộc `APP_ENV` thuộc whitelist `['development', 'staging', 'production']`. Từ chối các giá trị lạ (`develop`, `test`, `prod`...).
  - Nạp đúng 1 tệp cấu hình duy nhất theo `APP_ENV`. Ưu tiên biến môi trường của tiến trình hệ điều hành.
  - Đồng bộ `NODE_ENV` tương ứng. Tách cấu hình `CLOUDINARY_ROOT_FOLDER` (`AdminCMS-dev` vs `AdminCMS`) và `BACKUP_DIR`.
- [x] **Task E1.5:** Xây dựng module chốt chặn an toàn trung tâm [`src/config/dbGuard.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/dbGuard.js):
  - Phân loại Host (Local Host vs Remote Host).
  - Kiểm tra tính tương thích `APP_ENV` và loại Host (dev bắt buộc local; staging/prod bắt buộc remote TLS).
  - Quản lý và kiểm tra Fingerprint môi trường (`settings.environmentFingerprint`).
  - Hàm chốt chặn lệnh phá hoại `assertSafeFor('destructive')`.
  - In Banner khởi động che mật khẩu và gắn nhãn môi trường cho view Admin.
- [x] **Task E1.6:** Tích hợp `dbGuard` vào [`src/config/db.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/db.js), [`src/server.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/server.js) và toàn bộ các tệp script trong `src/scripts/` (`seed*`, `migrate*`, `backup-cli`, `maintenance-cli`).
- [x] **Task E1.7:** Cập nhật Topbar Admin CMS ([`src/views/admin/layouts/main.ejs`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/views/admin/layouts/main.ejs) hoặc header partial): Hiển thị Badge nhãn môi trường trực quan (Xanh: Development, Vàng: Staging, Đỏ: Production).
- [x] **Task E1.8:** Tái cấu trúc cơ chế kiểm thử tự động Jest:
  - Chạy với `APP_ENV=development` trên Mongo Local Docker.
  - Tự động sinh DB tạm `<tênDB>_tmp_<workerId>` cho từng Jest worker và drop khi teardown.
  - Thêm chốt chặn cấm hoàn toàn kết nối Remote Host trong test suite.
  - Viết script `src/scripts/clean-tmp-dbs.js` (`npm run db:clean-tmp`).
- [x] **Task E1.9:** Xây dựng công cụ kiểm tra tính hợp lệ cấu hình tệp env: `src/scripts/check-env.js` (`npm run check:env`).
- [x] **Task E1.10:** Xây dựng công cụ clone dữ liệu an toàn 1 chiều từ Cloud về Local: `src/scripts/clone-from-remote.js` (`npm run db:clone-from-remote -- --env staging|production` kèm `--anonymize`).
- [x] **Task E1.11:** Thêm các scripts tiện ích vào `package.json`:
  - `db:up`, `db:down`, `db:status`, `db:reset-local`, `db:clean-tmp`, `db:clone-from-remote`, `check:env`.
- [x] **Task E1.12:** Xây dựng bộ kiểm thử tự động toàn diện cho Giai đoạn E1:
  - `tests/dbGuard.test.js`: Kiểm tra phân loại host, từ chối host remote ở dev, từ chối host local ở prod, kiểm tra fingerprint, chặn lệnh phá hoại trên remote.
  - `tests/envConfig.test.js`: Kiểm tra nạp file env theo `APP_ENV`, từ chối giá trị lạ (`develop`, `test`), thứ tự ưu tiên biến tiến trình.
  - `tests/dbInvariant.test.js`: Đối soát tên database và 19 collections trên local trùng khớp 100% với baseline cloud.
- [x] **Task E1.13:** Soạn thảo tài liệu hướng dẫn vận hành chuẩn 7 mục: `docs/guides/environments-and-databases.md`.
- [x] **Task E1.14:** Cập nhật tài liệu liên quan: `docs/decisions/DEC-052-*.md`, `docs/phases/README.md`, `docs/phases/phase-12-hardening.md`.

---

## 6. Tiêu chí Hoàn thành (Definition of Done - DoD)

- [x] Lệnh `npm run db:up` khởi chạy thành công MongoDB 8.0 local trên Docker; `npm run dev` chạy mượt mà với `.env.development`, banner console hiển thị đúng `development` và host local.
- [x] Tên database (`admin_cms`) và danh sách 19 collections trên local Docker trùng khớp 100% với baseline cloud (có kiểm thử tự động `tests/dbInvariant.test.js` xác nhận).
- [x] Chốt chặn `dbGuard` hoạt động chuẩn xác:
  - Cố tình trỏ Remote Host ở môi trường `development` &rarr; Bị từ chối khởi động lập tức.
  - `APP_ENV` không hợp lệ (`develop`, `dev`, `test`, `prod`) &rarr; Bị từ chối khởi động kèm gợi ý giá trị đúng.
  - Sai lệch Fingerprint giữa database và tiến trình &rarr; Bị từ chối kết nối.
  - Các lệnh phá hoại (`seed:reset`, `db:reset-local`) bị chặn 100% trên Remote Host.
- [x] Toàn bộ bộ kiểm thử `npm test` chạy an toàn trên Mongo Local bằng database tạm `_tmp_*`, không bao giờ kết nối hay sửa đổi database thật.
- [x] Lệnh `npm run db:clone-from-remote` kéo dữ liệu thành công từ Cloud về Local, tự động anonymize dữ liệu nhạy cảm và tự gán fingerprint `development`.
- [x] Công cụ `npm run check:env` kiểm tra và phát hiện chính xác biến thiếu/thừa giữa các file mà không in lộ bí mật ra console.
- [x] Giao diện Admin CMS hiển thị nhãn màu môi trường rõ ràng trên thanh Topbar.
- [x] Tài liệu `docs/guides/environments-and-databases.md` hoàn thành đầy đủ 12 kịch bản hướng dẫn theo mẫu chuẩn 7 mục.
- [x] Toàn bộ test suites (bao gồm regression tests cũ) đều chạy XANH (PASS 100%).
- [x] `npm run check:branding` vượt qua kiểm tra, không còn sót từ khóa cấm.
- [x] Soạn thảo báo cáo nghiệm thu giai đoạn `docs/reports/phase-E1-report.md`.
- [x] **Tuyệt đối không có commit nào được tạo** trong quá trình thực hiện.

