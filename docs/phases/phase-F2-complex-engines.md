# Giai đoạn F2: Universal Custom Field System - Động cơ Phức hợp (Complex Engines)

> File: `docs/phases/phase-F2-complex-engines.md`  
> Giai đoạn: F2  
> Trạng thái: Hoàn thành  
> Phụ thuộc: GĐ F1, GĐ 2, GĐ 3, GĐ 4, GĐ 4.1  
> Ngày bắt đầu: 2026-11-09  
> Ngày hoàn thành: 2026-11-09  

---

## 1. Mục tiêu Giai đoạn F2
1. **Repeater Engine (Động cơ Danh sách Lặp Động):**
   - Định nghĩa loại trường `Repeater` trong Registry ([`repeater.js`](../../src/fields/definitions/repeater.js)).
   - Cấu hình danh sách trường con (`subFields: [ ... ]`), `minItems`, `maxItems`, `addBtnText`.
   - Cấu trúc lưu trữ dữ liệu: Mảng các phần tử `[ { _uid: 'UUID', ...values }, ... ]`.
   - Giao diện EJS ([`repeater.ejs`](../../src/views/content-editor/fields/repeater.ejs)): Hỗ trợ thêm dòng mới, nhân bản dòng, xóa dòng, và kéo thả sắp xếp thứ tự mượt mà qua SortableJS.
   - Trình điều khiển client-side cho Repeater ([`repeater.js`](../../public/js/admin/fields/repeater.js)).

2. **Field Group & 12-Column Grid Layout Engine:**
   - Định nghĩa loại trường cấu trúc `Field Group` trong Registry ([`field-group.js`](../../src/fields/definitions/field-group.js)).
   - Hỗ trợ gom nhóm các trường liên quan thành khối Card hoặc Accordion có thể đóng/mở (collapsible), ghi nhớ trạng thái.
   - Hỗ trợ cấu hình chia lưới Grid (2 cột: `col-md-6`, 3 cột: `col-md-4`, 4 cột: `col-md-3`).

3. **Conditional Visibility Engine (Động cơ Điều kiện Hiển thị Reactive Phía Client):**
   - Xây dựng thư viện client-side [`conditional-visibility.js`](../../public/js/admin/fields/conditional-visibility.js).
   - Lắng nghe sự kiện `input`, `change` trên toàn bộ form nhập liệu Content Editor.
   - Đánh giá các toán tử điều kiện: `equals`, `notEquals`, `in`, `notIn`, `contains`, `truthy`, `falsy`.
   - Tự động ẩn/hiện mượt mà các trường phụ thuộc (`.field-outer-wrapper`) theo thời gian thực (real-time).

4. **Kiểm thử Tự động & Nghiệm thu (Testing & Verification):**
   - Viết test suite `tests/repeaterField.test.js` kiểm tra validation, sanitization và parsing mảng Repeater.
   - Viết test suite `tests/conditionalVisibility.test.js` kiểm tra logic đánh giá điều kiện.
   - Bảo đảm 100% test suites toàn hệ thống tiếp tục đạt PASS (43/43 suites, 448 tests).

---

## 2. Checklist Công việc (Tasks)
- [x] **Task F2.1:** Viết module định nghĩa trường `Repeater` (`src/fields/definitions/repeater.js`) và `Field Group` (`src/fields/definitions/field-group.js`).
- [x] **Task F2.2:** Xây dựng giao diện EJS `src/views/content-editor/fields/repeater.ejs` (Template hàng lặp, action bar, empty state).
- [x] **Task F2.3:** Xây dựng script client-side `public/js/admin/fields/repeater.js` xử lý thêm/xóa/sắp xếp SortableJS cho Repeater.
- [x] **Task F2.4:** Xây dựng giao diện EJS `src/views/content-editor/fields/field-group.ejs` hỗ trợ Card/Collapsible container.
- [x] **Task F2.5:** Xây dựng engine `public/js/admin/fields/conditional-visibility.js` và tích hợp vào Content Editor SSR layout.
- [x] **Task F2.6:** Cập nhật Modal Template Manager (`field-modal.ejs`) để cấu hình `subFields` cho Repeater và thiết lập `visibility` (dependsOn, operator, value).
- [x] **Task F2.7:** Viết bộ test `tests/repeaterField.test.js` & `tests/conditionalVisibility.test.js` và chạy kiểm thử toàn diện hệ thống.

---

## 3. Definition of Done (DoD)
- [x] Không cài thêm package bên ngoài (sử dụng SortableJS và native DOM sẵn có).
- [x] Mảng Repeater lưu trữ đúng chuẩn `_uid` UUID trong Mongoose `Map<String, Mixed>`.
- [x] Kiểm thử tự động đạt 100% PASS (43/43 suites, 448/448 tests PASS), không gây hồi quy (zero regressions).
