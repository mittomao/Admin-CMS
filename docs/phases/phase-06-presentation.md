---
phase: 6
name: Presentation (Server-Side EJS Layout, Rendering, Placeholders & Presentation Details)
status: Hoàn thành
depends_on: [2, 3, 4, 5]
estimate: 2–3 tuần
started: 2026-11-04
completed: 2026-11-04
updated: 2026-11-04
---

# GĐ 6 - Presentation (Layout, Rendering, Placeholders & Presentation Details)
> Quản trị Server-Side EJS Presentation: Cây cấu trúc 3 nhánh (`Layouts`, `Placeholders`, `Renderings`), thuộc tính `viewPath`, modal Presentation Details với SortableJS, Standard Presentation kết hợp Base Component Templates, và thuật toán phân giải `getFinalPresentation`.
> 
> **[Ghi chú Quan trọng - Điều chỉnh bởi GĐ 5.1]:** Các Rendering Components sử dụng trường hình ảnh (`Image`) và Rich Text được kết xuất thông qua Cloudinary CDN URLs (`secure_url` kèm transformation) do Item Media cung cấp theo [`phase-05-1-cloudinary-media.md`](./phase-05-1-cloudinary-media.md).

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/templates.md`](../data-model/templates.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`](../decisions/DEC-031-server-side-ejs-renderer-architecture.md)
- [`docs/decisions/DEC-032-three-branch-layout-tree-structure.md`](../decisions/DEC-032-three-branch-layout-tree-structure.md)
- [`docs/decisions/DEC-033-viewpath-and-template-security.md`](../decisions/DEC-033-viewpath-and-template-security.md)
- [`docs/decisions/DEC-034-public-url-resolution-rules.md`](../decisions/DEC-034-public-url-resolution-rules.md)
- [`docs/decisions/DEC-035-component-field-inheritance-and-context.md`](../decisions/DEC-035-component-field-inheritance-and-context.md)

## Mục tiêu
Xây dựng phân hệ Presentation quản lý bố cục và giao diện website theo kiến trúc 100% Server-Side EJS:
- Tổ chức quản trị cây `/sitecore/layout` với đúng 3 nhánh (`Layouts`, `Placeholders`, `Renderings`).
- Quản lý layout và component thông qua thuộc tính `viewPath` trỏ trực tiếp đến các file EJS trong thư mục `src/views/site/`.
- Hỗ trợ Standard Presentation trên Page Template và cơ chế kế thừa Component Templates làm base templates.
- Giao diện biên tập Presentation Details trực quan (kéo thả sắp xếp SortableJS, chọn rendering theo placeholder).
- Hàm phân giải bố cục `presentationService.getFinalPresentation(item, lang, version)` kết hợp giữa Standard Presentation của template và Final Layout override trên version.

## Phạm vi
- **Làm:**
  1. **Template hệ thống Presentation:**
     - `Layout`: chứa field `viewPath` (đường dẫn tương đối trong `src/views/site/layouts/`).
     - `Placeholder`: chứa fields `placeholderKey` (ví dụ `header`, `maincontent`, `footer`), `allowedRenderings[]` (danh sách ID rendering được phép chèn, để trống = cho phép tất cả).
     - `Rendering`: chứa fields `viewPath` (đường dẫn tương đối trong `src/views/site/components/`), `componentTemplate` (ID của template chứa các trường nội dung tương ứng dưới `Feature/Components`), `parametersTemplate` (tuỳ chọn), `icon`.
     - Thư mục nhóm: `Layout Folder`, `Placeholder Folder`, `Rendering Folder`.
  2. **Tái cấu trúc Cây Presentation (`/sitecore/layout/`):**
     - Đúng 3 nhánh con cốt lõi: `/sitecore/layout/Layouts`, `/sitecore/layout/Placeholders`, `/sitecore/layout/Renderings`.
     - Loại bỏ hoàn toàn node `Devices` và `Placeholder Settings`.
     - Thiết lập Insert Options nghiêm ngặt và cơ chế bảo vệ node hệ thống (khóa rename, move, delete).
  3. **Seed Data Ban đầu:**
     - Layout: `HomeLayout` (`site/layouts/HomeLayout.ejs`).
     - Placeholders: `header`, `maincontent`, `footer`.
     - Renderings: `HeroBanner` (`site/components/HeroBanner.ejs`), `Introduction` (`site/components/Introduction.ejs`), `ImageText` (`site/components/ImageText.ejs`).
     - Component Templates: `HeroBanner` (fields: `BackgroundImage`, `HeroTitle`, `HeroDescription`), `Introduction` (fields: `IntroHeading`, `IntroBody`), `ImageText` (fields: `Image`, `Title`, `Body`, `Alignment`).
     - Page Templates: `Home` và `About us` dưới `/sitecore/templates/Project/Pages/`, kế thừa các Component Template trên qua `base_templates` và cấu hình Standard Presentation sẵn có.
     - Các file EJS mẫu tương ứng trong repo (`src/views/site/layouts/HomeLayout.ejs`, `src/views/site/components/*.ejs`).
  4. **Kiểm tra an toàn `viewPath`:**
     - Whitelist thư mục gốc `src/views/site/`.
     - Chặn path traversal (`..`), bắt buộc đuôi `.ejs`.
     - Kiểm tra file tồn tại trên đĩa khi lưu trong Content Editor (cảnh báo nếu file chưa tồn tại).
  5. **Presentation Details Modal trong Content Editor:**
     - Modal giao diện EJS: chọn Layout cho trang, danh sách Renderings gom nhóm theo Placeholder.
     - Tích hợp SortableJS kéo thả sắp xếp thứ tự rendering trong cùng placeholder hoặc chuyển sang placeholder hợp lệ khác.
     - Modal thêm Rendering: chỉ lọc các rendering có trong `allowedRenderings` của placeholder đang chọn (hoặc tất cả nếu placeholder không giới hạn).
     - Hỗ trợ Shared Presentation và Final Presentation (override theo từng ngôn ngữ và version).
     - Nút "Reset to standard presentation": xóa override trên item, khôi phục cấu hình mặc định từ template.
  6. **Tầng Service & Thuật toán Phân giải Presentation:**
     - `presentationService.getFinalPresentation(item, lang, version)`: kết hợp Standard Presentation của Template và Final Layout override trên version.
     - Mặc định dữ liệu component được phân giải trực tiếp từ fields của chính Page Item (nhờ kế thừa Component Template).
  7. **Ribbon Tab "Presentation":**
     - Kích hoạt tab `PRESENTATION` trên Ribbon Content Editor (các nút: Details, Reset to Standard).
- **Không làm:**
  - Thiết bị Devices (Mobile, Print...), React components, JSON Layout Service REST API cho client ngoài, Experience Editor / WYSIWYG trực tiếp trên frontend.

## Checklist Task
- [x] **Task 6.1:** Khởi tạo System Templates cho Presentation (`Layout`, `Placeholder`, `Rendering`, `Layout Folder`, `Placeholder Folder`, `Rendering Folder`) với thuộc tính `viewPath`, `placeholderKey`, `allowedRenderings`, `componentTemplate`.
- [x] **Task 6.2:** Xây dựng script seed cây `/sitecore/layout/` với đúng 3 nhánh (`Layouts`, `Placeholders`, `Renderings`), loại bỏ Devices và Placeholder Settings cũ nếu có.
- [x] **Task 6.3:** Khởi tạo Component Templates mẫu dưới `/sitecore/templates/Feature/Components/` (`HeroBanner`, `Introduction`, `ImageText`) và Page Templates mẫu dưới `/sitecore/templates/Project/Pages/` (`Home`, `About us`) với kế thừa `base_templates` và Standard Presentation.
- [x] **Task 6.4:** Tạo các file view mẫu EJS trong thư mục `src/views/site/layouts/HomeLayout.ejs` và `src/views/site/components/{HeroBanner,Introduction,ImageText}.ejs`.
- [x] **Task 6.5:** Xây dựng cơ chế xác thực an toàn `viewPath` (`validateViewPath`) chặn path traversal, ép đuôi `.ejs` và kiểm tra sự tồn tại của file.
- [x] **Task 6.6:** Cập nhật Mongoose Model `Item` và `Template` cấu trúc presentation mới (loại bỏ device key), hỗ trợ `layoutId` và danh sách `renderings` (`{ uid, renderingId, placeholderKey, sortOrder, datasourceId, parameters }`).
- [x] **Task 6.7:** Cập nhật `presentationService.js`:
  - CRUD cấu hình Presentation cho Item và Template.
  - Thuật toán `getFinalPresentation(item, lang, version)`: Final Layout > Shared Layout > Template Standard Presentation.
  - Hàm kiểm tra `allowedRenderings` theo Placeholder item.
  - Hàm reset presentation về giá trị của Page Template.
- [x] **Task 6.8:** Xây dựng Presentation Controller và Route:
  - `GET /admin/content-editor/item/:id/presentation`: Partial HTML modal Presentation Details.
  - `POST /admin/content-editor/item/:id/presentation`: Lưu cấu hình Presentation (Shared hoặc Final).
  - `POST /admin/content-editor/item/:id/presentation/reset`: Reset về Standard Presentation.
  - `GET /admin/presentation/renderings/allowed?placeholderId=...`: Lọc rendering hợp lệ cho placeholder.
- [x] **Task 6.9:** Cập nhật giao diện modal EJS và script client-side:
  - Cập nhật `details-modal.ejs` (bỏ tab device, hiển thị layout và danh sách renderings theo placeholder).
  - Cập nhật `select-rendering-modal.ejs` lọc theo `allowedRenderings`.
  - Cập nhật `presentation-details.js` tích hợp SortableJS kéo thả sắp xếp và lưu AJAX.
- [x] **Task 6.10:** Cập nhật cấu hình Ribbon `src/config/ribbon.js`: bật tab `PRESENTATION`, các nút Details và Reset.
- [x] **Task 6.11:** Viết bộ Unit & Integration Tests cho Presentation Service, validate `viewPath`, phân giải presentation và các API admin.

## File/Thư mục Dự kiến
- `src/services/presentationService.js`
- `src/controllers/admin/presentationController.js`
- `src/routes/admin/presentationRoutes.js`
- `src/views/admin/content-editor/presentation/details-modal.ejs`
- `src/views/admin/content-editor/presentation/select-rendering-modal.ejs`
- `src/views/site/layouts/HomeLayout.ejs`
- `src/views/site/components/HeroBanner.ejs`
- `src/views/site/components/Introduction.ejs`
- `src/views/site/components/ImageText.ejs`
- `public/js/admin/presentation-details.js`
- `src/scripts/seed-presentation-data.js`
- `tests/presentationService.test.js`

## Route / API Dự kiến
- `GET /admin/content-editor/item/:id/presentation`
- `POST /admin/content-editor/item/:id/presentation`
- `POST /admin/content-editor/item/:id/presentation/reset`
- `GET /admin/presentation/renderings/allowed`

## Thay đổi Database
- Collection `templates`: lưu `presentation` (Standard Presentation) với cấu trúc `layoutId` và mảng `renderings`.
- Collection `items_master`: lưu `presentation.shared` và `presentation.final` (theo language & version) với cấu trúc `layoutId` và mảng `renderings`.
- Cây `/sitecore/layout/`: có 3 nhánh chính `Layouts`, `Placeholders`, `Renderings`.

## Definition of Done & Cách kiểm thử
- [x] Mở Content Editor, chọn node `/sitecore/content/Home`. Tab `Presentation` trên Ribbon sáng và có thể tương tác.
- [x] Bấm nút "Presentation Details" -> Mở modal hiển thị Layout đang gán (`HomeLayout`), và các Rendering mặc định được kế thừa từ Standard Presentation của Template (`HeroBanner`, `Introduction`, `ImageText` trong placeholder `maincontent`).
- [x] Nhập `viewPath` sai hoặc cố tình chứa `../` -> Hệ thống báo lỗi từ chối lưu.
- [x] Thêm Rendering vào placeholder: Modal chỉ hiển thị các rendering hợp lệ theo cấu hình `allowedRenderings` của Placeholder item đó.
- [x] Kéo thả sắp xếp đổi vị trí giữa các rendering trong placeholder -> Thứ tự `sortOrder` thay đổi mượt mà.
- [x] Bấm Lưu Presentation -> Cấu hình lưu thành công vào MongoDB dưới dạng Final Layout override.
- [x] Bấm "Reset to Standard Presentation" -> Cấu hình override bị xoá, presentation quay về trạng thái mặc định kế thừa từ Template.
- [x] Nhánh cây `/sitecore/layout` hiển thị đúng 3 folder chính (`Layouts`, `Placeholders`, `Renderings`). Các node cốt lõi không thể đổi tên, di chuyển hoặc xoá.
- [x] Bộ Unit & Integration Tests đạt 100% PASS, lint 0 errors.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Cấu hình `viewPath` trỏ đến file EJS không tồn tại khiến server bị lỗi khi render trang public.
- *Giảm thiểu:* Kiểm tra file tồn tại ngay khi lưu cấu hình trong Content Editor; ở runtime áp dụng cơ chế Error Boundary để component lỗi không làm sập toàn bộ trang.

## Ghi chú / Trạng thái
**Hoàn thành.** Đã nghiệm thu toàn bộ 11/11 tasks, DoD xác thực 100% PASS (14/14 test suites, 129/129 tests), 0 lint error/warning. Đã tạo báo cáo `docs/reports/phase-06-report.md`. Sẵn sàng cho GĐ 7.
