# DEC-042: Mô hình Bảo mật ACL theo Item, Kế thừa Phân cấp và Phân giải Quyền Hiệu dụng

- **Ngày quyết định:** 2026-11-08
- **Giai đoạn liên quan:** GĐ 7 (Bảo mật nâng cao & Phân quyền ACL)
- **Trạng thái:** Đã chốt (Accepted)

---

## 1. Bối cảnh
Trước GĐ 7, việc phân quyền trong CMS được trừu tượng hóa qua hàm `canPerform(user, item, action)` nhưng bên trong vẫn sử dụng bảng ánh xạ cứng tạm thời theo Role (theo DEC-039). Để đạt chuẩn bảo mật phân cấp của Sitecore XM ("Mọi thứ là Item"), hệ thống cần chuyển sang mô hình phân quyền chi tiết tới từng Item (Item-Level Access Control List - ACL) với cơ chế thừa kế theo cây, hỗ trợ gán quyền cho cả User và Role, ghi đè Deny/Allow, và công cụ trực quan hóa Access Viewer.

---

## 2. Quyết định Kiến trúc

### 2.1. Cấu trúc Bản ghi ACL Entry (`AccessControl`)
Bảng phân quyền lưu trong collection `access_control_lists` (với alias `acl`), mỗi bản ghi đại diện cho một quy tắc bảo mật:

```javascript
{
  _id: ObjectId("..."),
  itemId: ObjectId("..."),             // Item chịu tác động
  principalType: "user" | "role",      // Đối tượng được phân quyền
  principalId: ObjectId("..."),        // ID của User hoặc Role
  right: String,                       // Tên quyền hạn (xem mục 2.2)
  access: "allow" | "deny",            // Cho phép hoặc Từ chối
  inheritance: "thisItem" | "descendants" | "both", // Phạm vi thừa kế
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

- **Chỉ mục (Indexes):**
  - `{ itemId: 1, principalType: 1, principalId: 1, right: 1 }` (unique)
  - `{ principalType: 1, principalId: 1 }`
  - `{ itemId: 1 }`

### 2.2. Danh mục Quyền Hạn (Rights) và Ánh xạ Action $\rightarrow$ Right
Toàn bộ ánh xạ được định nghĩa tập trung tại file hằng số [`src/config/permissions.js`](../../src/config/permissions.js):

| Right (Quyền ACL trên Item) | Ý nghĩa nghiệp vụ | Actions ánh xạ tương ứng |
| :--- | :--- | :--- |
| `read` | Xem item, duyệt form, đọc dữ liệu trường | `item:read`, `workflow:read`, Preview route |
| `write` | Chỉnh sửa và lưu giá trị các trường của item | `item:write`, `version:create`, `version:restore` |
| `create` | Tạo item con bên dưới item này | `item:create` |
| `rename` | Đổi tên item (name & displayName) | `item:rename` |
| `delete` | Xóa item (hoặc xóa phiên bản của item) | `item:delete`, `version:delete` |
| `publish` | Xuất bản item hoặc nhánh con sang Web DB | `item:publish`, `item:unpublish` |
| `administer` | Đặt quyền ACL trên item/nhánh này | `security:acl:manage`, `security:acl:reset` |
| `presentation:read` | Xem cấu hình bố cục Presentation Details | `presentation:read` |
| `presentation:write` | Thêm, sửa, sắp xếp rendering hoặc reset Presentation | `presentation:write` |
| `workflow:execute` | Thực thi các lệnh workflow (Submit, Approve, Reject...) | `workflow:execute:<command>` |

*Lưu ý về các thao tác hệ thống không gắn với item đơn lẻ:*
- `publish:manage`: Yêu cầu quyền `publish` trên root item `/sitecore/content` và/hoặc role `Administrator`.
- `workbox:read`: Kiểm tra user có quyền `read` và `workflow:execute` trên ít nhất một item trong danh sách chờ.
- `workbox:bulk`: Kiểm tra quyền `workflow:execute` trên từng item được chọn.
- `database:web:read` & `database:compare`: Phân quyền qua role cấu hình hệ thống (`Administrator`, `Approver`) hoặc ACL trên `/sitecore`.

### 2.3. Quy tắc Đánh giá Quyền Hiệu dụng (Effective Permissions Resolution)
Khi gọi `canPerform(user, item, action)`:
1. **Administrator Bypass:** Nếu `user` sở hữu role `Administrator` hoặc cờ `user.isAdmin === true`, hàm trả về `true` ngay lập tức.
2. **Thu thập danh sách Principals của User:**
   - Principal User: `{ type: 'user', id: user._id }`.
   - Principal Roles: Toàn bộ role của user kèm theo tất cả các role cha kế thừa qua mảng `memberOf` (giải thuật duyệt đồ thị chống vòng lặp).
3. **Thu thập chuỗi Item từ dưới lên trên:**
   - `[item._id, ...reversed(item.ancestors)]` (từ Item hiện tại duyệt ngược lên cha, ông, cho tới Root).
4. **Quy tắc phân giải tại từng tầng:**
   - **Tầng Item (khoảng cách tới item):** Quyền gán **trực tiếp trên item** (khoảng cách 0) luôn thắng quyền kế thừa từ tổ tiên (khoảng cách $\ge 1$).
   - **Phạm vi thừa kế (`inheritance`):**
     - Tại chính item: Chỉ xét các rule có `inheritance` là `'thisItem'` hoặc `'both'`.
     - Kế thừa từ tổ tiên: Chỉ xét các rule có `inheritance` là `'descendants'` hoặc `'both'`.
   - **User vs Role cùng tầng:** Quyền gán trực tiếp cho **User thắng quyền của Role** tại cùng khoảng cách.
   - **Cùng cấp độ:** **Deny luôn thắng Allow**. Nếu giữa các Role của user tại cùng một tầng có cả Deny và Allow cho cùng một right, kết quả là **Deny**.
5. **Mặc định khi không có quy tắc (Default):** **Deny** (trả về `false`).

#### Bảng ma trận ví dụ minh họa:
| Tình huống | Item Rule | Parent Rule | Root Rule | Quyền hiệu dụng | Giải thích |
| :--- | :--- | :--- | :--- | :---: | :--- |
| 1 | *Không có* | Role Author: `Allow Read (both)` | *Không có* | **Allow Read** | Kế thừa Allow từ cha |
| 2 | Role Author: `Deny Read (both)` | Role Author: `Allow Read (both)` | *Không có* | **Deny Read** | Quyền trực tiếp trên item ghi đè quyền cha |
| 3 | Role A: `Allow Write`, Role B: `Deny Write` | *Không có* | *Không có* | **Deny Write** | Cùng mức: Deny thắng Allow |
| 4 | User: `Allow Write`, Role: `Deny Write` | *Không có* | *Không có* | **Allow Write** | Cùng mức: User entry thắng Role entry |
| 5 | *Không có* | *Không có* | *Không có* | **Deny (Mặc định)** | Không có entry nào khớp $\rightarrow$ Default Deny |

### 2.4. Quyền `administer` và Chống Tự Khóa (Self-Lockout Prevention)
- Quyền `administer` cho phép người dùng mở Security Editor và gán ACL trên item hoặc toàn bộ nhánh con.
- **Ràng buộc an toàn:**
  - Hệ thống từ chối nếu người dùng cố gắng gán `Deny administer` cho chính mình hoặc xóa quyền `administer` duy nhất của mình khi không phải là `Administrator`.
  - Không cho phép vô hiệu hóa hoặc xóa người dùng `admin` hệ thống hoặc xóa Role `Administrator`.

### 2.5. Tổ tiên "Chỉ điều hướng" (`navigationOnly`) cho Cây Phân cấp
- Khi người dùng chỉ được cấp quyền đọc ở một nhánh sâu (ví dụ `/sitecore/content/home/articles/post-1`), cây Fancytree vẫn cần hiển thị các node tổ tiên (`sitecore`, `content`, `home`, `articles`) để user duyệt xuống.
- Các node tổ tiên này sẽ được gắn cờ `navigationOnly: true`:
  - Cho phép click mở rộng (expand) trên cây.
  - Form soạn thảo bị khóa hoàn toàn, không lộ giá trị trường (`fields: {}`).
  - Giao diện hiển thị thông báo: *"Bạn chỉ có quyền điều hướng qua mục này để truy cập các mục con được phân quyền"*.

### 2.6. Hiệu năng & Cache Phân giải ACL
- Để tránh vấn đề N+1 truy vấn khi render cây và duyệt Workbox:
  - Cung cấp hàm `filterReadable(user, items)`: truy vấn toàn bộ ACL của danh sách `ancestors` trong đúng **1 câu lệnh MongoDB duy nhất** (`$in`), sau đó tính toán in-memory.
  - Bộ đệm In-Memory LRU Cache: lưu trữ kết quả phân giải theo key `acl:{userId}:{itemId}:{action}` với TTL 120 giây.
  - **Vô hiệu hóa bộ đệm tức thì:** Lắng nghe các sự kiện `acl.changed`, `role.changed`, `user.changed`, `item.moved` trên Event Bus để xóa sạch cache liên quan.

---

## 3. Hệ quả & Quy trình Chuyển đổi
1. **Migration khởi tạo (`migrate-phase-07-default-acl.js`):**
   - Đọc các role hiện có (`Administrator`, `Author`, `Editor`, `Approver`).
   - Tạo các entry ACL mặc định trên các node gốc `/sitecore`, `/sitecore/content`, `/sitecore/media library`, `/sitecore/layout`, `/sitecore/templates`, `/sitecore/system` để sau migration, toàn bộ hành vi phân quyền của GĐ 8 / 8.1 giữ nguyên không bị phá vỡ.
2. **Giữ nguyên chữ ký `canPerform(user, item, action)`:** Tất cả các controller hiện tại không cần thay đổi cách gọi.

