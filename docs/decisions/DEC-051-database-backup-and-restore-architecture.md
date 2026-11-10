# DEC-051: Kiến Trúc Sao Lưu & Phục Hồi Cơ Sở Dữ Liệu Toàn Diện (Database Backup & Restore Architecture)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày quyết định:** 2026-11-10
- **Phạm vi:** GĐ K1, Backup, Restore, Disaster Recovery, Maintenance Mode, Security
- **Người đề xuất:** Antigravity Tech Lead
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề
Hệ thống Treecraft CMS vận hành mô hình dữ liệu hai kho lưu trữ tách biệt Master Database (`items_master`) và Web Database (`items_web`), kết hợp với tài nguyên ảnh/tệp tin trên Cloudinary, hệ thống phân quyền chi tiết Item-level ACL, Audit Log, và luồng công việc Workflow/Publish.

Trước GĐ K1, hệ thống đã có tính năng **Serialization (GĐ 11)** phục vụ việc xuất/nhập nội dung logic dạng JSON đa phân vùng giữa các môi trường phát triển. Tuy nhiên, Serialization không thể thay thế cho giải pháp **Sao lưu và Khôi phục Thảm họa (Disaster Recovery & Full Database Backup)** bởi vì:
1. Serialization chỉ trích xuất các item nội dung, không sao lưu toàn diện trạng thái kỹ thuật (indexes, ACL rules, users, roles, settings, publish jobs/histories, audit logs).
2. Khi xảy ra sự cố hỏng hóc cơ sở dữ liệu vật lý hoặc cần rollback khẩn cấp sau sự cố vận hành, hệ thống cần bản sao lưu nhị phân/BSON nguyên bản có thể phục hồi nhanh chóng và toàn vẹn 100%.
3. Việc phục hồi (Restore) đè trực tiếp lên cơ sở dữ liệu đang hoạt động tiềm ẩn rủi ro phá hủy dữ liệu nghiêm trọng nếu không có chế độ bảo trì, sao lưu an toàn trước khi ghi đè (`pre-restore`), và kiểm tra tính toàn vẹn đa lớp.

---

## 2. Quyết định Kỹ thuật

### 2.1. Phạm vi Dữ liệu & Cấu trúc Gói Sao Lưu Tự Mô tả
Mỗi bản sao lưu là một gói lưu trữ tự mô tả (Self-describing archive) lưu tại thư mục cấu hình qua biến môi trường `BACKUP_DIR` (mặc định ngoài web root: `./storage/backups/YYYY/MM/<backupId>/`), tuyệt đối không nằm trong thư mục tĩnh công khai `public/`.

Cấu trúc thư mục gói sao lưu:
- `manifest.json`: Chứa định danh `backupId`, thời điểm tạo (`createdAt`), phiên bản CMS (`appVersion`), schema/migration version cuối, thương hiệu (`PROJECT_NAME: 'Treecraft'`, `ROOT_PATH: '/root'`), loại backup (`full`, `pre-restore`, `master-only`, `web-only`), danh sách các collection kèm số bản ghi và checksum SHA-256 độc lập cho từng file, dung lượng thô, trạng thái mã hóa (`isEncrypted`), người thực hiện (`initiatedBy`).
- `media-manifest.json`: Bản lược kê tài nguyên Cloudinary (`publicId`, `assetId`, `format`, `bytes`, `etag`, `url`) trích xuất từ các item media trong CMS. **Không sao chép file nhị phân của Cloudinary**, chỉ lưu manifest phục vụ đối chiếu và phát hiện asset thiếu khi khôi phục.
- Dữ liệu cơ sở dữ liệu (`data/`):
  - Chứa bản dump của Master Database và Web Database.
  - Loại trừ mặc định: collection `sessions` (phiên đăng nhập tạm thời) và các bộ đếm rate-limit/cache tạm.
  - Cho phép người dùng tùy chọn loại trừ `audit_logs` và `publish_histories` khi tạo backup thủ công để tối ưu dung lượng.
  - Dữ liệu nhạy cảm nội tại (hash mật khẩu bcrypt trong `users`, hash Basic Auth trong `settings`) được bảo vệ nghiêm ngặt bằng cơ chế mã hóa gói archive. Tuyệt đối không sao lưu file cấu hình `.env` hay API Secret của Cloudinary.

### 2.2. Động cơ Sao Lưu Đa Tầng (Dual-Engine Backup: mongodump & Streamed NDJSON Fallback)
Hệ thống triển khai 2 tầng động cơ trích xuất:
1. **Động cơ ưu tiên (Native Binary Engine):** Sử dụng công cụ chuẩn `mongodump` (`--archive --gzip`) nếu phát hiện nhị phân trên máy chủ (đường dẫn cấu hình qua `MONGODUMP_PATH`, mặc định `/opt/homebrew/bin/mongodump` hoặc `/usr/bin/mongodump`). Đảm bảo tốc độ tối đa và bảo toàn 100% định dạng BSON nhị phân.
2. **Động cơ dự phòng (Driver-based NDJSON Stream Engine):** Nếu máy chủ không cài `mongodump`, hệ thống tự động fallback sang cơ chế stream trực tiếp từ MongoDB Node.js Driver. Từng collection được trích xuất dạng dòng JSON mở rộng (MongoDB Extended JSON / NDJSON) nén Gzip, bảo toàn đầy đủ kiểu dữ liệu BSON (`ObjectId`, `Date`, `Long`, `Map`) và **không đọc toàn bộ collection vào RAM** để tránh tràn bộ nhớ Node.js (OOM).

### 2.3. Tính Nhất quán Dữ liệu & Cơ chế Khóa Chống Xung đột
- **Phát hiện Replica Set:** MongoDB Atlas đang vận hành mô hình Replica Set. Động cơ sao lưu kích hoạt Read Preference `secondaryPreferred` hoặc tận dụng Mongo Client Session với Causal Consistency để đảm bảo tính nhất quán của bản chụp dữ liệu (Point-in-Time Snapshot) mà không gây nghẽn Primary.
- **Khóa chống xung đột:** Tuyệt đối không thực thi sao lưu khi có tác vụ xuất bản (`publishJobs`) đang ở trạng thái `Processing` hoặc `Pending`. Trước khi backup, hệ thống kiểm tra và tạm dừng job queue xuất bản. Cơ chế khóa phân tán `BackupJob` dựa trên `lockToken` và `lockedAt` tương tự kiến trúc GĐ 8 ngăn chặn việc kích hoạt đồng thời 2 tiến trình sao lưu hoặc phục hồi.

### 2.4. Mã Hóa An Toàn (AES-256-GCM) & Kiểm Tra Toàn Vẹn SHA-256
- **Mã hóa:** Toàn bộ file archive dữ liệu được mã hóa bằng thuật toán đối xứng tiêu chuẩn **AES-256-GCM** với khóa 256-bit trích xuất từ biến môi trường `BACKUP_ENCRYPTION_KEY`. Khóa mã hóa tuyệt đối không lưu kèm trong gói backup. Nếu hệ thống chưa cấu hình khóa, sẽ có cảnh báo rõ ràng khi tạo bản sao lưu không mã hóa.
- **Toàn vẹn:** Tính toán mã băm SHA-256 cho từng tệp thành phần và ghi nhận vào `manifest.json`. Hệ thống cung cấp lệnh/nút **Verify** để kiểm tra lại tính toàn vẹn (Checksum matching) và khả năng giải nén/đọc thử của gói backup trước khi cho phép phục hồi.

### 2.5. Chế Độ Bảo Trì (Maintenance Mode)
Chế độ bảo trì được quản lý tập trung qua cờ cấu hình trong collection `settings` kết hợp biến môi trường ghi đè khẩn cấp `MAINTENANCE_MODE=true`:
- **Website Công Khai (Public Site):** Trả về HTTP 503 Service Unavailable với giao diện thân thiện `src/views/site/errors/503.ejs` kèm header chuẩn `Retry-After: 300`.
- **Phân Vùng Quản Trị (Admin CMS):** Chặn toàn bộ thao tác ghi (Write actions) trên toàn hệ thống. Chỉ cho phép các màn hình kiểm soát Backup/Restore và Login của Administrator.
- **Tiến trình ngầm:** Tạm dừng toàn bộ Publish Scheduler và các công việc chạy nền.
- Cung cấp CLI khẩn cấp: `npm run maintenance:on` và `npm run maintenance:off`.

### 2.6. Nguyên Tắc Phục Hồi An Toàn (Safe Restore - Risk Mitigation)
Phục hồi cơ sở dữ liệu là tác vụ có rủi ro cao nhất trong vòng đời vận hành. Hệ thống thiết lập hàng rào bảo vệ 4 lớp:
1. **Mặc định an toàn (Non-destructive Default):**
   - Chế độ khuyến nghị: `--target-db <tên-mới>`. Dữ liệu được khôi phục sang một database hoàn toàn mới để quản trị viên kiểm tra, so sánh dữ liệu qua màn hình Database Switcher/Diff trước khi quyết định chuyển đổi.
2. **Khôi phục đè trực tiếp (`--in-place`):**
   - Chỉ được phép thực hiện khi đáp ứng **toàn bộ** các điều kiện tiên quyết:
     - Hệ thống đang ở chế độ bảo trì (Maintenance Mode = ON).
     - Tự động tạo bản sao lưu an toàn `pre-restore` của database hiện tại và bản này phải được Verify đạt chuẩn trước khi chạm vào dữ liệu.
     - Quản trị viên phải xác nhận bằng cách **nhập chính xác tên database đích** (`confirmDbName`) trên giao diện hoặc CLI; có bước `--dry-run` liệt kê chi tiết số collection và bản ghi sẽ bị thay thế.
     - Người thực hiện có quyền tối cao `backup:restore`.
3. **Kiểm tra tương thích trước khi phục hồi:**
   - Phiên bản ứng dụng của bản backup phải $\le$ phiên bản hiện tại của CMS (từ chối hạ cấp - downgrade). Nếu bản backup có phiên bản schema cũ hơn, hệ thống tự động chạy các script migration còn thiếu sau khi phục hồi.
   - Kiểm tra mã băm SHA-256 và giải mã thành công bằng `BACKUP_ENCRYPTION_KEY`.
   - Kiểm tra dung lượng đĩa trống khả dụng.
4. **Hậu kiểm tra toàn vẹn sau phục hồi (Post-restore Integrity Check):**
   - Tái tạo toàn bộ indexes (`syncIndexes`) cho mọi collection.
   - Kiểm tra tính toàn vẹn phả hệ cây: mọi `parentId` đều hợp lệ, không có item mồ côi (`orphanCount === 0`), số lượng item khớp với `manifest.json`, các liên kết template, componentTemplate, layout đều tồn tại.
   - Đối chiếu danh sách media với Cloudinary qua `media-manifest.json` và xuất báo cáo các asset bị thiếu (nếu có).
   - Xóa sạch bộ đếm in-memory cache của site công khai (`siteCache.flush()`).
   - Hủy toàn bộ sessions hiện hành trong collection `sessions` để bắt buộc mọi phiên đăng nhập lại từ đầu.
   - Chỉ tự động thoát chế độ bảo trì nếu toàn bộ bài kiểm tra hậu phục hồi đạt kết quả xanh (PASS). Nếu có bất kỳ lỗi nào, hệ thống **tiếp tục giữ nguyên chế độ bảo trì**, thông báo chi tiết lỗi và hướng dẫn rollback nhanh về bản `pre-restore`.

### 2.7. Quản Lý Lưu Trữ, Hạn Định & Lập Lịch Tự Động (Retention & Scheduling)
- **Retention Policy:** Duy trì $N$ bản sao lưu gần nhất (`BACKUP_RETENTION_COUNT`, mặc định 7 bản) và thời hạn lưu trữ tối đa (`BACKUP_RETENTION_DAYS`, mặc định 30 ngày).
- **Quy tắc Vàng Retention:** **Tuyệt đối không bao giờ xóa bản sao lưu duy nhất còn lại** của hệ thống, và không xóa bản backup đang được đánh dấu làm `pre-restore` gần nhất. Tiến trình prune chỉ xóa các bản cũ sau khi đã Verify thành công các bản lưu giữ mới hơn.
- **Bộ Lập Lịch Tự Động:** Tái sử dụng cơ chế Interval Scheduler nội bộ (tương tự `publishService`, không cài thêm thư viện bên ngoài) để kích hoạt backup định kỳ vào ban đêm (mặc định 02:00 sáng).

### 2.8. Phân Quyền, Bảo Mật API & Phòng Chống Path Traversal
- **Kiểm soát quyền qua `canPerform`:** Toàn bộ thao tác backup/restore được phân quyền qua hàm chuẩn `canPerform(user, ROOT_PATH, action)`:
  - `backup:read`: Xem danh sách bản sao lưu và thông tin chi tiết.
  - `backup:create`: Khởi tạo bản sao lưu mới.
  - `backup:download`: Tải gói sao lưu về máy cá nhân (chỉ cho phép khi bản backup đã được mã hóa hoặc có xác nhận bổ sung).
  - `backup:restore`: Quyền tối cao thực thi phục hồi dữ liệu.
  - `backup:delete`: Xóa bản sao lưu cũ.
  - `backup:settings`: Cấu hình lịch trình tự động và chính sách retention.
  - Tuyệt đối cấm viết cứng tên role (No hard-coded roles). Mặc định gán các quyền này cho Administrator.
- **Phòng chống Path Traversal:** Tham số `backupId` được kiểm tra chặt chẽ theo biểu thức chính quy `^[a-zA-Z0-9_-]+$`. Đường dẫn tệp tin trên đĩa được phân giải qua `path.resolve` và kiểm tra nghiêm ngặt `resolvedPath.startsWith(BACKUP_DIR)`. API tuyệt đối không trả về đường dẫn vật lý thực tế trên máy chủ.
- **Kiểm toán & Sự kiện (Audit Log & EventBus):** Phát các sự kiện `backup.created`, `backup.verified`, `backup.failed`, `backup.deleted`, `restore.started`, `restore.finished`, `restore.failed`, `maintenance.on`, `maintenance.off` qua `eventBus` tập trung để ghi nhận vào Audit Log. Tuyệt đối không log thông tin khóa mã hóa hay dữ liệu bí mật.

---

## 3. Hậu quả & Đánh giá

### 3.1. Điểm Tích Cực
- Hoàn thiện mảnh ghép cuối cùng về năng lực vận hành Enterprise cho Treecraft CMS: Khả năng khôi phục sau thảm họa (Disaster Recovery).
- An toàn tối đa với cơ chế phục hồi không ghi đè mặc định (`--target-db`), khóa an toàn `pre-restore`, và chế độ bảo trì 503.
- Bảo toàn trọn vẹn kiểu dữ liệu BSON (`ObjectId`, `Date`, `Long`) ngay cả khi chạy trên môi trường không có sẵn tiện ích dòng lệnh `mongodump`.
- Cơ chế mã hóa AES-256-GCM bảo vệ an toàn dữ liệu người dùng khi sao lưu hoặc tải về.

### 3.2. Điểm Cần Lưu Ý
- Bản đầu tiên tập trung hoàn hảo cho cơ chế Full Backup; các cơ chế nâng cao như Incremental Backup hoặc Point-in-time Recovery sẽ được xem xét ở các giai đoạn sau nếu quy mô dữ liệu vượt ngưỡng hàng trăm Gigabytes.
- Tệp tin media trên Cloudinary không sao chép vật lý vào file dump mà dựa vào manifest để kiểm toán toàn vẹn. Quản trị viên cần duy trì tài khoản Cloudinary an toàn.

