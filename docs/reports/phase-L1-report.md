# BÁO CÁO NGHIỆM THU GIAI ĐOẠN L1: MODULE QUẢN LÝ NGÔN NGỮ (LANGUAGE MANAGER)

## 1. Tổng quan Giai đoạn
- **Tên giai đoạn:** Quản lý Ngôn ngữ Động (Language Manager) Thay thế Hard-code.
- **Mã giai đoạn:** L1.
- **Ngày bắt đầu:** 2026-11-09.
- **Ngày hoàn thành:** 2026-11-09.
- **Trạng thái:** **Hoàn thành (100% Definition of Done đạt chuẩn)**.
- **Mục tiêu chính:** Chuyển đổi toàn diện cơ chế Đa ngôn ngữ từ cấu hình hard-code sang mô hình "Mọi thứ là Item" chuẩn Treecraft: Language Item dưới `/root/system/Languages`, `languageService` là nguồn sự thật duy nhất (Single Source of Truth), giao diện quản trị desktop-like tại `/admin/languages`, đồng bộ sang Web database và loại bỏ triệt để hard-code mã ngôn ngữ.

---

## 2. Checklist Công việc Đã Hoàn thành (18/18 Tasks)

- [x] **Task L1.1:** Cập nhật `src/config/branding.js` bổ sung hằng số `PATHS.SYSTEM_LANGUAGES = '/root/system/Languages'` và `src/config/permissions.js` bổ sung quyền `LANGUAGE_READ`, `LANGUAGE_MANAGE`.
- [x] **Task L1.2:** Định nghĩa System Template `Languages Folder` (`/root/templates/System/Languages Folder`) và `Language` (`/root/templates/System/Language`) với cấu trúc trường `shared` bất biến.
- [x] **Task L1.3:** Xây dựng `src/services/languageService.js` với đầy đủ các phương thức nghiệp vụ: `list`, `getByCode`, `getDefault`, `isValid`, `getFallbackChain` (chống vòng lặp, giới hạn độ sâu 5), `create`, `update`, `setEnabled`, `setDefault`, `reorder`, `delete`, `getUsage`. Cache In-Memory với TTL ngắn và vô hiệu hóa qua `eventBus`.
- [x] **Task L1.4:** Kết nối `languageService` với `renderCache.js` và `auditService.js`, tự động xoá render cache khi cấu hình ngôn ngữ thay đổi.
- [x] **Task L1.5:** Thay thế hard-code trong `src/services/siteResolver.js` và `src/services/siteRenderer.js` để đọc ngôn ngữ động từ Web store, cập nhật thẻ `<html lang="..." dir="...">`.
- [x] **Task L1.6:** Thay thế hard-code trong `src/services/versionService.js`, `src/services/itemService.js`, `src/services/presentationService.js`, `src/services/publishService.js`, `src/services/mediaService.js`.
- [x] **Task L1.7:** Cập nhật bộ kiểm tra `canPerform` trong `src/services/aclService.js` cho các thao tác `language:read` và `language:manage`.
- [x] **Task L1.8:** Bổ sung các Language Items vào danh sách `resolveRelatedItems` trong `publishService.js` khi xuất bản phân vùng hoặc toàn bộ site.
- [x] **Task L1.9:** Tạo Controller `src/controllers/admin/languageController.js` và Routes (`src/routes/admin/languageRoutes.js`, `src/routes/api/languageRoutes.js`) hỗ trợ đầy đủ HTML SSR và JSON endpoints.
- [x] **Task L1.10:** Xây dựng giao diện `src/views/admin/languages/index.ejs` và modal thêm/sửa `src/views/admin/languages/modals/language-modal.ejs`.
- [x] **Task L1.11:** Xây dựng client script `public/js/admin/language-manager.js` hỗ trợ AJAX, sắp xếp kéo thả, xem trước URL tiền tố và thông báo Toast.
- [x] **Task L1.12:** Cập nhật các dropdown chọn ngôn ngữ trong `item-form.ejs`, `details-modal.ejs`, `media-browser-core.ejs`, `publish-dialog.ejs`, `workbox/index.ejs` nạp danh sách động từ `languageService`.
- [x] **Task L1.13:** Bổ sung tile "Language Manager" vào cấu hình Launchpad (`src/scripts/seed-initial-data.js` và upsert vào collection `launchpad_apps`).
- [x] **Task L1.14:** Viết script migration `src/scripts/migrate-languages-to-items.js` có hỗ trợ `--dry-run`, chuyển đổi dữ liệu an toàn sang cấu trúc Item mới dưới `/root/system/Languages`.
- [x] **Task L1.15:** Viết script kiểm tra tĩnh `src/scripts/check-languages.js` và đăng ký lệnh `npm run check:languages` trong `package.json`.
- [x] **Task L1.16:** Xây dựng bộ kiểm thử đơn vị & API `tests/languageService.test.js` (18 tests) và `tests/languageApi.test.js` (19 tests).
- [x] **Task L1.17:** Chạy toàn bộ test suites (`npm test`) đảm bảo hồi quy 100% pass (40 test suites, 413 tests passed), chạy `npm run lint` đạt 0 lỗi.
- [x] **Task L1.18:** Biên dịch CSS admin (`npm run build:css:admin`) và cập nhật báo cáo nghiệm thu `docs/reports/phase-L1-report.md`.

---

## 3. Kết quả Đo kiểm & Bằng chứng Nghiệm thu (DoD Verification)

### 3.1. Kiểm tra Hard-coded Languages Compliance
```bash
> treecraft@1.0.0 check:languages
> node src/scripts/check-languages.js

================================================================
Treecraft CMS - Checking Hard-Coded Languages Compliance
================================================================

✓ Tuân thủ 100%! Không phát hiện chuỗi hard-coded ngôn ngữ trong controllers/services/routes.
```

### 3.2. Kiểm tra Branding & Treecraft Compliance
```bash
> treecraft@1.0.0 check:branding
> node src/scripts/check-branding.js

=== TREECRAFT CMS BRANDING AUDIT (PHASE R2) ===
1. Checking file & directory names for legacy branding... ✅ PASS
2. Scanning repository content for residual legacy branding... ✅ PASS
3. Verifying Seed Data Scripts for clean "/root" bootstrap... ✅ PASS
🎉 BRANDING AUDIT PASSED: 100% Treecraft & Root compliance verified.
```

### 3.3. Kiểm tra ESLint
```bash
> treecraft@1.0.0 lint
> eslint src/ tests/
✖ 8 problems (0 errors, 8 warnings)
```

### 3.4. Kiểm thử Đơn vị & Tích hợp Toàn diện (`npm test`)
```bash
Test Suites: 40 passed, 40 total
Tests:       413 passed, 413 total
Snapshots:   0 total
Time:        78.618 s
```
- `tests/languageService.test.js`: 18/18 tests passed (BCP 47 validation, immutability, optimistic locking, circular fallback prevention, safe deletion).
- `tests/languageApi.test.js`: 19/19 tests passed (Admin HTML SSR, REST APIs, CSRF enforcement, `canPerform` authorization).

---

## 4. Các Quyết định Kỹ thuật Ghi nhận
1. **[DEC-048: Dynamic Language Manager Architecture as Treecraft Items](../decisions/DEC-048-dynamic-language-manager-item-architecture.md):**
   - Đưa Ngôn ngữ thành Item phân cấp dưới `/root/system/Languages` theo System Template `Language`.
   - Thuộc tính `code` (BCP 47) là bất biến sau khi tạo.
   - `languageService` là nguồn sự thật duy nhất, có In-Memory cache và invalidation tự động qua `eventBus`.
   - Vô hiệu hoá (`enabled=false`) bảo toàn dữ liệu cũ trong Admin nhưng ẩn khỏi Site công khai (trả về 404).
   - Xoá chỉ cho phép khi không có dữ liệu sử dụng (`getUsage == 0`) và không phải ngôn ngữ mặc định.
2. **[DEC-049: Multilingual MongoDB Text Index and Stemming Strategy](../decisions/DEC-049-mongodb-text-index-multilingual-stemming.md):**
   - Ánh xạ mã ngôn ngữ BCP 47 sang stemmer được MongoDB hỗ trợ (ví dụ: `en` -> `english`, `fr` -> `french`).
   - Các ngôn ngữ không có built-in stemmer (như tiếng Việt `vi`) được fallback về stemmer `none` an toàn.

---

## 5. Hướng dẫn Cho Phiên Tiếp theo
Hệ thống Treecraft CMS đã hoàn thành mỹ mãn **GĐ L1: Language Manager**. Toàn bộ mã nguồn sạch sẽ, không có Git commit nào được tạo tự động bởi Agent. Người dùng có thể review và tự commit.

Giai đoạn kế tiếp theo lộ trình:
- **GĐ 12: Hoàn thiện, Bảo mật, E2E SSR Test & Docker** (`docs/phases/phase-12-hardening.md`).
- Lệnh duyệt để bắt đầu giai đoạn tiếp theo: `APPROVE GĐ 12`.

