---
phase: 3
name: Template Manager (Quản lý Cấu trúc, Kế thừa & Insert Options)
status: Hoàn thành
depends_on: [2]
estimate: 2.5 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
updated: 2026-11-03
---

# GĐ 3 - Template Manager (Quản lý Cấu trúc, Kế thừa & Insert Options)
> Công cụ thiết kế Template trực quan: Sections, Field Types, kế thừa đa cấp chống chu trình, Standard Values động và Insert Options.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/data-model/templates.md`](../data-model/templates.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-015-immutable-field-id.md`](../decisions/DEC-015-immutable-field-id.md)
- [`docs/decisions/DEC-016-template-inheritance-cycle-detection.md`](../decisions/DEC-016-template-inheritance-cycle-detection.md)
- [`docs/decisions/DEC-017-dynamic-standard-values.md`](../decisions/DEC-017-dynamic-standard-values.md)
- [`docs/decisions/DEC-018-safe-delete-template.md`](../decisions/DEC-018-safe-delete-template.md)

## Mục tiêu
Xây dựng công cụ Template Manager cho phép người quản trị định nghĩa cấu trúc dữ liệu của Item trực quan (Sections, Fields, Field Types), hỗ trợ kế thừa Base Templates, thiết lập Standard Values (giá trị mặc định) và Insert Options (ràng buộc loại item con được tạo).

## Phạm vi
- **Làm:** Giao diện quản lý Template; Trình thiết kế Section & Field với đầy đủ các Field Types: Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist; Kế thừa nhiều Base Template; Thiết lập Standard Values; Cấu hình Insert Options; Tự động phản ánh cấu trúc trường mới vào Form của Content Editor.
- **Không làm:** Chưa làm Validation Rules nâng cao bằng Regex tùy biến phức tạp.

## Checklist Task
- [x] **Task 3.1:** Hoàn thiện Mongoose Schema `Template` (`src/models/Template.js`) hỗ trợ mảng `sections`, `fields`, `baseTemplateIds`, `standardValues`, và `insertOptions`.
- [x] **Task 3.2:** Xây dựng `templateService.js`:
  - `getAllTemplates()`: Lấy danh sách template trong hệ thống.
  - `getTemplateWithInheritance(templateId)`: Thu thập toàn bộ section và field từ chính template đó và đệ quy lên tất cả các base templates.
  - `createTemplate(data)`, `updateTemplate(id, data)`, `deleteTemplate(id)`.
  - `saveStandardValues(templateId, values)`.
  - `setInsertOptions(templateId, allowedTemplateIds)`.
- [x] **Task 3.3:** Xây dựng `templateManagerController.js` và route `src/routes/admin/templateManagerRoutes.js`:
  - `GET /admin/template-manager`: Giao diện danh sách và cây template.
  - `GET /admin/template-manager/:id`: Chi tiết màn hình thiết kế template (Sections, Fields).
  - `POST /admin/template-manager/save`: Lưu cấu trúc template.
  - `POST /admin/template-manager/:id/standard-values`: Lưu giá trị mặc định.
  - `POST /admin/template-manager/:id/insert-options`: Cập nhật insert options.
- [x] **Task 3.4:** Thiết kế giao diện EJS Template Manager:
  - `src/views/admin/templates/manager.ejs`: Cây template nằm dưới nhánh `/sitecore/templates`.
  - `src/views/admin/templates/builder.ejs`: Bảng thiết kế Section và Field cho phép thêm/sửa/xóa trường nhanh, chọn loại trường từ dropdown.
  - `src/views/admin/templates/modals/insert-options-modal.ejs`: Hộp thoại chọn template con được phép tạo.
- [x] **Task 3.5:** Tích hợp kế thừa trường vào Content Editor:
  - Cập nhật `itemService.getItemWithRenderSchema(itemId)` để merge toàn bộ trường của Template và Base Templates, điền giá trị từ Item hoặc fallback về Standard Values nếu trường đang trống.
  - Cập nhật Modal "Insert Item" trên Content Editor: Chỉ hiển thị các template được chỉ định trong `insertOptions` của item hiện tại.

## File/Thư mục Dự kiến
- `src/models/Template.js`
- `src/services/templateService.js`
- `src/controllers/admin/templateManagerController.js`
- `src/routes/admin/templateManagerRoutes.js`
- `src/views/admin/templates/manager.ejs`, `src/views/admin/templates/builder.ejs`
- `src/views/admin/templates/modals/*.ejs`
- `src/public/js/template-builder.js`

## Route / API Dự kiến
- `GET /admin/template-manager`
- `GET /admin/template-manager/:id`
- `POST /admin/template-manager/save`
- `POST /admin/template-manager/:id/standard-values`
- `POST /admin/template-manager/:id/insert-options`

## Thay đổi Database
- Cập nhật collection `templates`.
- Liên kết `templateId` trên các item tới collection `templates`.

## Definition of Done & Cách kiểm thử
- Vào Template Manager, tạo một Base Template tên `_BasePage` chứa Section "SEO" gồm 2 field: `Meta Title` (Single-Line Text) và `Meta Description` (Multi-Line Text).
- Tạo Template con tên `Article Page`, kế thừa `_BasePage`, và bổ sung Section "Article Body" gồm field `Author` và `Content` (Rich Text).
- Thiết lập Standard Values cho `Article Page`: `Meta Title` mặc định là "Default Article Title".
- Thiết lập Insert Options cho `home` item: chỉ cho phép tạo `Article Page`.
- Mở Content Editor, bấm Insert trên node `home` -> Hộp thoại chỉ cho phép tạo `Article Page`.
- Tạo một bài viết mới -> Form hiển thị đầy đủ 2 section "SEO" và "Article Body", trường `Meta Title` tự động điền giá trị từ Standard Values.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Kế thừa vòng tròn (Circular Inheritance: Template A kế thừa B, B kế thừa A) gây tràn bộ nhớ đệ quy.
- *Giảm thiểu:* Kiểm tra phát hiện chu trình (Cycle Detection) trong `templateService` trước khi cho phép lưu danh sách `baseTemplateIds`.

## Ghi chú / Kết quả
Đã hoàn thành toàn bộ checklist và xác nhận hoạt động ổn định ngày 2026-11-03.

