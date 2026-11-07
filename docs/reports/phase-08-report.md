# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 8
## WORKFLOW ENGINE, WORKBOX & PUBLISHING (MASTER → WEB)

- **Giai đoạn:** 8 (Thực hiện trước GĐ 7 theo phê duyệt và kiến trúc DEC-039)
- **Ngày bắt đầu:** 2026-11-07
- **Ngày hoàn thành:** 2026-11-07
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu)
- **Tài liệu tham chiếu:** [`docs/phases/phase-08-workflow-publish.md`](../phases/phase-08-workflow-publish.md)
- **Quyết định kiến trúc:** [`docs/decisions/DEC-039-execute-phase-08-before-phase-07.md`](../decisions/DEC-039-execute-phase-08-before-phase-07.md)

---

### 1. Tóm tắt kết quả triển khai

Toàn bộ mục tiêu và yêu cầu khắt khe của Giai đoạn 8 đã được hoàn thiện 100%:

1. **Ràng buộc phân quyền nghiêm ngặt (Chuẩn bị cho GĐ 7):**
   - 100% kiểm tra quyền đi qua `canPerform(user, item, action)` và `workboxService.filterVisible(items, user)`.
   - **Grep quét sạch:** Không có bất kỳ kiểm tra vai trò cứng nào (`user.role === ...`, `roles.includes(...)`) tại controllers, services, views hoặc client-side JS.
   - Định nghĩa danh mục action constants chuẩn hóa tại `src/config/permissions.js`: `item:publish`, `item:unpublish`, `publish:manage`, `workflow:read`, `workflow:execute:<commandId>`, `workflow:manage`, `workbox:read`, `workbox:bulk`.
   - Bổ sung vai trò `Approver` trong seed data và thiết lập ánh xạ vai trò mặc định.

2. **Tách biệt Master và Web:**
   - Collection `items_web` tương ứng với model `PublishedItem` duy trì nguyên vẹn `_id` từ `items_master`.
   - Cung cấp dịch vụ đọc tối ưu cho Public Site Renderer (GĐ 10) thông qua `webItemService.js` (`getById`, `getByPath`, `getChildren`, `resolveFields`, `getFinalPresentation`) hoàn toàn chỉ đọc từ `items_web`.
   - Xây dựng cơ chế `cleanupWeb()` tự động dọn sạch các bản ghi mồ côi hoặc mục đã bị đổi đường dẫn/xóa trên Master.

3. **Workflow Engine ("Mọi thứ là Item"):**
   - Triển khai mô hình Workflow linh hoạt với `Sample Workflow` mặc định:
     - `Draft` (Initial) &rarr; Lệnh `Submit` &rarr; `Awaiting Approval` &rarr; Lệnh `Approve` (kèm Action `autoPublish`) / Lệnh `Reject` (bắt buộc nhập lý do) &rarr; `Approved` (Final).
   - Trạng thái lưu trữ theo từng phiên bản của từng ngôn ngữ (`languages[].versions[].workflowState`).
   - Cập nhật tự động: Khi một phiên bản ở trạng thái `Final` bị biên tập, hệ thống tự động đưa phiên bản đó về `Initial` (Draft), trong khi `items_web` vẫn giữ nguyên phiên bản đã xuất bản trước đó cho đến khi được duyệt lại.
   - Cơ chế khóa lạc quan (Optimistic Locking với mã lỗi 409 Conflict) đảm bảo tính toàn vẹn khi duyệt đồng thời.
   - Ghi vết kiểm toán phê duyệt vào collection `workflow_histories`.

4. **Ứng dụng Workbox Độc lập (`/admin/workbox`):**
   - Đã kích hoạt Launchpad tile và ứng dụng độc lập 2 cột.
   - Cột trái: Cây Workflow & Trạng thái kèm badge đếm số lượng item khả dụng theo quyền của người dùng qua `filterVisible`.
   - Vùng giữa: Bảng danh sách item chờ duyệt, hỗ trợ tìm kiếm tên/đường dẫn, lọc theo ngôn ngữ, phân trang.
   - Hành động trực tiếp trên từng item: Duyệt đơn lẻ theo command, xem lịch sử duyệt, mở trong Content Editor.
   - Thao tác hàng loạt (Bulk): Cho phép chọn nhiều item cùng state và thực thi lệnh hàng loạt (yêu cầu quyền `workbox:bulk`), trả về báo cáo chi tiết từng mục mà không dừng toàn bộ lô khi có mục lỗi.

5. **Publishing Engine Đa chế độ:**
   - Hỗ trợ 4 chế độ: `Item`, `Smart` (so sánh hash/thời gian cập nhật), `Republish` (ghi đè toàn bộ nhánh), `Site` (toàn bộ website).
   - Tự động phát hiện và đồng bộ các thực thể liên quan (Related Items): Page Template, Layout, Placeholder, Rendering, Component Template, và Media Item (tôn trọng DEC GĐ 5.1 Cloudinary).
   - Kiểm tra tiền kiểm (Preflight Check): Phát hiện và cảnh báo liên kết mềm / Datasource chưa xuất bản trên Web bằng khung cảnh báo màu vàng trong modal xuất bản.
   - Cơ chế Unpublish gỡ bỏ nội dung khỏi Web công khai.
   - In-process Job Queue với Distributed Lock trên MongoDB (chống chạy trùng tác vụ, hỗ trợ hủy job).
   - In-process Scheduler định kỳ 60s quét và thực thi các phiên bản theo `validFrom` / `validTo`.
   - Event Bus nội bộ (`eventBus.js`) phát tín hiệu `item.published`, `item.unpublished`, `workflow.executed`, `publish.job.finished`.
   - Lịch sử xuất bản lưu tại `publish_histories`.

6. **Tích hợp Content Editor UI & Publish Manager:**
   - Kích hoạt tab Ribbon `WORKFLOW` và `PUBLISH` trong Content Editor (tab `REVIEW` tiếp tục giữ disabled theo đúng chỉ đạo).
   - Badge trực quan hiển thị trạng thái Workflow và trạng thái Web Publish ngay trên tiêu đề form.
   - Modals: `publish-dialog.ejs` (có Preflight cảnh báo), `workflow-execute-modal.ejs` (bắt buộc comment nếu có yêu cầu), `unpublish-modal.ejs`.
   - Ứng dụng Dashboard `Publish Manager` (`/admin/publish-manager`) quản lý hàng đợi và lịch sử toàn site.

7. **Database Migration & Regression Testing:**
   - Script `src/scripts/migrate-phase-08-workflow-publish.js` hỗ trợ đầy đủ cờ `--dry-run` và `--rollback`, đã thực thi backfill 51 item versions về `Draft` và đồng bộ 100% indexes trên DB.
   - 100% Unit & Integration test suites passed: **24/24 test suites passed (250/250 tests passed)**.
   - ESLint: **0 errors, 0 warnings**.

---

### 2. Danh sách File Đã Sửa Đổi / Tạo Mới

| STT | File | Hành động | Mô tả |
| :---: | :--- | :---: | :--- |
| 1 | `src/config/permissions.js` | **Tạo mới** | Hằng số danh mục quyền cho Workflow, Workbox và Publishing |
| 2 | `src/utils/errors.js` | **Tạo mới** | Lớp chuẩn hóa lỗi AppError, ValidationError, ConflictError, ForbiddenError, NotFoundError |
| 3 | `src/utils/eventBus.js` | **Tạo mới** | Event Bus nội bộ dùng cho Workflow và Publish Engine |
| 4 | `src/models/PublishedItem.js` | **Tạo mới** | Schema collection `items_web` lưu trữ phiên bản live tối ưu |
| 5 | `src/models/Workflow.js` | **Tạo mới** | Schema quy trình duyệt, trạng thái, lệnh và hành động |
| 6 | `src/models/WorkflowHistory.js` | **Tạo mới** | Schema lưu vết lịch sử chuyển bước quy trình |
| 7 | `src/models/PublishJob.js` | **Tạo mới** | Schema quản lý tiến trình xuất bản và khóa phân tán |
| 8 | `src/models/PublishHistory.js` | **Tạo mới** | Schema lưu lịch sử và chi tiết nhật ký các đợt publish |
| 9 | `src/models/Item.js` | Sửa | Thêm `workflowState`, `validFrom`, `validTo`, `neverPublish` vào Version schema; thêm `workflowId` trên Item |
| 10 | `src/models/Template.js` | Sửa | Bổ sung `workflowId` và `workflow` phục vụ kế thừa mặc định |
| 11 | `src/models/index.js` | Sửa | Export các model mới của GĐ 8 |
| 12 | `src/services/itemService.js` | Sửa | Cập nhật ánh xạ role cho Phase 8 permissions trong `canPerform` |
| 13 | `src/services/webItemService.js` | **Tạo mới** | Read-only service đọc từ `items_web` (`getById`, `getByPath`, `getChildren`, `resolveFields`, `getFinalPresentation`) |
| 14 | `src/services/workflowService.js` | **Tạo mới** | Workflow Engine: resolve state, outgoing commands, execute chuyển bước, optimistic locking, action registry |
| 15 | `src/services/publishService.js` | **Tạo mới** | Publish Engine: 4 chế độ, related items resolver, preflight checks, unpublish, cleanupWeb, job queue, scheduler |
| 16 | `src/services/workboxService.js` | **Tạo mới** | Cổng lọc duy nhất `filterVisible`, thống kê summary và bulk commands execution |
| 17 | `src/services/versionService.js` | Sửa | Tự động reset state về `Draft` khi sửa phiên bản đã duyệt; gán initial state khi tạo version |
| 18 | `src/controllers/admin/workboxController.js` | **Tạo mới** | Controller cho ứng dụng Workbox và Workbox APIs |
| 19 | `src/controllers/admin/publishManagerController.js` | **Tạo mới** | Controller cho Publish Manager Dashboard và Publish APIs |
| 20 | `src/controllers/admin/contentEditorController.js` | Sửa | Nạp thông tin workflow và publish status truyền vào partial `item-form` |
| 21 | `src/config/ribbon.js` | Sửa | Kích hoạt tab Ribbon `workflow` và `publish`, tab `review` giữ disabled |
| 22 | `src/views/admin/workbox/index.ejs` | **Tạo mới** | Giao diện ứng dụng Workbox 2 cột, bảng item, lọc, phân trang, bulk actions |
| 23 | `src/views/admin/publish/manager.ejs` | **Tạo mới** | Giao diện Dashboard Publish Manager |
| 24 | `src/views/content-editor/modals/publish-dialog.ejs` | **Tạo mới** | Modal Publish Dialog kèm Preflight warnings |
| 25 | `src/views/content-editor/modals/workflow-execute-modal.ejs` | **Tạo mới** | Modal thực thi lệnh duyệt và nhập nhận xét |
| 26 | `src/views/content-editor/modals/unpublish-modal.ejs` | **Tạo mới** | Modal xác nhận gỡ bỏ item khỏi Web |
| 27 | `src/views/content-editor/item-form.ejs` | Sửa | Hiển thị badge trạng thái Workflow và Web Live Publish |
| 28 | `src/views/content-editor/index.ejs` | Sửa | Nhúng các modal Workflow và Publishing |
| 29 | `src/routes/admin/workboxRoutes.js` | **Tạo mới** | Tuyến đường admin `/admin/workbox` |
| 30 | `src/routes/admin/publishRoutes.js` | **Tạo mới** | Tuyến đường admin `/admin/publish-manager` |
| 31 | `src/routes/api/publishRoutes.js` | **Tạo mới** | APIs `/api/publish/*` |
| 32 | `src/routes/api/workboxRoutes.js` | **Tạo mới** | APIs `/api/workbox/*` |
| 33 | `src/routes/api/itemRoutes.js` | Sửa | Bổ sung các routes `/api/items/:id/workflow/*` và `/api/items/:id/unpublish` |
| 34 | `src/app.js` | Sửa | Mount các routes admin và api mới |
| 35 | `public/js/admin/content-editor.js` | Sửa | Xử lý các action ribbon `workflow:*` và `publish:*`, client modal handlers |
| 36 | `src/scripts/seed-initial-data.js` | Sửa | Thêm vai trò `Approver`, cập nhật URL Workbox `/admin/workbox` và Publish Manager |
| 37 | `src/scripts/migrate-phase-08-workflow-publish.js` | **Tạo mới** | Script migration có `--dry-run` và `--rollback` |
| 38 | `tests/workflowService.test.js` | **Tạo mới** | 6 unit tests kiểm thử workflow engine, permissions, optimistic locking |
| 39 | `tests/publishService.test.js` | **Tạo mới** | 5 unit tests kiểm thử publish, preflight warnings, related items, unpublish, webItemService |
| 40 | `docs/decisions/DEC-039-execute-phase-08-before-phase-07.md` | **Tạo mới** | Ghi nhận quyết định kiến trúc triển khai GĐ 8 trước GĐ 7 |
| 41 | `docs/phases/phase-07-item-acl.md` | Sửa | Bổ sung mục "Việc GĐ 7 phải bổ sung do GĐ 8 làm trước" |
| 42 | `docs/phases/phase-08-workflow-publish.md` | Sửa | Hoàn thành toàn bộ checklist task 8.1 &rarr; 8.9 |
| 43 | `docs/phases/README.md` | Sửa | Cập nhật tiến độ GĐ 8: Hoàn thành (2026-11-07) |

---

### 3. Kết quả Kiểm thử Toàn diện

```
Test Suites: 24 passed, 24 total
Tests:       250 passed, 250 total
Snapshots:   0 total
Time:        30.027 s
```

- **ESLint:** 0 errors, 0 warnings.
- **Rà soát phân quyền bằng grep:** 0 hardcoded role check trong toàn bộ mã nguồn mới.

---

### 4. Kết luận & Đề xuất Bước tiếp theo

Giai đoạn 8 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Tôi xin dừng lại và chờ lệnh chỉ đạo tiếp theo từ bạn!

