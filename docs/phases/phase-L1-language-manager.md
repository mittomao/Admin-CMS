---
phase: L1
name: Quản lý Ngôn ngữ Động (Language Manager) Thay thế Hard-code
status: Hoàn thành
depends_on: [4, 4.1, 8, 10]
estimate: 2 ngày làm việc
started: 2026-11-09
completed: 2026-11-09
updated: 2026-11-09
---

# GĐ L1 - Quản lý Ngôn ngữ Động (Language Manager) Thay thế Hard-code
> Chuyển đổi toàn diện cơ chế Đa ngôn ngữ từ cấu hình hard-code sang mô hình "Mọi thứ là Item" chuẩn Treecraft: Language Item dưới `/root/system/Languages`, `languageService` duy nhất, giao diện quản trị Language Manager tại `/admin/languages`, đồng bộ sang Web database và loại bỏ triệt để hard-code mã ngôn ngữ.

---

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/versions-languages.md`](../data-model/versions-languages.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/data-model/templates.md`](../data-model/templates.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/media.md`](../data-model/media.md)
- [`docs/phases/L1-impact-matrix.md`](./L1-impact-matrix.md)
- [`docs/decisions/DEC-029-default-language-vi-and-silent-empty-language.md`](../decisions/DEC-029-default-language-vi-and-silent-empty-language.md)
- [`docs/decisions/DEC-034-public-url-resolution-rules.md`](../decisions/DEC-034-public-url-resolution-rules.md)
- [`docs/decisions/DEC-048-dynamic-language-manager-item-architecture.md`](../decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- [`docs/decisions/DEC-049-mongodb-text-index-multilingual-stemming.md`](../decisions/DEC-049-mongodb-text-index-multilingual-stemming.md)

---

## 1. Mục tiêu
1. **Mô hình hóa Ngôn ngữ thành Item:** Đưa mọi ngôn ngữ trong hệ thống thành Item phân cấp chuẩn dưới `/root/system/Languages` với System Template `Language` và `Languages Folder`.
2. **Nguồn sự thật duy nhất (`languageService`):** Tập trung 100% nghiệp vụ ngôn ngữ (list, get, fallback, validate, create, update, setEnabled, setDefault, reorder, delete, getUsage) vào service chuẩn, có cache in-memory và vô hiệu hóa tự động qua `eventBus`.
3. **Loại bỏ triệt để Hard-code:** Thay thế toàn bộ mã ngôn ngữ cứng (`'vi'`, `'en'`, whitelist regex cứng, dropdown tĩnh...) trong Validators, Routers, Services, Controllers, Views, Frontend scripts, đồng thời hỗ trợ kiểm tra tự động qua `npm run check:languages`.
4. **Bảo toàn Dữ liệu & Xuất bản sang Web:** Cho phép xuất bản các Item Ngôn ngữ sang Web store để `SiteResolver` và `SiteRenderer` phân giải động; bảo vệ dữ liệu cũ, hỗ trợ migration an toàn (`--dry-run` & rollback) và kiểm tra phụ thuộc (không cho xóa ngôn ngữ còn dữ liệu).

---

## 2. Phạm vi

### In-Scope (Làm)
- **Mô hình dữ liệu & Template:**
  - Định nghĩa System Template `Languages Folder` (`/root/templates/System/Languages Folder`) và `Language` (`/root/templates/System/Language`).
  - Cấu trúc trường Shared bất biến: `code` (BCP 47), `displayName`, `nativeName`, `direction` (`ltr|rtl`), `enabled`, `sortOrder`, `fallbackLanguage`, `urlPrefix`, `flagIcon`.
  - Node hệ thống bảo vệ `/root/system/Languages` (chống xóa, đổi tên, di chuyển).
  - Cấu hình site `defaultLanguage` trong collection `settings` (trỏ tới ngôn ngữ đang `enabled`).
- **Tầng Service (`languageService.js`):**
  - Cung cấp toàn bộ hàm nghiệp vụ: `list`, `getByCode`, `getDefault`, `isValid`, `getFallbackChain` (chống loop, max depth 5), `create`, `update`, `setEnabled`, `setDefault`, `reorder`, `delete`, `getUsage`.
  - Cache In-Memory hiệu năng cao, lắng nghe và phát các sự kiện: `language.created`, `language.updated`, `language.enabled`, `language.disabled`, `language.default.changed`, `language.deleted`.
  - Liên kết `renderCache`: Tự động xóa sạch cache Site Renderer khi thay đổi ngôn ngữ hoặc đổi mặc định.
- **Tích hợp & Loại bỏ Hard-code:**
  - Route & Controller Admin: Dropdown Language trong Content Editor, Media Library, Template Manager, Presentation, Workbox, Publish Manager được nạp động từ `languageService`.
  - Route Site Renderer: `SiteResolver` trích xuất prefix và phân giải item từ danh sách ngôn ngữ động của Web store.
  - Tích hợp HTML layout SSR: Thẻ `<html lang="..." dir="...">` phản ánh động theo thuộc tính của ngôn ngữ hiện tại.
  - Liên kết Xuất bản (Publishing Engine): Tự động gom các Item Ngôn ngữ liên quan hoặc hỗ trợ xuất bản phân vùng Ngôn ngữ sang Web.
  - Text Search Stemming: Ánh xạ BCP 47 sang stemmer của MongoDB (hoặc `none`).
- **Giao diện Quản trị (`/admin/languages`):**
  - Màn hình desktop-like Language Manager: Bảng danh sách, cờ, mã, tên bản địa, badge Mặc định/Trạng thái, số lượng nội dung đang dùng (`usageCount`), thứ tự sắp xếp kéo thả.
  - Modal Thêm / Chỉnh sửa: Gợi ý mã BCP 47 chuẩn, xem trước URL tiền tố (`/en/about-us`), kiểm tra xung đột Optimistic Locking (HTTP 409).
  - Tích hợp Launchpad: Tile "Language Manager" trong nhóm Control Panel.
- **Kiểm soát Quyền & Bảo mật:**
  - Kiểm tra quyền qua `canPerform(user, 'language:read')` và `canPerform(user, 'language:manage')`.
  - CSRF protection cho toàn bộ Form và API JSON.
- **Migration & Công cụ Kiểm tra:**
  - Script migration `src/scripts/migrate-languages-to-items.js` idempotent, hỗ trợ `--dry-run` và nhắc nhở backup DB.
  - Script kiểm tra tĩnh `npm run check:languages` phát hiện hard-code mã ngôn ngữ ngoài seed/test fixtures.

### Out-of-Scope (Không làm)
- Tự động dịch thuật máy (Google Translate API / DeepL).
- Quản lý dịch thuật hàng loạt (Translation Memory / XLIFF export).
- Xóa nội dung hàng loạt của một ngôn ngữ (Bulk Delete by Language).
- Giao diện Admin đa ngôn ngữ (i18n hóa toàn bộ UI admin).
- Tự động phát hiện ngôn ngữ qua header `Accept-Language` của trình duyệt.
- Cài đặt thêm thư viện ngoài danh mục `docs/rules/02-tech-stack.md`.

---

## 3. Checklist Task Thực Hiện

### Giai đoạn Chuẩn bị & Template Hệ thống
- [x] **Task L1.1:** Cập nhật `src/config/branding.js` bổ sung hằng số đường dẫn `PATHS.SYSTEM_LANGUAGES = '/root/system/Languages'` và cập nhật danh mục quyền `src/config/permissions.js` (`LANGUAGE_READ`, `LANGUAGE_MANAGE`).
- [x] **Task L1.2:** Tạo System Templates `Languages Folder` và `Language` trong thư mục `/root/templates/System`, định nghĩa các trường cấu hình `shared` theo đúng thiết kế.

### Xây dựng `languageService` & Quản lý Bộ nhớ Cache
- [x] **Task L1.3:** Xây dựng `src/services/languageService.js` với đầy đủ các phương thức nghiệp vụ, bộ nhớ cache In-Memory và cơ chế invalidation qua `eventBus`.
- [x] **Task L1.4:** Kết nối `languageService` với `renderCache.js` và `auditService.js`, tự động xoá render cache khi cấu hình ngôn ngữ thay đổi.

### Thay thế Hard-code Tầng Backend & Public Site
- [x] **Task L1.5:** Thay thế hard-code trong `src/services/siteResolver.js` và `src/services/siteRenderer.js` để đọc ngôn ngữ động từ Web store, cập nhật thẻ `<html lang="..." dir="...">`.
- [x] **Task L1.6:** Thay thế hard-code trong `src/services/versionService.js`, `src/services/itemService.js`, `src/services/presentationService.js`, `src/services/publishService.js`, `src/services/mediaService.js`.
- [x] **Task L1.7:** Cập nhật bộ kiểm tra `canPerform` trong `src/services/aclService.js` cho các thao tác `language:read` và `language:manage`.
- [x] **Task L1.8:** Bổ sung các Language Items vào danh sách `resolveRelatedItems` trong `publishService.js` khi xuất bản phân vùng hoặc toàn bộ site.

### Controller, Routes & Giao diện Quản trị
- [x] **Task L1.9:** Tạo Controller `src/controllers/admin/languageController.js` và Routes (`src/routes/admin/languageRoutes.js`, `src/routes/api/languageRoutes.js`) hỗ trợ đầy đủ HTML SSR và JSON endpoints.
- [x] **Task L1.10:** Xây dựng giao diện `src/views/admin/languages/index.ejs` và modal thêm/sửa `src/views/admin/languages/modals/language-modal.ejs`.
- [x] **Task L1.11:** Xây dựng client script `public/js/admin/language-manager.js` hỗ trợ AJAX, sắp xếp kéo thả, xem trước URL tiền tố và thông báo Toast.
- [x] **Task L1.12:** Cập nhật các dropdown chọn ngôn ngữ trong `item-form.ejs`, `details-modal.ejs`, `media-browser-core.ejs`, `publish-dialog.ejs`, `workbox/index.ejs` nạp danh sách động từ `languageService`.
- [x] **Task L1.13:** Bổ sung tile "Language Manager" vào cấu hình Launchpad (`src/config/ribbon.js` hoặc seed Launchpad).

### Migration & Kiểm tra Tự động
- [x] **Task L1.14:** Viết script migration `src/scripts/migrate-languages-to-items.js` có hỗ trợ `--dry-run`, chuyển đổi dữ liệu từ collection `languages` cũ sang cấu trúc Item mới dưới `/root/system/Languages`.
- [x] **Task L1.15:** Viết script kiểm tra tĩnh `src/scripts/check-languages.js` và đăng ký lệnh `npm run check:languages` trong `package.json`.

### Kiểm thử & Hoàn thiện
- [x] **Task L1.16:** Xây dựng bộ kiểm thử đơn vị & API `tests/languageService.test.js` và `tests/languageApi.test.js`.
- [x] **Task L1.17:** Chạy toàn bộ test suites (`npm test`) đảm bảo hồi quy 100% pass, chạy `npm run lint` đạt 0 lỗi.
- [x] **Task L1.18:** Biên dịch CSS admin (`npm run build:css:admin`) và cập nhật báo cáo nghiệm thu `docs/reports/phase-L1-report.md`.

---

## 4. Definition of Done (DoD)
1. Thêm ngôn ngữ mới (ví dụ `ja`) trực tiếp trên giao diện Admin, không cần sửa bất kỳ dòng code nào. Sau khi kích hoạt và Publish, dropdown Content Editor hiển thị `ja` và URL `/ja/about-us` trên website công khai hoạt động chính xác.
2. Không còn hard-code mã ngôn ngữ ngoài seed và test fixtures. Lệnh `npm run check:languages` chạy kiểm tra chỉ đọc đạt 100% pass.
3. Các hành động Bật / Tắt / Đổi mặc định / Xóa ngôn ngữ tuân thủ nghiêm ngặt quy tắc: Không tắt/xóa ngôn ngữ mặc định; không xóa ngôn ngữ khi còn nội dung (`usageCount > 0`); dữ liệu cũ không bị mất mát.
4. Giao diện site công khai phản ánh đúng `<html lang="..." dir="...">` (ví dụ hỗ trợ `rtl` cho tiếng Ả Rập), URL tiền tố hoạt động mượt mà và cache được làm mới chính xác khi đổi ngôn ngữ mặc định.
5. Kiểm soát phân quyền 100% qua `canPerform` (`language:read`, `language:manage`), không sử dụng role cứng.
6. Toàn bộ 38+ test suites đều PASS (`npm test`), linter 0 lỗi, tài liệu được cập nhật đầy đủ và **không có commit Git nào được tạo bởi Agent**.

