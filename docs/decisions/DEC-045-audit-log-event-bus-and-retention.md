# DEC-045: Kiến Trúc Nhật Ký Kiểm Toán (Audit Log) Qua Event Bus & Chính Sách Lưu Trữ (Retention Policy)

- **Ngày quyết định:** 2026-11-09
- **Giai đoạn liên quan:** GĐ 9 (Recycle Bin, Audit Log), GĐ 7 (ACL), GĐ 8 (Publishing & Workflow)
- **Trạng thái:** Đã chốt (Accepted)
- **Người đề xuất:** Tech Lead / User Architecture Command

---

## 1. Bối cảnh
Doanh nghiệp yêu cầu khả năng giám sát chặt chẽ mọi biến động nội dung, thay đổi phân quyền, điều phối workflow, thao tác xuất bản và đăng nhập của biên tập viên.
Tuy nhiên, nếu rải rác lời gọi ghi audit trực tiếp trong từng controller hay service:
1. Gây phân mảnh mã nguồn, vi phạm Single Responsibility Principle.
2. Tiềm ẩn nguy cơ lỗi ghi log làm gián đoạn giao dịch chính của người dùng.
3. Rò rỉ thông tin nhạy cảm (mật khẩu, token, API secret) vào log CSDL.
4. Dung lượng bảng log tăng nhanh không kiểm soát nếu thiếu chính sách lưu trữ (retention policy).

---

## 2. Quyết định Kiến trúc

### 2.1. Kiến trúc Bất Đồng Bộ Dựa trên Event Bus (`InternalEventBus`)
- Toàn bộ việc ghi nhận Audit Log được thực hiện **thụ động qua Event Bus** (`src/utils/eventBus.js`). Các service nghiệp vụ chỉ phát sự kiện chuẩn miền nghiệp vụ (Domain Events).
- Bộ lắng nghe `auditService` đăng ký các sự kiện và ghi vào collection `audit_logs` một cách **bất đồng bộ (`setImmediate` / Promise nền)**, bắt lỗi nội bộ bằng `logger.error` để **tuyệt đối không làm hỏng request chính**.
- Danh sách sự kiện được lắng nghe:
  - **Item Lifecycle:** `item.created`, `item.updated`, `item.renamed`, `item.moved`, `item.copied`, `item.duplicated`, `item.deleted`, `item.restored`, `item.purged`
  - **Version Lifecycle:** `version.added`, `version.deleted`, `version.restored`
  - **Presentation:** `presentation.changed` (ghi chi tiết cấp độ rendering: thêm/sửa/xóa/đổi datasource/parameters)
  - **Template:** `template.changed` (thêm field, đổi base template, sửa standard values)
  - **Workflow & Publish:** `workflow.executed`, `item.published`, `item.unpublished`, `publish.job.finished`
  - **Media:** `media.uploaded`, `media.replaced`, `media.deleted`, `media.synced`
  - **Security & Identity:** `acl.changed`, `role.changed`, `user.changed`, `auth.login`, `auth.logout`, `auth.failed`

### 2.2. Schema Bất Biến & Chống Rò Rỉ Dữ Liệu Nhạy Cảm
Model `AuditLog` (`src/models/AuditLog.js`):
```javascript
{
  at: { type: Date, default: Date.now, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  username: { type: String, trim: true, default: '[anonymous]' }, // Dạng domain\username
  ip: { type: String, trim: true, default: '127.0.0.1' },
  userAgent: { type: String, trim: true, default: '' }, // Rút gọn 200 ký tự
  action: { type: String, required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  itemPath: { type: String, default: '' },
  templateId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lang: { type: String, default: null },
  version: { type: Number, default: null },
  db: { type: String, enum: ['master', 'web'], default: 'master' },
  details: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    fields: [{ type: String }],
    extra: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  result: { type: String, enum: ['success', 'denied', 'error'], default: 'success' },
  correlationId: { type: String, default: null }
}
```
- **Nguyên tắc Bất Biến (Immutability):** Không cung cấp bất kỳ API cập nhật hoặc xóa log nào trên giao diện quản trị hay API thông thường.
- **Loại bỏ Dữ liệu Nhạy cảm:** Lọc bỏ triệt để các trường `password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`.
- **Rút gọn Dữ liệu Lớn:** Các nội dung Rich Text dài hoặc trường text vượt quá 1000 ký tự chỉ lưu diff tóm tắt hoặc hash SHA-256 kèm độ dài ký tự để bảo vệ kích thước cơ sở dữ liệu.

### 2.3. Phân Quyền & Giới Hạn Hiển Thị (Scoped Visibility)
- Quyền truy cập màn hình Audit Log toàn cục (`/admin/audit-log`) yêu cầu quyền `audit:read` qua `canPerform`.
- Với người dùng không phải Quản trị viên tối cao: Hệ thống tự động lọc theo lô (batch-filtering) để người dùng chỉ thấy log của những item mà họ có quyền `item:read`. Không truy vấn N+1.
- Tab/Modal History trong Content Editor hiển thị danh sách biến động của riêng item đang mở.

### 2.4. Chính Sách Dọn Dẹp Định Kỳ (Retention Policy)
- Biến môi trường cấu hình:
  - `AUDIT_RETENTION_DAYS`: Số ngày lưu giữ Audit Log (mặc định 90 ngày, 0 = lưu vĩnh viễn).
  - `RECYCLE_BIN_RETENTION_DAYS`: Số ngày lưu giữ item trong thùng rác (mặc định 30 ngày, 0 = không tự dọn).
- Cung cấp 2 CLI Scripts hỗ trợ cờ `--dry-run`:
  - `npm run recyclebin:purge-expired -- --dry-run`: Tự động tìm các item trong thùng rác có `deletedAt < (now - RECYCLE_BIN_RETENTION_DAYS)` và chuyển vào quy trình purge chuẩn (kiểm tra tham chiếu, dọn Web/Cloudinary).
  - `npm run audit:prune -- --dry-run`: Xóa các bản ghi audit log cũ hơn thời hạn và ghi 1 bản ghi kiểm toán duy nhất loại `SYSTEM_RETENTION_PRUNE`.

---

## 3. Hệ quả
- Hệ thống có khả năng truy vết pháp lý và kiểm toán toàn diện.
- Giữ được hiệu năng cao và dung lượng cơ sở dữ liệu ổn định trong dài hạn.

