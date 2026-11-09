---
phase: 11
name: Serialization (JSON Multi-Branch Package Export/Import 2 Tab & Toast)
status: Hoàn thành
depends_on: [2, 3, 8]
estimate: 1.5 ngày làm việc
started: 2026-11-09
completed: 2026-11-09
updated: 2026-11-09
---

# GĐ 11 - Tính năng Serialization (JSON Multi-Branch Package Export/Import)
> Hệ thống Serialization chuẩn hóa: Trang quản trị 2 Tab độc lập (Export Package & Import Package), tùy chọn 5 phân vùng xuất linh hoạt, thực thi nhập tuần tự 4 bước an toàn phụ thuộc, và thông báo Toast kết quả chi tiết.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)

## Mục tiêu
Xây dựng tính năng Serialization toàn diện cho Treecraft CMS, cho phép kết xuất (Export) và nhập khẩu (Import/Sync) dữ liệu Item, Cây phân cấp, Trường động, Phiên bản ngôn ngữ và Bố cục Presentation (Layouts, Renderings, Placeholders) ra tệp JSON chuẩn hóa phục vụ sao lưu, di chuyển môi trường (Development $\rightarrow$ Staging $\rightarrow$ Production) và khôi phục thảm họa.

## Phạm vi
- **Làm (DUY NHẤT):**
  - **Trang Quản trị Serialization chuyên biệt (`/admin/serialization`):** Giao diện chia thành **2 Tab độc lập**:
    - **Tab 1: Export Package (Xuất gói):** Cho phép tick chọn các phân vùng xuất (Content, Template, Layout, Rendering, Placeholder), nút Preset 1-click, chọn root path linh hoạt, và tải về tệp JSON.
    - **Tab 2: Import Package (Nhập gói):** Vùng kéo thả tệp JSON (Dropzone), bộ phân tích (Inspector) thống kê chi tiết số lượng item từng loại, tùy chọn xử lý xung đột (Overwrite / Skip / Rename), và thanh tiến trình.
  - **Hệ thống Thông Báo Toast kết quả rõ ràng:** Thông báo nổi góc màn hình báo cáo chi tiết trạng thái (thành công, lỗi, cảnh báo) kèm số lượng items đóng gói, tạo mới, cập nhật hoặc bỏ qua.
  - **Dịch vụ `serializationService.js`:**
    - Xuất gói dữ liệu đa phân vùng (Multi-Branch JSON Package v1.0).
    - Kiểm tra và phân tích tệp JSON (`inspectPackage`).
    - Nạp dữ liệu tuần tự 4 bước an toàn phụ thuộc kỹ thuật: `Templates` $\rightarrow$ `Layouts & Placeholders` $\rightarrow$ `Renderings` $\rightarrow$ `Content`.
  - **Launchpad Tile & Quyền truy cập:** Thêm tile `Serialization` (`ti ti-package-export`) vào Launchpad, phân quyền `serialization:*` cho Administrator.
- **Không làm (Tách sang giai đoạn sau):** Forms Builder, Full-text Search, Control Panel flush cache/rebuild index, Experience Editor iframe.

## Checklist Task
- [x] **Task 11.1:** Cấu hình Phân quyền & Launchpad Tile cho Serialization:
  - Bổ sung `SERIALIZATION_READ`, `SERIALIZATION_EXPORT`, `SERIALIZATION_IMPORT` trong `src/config/permissions.js` và `src/services/aclService.js`.
  - Bổ sung App Tile "Serialization" trong Launchpad (`src/controllers/admin/launchpadController.js`, `src/scripts/seed-initial-data.js` và migration script `src/scripts/migrate-phase-11-launchpad.js`).
- [x] **Task 11.2:** Xây dựng lõi nghiệp vụ `src/services/serializationService.js`:
  - `exportPackage(options)`: Đóng gói JSON đa phân vùng (Content, Templates, Layouts, Renderings, Placeholders) kèm phân giải metadata độc lập (`templatePath`, `layoutPath`, `renderingPath`).
  - `inspectPackage(packageData)`: Phân tích cú pháp, thống kê items theo từng phân vùng và kiểm tra phụ thuộc.
  - `importPackage(packageData, options)`: Thực thi nạp tuần tự 4 bước an toàn (Templates $\rightarrow$ Layouts/Placeholders $\rightarrow$ Renderings $\rightarrow$ Content) với 3 chế độ xử lý trùng (`OVERWRITE`, `SKIP`, `RENAME`).
- [x] **Task 11.3:** Xây dựng Controller và Tuyến đường (Routes & API):
  - `src/controllers/admin/serializationController.js`: Render trang 2 Tab và các API endpoint xử lý xuất, phân tích và nạp gói dữ liệu.
  - `src/routes/admin/serializationRoutes.js` (`GET /admin/serialization`).
  - `src/routes/api/serializationRoutes.js` (`POST /api/serialization/export-package`, `POST /api/serialization/inspect`, `POST /api/serialization/import`).
  - Đăng ký middleware và route trong `src/app.js`.
- [x] **Task 11.4:** Thiết kế giao diện Quản trị 2 Tab & Hệ thống Toast (`src/views/admin/serialization/index.ejs`):
  - Tab 1: Xuất Gói (Export Package) với các checkbox chọn phân vùng, preset buttons, nút download JSON.
  - Tab 2: Nhập Gói (Import Package) với dropzone kéo thả, bảng phân tích file, tùy chọn xung đột, nút import.
  - Hệ thống thông báo Toast semantic báo cáo số lượng item chi tiết cho mọi thao tác.
- [x] **Task 11.5:** Kiểm thử tự động & Nghiệm thu:
  - Unit test `tests/serializationService.test.js` & API test `tests/serializationApi.test.js`.
  - Đảm bảo toàn bộ test suites hiện có giữ vững 100% PASS, ESLint 0 lỗi, Branding 100% Treecraft.

## File/Thư mục Dự kiến
- `src/services/serializationService.js`
- `src/controllers/admin/serializationController.js`
- `src/routes/admin/serializationRoutes.js`
- `src/routes/api/serializationRoutes.js`
- `src/views/admin/serialization/index.ejs`
- `src/scripts/migrate-phase-11-launchpad.js`
- `tests/serializationService.test.js`, `tests/serializationApi.test.js`

## Route / API Dự kiến
- `GET /admin/serialization` (Giao diện 2 Tab Export & Import)
- `POST /api/serialization/export-package` (Tải về file JSON)
- `POST /api/serialization/inspect` (Phân tích gói JSON nạp lên)
- `POST /api/serialization/import` (Thực thi nhập tuần tự 4 bước và trả về kết quả cho Toast)

## Thay đổi Database
- Thêm app tile `Serialization` vào collection `launchpad_apps`.

## Definition of Done & Cách kiểm thử
- Truy cập `/admin/serialization`, hiển thị 2 Tab rõ ràng: Tab 1 "Export Package" và Tab 2 "Import Package".
- Tại Tab 1: Chọn các phân vùng (Content, Templates, Layouts, Renderings, Placeholders) và bấm "Xuất Gói Dữ Liệu" $\rightarrow$ Tệp JSON tải về máy thành công, hiển thị Toast xanh báo chính xác số items đã xuất.
- Tại Tab 2: Kéo thả file JSON vào Dropzone $\rightarrow$ Hiển thị Toast thông báo kiểm tra tệp hợp lệ và bảng thống kê chi tiết các mục.
- Bấm "Bắt đầu Nhập Gói" $\rightarrow$ Dữ liệu nạp tuần tự qua 4 bước (Templates $\rightarrow$ Layouts $\rightarrow$ Renderings $\rightarrow$ Content), hiển thị Toast xanh báo cáo chi tiết: Số item tạo mới, số item cập nhật, số item bỏ qua.
- Toàn bộ 36 test suites hiện tại giữ vững 100% PASS; bổ sung unit test & API test cho Serialization đạt 100% PASS.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Tệp JSON import quá lớn gây tràn bộ nhớ Node.js.
- *Giảm thiểu:* Sử dụng JSON stream parser (`stream-json`) khi xử lý file import kích thước lớn.

## Ghi chú / Kết quả
- **Hoàn thành GĐ 11 (2026-11-09):**
  - Xây dựng thành công hệ thống Serialization Package Manager chuyên biệt tại `/admin/serialization` với 2 Tab (Export Package & Import Package).
  - Tích hợp 5 phân vùng xuất linh hoạt (Content, Template, Layout, Rendering, Placeholder), preset 1-click.
  - Lõi `serializationService.js` thực thi nạp tuần tự 4 bước an toàn phụ thuộc kỹ thuật (Templates $\rightarrow$ Layouts/Placeholders $\rightarrow$ Renderings $\rightarrow$ Content) với 3 chế độ xung đột (`OVERWRITE`, `SKIP`, `RENAME`).
  - Hệ thống thông báo Toast semantic báo cáo số lượng item chi tiết cho mọi thao tác xuất, kiểm tra tệp và nhập dữ liệu.
  - 38/38 test suites (376/376 tests) đạt 100% PASS, 0 lỗi ESLint, 100% tuân thủ Treecraft.

