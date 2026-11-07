---
phase: 7
name: Bảo mật nâng cao & Phân quyền truy cập (Item-Level ACL & Access Viewer)
status: Chưa bắt đầu
depends_on: [1, 2, 6]
estimate: 3 ngày làm việc
started: null
completed: null
updated: 2026-11-03
---

# GĐ 7 - Bảo mật nâng cao & Phân quyền truy cập (Item-Level ACL & Access Viewer)
> Hệ thống phân quyền chi tiết tới từng Item (Read, Write, Create, Delete, Publish, Presentation:read/write) và Access Viewer.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/users-roles-acl.md`](../data-model/users-roles-acl.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)

## Mục tiêu
Xây dựng hệ thống bảo mật phân quyền chi tiết tới từng Item theo mô hình Sitecore: quản lý User/Role, gán quyền trên Item (Read, Write, Create, Delete, Administer, Publish, và quyền Presentation `presentation:read`, `presentation:write`) với cơ chế kế thừa phân cấp từ cha xuống con, hỗ trợ quyền ghi đè (Allow / Deny / Inherit) và công cụ trực quan hóa Access Viewer.

## Phạm vi
- **Làm:** Quản lý User và Role (CRUD, gán role cho user); Bảng phân quyền `AccessControl`; Phân quyền thao tác trên toàn bộ Item bao gồm các item cấu hình hệ thống dưới nhánh `/sitecore/layout/*` (Layouts, Placeholders, Renderings); Phân quyền riêng cho cấu hình Presentation (`presentation:read` cho xem cấu hình và `presentation:write` cho sửa/gán rendering); Thuật toán tính toán quyền hiệu dụng (Effective Rights Calculation: Deny luôn thắng Allow; quyền gán trực tiếp trên item ưu tiên hơn quyền kế thừa; quyền của Role kết hợp); Giao diện phân quyền trên Ribbon tab "Security"; Ứng dụng "Access Viewer" dạng bảng ma trận hiển thị quyền của user trên toàn bộ cây.
- **Không làm:** Chưa làm Single Sign-On (SSO) SAML/OAuth2 ngoài hệ thống.

## Checklist Task
- [ ] **Task 7.1:** Xây dựng Mongoose Model `AccessControl` (`src/models/AccessControl.js`).
- [ ] **Task 7.2:** Xây dựng module tính toán quyền `aclService.js`:
  - `getEffectivePermissions(itemId, userId)`: Tính toán quyền thực tế của một user trên một item dựa trên cây tổ tiên (`ancestors`) và tất cả các Role của user.
  - Quy tắc đánh giá quyền: Explicit Deny > Explicit Allow > Inherited Deny > Inherited Allow > Default Deny.
  - Hỗ trợ thêm các quyền Presentation: `presentation:read`, `presentation:write`.
  - `canPerform(userId, action, itemId)`: Kiểm tra user có quyền thực hiện hành động cụ thể không (`read`, `write`, `create`, `delete`, `publish`, `presentation:read`, `presentation:write`).
  - `setItemPermission(itemId, identityType, identityId, permissions, applyToDescendants)`.
- [ ] **Task 7.3:** Xây dựng middleware `aclMiddleware.js` bảo vệ các thao tác biên tập:
  - Kiểm tra quyền `read` trước khi cho phép xem item.
  - Kiểm tra quyền `write` trước khi cho phép lưu form item.
  - Kiểm tra quyền `create` trước khi cho phép insert item con.
  - Kiểm tra quyền `delete` trước khi cho phép xóa item.
  - Kiểm tra quyền `presentation:read` trước khi mở modal Presentation Details.
  - Kiểm tra quyền `presentation:write` trước khi lưu thay đổi Presentation Details hoặc Reset presentation.
- [ ] **Task 7.4:** Xây dựng các ứng dụng quản trị bảo mật:
  - User Manager: Tạo, sửa, khóa tài khoản, gán roles (`src/views/admin/security/users.ejs`).
  - Role Manager: Tạo role, gán quyền mặc định (`src/views/admin/security/roles.ejs`).
  - Access Viewer: Bảng ma trận trực quan hóa quyền của từng user/role trên từng node cây bao gồm cột quyền Presentation (`src/views/admin/security/access-viewer.ejs`).
- [ ] **Task 7.5:** Bổ sung Tab "Security" trên Ribbon của Content Editor:
  - Nút "Assign Permissions": Mở modal cấu hình quyền trực tiếp cho item hiện tại.
  - Nút "Access Viewer": Mở nhanh công cụ kiểm tra quyền.

## File/Thư mục Dự kiến
- `src/models/AccessControl.js`
- `src/services/aclService.js`
- `src/middlewares/aclMiddleware.js`
- `src/controllers/admin/securityController.js`
- `src/routes/admin/securityRoutes.js`
- `src/views/admin/security/users.ejs`, `src/views/admin/security/roles.ejs`, `src/views/admin/security/access-viewer.ejs`
- `src/views/admin/security/modals/assign-permissions-modal.ejs`

## Route / API Dự kiến
- `GET /admin/security/users`, `POST /admin/security/users/create`, `POST /admin/security/users/:id/update`
- `GET /admin/security/roles`, `POST /admin/security/roles/create`
- `GET /admin/security/access-viewer?identityId=...&identityType=...`
- `POST /admin/security/item/:id/permissions`

## Thay đổi Database
Collection `access_control_lists` với index `{ itemId: 1, identityType: 1, identityId: 1 }`.

## Việc GĐ 7 Phải Bổ Sung Do GĐ 8 Làm Trước (Theo DEC-039)
Do GĐ 8 (Workflow, Workbox & Publish) được chủ động triển khai trước GĐ 7, toàn bộ cơ chế phân quyền của GĐ 8 đã được trừu tượng hóa nghiêm ngặt thông qua hàm `canPerform(user, item, action)` và `workboxService.filterVisible(items, user)`. Khi triển khai GĐ 7, bắt buộc phải hoàn thiện các đầu việc tích hợp sau:
1. **Thay thế logic bên trong `canPerform`:** Chuyển đổi từ cơ chế ánh xạ Role tạm thời sang thuật toán đánh giá quyền hiệu dụng đầy đủ (Item-Level ACL: Deny > Allow > Inherited).
2. **Workbox lọc theo ACL:** Cập nhật `workboxService.filterVisible(items, user)` để lọc danh sách các item chờ duyệt dựa trên quyền `workflow:read` và `workflow:execute:<commandId>` theo từng item cụ thể mà user được gán quyền.
3. **Quyền Publish theo nhánh:** Kiểm tra quyền `item:publish` và `item:unpublish` trên từng item và toàn bộ chuỗi nhánh con khi thực hiện Publish Subitems / Republish.
4. **Publish Manager lọc theo ACL:** Khi mở Publish Manager hoặc chọn phạm vi xuất bản, chỉ cho phép chọn những nhánh/item mà user sở hữu quyền publish thực tế.
5. **Quyền Workflow Command theo Item:** Cho phép gán quyền thực thi từng Command riêng biệt (`Submit`, `Approve`, `Reject`) theo vai trò hoặc user trực tiếp trên từng Item.
6. **Viết lại test phân quyền của GĐ 8 theo ACL thật:** Bổ sung các test case gán bản ghi `AccessControl` thực tế và xác nhận `workflowService`, `workboxService`, `publishService` tuân thủ đúng quyền mà không cần mock `canPerform`.

## Definition of Done & Cách kiểm thử
- Tạo một Role mới `Content Authors` và một User `john_editor` thuộc role này.
- Cấu hình quyền trên node `/sitecore/content/home`: Role `Content Authors` được quyền `Read`, `Write` và `presentation:read`, nhưng bị `Deny Delete` và `Deny presentation:write`.
- Đăng nhập với tài khoản `john_editor`:
  - Người này xem và sửa được nội dung của trang `home`.
  - Nút "Delete" trên Ribbon bị mờ (disabled) hoặc nhận thông báo lỗi HTTP 403 khi cố gọi API.
  - Bấm xem Presentation Details được, nhưng các nút Lưu hoặc thêm/sắp xếp rendering bị disabled hoặc nhận HTTP 403 khi cố gửi API lưu.
- Mở "Access Viewer", chọn user `john_editor`: Hệ thống hiển thị bảng ma trận với các dấu tích xanh và dấu gạch chéo đỏ chính xác theo tính kế thừa.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Truy vấn tính toán quyền phân cấp làm chậm tốc độ render cây nội dung.
- *Giảm thiểu:* Sử dụng truy vấn gộp lấy toàn bộ quy tắc ACL của danh sách `ancestors` trong một câu lệnh MongoDB duy nhất và tính toán in-memory tại tầng service.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 7`)*

