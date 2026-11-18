# Hướng Dẫn Vận Hành Sao Lưu & Phục Hồi Dữ Liệu (Backup & Disaster Recovery Runbook)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Áp dụng cho:** Quản trị viên hệ thống (Sysadmin, DevOps) và Lập trình viên

---

## 1. Mục Đích / Khi Nào Sử Dụng
- Hướng dẫn quy trình tạo bản sao lưu dữ liệu toàn diện (Disaster Recovery Backup K1) và khôi phục khi xảy ra sự cố dữ liệu.
- Áp dụng khi:
  - Sao lưu định kỳ tự động hàng ngày lúc 02:00 sáng.
  - Tạo bản sao lưu khẩn cấp trước khi nâng cấp phiên bản Core, cập nhật schema hoặc chạy migration lớn.
  - Khôi phục dữ liệu về thời điểm an toàn sau khi xảy ra lỗi vô ý xóa dữ liệu hoặc hỏng hóc cơ sở dữ liệu.

---

## 2. Điều Kiện Tiên Quyết
- Quyền truy cập vào server hoặc container ứng dụng Treecraft CMS.
- Đối với giao diện Admin: Tài khoản có quyền `backup:create`, `backup:restore` hoặc nhóm `Administrator`.
- Dung lượng ổ đĩa tại thư mục `BACKUP_DIR` (mặc định `data/backups/<env>`) còn trống tối thiểu gấp 3 lần dung lượng database hiện tại.
- Công cụ `mongodump` và `mongorestore` (tùy chọn; nếu không có hệ thống sẽ tự động dùng Ndjson Engine nén Gzip).

---

## 3. Các Bước Thực Hiện (Windows / macOS / Linux)

### Bước 1: Tạo bản sao lưu dữ liệu (Backup)

**Cách A: Qua Dòng lệnh CLI (Khuyến nghị cho SysAdmin/DevOps):**
```bash
# Tạo bản sao lưu với ghi chú mục đích
npm run backup:create -- --note "Sao lưu trước khi bảo trì hệ thống"
```

**Cách B: Qua Giao diện Quản trị Admin CMS:**
1. Mở trang quản trị `/admin/backups` từ Launchpad.
2. Nhấn nút **Tạo Bản Sao Lưu** ở góc phải màn hình.
3. Điền ghi chú và nhấn **Bắt đầu Sao Lưu**.

---

### Bước 2: Kiểm tra danh sách và tính toàn vẹn của bản sao lưu

**Xem danh sách các bản sao lưu hiện có:**
```bash
npm run backup:list
```

**Kiểm tra tính toàn vẹn (Checksum SHA-256):**
```bash
# Thay <backupId> bằng mã backup lấy từ lệnh list, ví dụ: 2026-11-18T06-00-00-000Z
npm run backup:verify <backupId>
```

---

### Bước 3: Phục hồi dữ liệu khi có sự cố (Restore)

**Kịch bản 1: Khôi phục sang Database Mới (An toàn tuyệt đối để đối chiếu):**
```bash
# Khôi phục vào database tạm mà không làm gián đoạn website đang chạy
npm run backup:restore <backupId> -- --target-db treecraft_restored_temp
```

**Kịch bản 2: Khôi phục Đè Trực Tiếp (In-Place Restore - Cực kỳ cẩn trọng):**
```bash
# 1. Bật Chế độ Bảo trì (Maintenance Mode)
npm run maintenance:on

# 2. Thực hiện khôi phục đè trực tiếp (yêu cầu gõ xác nhận đúng tên DB)
npm run backup:restore <backupId> -- --in-place

# 3. Tắt Chế độ Bảo trì sau khi hoàn tất
npm run maintenance:off
```

---

## 4. Kết Quả Mong Đợi
- **Khi tạo sao lưu:** Thư mục bản sao lưu được sinh ra chứa:
  - `manifest.json`: Chứa metadata, thời gian, kích thước, danh sách collection và mã băm SHA-256.
  - Các tệp dữ liệu nén `.gz` (được mã hóa AES-256-GCM nếu cấu hình `BACKUP_ENCRYPTION_KEY`).
  - Terminal in thông báo: `✅ TẠO SAO LƯU THÀNH CÔNG!`.
- **Khi phục hồi:** Toàn bộ collections (`items_master`, `items_web`, `templates`, `roles`, v.v.) được phục hồi nguyên vẹn đúng trạng thái tại thời điểm sao lưu.

---

## 5. Cách Kiểm Tra Xác Nhận
1. **Kiểm tra trạng thái hệ thống sau khi phục hồi:**
   ```bash
   npm run doctor
   ```
2. **Kiểm tra qua cURL:**
   ```bash
   curl -i http://localhost:4000/ready
   ```
   Đảm bảo HTTP 200 OK và `collectionsReady: true`.
3. **Kiểm tra dữ liệu trên giao diện:**
   Truy cập `/admin/content-editor` và `/admin/databases`, kiểm tra tổng số lượng items giữa Master và Web.

---

## 6. Xử Lý Sự Cố & Lỗi Thường Gặp
1. **Lỗi `Restore In-Place bị từ chối do hệ thống chưa bật Maintenance Mode`:**
   - *Khắc phục:* Chạy `npm run maintenance:on` trước khi chạy khôi phục in-place.
2. **Lỗi `Checksum verification failed for file ...`:**
   - *Nguyên nhân:* Tệp sao lưu bị lỗi đĩa, hỏng nén hoặc bị sửa đổi trái phép.
   - *Khắc phục:* Kiểm tra lại file backup gốc hoặc sử dụng bản sao lưu gần nhất liền trước.
3. **Lỗi `Missing BACKUP_ENCRYPTION_KEY` khi khôi phục bản sao lưu đã mã hóa:**
   - *Khắc phục:* Cung cấp đúng chuỗi khóa mã hóa bí mật vào file `.env` trước khi chạy restore.

---

## 7. Cảnh Báo & Lưu Ý Quan Trọng
- ⚠️ **Nguyên tắc In-Place Restore:** Quá trình khôi phục đè trực tiếp sẽ xóa và thay thế toàn bộ dữ liệu hiện tại bằng dữ liệu trong bản sao lưu. Hệ thống tự động tạo thêm một bản backup an toàn `pre-restore` trước khi thực thi.
- ⚠️ **Bảo quản Khóa Mã Hóa:** Nếu bản sao lưu được mã hóa bằng `BACKUP_ENCRYPTION_KEY`, mất khóa này đồng nghĩa với việc không thể phục hồi dữ liệu vĩnh viễn.
