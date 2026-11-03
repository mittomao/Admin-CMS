# Mô hình Item & Cây Nội dung (Items & Tree Model)
> File: `docs/data-model/items-and-tree.md`  
> Mô tả: Cấu trúc Collection `items_master` và `items_web`, quan hệ cây phân cấp, lưu trữ trường dữ liệu động và indexes.

---

## 1. Collection `items_master` (và cấu trúc tương đương cho `items_web`)

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123456"),
  name: "about-us",                    // Tên kỹ thuật (dùng tạo path & slug, không dấu, kebab-case)
  displayName: "About Us",             // Tên hiển thị trên cây nội dung
  templateId: ObjectId("64a1b2c3d4e5f67890123450"), // Tham chiếu đến Template định nghĩa item
  parentId: ObjectId("64a1b2c3d4e5f67890123400"),   // ID node cha (null nếu là Root /sitecore)
  ancestors: [                         // Mảng ID các node tổ tiên từ gốc xuống
    ObjectId("64a1b2c3d4e5f67890123000"), // /sitecore
    ObjectId("64a1b2c3d4e5f67890123100"), // /sitecore/content
    ObjectId("64a1b2c3d4e5f67890123400")  // /sitecore/content/home
  ],
  path: "/sitecore/content/home/about-us", // Materialized path (duy nhất)
  sortOrder: 100,                      // Thứ tự sắp xếp giữa các anh chị em cùng cấp
  
  // Dynamic fields mapping (ở cấp độ cơ bản GĐ 2)
  // Khóa lưu trữ bằng immutable fieldId (String của field._id)
  fields: {
    "64a1b2c3d4e5f67890123991": "About Our Corporation",
    "64a1b2c3d4e5f67890123992": "<p>Welcome to our official website...</p>"
  },
  
  // Các trường dùng chung mọi ngôn ngữ và version (triển khai chi tiết ở GĐ 4)
  sharedFields: {
    "field_hide_in_nav": false
  },
  
  // Dữ liệu nội dung đa ngôn ngữ & đa phiên bản (chi tiết tại docs/data-model/versions-languages.md)
  languages: [ ... ],
  
  // Cấu hình Headless Presentation (chi tiết tại docs/data-model/presentation.md)
  presentation: { ... },
  
  isDeleted: false,                    // Đánh dấu soft-delete (nằm trong Recycle Bin)
  deletedAt: null,
  deletedBy: null,
  createdBy: ObjectId("..."),
  updatedBy: ObjectId("..."),
  createdAt: ISODate("2026-11-03T00:00:00.000Z"),
  updatedAt: ISODate("2026-11-03T00:00:00.000Z")
}
```

---

## 2. Hệ thống Chỉ mục (Indexes)
Thiết lập trên cả hai collection `items_master` và `items_web`:

```javascript
// Đảm bảo tính duy nhất và tìm kiếm nhanh theo đường dẫn
itemSchema.index({ path: 1 }, { unique: true });

// Tối ưu hóa tuyệt đối cho Lazy Loading con trực tiếp trong Fancytree
itemSchema.index({ parentId: 1, sortOrder: 1, isDeleted: 1 });

// Tối ưu hóa truy vấn toàn bộ con cháu (ancestors traversal)
itemSchema.index({ ancestors: 1 });

// Lọc và tìm kiếm theo loại Template
itemSchema.index({ templateId: 1 });

// Lọc các item trong thùng rác
itemSchema.index({ isDeleted: 1 });
```

---

## 3. Khóa Lưu trữ Giá trị Field (Immutable Field ID)
- Theo quyết định kiến trúc [`DEC-015`](../decisions/DEC-015-immutable-field-id.md), CMS không lưu giá trị field theo `fieldName` dễ bị đổi mà lưu theo chuỗi `fieldId` (`field._id.toString()`) bất biến của Schema Field.
- Cung cấp cơ chế dual-key fallback để tương thích với dữ liệu cũ khi tra cứu hoặc di trú.

---

## 4. Cấu trúc Cây Hệ thống Chuẩn & Bảo vệ Node (DEC-030)
Cây nội dung khởi tạo với các node gốc bất biến:
```
sitecore
├── content                    (/sitecore/content - chứa các trang và site)
├── layout                     (/sitecore/layout - chứa Presentation, xem DEC-030)
│   ├── Layouts                (/sitecore/layout/layouts - chứa Layout items & folders)
│   ├── Renderings             (/sitecore/layout/renderings - chứa Rendering items & folders)
│   ├── Devices                (/sitecore/layout/devices)
│   └── Placeholder Settings   (/sitecore/layout/placeholder settings)
├── media library              (/sitecore/media library - chứa assets)
├── system                     (/sitecore/system - cấu hình hệ thống)
└── templates                  (/sitecore/templates - định nghĩa schema)
```
- **Node Hệ thống Cốt lõi:** Bị cấm đổi tên, di chuyển và xóa (`/sitecore`, `/sitecore/content`, `/sitecore/layout`, `/sitecore/media library`, `/sitecore/system`, `/sitecore/templates`, và các sub-root của layout: `layouts`, `renderings`, `devices`, `placeholder settings`).
- **Phân quyền Presentation:** Mọi thao tác ghi dưới `/sitecore/layout/*` yêu cầu quyền `presentation:write`.


