---
phase: 11
name: Mở rộng tính năng (Forms Builder, Serialization, Tìm kiếm & Control Panel)
status: Chưa bắt đầu
depends_on: [2, 3, 8]
estimate: 3.5 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 11 - Mở rộng tính năng (Forms, Serialization, Tìm kiếm & Control Panel)
> Bộ công cụ mở rộng hệ sinh thái CMS: Form Builder kéo thả, Serialization JSON export/import, Full-text search, Control Panel và Experience Editor preview iframe.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)

## Mục tiêu
Bổ sung các công cụ cao cấp gia tăng sức mạnh hệ sinh thái CMS: Forms Builder (kéo thả biểu mẫu khảo sát/liên hệ), Serialization (kết xuất và nhập khẩu dữ liệu Item ra tệp JSON phục vụ backup/di chuyển môi trường), Full-text search toàn hệ thống, Control Panel quản trị hệ thống, và phiên bản thử nghiệm Experience Editor đơn giản (xem trước trang trong iframe).

## Phạm vi
- **Làm:**
  - **Forms Builder:** Thiết kế form kéo thả trường (Text, Email, Dropdown, Button), lưu trữ submission của người dùng.
  - **Serialization:** Tính năng "Serialize Item / Tree" xuất toàn bộ nhánh cây ra tệp JSON và "Sync/Deserialize" nhập lại vào hệ thống (hỗ trợ cả dữ liệu fields và presentation).
  - **Full-Text Search:** Ô tìm kiếm trên Cây nội dung và tìm kiếm nâng cao theo từ khóa, template, ngày tạo.
  - **Control Panel:** Màn hình quản trị cấu hình hệ thống, dọn dẹp cache, xem thông số MongoDB.
  - **Experience Editor đơn giản (Mở rộng - Mức ưu tiên thấp):** Cửa sổ xem trước trang React frontend trong thẻ `<iframe>` kèm thanh công cụ bên cạnh cho phép biên tập nhanh các trường và component parameters của trang mà không cần vào Content Editor.
- **Không làm:** Chưa làm tích hợp gửi mail SMTP thực tế của form submission (chỉ lưu vào database).

## Checklist Task
- [ ] **Task 11.1:** Xây dựng tính năng Serialization trong `serializationService.js`:
  - `exportTreeToJson(rootItemId)`: Đệ quy xuất item và toàn bộ con cháu kèm metadata, versions và presentation thành 1 file JSON tải về.
  - `importTreeFromJson(jsonData, targetParentId)`: Đọc file JSON và tạo/cập nhật tương ứng vào MongoDB.
- [ ] **Task 11.2:** Tích hợp Serialization vào Ribbon Tab "Developer" hoặc "Configure" trên Content Editor.
- [ ] **Task 11.3:** Xây dựng tính năng Tìm kiếm `searchService.js`: Sử dụng MongoDB Text Index trên các trường `displayName`, `fields` của Item để tìm kiếm nhanh từ khóa; hỗ trợ tìm theo đường dẫn và template.
- [ ] **Task 11.4:** Bổ sung ô Search nhanh ngay phía trên Cây nội dung Content Editor (gõ từ khóa -> lọc danh sách kết quả trực tiếp).
- [ ] **Task 11.5:** Xây dựng Forms Builder: Model `CmsForm` và `FormSubmission`, giao diện kéo thả form fields sử dụng SortableJS (`src/views/admin/forms/form-designer.ejs`), API tiếp nhận nộp form.
- [ ] **Task 11.6:** Xây dựng ứng dụng Control Panel (`src/views/admin/control-panel/index.ejs`): Quản trị dọn dẹp cache hệ thống (Flush Cache), thống kê dung lượng database, số lượng items/media, re-index tìm kiếm.
- [ ] **Task 11.7 (Ưu tiên thấp):** Xây dựng trang Experience Editor Preview đơn giản (`src/views/admin/content-editor/experience-editor-preview.ejs`): nạp URL live frontend vào `<iframe>` với thanh thuộc tính chỉnh sửa nhanh.

## File/Thư mục Dự kiến
- `src/models/CmsForm.js`, `src/models/FormSubmission.js`
- `src/services/serializationService.js`, `src/services/searchService.js`
- `src/controllers/admin/formBuilderController.js`, `src/controllers/admin/controlPanelController.js`
- `src/routes/admin/formBuilderRoutes.js`, `src/routes/admin/controlPanelRoutes.js`
- `src/views/admin/forms/*.ejs`, `src/views/admin/control-panel/index.ejs`

## Route / API Dự kiến
- `GET /admin/control-panel`
- `POST /admin/control-panel/flush-cache`
- `POST /admin/control-panel/rebuild-index`
- `GET /admin/serialization/export?itemId=...`
- `POST /admin/serialization/import`
- `GET /admin/content-editor/search?q=...`
- `GET /admin/forms`, `GET /admin/forms/designer/:id`

## Thay đổi Database
- Collections `cms_forms`, `form_submissions`.
- Tạo Text Index trên collection `items_master`.

## Definition of Done & Cách kiểm thử
- Chọn một nhánh cây nội dung, bấm "Export Tree" -> Tải về file `.json` chứa đầy đủ cấu trúc phân cấp và presentation.
- Thử xóa một item con, sau đó bấm "Import Tree" chọn file vừa xuất -> Cây nội dung và presentation được phục hồi trọn vẹn.
- Gõ từ khóa vào ô tìm kiếm trên cây nội dung -> Trả về danh sách các item khớp nội dung trong vòng dưới 100ms.
- Vào Forms Builder, tạo một form "Liên hệ" gồm 3 trường: Họ tên, Email, Nội dung. Lưu thành công.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Tệp JSON import quá lớn gây tràn bộ nhớ Node.js.
- *Giảm thiểu:* Sử dụng JSON stream parser (`stream-json`) khi xử lý file import kích thước lớn.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 11`)*

