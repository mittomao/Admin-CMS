---
phase: 6
name: Presentation (Layout, Rendering, Placeholder Settings & Presentation Details)
status: Chưa bắt đầu
depends_on: [2, 3, 4, 5]
estimate: 3–4 tuần
started: null
completed: null
updated: 2026-11-03
---

# GĐ 6 - Presentation (Layout, Rendering, Placeholder Settings & Presentation Details)
> Quản trị Headless Presentation: Devices, Layouts, Renderings, Placeholder Settings (`column-{*}`), modal Presentation Details với SortableJS, Standard Presentation và Delta Override.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/templates.md`](../data-model/templates.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-019-presentation-phase-position.md`](../decisions/DEC-019-presentation-phase-position.md)
- [`docs/decisions/DEC-020-presentation-shared-vs-final.md`](../decisions/DEC-020-presentation-shared-vs-final.md)
- [`docs/decisions/DEC-021-presentation-delta-resolution.md`](../decisions/DEC-021-presentation-delta-resolution.md)
- [`docs/decisions/DEC-022-dynamic-placeholder-matching.md`](../decisions/DEC-022-dynamic-placeholder-matching.md)
- [`docs/decisions/DEC-024-presentation-items-in-content-tree.md`](../decisions/DEC-024-presentation-items-in-content-tree.md)

## Mục tiêu
Xây dựng hệ thống quản lý Presentation (Layout, Rendering, Placeholder Settings) theo phong cách Sitecore cho kiến trúc Headless: lưu cấu hình bố cục trang, phân giải component cho React frontend (giống Sitecore JSS/Layout Service), hỗ trợ Standard Presentation kế thừa từ Template, phân định Shared Layout và Final Layout (theo phiên bản/ngôn ngữ), và giao diện biên tập Presentation Details trực quan với SortableJS.

## Phạm vi
- **Làm:**
  1. **Device (mức đơn giản):** `Default`, `Mobile` (cấu hình được), lưu trữ dưới dạng item dưới `/sitecore/layout/Devices`.
  2. **Layout:** Item dưới `/sitecore/layout/Layouts`: `name`, `componentName` (tên React layout), `placeholders[]` mặc định. Định nghĩa bởi Template hệ thống `Layout`.
  3. **Rendering:** Item dưới `/sitecore/layout/Renderings`: `componentName` (khớp React component), `datasourceTemplate`, `datasourceLocation`, `parametersTemplate`, `placeholders[]` mà nó cung cấp (hỗ trợ nesting), `icon`. Định nghĩa bởi Template hệ thống `Rendering`.
  4. **Placeholder Settings:** Item dưới `/sitecore/layout/Placeholder Settings`: `placeholderKey`, `allowedRenderings[]`, có hỗ trợ key động (ví dụ: `column-{*}` theo quy tắc khớp Regex ghi trong Decision Log).
  5. **Presentation Details của Item:** Cấu trúc `{ layoutId (theo device), renderings[{ uid, renderingId, placeholder, sortOrder, datasourceId, parameters }] }`. Giao diện (UI) trong Content Editor: chọn layout theo device, thêm/xoá/sắp xếp rendering (SortableJS), modal chọn rendering (lọc theo Placeholder Settings), chọn datasource item (Tree Picker), nhập parameters theo `parametersTemplate`, validate placeholder tồn tại và rendering được phép.
  6. **Standard Presentation (kế thừa từ Template):** Mở rộng `Template` có trường `presentation` (đặt ở Standard Values của template). Item mới tạo tự động thừa hưởng; Item chỉ lưu phần **override (delta)** so với standard presentation (ghi Decision Log). Có nút "Reset to standard presentation".
  7. **Ribbon Tab "Presentation":** Kích hoạt tab `PRESENTATION` trên Ribbon (các nút: Details, Layout Details, Reset, Preview JSON) bằng cơ chế ribbon config động.
  8. **Preview (đơn giản):** Nút/modal xem cấu trúc JSON Layout & Renderings của item (Layout Service format preview) cho lập trình viên (không render component trong admin).
  9. **Seed Data:** Khởi tạo các item hệ thống: Devices (`Default`, `Mobile`), Layouts (`MainLayout`), Renderings mẫu (`Hero`, `RichText`, `Promo`, `Navigation`), Placeholder Settings (`header`, `main`, `footer`, `content`, `column-{*}`).
  10. **Hàm dùng chung:** `presentationService.getFinalPresentation(item, device, lang, version)` trả về presentation đã gộp (standard + override) phục vụ cho giao diện Admin và cho Delivery API / Layout Service ở GĐ 10.
- **Không làm:** WYSIWYG / Experience Editor (soạn thảo trực tiếp trên trang live frontend dạng in-line), render component React trong Admin CMS, A/B testing, personalization, rules engine phức tạp, branch template, workflow riêng cho từng rendering.

## Checklist Task
- [ ] **Task 6.1:** Tạo các Template hệ thống cho Presentation (`Device`, `Layout`, `Rendering`, `Placeholder Settings`, `Rendering Parameters`) và script seed các item cấu hình ban đầu dưới `/sitecore/layout/`.
- [ ] **Task 6.2:** Mở rộng Mongoose Model `Template` với trường `presentation` (Standard Presentation) và mở rộng `Item` với cấu trúc `presentation: { shared: {...}, final: [...] }`.
- [ ] **Task 6.3:** Xây dựng `presentationService.js`:
  - CRUD cấu hình Presentation cho Item và Template.
  - Thuật toán gộp `getFinalPresentation(item, device, lang, version)` kết hợp Standard Presentation, Shared Layout và Final Layout theo cơ chế delta override dựa trên UID (UUID v4) của rendering instance.
  - Hàm validate Placeholder Settings: kiểm tra tính hợp lệ của placeholder key (bao gồm wildcard `column-{*}`) và danh sách `allowedRenderings`.
  - Hàm reset presentation về giá trị mặc định của Template (`resetToStandardPresentation`).
- [ ] **Task 6.4:** Xây dựng Controller và Route Presentation:
  - `GET /admin/content-editor/item/:id/presentation`: Trả về giao diện Partial HTML modal Presentation Details.
  - `POST /admin/content-editor/item/:id/presentation`: Lưu cấu hình Presentation (Shared hoặc Final theo version hiện hành).
  - `POST /admin/content-editor/item/:id/presentation/reset`: Reset presentation về Standard Presentation.
  - `GET /admin/content-editor/item/:id/presentation/preview`: Trả về JSON preview của presentation đã phân giải.
  - `GET /admin/presentation/renderings/allowed?placeholder=...`: Trả về danh sách rendering hợp lệ theo placeholder.
- [ ] **Task 6.5:** Thiết kế giao diện EJS Presentation Details:
  - Modal `presentation-details-modal.ejs`: Cho phép chuyển đổi giữa các Device tabs (`Default`, `Mobile`), chọn Layout, danh sách Renderings gom nhóm theo Placeholder.
  - Tích hợp SortableJS để kéo thả sắp xếp thứ tự các Rendering trong cùng Placeholder hoặc di chuyển giữa các Placeholders hợp lệ.
  - Modal `select-rendering-modal.ejs`: Hiển thị danh mục Rendering được phép chèn vào placeholder đang chọn.
  - Modal `rendering-instance-modal.ejs`: Cấu hình chi tiết 1 rendering: gán Datasource Item (Item Picker), nhập Parameters theo template.
- [ ] **Task 6.6:** Kích hoạt Tab "Presentation" trên Ribbon Content Editor (`src/config/ribbon.js`):
  - Cập nhật ribbon config: chuyển tab `presentation` từ disabled sang enabled ở GĐ 6.
  - Bổ sung các nút: "Presentation Details", "Reset", "Preview JSON".
- [ ] **Task 6.7:** Viết client-side script `presentation-details.js` xử lý mở modal, kéo thả SortableJS, chọn datasource, preview JSON và gửi AJAX lưu dữ liệu.

## File/Thư mục Dự kiến
- `src/services/presentationService.js`
- `src/controllers/admin/presentationController.js`
- `src/routes/admin/presentationRoutes.js`
- `src/views/admin/content-editor/presentation/details-modal.ejs`
- `src/views/admin/content-editor/presentation/select-rendering-modal.ejs`
- `src/views/admin/content-editor/presentation/rendering-instance-modal.ejs`
- `src/views/admin/content-editor/presentation/preview-json-modal.ejs`
- `src/public/js/presentation-details.js`, `src/public/css/presentation-details.css`
- `src/scripts/seed-presentation-data.js`

## Route / API Dự kiến
- `GET /admin/content-editor/item/:id/presentation`
- `POST /admin/content-editor/item/:id/presentation`
- `POST /admin/content-editor/item/:id/presentation/reset`
- `GET /admin/content-editor/item/:id/presentation/preview`
- `GET /admin/presentation/renderings/allowed`

## Thay đổi Database
- Mở rộng collection `templates`: trường `presentation` (Standard Presentation).
- Mở rộng collection `items_master`: trường `presentation` (`shared` & `final`).
- Tạo các Template hệ thống và các item mẫu dưới `/sitecore/layout/Devices`, `/sitecore/layout/Layouts`, `/sitecore/layout/Renderings`, `/sitecore/layout/Placeholder Settings`.
- Indexes: `{ "presentation.shared.devices.renderings.renderingId": 1 }`, `{ "presentation.final.devices.renderings.renderingId": 1 }`, `{ "presentation.shared.devices.renderings.datasourceId": 1 }`.

## Definition of Done & Cách kiểm thử
- Mở Content Editor, chọn node `/sitecore/content/home`. Tab `Presentation` trên Ribbon sáng và có thể tương tác.
- Bấm nút "Presentation Details" -> Mở modal hiển thị Device `Default`, Layout đang gán (`MainLayout`), và các Rendering mặc định được kế thừa từ Standard Presentation của Template.
- Thêm Rendering `Hero` vào placeholder `main`: Modal chọn rendering chỉ hiển thị những rendering hợp lệ theo Placeholder Settings của `main`.
- Chọn 1 item datasource cho rendering `Hero`, nhập thông số parameters (ví dụ `theme=dark`).
- Dùng chuột kéo thả sắp xếp đổi vị trí giữa `Hero` và `RichText` -> Thứ tự hiển thị thay đổi mượt mà.
- Bấm Lưu Presentation -> Dữ liệu lưu thành công vào MongoDB (lưu delta override).
- Bấm "Preview JSON" -> Modal hiển thị cấu trúc JSON đầy đủ của Layout và các Renderings theo từng Placeholder.
- Bấm "Reset to Standard Presentation" -> Cấu hình override bị xoá, presentation quay về trạng thái mặc định kế thừa từ Template.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Cơ chế override rendering phức tạp dẫn đến xung đột hoặc mất rendering khi template gốc thay đổi.
- *Giảm thiểu:* Định danh mỗi rendering instance bằng `uid` (UUID v4) bất biến; delta override lưu rõ hành động thêm mới, ghi đè thuộc tính hoặc xoá bỏ (tombstone) rendering so với standard.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 6`)*

