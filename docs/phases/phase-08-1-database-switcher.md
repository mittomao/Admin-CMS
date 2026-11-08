---
phase: 8.1
name: Bộ chuyển Database Master / Web trong Content Editor (Database Switcher)
status: Hoàn thành
depends_on: [8]
estimate: 2 ngày làm việc
started: 2026-11-07
completed: 2026-11-07
updated: 2026-11-07
---

# GĐ 8.1 - Bộ chuyển Database Master / Web trong Content Editor (Database Switcher)
> Khả năng chuyển đổi và duyệt nội dung trực tiếp giữa cơ sở dữ liệu `master` và `web` ngay trong giao diện Content Editor, duyệt cây và form chế độ Web CHỈ ĐỌC (Strict Read-Only), hiển thị huy hiệu trạng thái xuất bản (Publish Badges), và trang tổng quan/đối soát dữ liệu `/admin/databases`.

---

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/workflow-publish-audit.md`](../data-model/workflow-publish-audit.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-039-execute-phase-08-before-phase-07.md`](../decisions/DEC-039-execute-phase-08-before-phase-07.md)
- [`docs/decisions/DEC-041-content-editor-database-switcher-master-web.md`](../decisions/DEC-041-content-editor-database-switcher-master-web.md)

---

## 1. Hiện trạng → Thay đổi → Rủi ro

| Tiêu chí | Hiện trạng (Sau GĐ 8 & GĐ 10) | Thay đổi trong GĐ 8.1 | Rủi ro & Giải pháp giảm thiểu |
| :--- | :--- | :--- | :--- |
| **Duyệt Web DB** | Chỉ có thể xem gián tiếp qua Website công khai (`/`, `/about-us`) hoặc database client MongoDB. | Content Editor cho phép chuyển đổi linh hoạt qua lại giữa `master` và `web` thông qua query param `?db=web` trên URL và dropdown ở taskbar/Ribbon VIEW. | **Rủi ro:** Nhầm lẫn giữa 2 database.<br>**Giải pháp:** Dải banner thông báo màu cam/vàng cảnh báo cảnh báo nổi bật trên form Web: "Đang xem WEB database (chỉ đọc)"; đổi badge DB ở taskbar. |
| **Tính toàn vẹn Web Store** | Web Store (`items_web`) chỉ được ghi bởi `publishService`. | Vẫn duy trì nguyên tắc: Web Store là **CHỈ ĐỌC tuyệt đối**. Tất cả endpoint ghi (POST, PUT, DELETE, Workflow, Publish...) nếu nhận `db=web` sẽ bị server từ chối ngay lập tức (403/409). | **Rủi ro:** Bypass UI để gửi request ghi vào Web.<br>**Giải pháp:** Server-side guard cưỡng chế ở cấp độ router/controller/service, không chỉ ẩn nút ở client. |
| **Kiến trúc Repository** | `itemService` đọc từ `items_master`; `webItemService` đọc riêng từ `items_web`. | Xây dựng abstraction `getItemRepository(dbName)` chuẩn hóa, `itemService` nhận tham số `db` (`master` hoặc `web`) để phục vụ chung logic đọc (tra cứu ID, đường dẫn, con cháu, phân giải trường) mà không nhân đôi code. | **Rủi ro:** Query nhầm collection khi truyền param tùy tiện.<br>**Giải pháp:** Whitelist validation nghiêm ngặt: chỉ chấp nhận `'master'` hoặc `'web'`; giá trị khác lập tức ném `ValidationError(400)`. |
| **Trạng thái Publish ở Master** | Người dùng không biết item ở Master đã được publish chưa trừ khi mở modal xuất bản. | Hiển thị huy hiệu (Badge) trên Form và Cây nội dung: **Chưa xuất bản / Đã xuất bản / Có thay đổi chưa xuất bản**. | **Rủi ro:** Quá tải N+1 truy vấn khi load cây.<br>**Giải pháp:** Tính toán theo lô (Batch query) cho các node anh chị em cùng cấp; cung cấp tùy chọn bật/tắt badge trong tab Ribbon VIEW. |
| **Đối soát Dữ liệu Master vs Web** | Chưa có công cụ so sánh tổng quan mức toàn site. | Trang tổng quan `/admin/databases` thống kê số lượng item theo nhánh gốc, phân loại: Missing (chưa publish), Changed (có thay đổi), Orphan (mồ côi ở Web). | **Rủi ro:** Quét toàn bộ DB làm chậm server.<br>**Giải pháp:** Phân trang, lọc theo nhánh gốc, tận dụng indexes `updatedAt`, `sourceVersion`, `path`. |

---

## 2. Mục tiêu & Phạm vi

### Trong phạm vi (In-Scope):
1. **Bộ chuyển đổi Database (Database Switcher):**
   - Dropdown chuyển đổi `master | web` đặt tại thanh trạng thái phía dưới (Taskbar/Tree Footer) và trong Ribbon tab VIEW.
   - Trạng thái được duy trì bằng tham số query URL `?db=web` (giúp mở nhiều tab trình duyệt độc lập không ảnh hưởng session).
2. **Chế độ Web CHỈ ĐỌC (Strict Read-Only):**
   - Cây nội dung (Fancytree) lazy-load đọc từ `items_web`. Item chưa publish không xuất hiện.
   - Form soạn thảo hiển thị dữ liệu của phiên bản đã publish, toàn bộ inputs/controls ở trạng thái `disabled`.
   - Ribbon: Vô hiệu hóa toàn bộ nút ghi (Save, Insert, Duplicate, Move, Delete, Rename, Sort, Workflow, Publish). Chỉ mở các nút đọc/xem, Refresh, chuyển database.
   - Dropdown Ngôn ngữ & Version: Chỉ liệt kê các ngôn ngữ và version đang tồn tại ở Web.
   - Quick Info: Bổ sung các thông số xuất bản: `Published at`, `Published by`, `Source version`, `Database: web`.
   - Nút điều hướng chéo: "View in Web" (khi ở Master) và "Open in Master" (khi ở Web).
3. **Huy hiệu Trạng thái Xuất bản (Publish Status Badges):**
   - So sánh nhanh tại Master:
     - `Chưa xuất bản`: Item chưa từng tồn tại trên Web Store.
     - `Đã xuất bản`: Item đã có trên Web Store và trùng khớp phiên bản/thời gian cập nhật.
     - `Có thay đổi`: Item đã sửa trên Master nhưng chưa được xuất bản lại.
   - Batching query tối ưu, không N+1; toggle bật/tắt trong tab VIEW.
4. **Trang Quản lý & Đối soát Database (`/admin/databases`):**
   - Bảng thống kê số lượng item Master vs Web theo 4 nhánh gốc (`content`, `layout`, `templates`, `media library`).
   - Danh sách phân loại: Missing ở Web, Mồ côi ở Web (Orphan), Khác biệt (Changed). Hỗ trợ tìm kiếm, phân trang và link mở trực tiếp item ở database tương ứng.
5. **Bảo mật & Phân quyền:**
   - 100% kiểm tra quyền qua `canPerform(user, item, action)`:
     - `database:web:read`: Quyền xem Web DB (Admin, Approver).
     - `database:compare`: Quyền xem trang đối soát Database Manager (Admin, Approver).
   - Kiểm tra `db=web` trên tất cả mutation endpoints và trả lỗi 403 Forbidden.

### Ngoài phạm vi (Out-of-Scope):
- Không cho phép chỉnh sửa dữ liệu Web trực tiếp dưới bất kỳ hình thức nào.
- Không làm tính năng đồng bộ ngược (Reverse Sync Web &rarr; Master).
- Không làm so sánh chi tiết diff từng ký tự của từng trường giữa Master và Web (chỉ so khớp trạng thái version/hash/updatedAt).
- Không làm phân quyền ACL theo từng item (dành cho GĐ 7).

---

## 3. Checklist Task Triển khai

- [x] **Task 8.1.1: Trừu tượng hóa Repository & Cập nhật Service Tầng Đọc**
  - Tạo repository factory `getItemRepository(dbName)` trong `src/models/` hoặc `src/services/` hỗ trợ trả về `Item` (với `master`) hoặc `PublishedItem` (với `web`).
  - Validate whitelist nghiêm ngặt: chỉ nhận `'master'` hoặc `'web'`; ném `ValidationError(400)` nếu nhận giá trị lạ.
  - Cập nhật các hàm đọc của `itemService` nhận thêm tham số `db = 'master'`: `getById`, `getByPath`, `getChildren`, `getRoot`, `search`, `getPathBreadcrumb`, `getQuickInfo`.

- [x] **Task 8.1.2: Thiết lập Tường lửa Chống Ghi Tuyệt đối trên Web Database (Server-Side Guards)**
  - Cập nhật middleware hoặc validation trong controller: Nếu request mutation (`POST`, `PUT`, `DELETE`) nhận `req.query.db === 'web'` hoặc `req.body.db === 'web'`, lập tức từ chối với HTTP 403 Forbidden ("Web database là kho dữ liệu chỉ đọc").
  - Đảm bảo các dịch vụ nghiệp vụ ghi (`createItem`, `updateFields`, `renameItem`, `duplicateItem`, `copyItem`, `moveItem`, `deleteItem`, `workflowService.execute`, `publishService.unpublishItem`) luôn luôn gắn chặt vào collection `items_master`.

- [x] **Task 8.1.3: Cập nhật API Cây & Form Hỗ trợ Tham số `db`**
  - Cập nhật `GET /api/items/:id/children?db=master|web`: Nếu `db=web`, load danh sách con từ `items_web`.
  - Cập nhật `GET /api/items/search?q=&db=master|web`: Tìm kiếm theo đúng database chỉ định.
  - Cập nhật `GET /admin/content-editor/item/:id/form?db=master|web&lang=&version=`: Kết xuất form tương ứng; ở chế độ Web tải dữ liệu từ `PublishedItem`.
  - Cập nhật Quick Info partial `src/views/partials/quick-info.ejs` hiển thị thêm các metadata: `Database`, `Published at`, `Published by`, `Source version`.

- [x] **Task 8.1.4: Giao diện Bộ chuyển Database & Khóa Form Web trên Client**
  - Bổ sung dropdown chuyển database tại Footer Cây Content Editor và Taskbar dưới đáy màn hình.
  - Cập nhật Ribbon config (`src/config/ribbon.js`): Kích hoạt tab `VIEW`, thêm nhóm `Database` (chuyển Master/Web) và nhóm `Tree Options` (Bật/tắt huy hiệu Publish).
  - Cập nhật client script `public/js/admin/content-editor.js`:
    - Duy trì tham số `?db=` trên URL khi chuyển cây, chuyển ngôn ngữ, chuyển version và chuyển item.
    - Cảnh báo xác nhận modal (Unsaved Changes) nếu chuyển database khi form Master đang có thay đổi chưa lưu (dirty).
    - Ở chế độ `web`: Disable toàn bộ input/textarea/select/buttons trên form; chèn dải thông báo màu cam vàng nổi bật: *"Đang xem WEB database (chỉ đọc)"*; vô hiệu hóa các nút ghi trên Ribbon.
    - Thêm nút liên kết chéo "Open in Master" (khi ở web) và "View in Web" (khi ở master nếu đã publish).

- [x] **Task 8.1.5: Tính toán & Hiển thị Huy hiệu Trạng thái Xuất bản (Publish Status Badges)**
  - Xây dựng API batch `/api/items/publish-status-batch?ids=...`: So sánh mảng item Master với `PublishedItem` ở Web Store để trả về trạng thái `UNPUBLISHED`, `PUBLISHED`, hoặc `CHANGED`.
  - Hiển thị badge màu tương ứng trên tiêu đề form soạn thảo và tùy chọn hiển thị icon/badge trên cây Fancytree khi được bật trong tab VIEW.

- [x] **Task 8.1.6: Trang Quản lý & Đối soát Database (`/admin/databases`)**
  - Xây dựng Controller `src/controllers/admin/databaseController.js` và routes `src/routes/admin/databaseRoutes.js`.
  - Endpoint `GET /admin/databases`: Giao diện Dashboard đối soát Master vs Web.
  - Endpoint `GET /api/databases/summary`: Bảng tổng hợp số lượng item theo nhánh gốc và ngôn ngữ.
  - Endpoint `GET /api/databases/diff?branch=&type=missing|orphan|changed&lang=&page=`: Danh sách chi tiết các item có sự khác biệt giữa hai kho dữ liệu, có phân trang và link mở trực tiếp.
  - Thêm tile ứng dụng "Databases" trên Admin Launchpad.

- [x] **Task 8.1.7: Kiểm thử Hồi quy Toàn diện & Báo cáo**
  - Viết bộ Unit & Integration tests (`tests/databaseSwitcher.test.js`):
    - Kiểm tra duyệt cây và nạp form ở chế độ `web` (chỉ hiển thị item đã publish, dữ liệu đúng version published).
    - Kiểm tra từ chối mọi thao tác ghi khi truyền `db=web` và từ chối `db` lạ ngoài whitelist.
    - Kiểm tra tính đúng đắn của huy hiệu Publish Status (Unpublished, Published, Changed).
    - Kiểm tra API diff (missing, orphan, changed).
    - Kiểm tra phân quyền `canPerform` với các action mới `database:web:read` và `database:compare`.
    - Kiểm tra tĩnh: Grep 0 hardcoded role checks.
  - Chạy toàn bộ test suites hiện có (GĐ 0-8 & GĐ 10) và ESLint đạt 100% PASS.
  - Lập báo cáo nghiệm thu `docs/reports/phase-08-1-report.md`.

---

## 4. Definition of Done (DoD) & Cách kiểm thử thủ công

1. **Chuyển đổi Database:**
   - Trong Content Editor, chọn chuyển sang `Web`: URL tự động cập nhật `?db=web`, cây nội dung reload hiển thị đúng danh sách các item đã publish.
   - Các item chưa publish hoặc đang ở trạng thái Draft hoàn toàn không hiển thị trên cây Web.
2. **Giao diện Web Chỉ đọc:**
   - Form hiển thị dải thông báo màu nổi bật: *"Đang xem WEB database (chỉ đọc)"*.
   - Mọi trường nhập liệu đều bị `disabled`, nút Save trên form và tất cả các nút ghi trên Ribbon (Save, Insert, Delete, Rename, Move, Workflow, Publish...) đều bị vô hiệu hóa.
   - Quick Info hiển thị rõ `Database: web`, `Published at`, `Published by`, `Source version`.
3. **Bảo vệ Server-Side:**
   - Dùng curl/Postman gửi request `PUT /api/items/:id/fields?db=web` hoặc `POST /api/items?db=web`: Server trả về mã lỗi `403 Forbidden` kèm thông báo lỗi rõ ràng.
4. **Huy hiệu Publish Status:**
   - Tạo item mới ở Master &rarr; hiển thị badge `Chưa xuất bản`.
   - Publish item sang Web &rarr; hiển thị badge `Đã xuất bản`.
   - Sửa một trường ở Master nhưng chưa publish lại &rarr; hiển thị badge `Có thay đổi chưa xuất bản`.
5. **Trang Đối soát `/admin/databases`:**
   - Truy cập `/admin/databases`: Thấy bảng số liệu đối soát chính xác giữa Master và Web; tab Missing, Orphan và Changed lọc đúng dữ liệu; click vào item mở đúng Content Editor với đúng database tương ứng.
6. **Kiểm thử tự động:**
   - 100% test suites (bao gồm tests GĐ 0-8, GĐ 10 và GĐ 8.1) chạy thành công không có lỗi.
   - ESLint không có lỗi cú pháp hoặc cảnh báo.

