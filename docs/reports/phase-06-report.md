# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 6: PRESENTATION (SERVER-SIDE EJS SSR LAYOUT, RENDERING & PLACEHOLDERS)

- **Giai đoạn:** GĐ 6 — Quản trị Server-Side EJS Presentation
- **Thời gian hoàn thành:** 2026-11-04
- **Trạng thái:** Hoàn thành (100% tiêu chí DoD đạt chuẩn)
- **Kiểm thử tự động:** 14/14 Test Suites PASS (129/129 Tests đạt 100%)
- **Chất lượng mã nguồn:** ESLint 0 errors, 0 warnings
- **Quyết định kiến trúc liên quan:** DEC-031, DEC-032, DEC-033, DEC-034, DEC-035 (thay thế DEC-019, DEC-020, DEC-021, DEC-022, DEC-023, DEC-030)

---

## 1. Tóm tắt Mục tiêu & Phạm vi Đã Hoàn Thành

Đã hoàn thành tái cấu trúc và hiện thực hóa phân hệ **Presentation** quản lý bố cục và giao diện website theo kiến trúc **100% Server-Side EJS SSR** (chạy chung trong ứng dụng Express, không SPA/React, không Headless Layout Service JSON REST API):

1. **Tái cấu trúc Cây Presentation `/sitecore/layout/` với đúng 3 nhánh (DEC-032):**
   - Loại bỏ hoàn toàn các nhánh cũ `Devices` và `Placeholder Settings`.
   - Cây hệ thống chỉ có đúng 3 nhánh con cốt lõi:
     - `/sitecore/layout/Layouts`: Chứa layout items (`HomeLayout`...).
     - `/sitecore/layout/Placeholders`: Chứa placeholder items (`header`, `maincontent`, `footer`...).
     - `/sitecore/layout/Renderings`: Chứa rendering items (`HeroBanner`, `Introduction`, `ImageText`...).
   - Khóa bảo vệ các node hệ thống: cấm xoá, đổi tên, di chuyển đối với `/sitecore/layout` và 3 nhánh con.
   - Insert Options nghiêm ngặt theo template folder tương ứng.

2. **Quản trị bố cục bằng thuộc tính `viewPath` & Cơ chế Bảo mật (DEC-033):**
   - Mỗi `Layout` và `Rendering` lưu đường dẫn `viewPath` trỏ đến file EJS trong thư mục `src/views/site/`.
   - Hàm xác thực `presentationService.validateViewPath`:
     - Whitelist thư mục an toàn: chỉ chấp nhận file nằm dưới `site/` (`src/views/site/`).
     - Chặn triệt để Path Traversal (`..`, `\`, null bytes).
     - Bắt buộc đuôi file `.ejs`.
     - Kiểm tra file tồn tại trên ổ đĩa vật lý khi lưu trong Content Editor; cảnh báo nếu file view chưa được tạo.

3. **Standard Presentation & Kế thừa Component Template (DEC-035):**
   - Định nghĩa Component Templates dưới `/sitecore/templates/Feature/Components/` (`HeroBanner`, `Introduction`, `ImageText`).
   - Định nghĩa Page Templates dưới `/sitecore/templates/Project/Pages/` (`Home`, `AboutUs`).
   - Page Templates kế thừa trực tiếp các Component Templates qua mảng `baseTemplates`, giúp Page Item sở hữu trực tiếp các trường dữ liệu của component (`BackgroundImage`, `HeroTitle`, `IntroHeading`...).
   - Cấu hình **Standard Presentation** trên Page Template: gắn `layoutId` và danh sách renderings theo placeholder.

4. **Tầng Service & Thuật toán Phân giải Bố cục (`presentationService.getFinalPresentation`):**
   - Phân giải hợp nhất 3 tầng bố cục: **Standard Presentation** (từ Page Template) $\rightarrow$ **Shared Presentation** (cấp toàn cục item) $\rightarrow$ **Final Presentation** (override theo từng ngôn ngữ và version `[lang, version]`).
   - Hỗ trợ thao tác delta: override thuộc tính, thêm rendering mới vào placeholder, ẩn rendering (`hidden: true`), đổi thứ tự sắp xếp `sortOrder`.
   - Hàm `getAllowedRenderings(placeholderKey)`: kiểm tra danh sách rendering được phép chèn vào placeholder dựa trên field `allowedRenderings` của Placeholder item.
   - Hàm `resetToStandard`: xóa override trên item, khôi phục nguyên bản cấu hình từ Template.
   - Hàm `getUsage`: kiểm tra quét tham chiếu toàn cục, ngăn chặn xoá Layout hoặc Rendering đang được Template hoặc Content Item sử dụng.

5. **Giao diện Presentation Details Modal trong Content Editor:**
   - Loại bỏ hoàn toàn Device Tabs (DEC-031).
   - Chọn Layout cho trang hiển thị tên và `viewPath` thực tế.
   - Hiển thị danh sách renderings gom nhóm theo từng Card Placeholder (`header`, `maincontent`, `footer`).
   - Tích hợp **SortableJS**: kéo thả sắp xếp thứ tự các component trong cùng placeholder hoặc chuyển sang placeholder khác mượt mà.
   - Modal Thêm Component: tự động lọc danh sách theo `allowedRenderings` của placeholder đang chọn.
   - Nút "Reset to standard presentation": khôi phục layout mặc định kèm hộp thoại xác nhận.
   - Nút "Preview Layout Structure": xem cấu trúc JSON phân giải của trang.

6. **Seed Data & Bộ View EJS Mẫu:**
   - Cung cấp layout EJS chuẩn `src/views/site/layouts/HomeLayout.ejs` tích hợp helper `<%- placeholder('header') %>`, `<%- placeholder('maincontent') %>`, `<%- placeholder('footer') %>`.
   - Cung cấp component EJS chuẩn: `HeroBanner.ejs`, `Introduction.ejs`, `ImageText.ejs`.
   - Cung cấp trang lỗi `src/views/site/404.ejs` và stylesheet công khai `public/site/css/style.css`.
   - Script seed idempotent: `src/scripts/seed-presentation-data.js` tự động khởi tạo hoặc cập nhật cây presentation chuẩn.

7. **Kích hoạt Ribbon Tab Presentation:**
   - Tab `PRESENTATION` trên Ribbon Content Editor đã được bật với các nút: Details, Reset to Standard, Preview.

---

## 2. Danh mục File & Thư mục Đã Tạo / Cập Nhật

| Loại file | Đường dẫn file | Mô tả |
| :--- | :--- | :--- |
| **Model** | `src/models/Template.js` | Cập nhật schema `presentation` dạng `{ layoutId, renderings }` cho Standard Presentation |
| **Model** | `src/models/Item.js` | Cập nhật schema `presentation.shared` và `presentation.final` (bỏ `devices`), thêm indexes tìm kiếm rendering |
| **Service** | `src/services/presentationService.js` | Viết lại toàn bộ: `validateViewPath`, `getFinalPresentation`, `getAllLayouts`, `getAllPlaceholders`, `getAllRenderings`, `getAllowedRenderings`, `savePresentation`, `resetToStandard`, `getUsage` |
| **Service** | `src/services/versionService.js` | Đồng bộ sao chép `layoutId` và `renderings` của `presentation.final` khi nhân bản version / ngôn ngữ |
| **Controller**| `src/controllers/admin/presentationController.js` | Điều khiển modal Presentation Details EJS, lọc allowed renderings, lưu shared/final, reset presentation |
| **Routes** | `src/routes/admin/presentationRoutes.js` | Định tuyến Content Editor modal: `/admin/content-editor/item/:id/presentation` |
| **Routes** | `src/routes/api/presentationRoutes.js` | API endpoints: `/api/presentation/renderings/allowed`, `/api/presentation/item/:id`, `/api/presentation/template/:id/standard`, `/api/presentation/usage/:id` |
| **Views EJS**| `src/views/site/layouts/HomeLayout.ejs` | File Layout EJS chuẩn dùng placeholder helper |
| **Views EJS**| `src/views/site/components/HeroBanner.ejs` | Component EJS Hero Banner hiển thị field từ page item |
| **Views EJS**| `src/views/site/components/Introduction.ejs` | Component EJS Introduction |
| **Views EJS**| `src/views/site/components/ImageText.ejs` | Component EJS Image & Text |
| **Views EJS**| `src/views/site/404.ejs` | Trang 404 EJS của site |
| **Views Admin**| `src/views/admin/content-editor/presentation/details-modal.ejs` | Modal Presentation Details chuẩn SSR (bỏ device tabs, hiển thị viewPath và sortable placeholder cards) |
| **Views Admin**| `src/views/admin/content-editor/presentation/preview-json-modal.ejs` | Modal xem trước cấu trúc phân giải Presentation |
| **Client JS**| `public/js/admin/presentation-details.js` | Quản lý tương tác SortableJS, mở modal chọn rendering, gửi AJAX lưu shared/final và reset |
| **Config** | `src/config/ribbon.js` | Cập nhật tooltip và action Ribbon tab Presentation |
| **Seed** | `src/scripts/seed-presentation-data.js` | Script seed cây 3 nhánh, templates, items Home/AboutUs |
| **Tests** | `tests/presentationService.test.js` | Unit test 9/9 test cases kiểm thử validation viewPath, allowed renderings, getFinalPresentation delta, reset, usage |
| **Tests** | `tests/presentationLayoutTree.test.js` | Integration test 13/13 test cases kiểm thử cây 3 nhánh, phân quyền write, bảo vệ node hệ thống, chặn xoá layout đang dùng |
| **Tests** | `tests/presentationApi.test.js` | API test 9/9 test cases kiểm thử modal GET, save POST, reset POST, allowed renderings GET, auth 401 |
| **Tests** | `tests/versionService.test.js` | Cập nhật kiểm thử bảo toàn `presentation.final` khi tạo version mới |

---

## 3. Kết Quả Kiểm Thử Tự Động (Automated Testing)

Đã chạy toàn bộ test suite dự án bằng lệnh `npm test` (`jest --detectOpenHandles --forceExit`):

```text
Test Suites: 14 passed, 14 total
Tests:       129 passed, 129 total
Snapshots:   0 total
Time:        28.107 s
Ran all test suites.
```

Tất cả 14 test suites đều vượt qua 100%:
1. `tests/templateManagerApi.test.js` - PASS
2. `tests/contentEditorApi.test.js` - PASS
3. `tests/presentationService.test.js` - PASS (9/9 tests)
4. `tests/presentationLayoutTree.test.js` - PASS (13/13 tests)
5. `tests/itemService.test.js` - PASS
6. `tests/itemTree.test.js` - PASS
7. `tests/presentationApi.test.js` - PASS (9/9 tests)
8. `tests/versionService.test.js` - PASS (11/11 tests)
9. `tests/mediaApi.test.js` - PASS
10. `tests/authRoutes.test.js` - PASS
11. `tests/mediaService.test.js` - PASS
12. `tests/templateService.test.js` - PASS
13. `tests/richTextHelper.test.js` - PASS
14. `tests/smoke.test.js` - PASS

Kết quả kiểm tra mã nguồn bằng ESLint (`npm run lint`):
```text
> admin-cms@1.0.0 lint
> eslint src/ tests/
(0 errors, 0 warnings)
```

---

## 4. Đối Soát Tiêu Chí Hoàn Thành (Definition of Done)

| Tiêu chí DoD | Kết quả đối soát | Trạng thái |
| :--- | :--- | :---: |
| Mở Content Editor, chọn node `/sitecore/content/Home`. Tab `Presentation` trên Ribbon sáng và có thể tương tác. | Đã kích hoạt trong `src/config/ribbon.js` và xử lý click trong `content-editor.js`. | **ĐẠT** |
| Bấm nút "Presentation Details" -> Mở modal hiển thị Layout đang gán (`HomeLayout`), và các Rendering mặc định được kế thừa từ Standard Presentation của Template. | Modal `details-modal.ejs` render trực tiếp layout `HomeLayout` và renderings (`HeroBanner`, `Introduction`, `ImageText`) trong placeholder `maincontent`. | **ĐẠT** |
| Nhập `viewPath` sai hoặc cố tình chứa `../` -> Hệ thống báo lỗi từ chối lưu. | `validateViewPath` chặn path traversal, ép đuôi `.ejs` và kiểm tra whitelist `site/`. Test suite kiểm tra chi tiết. | **ĐẠT** |
| Thêm Rendering vào placeholder: Modal chỉ hiển thị các rendering hợp lệ theo cấu hình `allowedRenderings` của Placeholder item đó. | API `/api/presentation/renderings/allowed` và `select-rendering-modal.ejs` lọc chính xác danh sách component. | **ĐẠT** |
| Kéo thả sắp xếp đổi vị trí giữa các rendering trong placeholder -> Thứ tự `sortOrder` thay đổi mượt mà. | SortableJS khởi tạo trên từng `.rendering-dropzone` cập nhật `sortOrder` tự động. | **ĐẠT** |
| Bấm Lưu Presentation -> Cấu hình lưu thành công vào MongoDB dưới dạng Final Layout override. | Endpoint `POST /admin/content-editor/item/:id/presentation` lưu vào `presentation.final` theo language/version. | **ĐẠT** |
| Bấm "Reset to Standard Presentation" -> Cấu hình override bị xoá, presentation quay về trạng thái mặc định kế thừa từ Template. | Endpoint `POST /admin/content-editor/item/:id/presentation/reset` xoá override thành công. | **ĐẠT** |
| Nhánh cây `/sitecore/layout` hiển thị đúng 3 folder chính (`Layouts`, `Placeholders`, `Renderings`). Các node cốt lõi không thể đổi tên, di chuyển hoặc xoá. | Script seed tạo 3 nhánh, chặn xoá/rename node bảo vệ (`isProtectedSystemPath`). | **ĐẠT** |
| Bộ Unit & Integration Tests đạt 100% PASS, lint 0 errors. | 14/14 suites, 129/129 tests PASS, ESLint 0 errors, 0 warnings. | **ĐẠT** |

---

## 5. Kết Luận & Sẵn Sàng Chuyển Giao

Giai đoạn 6 (Presentation SSR EJS) đã được thực thi và nghiệm thu thành công. Toàn bộ kiến trúc và mã nguồn đã được đồng bộ với quyết định Server-Side EJS SSR (DEC-031 đến DEC-035), loại bỏ hoàn toàn các phụ thuộc cũ về React/Headless.

Hệ thống đã sẵn sàng cho giai đoạn tiếp theo: **GĐ 7 — Bảo mật nâng cao & Phân quyền ACL**.
Theo Quy tắc Vàng số 1 và số 2 trong `AGENTS.md`, AI Agent xin dừng lại tại đây và chờ lệnh phê duyệt:
`APPROVE GĐ 7` từ người dùng.
