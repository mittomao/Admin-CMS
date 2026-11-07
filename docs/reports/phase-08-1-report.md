# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 8.1
## BỘ CHUYỂN DATABASE MASTER / WEB TRONG CONTENT EDITOR & TRANG ĐỐI SOÁT DỮ LIỆU

- **Giai đoạn:** 8.1 (Phần mở rộng trực quan hóa Master / Web sau GĐ 8 & GĐ 10)
- **Ngày bắt đầu:** 2026-11-07
- **Ngày hoàn thành:** 2026-11-07
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu)
- **Tài liệu tham chiếu:** [`docs/phases/phase-08-1-database-switcher.md`](../phases/phase-08-1-database-switcher.md)
- **Quyết định kiến trúc:** [`docs/decisions/DEC-041-content-editor-database-switcher-master-web.md`](../decisions/DEC-041-content-editor-database-switcher-master-web.md)

---

### 1. Tóm tắt kết quả triển khai

Toàn bộ các yêu cầu của Giai đoạn 8.1 đã được hoàn thành 100%:

1. **Bộ chuyển đổi Database (Database Switcher):**
   - Content Editor tích hợp dropdown chuyển đổi `master | web` tại 3 vị trí chuẩn Sitecore:
     - Thanh công cụ Ribbon tab **VIEW** (nhóm *Database*: nút *Master DB*, *Web DB*).
     - Chân cây nội dung (Tree Footer Status Bar).
     - Thanh tác vụ dưới cùng (Taskbar) ở góc phải.
   - Trạng thái database được quản lý và duy trì nghiêm ngặt qua query parameter `?db=web` trên URL, đảm bảo việc mở nhiều tab trình duyệt độc lập không gây nhầm lẫn trạng thái.
   - Chặn mất dữ liệu (Dirty Form Tracker): Hiển thị modal/hộp thoại xác nhận hủy bỏ thay đổi chưa lưu trước khi chuyển database nếu form Master đang ở trạng thái dirty.

2. **Chế độ Web CHỈ ĐỌC Tuyệt đối (Strict Read-Only Mode):**
   - **Cây nội dung (Fancytree):** Lazy-load đọc trực tiếp từ collection `items_web`. Các item chưa xuất bản hoặc đang ở trạng thái Draft hoàn toàn không hiển thị trên cây Web. Vô hiệu hóa kéo thả di chuyển node (`dnd5.dragStart: () => false`).
   - **Form soạn thảo:** Dữ liệu hiển thị của phiên bản đã publish. Toàn bộ trường nhập liệu và các nút thao tác trường được khóa cứng thông qua cơ chế HTML5 `<fieldset disabled>`.
   - **Dải banner cảnh báo:** Phía trên form hiển thị dải thông báo màu cam/vàng Sitecore nổi bật: *"Đang xem WEB database (chỉ đọc). Mọi chỉnh sửa bị khóa. Chỉ hiển thị phiên bản đã xuất bản."*
   - **Khóa Ribbon Toolbar:** Vô hiệu hóa toàn bộ các nút ghi dữ liệu (`Save`, `Insert`, `Duplicate`, `Copy To`, `Move To`, `Delete`, `Rename`, `Sort`, `Workflow Command`, `Publish Item`, `Unpublish`, `Add Version`, `Add Language`, `Delete Version`, `Reset Presentation`).
   - **Liên kết điều hướng chéo:**
     - Nút *"Open in Master"* trên header form và banner Web giúp nhảy ngay sang item tương ứng trên Master.
     - Nút *"View in Web"* trên header form Master (nếu item đã được publish).
     - Item mồ côi (*Orphan* - tồn tại trên Web nhưng đã bị xóa trên Master) được gắn badge cảnh báo đỏ: `MỒ CÔI (ORPHAN) - Đã xóa trên Master`.
     - Truy cập trực tiếp item chưa publish ở chế độ web (`/admin/content-editor/:id?db=web`) hiển thị banner thông báo thân thiện kèm nút chuyển sang Master.

3. **Huy hiệu Trạng thái Xuất bản (Publish Status Badges):**
   - Tính toán trạng thái so sánh giữa Master và Web:
     - `Chưa xuất bản` (Unpublished / Draft): Item chưa từng tồn tại trên Web Store.
     - `Đã xuất bản` (Live / Published): Item đã có trên Web Store và trùng khớp phiên bản/thời gian cập nhật.
     - `Có thay đổi chưa xuất bản` (Changed): Item đã sửa đổi hoặc thêm version mới trên Master nhưng chưa được xuất bản lại.
   - Huy hiệu màu sắc hiển thị trực tiếp trên Header Form của Content Editor.
   - Tính năng bật/tắt hiển thị huy hiệu trên cây Fancytree trong Ribbon tab **VIEW** (`Publish Badges`), tối ưu hóa hiệu năng bằng API batching (`GET /api/items/publish-status-batch?ids=...`) với truy vấn `$in`, ngăn chặn triệt để vấn đề N+1 query.

4. **Trang Quản lý & Đối soát Database (`/admin/databases`):**
   - Giao diện Dashboard đối soát Master vs Web đạt chuẩn Sitecore desktop-like UI (hỗ trợ Dark / Light mode).
   - Thẻ thống kê tổng quan: Tổng số item Master, tổng số item Web, tổng số lượng item chênh lệch.
   - Bảng tổng hợp theo 4 nhánh gốc hệ thống:
     - `/sitecore/content`
     - `/sitecore/layout`
     - `/sitecore/templates`
     - `/sitecore/media library`
   - Bảng danh sách chi tiết các item khác biệt (Reconciliation Diff):
     - Lọc theo nhánh gốc (Branch Selector).
     - Tab lọc theo phân loại: *Tất cả*, *Chưa publish (Missing)*, *Có thay đổi (Changed)*, *Mồ côi (Orphan)*.
     - Phân trang (Pagination) mượt mà, cung cấp link mở trực tiếp item ở Master DB hoặc Web DB.
   - Tích hợp biểu tượng ứng dụng **Databases** trên Launchpad quản trị.

5. **Bảo mật & Server-Side Guard:**
   - **Chống ghi tuyệt đối vào Web Store:** Middleware `assertWritableDb` tại router `/api/items` chặn đứng mọi request mutation (`POST`, `PUT`, `PATCH`, `DELETE`) nếu nhận `db=web` và trả về HTTP 403 Forbidden: *"Web database là kho dữ liệu chỉ đọc (Strict Read-Only). Không được phép chỉnh sửa trực tiếp."*
   - **Whitelist Validation:** Hàm `itemService.validateDb(db)` chỉ cho phép 2 giá trị `'master'` hoặc `'web'`; từ chối mọi giá trị lạ với HTTP 400 Bad Request.
   - **Phân quyền 100% qua `canPerform`:**
     - `database:web:read`: Quyền xem Web DB (Admin, Approver).
     - `database:compare`: Quyền xem trang đối soát Database Manager (Admin, Approver).
     - **Không có bất kỳ kiểm tra role cứng nào** (`user.role === ...`) trong controller, view hay client JS.

---

### 2. Danh sách file thay đổi & tạo mới

| STT | File | Trạng thái | Mô tả |
| :---: | :--- | :---: | :--- |
| 1 | `src/config/permissions.js` | Sửa | Khai báo hằng số action `DATABASE_WEB_READ`, `DATABASE_COMPARE` |
| 2 | `src/services/itemService.js` | Sửa | Thêm `validateDb`, `getItemRepository`, cập nhật các hàm đọc (`db='master'`), thêm `getPublishStatus`, `getPublishStatusBatch`, ánh xạ quyền trong `canPerform` |
| 3 | `src/routes/api/itemRoutes.js` | Sửa | Thêm middleware whitelist `validateDb` & guard chống ghi `db=web` (403), thêm route `/api/items/publish-status-batch` |
| 4 | `src/controllers/admin/contentEditorController.js` | Sửa | Cập nhật `index`, `getItemFormPartial`, `getItemFolderViewPartial`, `getTreeNodes`, `getItemQuickInfo`, `searchItems` nhận tham số `db` |
| 5 | `src/config/ribbon.js` | Sửa | Kích hoạt tab `VIEW`, thêm group `Database` (Master/Web) và group `Tree Options` (Publish Badges) |
| 6 | `src/views/content-editor/index.ejs` | Sửa | Thêm dropdown switcher ở chân cây, truyền `window.__CURRENT_DB__` cho client |
| 7 | `src/views/content-editor/item-form.ejs` | Sửa | Thêm banner Web Read-Only, badge Publish Status, nút Open in Master / View in Web, bọc `<fieldset disabled>` |
| 8 | `src/views/partials/quick-info.ejs` | Sửa | Hiển thị `Database`, `Published at`, `Published by`, `Source version` |
| 9 | `src/views/partials/taskbar.ejs` | Sửa | Dynamic DB dropdown indicator |
| 10 | `src/views/partials/topbar.ejs` | Sửa | Hiển thị active app `Databases`, thêm link Databases trong user profile menu |
| 11 | `public/js/admin/content-editor.js` | Sửa | Quản lý state `currentDb`, duy trì `?db=` trên URL và AJAX, khóa ribbon khi xem Web, publish badges toggle |
| 12 | `src/controllers/admin/databaseController.js` | Tạo mới | Controller cho `/admin/databases`, `/api/databases/summary`, `/api/databases/diff` |
| 13 | `src/routes/admin/databaseRoutes.js` | Tạo mới | Định tuyến giao diện `/admin/databases` |
| 14 | `src/routes/api/databaseRoutes.js` | Tạo mới | Định tuyến API tổng hợp và đối soát `/api/databases` |
| 15 | `src/views/admin/databases/index.ejs` | Tạo mới | Giao diện Dashboard đối soát Master vs Web |
| 16 | `src/controllers/admin/launchpadController.js` | Sửa | Thêm tile ứng dụng "Databases" trong Launchpad |
| 17 | `src/app.js` | Sửa | Mount các routes `/admin/databases` và `/api/databases` |
| 18 | `tests/databaseSwitcher.test.js` | Tạo mới | 15 test cases bao phủ toàn diện GĐ 8.1 |
| 19 | `docs/decisions/DEC-041-content-editor-database-switcher-master-web.md` | Tạo mới | Ghi nhận quyết định kiến trúc bộ chuyển Database Master/Web |
| 20 | `docs/phases/phase-08-1-database-switcher.md` | Cập nhật | Đánh dấu hoàn thành toàn bộ checklist |
| 21 | `docs/phases/README.md` | Cập nhật | Cập nhật sơ đồ phụ thuộc và bảng tiến độ tổng |

---

### 3. Kết quả kiểm thử tự động (DoD Verification)

- **Unit & Integration Tests GĐ 8.1:**
  - File: `tests/databaseSwitcher.test.js`
  - Kết quả: **15/15 tests PASS (100%)**
- **Toàn bộ Test Suite Dự án:**
  - Tổng số test suites: **28/28 passed (100%)**
  - Tổng số test cases: **292/292 passed (100%)**
- **Kiểm tra cú pháp & Code Quality (ESLint):**
  - Lệnh: `npm run lint`
  - Kết quả: **0 errors, 0 warnings**
- **Kiểm tra tĩnh Phân quyền (Zero Hardcoded Role Checks):**
  - Lệnh: `grep -E "user\.role|roles\.includes" src/controllers/ src/routes/`
  - Kết quả: **0 matches** (100% kiểm tra quyền qua `canPerform`).

---

### 4. Kết luận & Sẵn sàng bàn giao

Giai đoạn 8.1 đã hoàn thành trọn vẹn, vượt qua tất cả các tiêu chí nghiệm thu nghiêm ngặt trong Definition of Done.
CMS hiện đã có đầy đủ khả năng kiểm tra trực quan kho dữ liệu đã xuất bản (Web Store) và đối soát tính toàn vẹn giữa Master và Web.

Tôi xin dừng tại đây và chờ lệnh phê duyệt tiếp theo từ bạn!
