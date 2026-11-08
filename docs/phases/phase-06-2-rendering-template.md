---
phase: 6.2
name: Rendering Component Template & Effective Field Resolution
status: Hoàn thành
depends_on: [6]
estimate: 3–5 ngày
started: 2026-11-04
completed: 2026-11-04
updated: 2026-11-04
---

# GĐ 6.2 — Rendering Gắn Component Template & Cơ Chế Suy Ra Trường Hiệu Lực (Effective Template)

> Hiện thực hóa cơ chế phân tách hoàn toàn giữa Page Template và Component Template: Item Rendering mang thuộc tính `componentTemplate`, Page Template không cần kế thừa qua `baseTemplates`; Content Editor và Site Renderer tự động suy ra các trường nhập liệu thông qua thuật toán `templateService.resolveEffectiveTemplate(item, lang, version)`.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/data-model/templates.md`](../data-model/templates.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`](../decisions/DEC-031-server-side-ejs-renderer-architecture.md)
- [`docs/decisions/DEC-032-three-branch-layout-tree-structure.md`](../decisions/DEC-032-three-branch-layout-tree-structure.md)
- [`docs/decisions/DEC-035-component-field-inheritance-and-context.md`](../decisions/DEC-035-component-field-inheritance-and-context.md)
- [`docs/decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md`](../decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- [`docs/open-questions.md`](../open-questions.md)

---

## 1. Bảng Hiện trạng vs Yêu cầu Mới vs Hành động vs Rủi ro

| Hạng mục | Hiện trạng (GĐ 6 ban đầu) | Yêu cầu Mới (GĐ 6.2) | Hành động Cụ thể | Mức độ Rủi ro & Giảm thiểu |
| :--- | :--- | :--- | :--- | :--- |
| **Thuộc tính Rendering Item** | Field `componentTemplate` là tùy chọn, kiểu chuỗi đơn giản trong template `Rendering`. | `componentTemplate` là **bắt buộc**, kiểu tham chiếu ID chọn từ `/root/templates/Feature/Components`. | **Sửa:** Cập nhật schema/template `Rendering`; dùng `ItemPicker` hoặc select picker lọc đúng nhánh thư mục; validate server chặn template ngoài nhánh hoặc template hệ thống/folder. | **Thấp.** Có sẵn helper `ItemPicker` và validate server chặt chẽ. |
| **Kế thừa Page Template** | Page Template (`Home`, `About us`) khai báo `baseTemplates` trỏ tới `HeroBanner`, `Introduction`, `ImageText`. | Page Template **không** kế thừa Component Template. Base templates chỉ dùng cho cấu trúc trang (`_BasePage`...). | **Sửa & Chuyển đổi:** Gỡ bỏ các component template ra khỏi `baseTemplates` của Page Template trong seed và DB qua migration. | **Trung bình.** Cần chứng minh không mất dữ liệu field cũ của Item nhờ lưu theo `fieldId`. |
| **Phân giải Trường Item** | Gọi `templateService.resolveTemplate(item.templateId)` (chỉ đọc theo cây `baseTemplates`). | Gọi `templateService.resolveEffectiveTemplate(item, lang, version)` kết hợp template gốc + component templates từ Presentation thực tế. | **Tạo mới & Sửa:** Viết hàm `resolveEffectiveTemplate`, thay thế mọi điểm gọi `resolveTemplate` của Item trong `itemService`, `versionService`, SSR renderer. | **Trung bình.** Cần bộ nhớ đệm (Cache) và cơ chế Invalidation khi đổi presentation/template. |
| **Giao diện Content Editor** | Các section hiển thị phẳng theo template gốc và base template, dễ xung đột nếu trùng tên trường. | Các trường của từng component gom thành **Section riêng biệt** theo tên component (`HeroBanner`...), kèm badge `từ rendering <Tên>`. | **Sửa:** Cập nhật `item-form.ejs` và logic build schema trong `itemService.getItemWithRenderSchema`. | **Thấp.** UI rõ ràng, trực quan hơn nhiều cho người dùng. |
| **Presentation Details Modal** | Thêm rendering chỉ chọn rendering theo placeholder. | Hiển thị thông tin Component Template của rendering (`Template: HeroBanner`) và preview danh sách trường sẽ sinh ra trên trang. | **Sửa:** Cập nhật `select-rendering-modal.ejs` và `presentation-details.js`. | **Thấp.** Chỉ bổ sung thông tin trực quan. |
| **Template Manager** | Tab Base Templates hiển thị phẳng tất cả templates. | Cảnh báo khi người dùng chọn template từ `Feature/Components` làm base template. Hiển thị khu vực "Fields từ Renderings" (chỉ đọc). | **Sửa:** Cập nhật `tab-inheritance.ejs` và `tab-builder.ejs`. | **Thấp.** Tăng cường tính tiện ích và an toàn. |
| **Ràng buộc Toàn vẹn** | Cho phép xóa hoặc di chuyển template bất kỳ nếu không có `baseTemplates` kế thừa. | Chặn xóa hoặc di chuyển Component Template nếu đang có Rendering tham chiếu. Đổi `componentTemplate` cảnh báo số item bị ảnh hưởng. | **Sửa:** Bổ sung hàm kiểm tra ràng buộc `checkComponentTemplateUsage` trong `templateService`. | **Thấp.** Ngăn chặn hỏng dữ liệu liên kết. |

---

## 2. Kế hoạch Migration Dữ liệu (Data Migration Plan)

Tạo script migration độc lập: `src/scripts/migrate-rendering-component-templates.js`.
- **Cảnh báo an toàn:** Script hiển thị nhắc nhở người dùng sao lưu Database (`mongodump`) trước khi thực thi.
- **Tham số thực thi:**
  - `node src/scripts/migrate-rendering-component-templates.js --dry-run`: Chạy mô phỏng, quét và in chi tiết những gì sẽ thay đổi mà không ghi vào DB.
  - `node src/scripts/migrate-rendering-component-templates.js`: Thực hiện cập nhật thực tế (idempotent, chạy nhiều lần không lỗi).
  - `node src/scripts/migrate-rendering-component-templates.js --rollback`: Khôi phục lại trạng thái trước migration (dựa trên bản snapshot lưu trữ tạm).
- **Các bước migration:**
  1. Quét toàn bộ Rendering Item dưới `/root/layout/Renderings/`:
     - Nếu rendering chưa có `componentTemplate`: Tự động tìm Template tương ứng trong `/root/templates/Feature/Components/` theo tên (ví dụ rendering `HeroBanner` $\leftrightarrow$ template `HeroBanner`).
     - Gán ID của component template vào trường `componentTemplate` của rendering.
     - Nếu rendering không khớp được template nào: In cảnh báo danh sách các rendering chưa được gán để quản trị viên tự cấu hình thủ công (tuyệt đối không đoán mò).
  2. Quét toàn bộ Page Template dưới `/root/templates/Project/Pages/`:
     - Kiểm tra mảng `baseTemplates`. Nếu có chứa ID của template thuộc `/root/templates/Feature/Components/`, loại bỏ các ID này khỏi mảng `baseTemplates`.
     - Giữ nguyên các base templates khác (như `_BasePage`, `_BaseSEO`).
  3. Kiểm tra tính toàn vẹn của Content Items (`items_master`):
     - Xác nhận các giá trị trường đã nhập trước đó (lưu theo `fieldId`) vẫn tồn tại nguyên vẹn trong DB.
     - Chạy thử `resolveEffectiveTemplate` cho các item `Home`, `About-Us` để xác nhận toàn bộ các trường của component vẫn hiển thị đầy đủ.

---

## 3. Checklist Task Chi Tiết

- [x] **Task 6.2.1:** Cập nhật System Template `Rendering` và Mongoose Schema:
  - Trường `componentTemplate` (ObjectId, bắt buộc), tham chiếu tới Template thuộc `/root/templates/Feature/Components/`.
  - Validate server khi lưu/sửa Rendering Item: `componentTemplate` tồn tại, nằm đúng nhánh thư mục, không phải Folder và không phải System Template.
- [x] **Task 6.2.2:** Ràng buộc toàn vẹn xóa/di chuyển Component Template:
  - Xây dựng hàm `templateService.checkComponentTemplateUsage(templateId)`: kiểm tra danh sách Rendering đang tham chiếu.
  - Chặn xóa hoặc di chuyển template ra khỏi `Feature/Components` nếu đang có Rendering tham chiếu; trả về lỗi 400 kèm danh sách Rendering.
  - Cảnh báo khi biên tập viên thay đổi `componentTemplate` của một Rendering đang được dùng trong Presentation: trả về số lượng Page Template và Content Item bị ảnh hưởng.
- [x] **Task 6.2.3:** Xây dựng hàm cốt lõi `templateService.resolveEffectiveTemplate(item, lang, version)`:
  - Hợp nhất `resolveTemplate(item.templateId)` với các `componentTemplate` từ `presentationService.getFinalPresentation(item, lang, version)`.
  - Gom nhóm trường của từng component thành các Section riêng mang tên Component, gắn badge `origin: { templateName, isComponent: true, renderingName }`.
  - Hỗ trợ Dynamic Standard Values từ Component Template cho Page Item.
  - Triển khai In-Memory Cache theo key `[itemId, lang, version]` và cơ chế Cache Invalidation khi Presentation hoặc Template thay đổi.
- [x] **Task 6.2.4:** Thay thế `resolveTemplate` bằng `resolveEffectiveTemplate` cho toàn bộ nghiệp vụ Item:
  - `itemService.getItemWithRenderSchema` (Content Editor form rendering).
  - `itemService.updateFields` (Xác thực dữ liệu và quyền sửa trường).
  - `versionService.saveVersionFields` (Phân định phạm vi shared/unversioned/versioned của trường).
  - `itemService.createFromTemplate` (Khởi tạo item và áp dụng Standard Values).
  - `versionService.resolveFields` (Phân giải giá trị trường cho SSR / view).
- [x] **Task 6.2.5:** Cập nhật Giao diện Content Editor & Presentation Modals:
  - `src/views/content-editor/item-form.ejs`: Hiển thị các Section theo Component với icon và badge nguồn `từ rendering <Tên Component>`.
  - `src/views/admin/content-editor/presentation/select-rendering-modal.ejs` & `presentation-details.js`: Hiển thị nhãn `Template: <Tên Template>` và preview các trường khi chọn Rendering.
  - `src/views/admin/templates/partials/tab-inheritance.ejs`: Hiển thị cảnh báo nếu chọn template thuộc `Feature/Components`.
  - `src/views/admin/templates/partials/tab-builder.ejs`: Hiển thị mục "Fields từ Renderings" (chỉ đọc, suy ra từ Standard Presentation).
- [x] **Task 6.2.6:** Xây dựng Script Migration & Cập nhật Seed Script:
  - Tạo `src/scripts/migrate-rendering-component-templates.js` (hỗ trợ `--dry-run`, idempotent, thông báo backup DB).
  - Cập nhật `src/scripts/seed-presentation-data.js`: Renderings được gắn `componentTemplate` trực tiếp; Page Templates `Home` và `About us` không còn chứa Component Templates trong `baseTemplates`.
- [x] **Task 6.2.7:** Viết Bộ Unit & Integration Tests Toàn diện:
  - Unit test `resolveEffectiveTemplate`: thứ tự rendering, nhiều component, component trùng lặp (dùng chung field), trùng tên trường giữa base template và component template.
  - Test bảo toàn dữ liệu: gỡ rendering khỏi presentation thì trường ẩn nhưng DB còn nguyên; thêm lại rendering thì trường và dữ liệu xuất hiện lại.
  - Test validate `componentTemplate`: từ chối template sai nhánh, template hệ thống hoặc folder.
  - Test ràng buộc toàn vẹn: chặn xóa/di chuyển template đang được rendering dùng; đổi `componentTemplate` cảnh báo đúng.
  - Test Standard Values kế thừa từ component template sang item mới.
  - Test migration script: chạy thử `--dry-run`, chạy thực tế, kiểm tra không làm mất dữ liệu.
  - Test hồi quy toàn bộ hệ thống: 100% test suites GĐ 0–6 PASS, ESLint 0 errors, 0 warnings.

---

## 4. Definition of Done & Tiêu Chí Kiểm Thử (DoD)

- [x] Form biên tập Rendering có trường chọn `componentTemplate`, chỉ cho phép chọn template nằm dưới `/root/templates/Feature/Components/`.
- [x] Thêm Rendering vào Standard Presentation của Page Template hoạt động trực quan, không đòi hỏi và không hiển thị bước chọn base template cho component.
- [x] Mở một Page Item trên Content Editor: các trường của component xuất hiện đầy đủ, tự động gom thành từng Section riêng theo tên component và có badge nguồn rõ ràng.
- [x] Thử gỡ một Rendering khỏi Presentation của Item: các trường của component đó ẩn khỏi form, nhưng dữ liệu trong DB không bị xoá. Thêm lại Rendering đó vào Presentation: các trường và dữ liệu cũ tự động hiển thị lại nguyên vẹn.
- [x] Các giá trị Standard Values trên Component Template tự động áp dụng chính xác cho Page Item mới tạo.
- [x] Thử xoá hoặc di chuyển một Component Template đang được một Rendering sử dụng: Hệ thống chặn lại và báo lỗi danh sách rendering đang dùng.
- [x] Chạy script migration với cờ `--dry-run` in thông tin chính xác; chạy migration thực tế chuyển đổi thành công toàn bộ dữ liệu hiện có mà không làm mất trường nào.
- [x] Kiểm thử hiển thị EJS SSR: Trang web đọc đúng các giá trị trường của từng component từ chính Page Item.
- [x] Toàn bộ test suite tự động (`npm test`) đạt 100% PASS, ESLint 0 errors, 0 warnings.
- [x] Tài liệu kỹ thuật đồng bộ hoàn toàn (`templates.md`, `presentation.md`, `DEC-036`, `phases/README.md`).

---

## 5. Ghi Chú Hoàn Thành
- **Ngày hoàn thành:** 2026-11-04.
- **Báo cáo nghiệm thu:** Xem chi tiết tại [`docs/reports/phase-06-2-report.md`](../reports/phase-06-2-report.md).
- **Kết quả kiểm thử:** 15/15 test suites đạt PASS (144/144 tests), ESLint 0 errors, 0 warnings.


