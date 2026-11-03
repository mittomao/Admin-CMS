# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 6: PRESENTATION (LAYOUT, RENDERING & PLACEHOLDERS)

- **Giai đoạn:** GĐ 6 — Quản trị Headless Presentation
- **Thời gian hoàn thành:** 2026-11-04
- **Trạng thái:** Hoàn thành (100% tiêu chí DoD đạt chuẩn)
- **Kiểm thử tự động:** 13/13 Test Suites PASS (114/114 Tests đạt 100%)
- **Chất lượng mã nguồn:** ESLint 0 errors, 0 warnings

---

## 1. Tóm tắt Mục tiêu & Phạm vi Đã Hoàn Thành

Đã xây dựng toàn diện hệ thống quản lý **Headless Presentation** (Devices, Layouts, Renderings, Placeholder Settings & Presentation Details) theo chuẩn Sitecore XM phục vụ kiến trúc Headless CMS:
1. **System Templates & Items:**
   - Tạo các System Templates: `Device`, `Layout`, `Rendering`, `Placeholder Settings`, `Rendering Parameters`.
   - Cây hệ thống lưu trữ dưới `/sitecore/layout/`: `Devices` (`Default`, `Mobile`), `Layouts` (`MainLayout`), `Renderings` (`Hero`, `RichText`, `Promo`, `Navigation`), `Placeholder Settings` (`header`, `main`, `footer`, `content`, `column-{*}`).
2. **Hợp nhất Presentation Đa tầng (DEC-020, DEC-021):**
   - Triển khai `presentationService.getFinalPresentation`: hợp nhất 3 tầng bố cục: **Standard Presentation** (từ Template) $\rightarrow$ **Shared Layout** (Item cấp toàn cục) $\rightarrow$ **Final Layout** (Ghi đè delta theo cặp `[lang, version]`).
   - Định danh Rendering Instance bằng chuỗi UID bất biến; hỗ trợ ghi đè thuộc tính (`parameters`, `datasourceId`, `sortOrder`), thêm mới, hoặc đánh dấu ẩn (`hidden: true`).
3. **Cơ chế Khớp Placeholder Key Động & Lồng nhau (DEC-022):**
   - Hỗ trợ wildcard pattern `column-{*}` khớp các cột lưới động (`column-1`, `column-2`, `column-left`...).
   - Hỗ trợ phân giải placeholder lồng nhau (`/main/column-1`).
4. **Hạ tầng Dùng chung (Item Picker & Parameters Form):**
   - Xây dựng component độc lập `ItemPicker` (`public/js/admin/item-picker.js` và `item-picker-modal.ejs`) cho phép duyệt cây `/sitecore`, lọc theo template/path và chọn datasource item mượt mà.
   - Hỗ trợ cấu hình Dynamic Parameters dạng bảng Key-Value.
5. **Giao diện Presentation Details Trực quan & SortableJS:**
   - Modal `details-modal.ejs` tích hợp **SortableJS**: kéo thả sắp xếp thứ tự component trong placeholder hoặc di chuyển component giữa các placeholders hợp lệ.
   - Tabs chuyển đổi Device (`Default`, `Mobile`).
   - Switch Scope rõ ràng: `Shared Layout` vs `Final Layout [vi/1]`.
   - Nút "Thêm Component" lọc theo Placeholder Settings, "Sửa" cấu hình datasource/parameters, "Xóa", "Reset về Standard", và "Preview JSON".
6. **Kích hoạt Ribbon Tab Presentation:**
   - Tab `PRESENTATION` trên Ribbon Content Editor đã được bật với các nút: Details, Reset, Preview JSON.
7. **Bảo mật & Toàn vẹn Dữ liệu:**
   - Kiểm tra Optimistic Locking (409) với `expectedUpdatedAt`.
   - Phân quyền `canPerform` với `presentation:read` và `presentation:write`.
   - Quét kiểm tra toàn vẹn `getUsage` (chặn xóa layout/rendering đang dùng) và `getReferences` (cảnh báo xóa datasource đang dùng).
   - Tự động sao chép `final` presentation khi tạo version mới (DEC-026) và tự động dọn dẹp khi xóa version.

---

## 2. Danh mục File & Thư mục Đã Tạo / Cập Nhật

| Loại file | Đường dẫn file | Mô tả |
| :--- | :--- | :--- |
| **Model** | `src/models/Template.js` | Thêm trường `presentation: { devices: [devicePresentationSchema] }` (Standard Presentation) |
| **Model** | `src/models/Item.js` | Thêm indexes tìm kiếm renderingId và datasourceId, hoàn thiện toJSON transform parameters |
| **Seed** | `src/scripts/seed-presentation-data.js` | Script seed idempotent các template hệ thống, thư mục và item mẫu dưới `/sitecore/layout/*` |
| **Service** | `src/services/presentationService.js` | Lớp nghiệp vụ phân giải delta presentation, kiểm tra placeholder wildcard, lưu shared/final, kiểm tra usage/references |
| **Service** | `src/services/itemService.js` | Cập nhật `canPerform` với action `presentation:read` và `presentation:write` |
| **Service** | `src/services/versionService.js` | Thêm `markModified('presentation')` đảm bảo bảo toàn cấu hình final presentation khi versioning |
| **Controller** | `src/controllers/admin/presentationController.js` | Xử lý Partial HTML modal và REST JSON API cho Presentation |
| **Routes** | `src/routes/admin/presentationRoutes.js` | Routes Partial HTML: `/item/:id/presentation`, `/item/:id/presentation/preview` |
| **Routes** | `src/routes/api/presentationRoutes.js` | Routes JSON API: `/presentation/renderings`, `/presentation/placeholders`, `/presentation/usage/:id` |
| **Routes** | `src/routes/api/itemRoutes.js` | Bổ sung: `GET/PUT /api/items/:id/presentation`, `POST /api/items/:id/presentation/reset` |
| **Routes** | `src/routes/api/templateRoutes.js` | Bổ sung: `GET/PUT /api/templates/:id/standard-presentation` |
| **Views** | `src/views/admin/content-editor/presentation/details-modal.ejs` | Modal Presentation Details chính với device tabs, scope switcher, placeholder cards |
| **Views** | `src/views/admin/content-editor/presentation/select-rendering-modal.ejs` | Modal chọn rendering hợp lệ cho placeholder |
| **Views** | `src/views/admin/content-editor/presentation/rendering-instance-modal.ejs` | Modal cấu hình datasource và dynamic parameters |
| **Views** | `src/views/admin/content-editor/presentation/preview-json-modal.ejs` | Modal xem trước JSON Headless Layout Service |
| **Views** | `src/views/admin/content-editor/modals/item-picker-modal.ejs` | Modal duyệt cây chọn item độc lập (ItemPicker) |
| **Client JS**| `public/js/admin/item-picker.js` | Component Javascript chọn item độc lập qua cây AJAX |
| **Client JS**| `public/js/admin/presentation-details.js` | Script quản lý tương tác SortableJS, mở các sub-modal, gửi AJAX lưu và preview |
| **Client JS**| `public/js/admin/content-editor.js` | Bắt sự kiện click các nút Ribbon tab `Presentation` |
| **CSS** | `public/css/presentation-details.css` | Styling drag handle, sortable ghost/chosen states, dropzones |
| **Config** | `src/config/ribbon.js` | Kích hoạt tab `presentation` với các actions: `presentation:details`, `presentation:reset`, `presentation:preview-json` |
| **Tests** | `tests/presentationService.test.js` | Unit test 8/8 test cases kiểm thử kế thừa, delta override, wildcard placeholder, 409 conflict, usage |
| **Tests** | `tests/presentationApi.test.js` | API test 8/8 test cases kiểm thử CSRF, auth, get/put presentation, reset, standard presentation |

---

## 3. Kết quả Kiểm thử & Chất lượng

```bash
$ npm test -- --runInBand --testTimeout=30000

PASS tests/presentationService.test.js
PASS tests/presentationApi.test.js
PASS tests/versionService.test.js
PASS tests/versionApi.test.js
PASS tests/itemService.test.js
PASS tests/mediaService.test.js
PASS tests/mediaApi.test.js
PASS tests/templateService.test.js
PASS tests/contentEditorApi.test.js
PASS tests/richTextHelper.test.js
PASS tests/auth.test.js
PASS tests/launchpad.test.js
PASS tests/smoke.test.js

Test Suites: 13 passed, 13 total
Tests:       114 passed, 114 total
Snapshots:   0 total
Time:        15.54 s
```

```bash
$ npm run lint
> eslint src/ tests/
# 0 errors, 0 warnings
```

---

## 4. Hướng dẫn Chạy & Kiểm thử Thủ công (Manual Verification)

1. **Khởi động server:**
   ```bash
   npm run dev
   ```
2. **Đăng nhập quản trị:**
   - Truy cập `http://localhost:3000/admin/login` (admin / admin123).
   - Mở ứng dụng **Content Editor**.
3. **Kiểm tra Ribbon Tab Presentation:**
   - Chọn item bất kỳ trong cây (ví dụ `/sitecore/content/home`).
   - Chuyển sang tab **Presentation** trên Ribbon:
     - Nút **Details** (sáng, có thể bấm).
     - Nút **Reset** (khôi phục về standard template).
     - Nút **Preview JSON** (xem layout preview).
4. **Mở Presentation Details:**
   - Nhấn nút **Details** trên Ribbon: Modal Presentation Details mở ra.
   - Thấy cấu hình Device `Default`, Layout `MainLayout`.
   - Thấy các Placeholder boxes: `header`, `main`, `footer`, `content`.
   - Trong placeholder `main`: có sẵn các component kế thừa từ Template Standard Presentation (`HeroBanner`, `RichTextContent`) kèm nhãn xám `Standard`.
5. **Thao tác Kéo thả SortableJS:**
   - Rê chuột vào icon tay cầm `grip-vertical` bên trái thẻ component `RichTextContent`, kéo lên trên `HeroBanner` $\rightarrow$ Thứ tự đảo mượt mà.
   - Kéo thẻ `RichTextContent` thả sang placeholder `content` $\rightarrow$ Thẻ component tự động chuyển sang placeholder mới.
6. **Thêm Component Mới:**
   - Bấm nút **+ Thêm Component** tại placeholder `main`: Modal chọn component mở ra, lọc danh sách component được phép (`Hero`, `RichText`, `Promo`).
   - Nhấn chọn `PromoCard` $\rightarrow$ Component được thêm vào placeholder `main`.
7. **Cấu hình Datasource & Parameters:**
   - Nhấn nút **Sửa** (icon bút chì) trên component vừa thêm:
   - Bấm nút **Browse...** bên cạnh Datasource: Cửa sổ `ItemPicker` duyệt cây mở ra. Chọn một item bất kỳ (hoặc `/sitecore/content/home`) rồi nhấn "Xác Nhận".
   - Bấm **+ Thêm Tham Số**: nhập Key: `theme`, Value: `dark`.
   - Nhấn **Cập Nhật** $\rightarrow$ Thẻ component cập nhật nhãn Datasource và badge `1 params`.
8. **Lưu Cấu Hình (Shared vs Final):**
   - Chọn scope **Shared Layout** (dùng chung mọi phiên bản/ngôn ngữ) hoặc **Final Layout [VI / v1]** (ghi đè riêng cho bản thảo này).
   - Bấm **Lưu Cấu Hình**: Thông báo xanh hiển thị thành công, dữ liệu lưu chuẩn vào MongoDB dưới dạng delta override.
9. **Xem Preview JSON:**
   - Nhấn nút **Preview JSON**: Modal hiển thị cấu trúc JSON đầy đủ của layout và các components phân bổ theo từng placeholder, có nút **Copy JSON**.
10. **Khôi phục Bố cục Mặc định (Reset):**
    - Nhấn nút **Reset về Standard**: Xác nhận modal $\rightarrow$ Mọi delta override bị xóa, bố cục trở về đúng 100% như Standard Presentation của Template ban đầu.

---

## 5. Hạn chế Đã biết & Đề xuất cho các Giai đoạn Tiếp theo

1. **Phân quyền Presentation Details theo từng Item (GĐ 7):**
   - Hiện tại quyền ghi Presentation áp dụng chung cho Administrator, Editor, Author (`presentation:write`). Ở GĐ 7, khi tích hợp bảng phân quyền ACL chi tiết trên từng item, cần kiểm tra thêm quyền sửa presentation trên node cụ thể đó.
2. **Cảnh báo và Publish Presentation sang Web (GĐ 8):**
   - Ở GĐ 8, khi publish Item từ `items_master` sang `items_web`, cấu hình `presentation` (cả `shared` và `final`) sẽ được publish đồng bộ.
   - Khi item có rendering liên kết tới Datasource Item chưa được publish lên Web, Publish Dialog sẽ hiển thị cảnh báo mềm (Warning theo DEC-023) kèm checkbox "Publish kèm các Datasource liên đới".
3. **Headless Delivery API & Layout Service (GĐ 10):**
   - GĐ 10 sẽ tái sử dụng trực tiếp hàm `presentationService.getFinalPresentation` để phục vụ endpoint công khai `GET /api/v1/layout?path=...&lang=...` cho React/Next.js frontend, kết hợp giải quyết `resolveRichText` (GĐ 5) và In-Memory Caching.

