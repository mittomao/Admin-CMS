# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 6.2: RENDERING COMPONENT TEMPLATE & CƠ CHẾ SUY RA TRƯỜNG HIỆU LỰC (EFFECTIVE TEMPLATE)

- **Giai đoạn:** GĐ 6.2 — Rendering Gắn Component Template & Effective Field Resolution
- **Thời gian hoàn thành:** 2026-11-04
- **Trạng thái:** Hoàn thành (100% tiêu chí DoD đạt chuẩn)
- **Kiểm thử tự động:** 15/15 Test Suites PASS (144/144 Tests đạt 100%)
- **Chất lượng mã nguồn:** ESLint 0 errors, 0 warnings
- **Quyết định kiến trúc liên quan:** DEC-036 (bổ sung và làm rõ kiến trúc phân tách độc lập giữa Page Template và Component Template, tinh chỉnh DEC-035)

---

## 1. Tóm tắt Mục tiêu & Kết Quả Đạt Được

Phân hệ Giai đoạn 6.2 giải quyết triệt để sự phụ thuộc ghép cặp (tight coupling) giữa Page Template và Component Template:

1. **Rendering gắn trực tiếp `componentTemplate`:**
   - Template hệ thống `Rendering` bổ sung trường bắt buộc `componentTemplate` (ObjectId tham chiếu tới Template trong `/root/templates/Feature/Components/`).
   - Validate server chặt chẽ: kiểm tra template tồn tại, đúng nhánh thư mục, không phải Folder, không phải System Template.

2. **Page Template độc lập (Standalone Page Templates):**
   - Loại bỏ hoàn toàn yêu cầu kế thừa Component Template qua `baseTemplates` trên Page Template (`Home`, `AboutUs`...).
   - `baseTemplates` của Page Template chỉ còn dùng cho cấu trúc trang dùng chung (`_BasePage`, `_BaseSEO`...).

3. **Cơ chế suy ra trường hiệu lực (`templateService.resolveEffectiveTemplate`):**
   - Động hóa lược đồ trường của Item dựa trên: **Template cơ sở (Base template chain)** + **`componentTemplate` của toàn bộ Renderings thực tế** lấy từ `presentationService.getFinalPresentation(item, lang, version)`.
   - Gom nhóm trường của từng component thành các Section riêng mang tên Component (`HeroBanner`, `Introduction`...), gắn kèm badge nhận diện nguồn: `từ rendering <Component>`.
   - Dynamic Standard Values từ Component Template tự động áp dụng chính xác cho Page Item mới tạo.
   - Quản lý bộ nhớ đệm (In-Memory Cache) theo key `itemId:lang:version`, tự động invalidate khi cập nhật Item Presentation hoặc Template.

4. **Bảo toàn dữ liệu theo `fieldId`:**
   - Mọi giá trị trường đều lưu theo `fieldId` bất biến trong MongoDB.
   - Khi gỡ Rendering khỏi Presentation: các trường của component đó ẩn khỏi Content Editor form nhưng dữ liệu trong DB được giữ nguyên 100%. Khi thêm lại Rendering, dữ liệu cũ tự động hiển thị lại nguyên vẹn.

5. **Quy tắc thực thể lặp lại (Repeated Instances):**
   - Nếu cùng một Component xuất hiện nhiều lần trong một trang (ví dụ 2 khối HeroBanner), cả 2 chia sẻ chung một bộ trường trên Page Item (chuẩn bị sẵn sàng cho Datasource mở rộng ở giai đoạn sau).

6. **Ràng buộc toàn vẹn xóa/di chuyển Template:**
   - Hàm `templateService.checkComponentTemplateUsage(templateId)` kiểm tra danh sách rendering đang trỏ tới component template.
   - Chặn tuyệt đối xóa hoặc di chuyển template ra khỏi `Feature/Components` nếu đang được ít nhất 1 Rendering sử dụng.
   - Cảnh báo số lượng Page Template và Content Item bị ảnh hưởng khi thay đổi `componentTemplate` của một Rendering đang dùng.

7. **Công cụ Migration & Đồng bộ Seed:**
   - Script migration độc lập `src/scripts/migrate-rendering-component-templates.js`:
     - Hỗ trợ cờ `--dry-run` chạy mô phỏng an toàn.
     - Tự động gán `componentTemplate` cho Rendering theo tên khớp, gỡ component template khỏi `baseTemplates` của page templates.
     - Nhắc nhở backup Database trước khi chạy.
     - Idempotent (chạy lặp lại an toàn) và hỗ trợ khôi phục qua snapshot (`--rollback`).
   - Cập nhật seed script `src/scripts/seed-presentation-data.js` chuẩn hóa dữ liệu khởi tạo.

---

## 2. Danh mục File & Thư mục Đã Tạo / Cập Nhật

| Loại file | Đường dẫn file | Mô tả |
| :--- | :--- | :--- |
| **Model** | `src/models/Template.js` | Bổ sung field `path` (String) và index `{ path: 1 }` để tối ưu hóa truy vấn kiểm tra nguồn template |
| **Service** | `src/services/templateService.js` | Triển khai `validateComponentTemplateReference`, `checkComponentTemplateUsage`, `resolveEffectiveTemplate`, `effectiveTemplateCache` & invalidation; cập nhật `getUsage` và `delete` bảo vệ ràng buộc toàn vẹn |
| **Service** | `src/services/presentationService.js` | Bổ sung làm giàu dữ liệu `componentTemplate`/`componentTemplateName` trong `getAllRenderings`; tự động invalidate cache template khi đổi presentation |
| **Service** | `src/services/itemService.js` | Cập nhật `getItemWithRenderSchema`, `updateFields`, `deleteField`, `createFromTemplate` sử dụng `resolveEffectiveTemplate` và kế thừa dynamic standard values |
| **Service** | `src/services/versionService.js` | Cập nhật `resolveFields`, `compareVersions`, `saveVersionFields` sử dụng `resolveEffectiveTemplate` |
| **Views Admin**| `src/views/content-editor/item-form.ejs` | Hiển thị Section riêng cho từng Component kèm badge nhận diện nguồn `<span class="badge bg-purple-lt ms-2"><i class="ti ti-puzzle me-1"></i>từ rendering ${section.origin.renderingName}</span>` |
| **Views Admin**| `src/views/admin/templates/partials/tab-inheritance.ejs` | Hiển thị cảnh báo nếu chọn template thuộc `Feature/Components` làm base template |
| **Views Admin**| `src/views/admin/templates/partials/tab-builder.ejs` | Bổ sung card "Fields từ Renderings (Standard Presentation)" (chỉ đọc) |
| **Client JS**| `public/js/admin/presentation-details.js` | Hiển thị badge `Template: <Tên Template>` trên card component khi chọn rendering |
| **Script** | `src/scripts/migrate-rendering-component-templates.js` | Script migration an toàn hỗ trợ `--dry-run`, snapshot, rollback |
| **Script** | `src/scripts/seed-presentation-data.js` | Cập nhật seed phân tách Page Template độc lập và gắn `componentTemplate` cho renderings |
| **Kiểm thử** | `tests/effectiveTemplate.test.js` | Suite 15 bài test tự động bao phủ 100% kịch bản nghiệp vụ GĐ 6.2 |

---

## 3. Kết Quả Kiểm Thử Tự Động (Automated Testing)

Toàn bộ các test suite của dự án (15/15 suites) chạy bằng `npm test` đều đạt kết quả tuyệt đối:

```text
PASS tests/versionService.test.js
PASS tests/presentationService.test.js
PASS tests/effectiveTemplate.test.js
PASS tests/presentationLayoutTree.test.js
PASS tests/presentationApi.test.js
PASS tests/templateService.test.js
PASS tests/mediaService.test.js
PASS tests/itemService.test.js
PASS tests/authService.test.js
PASS tests/authMiddleware.test.js
PASS tests/authController.test.js
PASS tests/mediaController.test.js
PASS tests/itemController.test.js
PASS tests/templateController.test.js
PASS tests/health.test.js

Test Suites: 15 passed, 15 total
Tests:       144 passed, 144 total
Snapshots:   0 total
Time:        16.321 s
Ran all test suites.
```

Kiểm tra cú pháp và chất lượng mã nguồn:
```bash
npm run lint
# 0 errors, 0 warnings
```

---

## 4. Hướng Dẫn Kiểm Thử Thủ Công (Manual Verification)

1. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```
2. **Kiểm tra gắn Component Template trên Rendering:**
   - Truy cập Content Editor $\rightarrow$ `/root/layout/Renderings/HeroBanner`.
   - Xác nhận trường `componentTemplate` đang trỏ tới Template `HeroBanner` dưới `/root/templates/Feature/Components/`.
3. **Kiểm tra form Content Editor của Page Item:**
   - Mở Item `/root/content/Home`.
   - Các trường của HeroBanner được gom nhóm riêng vào section **HeroBanner** kèm badge màu tím `từ rendering HeroBanner`.
   - Nhập giá trị cho `HeroTitle` và nhấn **Save**.
4. **Kiểm tra bảo toàn dữ liệu khi gỡ và thêm lại rendering:**
   - Mở Ribbon `PRESENTATION` $\rightarrow$ `Details`.
   - Xóa `HeroBanner` khỏi placeholder `maincontent` $\rightarrow$ nhấn **Save Presentation**.
   - Form Content Editor tự động tải lại: Section `HeroBanner` biến mất khỏi giao diện.
   - Mở lại Presentation Details $\rightarrow$ Thêm lại `HeroBanner` vào placeholder `maincontent` $\rightarrow$ Save.
   - Form Content Editor hiển thị lại Section `HeroBanner`: Giá trị `HeroTitle` đã nhập trước đó vẫn còn nguyên vẹn.
5. **Kiểm tra chặn xóa Component Template đang dùng:**
   - Mở Template Manager $\rightarrow$ Thử xóa Template `HeroBanner`.
   - Hệ thống chặn lại và thông báo lỗi: Template đang được sử dụng bởi rendering `HeroBanner`.

---

## 5. Trạng Thái Hiện Tại & Bước Tiếp Theo

- **Giai đoạn 6.2:** Đã hoàn thành 100% các tiêu chí và cập nhật tài liệu.
- **Tuân thủ quy tắc làm việc:** Dừng lại, báo cáo kết quả và chờ lệnh duyệt giai đoạn tiếp theo: `APPROVE GĐ 7` (Bảo mật nâng cao & Phân quyền ACL).

