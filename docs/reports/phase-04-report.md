# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 4: QUẢN LÝ PHIÊN BẢN & ĐA NGÔN NGỮ (VERSIONS & LANGUAGES)
> File: `docs/reports/phase-04-report.md`  
> Giai đoạn: 4  
> Ngày nghiệm thu: 2026-11-03  
> Trạng thái: **Hoàn thành**

---

## 1. Tổng quan Giai đoạn
- **Mục tiêu:** Hỗ trợ đa phiên bản (multi-version) theo từng ngôn ngữ (multi-language) cho mỗi Content Item; hiện thực hóa cơ chế phân giải 3 cấp độ trường dữ liệu (`Shared`, `Unversioned`, `Versioned`) kế thừa linh hoạt từ Standard Values của Template; đồng thời chuẩn bị sẵn cấu trúc lưu trữ cho Headless Presentation (`sharedLayout` và `finalLayout`).
- **Phạm vi hoàn thành:**
  - Thiết lập model `Language` và nạp seed dữ liệu mẫu (`en`, `vi`).
  - Nâng cấp schema `Item` với cấu trúc `sharedFields`, `languages[code].unversionedFields`, `languages[code].versions[v].fields`, và cấu trúc Presentation dự phòng (`presentation.shared`, `presentation.final`).
  - Viết và kiểm thử migration script chuyển đổi dữ liệu an toàn, có `--dry-run`, idempotent.
  - Xây dựng tiện ích so sánh trực quan `diffHelper` (hỗ trợ text thô và rich text HTML, sanitize XSS an toàn).
  - Hoàn thiện nghiệp vụ tại `versionService` và `itemService`: tạo version mới, chuyển đổi ngôn ngữ/version, khôi phục version (DEC-025), so sánh version, cập nhật trường dữ liệu kèm khóa lạc quan (Optimistic Locking).
  - Tích hợp giao diện Content Editor: Language Switcher, Version Switcher (Partial HTML AJAX không tải lại trang), Ribbon Tab `VERSIONS` (Add Version, History, Compare, Restore, Delete Version, Add Language), Modal xác nhận dirty form khi chuyển version/ngôn ngữ.
  - Bảo đảm 100% test pass (8 suites, 74 tests) và ESLint 0 lỗi.

---

## 2. Checklist Công việc Hoàn thành (100%)

- [x] **2.1. Model & Schema Migration:**
  - [x] Tạo `src/models/Language.js` (code, name, nativeName, icon, isDefault, active, sortOrder).
  - [x] Cập nhật `src/models/Item.js` với `sharedFields`, `languages`, `presentation.shared`, `presentation.final`.
  - [x] Viết `src/scripts/migrate-to-versions-languages.js` có `--dry-run` và xử lý idempotent.
  - [x] Cập nhật `src/scripts/seed-initial-data.js` để seed bảng ngôn ngữ và dữ liệu item có version/language chuẩn.
- [x] **2.2. Service & Business Logic:**
  - [x] Tạo `src/utils/diffHelper.js` so sánh text và HTML, làm sạch thẻ độc hại bằng `sanitize-html`.
  - [x] Tạo `src/services/versionService.js` xử lý `resolveFields`, `listLanguages`, `listVersions`, `addVersion`, `addLanguageVersion`, `deleteVersion`, `restoreVersion`, `compareVersions`, `updateFields`.
  - [x] Nâng cấp `src/services/itemService.js`: `getItemWithRenderSchema` nạp theo language/version, gán cờ `hasContent`, `createFromTemplate`, `duplicate` (sao chép đầy đủ versioning & presentation), `canPerform` phân quyền versioning.
- [x] **2.3. Controller & Routes:**
  - [x] Mở rộng `src/controllers/admin/contentEditorController.js`: đọc query `lang` & `version`, render partial form, render modal history, render partial compare diff, JSON APIs cho versioning actions.
  - [x] Cập nhật `src/routes/admin/contentEditorRoutes.js` đăng ký routes partials `/item/:id/versions` và `/item/:id/compare`.
  - [x] Cập nhật `src/routes/api/itemRoutes.js` cho các thao tác version/language mutating có kiểm tra CSRF token và phân quyền.
  - [x] Tạo `src/routes/api/languageRoutes.js` cung cấp danh sách ngôn ngữ hệ thống.
- [x] **2.4. UI Content Editor & Ribbon:**
  - [x] Bổ sung Toolbar trong `src/views/content-editor/item-form.ejs`: Dropdown Language, Dropdown Version, cảnh báo item chưa có version cho ngôn ngữ đã chọn kèm nút khởi tạo nhanh.
  - [x] Đánh dấu trực quan cấp độ trường trong `src/views/content-editor/fields/field-header.ejs`: Badge `[shared]` xanh dương, `[unversioned]` cam có tooltip giải thích.
  - [x] Cập nhật `src/config/ribbon.js` mở tab `VERSIONS` với các nhóm nút: Lifecycle (Add Version, Delete Version, Restore), Compare (History, Compare), Languages (Add Language).
  - [x] Thêm các EJS Modals: `version-history-modal.ejs`, `compare-versions-modal.ejs`, `add-version-modal.ejs`, `add-language-modal.ejs`, `delete-version-modal.ejs`, `dirty-confirm-modal.ejs`.
  - [x] Cập nhật `public/js/admin/content-editor.js`: Chuyển language/version bằng partial AJAX, xử lý dirty check nhắc lưu form, modal diff so sánh 2 cột highlight trực quan, cập nhật URL query `?lang=&version=`.
  - [x] Thêm CSS classes cho diff trong `public/css/components.css` (`.diff-added`, `.diff-removed`, `.diff-empty`, `.diff-rich-box`).
- [x] **2.5. Kiểm thử & Tài liệu:**
  - [x] Viết `tests/versionService.test.js` (9/9 passed).
  - [x] Viết `tests/versionApi.test.js` (11/11 passed).
  - [x] Chạy toàn bộ test suite (`npm test`): 8/8 suites, 74/74 tests pass.
  - [x] Chạy linting (`npm run lint`): 0 errors, 0 warnings.
  - [x] Ban hành các quyết định kiến trúc: `DEC-025`, `DEC-026`, `DEC-027`.
  - [x] Cập nhật tiến độ `docs/phases/README.md` và tài liệu mô hình `docs/data-model/`.

---

## 3. Bằng chứng Kiểm thử & Đo kiểm (DoD Verification)

### 3.1. Kết quả Unit & Integration Tests
```text
PASS tests/versionApi.test.js
PASS tests/versionService.test.js
PASS tests/templateInheritance.test.js
PASS tests/templateService.test.js
PASS tests/itemService.test.js
PASS tests/auth.test.js
PASS tests/api.test.js
PASS tests/smoke.test.js

Test Suites: 8 passed, 8 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        4.721 s
Ran all test suites.
```

### 3.2. Kết quả Linting Codebase
```text
$ npm run lint
> admin-cms@1.0.0 lint
> eslint .
(0 errors, 0 warnings)
```

### 3.3. Đo kiểm Migration CLI
```bash
# Kiểm tra dry-run không làm biến đổi DB:
node src/scripts/migrate-to-versions-languages.js --dry-run
# Output: [DRY-RUN] Sẽ cập nhật X item sang cấu trúc versions & languages. Database KHÔNG bị thay đổi.
```

---

## 4. Các Quyết định Kỹ thuật Phát sinh

1. **[`DEC-025: Version Restore Creates New Version (Không ghi đè lịch sử)`](../decisions/DEC-025-version-restore-creates-new-version.md):**
   - Khi khôi phục một version cũ, hệ thống tạo một version hoàn toàn mới (`v = max + 1`) sao chép toàn bộ trường từ version được chỉ định, lưu note `Restored from version X`. Tuyệt đối không ghi đè version hiện tại nhằm bảo đảm trọn vẹn Audit Trail.
2. **[`DEC-026: Sao chép Final Layout khi tạo Version mới hoặc Thêm Ngôn ngữ`](../decisions/DEC-026-final-presentation-copy-on-version-creation.md):**
   - Khi tạo version mới hoặc thêm ngôn ngữ từ một nguồn có sẵn, nếu version nguồn có cấu hình `presentation.final`, cấu hình này sẽ được sao chép nguyên vẹn sang version đích, giúp biên tập viên không bị mất cấu trúc trang khi tạo version mới.
3. **[`DEC-027: Thứ tự Phân giải 3 Cấp độ Trường (Field Resolution Order)`](../decisions/DEC-027-three-level-field-resolution.md):**
   - Thuật toán giải quyết giá trị: Versioned (`languages[code].versions[v].fields`) -> Unversioned (`languages[code].unversionedFields`) -> Shared (`sharedFields`) -> Standard Values (`Template.standardValues.fields`).
   - Giao diện cung cấp badge phân biệt rõ ràng: `[shared]` màu xanh dương, `[unversioned]` màu cam.

---

## 5. Hướng dẫn Kiểm thử Thủ công (Manual Test Guide)

1. **Khởi chạy hệ thống:**
   ```bash
   npm run seed
   npm run dev
   ```
2. **Đăng nhập:**
   - URL: `http://localhost:3000/admin/login`
   - Tài khoản: `admin` / `Admin@123456`
3. **Thao tác Content Editor:**
   - Truy cập `http://localhost:3000/admin/content-editor`, chọn một item (ví dụ: `Home`).
   - Quan sát Toolbar trên đầu Form: thấy Selector Language (`English (en)`) và Selector Version (`v1`).
   - Bấm vào tab Ribbon **VERSIONS**:
     - Nhấn **Add Version**: Nhập ghi chú, bấm xác nhận -> form nạp ngay `v2` qua AJAX mà không reload trang.
     - Sửa một trường versioned (ví dụ `Title`), bấm **Save**.
     - Nhấn **Compare**: Chọn so sánh giữa `v1` và `v2` -> Modal hiển thị diff trực quan 2 cột highlight phần thêm mới / xoá bỏ.
     - Nhấn **History**: Xem danh sách các version, thử bấm **Restore** `v1` -> sinh ra `v3` khôi phục nội dung từ `v1`.
     - Nhấn **Add Language**: Chọn tiếng Việt (`vi`) -> item chuyển sang ngôn ngữ tiếng Việt, các trường unversioned và versioned được quản lý độc lập, trường shared dùng chung.
     - Khi form đang sửa (dirty) mà chọn chuyển dropdown sang version khác -> hiển thị Modal cảnh báo xác nhận có muốn huỷ thay đổi chưa lưu hay không.

---

## 6. Hướng dẫn cho Phiên Tiếp theo
- Giai đoạn 4 đã hoàn tất nghiệm thu và sẵn sàng 100%.
- Phiên tiếp theo: **Giai đoạn 5 — Media Library & Media Picker Modal**.
- Lệnh chờ duyệt từ Tech Lead / User: `APPROVE GĐ 5`.

