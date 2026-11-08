# Mô hình Tài nguyên Số (Media Model — GĐ 5.1 & DEC-038)
> File: `docs/data-model/media.md`  
> Mô tả: Cấu trúc Media Item trong `items_master`, ánh xạ 1-1 với Cloudinary, System Templates (`Image`, `File`, `Media Folder`) và metadata.
> Cập nhật: 2026-11-05 (Theo yêu cầu GĐ 5.1 & DEC-038 — Hợp nhất "Mọi Media là Item" và Cloudinary độc quyền)

---

## 1. Triết lý Cốt lõi: "Mọi Media Đều Là Item"
- Xóa bỏ hoàn toàn collection riêng biệt `media`. Toàn bộ tài nguyên số (ảnh, file tài liệu, thư mục) được quản lý dưới dạng các **Item** chính danh trong collection `items_master` (và xuất bản sang `items_web` ở GĐ 8) bên dưới nhánh `/root/media library`.
- Tên kỹ thuật của Item (`name`): **Không kèm đuôi mở rộng file** (ví dụ `hero-banner` thay vì `hero-banner.jpg`). Đuôi mở rộng được lưu trữ ở trường `extension` và `format`.
- Quản lý phân cấp bằng System Templates tại `/root/templates/System`:
  - `Media Folder`: Thư mục tổ chức media (icon `folder`).
  - `Image`: Tài nguyên hình ảnh (icon `photo`).
  - `File`: Tài nguyên tài liệu/tệp chung (icon `file`).

---

## 2. Cấu trúc Item Media trong `items_master`

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123777"),
  name: "hero-banner",                                // Tên Item kỹ thuật (không kèm đuôi file, kebab-case)
  displayName: "Hero Banner Homepage",                // Tên hiển thị người dùng
  templateId: ObjectId("64a1b2c3d4e5f67890123901"),  // ID của System Template 'Image'
  parentId: ObjectId("64a1b2c3d4e5f67890123700"),    // ID của Media Folder cha ('banners')
  ancestors: [
    ObjectId("64a1b2c3d4e5f67890123000"),            // /root
    ObjectId("64a1b2c3d4e5f67890123300"),            // /root/media library
    ObjectId("64a1b2c3d4e5f67890123700")             // /root/media library/banners
  ],
  path: "/root/media library/banners/hero-banner",
  sortOrder: 100,

  // 1. Trường Dùng Chung (Shared Fields) - Lưu trữ thông số kỹ thuật tệp nhị phân Cloudinary
  sharedFields: {
    publicId: "AdminCMS/banners/hero-banner",         // Cloudinary Public ID (không kèm đuôi đối với ảnh)
    assetId: "1dd6c72021150e2ac6ddfdc683b1b3fe",      // Cloudinary Asset ID bất biến
    resourceType: "image",                            // 'image' | 'video' | 'raw'
    format: "webp",                                   // Định dạng nén trên Cloudinary
    extension: "jpg",                                 // Đuôi mở rộng của tệp gốc
    secureUrl: "https://res.cloudinary.com/v41qu0lg/image/upload/v1793848783/AdminCMS/banners/hero-banner.webp",
    fileSize: 245000,                                 // Dung lượng tính theo bytes (~245KB)
    width: 1920,
    height: 800,
    checksum: "a3f5...sha256",                         // Mã băm SHA-256 phát hiện trùng lặp
    syncedAt: ISODate("2026-11-05T03:19:43Z")
  },

  // 2. Trường Đa Ngôn Ngữ & Đa Phiên Bản (Languages & Versions) - Lưu trữ Alt Text, Title, Description
  languages: [
    {
      code: "vi",
      unversionedFields: {},
      versions: [
        {
          version: 1,
          fields: {
            altText: "Hình ảnh banner trang chủ giới thiệu sản phẩm",
            title: "Banner Trang Chủ",
            description: "Ảnh banner chính hiển thị đầu trang web"
          },
          createdBy: ObjectId("..."),
          createdAt: ISODate("2026-11-05T00:00:00.000Z")
        }
      ]
    },
    {
      code: "en",
      unversionedFields: {},
      versions: [
        {
          version: 1,
          fields: {
            altText: "Homepage hero banner introducing products",
            title: "Homepage Banner",
            description: "Main hero banner displayed at the top of homepage"
          },
          createdBy: ObjectId("..."),
          createdAt: ISODate("2026-11-05T00:00:00.000Z")
        }
      ]
    }
  ],

  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  createdBy: ObjectId("..."),
  updatedBy: ObjectId("..."),
  createdAt: ISODate("2026-11-05T00:00:00.000Z"),
  updatedAt: ISODate("2026-11-05T00:00:00.000Z")
}
```

---

## 3. Ánh Xạ Hai Chiều (CMS Item Path ↔ Cloudinary Folder/Asset)

| Đường dẫn CMS Item | Đường dẫn Cloudinary (`asset_folder`) | `public_id` Cloudinary |
| :--- | :--- | :--- |
| `/root/media library` (Root) | `AdminCMS` | - |
| `/root/media library/Banners` (Folder) | `AdminCMS/Banners` | - |
| `/root/media library/Banners/hero-banner` (Image) | `AdminCMS/Banners` | `AdminCMS/Banners/hero-banner` |
| `/root/media library/Docs/report` (PDF File) | `AdminCMS/Docs` | `AdminCMS/Docs/report.pdf` (raw kèm ext) |

---

## 4. Quy tắc Chặn Trùng Tên (Name Conflict Rule)
- Trong cùng một Media Folder cha, không cho phép hai Item có cùng tên kỹ thuật `name`.
- Nếu tải lên tệp `hero-banner.png` khi đã tồn tại item `hero-banner`:
  - Hệ thống **chặn tải lên** và trả về lỗi HTTP 409 Conflict: `"Item với tên 'hero-banner' đã tồn tại trong thư mục này. Vui lòng đổi tên tệp trước khi tải lên."`

---

## 5. Quy tắc Phục Vụ & Chuyển Đổi URL (Serving & Transformations)
- **CDN URL Trực tiếp:** Toàn bộ component view và Rich Text sử dụng trực tiếp Cloudinary HTTPS CDN URL (`secureUrl`).
- **Transformation Presets:** Giới hạn whitelisted presets tránh lạm dụng băng thông:
  - `thumb`: `c_fill,h_300,w_300,f_auto,q_auto` (dùng cho Media Picker và Grid view).
  - `medium`: `c_fit,h_600,w_800,f_auto,q_auto` (dùng cho content nhúng bài viết).
  - `large`: `c_fit,h_1200,w_1600,f_auto,q_auto` (dùng cho hero banner).
- **Tương thích ngược:** Endpoint `/media/file/:id` chuyển hướng HTTP 302 Redirect trực tiếp sang `secureUrl`.
