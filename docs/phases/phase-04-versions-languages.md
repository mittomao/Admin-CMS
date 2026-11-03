---
phase: 4
name: Quản lý Phiên bản & Đa ngôn ngữ (Versions & Languages)
status: Chưa bắt đầu
depends_on: [2, 3]
estimate: 2.5 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 4 - Quản lý Phiên bản & Đa ngôn ngữ (Versions & Languages)
> Cơ chế Đa ngôn ngữ, Item Versioning, so sánh diff/rollback và thiết kế schema chừa chỗ cho Presentation (Shared & Final Layout).

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/versions-languages.md`](../data-model/versions-languages.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/decisions/DEC-020-presentation-shared-vs-final.md`](../decisions/DEC-020-presentation-shared-vs-final.md)

## Mục tiêu
Hoàn thiện cơ chế Đa ngôn ngữ (Multilingual) và Quản lý phiên bản (Item Versioning) chuẩn Sitecore: cho phép thêm phiên bản mới, chuyển đổi qua lại giữa các phiên bản/ngôn ngữ, so sánh khác biệt (Diff View) và khôi phục (Rollback); đồng thời thiết kế sẵn cấu trúc schema chừa chỗ cho Presentation (Shared Layout và Final Layout theo từng phiên bản/ngôn ngữ).

## Phạm vi
- **Làm:** Cấu hình danh mục ngôn ngữ hỗ trợ hệ thống (en, vi-VN, ja...); Cấu trúc lưu trữ Versioned, Unversioned, và Shared fields; Xác nhận và áp dụng thực tế cờ `isShared` và `isUnversioned` đã định nghĩa trên Template từ GĐ 3; Bộ chọn ngôn ngữ và version trên Ribbon/Header của Content Editor; Tính năng "Add Version", "Remove Version"; Màn hình so sánh hai phiên bản (Diff View làm nổi bật thay đổi); Khôi phục phiên bản cũ; **Thiết kế schema chừa chỗ cho Presentation:** cấu trúc trường `Item.presentation.shared` (cấp item) và `Item.presentation.final` (theo từng `lang + version`), cơ chế sao chép `finalLayout` từ version nguồn khi tạo version mới hoặc nhân bản version.
- **Không làm:** Chưa làm tự động dịch thuật (Auto-translate); **Chưa làm UI biên tập và nghiệp vụ Presentation** (được triển khai ở GĐ 6, GĐ 4 chỉ chuẩn bị cấu trúc schema và quy tắc sao chép version).

## Checklist Task
- [ ] **Task 4.1:** Tạo Model hoặc cấu hình hệ thống `Language` (`src/models/Language.js`) lưu trữ danh sách ngôn ngữ kích hoạt trong CMS (mã code, tên hiển thị, icon cờ quốc gia).
- [ ] **Task 4.2:** Nâng cấp `itemService.js` hỗ trợ đầy đủ cấu trúc phân cấp:
  - `getFieldsByLanguageAndVersion(itemId, langCode, versionNumber)`.
  - `createNewVersion(itemId, langCode, baseFromVersion)`: Sao chép dữ liệu từ version trước sang version mới với số hiệu tăng thêm 1; đồng thời **sao chép `finalLayout` của version nguồn** sang version mới.
  - `deleteVersion(itemId, langCode, versionNumber)`.
  - `resolveFieldValues(item, langCode, versionNumber)`: Gộp chính xác 3 cấp độ trường theo Template: Shared (dùng chung mọi ngôn ngữ/version) -> Unversioned (theo ngôn ngữ) -> Versioned (theo phiên bản cụ thể).
- [ ] **Task 4.3:** Thiết kế schema và migration chừa sẵn cấu trúc Presentation trên Model `Item`:
  - `presentation.shared`: lưu layout & renderings dùng chung cho toàn bộ item.
  - `presentation.final`: mảng các bản ghi theo `{ language, version, devices: [...] }` để sẵn sàng cho GĐ 6.
  - Đặt sẵn quy tắc phân giải presentation: Ưu tiên `finalLayout` của version hiện tại -> `sharedLayout` của item -> `standardPresentation` của template.
- [ ] **Task 4.4:** Xây dựng `diffHelper.js` so sánh 2 object trường dữ liệu, trả về danh sách trường thay đổi kèm highlight văn bản dạng diff HTML.
- [ ] **Task 4.5:** Bổ sung các Ribbon Tabs "Versions" trên Content Editor:
  - Nút chọn Ngôn ngữ (Language Switcher Dropdown).
  - Nút chọn Phiên bản (Version Switcher Dropdown).
  - Nút "Add Version" (tạo bản thảo mới).
  - Nút "Compare Versions" (mở modal so sánh).
  - Nút "Remove Version".
- [ ] **Task 4.6:** Xây dựng modal so sánh phiên bản `src/views/admin/content-editor/modals/compare-versions-modal.ejs` hiển thị 2 cột trực quan (Version A vs Version B).
- [ ] **Task 4.7:** Cập nhật Controller và Route xử lý các hành động Version và Language qua AJAX.

## File/Thư mục Dự kiến
- `src/models/Language.js`
- `src/utils/diffHelper.js`
- `src/views/admin/content-editor/modals/compare-versions-modal.ejs`
- Cập nhật: `Item.js`, `itemService.js`, `contentEditorController.js`, `contentEditorRoutes.js`, `ribbon.ejs`, `content-editor.js`

## Route / API Dự kiến
- `POST /admin/content-editor/item/:id/version/add`: Thêm version mới cho ngôn ngữ hiện tại.
- `POST /admin/content-editor/item/:id/version/delete`: Xóa version chỉ định.
- `GET /admin/content-editor/item/:id/compare?v1=1&v2=2&lang=en`: Lấy dữ liệu so sánh 2 phiên bản.

## Thay đổi Database
- Cập nhật collection `languages` và cấu trúc mảng `languages` trong collection `items_master`.
- Bổ sung trường `presentation` rỗng chuẩn hoá vào Schema `Item`.

## Definition of Done & Cách kiểm thử
- Mở một Item bất kỳ, đang ở ngôn ngữ `en` Version 1.
- Sửa Title từ "Hello" thành "Hello World", bấm Lưu.
- Bấm nút "Add Version" trên tab Versions của Ribbon -> Hệ thống tạo ra Version 2, số phiên bản trên giao diện chuyển thành "Version 2".
- Sửa Title thành "Hello Universe", bấm Lưu.
- Chuyển dropdown quay lại "Version 1" -> Form lập tức hiển thị lại giá trị "Hello World".
- Bấm nút "Compare Versions" -> Màn hình so sánh hiển thị rõ sự khác biệt giữa "Hello World" và "Hello Universe" (có màu xanh/đỏ đánh dấu diff).
- Chuyển sang ngôn ngữ `vi-VN` -> Hệ thống cho phép nhập nội dung tiếng Việt hoàn toàn tách biệt với tiếng Anh.
- Schema `Item` có sẵn trường `presentation.shared` và `presentation.final`; chạy test tạo version mới xác nhận cấu trúc presentation không bị lỗi và `finalLayout` được sao chép nguyên vẹn từ version cũ.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Nhầm lẫn giữa Shared Fields và Versioned Fields khiến việc chỉnh sửa ở version mới vô tình làm thay đổi giá trị của version cũ.
- *Giảm thiểu:* Kiểm tra chặt chẽ cờ `isShared` và `isUnversioned` trong `Template` trước khi quyết định vị trí ghi đè dữ liệu trong document MongoDB.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 4`)*

