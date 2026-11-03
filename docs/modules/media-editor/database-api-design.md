# Database & API Design – Thiết Kế CSDL & Đặc Tả RESTful API Contracts

Tài liệu này cung cấp đầy đủ thông số kỹ thuật về lược đồ cơ sở dữ liệu (Database Schema) và các bản giao ước API (API Contracts) phục vụ cho việc tái xây dựng module Media Library và Rich Text Editor.

---

## 1. Thiết Kế Cơ Sở Dữ Liệu (Database Schema Design)

### 1.1. Hiện Trạng Trong Dự Án Gốc (`Blog_Express_App`)

Trong dự án hiện tại, có hai schema liên quan:

1. **`models/imagesModel.js` (Orphan Model - Không sử dụng)**:
   ```javascript
   const images = new Schema({
       filename: { type: String, required: true }
   }, { collection: 'images', timestamps: true });
   images.index({ filename: 1 });
   ```
   *Thực tế mã nguồn*: Không có controller nào trong dự án thực hiện `require('../models/imagesModel')` hoặc lưu trữ bản ghi vào collection `images`. Danh sách ảnh hoàn toàn được truy vấn trực tiếp qua Cloudinary Search API theo thời gian thực.

2. **`models/blogModel.js` (Nơi lưu trữ ảnh cuối cùng)**:
   ```javascript
   const blogSchema = new Schema({
       title: { type: String, required: true },
       slug: { type: String, default: '', index: true },
       summary: { type: String, default: '' },
       thumbnail: { type: String, default: '' }, // Lưu URL ảnh đại diện (Cloudinary HTTPS URL)
       content: { type: String, default: '' },   // Lưu toàn bộ chuỗi HTML chứa các thẻ <img>
       readingTime: { type: Number, default: 1 },
       // ... các trường metadata khác
   }, { collection: 'blog', timestamps: true });
   ```

---

### 1.2. Đề Xuất Thiết Kế Schema Cho Dự Án Mới (`MediaAssetSchema`)

> [!TIP]
> **Khuyến Nghị Cho Dự Án Mới**:
> Nếu dự án mới sử dụng Cloudinary, bạn có thể tiếp tục cơ chế Cloud-native (không cần lưu database).
> Tuy nhiên, nếu bạn muốn:
> 1. Sử dụng **AWS S3, MinIO, Google Cloud Storage hoặc Local Storage** (vốn không có Search API theo tên tệp).
> 2. Phân quyền media theo từng người dùng (User ownership).
> 3. Tránh việc gọi API bên ngoài tốn kém và bị giới hạn tốc độ (rate limit).
> 
> Hãy triển khai schema độc lập sau đây trong MongoDB:

```javascript
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaAssetSchema = new Schema({
    publicId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    filename: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    url: {
        type: String,
        required: true
    },
    secureUrl: {
        type: String,
        required: true
    },
    folder: {
        type: String,
        default: 'Blog',
        index: true
    },
    format: {
        type: String,
        enum: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
        index: true
    },
    bytes: {
        type: Number,
        default: 0,
        index: true
    },
    width: {
        type: Number,
        default: null
    },
    height: {
        type: Number,
        default: null
    },
    mimeType: {
        type: String,
        default: 'image/jpeg'
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    collection: 'media_assets',
    timestamps: true
});

// Chỉ mục phức hợp hỗ trợ tìm kiếm, lọc theo folder và sắp xếp nhanh
MediaAssetSchema.index({ folder: 1, isDeleted: 1, createdAt: -1 });
MediaAssetSchema.index({ filename: 'text', publicId: 'text' });

module.exports = mongoose.model('MediaAsset', MediaAssetSchema);
```

---

## 2. Đặc Tả Chi Tiết Các RESTful API Contracts

Toàn bộ các route dưới đây yêu cầu xác thực phiên đăng nhập (`middleware.checkLogin`).

### 2.1. API Lấy Danh Sách Cây Thư Mục
- **Route**: `GET /admin/api/media/folders`
- **Headers**:
  - `Accept: application/json`
  - `Cookie: connect.sid=...`
- **Query Parameters**:
  - `parent` (string, tùy chọn): Đường dẫn thư mục cha. Mặc định là `DEFAULT_ROOT_FOLDER` (`Blog`).

#### Response Success (`HTTP 200 OK`):
```json
{
  "success": true,
  "current": "Blog",
  "rootFolder": "Blog",
  "folders": [
    {
      "name": "Tutorials",
      "path": "Blog/Tutorials"
    },
    {
      "name": "Personal",
      "path": "Blog/Personal"
    }
  ]
}
```

#### Response Error (`HTTP 500 Internal Server Error`):
```json
{
  "success": false,
  "error": "Failed to fetch folders"
}
```

---

### 2.2. API Tạo Thư Mục Mới
- **Route**: `POST /admin/api/media/folders`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
  ```json
  {
    "parent": "Blog/Tutorials",
    "name": "Nodejs"
  }
  ```

#### Response Success (`HTTP 201 Created`):
```json
{
  "success": true,
  "folder": {
    "name": "Nodejs",
    "path": "Blog/Tutorials/Nodejs",
    "result": {
      "success": true,
      "path": "Blog/Tutorials/Nodejs",
      "name": "Nodejs"
    }
  }
}
```

#### Response Error Validation (`HTTP 400 Bad Request`):
```json
{
  "success": false,
  "error": "Folder name is required"
}
```

---

### 2.3. API Xóa Thư Mục Rỗng
- **Route**: `DELETE /admin/api/media/folders`
- **Query / Body**:
  - `path` (string, bắt buộc): Đường dẫn thư mục cần xóa.
- **Quy tắc**: Không được xóa thư mục gốc (`DEFAULT_ROOT_FOLDER`). Thư mục phải hoàn toàn rỗng.

#### Response Success (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

#### Response Error (`HTTP 400 Bad Request`):
```json
{
  "success": false,
  "error": "Cannot delete the root folder"
}
```

---

### 2.4. API Truy Vấn & Lọc Tài Nguyên Ảnh (Search & Pagination)
- **Route**: `GET /admin/api/media/assets`
- **Query Parameters**:
  - `folder` (string, mặc định: `Blog`): Thư mục cần lấy ảnh.
  - `q` (string, tùy chọn): Từ khóa tìm kiếm theo tên tệp hoặc public_id.
  - `format` (string, mặc định: `all`): Bộ lọc định dạng (`png`, `jpg`, `webp`, `gif`, `svg`).
  - `sort` (string, mặc định: `created_at_desc`): Tiêu chí sắp xếp:
    - `created_at_desc` | `created_at_asc`
    - `name_asc` | `name_desc`
    - `bytes_desc` | `bytes_asc`
  - `next_cursor` (string, tùy chọn): Con trỏ lấy trang kế tiếp.
  - `max_results` (number, mặc định: `40`, tối đa: `100`).

#### Response Success (`HTTP 200 OK`):
```json
{
  "success": true,
  "currentFolder": "Blog",
  "total_count": 85,
  "next_cursor": "c8f2b34a910e5436d819875e7a9b09",
  "assets": [
    {
      "public_id": "Blog/1749660484-hero_banner",
      "format": "png",
      "version": 1749660484,
      "resource_type": "image",
      "type": "upload",
      "created_at": "2026-11-02T10:15:30Z",
      "bytes": 245120,
      "width": 1600,
      "height": 900,
      "folder": "Blog",
      "url": "http://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
      "secure_url": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png"
    }
  ]
}
```

---

### 2.5. API Tải Ảnh Lên (Upload Endpoint)
- **Route**: `POST /admin/api/media/upload`
- **Headers**:
  - `Content-Type: multipart/form-data`
- **Form Data Fields**:
  - `folder` (string, tùy chọn): Thư mục đích tải lên (ví dụ: `Blog/Tutorials`).
  - `files` (File hoặc mảng Files): Một hoặc nhiều tệp tin ảnh nhị phân.

#### Response Success (`HTTP 200 OK`):
*(Được thiết kế tương thích đồng thời cho TinyMCE `location` và MediaBrowser `files`)*
```json
{
  "success": true,
  "location": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
  "url": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
  "filename": "Blog/1749660484-hero_banner",
  "files": [
    {
      "url": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
      "secure_url": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
      "location": "https://res.cloudinary.com/demo/image/upload/v1749660484/Blog/1749660484-hero_banner.png",
      "public_id": "Blog/1749660484-hero_banner",
      "format": "png",
      "bytes": 245120,
      "originalname": "hero_banner.png"
    }
  ]
}
```

#### Response Error Unauthorized (`HTTP 401 Unauthorized`):
```json
{
  "success": false,
  "error": "Unauthorized. Please login to upload images."
}
```

#### Response Error File Format / Size (`HTTP 400 Bad Request`):
```json
{
  "success": false,
  "error": "Only image files are allowed (.jpg, .jpeg, .png, .gif, .webp, .svg)"
}
```

---

### 2.6. API Xóa Ảnh Đơn Hoặc Hàng Loạt (Delete Assets)
- **Route**: `DELETE /admin/api/media/assets`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body**:
  ```json
  {
    "public_ids": [
      "Blog/1749660484-hero_banner",
      "Blog/1749660485-sample_post"
    ]
  }
  ```

#### Response Success (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Successfully processed deletion for 2 asset(s)",
  "deleted": {
    "Blog/1749660484-hero_banner": "deleted",
    "Blog/1749660485-sample_post": "deleted"
  }
}
```

---

### 2.7. API Tương Thích Ngược (Backward Compatibility Endpoints)
- **Route**: `GET /admin/api/media` hoặc `GET /admin/api/media-list`
- **Mục đích**: Trả về 100 tài nguyên đầu tiên của thư mục gốc cho các module picker đời cũ.
- **Output JSON**:
  ```json
  {
    "success": true,
    "resources": [
      {
        "public_id": "Blog/1749660484-hero_banner",
        "secure_url": "https://res.cloudinary.com/demo/...",
        "bytes": 245120
      }
    ]
  }
  ```

