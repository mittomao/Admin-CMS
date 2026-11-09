---
phase: 9
name: Thùng rác & Nhật ký kiểm toán (Recycle Bin & Audit Log)
status: Hoàn thành
depends_on: [2, 8]
estimate: 2 ngày làm việc
started: 2026-11-09
completed: 2026-11-09
updated: 2026-11-09
---

# GĐ 9 - Thùng rác & Nhật ký kiểm toán (Recycle Bin & Audit Log)
> Cơ chế xóa mềm khôi phục vị trí cũ, kiểm tra toàn vẹn tham chiếu Presentation và Audit Log truy vết biến động dữ liệu.
> 
> **[Việc GĐ 9 Phải Bổ Sung Do GĐ 10 Làm Trước - theo DEC-040]:**
> 1. **Kiểm tra toàn vẹn Presentation khi xoá:** Chặn hoặc cảnh báo nghiêm ngặt khi xóa các Layout, Rendering, Placeholder hoặc Datasource Item đang được tham chiếu bởi các trang công khai trên `items_web`.
> 2. **Audit Log cho Site Renderer & Presentation:** Ghi nhận nhật ký kiểm toán cho các sự kiện Presentation update, Publish/Unpublish và cache invalidation.
> 3. **Đồng bộ dọn dẹp Web Store (`items_web`):** Khi xóa vĩnh viễn (Hard Delete / Purge Recycle Bin) hoặc xóa mềm item trên Master, phải tự động đồng bộ gỡ bỏ khỏi Web Store (`cleanupWeb()`) để tránh trang 404/500 trên website công khai.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-044-safe-deletion-reference-integrity-and-recycle-bin.md`](../decisions/DEC-044-safe-deletion-reference-integrity-and-recycle-bin.md)
- [`docs/decisions/DEC-045-audit-log-event-bus-and-retention.md`](../decisions/DEC-045-audit-log-event-bus-and-retention.md)

## Mục tiêu
Đảm bảo an toàn dữ liệu với cơ chế xóa mềm (Soft Delete) đưa item vào Thùng rác (Recycle Bin) cho phép khôi phục nguyên trạng vị trí trên cây, kiểm tra toàn vẹn tham chiếu Presentation khi xoá, kết hợp ghi nhận toàn bộ hoạt động của người dùng (bao gồm thay đổi Presentation) vào Nhật ký kiểm toán (Audit Log) để truy vết.

## Phạm vi
- **Làm:** Cơ chế Soft-delete trên Item (`isDeleted: true`, ghi nhận ngày xóa và người xóa); Ứng dụng Recycle Bin: xem danh sách item đã xóa, khôi phục item về vị trí cha cũ (nếu cha bị xóa thì khôi phục về root hoặc cảnh báo), xóa vĩnh viễn (Hard Delete); **Kiểm tra toàn vẹn tham chiếu Presentation (Integrity Check):** Khi xoá Layout hoặc Rendering, kiểm tra xem có Item nào đang sử dụng không; nếu có thì chặn xoá hoặc đưa cảnh báo danh sách item bị ảnh hưởng; **Ghi nhận tự động Audit Log cho các hành vi:** Login, Logout, Create, Update, Delete, Publish, Workflow state change, và **ITEM_PRESENTATION_UPDATE** (ai sửa, item nào, rendering nào được thêm/xoá/sắp xếp); Màn hình xem Audit Log có bộ lọc theo User, Action, và khoảng thời gian.
- **Không làm:** Chưa làm tự động dọn dẹp thùng rác theo lịch định kỳ (retention policy).

## Checklist Task
- [x] **Task 9.1:** Xây dựng Mongoose Model `AuditLog` (`src/models/AuditLog.js`) với các trường: `userId`, `username`, `action`, `itemId`, `itemPath`, `templateId`, `lang`, `version`, `db`, `details` (oldValues, newValues, presentationChanges), `ip`, `userAgent`, `at`.
- [x] **Task 9.2:** Xây dựng `auditService.js` cung cấp hàm `log(entry)` và hàm truy vấn log có phân trang, lọc theo điều kiện (`list`, `getById`, `getItemHistory`, `exportCsv`, `pruneExpired`).
- [x] **Task 9.3:** Tích hợp lắng nghe `eventBus` và phát sự kiện vào tất cả các tác vụ trọng yếu trong hệ thống (Auth, Item CRUD, Publish, Workflow, Presentation Update, ACL).
- [x] **Task 9.4:** Cập nhật `itemService.delete`: Chuyển cờ `deleted = true`, `isDeleted = true`, lưu `deletedAt`, `deletedBy`, `deletedFromPath`, `deletedFromParentId`, `deletionBatchId`; ẩn các item này khỏi Cây nội dung của Content Editor.
- [x] **Task 9.5:** Xây dựng `referenceService.js` tập trung kiểm tra toàn vẹn trước khi xoá Layout/Rendering, Component Template, Base Template, Datasource, Rich Text Internal Link hoặc Web Store Item (chặn `BLOCK` 409 hoặc cảnh báo `WARN` yêu cầu xác nhận).
- [x] **Task 9.6:** Xây dựng tính năng khôi phục trong `itemService.restoreItem(id)` và `recycleBinService.restore(id)`: Đặt `deleted = false, isDeleted = false`, kiểm tra node cha gốc, tự động xử lý va chạm tên `(Restored)` và tính toán lại `path` & `ancestors` cho toàn bộ nhánh con.
- [x] **Task 9.7:** Xây dựng dịch vụ và ứng dụng Recycle Bin & Audit Log Viewer:
  - Service `src/services/recycleBinService.js` và controller `src/controllers/admin/recycleBinController.js`, `src/controllers/admin/auditController.js`.
  - Route `src/routes/admin/recycleBinRoutes.js`, `src/routes/api/recycleBinRoutes.js`, `src/routes/admin/auditRoutes.js`, `src/routes/api/auditRoutes.js`.
  - Views `src/views/admin/recycle-bin/index.ejs` và `src/views/admin/audit/viewer.ejs`.
  - Kết nối Launchpad tiles và kiểm soát quyền qua `canPerform` (`recyclebin:read`, `recyclebin:restore`, `recyclebin:purge`, `audit:read`).
- [x] **Task 9.8:** Xây dựng các kịch bản CLI & Migration GĐ 9:
  - `src/scripts/migrate-phase-09-recycle-bin.js` (`npm run migrate:phase-09`)
  - `src/scripts/purge-expired-recyclebin.js` (`npm run recyclebin:purge-expired`)
  - `src/scripts/prune-expired-audit-logs.js` (`npm run audit:prune`)
- [x] **Task 9.9:** Bộ kiểm thử tự động toàn diện:
  - `tests/referenceService.test.js`
  - `tests/recycleBinService.test.js`
  - `tests/auditService.test.js`
  - `tests/recycleBinApi.test.js`

## File/Thư mục Dự kiến
- `src/models/AuditLog.js`
- `src/services/auditService.js`
- `src/services/referenceService.js`
- `src/services/recycleBinService.js`
- `src/controllers/admin/recycleBinController.js`, `src/controllers/admin/auditController.js`
- `src/routes/admin/recycleBinRoutes.js`, `src/routes/api/recycleBinRoutes.js`
- `src/routes/admin/auditRoutes.js`, `src/routes/api/auditRoutes.js`
- `src/views/admin/recycle-bin/index.ejs`, `src/views/admin/audit/viewer.ejs`

## Route / API Dự kiến
- `GET /admin/recycle-bin`
- `POST /admin/recycle-bin/restore/:id`
- `POST /admin/recycle-bin/purge/:id`
- `POST /admin/recycle-bin/purge-all`
- `GET /api/recycle-bin/:id`
- `POST /api/recycle-bin/restore/:id`
- `POST /api/recycle-bin/purge/:id`
- `POST /api/recycle-bin/purge-all`
- `GET /api/items/:id/references`
- `GET /admin/audit-log`
- `GET /admin/audit-log/export`
- `GET /api/audit/:id`
- `GET /api/audit/item/:itemId`

## Thay đổi Database
Collection `audit_logs` với các index `{ at: -1 }`, `{ itemId: 1 }`, `{ userId: 1 }`, `{ action: 1 }`, `{ result: 1 }`.
Mở rộng Collection `items` với `{ deleted: 1, deletedAt: -1 }`, `{ deletionBatchId: 1 }`.

## Definition of Done & Cách kiểm thử
- [x] Xóa thử một item bài viết trên Content Editor -> Item biến mất khỏi cây.
- [x] Mở ứng dụng Recycle Bin từ Launchpad -> Thấy bài viết vừa xóa xuất hiện trong danh sách với đầy đủ thông tin đường dẫn gốc.
- [x] Thử xoá một Rendering đang được sử dụng trong Presentation -> Hệ thống chặn xoá và hiển thị cảnh báo "Rendering đang được sử dụng trong Standard Presentation...".
- [x] Thay đổi Presentation của một Item (thêm rendering, đổi vị trí) và lưu -> Mở Audit Log thấy xuất hiện dòng log `ITEM_PRESENTATION_UPDATE` ghi rõ chi tiết thay đổi rendering.
- [x] Bấm nút "Restore" bài viết trong Recycle Bin -> Item biến mất khỏi thùng rác và xuất hiện lại đúng vị trí trên cây Content Editor.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Bảng `audit_logs` tăng dung lượng nhanh chóng theo thời gian.
- *Giảm thiểu:* Thiết lập compound index tối ưu và script định kỳ `audit:prune` tỉa bỏ các bản ghi cũ hơn `AUDIT_RETENTION_DAYS` (mặc định 90 ngày).

## Ghi chú / Kết quả
**Hoàn thành ngày 2026-11-09:**
- Hoàn thành 100% tính năng Thùng rác (Recycle Bin), Kiểm tra toàn vẹn tham chiếu (Reference Integrity Check), Nhật ký kiểm toán (Audit Log), đồng bộ xóa Web Store và dọn dẹp Cloudinary media.
- Vượt qua toàn bộ 34 test suites (335/335 unit & integration tests passed).
- ESLint: 0 lỗi. Check Branding: 100% Treecraft & Root compliance.

