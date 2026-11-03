---
phase: 10
name: Headless Delivery API, Layout Service & Bộ nhớ đệm (Delivery API, Layout Service & Cache)
status: Chưa bắt đầu
depends_on: [6, 8]
estimate: 2.5 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 10 - Headless Delivery API, Layout Service & Bộ nhớ đệm
> RESTful API công khai đọc từ items_web, Headless Layout Service phân giải component/datasource cho React frontend và In-memory Caching.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)

## Mục tiêu
Cung cấp hệ thống RESTful JSON API công khai gồm Headless Delivery API và **Layout Service** đọc dữ liệu độc quyền từ `items_web`, hỗ trợ ứng dụng React/Next.js frontend lấy toàn bộ cấu trúc component (route, placeholders, components và datasource resolved) với hiệu năng cao nhờ In-Memory Caching và cơ chế Invalidation tức thì khi publish.

## Phạm vi
- **Làm:**
  - **Content Delivery API (`/api/v1/content/*`):** Đọc nội dung thô của item đã publish theo ID hoặc Path, lấy cây con, flatten fields, chuyển đổi Media ID sang Media URL đầy đủ (`/media/file/:id`).
  - **Layout Service (`/api/v1/layout` hoặc `/api/delivery/layout`):**
    - Endpoint: `GET /api/v1/layout?path=...&lang=...&device=...`
    - Định dạng JSON chuẩn Sitecore JSS phong cách Headless (`route` + `placeholders`).
    - Tự động resolve dữ liệu từ Datasource item (đọc từ `items_web`) gán vào `fields` của từng component; nếu component không có datasource riêng, fallback sử dụng chính fields của route item (context item).
    - Xử lý khi Datasource bị thiếu (ví dụ chưa publish lên Web): Vẫn trả rendering với `fields: null` kèm cảnh báo, không làm sập response.
    - Mã lỗi chuẩn: 404 (route/path không tồn tại), 400 (thiếu param bắt buộc), 422 (không tìm thấy layout hợp lệ cho device).
  - **Bộ nhớ đệm (Cache):** In-memory Cache bằng `node-cache` hoặc LRU cache; tự động Invalidate cache khi Publish hoàn tất (xoá cache theo item path hoặc tag liên quan).
  - **Bảo mật API & Tích hợp:** Cấu hình CORS cho phép React frontend kết nối; hỗ trợ API Key hoặc Bearer Token; tích hợp `express-rate-limit` chống DDoS.
- **Không làm:** Chưa làm GraphQL API (tập trung tối ưu RESTful JSON trước).

## Checklist Task
- [ ] **Task 10.1:** Xây dựng module cache `src/utils/cacheManager.js` quản lý lưu và xóa cache theo tag/key cho cả Content và Layout Service.
- [ ] **Task 10.2:** Xây dựng `deliveryService.js`:
  - `getPublishedItemByPath(path, language)`.
  - `getPublishedItemById(id, language)`.
  - `getChildren(id, language)`.
  - Format fields và chuyển đổi Media ID thành URL đầy đủ.
- [ ] **Task 10.3:** Xây dựng logic Layout Service trong `presentationService.js` / `deliveryService.js`:
  - Phân giải Layout và Renderings của route từ `items_web`.
  - Gom nhóm các Rendering theo từng Placeholder key (bao gồm việc xử lý các placeholder lồng nhau nếu có).
  - Query dữ liệu của các Datasource items tương ứng từ `items_web` và format cấu trúc `{ uid, componentName, fields, params }`.
- [ ] **Task 10.4:** Xây dựng `layoutController.js` và route `src/routes/api/v1/layoutRoutes.js` (`GET /api/v1/layout`).
- [ ] **Task 10.5:** Xây dựng `deliveryController.js` và route `src/routes/api/v1/deliveryRoutes.js` (`GET /api/v1/content/*`).
- [ ] **Task 10.6:** Tích hợp middleware xóa cache vào `publishService.js`: Khi publish thành công, tự động invalidate các cache key tương ứng của cả item và layout.
- [ ] **Task 10.7:** Cấu hình CORS middleware cho phép frontend React truy cập, thiết lập rate limiting và xác thực API Key nếu được bật.

## File/Thư mục Dự kiến
- `src/utils/cacheManager.js`
- `src/services/deliveryService.js`
- `src/controllers/api/deliveryController.js`, `src/controllers/api/layoutController.js`
- `src/routes/api/v1/deliveryRoutes.js`, `src/routes/api/v1/layoutRoutes.js`

## Route / API Dự kiến
- `GET /api/v1/content/item?path=...&lang=...`
- `GET /api/v1/content/item/:id?lang=...`
- `GET /api/v1/content/children/:id?lang=...`
- `GET /api/v1/layout?path=/sitecore/content/home&lang=en&device=default`

## Thay đổi Database
Không thay đổi schema (truy vấn trực tiếp trên `items_web`).

## Definition of Done & Cách kiểm thử
- Gọi `GET http://localhost:3000/api/v1/layout?path=/sitecore/content/home&lang=en` bằng Postman hoặc trình duyệt.
- Nhận về phản hồi JSON chuẩn có HTTP 200, chứa đúng `route` và mảng components gom theo `placeholders` (ví dụ `main: [{ componentName: "HeroBanner", ... }]`).
- Dữ liệu `fields` của component HeroBanner hiển thị đầy đủ tiêu đề và URL hình ảnh media đã resolve chính xác.
- Lần gọi thứ 2: Response time dưới 10ms do hit cache (`X-Cache: HIT`).
- Sửa presentation của item trong Admin CMS và Publish lại -> Gọi lại API, cache được làm mới tự động và trả về dữ liệu mới nhất.
- Thử gọi path không tồn tại -> Trả về HTTP 404 với error message rõ ràng.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Lộ dữ liệu nhạy cảm hoặc dữ liệu draft chưa qua phê duyệt.
- *Giảm thiểu:* Delivery API và Layout Service tuyệt đối không truy vấn vào collection `items_master`, chỉ đọc từ `items_web` và lọc bỏ các metadata nội bộ không cần thiết.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 10`)*

