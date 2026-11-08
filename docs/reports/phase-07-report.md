# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 7
## BẢO MẬT NÂNG CAO (ITEM-LEVEL ACL, ACCESS VIEWER, SECURITY EDITOR, ROLE & USER MANAGER)

- **Giai đoạn:** 7 (Kế thừa và thay thế ruột `canPerform` sau khi GĐ 8, 8.1, 10 đã hoàn thành)
- **Ngày bắt đầu:** 2026-11-08
- **Ngày hoàn thành:** 2026-11-08
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu, 29/29 test suites passed)
- **Tài liệu tham chiếu:** [`docs/phases/phase-07-item-acl.md`](../phases/phase-07-item-acl.md)
- **Quyết định kiến trúc:** [`docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md`](../decisions/DEC-042-item-level-acl-and-permission-resolution.md)

---

### 1. Tóm tắt kết quả triển khai

Giai đoạn 7 đã chuyển đổi thành công toàn bộ hệ thống phân quyền của CMS từ cơ chế kiểm tra vai trò thô sang **mô hình phân quyền chi tiết theo từng Item (Item-Level Access Control List - ACL) chuẩn kiến trúc Sitecore Experience Management (XM)**:

1. **Mô hình Quyền & Quyết định Kiến trúc DEC-042:**
   - Ban hành [`DEC-042`](../decisions/DEC-042-item-level-acl-and-permission-resolution.md) quy định chi tiết 5 nguyên tắc giải quyết xung đột quyền:
     - **Gần hơn thắng xa hơn (Distance/Level):** Quyền gán trực tiếp trên Item luôn thắng quyền kế thừa từ các tầng tổ tiên.
     - **User thắng Role:** Tại cùng một mức cây, quy tắc đặt riêng cho tài khoản User thắng quy tắc của Role.
     - **Deny thắng Allow:** Tại cùng một mức cây giữa các Role, Deny luôn thắng Allow.
     - **Phạm vi kế thừa (Inheritance Scope):** Hỗ trợ `thisItem` (chỉ mục này), `descendants` (chỉ mục con), `both` (mục này và con).
     - **Mặc định Từ chối (Default Deny):** Khi không có quy tắc nào khớp, hệ thống từ chối truy cập (ngoại trừ vai trò Administrator có quyền bypass vô điều kiện).
   - Quyền hạn chuẩn hóa: `read`, `write`, `create`, `rename`, `delete`, `publish`, `administer`, `presentation:read`, `presentation:write`, `workflow:execute`.
   - Bảng ánh xạ tập trung `action -> right` tại `src/config/permissions.js`.

2. **Dịch vụ Tính toán Quyền `aclService` & Thay thế Ruột `canPerform`:**
   - Giữ nguyên 100% chữ ký hàm `canPerform(user, item, action)` để các module đã xây dựng trước (GĐ 8, 8.1, 10) hoạt động liền mạch mà không cần sửa đổi interface.
   - Hàm giải thích quyền `explainPermission(user, item, action)` phục vụ Access Viewer, trả về lý do, nguồn gốc (`explicit` / `inherited` / `administrator` / `default`) và cấp độ tổ tiên đưa ra quyết định.
   - Thuật toán lọc hàng loạt `filterReadable(user, items)` giải quyết triệt để vấn đề N+1 queries bằng cách nạp toàn bộ tổ tiên và quy tắc ACL chỉ trong 1 truy vấn MongoDB duy nhất.
   - Cơ chế bảo vệ node tổ tiên (`navigationOnly: true`): Khi người dùng không có quyền đọc trên node cha nhưng có quyền đọc ở node con, node cha vẫn hiển thị trên cây dạng mờ để điều hướng, ngăn chặn truy cập form chỉnh sửa.
   - Cơ chế chống tự khóa (Self-lockout guard): Không cho phép người dùng tự thu hồi hoặc Deny quyền `administer` của chính mình.
   - Bộ nhớ đệm phân quyền in-memory tự động vô hiệu hóa tức thời thông qua EventBus khi có sự kiện `acl.changed`, `role.changed`, `user.changed`, `item.moved`, `item.deleted`, `item.created`.

3. **Tích hợp sâu rộng với các giai đoạn đã làm trước (GĐ 8, GĐ 8.1, GĐ 10):**
   - **Workbox:** `workboxService.filterVisible` sử dụng `filterReadable` để lọc danh sách item hiển thị theo đúng quyền đọc của từng item.
   - **Publishing:** `publishService.publishItem` kiểm tra quyền `item:publish` cho **từng item** trong lô; item không đủ quyền được ghi nhận trạng thái `SKIPPED` vào lịch sử mà không làm dừng toàn bộ job. Chế độ xuất bản toàn site (`Site`) và `Republish` yêu cầu quyền `publish:manage`.
   - **Preview Admin (`/admin/preview`):** Kiểm tra quyền đọc dữ liệu Master (`item:read`) trước khi kết xuất chế độ Preview.
   - **Database Manager & Switcher (`/admin/databases`):** Lọc danh sách diff và item đối soát theo quyền đọc thực tế của người dùng.
   - **Public Site (GĐ 10):** Độc lập 100%, đọc trực tiếp từ `items_web` và không bị ảnh hưởng bởi quyền admin.

4. **Quản trị Bảo mật & Giao diện Desktop-like:**
   - **Ribbon Content Editor:** Kích hoạt tab **SECURITY** với các nút hành động: *Security Editor*, *Access Viewer*, *Assign*, *Reset to Inherited*, *User Manager*, *Role Manager*. Tab *REVIEW* tiếp tục được giữ disabled đúng kỷ luật.
   - **Security Editor Modal:** Bảng ma trận trực quan Principal × Rights, toggle xoay vòng `Allow` &rarr; `Deny` &rarr; `Inherit`, chọn phạm vi kế thừa (`thisItem`, `descendants`, `both`), cờ dirty và nút khôi phục kế thừa (Reset).
   - **Access Viewer Modal & Standalone Page (`/admin/security/access-viewer`):** Cho phép chọn User hoặc Role và kiểm tra quyền hiệu lực trên từng Item kèm giải thích chi tiết nguồn gốc quy tắc.
   - **User Manager (`/admin/security/users`):** Danh sách người dùng, tìm kiếm, lọc theo domain, lọc theo vai trò, lọc trạng thái, tạo mới, chỉnh sửa, đổi mật khẩu và khoá/mở tài khoản. Khi khoá tài khoản, hệ thống tự động huỷ (invalidate) toàn bộ session đang hoạt động trong MongoDB session store.
   - **Role Manager (`/admin/security/roles`):** Danh sách vai trò, quan hệ kế thừa `memberOf` có thuật toán phát hiện và ngăn chặn vòng lặp (Circular Role Inheritance Detection), bảo vệ không cho phép xoá hoặc đổi tên vai trò hệ thống (`Administrator`, `Author`, `Editor`, `Approver`, `Developer`).
   - **Launchpad:** Đã kết nối 3 tile trong nhóm *Access Management* (User Manager, Role Manager, Access Viewer) đến đúng URL chức năng.

5. **Migration Dữ liệu & Tương thích ngược:**
   - Viết kịch bản migration `src/scripts/migrate-phase-07-default-acl.js` hỗ trợ `--dry-run`, `--rollback` và live migration.
   - Đã khởi tạo Domain mặc định `sitecore` và seed 55 quy tắc ACL gốc trên các node `/sitecore`, `/sitecore/content`, `/sitecore/layout`, `/sitecore/templates`, `/sitecore/system` trên MongoDB Atlas, đảm bảo hành vi hiện tại không bị gián đoạn.

6. **Chất lượng Mã nguồn & Kiểm thử:**
   - Viết bộ test suite mới `tests/aclService.test.js` bao phủ 100% các nguyên tắc phân giải của DEC-042 (12/12 test cases passed).
   - Toàn bộ hệ thống vượt qua kiểm thử: **29/29 test suites passed, 304/304 tests passed**.
   - ESLint: **0 errors**.

---

### 2. Danh sách Tệp Tin Đã Tạo Mới / Cập Nhật

| STT | Tệp tin | Hành động | Mô tả |
| :---: | :--- | :---: | :--- |
| 1 | `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md` | **Tạo mới** | Quyết định kiến trúc về mô hình quyền và quy tắc phân giải ACL |
| 2 | `src/models/Domain.js` | **Tạo mới** | Schema miền bảo mật (mặc định: `sitecore`) |
| 3 | `src/models/AccessControl.js` | **Tạo mới** | Schema quy tắc phân quyền theo Item (Principal, Right, Access, Inheritance) |
| 4 | `src/models/Role.js` | **Cập nhật** | Thêm trường `domain` và kế thừa vai trò `memberOf` |
| 5 | `src/models/User.js` | **Cập nhật** | Thêm trường `domain`, `displayName`, `isAdmin`, `isDisabled` |
| 6 | `src/config/permissions.js` | **Cập nhật** | Bổ sung hằng số quyền ACL, ma trận quyền và hàm `mapActionToRight` |
| 7 | `src/services/aclService.js` | **Tạo mới** | Dịch vụ phân giải quyền, giải thích quyết định, lọc không N+1, quản lý bộ đệm |
| 8 | `src/services/userService.js` | **Tạo mới** | Nghiệp vụ người dùng, khoá tài khoản, đổi mật khẩu, huỷ session |
| 9 | `src/services/roleService.js` | **Tạo mới** | Nghiệp vụ vai trò, quan hệ `memberOf` kèm thuật toán phát hiện chu trình |
| 10 | `src/services/itemService.js` | **Cập nhật** | Chuyển ruột `canPerform` và `explainPermission` sang `aclService` |
| 11 | `src/services/workboxService.js` | **Cập nhật** | Lọc item chờ duyệt trong Workbox bằng `filterReadable` |
| 12 | `src/services/publishService.js` | **Cập nhật** | Kiểm tra quyền `item:publish` cho từng item trong Publish Job |
| 13 | `src/controllers/admin/securityController.js` | **Tạo mới** | Controller cho User Manager, Role Manager, Security Editor, Access Viewer |
| 14 | `src/controllers/admin/contentEditorController.js` | **Cập nhật** | Lọc cây theo quyền đọc (`navigationOnly`), kiểm tra quyền Layout tree, Preview |
| 15 | `src/controllers/admin/databaseController.js` | **Cập nhật** | Lọc danh sách diff Master/Web theo quyền đọc Item ACL |
| 16 | `src/controllers/admin/presentationController.js` | **Cập nhật** | Kiểm tra quyền `presentation:read` và `presentation:write` theo item |
| 17 | `src/controllers/admin/launchpadController.js` | **Cập nhật** | Kích hoạt URL cho 3 tile Access Management |
| 18 | `src/routes/admin/securityRoutes.js` | **Tạo mới** | Route UI cho Users, Roles, Access Viewer |
| 19 | `src/routes/api/securityRoutes.js` | **Tạo mới** | API REST cho Users, Roles, ACL Matrix, Access Explanation |
| 20 | `src/views/admin/security/users.ejs` | **Tạo mới** | Giao diện User Manager quản lý tài khoản |
| 21 | `src/views/admin/security/roles.ejs` | **Tạo mới** | Giao diện Role Manager quản lý vai trò và kế thừa vai trò |
| 22 | `src/views/admin/security/access-viewer.ejs` | **Tạo mới** | Giao diện Access Viewer tra cứu quyền hiệu lực |
| 23 | `src/views/content-editor/modals/security-editor-modal.ejs` | **Tạo mới** | Modal ma trận Security Editor gán quyền trực tiếp trên Item |
| 24 | `src/views/content-editor/modals/access-viewer-modal.ejs` | **Tạo mới** | Modal Access Viewer kiểm tra nhanh quyền trên Item đang chọn |
| 25 | `public/js/admin/security-editor.js` | **Tạo mới** | Logic tương tác client-side cho Security Editor và Access Viewer |
| 26 | `src/config/ribbon.js` | **Cập nhật** | Kích hoạt tab Ribbon `Security` (tab `Review` tiếp tục disabled) |
| 27 | `src/scripts/migrate-phase-07-default-acl.js` | **Tạo mới** | Script migration tạo domain và 55 quy tắc ACL gốc |
| 28 | `tests/aclService.test.js` | **Tạo mới** | Bộ kiểm thử toàn diện các quy tắc giải quyết quyền của DEC-042 |
| 29 | `docs/phases/phase-07-item-acl.md` | **Cập nhật** | Đánh dấu hoàn thành toàn bộ checklist nhiệm vụ GĐ 7 |
| 30 | `docs/phases/README.md` | **Cập nhật** | Cập nhật tiến độ 13 giai đoạn, chuyển GĐ 7 sang Hoàn thành |

---

### 3. Hướng dẫn Kiểm tra & Nghiệm thu Thực tế

1. **Kiểm tra User Manager & Role Manager:**
   - Mở Launchpad &rarr; Bấm tile **User Manager** (`/admin/security/users`) hoặc **Role Manager** (`/admin/security/roles`).
   - Thử tạo vai trò mới `Marketing Lead`, gán kế thừa từ vai trò `Author`.
   - Thử tạo user mới, gán vào vai trò `Marketing Lead`.
   - Thử khoá tài khoản (Lock) user: xác nhận tài khoản bị chuyển sang trạng thái đã khoá và không thể đăng nhập.
2. **Kiểm tra Security Editor trên Content Editor:**
   - Mở `/admin/content-editor`.
   - Chuyển sang tab Ribbon **SECURITY** (đã sáng và hoạt động; tab REVIEW vẫn disabled).
   - Bấm **Security Editor**: Ma trận phân quyền mở ra hiển thị các User/Role kèm các cột quyền `Read`, `Write`, `Create`, `Rename`, `Delete`, `Publish`, `Administer`.
   - Bấm trực tiếp vào từng ô quyền để chuyển đổi trạng thái `Allow` (xanh) &rarr; `Deny` (đỏ) &rarr; `Inherit` (xám).
   - Chọn phạm vi kế thừa (`Mục này và con`, `Chỉ mục này`, `Chỉ mục con`) và bấm **Lưu phân quyền**.
3. **Kiểm tra Access Viewer:**
   - Bấm nút **Access Viewer** trên Ribbon hoặc truy cập `/admin/security/access-viewer`.
   - Chọn đối tượng (User hoặc Role) và chọn Item: Bảng ma trận hiển thị kết quả quyền hiệu lực và giải thích cụ thể nguồn gốc quy tắc theo đúng chuẩn DEC-042.
4. **Kiểm tra Tích hợp Quyền Biên tập & Xuất bản:**
   - Người dùng không có quyền `item:read` trên một nhánh sẽ thấy node cha mờ dạng `navigationOnly` và không thể mở form xem/sửa nội dung.
   - Khi chạy Publish Job, các item mà người dùng không có quyền `item:publish` sẽ tự động bị bỏ qua (`SKIPPED`) và ghi chú rõ lý do vào lịch sử xuất bản mà không làm hỏng tiến trình của cả job.

