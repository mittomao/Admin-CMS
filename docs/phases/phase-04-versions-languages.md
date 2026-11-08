---
phase: 4
name: Quản lý Phiên bản & Đa ngôn ngữ (Versions & Languages)
status: Hoàn thành
depends_on: [2, 3]
estimate: 2.5 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
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
Hoàn thiện cơ chế Đa ngôn ngữ (Multilingual) và Quản lý phiên bản (Item Versioning) chuẩn Treecraft: cho phép thêm phiên bản mới, chuyển đổi qua lại giữa các phiên bản/ngôn ngữ, so sánh khác biệt (Diff View) và khôi phục (Rollback); đồng thời thiết kế sẵn cấu trúc schema chừa chỗ cho Presentation (Shared Layout và Final Layout theo từng phiên bản/ngôn ngữ).

## Phạm vi
- **Làm:** Cấu hình danh mục ngôn ngữ hỗ trợ hệ thống (en, vi-VN, ja...); Cấu trúc lưu trữ Versioned, Unversioned, và Shared fields; Xác nhận và áp dụng thực tế cờ `isShared` và `isUnversioned` đã định nghĩa trên Template từ GĐ 3; Bộ chọn ngôn ngữ và version trên Ribbon/Header của Content Editor; Tính năng "Add Version", "Remove Version"; Màn hình so sánh hai phiên bản (Diff View làm nổi bật thay đổi); Khôi phục phiên bản cũ; **Thiết kế schema chừa chỗ cho Presentation:** cấu trúc trường `Item.presentation.shared` (cấp item) và `Item.presentation.final` (theo từng `lang + version`), cơ chế sao chép `finalLayout` từ version nguồn khi tạo version mới hoặc nhân bản version.
- **Không làm:** Chưa làm tự động dịch thuật (Auto-translate); **Chưa làm UI biên tập và nghiệp vụ Presentation** (được triển khai ở GĐ 6, GĐ 4 chỉ chuẩn bị cấu trúc schema và quy tắc sao chép version).

## Checklist Task
- [x] **Task 4.1:** Tạo Model hoặc cấu hình hệ thống `Language` (`src/models/Language.js`) lưu trữ danh sách ngôn ngữ kích hoạt trong CMS (mã code, tên hiển thị, icon cờ quốc gia).
- [x] **Task 4.2:** Nâng cấp `itemService.js` và `versionService.js` hỗ trợ đầy đủ cấu trúc phân cấp:
  - `getFieldsByLanguageAndVersion(itemId, langCode, versionNumber)`.
  - `createNewVersion(itemId, langCode, baseFromVersion)`: Sao chép dữ liệu từ version trước sang version mới với số hiệu tăng thêm 1; đồng thời **sao chép `finalLayout` của version nguồn** sang version mới (DEC-026).
  - `deleteVersion(itemId, langCode, versionNumber)`: Chặn xóa version duy nhất còn lại của một ngôn ngữ.
  - `resolveFieldValues(item, langCode, versionNumber)`: Gộp chính xác 3 cấp độ trường theo Template: Shared (dùng chung mọi ngôn ngữ/version) -> Unversioned (theo ngôn ngữ) -> Versioned (theo phiên bản cụ thể) (DEC-027).
- [x] **Task 4.3:** Thiết kế schema và migration chừa sẵn cấu trúc Presentation trên Model `Item`:
  - `presentation.shared`: lưu layout & renderings dùng chung cho toàn bộ item.
  - `presentation.final`: mảng các bản ghi theo `{ language, version, devices: [...] }` để sẵn sàng cho GĐ 6.
  - Đặt sẵn quy tắc phân giải presentation: Ưu tiên `finalLayout` của version hiện tại -> `sharedLayout` của item -> `standardPresentation` của template.
- [x] **Task 4.4:** Xây dựng `diffHelper.js` so sánh 2 object trường dữ liệu, trả về danh sách trường thay đổi kèm highlight văn bản dạng diff HTML và sanitize an toàn XSS.
- [x] **Task 4.5:** Bổ sung các Ribbon Tabs "Versions" trên Content Editor:
  - Nút chọn Ngôn ngữ (Language Switcher Dropdown).
  - Nút chọn Phiên bản (Version Switcher Dropdown).
  - Nút "Add Version" (tạo bản thảo mới).
  - Nút "Compare Versions" (mở modal so sánh).
  - Nút "Remove Version".
- [x] **Task 4.6:** Xây dựng modal so sánh phiên bản `src/views/admin/content-editor/modals/compare-versions-modal.ejs` hiển thị 2 cột trực quan (Version A vs Version B).
- [x] **Task 4.7:** Cập nhật Controller và Route xử lý các hành động Version và Language qua AJAX.

## File/Thư mục Dự kiến
- `src/models/Language.js`
- `src/services/versionService.js`
- `src/utils/diffHelper.js`
- `src/views/content-editor/modals/version-history-modal.ejs`
- `src/views/content-editor/modals/compare-versions-modal.ejs`
- `src/views/content-editor/modals/add-version-modal.ejs`
- `src/views/content-editor/modals/add-language-modal.ejs`
- `src/views/content-editor/modals/delete-version-modal.ejs`
- `src/views/content-editor/modals/dirty-confirm-modal.ejs`
- Cập nhật: `Item.js`, `itemService.js`, `contentEditorController.js`, `contentEditorRoutes.js`, `itemRoutes.js`, `ribbon.js`, `content-editor.js`, `item-form.ejs`

## Route / API Dự kiến
- `GET /admin/content-editor/item/:id/form?lang=&version=`: Form theo version
- `GET /admin/content-editor/item/:id/versions?lang=`: Lịch sử versions
- `GET /admin/content-editor/item/:id/compare?lang=&v1=&v2=`: Màn hình so sánh
- `POST /api/items/:id/versions`: Thêm version mới
- `POST /api/items/:id/languages`: Thêm ngôn ngữ mới
- `DELETE /api/items/:id/versions/:lang/:version`: Xóa version
- `POST /api/items/:id/versions/:lang/:version/restore`: Khôi phục version
- `GET /api/items/:id/compare`: JSON diff

## Thay đổi Database
- Tạo collection `languages` với các ngôn ngữ chuẩn (`en`, `vi`).
- Cập nhật collection `items_master` với `sharedFields`, `languages[code].unversionedFields`, `languages[code].versions[v].fields`, và chừa sẵn `presentation.shared` cùng `presentation.final`.

## Definition of Done & Cách kiểm thử
- [x] Chạy migration `npm run migrate` thành công cả chế độ `--dry-run` lẫn thực thi, dữ liệu cũ chuyển thành `en/v1`, chạy lại an toàn không lỗi.
- [x] Chuyển đổi Language và Version trong Content Editor qua partial AJAX, URL cập nhật `?lang=&version=`, không reload cả trang.
- [x] Thêm version mới, thêm ngôn ngữ mới, xóa version (chặn xóa version cuối cùng) và khôi phục version cũ (tạo version mới tăng dần) hoạt động chuẩn xác.
- [x] Màn hình So sánh hiển thị 2 cột trực quan, tô màu diff đỏ/xanh chuẩn xác, Rich Text HTML được sanitize an toàn.
- [x] Sửa trường `shared` phản ánh sang mọi ngôn ngữ/version; trường `unversioned` phản ánh sang mọi version của ngôn ngữ đó; trường thường chỉ ảnh hưởng version đang chọn.
- [x] Khi có thay đổi chưa lưu, chuyển đổi version/ngôn ngữ hiển thị modal xác nhận hệ thống (Lưu / Bỏ qua / Hủy).
- [x] Schema `Item` có sẵn trường `presentation.shared` và `presentation.final`, cơ chế copy `finalLayout` từ version nguồn khi tạo version mới được kiểm thử tự động 100% pass.
- [x] 100% kiểm thử `npm test` pass (74/74 tests) và `npm run lint` đạt chuẩn 0 lỗi.

## Ghi chú / Kết quả
**Hoàn thành ngày 2026-11-03.** Đạt 100% tiêu chí DoD, sẵn sàng cho Giai đoạn 5 (Media Library).

### Điều chỉnh GĐ 4.1 (2026-11-03):
- **Ngôn ngữ mặc định là `vi`:** Chuyển `defaultLanguage: 'vi'` toàn hệ thống, đưa `vi` lên đầu danh sách `languages` (`isDefault: true`, `sortOrder: 10`). Mọi request/API không truyền `lang` tự động dùng `vi`.
- **Cơ chế Fallback không Migration:** Dữ liệu cũ ở `en/1` giữ nguyên nhãn `en`. Khi truy cập `vi` trên item chỉ có `en`, `resolveFields` tự động lấy dữ liệu `en` làm fallback hiển thị (`origins: 'fallback'`). Lưu lần đầu ở `vi` tự động tạo `vi/1` và bảo toàn `en/1`.
- **Bỏ thông báo cảnh báo:** Xóa bỏ hoàn toàn hộp thông báo *"Ngôn ngữ [XX] chưa có nội dung!"* và các điều kiện kích hoạt. Giữ dấu hiệu badge nhỏ ở dropdown Language để nhận biết ngôn ngữ đã có nội dung hoặc còn trống.
- **Quyết định kiến trúc chi tiết:** Tham chiếu [`docs/decisions/DEC-029-default-language-vi-and-silent-empty-language.md`](../decisions/DEC-029-default-language-vi-and-silent-empty-language.md).
