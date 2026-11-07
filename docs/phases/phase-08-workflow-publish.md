---
phase: 8
name: Workflow Engine, Workbox & Publishing (Master → Web)
status: Hoàn thành
depends_on: [2, 4, 6]
estimate: 3.5 ngày làm việc
started: 2026-11-07
completed: 2026-11-07
updated: 2026-11-07
---

# GĐ 8 - Workflow Engine, Workbox & Publishing (Master → Web)
> Quy trình duyệt nội dung (Workflow Engine theo triết lý "Mọi thứ là Item"), ứng dụng duyệt Workbox cho biên tập viên và Publishing Engine đồng bộ Master sang Web bao gồm Page Items, Presentation (Layouts, Placeholders, Renderings), Templates liên quan và Media (Cloudinary metadata).
>
> **[Ghi chú Quan trọng - Thực hiện trước GĐ 7 theo DEC-039]:** Toàn bộ phân quyền trong GĐ 8 được trừu tượng hóa qua hàm `canPerform(user, item, action)` và `workboxService.filterVisible(items, user)`. Tuyệt đối không kiểm tra role cứng trong code.
> 
> **[Ghi chú Quan trọng - Điều chỉnh bởi GĐ 5.1]:** Khi xuất bản tài nguyên Media sang `items_web`, chỉ có bản ghi Item Media được publish; các tệp tin vật lý trên Cloudinary được dùng chung nguyên bản mà không nhân bản dữ liệu nhị phân theo [`phase-05-1-cloudinary-media.md`](./phase-05-1-cloudinary-media.md).

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/versions-languages.md`](../data-model/versions-languages.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`](../decisions/DEC-031-server-side-ejs-renderer-architecture.md)
- [`docs/decisions/DEC-032-three-branch-layout-tree-structure.md`](../decisions/DEC-032-three-branch-layout-tree-structure.md)
- [`docs/decisions/DEC-035-component-field-inheritance-and-context.md`](../decisions/DEC-035-component-field-inheritance-and-context.md)
- [`docs/decisions/DEC-039-execute-phase-08-before-phase-07.md`](../decisions/DEC-039-execute-phase-08-before-phase-07.md)

## Mục tiêu
1. **Tách biệt Master và Web:** Xây dựng collection `items_web` lưu trữ phiên bản đã publish của các item (giữ nguyên `_id`), phục vụ Public Site Renderer (GĐ 10) thông qua `webItemService`.
2. **Workflow Engine ("Mọi thứ là Item"):** Tạo template hệ thống `Workflow`, `Workflow State`, `Workflow Command`, `Workflow Action` dưới `/sitecore/system/Workflows`. Trạng thái gắn theo từng `version` của từng `lang`.
3. **Ứng dụng Workbox (`/admin/workbox`):** Xem và duyệt các item đang chờ duyệt, hỗ trợ duyệt/từ chối đơn lẻ và hàng loạt (bulk).
4. **Publishing Engine Đa chế độ:** Hỗ trợ Item, Smart, Republish, Site publish kèm đồng bộ related items, cảnh báo liên kết/datasource chưa publish, in-process job queue, in-process scheduler (`validFrom/validTo`) và event bus nội bộ.

## Phạm vi
- **Làm:**
  1. Tách Master và Web thành 2 collection (`items` và `items_web`), cung cấp `webItemService` (read-only từ Web).
  2. Workflow Engine: System templates và items trong `/sitecore/system/Workflows`. Workflow mặc định: `Sample Workflow` (`Draft` -> `Submit` -> `Awaiting Approval` -> `Approve` / `Reject` -> `Approved` có `autoPublish`).
  3. Gán workflow qua Standard Values / Template (kế thừa động) hoặc override ở item; version mới về `initial` state; sửa item đã final chuyển về `initial` state (Web giữ nguyên bản cũ).
  4. Lịch sử duyệt `workflow_histories`.
  5. Ứng dụng Workbox (`GET /admin/workbox`) lọc qua `workboxService.filterVisible(items, user)`, hỗ trợ thao tác hàng loạt có báo cáo kết quả từng item.
  6. Publish Engine: 4 chế độ (Item, Smart, Republish, Site), đồng bộ related items (Template, Component Template, Layout, Placeholder, Rendering, Media Item), cảnh báo link/datasource chưa publish, đồng bộ rename/move/delete (gỡ khỏi Web), unpublish thủ công, cleanupWeb.
  7. In-process Publish Job queue (khóa Mongo chống chạy trùng, hủy job), in-process Scheduler (`setInterval` + khóa Mongo).
  8. Event Bus nội bộ: `item.published`, `item.unpublished`, `workflow.executed`, `publish.job.finished`.
  9. Lịch sử xuất bản `publish_histories`.
  10. Content Editor UI: Kích hoạt ribbon tab `WORKFLOW` và `PUBLISH`, tab `REVIEW` vẫn disabled; badge trạng thái workflow/publish; cảnh báo dirty form, xử lý 409 Optimistic Locking.
  11. Màn hình Publish Manager (`/admin/publish-manager`).
  12. Migration script có `--dry-run` bổ sung `workflowState` cho version cũ, tạo collection/index cho `items_web`.
  13. 100% phân quyền đi qua `canPerform(user, item, action)`, không có role cứng.
- **Không làm:**
  - ACL chi tiết theo item, Access Viewer, Role Manager (dành riêng cho GĐ 7).
  - Public Site routing và render HTML công khai `/`, `/about-us`, render cache (dành riêng cho GĐ 10).
  - Thùng rác Recycle Bin UI và Audit Log nâng cao (dành riêng cho GĐ 9).
  - Gửi email thật qua SMTP hoặc cài thêm package hàng đợi ngoài (Redis, BullMQ) / cron ngoài (`node-cron`).

## Checklist Task
- [x] **Task 8.1:** Thiết lập Hằng số Phân quyền & Mở rộng `canPerform`:
  - Định nghĩa action constants: `item:publish`, `item:unpublish`, `publish:manage`, `workflow:read`, `workflow:execute:<commandId>`, `workflow:manage`, `workbox:read`, `workbox:bulk`.
  - Cập nhật ánh xạ role trong `itemService.canPerform(user, item, action)` và `workflowService.canPerform(user, item, action)`.
  - Thêm vai trò `Approver` trong seed data.
- [x] **Task 8.2:** Xây dựng Mongoose Models & Web Store:
  - `Workflow` (`src/models/Workflow.js` và System Templates cho Workflow).
  - `PublishedItem` (`src/models/PublishedItem.js` ánh xạ collection `items_web`).
  - `PublishHistory` (`src/models/PublishHistory.js`).
  - `PublishJob` (`src/models/PublishJob.js` lưu job tiến trình và lock).
  - `WorkflowHistory` (`src/models/WorkflowHistory.js`).
- [x] **Task 8.3:** Xây dựng `webItemService.js`:
  - Đọc từ collection `items_web`: `getById`, `getByPath`, `getChildren`, `resolveFields`, `getFinalPresentation`.
  - Đảm bảo read-only, chỉ ghi qua Publish Engine.
- [x] **Task 8.4:** Xây dựng `workflowService.js` & Test:
  - Khởi tạo seed system templates và `Sample Workflow` trong `/sitecore/system/Workflows`.
  - `getState(item, lang, version)`
  - `getCommands(item, lang, version, user)`
  - `execute(itemId, lang, version, commandId, comment, user, expectedUpdatedAt)`
  - `getHistory(itemId, lang, version)`
  - `getItemsByState(stateId, options)`
  - Xử lý Action registry: `autoPublish`, `validate`, `notify`.
  - Viết Unit Tests cho `workflowService`.
- [x] **Task 8.5:** Xây dựng `publishService.js`, Job Queue, Scheduler & Event Bus:
  - Event Bus nội bộ (`src/utils/eventBus.js`).
  - Publish Engine hỗ trợ 4 chế độ: Item, Smart, Republish, Site.
  - Tự động đồng bộ Related Items (Templates, Component Templates, Layouts, Placeholders, Renderings, Media items).
  - Kiểm tra và cảnh báo Soft Link / Datasource chưa publish.
  - Đồng bộ Rename / Move / Soft-Delete sang Web và Unpublish.
  - In-process Publish Job Runner với MongoDB Distributed Lock.
  - In-process Publish Scheduler (`validFrom` / `validTo`).
  - Viết Unit Tests cho `publishService` và `webItemService`.
- [x] **Task 8.6:** Xây dựng `workboxService.js` & Ứng dụng Workbox:
  - `workboxService.filterVisible(items, user)` (cổng lọc duy nhất).
  - `GET /admin/workbox`: Giao diện Workbox 2 cột (Cột trái: Workflow -> States có đếm số lượng; Cột giữa: Danh sách item, lọc, phân trang, bulk actions).
  - `POST /api/workbox/bulk`: Xử lý duyệt/từ chối hàng loạt có báo cáo kết quả từng item.
- [x] **Task 8.7:** Xây dựng Publish Manager & Content Editor Integration:
  - Màn hình `GET /admin/publish-manager`: chọn chế độ, phạm vi, ngôn ngữ, xem tiến trình job thời gian thực.
  - Kích hoạt tab Ribbon `WORKFLOW` và `PUBLISH` trong Content Editor (`src/config/ribbon.js`).
  - Badge trạng thái Workflow & Publish trên Item Form.
  - Modals: Execute Command (nhập comment), Publish Item Dialog (chế độ, subitems, warnings), Unpublish, Schedules.
  - Xử lý dirty check và 409 Conflict.
- [x] **Task 8.8:** JSON APIs đầy đủ theo quy ước:
  - Workflow APIs (`/api/items/:id/workflow`, `/api/items/:id/workflow/execute`, `/api/items/:id/workflow/history`).
  - Workbox APIs (`/api/workbox/states`, `/api/workbox/items`, `/api/workbox/bulk`).
  - Publish APIs (`/api/publish`, `/api/publish/jobs`, `/api/publish/jobs/:id`, `/api/publish/jobs/:id/cancel`, `/api/items/:id/unpublish`, `/api/items/:id/publish-status`, `/api/publish/preflight`).
- [x] **Task 8.9:** Migration Script, Seed & Regression Testing:
  - Script migration `src/scripts/migrate-phase-08-workflow-publish.js` có `--dry-run` và rollback.
  - Seed bổ sung role `Approver`, gán workflow cho Page Template `Home`.
  - Quét grep đảm bảo 0 kiểm tra role cứng.
  - Chạy toàn bộ test suites đảm bảo 100% passed.

## File/Thư mục Dự kiến
- `src/models/Workflow.js`, `src/models/PublishedItem.js`, `src/models/PublishHistory.js`, `src/models/PublishJob.js`, `src/models/WorkflowHistory.js`
- `src/services/workflowService.js`, `src/services/publishService.js`, `src/services/webItemService.js`, `src/services/workboxService.js`
- `src/controllers/admin/workboxController.js`, `src/controllers/admin/publishManagerController.js`
- `src/routes/admin/workboxRoutes.js`, `src/routes/admin/publishRoutes.js`
- `src/routes/api/publishRoutes.js`, `src/routes/api/workboxRoutes.js`, `src/routes/api/itemRoutes.js`
- `src/views/admin/workbox/index.ejs`, `src/views/admin/publish/manager.ejs`
- `src/views/content-editor/modals/publish-dialog.ejs`, `src/views/content-editor/modals/workflow-execute-modal.ejs`, `src/views/content-editor/modals/unpublish-modal.ejs`

## Route / API Dự kiến
- `GET /admin/workbox`
- `GET /admin/publish-manager`
- `POST /api/items/:id/workflow/execute`: Thực thi chuyển bước duyệt.
- `GET /api/items/:id/workflow`: Thông tin state và available commands.
- `GET /api/items/:id/workflow/history`: Lịch sử duyệt.
- `GET /api/workbox/summary`, `GET /api/workbox/items`, `POST /api/workbox/bulk`
- `GET /api/publish/preflight`: Kiểm tra liên kết chưa xuất bản.
- `POST /api/publish`: Chạy tác vụ xuất bản.
- `GET /api/publish/jobs`, `GET /api/publish/jobs/:id`, `POST /api/publish/jobs/:id/cancel`
- `POST /api/items/:id/unpublish`: Gỡ bỏ item khỏi Web.

## Thay đổi Database
- Tạo collection `items_web` (bản sao tối ưu của `items_master` đã published, bao gồm trường `presentation`).
- Collections `workflows`, `publish_histories`, `publish_jobs`, `workflow_histories`.

## Definition of Done & Cách kiểm thử
- Biên tập viên sửa bài viết và thay đổi Presentation, trạng thái bài viết là `Draft`. Bấm "Submit for Review" trên Ribbon -> Trạng thái chuyển thành `Awaiting Approval`.
- Quản trị viên mở ứng dụng Workbox -> Thấy bài viết trên xuất hiện trong danh sách chờ duyệt.
- Quản trị viên bấm "Approve" -> Trạng thái chuyển thành `Approved`.
- Trên Ribbon, bấm "Publish Item" -> Publish Dialog hiển thị; nếu item có rendering trỏ tới datasource item chưa publish, dialog hiển thị cảnh báo màu vàng và cho phép tick chọn "Publish kèm Datasources".
- Bấm Publish -> Hệ thống thực hiện publish thành công sang `items_web`.
- Cả Page, Layout, Placeholder, Rendering và Template liên quan đều có mặt trên `items_web`.
- Cache render của site công khai được tự động invalidate.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Quá trình Publish cây lớn làm khóa database hoặc nghẽn luồng xử lý của Node.js.
- *Giảm thiểu:* Thực hiện publish theo batch (từng cụm 50-100 items), xử lý bất đồng bộ qua hàng đợi job nội bộ với khóa phân tán MongoDB.

## Ghi chú / Kết quả
- **Hoàn thành 100% DoD Giai đoạn 8:**
  - Tách bạch hoàn toàn Master và Web (`items` vs `items_web`) qua `PublishedItem` và read-only `webItemService`.
  - Workflow Engine ("Mọi thứ là Item") với `Sample Workflow` (`Draft` -> `Submit` -> `Awaiting Approval` -> `Approve` / `Reject` -> `Approved` có `autoPublish`), optimistic lock 409, reset về Draft khi sửa bản Final.
  - Ứng dụng Workbox độc lập (`/admin/workbox`) hỗ trợ duyệt đơn lẻ và bulk actions kèm báo cáo chi tiết.
  - Publishing Engine hỗ trợ 4 chế độ (Item, Smart, Republish, Site), auto-sync related items, preflight warnings cho datasource chưa publish, sync rename/move/delete, unpublish và cleanupWeb.
  - In-process Publish Job queue (khóa Mongo) và in-process scheduler (`validFrom/validTo`).
  - Giao diện Content Editor tích hợp badge trạng thái workflow & publish, ribbon tabs `WORKFLOW` và `PUBLISH` (tab `REVIEW` giữ disabled).
  - Ứng dụng Publish Manager (`/admin/publish-manager`).
  - Toàn bộ phân quyền 100% qua `canPerform(user, item, action)` và `filterVisible` (quét grep: 0 hardcoded role check).
  - Test suites: 24/24 passed (250/250 tests passed 100%). Lint: 0 errors, 0 warnings.
