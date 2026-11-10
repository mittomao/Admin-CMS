---
phase: K1
name: Sao lưu & Phục hồi Cơ sở dữ liệu (Database Backup & Restore)
status: Hoàn thành
depends_on: [0, 1, 5.1, 7, 8, 8.1, 9, 10, 11]
estimate: 3-4 ngày làm việc
started: 2026-11-10
completed: 2026-11-10
updated: 2026-11-10
---

# GĐ K1 — Sao lưu & Phục hồi Cơ sở dữ liệu (Database Backup & Restore)

> Giải pháp Disaster Recovery & Backup toàn diện: Dual-Engine (mongodump binary + Streamed NDJSON fallback), lưu trữ tự mô tả với manifest & SHA-256 checksum, mã hóa AES-256-GCM, Safe Restore 2 chế độ (khôi phục DB mới & in-place có pre-restore bắt buộc), chế độ bảo trì 503, lập lịch tự động & Retention Policy.

---

## 1. Tài liệu cần đọc trước khi làm
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/decisions/DEC-051-database-backup-and-restore-architecture.md`](../decisions/DEC-051-database-backup-and-restore-architecture.md)

---

## 2. Bảng Hiện trạng → Thay đổi → Rủi ro

| Hạng mục | Hiện trạng (Trước GĐ K1) | Thay đổi trong GĐ K1 | Rủi ro & Giải pháp phòng ngừa |
| :--- | :--- | :--- | :--- |
| **Phạm vi sao lưu** | Chỉ có Serialization (GĐ 11) xuất các item logic sang JSON; thiếu indexes, ACL, users, settings, jobs, histories. | Sao lưu nhị phân/BSON toàn diện Master và Web DB, cấu trúc archive tự mô tả kèm `manifest.json`, `media-manifest.json` (Cloudinary metadata). | **Rủi ro:** Lộ lọt mật khẩu hash hoặc secret.<br/>**Giải pháp:** Mã hóa AES-256-GCM, không đưa `.env` hay Cloudinary secret vào archive; loại trừ `sessions`. |
| **Động cơ trích xuất** | Không có. | Động cơ kép: Ưu tiên `mongodump --archive --gzip` (đã có trên macOS tại `/opt/homebrew/bin/mongodump`), tự động fallback sang Streamed NDJSON bảo toàn kiểu BSON nếu máy chủ không có binary. | **Rủi ro:** Tràn bộ nhớ (OOM) nếu collection lớn.<br/>**Giải pháp:** Stream từng dòng NDJSON kết hợp nén Gzip, không đọc cả collection vào RAM. |
| **Tính nhất quán khi backup** | Chưa có cơ chế khóa. | Sử dụng Mongo Session/Read Preference nhất quán trên Replica Set Atlas; kiểm tra và chặn backup khi có `publishJobs` đang `Processing`. Cơ chế khóa `BackupJob` (`lockToken`). | **Rủi ro:** Bản dump bị lệch pha khi có publish job chạy.<br/>**Giải pháp:** Tạm dừng queue xuất bản, kiểm tra `publishJobs` trước khi chạy backup. |
| **Cơ chế phục hồi (Restore)** | Chưa có cơ chế khôi phục DB cấp hệ thống. | 2 chế độ an toàn: Mặc định `--target-db <tên-mới>` (không ghi đè); Chế độ `--in-place` chỉ cho phép khi bật Bảo trì (503), tự tạo `pre-restore` và gõ xác nhận tên DB đích. | **Rủi ro:** Mất trắng dữ liệu khi restore đè lỗi giữa chừng.<br/>**Giải pháp:** Bắt buộc có bản `pre-restore` đã Verify đạt trước khi ghi đè; tự động giữ bảo trì và cung cấp rollback. |
| **Chế độ bảo trì** | Chưa có cờ bảo trì hệ thống. | Bổ sung Chế độ bảo trì (Maintenance Mode): Site trả 503 Service Unavailable view EJS, Admin chặn thao tác ghi trừ Backup/Restore, scheduler dừng. | **Rủi ro:** Người dùng sửa dữ liệu trong lúc restore.<br/>**Giải pháp:** Chặn ghi cấp middleware tại router admin và trả 503 tại site công khai. |
| **Toàn vẹn sau restore** | Chưa có. | Hậu kiểm tra tự động: Rebuild indexes, kiểm tra phả hệ cây (0 mồ côi), đối chiếu manifest media với Cloudinary, flush cache site, hủy toàn bộ sessions. | **Rủi ro:** Dữ liệu phục hồi bị thiếu index hoặc hỏng liên kết.<br/>**Giải pháp:** Chạy migration còn thiếu, kiểm tra toàn vẹn trước khi thoát chế độ bảo trì. |
| **Lập lịch & Retention** | Chưa có. | Scheduler chạy định kỳ ban đêm (02:00); Retention policy giữ 7 bản gần nhất / 30 ngày; quy tắc vàng không bao giờ xóa bản duy nhất. | **Rủi ro:** Tự động xóa nhầm bản backup quan trọng.<br/>**Giải pháp:** Kiểm tra Verify bản giữ lại trước khi prune; chặn xóa bản duy nhất và bản `pre-restore` gần nhất. |
| **Giao diện & CLI** | Chưa có. | Tile mới **Backup & Restore** trên Launchpad mở `/admin/backups`; Bộ công cụ CLI đầy đủ: `backup:create`, `backup:list`, `backup:verify`, `backup:restore`, `backup:prune`. | **Rủi ro:** Lộ đường dẫn đĩa hoặc path traversal.<br/>**Giải pháp:** Whitelist regex cho `backupId`, kiểm tra `path.resolve` trong `BACKUP_DIR`, API không trả đường dẫn tuyệt đối. |

---

## 3. Mục tiêu Giai đoạn K1
Xây dựng một giải pháp Sao lưu và Phục hồi cơ sở dữ liệu chuyên nghiệp chuẩn Enterprise:
1. Đảm bảo an toàn dữ liệu 100% trước mọi sự cố phần cứng, lỗi phần mềm hoặc thao tác nhầm của con người.
2. Cung cấp cả giao diện người dùng trực quan trên Launchpad và công cụ dòng lệnh (CLI) độc lập hoạt động được ngay cả khi web server tắt.
3. Bảo vệ an toàn dữ liệu với cơ chế mã hóa AES-256-GCM và kiểm tra toàn vẹn mã băm SHA-256.
4. Triển khai Chế độ bảo trì chuẩn (HTTP 503) bảo vệ website công khai trong quá trình nâng cấp hoặc phục hồi.
5. Kiểm soát quyền nghiêm ngặt qua `canPerform` trên node gốc `/root` và ghi vết toàn diện qua Audit Log & EventBus.

---

## 4. Phạm vi Thực hiện

### 4.1. Những việc LÀM
- **Mô hình Dữ liệu & Storage:**
  - `src/models/BackupJob.js`: Quản lý tiến trình sao lưu/phục hồi, trạng thái, khóa `lockToken`, thống kê và kích thước.
  - `src/services/backup/BackupStorage.js`: Giao diện trừu tượng hóa lưu trữ (Abstract Storage Interface), phiên bản đầu tiên cài đặt `LocalStorageProvider` ghi đĩa tại `BACKUP_DIR` theo cấu trúc `YYYY/MM/<backupId>`.
  - Hỗ trợ mã hóa đối xứng AES-256-GCM với khóa từ `BACKUP_ENCRYPTION_KEY` và tính toán checksum SHA-256 cho từng file.
- **Động cơ Sao lưu (Dual Backup Engine):**
  - `src/services/backup/MongodumpEngine.js`: Sử dụng lệnh nhị phân `mongodump` với các cờ `--archive`, `--gzip` trích xuất đồng thời Master và Web collections.
  - `src/services/backup/NdjsonEngine.js`: Fallback stream từng collection qua MongoDB Node.js Driver sang định dạng Extended JSON (NDJSON) nén Gzip, bảo toàn kiểu BSON (`ObjectId`, `Date`, `Long`).
  - Trích xuất `manifest.json` và `media-manifest.json` (metadata Cloudinary từ item media).
  - Loại trừ mặc định: collection `sessions`, bộ đếm cache. Cho phép tùy chọn bỏ `audit_logs` và `publish_histories`.
- **Động cơ Phục hồi (Safe Restore Engine):**
  - Chế độ 1: Khôi phục vào database mới (`--target-db <tên-mới>`) để đối chiếu và kiểm tra an toàn.
  - Chế độ 2: Khôi phục đè trực tiếp (`--in-place`), yêu cầu bắt buộc:
    - Bật Chế độ bảo trì.
    - Tự động tạo bản backup an toàn `pre-restore` và Verify thành công.
    - Xác nhận đúng tên database đích (`confirmDbName`).
    - Có bước chạy thử `--dry-run`.
  - Hậu kiểm tra tự động sau restore:
    - `syncIndexes()` cho toàn bộ collections.
    - Kiểm tra phả hệ cây (`orphanCount === 0`, tính hợp lệ của `parentId` và `ancestors`).
    - Đối chiếu media manifest với Cloudinary và báo cáo asset thiếu.
    - Xóa sạch render cache site (`siteCache.flush()`).
    - Hủy toàn bộ sessions bắt buộc đăng nhập lại.
- **Chế độ Bảo trì (Maintenance Mode):**
  - Cờ cấu hình trong collection `settings` + biến môi trường `MAINTENANCE_MODE=true`.
  - Middleware `maintenanceMiddleware`: Site công khai trả về HTTP 503 với view EJS `src/views/site/errors/503.ejs` kèm header `Retry-After: 300`.
  - Admin CMS chặn toàn bộ thao tác ghi, hiển thị banner cảnh báo bảo trì màu vàng nổi bật, chỉ cho phép màn hình Backup & Restore và Login của Admin.
  - Tạm dừng Publish Scheduler.
  - CLI: `npm run maintenance:on` và `npm run maintenance:off`.
- **Lập lịch & Retention:**
  - Bộ scheduler nội bộ chạy định kỳ ban đêm (02:00) tự động sao lưu.
  - Chính sách retention: duy trì $N$ bản gần nhất (`BACKUP_RETENTION_COUNT`, mặc định 7 bản) và số ngày tối đa (`BACKUP_RETENTION_DAYS`, mặc định 30 ngày).
  - Kiểm tra Verify bản giữ lại trước khi prune; chặn xóa bản duy nhất còn lại và bản `pre-restore` gần nhất.
- **Giao diện & Launchpad:**
  - Bổ sung ứng dụng **Backup & Restore** vào Launchpad (nhóm Control Panel).
  - Giao diện quản trị `/admin/backups` và các modal thao tác (Tạo backup, Verify, Tải về, Phục hồi nhiều bước với Wizard & Dry-run, Cài đặt Retention).
  - Tuyệt đối không dùng `alert/confirm` native, sử dụng modal hệ thống và Toast chuẩn Tabler.
- **Bộ Công cụ Dòng lệnh CLI:**
  - `npm run backup:create`
  - `npm run backup:list`
  - `npm run backup:verify -- <backupId>`
  - `npm run backup:restore -- <backupId> --target-db <tên-mới> [--dry-run]`
  - `npm run backup:restore -- <backupId> --in-place [--dry-run]`
  - `npm run backup:prune [--dry-run]`
- **Bảo mật & Quyền:**
  - Kiểm soát quyền chặt chẽ qua `canPerform(user, ROOT_PATH, action)`: `backup:read`, `backup:create`, `backup:download`, `backup:restore`, `backup:delete`, `backup:settings`.
  - Chống Path Traversal: Whitelist regex cho `backupId`, kiểm tra `path.resolve` trong `BACKUP_DIR`.
  - API tuyệt đối không trả về đường dẫn vật lý trên đĩa máy chủ hoặc khóa bí mật.
  - Phát sự kiện qua `eventBus` cho Audit Log.

### 4.2. Những việc KHÔNG LÀM
- Không làm Incremental Backup hay Point-in-time recovery (giữ ở phạm vi Full Backup).
- Không sao chép các tệp tin nhị phân của Cloudinary (chỉ sao lưu manifest metadata).
- Không sao lưu file cấu hình `.env` hay API Secret bên thứ ba.
- Không tích hợp kho lưu trữ ngoài AWS S3 trong giai đoạn này (chỉ thiết kế kiến trúc trừu tượng `BackupStorage` sẵn sàng mở rộng).
- Không cài thêm thư viện npm ngoài danh mục đã được phê duyệt trong `02-tech-stack.md` khi chưa hỏi ý kiến.

---

## 5. Checklist Chi tiết Công việc (Tasks)

- [x] **Task K1.1:** Xây dựng Mongoose Model `BackupJob` (`src/models/BackupJob.js`) quản lý tiến trình sao lưu/phục hồi, trạng thái, khóa phân tán, dung lượng và lỗi.
- [x] **Task K1.2:** Xây dựng lớp trừu tượng `BackupStorage` và cài đặt `LocalStorageProvider` (`src/services/backup/LocalStorageProvider.js`) quản lý tệp tin gói backup tại `BACKUP_DIR`, phân giải an toàn chống Path Traversal.
- [x] **Task K1.3:** Xây dựng module mã hóa `backupCrypto.js` (`src/services/backup/backupCrypto.js`) hỗ trợ mã hóa/giải mã AES-256-GCM và tính toán mã băm SHA-256 cho từng file.
- [x] **Task K1.4:** Xây dựng động cơ trích xuất dữ liệu đa tầng (`MongodumpEngine.js` và `NdjsonEngine.js` fallback) hỗ trợ stream nén Gzip, bảo toàn kiểu BSON, trích xuất `manifest.json` và `media-manifest.json`.
- [x] **Task K1.5:** Xây dựng dịch vụ quản lý Chế độ Bảo trì `maintenanceService.js` (`src/services/maintenanceService.js`) và middleware `maintenanceMiddleware.js`, view thông báo `src/views/site/errors/503.ejs`.
- [x] **Task K1.6:** Xây dựng động cơ phục hồi dữ liệu `restoreEngine.js` (`src/services/backup/restoreEngine.js`) hỗ trợ 2 chế độ (`--target-db` và `--in-place` có `pre-restore` bắt buộc, `--dry-run`), kiểm tra tính tương thích phiên bản schema.
- [x] **Task K1.7:** Xây dựng module hậu kiểm tra toàn vẹn sau phục hồi `postRestoreVerifier.js` (rebuild indexes, verify tree hierarchy, check media manifest with Cloudinary, flush cache, invalidate sessions).
- [x] **Task K1.8:** Xây dựng dịch vụ tổng thể `backupService.js` (`src/services/backupService.js`) tích hợp create, list, verify, restore, delete, download stream, scheduler tự động và retention policy (prune).
- [x] **Task K1.9:** Tích hợp kiểm soát quyền truy cập qua `canPerform` trên node gốc `/root` và phát sự kiện `eventBus` tích hợp Audit Log.
- [x] **Task K1.10:** Xây dựng Controller `backupController.js` và các tuyến đường HTTP Full Page, Partial Modal và REST API JSON:
  - `GET /admin/backups`
  - `GET /api/backups`
  - `POST /api/backups` (tạo backup thủ công)
  - `GET /api/backups/:id`
  - `POST /api/backups/:id/verify`
  - `GET /api/backups/:id/download`
  - `POST /api/backups/:id/restore` (kèm `confirmDbName`, `mode`, `dryRun`)
  - `DELETE /api/backups/:id`
  - `GET/PUT /api/backups/settings`
  - `POST /api/maintenance` (bật/tắt bảo trì)
- [x] **Task K1.11:** Xây dựng giao diện EJS quản trị Backup & Restore:
  - Trang chính `src/views/admin/backup/index.ejs`.
  - Modal tạo backup `create-modal.ejs`.
  - Modal khôi phục đa bước (Restore Wizard & Dry-run) `restore-modal.ejs`.
  - Modal cấu hình Retention & Schedule `settings-modal.ejs`.
  - Script client `public/js/admin/backup-manager.js`.
  - Cập nhật Launchpad seed tile trong `src/scripts/seed-initial-data.js` và `launchpadController.js`.
- [x] **Task K1.12:** Xây dựng bộ công cụ dòng lệnh độc lập (CLI Scripts):
  - `src/scripts/backup-cli.js` (`npm run backup:create`, `backup:list`, `backup:verify`, `backup:restore`, `backup:prune`).
  - `src/scripts/maintenance-cli.js` (`npm run maintenance:on`, `maintenance:off`).
- [x] **Task K1.13:** Xây dựng bộ kiểm thử tự động toàn diện (Jest + Supertest):
  - `tests/backupCrypto.test.js`: Kiểm tra mã hóa AES-256-GCM, giải mã, sai khóa bị từ chối, tính checksum SHA-256.
  - `tests/backupService.test.js`: Tạo backup đủ collection, manifest, kiểm tra loại trừ sessions, giữ kiểu BSON, retention policy, verify phát hiện file bị sửa.
  - `tests/restoreEngine.test.js`: Restore sang DB mới, restore in-place bị từ chối khi thiếu bảo trì/xác nhận, pre-restore backup, dry-run, rollback khi lỗi.
  - `tests/maintenanceMode.test.js`: Site trả 503, admin chặn thao tác ghi, bypass cho màn hình backup.
  - `tests/backupApi.test.js`: Kiểm tra phân quyền `canPerform`, download stream, bảo vệ path traversal, CSRF.
- [x] **Task K1.14:** Soạn thảo tài liệu hướng dẫn vận hành và quy trình khôi phục thảm họa khẩn cấp từng bước: `docs/guides/backup-restore.md`.
- [x] **Task K1.15:** Cập nhật bảng định tuyến `docs/rules/04-routing.md` và bảo mật `docs/rules/05-security.md`.

---

## 6. Tiêu chí Hoàn thành (Definition of Done - DoD)
- [x] Tạo được bản sao lưu Master và Web từ giao diện và CLI; `manifest.json` đầy đủ số bản ghi và SHA-256 checksum; Verify kiểm tra đạt chuẩn.
- [x] Khôi phục được sang database mới (`--target-db <tên-mới>`) bảo toàn 100% dữ liệu và đối soát được với database gốc.
- [x] Khôi phục đè trực tiếp (`--in-place`) chỉ chạy khi bật chế độ bảo trì, có bản `pre-restore` tự động và người dùng xác nhận đúng tên DB đích; có `--dry-run`.
- [x] Nếu restore thất bại giữa chừng, hệ thống tự động giữ chế độ bảo trì hoặc rollback an toàn, không để database ở trạng thái nửa vời.
- [x] Hậu phục hồi tự động chạy: sync indexes, kiểm tra phả hệ cây (0 mồ côi), báo cáo asset Cloudinary thiếu, flush cache site, hủy sessions bắt buộc đăng nhập lại.
- [x] Chế độ bảo trì hoạt động chuẩn xác: Site công khai trả về HTTP 503 view EJS, Admin chặn toàn bộ thao tác ghi trừ phân vùng Backup & Restore.
- [x] Bộ lập lịch tự động và retention hoạt động đúng: duy trì $N$ bản gần nhất, không bao giờ xóa bản duy nhất còn lại.
- [x] Bảo mật tuyệt đối: Không rò rỉ khóa mã hóa, không lộ đường dẫn vật lý trên server, chống Path Traversal, không có role cứng, kiểm soát qua `canPerform`.
- [x] Toàn bộ test suites (bao gồm regression tests cũ) đều chạy XANH (PASS 100%).
- [x] `npm run check:branding` vượt qua kiểm tra, không còn sót từ khóa cấm.
- [x] Soạn thảo báo cáo nghiệm thu giai đoạn `docs/reports/phase-K1-report.md`.
- [x] **Tuyệt đối không có commit nào được tạo** trong quá trình thực hiện.

