# Mô hình Tài nguyên Số (Media Model)
> File: `docs/data-model/media.md`  
> Mô tả: Cấu trúc Collection `media`, cây thư mục media library, metadata tệp tin và thumbnails.

---

## 1. Collection `media`

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123777"),
  name: "hero-banner.jpg",             // Tên tệp kỹ thuật
  displayName: "Hero Banner Homepage", // Tên hiển thị người dùng
  isFolder: false,                     // true: Thư mục tổ chức media; false: Tệp media thật
  parentId: ObjectId("64a1b2c3d4e5f67890123700"), // Thư mục cha (null nếu nằm tại gốc /sitecore/media library)
  ancestors: [
    ObjectId("64a1b2c3d4e5f67890123000"), // /sitecore
    ObjectId("64a1b2c3d4e5f67890123650"), // /sitecore/media library
    ObjectId("64a1b2c3d4e5f67890123700")  // /sitecore/media library/banners
  ],
  path: "/sitecore/media library/banners/hero-banner.jpg",
  
  // Chi tiết tệp tin vật lý trên đĩa
  fileDetails: {
    originalName: "hero-banner.jpg",
    storagePath: "uploads/2026/11/hero-banner_uuid.jpg",
    thumbnailPath: "thumbnails/2026/11/hero-banner_uuid_thumb.webp",
    mimeType: "image/jpeg",
    fileSize: 245000,                  // Dung lượng tính theo bytes (~245KB)
    dimensions: { width: 1920, height: 800 },
    checksum: "a3f5...sha256",          // Mã băm SHA-256 phát hiện trùng lặp
    extension: "jpg"
  },
  
  // Alt text đa ngôn ngữ (Map of String: { vi: "...", en: "..." })
  altText: {
    vi: "Hình ảnh banner trang chủ giới thiệu sản phẩm",
    en: "Homepage hero banner introducing products"
  },
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  createdBy: ObjectId("..."),
  updatedBy: ObjectId("..."),
  createdAt: ISODate("2026-11-03T00:00:00.000Z"),
  updatedAt: ISODate("2026-11-03T00:00:00.000Z")
}
```

---

## 2. Chỉ mục (Indexes)
```javascript
mediaSchema.index({ path: 1 }, { unique: true });
mediaSchema.index({ parentId: 1, isFolder: 1, isDeleted: 1 });
mediaSchema.index({ ancestors: 1 });
mediaSchema.index({ isDeleted: 1 });
mediaSchema.index({ 'fileDetails.checksum': 1, isDeleted: 1 });
mediaSchema.index({ name: 'text', displayName: 'text' });
```

---

## 3. Quy tắc Lưu trữ & Tái sử dụng
- Tệp gốc được lưu tại `storage/uploads/YYYY/MM/`. Thư viện `sharp` tự động sinh ảnh thu nhỏ tỉ lệ vuông tại `storage/thumbnails/YYYY/MM/` phục vụ cho lưới xem trước (grid view) và Media Picker.
- Tệp tin được stream công khai qua endpoint bảo mật `GET /media/file/:id` hoặc `GET /media/file/:id?thumb=1`.
- Media Picker modal được thiết kế module hóa, có thể dùng lại cho mọi loại trường `Image` trong Form biên tập item, trường của Datasource items và Rendering parameters.

