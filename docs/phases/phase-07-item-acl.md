---
phase: 7
name: Bảo mật nâng cao & Phân quyền truy cập (Item-Level ACL & Access Viewer)
status: Hoàn thành
depends_on: [1, 2, 6]
estimate: 3 ngày làm việc
started: 2026-11-08
completed: 2026-11-08
updated: 2026-11-08
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
- [x] **Task 7.1:** Xây dựng Mongoose Model `AccessControl` (`src/models/AccessControl.js`) và `Domain` (`src/models/Domain.js`).
- [x] **Task 7.2:** Xây dựng module tính toán quyền `aclService.js`:
  - `getEffectivePermissions(itemId, userId)`: Tính toán quyền thực tế của một user trên một item dựa trên cây tổ tiên (`ancestors`) và tất cả các Role của user.
  - Quy tắc đánh giá quyền (DEC-042): Explicit Deny > Explicit Allow > Inherited Deny > Inherited Allow > Default Deny.
  - Hỗ trợ đầy đủ các quyền: `read`, `write`, `create`, `rename`, `delete`, `publish`, `administer`, `presentation:read`, `presentation:write`, `workflow:execute`.
  - `canPerform(userId, item, action)`: Giữ nguyên chữ ký, thay thế ruột hàm ủy quyền sang `aclService.canPerform`.
  - `explainPermission(user, item, action)`: Trả về giải thích chi tiết nguồn gốc và cấp độ tổ tiên đưa ra quyết định.
  - `filterReadable(user, items)`: Lọc hàng loạt không N+1, tải toàn bộ cây tổ tiên và quyền chỉ trong 1 truy vấn MongoDB duy nhất.
- [x] **Task 7.3:** Bảo vệ các thao tác biên tập và tích hợp GĐ 8/10/8.1:
  - Kiểm tra quyền `read` trước khi cho phép xem item và xem Preview `/admin/preview`.
  - Kiểm tra quyền `write` trước khi cho phép lưu form item.
  - Kiểm tra quyền `create` trước khi cho phép insert/duplicate item con.
  - Kiểm tra quyền `rename` trước khi đổi tên item.
  - Kiểm tra quyền `delete` trước khi xóa item.
  - Kiểm tra quyền `presentation:read` và `presentation:write` trên modal Presentation Details.
  - Lọc Workbox (`filterVisible`) và Database Switcher (`filterReadable`) theo ACL thật.
  - Kiểm tra quyền `item:publish` cho từng item trong Publish Job; bỏ qua item thiếu quyền và ghi lịch sử mà không dừng cả job.
- [x] **Task 7.4:** Xây dựng các ứng dụng quản trị bảo mật:
  - User Manager: Tạo, sửa, khóa tài khoản, gán roles, đổi mật khẩu, huỷ session tức thời khi khóa tài khoản (`src/views/admin/security/users.ejs`).
  - Role Manager: Tạo, sửa vai trò, kế thừa vai trò phân cấp `memberOf` có thuật toán chống vòng lặp (Cycle Detection), khóa xóa vai trò hệ thống (`src/views/admin/security/roles.ejs`).
  - Access Viewer: Bảng ma trận trực quan hóa quyền hiệu lực và giải thích DEC-042 (`src/views/admin/security/access-viewer.ejs`).
- [x] **Task 7.5:** Kích hoạt Tab "Security" trên Ribbon của Content Editor:
  - Nút "Security Editor": Modal ma trận phân quyền Principal × Rights với toggle Allow / Deny / Inherit và chọn phạm vi kế thừa (This item, Descendants, Both).
  - Nút "Access Viewer": Modal tra cứu quyền hiệu lực trực tiếp trên item đang chọn.
  - Nút "Reset": Khôi phục quyền về trạng thái kế thừa từ thư mục cha.
  - Nút "User Manager" và "Role Manager": Mở nhanh các ứng dụng quản trị.
  - Liên kết 3 tile Access Management trên Launchpad vào đúng URL ứng dụng.

## File/Thư mục Đã hoàn thành
- `src/models/AccessControl.js`, `src/models/Domain.js`, `src/models/Role.js`, `src/models/User.js`
- `src/services/aclService.js`, `src/services/userService.js`, `src/services/roleService.js`
- `src/controllers/admin/securityController.js`
- `src/routes/admin/securityRoutes.js`, `src/routes/api/securityRoutes.js`
- `src/views/admin/security/users.ejs`, `src/views/admin/security/roles.ejs`, `src/views/admin/security/access-viewer.ejs`
- `src/views/content-editor/modals/security-editor-modal.ejs`, `src/views/content-editor/modals/access-viewer-modal.ejs`
- `public/js/admin/security-editor.js`
- `src/scripts/migrate-phase-07-default-acl.js`
- `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md`
- `tests/aclService.test.js`

## Kết quả nghiệm thu
- 100% các bài test của hệ thống (29/29 test suites, 304/304 test cases) đã vượt qua kiểm thử tự động.
- Seed 55 quy tắc ACL gốc qua migration script đảm bảo 100% tương thích ngược với các phân quyền vai trò hiện có.
- Cơ chế chống tự khóa (Self-lockout guard) và chống vòng lặp vai trò (Cycle detection) hoạt động hoàn hảo.
- Bộ nhớ đệm phân quyền in-memory tự động vô hiệu hóa qua EventBus khi có thay đổi ACL, User, Role hoặc Item Tree.
