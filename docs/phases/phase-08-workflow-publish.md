---
phase: 8
name: Workflow Engine, Workbox & Publishing (Master → Web)
status: Chưa bắt đầu
depends_on: [2, 4, 6, 7]
estimate: 3.5 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 8 - Workflow Engine, Workbox & Publishing (Master → Web)
> Quy trình duyệt nội dung, ứng dụng duyệt Workbox và Publishing Engine đồng bộ Master sang Web bao gồm Item và Presentation.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-023-publish-datasource-warning.md`](../decisions/DEC-023-publish-datasource-warning.md)

## Mục tiêu
Xây dựng quy trình phê duyệt nội dung (Workflow Engine) kết hợp ứng dụng Workbox cho biên tập viên, và cơ chế Xuất bản (Publishing Engine) chuyển dữ liệu Item và Presentation từ `items_master` sang `items_web`.

## Phạm vi
- **Làm:** Model Workflow (Draft -> In Review -> Approved); Workbox hiển thị các item đang chờ duyệt theo quyền của reviewer; Chuyển trạng thái workflow (Submit, Approve, Reject); Workflow áp dụng chặt chẽ cho từng phiên bản nội dung kèm `finalLayout` của phiên bản đó; Publishing Engine hỗ trợ 3 chế độ: Incremental Publish, Smart Publish (so sánh ngày cập nhật), và Republish (toàn bộ cây); **Publish toàn diện Item và Presentation Details (cả Shared Layout và Final Layout theo phiên bản đã duyệt) sang `items_web`; Publish các Item hệ thống dưới `/sitecore/layout/*` (Device, Layout, Rendering, Placeholder Settings); Cơ chế xử lý Datasource khi Publish:** Kiểm tra nếu Datasource của Rendering chưa được publish lên Web thì hiển thị cảnh báo (Warning) trong Publish Dialog kèm tuỳ chọn tự động publish kèm các Datasource liên quan (ghi Decision Log).
- **Không làm:** Chưa làm tính năng hẹn giờ publish bằng Cron nâng cao (đưa vào GĐ 11 nếu cần).

## Checklist Task
- [ ] **Task 8.1:** Xây dựng Mongoose Model `Workflow` (`src/models/Workflow.js`) và `PublishedItem` (`src/models/PublishedItem.js` ánh xạ tới collection `items_web`).
- [ ] **Task 8.2:** Xây dựng Model `PublishHistory` (`src/models/PublishHistory.js`) lưu lại nhật ký các lần publish.
- [ ] **Task 8.3:** Xây dựng `workflowService.js`:
  - Lấy trạng thái hiện tại của item version.
  - Thực hiện chuyển trạng thái (Execute Action: ví dụ "Submit for Review", "Approve", "Reject").
  - Lấy danh sách các item đang chờ duyệt thuộc quyền của user hiện tại cho màn hình Workbox.
- [ ] **Task 8.4:** Xây dựng `publishService.js`:
  - Sao chép phiên bản mới nhất ở trạng thái "Approved" từ `items_master` sang `items_web`.
  - Đồng bộ trọn vẹn cấu trúc `presentation` (Shared Layout và Final Layout của phiên bản được duyệt) sang `items_web`.
  - Hỗ trợ publish các item hệ thống cấu hình Layout/Rendering/Devices/Placeholder Settings từ Master sang Web.
  - Chế độ Smart Publish: Chỉ publish những item có `updatedAt` mới hơn thời điểm publish lần trước.
  - Chế độ Republish: Ghi đè toàn bộ cây con sang `items_web`.
  - Xử lý xóa trên `items_web` đối với các item đã bị xóa trên Master.
  - **Kiểm tra Datasource:** Quét danh sách `datasourceId` trong presentation của các item được publish. Nếu datasource chưa tồn tại trên Web, trả về danh sách cảnh báo (Warnings) cho Publish Dialog.
- [ ] **Task 8.5:** Xây dựng ứng dụng Workbox:
  - Route `GET /admin/workbox`, controller và view `src/views/admin/workflow/workbox.ejs`.
  - Cho phép duyệt nhanh nhiều item cùng lúc (Approve Selected, Reject Selected kèm lý do phản hồi).
- [ ] **Task 8.6:** Tích hợp Workflow và Publishing lên Content Editor:
  - Cảnh báo trạng thái Workflow trên thanh thông tin đầu form (Item Info Bar): "This item is in Draft state".
  - Tab "Review" trên Ribbon: Hiển thị các nút hành động tương ứng với trạng thái hiện tại (Submit, Approve...).
  - Tab "Publish" trên Ribbon: Nút "Publish Item" mở hộp thoại chọn chế độ publish, chọn ngôn ngữ, tùy chọn "Publish sub-items", và hiển thị cảnh báo nếu có Datasource liên quan chưa publish.
- [ ] **Task 8.7:** Xây dựng màn hình Publish Status & Logs theo dõi tiến trình publish theo thời gian thực.

## File/Thư mục Dự kiến
- `src/models/Workflow.js`, `src/models/PublishedItem.js`, `src/models/PublishHistory.js`
- `src/services/workflowService.js`, `src/services/publishService.js`
- `src/controllers/admin/workflowController.js`, `src/controllers/admin/publishController.js`
- `src/routes/admin/workflowRoutes.js`, `src/routes/admin/publishRoutes.js`
- `src/views/admin/workflow/workbox.ejs`
- `src/views/admin/publish/publish-dialog.ejs`, `src/views/admin/publish/publish-status.ejs`

## Route / API Dự kiến
- `GET /admin/workbox`
- `POST /admin/workflow/action`: Thực thi chuyển bước duyệt.
- `GET /admin/publish/dialog`: Mở modal cấu hình publish.
- `POST /admin/publish/execute`: Chạy tác vụ publish.
- `GET /admin/publish/status/:id`: Kiểm tra tiến độ publish.

## Thay đổi Database
- Tạo collection `items_web` (bản sao tối ưu của `items_master` đã published, bao gồm trường `presentation`).
- Collections `workflows`, `publish_histories`.

## Definition of Done & Cách kiểm thử
- Biên tập viên sửa bài viết và thay đổi Presentation, trạng thái bài viết là `Draft`. Bấm "Submit for Review" trên Ribbon -> Trạng thái chuyển thành `Awaiting Approval`.
- Quản trị viên mở ứng dụng Workbox -> Thấy bài viết trên xuất hiện trong danh sách chờ duyệt.
- Quản trị viên bấm "Approve" -> Trạng thái chuyển thành `Approved`.
- Trên Ribbon, bấm "Publish Item" -> Publish Dialog hiển thị; nếu item có rendering trỏ tới datasource item chưa publish, dialog hiển thị cảnh báo màu vàng và cho phép tick chọn "Publish kèm Datasources".
- Bấm Publish -> Hệ thống thực hiện publish thành công.
- Kiểm tra database: Bản ghi tương ứng đã xuất hiện trong collection `items_web` với dữ liệu trường và cấu trúc `presentation` chính xác, trong khi các item đang ở trạng thái `Draft` tuyệt đối không xuất hiện trên `items_web`.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Quá trình Publish cây lớn làm khóa database hoặc nghẽn luồng xử lý của Node.js.
- *Giảm thiểu:* Thực hiện publish theo batch (từng cụm 50-100 items), xử lý bất đồng bộ và trả về tiến trình (progress bar) cho client theo dõi.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 8`)*

