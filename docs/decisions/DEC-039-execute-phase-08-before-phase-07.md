# DEC-039: Thực hiện Giai đoạn 8 (Workflow, Workbox & Publish) Trước Giai đoạn 7 (Item ACL)

- **Ngày quyết định:** 2026-11-07
- **Giai đoạn liên quan:** GĐ 8 (Workflow & Publishing), GĐ 7 (Item-Level ACL)
- **Trạng thái:** Đã chốt (Accepted)

---

## 1. Bối cảnh
Theo lộ trình ban đầu trong `docs/phases/README.md`, GĐ 8 (Workflow & Publishing) phụ thuộc vào GĐ 7 (Bảo mật nâng cao & Item-Level ACL). Tuy nhiên, người dùng yêu cầu chủ động thực hiện **GĐ 8 trước GĐ 7** để hoàn thiện chu trình đưa nội dung từ Master sang Web và chuẩn bị nền tảng dữ liệu cho Public Site Renderer (GĐ 10).

Việc đảo thứ tự này đòi hỏi một cơ chế trừu tượng hóa phân quyền chặt chẽ trong GĐ 8 để:
1. Đảm bảo toàn bộ quyền hạn được kiểm soát thông qua một cổng duy nhất: `canPerform(user, item, action)`.
2. Không viết bất kỳ kiểm tra role cứng nào (`user.role === ...` hay `roles.includes(...)`) ở Controller, Service, View hay Client Script.
3. Khi GĐ 7 được triển khai sau, hệ thống chỉ cần thay thế logic bên trong `canPerform` (từ role-action map sang ma trận ACL thừa kế theo Item) mà không phải sửa đổi bất kỳ Controller, View hay Service nào của GĐ 8.

---

## 2. Quyết định Kiến trúc

### 2.1. Cổng Phân quyền Duy nhất & Bảng Ánh xạ Action $\rightarrow$ Role
Mọi hành vi trong GĐ 8 đều đi qua `itemService.canPerform(user, item, action)` hoặc `workflowService.canPerform(user, item, action)` với chữ ký chuẩn nhận cả đối số `item` (không truyền `null` trừ phi thao tác cấp toàn cục):

| Action Name | Ý nghĩa nghiệp vụ | Quyền mặc định theo Role (Tạm thời GĐ 8) | Ghi chú cho GĐ 7 (ACL sau này) |
| :--- | :--- | :--- | :--- |
| `item:publish` | Xuất bản một item cụ thể sang Web | `Administrator`, `Approver` | Sẽ thay bằng quyền Publish gán trên Item/Nhánh |
| `item:unpublish` | Gỡ item khỏi Web | `Administrator`, `Approver` | Sẽ thay bằng quyền Unpublish trên Item |
| `publish:manage` | Mở Publish Manager, Publish toàn Site, Republish All | `Administrator` | Cần quyền quản trị hệ thống |
| `workflow:read` | Xem trạng thái workflow, lịch sử duyệt của item | `Administrator`, `Editor`, `Author`, `Approver` | Phụ thuộc quyền Read trên Item |
| `workflow:execute:Submit` | Chạy lệnh Submit chuyển sang Awaiting Approval | `Administrator`, `Author`, `Editor` | Kiểm tra quyền Command theo Workflow State |
| `workflow:execute:Approve` | Chạy lệnh Approve chuyển sang Approved | `Administrator`, `Approver` | Kiểm tra quyền Command theo Workflow State |
| `workflow:execute:Reject` | Chạy lệnh Reject trả về Draft | `Administrator`, `Approver` | Kiểm tra quyền Command theo Workflow State |
| `workflow:execute:*` | Thực thi lệnh workflow bất kỳ | `Administrator`, `Approver` | Gán động theo `Workflow Command` item |
| `workflow:manage` | Sửa định nghĩa workflow, states, commands | `Administrator` | Quản trị cây `/root/system/Workflows` |
| `workbox:read` | Truy cập ứng dụng Workbox và xem items chờ duyệt | `Administrator`, `Editor`, `Approver` | Workbox lọc item user có quyền xem/duyệt |
| `workbox:bulk` | Chạy thao tác duyệt/từ chối hàng loạt trong Workbox | `Administrator`, `Approver` | Kiểm tra quyền trên từng item trong mảng |

> [!NOTE]
> Tạo thêm vai trò `Approver` trong seed dữ liệu để biên tập viên cấp kiểm duyệt có thể thao tác Approve/Reject độc lập với quyền `Administrator`.

### 2.2. Trừu tượng hóa Lọc Danh sách Workbox
- Cung cấp phương thức `workboxService.filterVisible(items, user)` là nơi duy nhất lọc các item mà user có quyền xem và thao tác.
- Trong GĐ 8, hàm này kiểm tra `canPerform(user, item, 'workflow:read')`. Khi sang GĐ 7, hàm này sẽ tự động tích hợp ma trận quyền ACL theo từng nhánh mà không làm thay đổi giao diện Controller/View.

### 2.3. Kiểm thử Phân quyền dựa trên Stub / Mock
- Bộ kiểm thử tự động của GĐ 8 cho các tình huống phân quyền (cho phép / từ chối) được viết bằng cách stub hoặc mock hàm `canPerform`, đảm bảo test độc lập với cơ cấu role và không bị phá vỡ khi GĐ 7 thay đổi logic bên dưới.

---

## 3. Hệ quả & Yêu cầu Bắt buộc
1. **Tuyệt đối cấm kiểm tra role cứng:** Bất kỳ cú pháp `user.roles.includes(...)` hoặc `user.role === ...` ngoài thân hàm `canPerform` đều bị coi là vi phạm nghiêm trọng quy chuẩn kiến trúc.
2. **Cập nhật `docs/phases/README.md`:** Cột phụ thuộc của GĐ 8 được điều chỉnh tạm thời thành `2, 4, 6` (ghi chú rõ làm trước GĐ 7). Giữ nguyên số thứ tự giai đoạn.
3. **Cập nhật `docs/phases/phase-07-item-acl.md`:** Bổ sung mục danh sách các đầu việc GĐ 7 phải hoàn thiện bù đắp cho GĐ 8.

