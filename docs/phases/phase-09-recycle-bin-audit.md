---
phase: 9
name: Thùng rác & Nhật ký kiểm toán (Recycle Bin & Audit Log)
status: Chưa bắt đầu
depends_on: [2, 8]
estimate: 2 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 9 - Thùng rác & Nhật ký kiểm toán (Recycle Bin & Audit Log)
> Cơ chế xóa mềm khôi phục vị trí cũ, kiểm tra toàn vẹn tham chiếu Presentation và Audit Log truy vết biến động dữ liệu.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)

## Mục tiêu
Đảm bảo an toàn dữ liệu với cơ chế xóa mềm (Soft Delete) đưa item vào Thùng rác (Recycle Bin) cho phép khôi phục nguyên trạng vị trí trên cây, kiểm tra toàn vẹn tham chiếu Presentation khi xoá, kết hợp ghi nhận toàn bộ hoạt động của người dùng (bao gồm thay đổi Presentation) vào Nhật ký kiểm toán (Audit Log) để truy vết.

## Phạm vi
- **Làm:** Cơ chế Soft-delete trên Item (`isDeleted: true`, ghi nhận ngày xóa và người xóa); Ứng dụng Recycle Bin: xem danh sách item đã xóa, khôi phục item về vị trí cha cũ (nếu cha bị xóa thì khôi phục về root hoặc cảnh báo), xóa vĩnh viễn (Hard Delete); **Kiểm tra toàn vẹn tham chiếu Presentation (Integrity Check):** Khi xoá Layout hoặc Rendering, kiểm tra xem có Item nào đang sử dụng không; nếu có thì chặn xoá hoặc đưa cảnh báo danh sách item bị ảnh hưởng; **Ghi nhận tự động Audit Log cho các hành vi:** Login, Logout, Create, Update, Delete, Publish, Workflow state change, và **ITEM_PRESENTATION_UPDATE** (ai sửa, item nào, rendering nào được thêm/xoá/sắp xếp); Màn hình xem Audit Log có bộ lọc theo User, Action, và khoảng thời gian.
- **Không làm:** Chưa làm tự động dọn dẹp thùng rác theo lịch định kỳ (retention policy).

## Checklist Task
- [ ] **Task 9.1:** Xây dựng Mongoose Model `AuditLog` (`src/models/AuditLog.js`) với các trường: `userId`, `username`, `action`, `targetItemId`, `itemPath`, `details` (oldValues, newValues, presentationChanges), `ipAddress`, `timestamp`.
- [ ] **Task 9.2:** Xây dựng `auditService.js` cung cấp hàm `logAction(req, action, targetItem, details)` và hàm truy vấn log có phân trang, lọc theo điều kiện.
- [ ] **Task 9.3:** Tích hợp gọi `auditService.logAction` vào tất cả các tác vụ trọng yếu trong hệ thống (Auth, Item CRUD, Publish, Workflow, Presentation Update).
- [ ] **Task 9.4:** Cập nhật `itemService.deleteItem`: Chuyển cờ `isDeleted = true` thay vì xóa vật lý khỏi MongoDB; ẩn các item này khỏi Cây nội dung của Content Editor.
- [ ] **Task 9.5:** Xây dựng tính năng kiểm tra toàn vẹn trước khi xoá Layout/Rendering hoặc Datasource item (cảnh báo hoặc chặn xoá nếu đang có liên kết).
- [ ] **Task 9.6:** Xây dựng tính năng khôi phục trong `itemService.restoreItem(id)`: Đặt `isDeleted = false`, kiểm tra xem node cha cũ còn tồn tại hay không, tự động gắn lại vào cây.
- [ ] **Task 9.7:** Xây dựng ứng dụng Recycle Bin & Audit Log Viewer:
  - Route `src/routes/admin/recycleBinRoutes.js` và `src/routes/admin/auditRoutes.js`.
  - Views `src/views/admin/recycle-bin/index.ejs` và `src/views/admin/audit/viewer.ejs`.

## File/Thư mục Dự kiến
- `src/models/AuditLog.js`
- `src/services/auditService.js`
- `src/controllers/admin/recycleBinController.js`, `src/controllers/admin/auditController.js`
- `src/routes/admin/recycleBinRoutes.js`, `src/routes/admin/auditRoutes.js`
- `src/views/admin/recycle-bin/index.ejs`, `src/views/admin/audit/viewer.ejs`

## Route / API Dự kiến
- `GET /admin/recycle-bin`
- `POST /admin/recycle-bin/restore/:id`
- `POST /admin/recycle-bin/purge/:id`
- `GET /admin/audit-log`
- `GET /admin/audit-log/details/:id`

## Thay đổi Database
Collection `audit_logs` với các index `{ timestamp: -1 }`, `{ targetItemId: 1 }`, `{ userId: 1 }`, `{ action: 1 }`.

## Definition of Done & Cách kiểm thử
- Xóa thử một item bài viết trên Content Editor -> Item biến mất khỏi cây.
- Mở ứng dụng Recycle Bin từ Launchpad -> Thấy bài viết vừa xóa xuất hiện trong danh sách với đầy đủ thông tin đường dẫn gốc.
- Thử xoá một Rendering đang được sử dụng trong Home Page -> Hệ thống chặn xoá và hiển thị cảnh báo "Rendering đang được sử dụng bởi /sitecore/content/home".
- Thay đổi Presentation của một Item (thêm rendering, đổi vị trí) và lưu -> Mở Audit Log thấy xuất hiện dòng log `ITEM_PRESENTATION_UPDATE` ghi rõ chi tiết thay đổi rendering.
- Bấm nút "Restore" bài viết trong Recycle Bin -> Item biến mất khỏi thùng rác và xuất hiện lại đúng vị trí trên cây Content Editor.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Bảng `audit_logs` tăng dung lượng nhanh chóng theo thời gian.
- *Giảm thiểu:* Thiết lập index tối ưu và chuẩn bị sẵn cơ chế TTL Index (Time-To-Live) hoặc script lưu trữ nén (archive) khi dữ liệu vượt ngưỡng.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 9`)*

