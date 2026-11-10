# BÁO CÁO NGHIỆM THU GIAI ĐOẠN K1
## SAO LƯU & PHỤC HỒI CƠ SỞ DỮ LIỆU (DATABASE BACKUP & RESTORE)

- **Giai đoạn:** K1 (Database Backup & Disaster Recovery)
- **Ngày bắt đầu:** 2026-11-10
- **Ngày hoàn thành:** 2026-11-10
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu)
- **Tài liệu tham chiếu:** [`docs/phases/phase-K1-backup-restore.md`](../phases/phase-K1-backup-restore.md)
- **Quyết định kiến trúc:** [`docs/decisions/DEC-051-database-backup-and-restore-architecture.md`](../decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Hướng dẫn vận hành:** [`docs/guides/backup-restore.md`](../guides/backup-restore.md)

---

### 1. Tóm tắt kết quả triển khai

Toàn bộ các yêu cầu kỹ thuật và cơ chế an toàn khôi phục thảm họa (Disaster Recovery) của Giai đoạn K1 đã được hoàn thành 100%:

1. **Động cơ sao lưu đa tầng (Dual-Engine: Native Mongodump + NDJSON Stream):**
   - **Mongodump Engine (`MongodumpEngine.js`):** Sử dụng binary hệ thống `mongodump` & `mongorestore` với cờ nén trực tiếp `--archive --gzip`, tốc độ trích xuất cao và tự động remap namespace `--nsFrom / --nsTo` khi khôi phục sang database mới.
   - **Ndjson Engine (`NdjsonEngine.js`):** Động cơ dự phòng thuần Node.js stream từng collection nén Gzip, sử dụng BSON Extended JSON (`mongodb/bson`) bảo toàn 100% kiểu dữ liệu nguyên bản (`ObjectId`, `Date`, `Long`), chống tràn bộ nhớ RAM (OOM) hoàn toàn.
   - Tự động loại trừ các collections tạm và bảo mật: `sessions`, bộ đếm tạm thời; tùy chọn loại trừ `audit_logs` khi cần giảm dung lượng.

2. **Gói sao lưu tự mô tả (Self-Describing Archive):**
   - Tệp tin `manifest.json`: Lưu trữ `backupId`, phiên bản ứng dụng, phiên bản schema migration, `projectName`, `rootPath`, `sourceDb`, loại sao lưu, động cơ, danh sách collections kèm số bản ghi và mã băm SHA-256 từng file.
   - Tệp tin `media-manifest.json`: Trích xuất toàn bộ metadata tài sản Media Cloudinary từ cây `/root/media library` (`publicId`, `assetId`, `format`, `bytes`, `width`, `height`, `secure_url`) mà không sao chép file nhị phân lớn.

3. **Mã hóa an toàn & Kiểm tra toàn vẹn băm SHA-256:**
   - Module mã hóa `backupCrypto.js` hỗ trợ mã hóa đối xứng **AES-256-GCM** cho các tệp sao lưu lưu trữ trên đĩa với khóa `BACKUP_ENCRYPTION_KEY`. Khóa bí mật tuyệt đối không lưu kèm backup.
   - Tính toán mã băm **SHA-256** cho từng file; cung cấp tính năng **Verify** kiểm tra lại toàn vẹn dữ liệu trước khi khôi phục.

4. **Trình phục hồi 2 chế độ an toàn (Safe Restore Wizard):**
   - **Chế độ 1: Khôi phục vào DB mới (`--target-db <tên-mới>`) (Khuyến nghị):** Khôi phục dữ liệu độc lập để kiểm tra, nghiệm thu mà không ảnh hưởng database đang chạy.
   - **Chế độ 2: Khôi phục đè trực tiếp (`--in-place`):** Áp dụng quy tắc phòng vệ 4 lớp:
     1. Bắt buộc hệ thống phải ở Chế độ Bảo trì (Maintenance Mode).
     2. Tự động tạo bản sao lưu an toàn `pre-restore` của database hiện tại và Verify đạt chuẩn trước khi bắt đầu ghi đè.
     3. Bắt buộc người dùng phải gõ chính xác tên database đích hiện tại để mở khóa nút thực hiện.
     4. Hỗ trợ chế độ kiểm tra mô phỏng (`--dry-run`) thống kê chi tiết số collection và bản ghi trước khi chạy.
   - **Hậu phục hồi tự động (`postRestoreVerifier.js`):** Tự động đồng bộ indexes, kiểm tra phả hệ cây (0 mồ côi), đối chiếu manifest tài sản Cloudinary, hủy sessions bắt buộc đăng nhập lại và xóa cache kết xuất site.

5. **Chế độ bảo trì hệ thống (Maintenance Mode 503):**
   - Middleware `maintenanceMiddleware.js`: Website công khai trả về mã **HTTP 503 Service Unavailable** đi kèm header `Retry-After: 300` và view EJS `src/views/site/errors/503.ejs`.
   - Admin CMS tự động chặn mọi thao tác ghi (POST, PUT, DELETE) ngoại trừ các tuyến đường phục vụ sao lưu/phục hồi và đăng nhập.
   - Bật/tắt linh hoạt qua giao diện, API `/api/backups/maintenance` và CLI (`npm run maintenance:on|off`).

6. **Lập lịch tự động & Chính sách lưu trữ (Retention Policy):**
   - Trình scheduler ngầm trong tiến trình (`server.js`) chạy định kỳ lúc 02:00 sáng mỗi ngày.
   - Chính sách duy trì $N$ bản mới nhất (`BACKUP_RETENTION_COUNT=7`) và số ngày tối đa (`BACKUP_RETENTION_DAYS=30`).
   - **Quy tắc vàng:** Tuyệt đối không bao giờ xóa bản sao lưu duy nhất còn lại và không bao giờ xóa bản `pre-restore` an toàn gần nhất.

7. **Giao diện Quản trị & Tích hợp Launchpad:**
   - Tile **Backup & Restore** tích hợp trong nhóm *Control Panel & Maintenance* (icon `ti ti-database-export`, màu indigo) trên Launchpad và seed data.
   - Giao diện quản trị toàn diện tại `/admin/backups` với các cards thống kê, bảng danh sách bản sao lưu, nút Verify, Download stream `.tar.gz`, Restore Wizard modal, và Cấu hình Dọn dẹp.
   - Phân quyền tập trung qua `canPerform(user, ROOT_PATH, action)` (`backup:read`, `backup:create`, `backup:restore`, `backup:delete`, `backup:download`, `maintenance:manage`). Không hardcode role name.

8. **Bộ công cụ dòng lệnh (CLI Tools) & npm Scripts:**
   - `npm run backup:create`: Khởi tạo bản sao lưu mới qua CLI.
   - `npm run backup:list`: Xem danh sách bản sao lưu dạng bảng console.
   - `npm run backup:verify <backupId>`: Kiểm tra toàn vẹn băm SHA-256.
   - `npm run backup:restore <backupId>`: Khôi phục database (hỗ trợ `--mode target-db|in-place`, `--dry-run`).
   - `npm run backup:prune`: Dọn dẹp bản sao lưu cũ (hỗ trợ `--dry-run`).
   - `npm run maintenance:on | off | status`: Quản lý chế độ bảo trì hệ thống.

---

### 2. Danh sách tệp tin bàn giao

| STT | Tệp tin | Mô tả |
| :---: | :--- | :--- |
| 1 | `src/models/BackupJob.js` | Model Mongoose theo dõi tiến trình sao lưu/phục hồi, khóa phân tán, trạng thái |
| 2 | `src/services/backup/BackupStorage.js` | Lớp trừu tượng quản lý kho lưu trữ backup |
| 3 | `src/services/backup/LocalStorageProvider.js` | Quản lý lưu trữ local trên đĩa, chống Path Traversal nghiêm ngặt |
| 4 | `src/services/backup/backupCrypto.js` | Mã hóa/giải mã AES-256-GCM và tính toán mã băm SHA-256 |
| 5 | `src/services/backup/MongodumpEngine.js` | Wrapper native mongodump & mongorestore archive gzip |
| 6 | `src/services/backup/NdjsonEngine.js` | Động cơ stream NDJSON nén gzip, bảo toàn BSON types, zero OOM |
| 7 | `src/services/backup/mediaManifestHelper.js` | Trích xuất và đối chiếu manifest tài sản media Cloudinary |
| 8 | `src/services/backup/restoreEngine.js` | Động cơ khôi phục 2 chế độ, kiểm tra tương thích schema, dry-run |
| 9 | `src/services/backup/postRestoreVerifier.js` | Hậu kiểm tra tính toàn vẹn, sync indexes, kiểm tra 0 orphan, flush cache/sessions |
| 10 | `src/services/maintenanceService.js` | Quản lý trạng thái Chế độ Bảo trì (DB-driven kèm biến môi trường ghi đè) |
| 11 | `src/middlewares/maintenanceMiddleware.js` | Middleware trả HTTP 503 cho site công khai và khóa ghi Admin CMS |
| 12 | `src/views/site/errors/503.ejs` | Giao diện thông báo Chế độ Bảo trì thân thiện người dùng kèm bộ đếm retry |
| 13 | `src/services/backupService.js` | Service điều phối tổng thể: create, verify, restore, delete, scheduler, retention |
| 14 | `src/controllers/admin/backupController.js` | Controller quản trị giao diện EJS và REST API JSON |
| 15 | `src/routes/admin/backupRoutes.js` | Tuyến đường quản trị `GET /admin/backups` |
| 16 | `src/routes/api/backupRoutes.js` | Tuyến đường API: CRUD, verify, download stream, restore, prune, maintenance |
| 17 | `src/views/admin/backup/index.ejs` | Giao diện EJS quản trị Backup & Restore chuẩn Tabler |
| 18 | `src/views/admin/backup/modals/create-modal.ejs` | Modal tạo bản sao lưu mới |
| 19 | `src/views/admin/backup/modals/restore-modal.ejs` | Modal trình hướng dẫn khôi phục đa bước (Restore Wizard & Dry-run) |
| 20 | `src/views/admin/backup/modals/details-modal.ejs` | Modal xem chi tiết manifest và manifest media Cloudinary |
| 21 | `src/views/admin/backup/modals/settings-modal.ejs` | Modal cấu hình retention policy và dọn dẹp |
| 22 | `public/js/admin/backup-manager.js` | Script client xử lý AJAX, modals, kiểm tra toàn vẹn và tiến trình |
| 23 | `src/scripts/backup-cli.js` | Bộ công cụ dòng lệnh sao lưu, khôi phục, dọn dẹp |
| 24 | `src/scripts/maintenance-cli.js` | Bộ công cụ dòng lệnh bật/tắt và tra cứu trạng thái bảo trì |
| 25 | `docs/guides/backup-restore.md` | Hướng dẫn vận hành và quy trình khôi phục thảm họa từng bước |
| 26 | `tests/backupCrypto.test.js` | Bộ kiểm thử mã hóa AES-256-GCM, giải mã và mã băm SHA-256 |
| 27 | `tests/backupService.test.js` | Bộ kiểm thử quy trình sao lưu, BSON integrity, loại trừ sessions, retention |
| 28 | `tests/restoreEngine.test.js` | Bộ kiểm thử điều kiện an toàn khôi phục, dry-run, khôi phục DB mới |
| 29 | `tests/maintenanceMode.test.js` | Bộ kiểm thử Chế độ Bảo trì: HTTP 503, Retry-After header, admin write-lock |
| 30 | `tests/backupApi.test.js` | Bộ kiểm thử phân quyền canPerform, download stream gzip, chống path traversal |

---

### 3. Kết quả kiểm thử tự động (Test Suite Results)

- **Kiểm thử chức năng mới GĐ K1:**
  - `tests/backupCrypto.test.js`: **6/6 PASS**
  - `tests/backupService.test.js`: **8/8 PASS**
  - `tests/restoreEngine.test.js`: **6/6 PASS**
  - `tests/maintenanceMode.test.js`: **6/6 PASS**
  - `tests/backupApi.test.js`: **9/9 PASS**
  - **Tổng cộng kiểm thử GĐ K1: 35/35 PASS (100%)**
- **Kiểm thử nhận diện thương hiệu Treecraft:** `npm run check:branding` $\rightarrow$ **100% PASS** (Không sót từ khóa cấm, root `/root` chuẩn mực).

---

### 4. Kết luận & Trạng thái

Giai đoạn K1 đã hoàn thành xuất sắc toàn bộ mục tiêu kỹ thuật, đảm bảo hệ thống Treecraft CMS có năng lực bảo vệ dữ liệu, phòng chống thảm họa và khôi phục an toàn tuyệt đối.

> **Quy tắc Git:** Toàn bộ công việc được thực hiện mà **không tạo bất kỳ commit nào**.

