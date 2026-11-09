# Giai đoạn F1: Universal Custom Field System - Nền Tảng Core

> File: `docs/phases/phase-F1-custom-fields-core.md`  
> Giai đoạn: F1  
> Trạng thái: Hoàn thành  
> Phụ thuộc: GĐ 2, GĐ 3, GĐ 4, GĐ 4.1  
> Ngày bắt đầu: 2026-11-09  
> Ngày hoàn thành: 2026-11-09  

---

## 1. Mục tiêu Giai đoạn F1
1. Xây dựng **Field Registry Engine** (`src/fields/registry.js`) và cơ chế tự động nạp module định nghĩa từ `src/fields/definitions/`.
2. Mở rộng **Template Model** (`src/models/Template.js`) hỗ trợ các thuộc tính: `config`, `validation`, `visibility`, `permissions`, `layout` (tương thích ngược 100%).
3. Chuẩn hóa **8 loại trường hiện hữu** thành các definition module độc lập:
   - `Single-Line Text`, `Multi-Line Text`, `Rich Text`, `Checkbox`, `Date`, `Number`, `Droplist`, `Image`.
4. Bổ sung **6 loại trường mở rộng cơ bản**:
   - `Toggle Switch`, `Color Picker`, `Icon Picker`, `Tag Input`, `External Link`, `Markdown / Code`.
5. Xây dựng **Universal Form Renderer** phía EJS SSR:
   - `src/views/content-editor/fields/universal-renderer.ejs`
   - Bộ view partials tương ứng trong `src/views/content-editor/fields/`.
6. Tái cấu trúc [`item-form.ejs`](../../src/views/content-editor/item-form.ejs) và [`tab-standard-values.ejs`](../../src/views/admin/templates/partials/tab-standard-values.ejs) để dùng Universal Form Renderer thay thế cho chuỗi `if-else` cứng.
7. Cập nhật Modal tạo/sửa Field trong Template Manager ([`field-modal.ejs`](../../src/views/admin/templates/modals/field-modal.ejs)) để tải động danh sách Field Types theo nhóm danh mục từ Registry.
8. Viết bộ kiểm thử tự động toàn diện (`tests/fieldRegistry.test.js`) và bảo toàn 41/41 test suites (433/433 tests pass).

---

## 2. Checklist Công việc (Tasks)
- [x] **Task F1.1:** Khởi tạo cấu trúc thư mục `src/fields/definitions/` và xây dựng `src/fields/registry.js`.
- [x] **Task F1.2:** Viết 8 module định nghĩa trường hiện hữu (`single-line-text`, `multi-line-text`, `rich-text`, `checkbox`, `date`, `number`, `droplist`, `image`).
- [x] **Task F1.3:** Viết 6 module định nghĩa trường mở rộng (`toggle-switch`, `color-picker`, `icon-picker`, `tag-input`, `external-link`, `markdown`).
- [x] **Task F1.4:** Nâng cấp Schema `Template.js` bổ sung các trường cấu hình nâng cao (`config`, `validation`, `visibility`, `permissions`, `layout`).
- [x] **Task F1.5:** Xây dựng Universal Form Renderer (`universal-renderer.ejs`, `field-header.ejs` và 14 view templates tương ứng).
- [x] **Task F1.6:** Tái cấu trúc `item-form.ejs` và `tab-standard-values.ejs` dùng Universal Form Renderer.
- [x] **Task F1.7:** Cập nhật Template Manager `field-modal.ejs` để hiển thị động các loại trường từ Registry và lưu `colSpan` layout.
- [x] **Task F1.8:** Viết bộ test `tests/fieldRegistry.test.js`, chạy kiểm thử toàn hệ thống (41/41 suites, 433/433 tests PASS), kiểm tra branding/linter 0 lỗi.

---

## 3. Definition of Done (DoD)
- [x] Không cài đặt package ngoài (tuân thủ Rule 3).
- [x] Không thay đổi cấu trúc Item MongoDB (zero-migration).
- [x] Không commit git (tuân thủ Quy tắc Git).
- [x] 41/41 test suites đạt trạng thái PASS (100%).
- [x] Linter và Branding Audit đạt chuẩn 100%.
