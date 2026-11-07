# DEC-041: Bộ chuyển Database Master / Web trong Content Editor (GĐ 8.1)

- **Ngày quyết định:** 2026-11-07
- **Giai đoạn liên quan:** GĐ 8.1 (Database Switcher), GĐ 8 (Master/Web, Publishing), GĐ 7 (Item ACL)
- **Trạng thái:** Đang đề xuất (Chờ duyệt)

---

## 1. Bối cảnh
Sau khi hoàn thành Giai đoạn 8 (Tách biệt Master và Web Store) và Giai đoạn 10 (Site Renderer), hệ thống CMS đã vận hành ổn định mô hình 2 kho dữ liệu:
- `items_master` (`Item`): Kho làm việc, chứa mọi bản nháp, đa phiên bản, lịch sử workflow.
- `items_web` (`PublishedItem`): Kho đã xuất bản, chỉ chứa phiên bản có hiệu lực phục vụ hiển thị website công khai.

Tuy nhiên, người quản trị và tác giả nội dung hiện chưa có cách trực tiếp xem dữ liệu thực tế đang tồn tại ở Web Store ngay trong Content Editor. Họ phải mở website công khai hoặc truy vấn trực tiếp cơ sở dữ liệu. 

Do đó, GĐ 8.1 được bổ sung nhằm cung cấp khả năng chuyển đổi qua lại giữa `master` và `web` ngay trên giao diện Content Editor, duyệt cây nội dung và form xem dữ liệu Web một cách trực quan, minh bạch và an toàn tuyệt đối.

---

## 2. Quyết định Kiến trúc

### 2.1. Quản lý trạng thái Database qua URL Query Parameter `?db=web`
- Trạng thái database đang xem được lưu trữ và phản ánh trực tiếp trên URL thông qua query parameter `?db=master` hoặc `?db=web`. Mặc định nếu không truyền tham số sẽ là `master`.
- **Không chỉ lưu trong Session:** Việc lưu trên URL đảm bảo tác giả có thể mở đồng thời 2 tab trình duyệt (một tab xem Master và một tab xem Web) mà không bị xung đột trạng thái session.
- Client script (`content-editor.js`) chịu trách nhiệm giữ nguyên tham số `db` này khi người dùng chuyển node cây, chuyển ngôn ngữ hoặc chuyển phiên bản.

### 2.2. Nguyên tắc Web Store là CHỈ ĐỌC Tuyệt Đối (Strict Read-Only)
- Web Store (`items_web`) chỉ được phép ghi duy nhất bởi `publishService`.
- Khi người dùng ở chế độ `db=web`:
  1. **Giao diện Client:** Form soạn thảo bị vô hiệu hóa toàn bộ (`disabled` tất cả inputs, selects, rich-text, nút lưu). Dải banner màu cam/vàng cảnh báo hiển thị trên cùng form: *"Đang xem WEB database (chỉ đọc)"*. Tất cả các nút ghi trên Ribbon (Save, Insert, Delete, Rename, Move, Duplicate, Sort, Workflow, Publish) đều bị disabled.
  2. **Bảo vệ Phía Server (Server-Side Guards):** Bất kỳ API request mang tính sửa đổi dữ liệu (POST, PUT, DELETE) nếu gửi kèm tham số `db=web` (hoặc nhắm vào Web Store) sẽ bị server từ chối ngay lập tức với mã lỗi `HTTP 403 Forbidden` hoặc `409 Conflict`. Không người dùng nào, kể cả `Administrator`, có thể ghi đè trực tiếp lên Web Store từ Content Editor.

### 2.3. Trừu tượng hóa Repository Đọc: `getItemRepository(dbName)`
- Xây dựng abstraction chuẩn hóa `getItemRepository(dbName)`:
  - `master` &rarr; Model `Item`
  - `web` &rarr; Model `PublishedItem` (Read-only)
- Validate giá trị `dbName` bằng whitelist nghiêm ngặt (`master`, `web`). Tuyệt đối từ chối các chuỗi lạ để ngăn chặn nguy cơ truy cập các collection khác.
- Các hàm đọc trong `itemService` (`getById`, `getByPath`, `getChildren`, `getRoot`, `search`, `getPathBreadcrumb`, `getQuickInfo`) tiếp nhận tham số `db = 'master'` và ủy nhiệm truy vấn qua repository tương ứng, đảm bảo tái sử dụng 100% logic cấu trúc mà không nhân đôi mã nguồn.

### 2.4. Huy hiệu Trạng thái Xuất bản (Publish Status Badges) & Tối ưu Hiệu năng Batch
- Khi duyệt ở chế độ `master`, hệ thống cung cấp huy hiệu nhận biết trạng thái xuất bản:
  - `UNPUBLISHED` (Chưa xuất bản): Item chưa từng có bản ghi trên Web Store.
  - `PUBLISHED` (Đã xuất bản): Item đã có trên Web Store, `sourceVersion` và `updatedAt` trùng khớp với phiên bản hiện tại ở Master.
  - `CHANGED` (Có thay đổi chưa xuất bản): Item đã có trên Web Store nhưng phiên bản ở Master mới hơn hoặc có sửa đổi chưa publish lại.
- **Tối ưu Batch:** Để tránh vấn đề N+1 truy vấn khi tải cây Fancytree, hệ thống cung cấp API batch `/api/items/publish-status-batch?ids=...` truy vấn một lần danh sách ID của các node cùng cấp. Cung cấp tùy chọn Bật/Tắt hiển thị badge trong Ribbon tab VIEW.

### 2.5. Phân quyền qua Cổng `canPerform` (Chuẩn bị cho GĐ 7)
- 100% kiểm tra quyền đi qua `canPerform(user, item, action)`, cấm kiểm tra role cứng.
- Bổ sung 2 action constants mới:
  - `database:web:read`: Quyền xem dữ liệu Web Database trong Content Editor.
  - `database:compare`: Quyền truy cập trang đối soát và thống kê `/admin/databases`.
- Bảng ánh xạ quyền theo vai trò (Role Mapping):
  - `Administrator`: Toàn quyền (`database:web:read`, `database:compare`).
  - `Approver`: Được cấp quyền (`database:web:read`, `database:compare`).
  - `Editor`: Mặc định không được chuyển sang Web DB trừ khi được cấp quyền riêng ở GĐ 7.
  - `Author`: Không có quyền.

---

## 3. Hệ quả & Tác động
1. **Content Editor:** Tab Ribbon `VIEW` được kích hoạt; thêm nhóm `Database` và nhóm `Tree Options`. Bổ sung dropdown chuyển DB tại chân cây thư mục và thanh Taskbar.
2. **Quick Info:** Hiển thị thêm các trường metadata khi xem ở chế độ `web`: `Database`, `Published at`, `Published by`, `Source version`.
3. **Trang Quản lý `/admin/databases`:** Cung cấp dashboard trực quan phân loại các item Missing, Orphan, Changed giữa 2 cơ sở dữ liệu.
4. **Chuẩn bị cho GĐ 7:** Ghi chú vào `docs/phases/phase-07-item-acl.md` để triển khai phân quyền chi tiết cho action `database:web:read` và `database:compare` sau này.

