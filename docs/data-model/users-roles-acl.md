# Mô hình Người dùng, Vai trò & Phân quyền (Users, Roles & ACL)
> File: `docs/data-model/users-roles-acl.md`  
> Mô tả: Cấu trúc Collection `users`, `roles`, `access_control_lists` và quy tắc phân quyền theo Item.

---

## 1. Collection `users` & `roles`

```javascript
// Collection: users
{
  _id: ObjectId("64a1b2c3d4e5f67890123501"),
  username: "admin",
  email: "admin@cms.local",
  passwordHash: "$2b$10$...",          // Băm mật khẩu bcryptjs với salt rounds = 10
  fullName: "System Administrator",
  avatar: "/images/avatars/default.png",
  roles: [
    ObjectId("64a1b2c3d4e5f67890123601"), // Administrator role
    ObjectId("64a1b2c3d4e5f67890123602")  // Author role
  ],
  isActive: true,
  lastLogin: ISODate("2026-11-03T10:00:00.000Z"),
  createdAt: ISODate("2026-11-03T00:00:00.000Z"),
  updatedAt: ISODate("2026-11-03T00:00:00.000Z")
}

// Collection: roles
{
  _id: ObjectId("64a1b2c3d4e5f67890123602"),
  name: "Treecraft Client Authoring",
  description: "Cho phép soạn thảo nội dung cơ bản nhưng không có quyền cấu hình hệ thống",
  isSystem: true,                      // Role hệ thống không được xóa
  createdAt: ISODate("2026-11-03T00:00:00.000Z")
}
```

---

## 2. Collection `access_control_lists` (ACL theo Item)
Mỗi bản ghi đại diện cho một quy tắc phân quyền cụ thể trên một Item:

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123701"),
  itemId: ObjectId("64a1b2c3d4e5f67890123400"), // Áp dụng cho Item cụ thể (/root/content/home)
  identityType: "role",                // "user" hoặc "role"
  identityId: ObjectId("64a1b2c3d4e5f67890123602"), // ID của User hoặc Role tương ứng
  
  // Bảng phân quyền chi tiết các quyền hạn
  permissions: {
    read: "allow",                     // "allow" | "deny" | "inherit"
    write: "allow",
    create: "allow",
    delete: "deny",
    administer: "deny",
    publish: "allow",
    "presentation:read": "allow",      // Quyền xem cấu hình Presentation
    "presentation:write": "deny"       // Quyền sửa/gán Presentation Details
  },
  
  applyToDescendants: true             // true: Kế thừa quyền này cho tất cả node con cháu
}
```

*Chỉ mục (Indexes):*
`{ itemId: 1, identityType: 1, identityId: 1 }` (unique)

---

## 3. Thuật toán Tính toán Quyền Hiệu dụng
- Tham chiếu quy tắc bảo mật chi tiết tại [`docs/rules/05-security.md`](../rules/05-security.md).
- Quy tắc ưu tiên:
  1. `Explicit Deny` (Từ chối chỉ định trực tiếp trên Item)
  2. `Explicit Allow` (Cho phép chỉ định trực tiếp trên Item)
  3. `Inherited Deny` (Từ chối kế thừa từ tổ tiên gần nhất)
  4. `Inherited Allow` (Cho phép kế thừa từ tổ tiên gần nhất)
  5. `Default Deny` (Mặc định không có quyền nếu không cấu hình)

