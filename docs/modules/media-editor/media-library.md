# Media Library – Đặc Tả Toàn Bộ Chức Năng Frontend & UI/UX

Tài liệu này đặc tả chi tiết module **Media Library** dựa trên mã nguồn thực tế tại `public/js/admin/media-browser.js`, `views/admin/partials/media-browser-core.ejs`, và `views/admin/partials/cloudinary-modal.ejs`.

Module này được thiết kế theo hướng đối tượng thuần ES6 (Vanilla Object-Oriented JavaScript) kết hợp với hệ thống giao diện Tabler / Bootstrap 5, hoàn toàn độc lập và không phụ thuộc vào bất kỳ framework nặng nề nào như React hay Vue.

---

## 1. Kiến Trúc Dual-Mode (Chế Độ Kép)

Media Library được thiết kế để hoạt động linh hoạt ở hai chế độ chỉ thông qua một template dùng chung (`media-browser-core.ejs`) và thuộc tính cấu hình `data-is-picker`:

| Tiêu chí | Chế độ Trang Độc Lập (Standalone Page Mode) | Chế độ Hộp Thoại Chọn (Modal Picker Mode) |
| :--- | :--- | :--- |
| **Vị trí hiển thị** | Trang `/admin/media` (`views/admin/pages/upload.ejs`) | Modal `#cloudinaryMediaModal` nhúng tại `views/admin/layouts/admin-layout.ejs` |
| **DOM ID container** | `#mediaPageBrowser` | `#modalMediaBrowser` |
| **Thuộc tính** | `data-is-picker="false"` | `data-is-picker="true"` |
| **Biến khởi tạo** | `window._pageMediaBrowser` | `window._modalMediaBrowser` |
| **Nút hành động Inspector** | Chỉ có: Copy URL, View Full Image, Delete Image | Bổ sung nút nổi bật: **"Choose / Insert Image"** |
| **Thanh Bulk Actions** | Chỉ có: Delete Selected, Clear | Bổ sung nút: **"Insert All Selected"** |
| **Hành vi Double Click** | Không thực hiện chèn | Tự động gọi `insertSingleAsset(asset)` và đóng modal |

---

## 2. Quản Lý Trạng Thái & Cấu Trúc Dữ Liệu (Component State)

Mỗi thể hiện (instance) của lớp `MediaBrowser` duy trì một trạng thái nội bộ độc lập:

```javascript
class MediaBrowser {
    constructor(rootEl) {
        this.rootEl = typeof rootEl === 'string' ? document.getElementById(rootEl) : rootEl;
        this.isPicker = this.rootEl.dataset.isPicker === 'true';
        this.rootFolder = 'Blog';         // Thư mục gốc trên Cloudinary (DEFAULT_ROOT_FOLDER)
        this.currentFolder = 'Blog';      // Thư mục người dùng đang duyệt

        // Cấu trúc cây thư mục phân cấp (Folder Tree)
        this.folderTree = {
            path: this.rootFolder,
            name: this.rootFolder,
            isLoaded: false,             // Đã fetch subfolders từ API chưa
            isExpanded: true,            // Đang mở rộng hay thu gọn
            children: []                 // Danh sách node con
        };

        this.assets = [];                // Mảng tài nguyên media hiện tại
        this.selectedAssets = new Map(); // Map lưu các asset được chọn theo public_id (hỗ trợ Bulk Mode)
        this.activeAsset = null;         // Asset đang được hiển thị trên bảng thông tin chi tiết (Inspector)
        this.isBulkMode = false;         // Cờ bật/tắt chế độ chọn nhiều ảnh (Multi-Select Mode)
        this.format = 'all';             // Bộ lọc định dạng ('all', 'png', 'jpg', 'webp', 'gif', 'svg')
        this.sort = 'created_at_desc';   // Tiêu chí sắp xếp
        this.searchQuery = '';           // Từ khóa tìm kiếm hiện tại
        this.nextCursor = null;          // Chuỗi con trỏ để tải trang tiếp theo (Cursor Pagination)
        this.isLoading = false;          // Trạng thái đang tải dữ liệu từ API
    }
}
```

---

## 3. Chi Tiết Các Phân Vùng Chức Năng

Giao diện của Media Library chia thành 3 phân vùng chính:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [1] TOP TOOLBAR & BREADCRUMBS                                                                │
│ [Breadcrumbs: Blog > subfolder]  [Total Items] [Select Mode] [Refresh] [Upload] [New Folder] │
│ [Filters: Format | Sort | Live Search Input]                                                 │
│ [Progress Bar: Compressing... / Uploading... (0% -> 100%)]                                  │
│ [Bulk Action Bar: Selected N items | Delete Selected | Insert All Selected | Clear]        │
├──────────────────────────┬─────────────────────────────────────┬─────────────────────────────┤
│ [2A] FOLDER TREE SIDEBAR │ [2B] MEDIA ASSETS GRID & DROPZONE   │ [2C] ASSET INSPECTOR PANEL  │
│                          │                                     │                             │
│ 📁 Blog (Root)           │ ┌───────┐ ┌───────┐ ┌───────┐       │ [Image Large Preview]       │
│  ├─ 📂 Tutorials         │ │ Img 1 │ │ Img 2 │ │ Img 3 │       │                             │
│  │   └─ 📄 Nodejs        │ └───────┘ └───────┘ └───────┘       │ File Name: hero_banner.png  │
│  └─ 📁 Assets            │                                     │ Format: PNG | Size: 245 KB  │
│                          │ [--- DROPZONE OVERLAY ON DRAG ---]  │ Dimension: 1600x900 px      │
│                          │                                     │ Uploaded: 03/11/2026        │
│                          │ Showing 40 of 120 items             │ [Input File URL] [Copy Btn] │
│ [+ New Folder]           │ [  ⬇ Load More Assets  ]            │ [Insert] [View] [Delete]    │
└──────────────────────────┴─────────────────────────────────────┴─────────────────────────────┘
```

### 3.1. Điều Hướng Cây Thư Mục Phân Cấp (Folder Tree & Breadcrumbs)

- **Cây thư mục đệ quy**: Được vẽ động qua phương thức `renderFolders()`. Mỗi node hiển thị:
  - Nút chevron (mũi tên) để mở rộng (`isExpanded = true`) hoặc thu gọn.
  - Icon thư mục đổi trạng thái linh hoạt: thư mục đóng `ti-folder-filled text-warning`, thư mục đang mở hoặc đang active `ti-folder-open text-primary`.
  - Tên thư mục kèm nhãn `(Root)` nếu là thư mục gốc.
- **Lazy Loading cây thư mục**: Khi click nút mở rộng một thư mục lần đầu (`node.isLoaded === false`), phương thức `fetchSubFolders(folderPath)` sẽ gọi API `GET /admin/api/media/folders?parent=...` để nạp danh sách thư mục con và gắn vào `node.children`.
- **Breadcrumbs Navigation**: Hiển thị đường dẫn dạng hạt mẩu bánh mì (`renderBreadcrumbs()`). Ví dụ: `Blog / Tutorials / Nodejs`. Người dùng có thể click vào bất kỳ cấp cha nào để nhảy trực tiếp về thư mục đó.
- **Tạo thư mục mới**: Nút `New Folder` mở hộp thoại `window.prompt`, tự động làm sạch tên folder (thay thế ký tự đặc biệt bằng dấu gạch dưới `_`) và gửi API `POST /admin/api/media/folders`. Sau khi tạo thành công, node cha tự động mở rộng và reload danh sách con.
- **Xóa thư mục**: Nút `Delete Folder` chỉ hiển thị khi người dùng đang ở thư mục con (không cho phép xóa thư mục gốc `Blog`). Trước khi xóa có hộp thoại xác nhận. Thư mục trên Cloudinary bắt buộc phải **hoàn toàn trống** mới có thể xóa thành công.

### 3.2. Quá Trình Upload Đa Luồng & Kéo Thả (Multi-upload & Drag & Drop)

- **Tải lên nhiều ảnh**: Thẻ `<input type="file" multiple accept="image/*">` cho phép người dùng chọn cùng lúc nhiều file ảnh.
- **Drag & Drop trực quan**:
  - Container lưới ảnh (`js-dropzone-container`) bắt các sự kiện `dragenter`, `dragover`, `dragleave`, `drop`.
  - Khi người dùng kéo file từ máy tính vào vùng lưới ảnh, một lớp phủ `js-dropzone-overlay` hiển thị với hiệu ứng border dashed và thông báo: *"Drop images here to upload"*.
  - Bộ lọc client tự động lọc bỏ các file không thuộc MIME-type `image/*`.
- **Nén ảnh Client-side (Client-side Compression)**:
  - Trước khi gửi qua mạng, từng file ảnh được truyền qua hàm `compressImageClient(file, 1600, 1600, 0.85)` sử dụng HTML5 Canvas ngầm (trừ định dạng `.gif` để bảo toàn chuyển động).
  - Giúp giảm dung lượng từ 5-10MB xuống còn 200-500KB, tăng tốc độ upload lên 5-10 lần và giảm tải băng thông cho server.
- **Thanh Tiến Độ Upload Thời Gian Thực (Progress Tracking)**:
  - Khởi tạo `XMLHttpRequest` riêng biệt, lắng nghe sự kiện `xhr.upload.onprogress`.
  - Hiển thị phần trăm chính xác (0% -> 100%) và thanh bar hoạt họa (`progress-bar-striped progress-bar-animated bg-primary`).
  - Cập nhật văn bản trạng thái: `Compressing N file(s)...` -> `Uploading N image(s) to Cloudinary (X%)...`.
  - Kết thúc upload, tự động refresh lưới ảnh của thư mục hiện tại và phát thông báo qua `AdminNotifier.success()`.

### 3.3. Lưới Hiển Thị Ảnh (Asset Grid Rendering)

- **Layout Responsive**: Sử dụng hệ thống lưới Bootstrap 5:
  - Mobile: 2 cột (`row-cols-2`).
  - Tablet: 3 cột (`row-cols-sm-3`, `row-cols-md-3`).
  - Desktop / Màn hình lớn: 4 cột (`row-cols-lg-4`).
- **Thẻ ảnh (Card Item)**:
  - Khung ảnh tỷ lệ vuông cố định (`aspect-ratio: 1 / 1`) với `object-fit: cover` và `loading="lazy"`.
  - Huy hiệu (Badge) định dạng nổi ở góc trên bên phải: `PNG`, `JPG`, `WEBP`, `GIF`, `SVG`.
  - Hộp kiểm (Checkbox) ở góc trên bên trái: Tự động hiển thị khi bật chế độ Chọn nhiều (`isBulkMode = true`).
  - Thanh tiêu đề dưới chân card: Hiển thị tên file được cắt ngắn gọn (`text-truncate`), kích thước pixel (`width x height`) và dung lượng tệp (`formatBytes`).
- **Tương tác**:
  - **Single Click**: Đánh dấu viền xanh (`border-primary`), chuyển toàn bộ thông số kỹ thuật của ảnh sang thanh Inspector bên phải.
  - **Double Click**: Thực hiện hành động chèn ảnh nhanh vào Editor hoặc Thumbnail (nếu đang ở chế độ Modal Picker).

### 3.4. Bảng Tra Cứu Thông Số Kỹ Thuật (Asset Inspector Panel)

Khi một ảnh được chọn, bảng Inspector ở cột bên phải hiển thị chi tiết:
1. **Preview ảnh lớn**: Khung preview responsive tỷ lệ thật, `object-fit: contain`.
2. **Metadata đầy đủ**:
   - Tên tệp tin gốc (`filename` / `public_id`).
   - Định dạng ảnh (`format`).
   - Dung lượng chính xác (`bytes` qua định dạng KB/MB).
   - Kích thước điểm ảnh (`dimensions`: ví dụ `1920 x 1080 px`).
   - Ngày tải lên (`created_at` định dạng `vi-VN`).
3. **Sao chép URL 1-Click (Copy Image URL)**:
   - Ô input hiển thị đầy đủ đường dẫn `secure_url` (https://res.cloudinary.com/...).
   - Nút icon copy: Sử dụng `navigator.clipboard.writeText(url)`.
   - Phản hồi Toast: *"Copied image URL to clipboard!"*.
4. **Các nút hành động**:
   - `Choose / Insert Image` (chỉ có trong chế độ Picker).
   - `View Full Image`: Mở tab mới với URL gốc.
   - `Delete Image`: Xác nhận xóa vĩnh viễn ảnh khỏi Cloudinary.

### 3.5. Tìm Kiếm, Lọc & Sắp Xếp (Search, Filter & Sort)

- **Live Search Debounce**: Ô tìm kiếm tệp tin theo tên (`filename` hoặc `public_id`). Bắt sự kiện `input` với cơ chế hoãn nhịp (debounce) **300ms** để tránh gửi dồn dập request lên server. Có nút `x` để xóa nhanh từ khóa.
- **Lọc theo định dạng (Format Filter)**: Dropdown hỗ trợ các tùy chọn: `All Formats`, `PNG`, `JPG / JPEG`, `WebP`, `GIF`, `SVG`.
- **Sắp xếp linh hoạt (Sort Filter)**:
  - Mới nhất trước (`created_at_desc` - mặc định).
  - Cũ nhất trước (`created_at_asc`).
  - Tên A-Z (`name_asc`).
  - Tên Z-A (`name_desc`).
  - Dung lượng lớn nhất (`bytes_desc`).
  - Dung lượng nhỏ nhất (`bytes_asc`).

### 3.6. Phân Trang Dạng Con Trỏ (Cursor-based Pagination)

- Thay vì dùng `page` số nguyên truyền thống (dễ bị lệch khi tài nguyên media được thêm/xóa liên tục), hệ thống sử dụng **Cursor Pagination** của Cloudinary.
- Mỗi lượt query tải về tối đa 40 ảnh (`max_results=40`).
- Nếu Cloudinary trả về thuộc tính `next_cursor`, nút **"Load More Assets"** sẽ xuất hiện ở chân trang.
- Khi người dùng click "Load More Assets", gọi phương thức `loadAssets({ append: true })`: Giữ nguyên danh sách ảnh cũ và nối thêm 40 ảnh mới vào cuối lưới, đồng thời cập nhật dòng thông tin: `Showing X out of Y items`.

### 3.7. Chế Độ Chọn Hàng Loạt (Bulk Selection Mode)

- Nút **"Select Mode"** trên thanh toolbar cho phép chuyển đổi chế độ.
- Khi bật: Các checkbox hiển thị trên toàn bộ các card ảnh.
- Quản lý trạng thái: Sử dụng `Map<public_id, asset>` để đảm bảo không bị trùng lặp và tra cứu $O(1)$.
- Thanh thông báo chọn (`js-bulk-actions-bar`) tự động trượt ra khi có ít nhất 1 ảnh được chọn:
  - Hiển thị số lượng ảnh đã chọn: `Selected N image(s)`.
  - Nút **"Delete Selected"**: Xác nhận và gửi request xóa hàng loạt public_ids qua `DELETE /admin/api/media/assets`.
  - Nút **"Insert All Selected"**: Chèn toàn bộ ảnh đã chọn vào bài viết (chế độ Picker).
  - Nút **"Clear"**: Hủy chọn toàn bộ.

---

## 4. Bảng Tổng Hợp Mã Lệnh & DOM Selectors Quan Trọng

Bảng sau liệt kê các class CSS điều khiển tương tác giữa JavaScript và HTML trong `media-browser-core.ejs`:

| DOM Selector / Class | Thuộc tính / Sự kiện | Mục đích sử dụng |
| :--- | :--- | :--- |
| `.js-media-breadcrumbs` | `innerHTML` | Vùng hiển thị breadcrumbs cây thư mục |
| `.js-folder-tree-container` | `innerHTML`, `click` | Container chứa danh sách cây thư mục bên sidebar |
| `.js-media-grid` | `innerHTML`, `click`, `dblclick` | Lưới hiển thị các thẻ card ảnh |
| `.js-media-file-input` | `change` | Thẻ file input ẩn nhận nhiều file ảnh |
| `.js-media-upload-trigger` | `click` | Kích hoạt sự kiện mở hộp thoại chọn file của input ẩn |
| `.js-dropzone-container` | `dragover`, `drop` | Vùng nhận diện sự kiện kéo thả file |
| `.js-dropzone-overlay` | `.d-none` toggle | Lớp phủ đồ họa hiển thị khi đang kéo file |
| `.js-upload-progress-container` | `.d-none` toggle | Vùng hiển thị tiến độ upload |
| `.js-upload-progress-bar` | `style.width` | Thanh bar tiến độ phần trăm (0% -> 100%) |
| `.js-toggle-bulk-mode` | `click` | Bật / tắt chế độ chọn nhiều ảnh |
| `.js-bulk-actions-bar` | `.d-none` toggle | Thanh công cụ thao tác hàng loạt (Delete/Insert) |
| `.js-inspector-preview` | `src`, `alt` | Thẻ img preview ảnh lớn trong inspector |
| `.js-inspector-copy-btn` | `click` | Nút kích hoạt lệnh copy URL vào clipboard |
| `.js-inspector-insert-btn` | `click` | Nút kích hoạt callback chèn ảnh vào bài viết |
| `.js-media-load-more` | `click` | Nút tải thêm 40 ảnh tiếp theo bằng `next_cursor` |

