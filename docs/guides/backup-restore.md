# HƯỚNG DẪN VẬN HÀNH SAO LƯU & KHÔI PHỤC THẢM HỌA (DISASTER RECOVERY RUNBOOK)

> **Dự án:** Treecraft CMS  
> **Giai đoạn:** GĐ K1 (DEC-051)  
> **Phiên bản tài liệu:** v1.0.0  

---

## 1. TỔNG QUAN HỆ THỐNG SAO LƯU & PHỤC HỒI

Hệ thống sao lưu và phục hồi dữ liệu Treecraft CMS được thiết kế nhằm bảo đảm an toàn dữ liệu tuyệt đối theo kiến trúc **Dual-Engine** và các quy tắc phòng thủ rủi ro thảm họa:
- **Động cơ trích xuất dữ liệu:**
  1. *Mongodump Engine (Ưu tiên số 1):* Sử dụng trực tiếp binary hệ thống `mongodump` & `mongorestore` với cờ nén trực tiếp `--archive --gzip`, tối ưu hóa hiệu năng và dung lượng.
  2. *Ndjson Engine (Fallback):* Động cơ stream dữ liệu dòng nén Gzip thuần Node.js, sử dụng BSON Extended JSON (`mongodb/bson`) bảo toàn 100% kiểu dữ liệu nguyên bản (`ObjectId`, `Date`, `Long`), không bao giờ gây tràn bộ nhớ RAM (OOM).
- **Mã hóa an toàn:** Hỗ trợ mã hóa dữ liệu archive bằng thuật toán **AES-256-GCM** với khóa bí mật `BACKUP_ENCRYPTION_KEY`.
- **Toàn vẹn dữ liệu:** Tự động tính toán và lưu trữ mã băm **SHA-256** cho từng file trong `manifest.json`.
- **Chế độ bảo trì:** Cơ chế chuyển mạch cấp phát **HTTP 503 Service Unavailable** đi kèm header `Retry-After: 300` cho Website công khai và tạm khóa toàn bộ thao tác ghi trên Admin CMS.
- **Quy tắc an toàn phục hồi (Restore Guard):**
  - Khôi phục sang DB mới (`--target-db`): Chế độ an toàn mặc định để kiểm tra và đối chiếu.
  - Khôi phục đè trực tiếp (`--in-place`): Bắt buộc hệ thống phải ở Chế độ Bảo trì, tự động tạo bản sao lưu an toàn `pre-restore` trước khi ghi đè, và yêu cầu người dùng gõ xác nhận chính xác tên DB đích.

---

## 2. QUY TRÌNH SAO LƯU DỮ LIỆU ĐỊNH KỲ

### 2.1. Sao lưu tự động qua Scheduler ngầm (Cron nội bộ)
Hệ thống Treecraft CMS tích hợp sẵn trình lập lịch sao lưu nội bộ chạy ngầm (trong `src/server.js`):
- **Thời gian chạy:** Tự động kiểm tra và khởi chạy vào lúc **02:00 sáng hàng ngày**.
- **Chính sách lưu trữ (Retention):** Giữ lại $N$ bản sao lưu mới nhất (mặc định `BACKUP_RETENTION_COUNT=7`) và thời hạn lưu giữ (mặc định `BACKUP_RETENTION_DAYS=30`).
- **Quy tắc vàng:** Không bao giờ xóa bản sao lưu duy nhất còn lại và không bao giờ xóa bản `pre-restore` an toàn gần nhất.

### 2.2. Tạo sao lưu thủ công từ Giao diện Admin
1. Đăng nhập vào Admin CMS với tài khoản có quyền `backup:create` (hoặc `Administrator`).
2. Mở ứng dụng **Backup & Restore** từ Launchpad (nhóm *Control Panel & Maintenance*) hoặc truy cập trực tiếp `/admin/backups`.
3. Nhấn nút **Tạo Bản Sao Lưu** ở góc phải trên.
4. Nhập ghi chú (ví dụ: `Sao lưu trước khi cập nhật dữ liệu Q4`), chọn Động cơ và nhấn **Bắt đầu Sao Lưu**.
5. Sau khi hoàn tất, bản sao lưu sẽ xuất hiện trên bảng danh sách đi kèm mã băm SHA-256.

### 2.3. Tạo sao lưu qua Dòng lệnh (CLI)
Trên máy chủ, chạy lệnh:
```bash
npm run backup:create -- --note "Sao lưu thủ công qua CLI"
```
Kiểm tra danh sách bản sao lưu:
```bash
npm run backup:list
```
Kiểm tra tính toàn vẹn của bản sao lưu:
```bash
npm run backup:verify <backupId>
```

---

## 3. QUY TRÌNH PHỤC HỒI DỮ LIỆU THẢM HỌA (DISASTER RECOVERY)

### KỊCH BẢN A: Khôi phục vào Database Mới để Kiểm Tra / Đối Chiếu (Khuyến nghị)
Sử dụng khi cần kiểm tra dữ liệu cũ, cứu vãn một số bài viết hoặc đối soát mà không làm gián đoạn website đang chạy:

1. **Từ Giao diện Admin:**
   - Trên dòng bản sao lưu cần khôi phục, nhấn icon **Khôi phục (Rotate icon)**.
   - Chọn phương thức: **Khôi phục sang Database Mới (Recommended)**.
   - Nhập tên Database đích (ví dụ: `admin_cms_preview_20261110`).
   - (Tùy chọn) Nhấn **Kiểm tra mô phỏng (Dry Run)** để xem trước số collections và records.
   - Nhấn **Bắt đầu Khôi Phục**.

2. **Từ Dòng lệnh (CLI):**
   ```bash
   npm run backup:restore <backupId> -- --mode target-db --target-db admin_cms_preview_20261110
   ```

---

### KỊCH BẢN B: Khôi phục ĐÈ TRỰC TIẾP Database Đang Chạy (In-Place Emergency Recovery)
Sử dụng khi cơ sở dữ liệu production bị lỗi nghiêm trọng, hỏng dữ liệu hoặc bị tấn công cần đưa toàn bộ hệ thống về một mốc thời gian an toàn.

#### BƯỚC 1: Kích hoạt Chế độ Bảo trì (Maintenance Mode)
- **Cách 1 (Từ Giao diện):** Nhấn nút **Bật Chế Độ Bảo Trì** ở thanh công cụ `/admin/backups`.
- **Cách 2 (Từ CLI):**
  ```bash
  npm run maintenance:on -- --reason "Bảo trì khôi phục khẩn cấp cơ sở dữ liệu"
  ```
- **Xác minh:** Truy cập trang chủ website công khai `http://localhost:4000/`. Trình duyệt phải hiển thị trang lỗi 503 có dòng chữ *"Hệ thống đang bảo trì"* và tiêu đề HTTP 503.

#### BƯỚC 2: Kiểm tra mô phỏng (Dry-Run)
Chạy thử kiểm tra tương thích trước khi ghi đè:
```bash
npm run backup:restore <backupId> -- --mode in-place --confirm-db-name admin_cms --dry-run
```

#### BƯỚC 3: Thực hiện Khôi phục In-Place
- **Cách 1 (Từ Giao diện):**
  - Mở modal Restore của bản sao lưu.
  - Chọn **Khôi phục ĐÈ TRỰC TIẾP Database Đang Chạy (In-Place)**.
  - Hệ thống kiểm tra điều kiện bảo trì.
  - Gõ chính xác tên database đang chạy vào ô xác nhận (ví dụ: `admin_cms`).
  - Nhấn **Bắt đầu Khôi Phục**.
- **Cách 2 (Từ CLI):**
  ```bash
  npm run backup:restore <backupId> -- --mode in-place --confirm-db-name admin_cms
  ```

> [!NOTE]
> Hệ thống sẽ **tự động tạo một bản sao lưu an toàn `pre-restore-<timestamp>-<hash>`** của toàn bộ database hiện tại trước khi thực hiện ghi đè. Nếu quá trình ghi đè gặp sự cố, bạn luôn có bản `pre-restore` này để rollback về trạng thái trước đó.

#### BƯỚC 4: Hậu kiểm tra tự động và kết thúc bảo trì
Sau khi restore hoàn tất, hệ thống tự động:
1. Đồng bộ lại toàn bộ MongoDB Indexes trên các collections.
2. Kiểm tra phả hệ cây phân cấp (đảm bảo 0 item mồ côi).
3. Đối chiếu manifest tài sản Media với Cloudinary.
4. Hủy toàn bộ sessions đang đăng nhập để tránh xung đột quyền hạn.
5. Xóa sạch cache kết xuất site công khai.

Tắt Chế độ Bảo trì:
```bash
npm run maintenance:off
```
Đăng nhập lại vào Admin CMS và kiểm tra website hoạt động bình thường.

---

## 4. QUY TRÌNH DỌN DẸP LƯU TRỮ (RETENTION PRUNING)

Kiểm tra mô phỏng các bản sao lưu cũ sẽ bị xóa:
```bash
npm run backup:prune -- --dry-run
```
Thực hiện dọn dẹp thực tế:
```bash
npm run backup:prune -- --count 7 --days 30
```

