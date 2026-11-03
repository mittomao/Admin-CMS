---
phase: 2
name: Content Editor MVP (Cây nội dung, CRUD Item & Ribbon Home)
status: Hoàn thành
depends_on: [1]
estimate: 3 ngày làm việc
started: 2026-11-03
completed: 2026-11-03
updated: 2026-11-03
---

# GĐ 2 - Content Editor MVP (Cây nội dung, CRUD Item & Ribbon Home)
> Hạt nhân Content Editor: Cây nội dung lazy-loading với Fancytree, form soạn thảo partial HTML và Ribbon Tab Home (CRUD).

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-001-materialized-path-ancestors.md`](../decisions/DEC-001-materialized-path-ancestors.md)
- [`docs/decisions/DEC-002-service-layer-discipline.md`](../decisions/DEC-002-service-layer-discipline.md)
- [`docs/decisions/DEC-003-partial-html-ssr.md`](../decisions/DEC-003-partial-html-ssr.md)
- [`docs/decisions/DEC-011-fancytree-dnd5.md`](../decisions/DEC-011-fancytree-dnd5.md)
- [`docs/decisions/DEC-012-optimistic-locking-409.md`](../decisions/DEC-012-optimistic-locking-409.md)
- [`docs/decisions/DEC-013-sanitize-html-server.md`](../decisions/DEC-013-sanitize-html-server.md)
- [`docs/decisions/DEC-014-move-cycle-detection.md`](../decisions/DEC-014-move-cycle-detection.md)

## Mục tiêu
Xây dựng hạt nhân Content Editor: hiển thị Cây nội dung lazy-loading bên trái bằng Fancytree, form chỉnh sửa dữ liệu item ở giữa, và dải Ribbon "Home" hỗ trợ đầy đủ các thao tác CRUD cơ bản (Insert, Duplicate, Delete, Rename, Sort, Move).

## Phạm vi
- **Làm:** Cấu trúc Item Model theo Materialized Path; Cây nội dung nạp dữ liệu phân cấp lười (Lazy-loading AJAX); Form hiển thị các field cơ bản (Single-Line Text, Rich Text); Các thao tác Ribbon Home: Insert Item (chọn template cơ bản), Duplicate Item, Delete Item, Rename Item, Move Item, Sort Item; cập nhật đồng bộ Cây và Form qua AJAX.
- **Không làm:** Chưa làm Versioning/Ngôn ngữ (mặc định xử lý version 1 ngôn ngữ `en`); chưa xử lý Base Template phức tạp; chưa có ACL.

## Checklist Task
- [x] **Task 2.1:** Xây dựng Mongoose Model `Item` (`src/models/Item.js`) với các trường: `name`, `displayName`, `templateId`, `parentId`, `ancestors`, `path`, `sortOrder`, `fields`, `deleted`, `createdBy`, `updatedBy`.
- [x] **Task 2.2:** Xây dựng Mongoose Model `Template` (`src/models/Template.js`) cơ bản phục vụ cho việc tạo item (sections, fields, field types, insertOptions).
- [x] **Task 2.3:** Tạo hạt giống dữ liệu ban đầu cho cây Sitecore: Node Root (`/sitecore`), các node nhánh chuẩn (`/sitecore/content`, `/sitecore/media library`, `/sitecore/templates`, `/sitecore/system`), và node trang chủ mẫu (`/sitecore/content/home`).
- [x] **Task 2.4:** Xây dựng `itemService.js` với các phương thức nghiệp vụ: `getChildren(parentId)`, `getItemById(id)`, `getItemByPath(path)`, `createItem(data)`, `updateItemFields(id, fields)`, `deleteItem(id)`, `renameItem(id, newName)`, `moveItem(id, newParentId)`, `duplicateItem(id)`, `sort(id, direction)`, `search(keyword)`.
- [x] **Task 2.5:** Xây dựng `treeHelper.js` chuyển đổi danh sách Item từ MongoDB sang định dạng JSON chuẩn của Fancytree (`{ title, key, folder, lazy, icon, data }`).
- [x] **Task 2.6:** Xây dựng các route và controller Content Editor:
  - `GET /admin/content-editor` và `GET /admin/content-editor/:id`: Render giao diện 3 vùng (Ribbon, Tree container, Workspace container).
  - `GET /api/items/:id/children`: Trả về mảng JSON các node con theo `parentId` phục vụ lazy loading cây.
  - `GET /admin/content-editor/item/:id/form`: Trả về HTML partial chứa form soạn thảo của Item tương ứng.
  - `GET /admin/content-editor/item/:id/folder-view`: Trả về HTML partial dạng lưới tile danh sách con.
  - `GET /admin/content-editor/item/:id/insert-options`: Trả về danh sách template được phép tạo con.
  - `POST /api/items`: AJAX tạo item mới.
  - `PUT /api/items/:id/fields`: AJAX lưu giá trị các trường kèm Optimistic Locking (409 Conflict).
  - `POST /api/items/:id/rename`: AJAX đổi tên item và cập nhật materialized path toàn bộ cây con.
  - `POST /api/items/:id/delete`: AJAX xóa mềm item và toàn bộ con cháu.
  - `POST /api/items/:id/duplicate`: AJAX nhân bản item và tùy chọn nhân bản toàn bộ con cháu.
  - `POST /api/items/:id/move`: AJAX di chuyển item sang cha mới có thuật toán phát hiện vòng lặp (cycle detection).
  - `POST /api/items/:id/sort`: AJAX sắp xếp thứ tự anh em (up, down, first, last).
- [x] **Task 2.7:** Thiết kế giao diện EJS Content Editor:
  - `src/views/content-editor/index.ejs`: Khung chính chia cột layout cây bên trái và workspace bên phải.
  - `src/views/partials/ribbon.ejs`: Data-driven Ribbon với Tab "Home" hoạt động đầy đủ: Write (Save, Refresh), Insert, Operations (Duplicate, Copy, Move, Delete), Rename, Sorting. Các tab khác disabled kèm thông báo giai đoạn.
  - `src/views/content-editor/item-form.ejs`: Form soạn thảo render các trường của Item theo từng Section accordion.
  - `src/views/content-editor/folder-view.ejs`: Giao diện xem thư mục dạng lưới thẻ con.
  - `src/views/content-editor/fields/*.ejs`: Thư viện partial cho từng field type cơ bản (Single-Line Text, Multi-Line Text, Rich Text, Checkbox, Date, Number, Droplist, Image).
  - `src/views/content-editor/modals/*.ejs`: Modal Insert, Rename, Move, Delete.
- [x] **Task 2.8:** Viết mã Client-side JS (`public/js/admin/content-editor.js`):
  - Tích hợp thư viện Fancytree kết nối endpoint lazy loading, hỗ trợ kéo thả dnd5.
  - Bắt sự kiện click node -> gửi Fetch request lấy partial form HTML nạp vào workspace mà không reload trang.
  - Bắt sự kiện ấn nút trên Ribbon -> thực hiện các hành động AJAX tương ứng và tự động cập nhật lại node trên cây.
  - Theo dõi dirty form (`isDirty`), cảnh báo khi rời trang hoặc chuyển node chưa lưu.

## File/Thư mục Dự kiến
- `src/models/Item.js`, `src/models/Template.js`
- `src/services/itemService.js`, `src/utils/treeHelper.js`
- `src/controllers/admin/contentEditorController.js`
- `src/routes/admin/contentEditorRoutes.js`
- `src/views/admin/content-editor/index.ejs`
- `src/views/admin/content-editor/item-form.ejs`
- `src/views/admin/content-editor/modals/*.ejs`
- `src/public/js/content-editor.js`, `src/public/css/content-editor.css`

## Route / API Dự kiến
- `GET /admin/content-editor`
- `GET /admin/content-editor/tree/nodes?parentId=...`
- `GET /admin/content-editor/item/:id/partial`
- `POST /admin/content-editor/item/save`
- `POST /admin/content-editor/item/insert`
- `POST /admin/content-editor/item/rename`
- `POST /admin/content-editor/item/delete`
- `POST /admin/content-editor/item/duplicate`
- `POST /admin/content-editor/item/move`

## Thay đổi Database
- Collection `items_master` với các index `{ parentId: 1, sortOrder: 1 }`, `{ path: 1 }`.
- Khởi tạo cây mẫu Sitecore chuẩn.

## Definition of Done & Cách kiểm thử
- Mở Content Editor, cây nội dung hiển thị node gốc `/sitecore`.
- Bấm mở rộng node `/sitecore/content` -> Lazy load hiển thị node `home`.
- Click vào `home` -> Form soạn thảo hiển thị tức thì bên phải với các trường: Title, Body (Rich Text).
- Sửa nội dung Title và Body, bấm nút "Save" trên Ribbon -> Dữ liệu được lưu vào MongoDB và hiển thị thông báo "Item saved successfully".
- Thử các tính năng trên Ribbon Home:
  - Bấm Insert -> Tạo thành công trang con bên dưới `home`, cây tự động refresh hiển thị node mới.
  - Bấm Rename -> Đổi tên thành công, node trên cây cập nhật tên mới.
  - Bấm Duplicate -> Nhân bản thành công item cùng cấp.
  - Bấm Delete -> Xóa item, node trên cây biến mất.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Cập nhật cây khi có nhiều cấp con bị lệch đường dẫn `path` hoặc mảng `ancestors`.
- *Giảm thiểu:* Viết hàm đệ quy cập nhật toàn bộ cây con khi di chuyển hoặc đổi tên node cha trong `itemService.js`.

## Ghi chú / Kết quả
Đã hoàn thành toàn bộ checklist và xác nhận hoạt động ổn định ngày 2026-11-03.

