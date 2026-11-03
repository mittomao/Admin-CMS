# Integration Flow – Luồng Tích Hợp & Sequence Diagrams

Tài liệu này là phần đặc tả quan trọng nhất về mặt cơ chế phối hợp (Orchestration & Contracts) giữa **Rich Text Editor (TinyMCE 6.3)** và **Media Library (MediaBrowser SPA)**.

---

## 1. Cơ Chế Kết Nối Callback Giữa Hai Module (The Callback Contract)

Hai module hoạt động theo kiến trúc Loose-Coupling (liên kết lỏng). Media Library không cần biết ai đang yêu cầu ảnh (nút trên thanh toolbar, dialog của TinyMCE hay nút chọn ảnh đại diện Thumbnail của form bài viết).

Sự kết nối này được điều phối thông qua các biến phạm vi module trong `public/js/admin/media-browser.js`:

```javascript
// Biến lưu trữ hàm callback đang hoạt động
let activePickerCallback = null;

// Biến lưu trữ input và khung preview mục tiêu (khi chọn ảnh đại diện)
let activeTargetInput = null;
let activeTargetPreview = null;

/**
 * Đăng ký hàm callback nhận dữ liệu khi người dùng chọn ảnh
 * @param {Function} callback (url, alt, asset) => void
 */
export function setMediaPickerCallback(callback) {
    activePickerCallback = callback;
}

/**
 * Mở hộp thoại Modal Media Library
 */
export const showMediaBrowserModal = () => {
    const modalEl = document.getElementById('cloudinaryMediaModal');
    if (!modalEl) return;
    
    // Sử dụng Tabler / Bootstrap 5 Modal instance
    const BootstrapModal = window.bootstrap?.Modal || window.tabler?.Modal;
    if (BootstrapModal) {
        const instance = BootstrapModal.getOrCreateInstance(modalEl);
        instance.show();
    }
    
    // Tự động làm mới và nạp danh sách ảnh mới nhất
    if (window._modalMediaBrowser) {
        window._modalMediaBrowser.refresh();
    }
};

/**
 * Đóng hộp thoại Modal Media Library
 */
export const hideMediaBrowserModal = () => {
    const modalEl = document.getElementById('cloudinaryMediaModal');
    if (!modalEl) return;
    const BootstrapModal = window.bootstrap?.Modal || window.tabler?.Modal;
    if (BootstrapModal) {
        const instance = BootstrapModal.getInstance(modalEl);
        if (instance) instance.hide();
    }
};
```

---

## 2. Sequence Diagram 1: Chọn Ảnh Qua Custom Toolbar Button (`cloudinary_media`)

Đây là luồng tương tác phổ biến nhất khi tác giả đang viết bài và muốn chèn một hoặc nhiều ảnh từ thư viện vào nội dung:

```mermaid
sequenceDiagram
    autonumber
    actor User as Tác giả (User)
    participant TME as TinyMCE Editor
    participant MB as MediaBrowser Modal
    participant API as Express API (/admin/api/media)
    participant Cloud as Cloudinary CDN

    User->>TME: Click nút icon 'cloudinary_media' trên Toolbar
    Note over TME,MB: Thiết lập callback chèn thẻ <img>
    TME->>MB: setMediaPickerCallback((url, alt) => { editor.insertContent(...) })
    TME->>MB: showMediaBrowserModal()
    MB->>API: GET /admin/api/media/assets?folder=Blog
    API->>Cloud: cloudinary.search.expression(...)
    Cloud-->>API: Trả về danh sách resources
    API-->>MB: Response JSON (assets list)
    MB->>User: Hiển thị giao diện duyệt ảnh (Grid, Folders)

    User->>MB: Click chọn ảnh (hoặc Double-click)
    User->>MB: Click "Choose / Insert Image"
    MB->>TME: Thực thi activePickerCallback(secure_url, filename, asset)
    Note over TME: Tạo đoạn mã HTML:<br/><p><img src="{secure_url}" alt="{alt}"<br/>style="max-width: 100%; height: auto;" loading="lazy" /></p>
    TME->>TME: editor.insertContent(imgHtml)
    MB->>MB: hideMediaBrowserModal()
    TME-->>User: Ảnh xuất hiện lập tức trong khung soạn thảo
```

---

## 3. Sequence Diagram 2: Chọn Ảnh Qua TinyMCE Image Dialog (`file_picker_callback`)

Luồng này xảy ra khi tác giả sử dụng dialog chèn ảnh chuẩn của TinyMCE để tùy biến thêm kích thước, viền, hoặc chú thích (caption):

```mermaid
sequenceDiagram
    autonumber
    actor User as Tác giả (User)
    participant TME_Dialog as TinyMCE Image Dialog
    participant TME_Core as TinyMCE Core
    participant MB as MediaBrowser Modal

    User->>TME_Dialog: Click icon 'Browse' bên cạnh ô Source URL
    TME_Core->>MB: file_picker_callback(callback, value, { filetype: 'image' })
    Note over TME_Core,MB: Gắn TinyMCE dialog callback vào MediaBrowser
    TME_Core->>MB: setMediaPickerCallback((url, alt) => callback(url, { alt }))
    TME_Core->>MB: showMediaBrowserModal()
    
    User->>MB: Duyệt thư mục và chọn ảnh
    User->>MB: Click "Choose / Insert Image"
    MB->>TME_Core: activePickerCallback(secure_url, alt)
    TME_Core->>TME_Dialog: callback(secure_url, { alt: '...' })
    MB->>MB: hideMediaBrowserModal()
    TME_Dialog-->>User: Tự động điền URL và Alt text vào ô input của dialog
    User->>TME_Dialog: Tùy chỉnh Dimensions (Width x Height) & Bấm Save
    TME_Dialog->>TME_Core: Render thẻ <img> vào nội dung bài viết
```

---

## 4. Sequence Diagram 3: Kéo Thả / Paste Trực Tiếp Vào Editor (`images_upload_handler`)

Khi tác giả chụp ảnh màn hình và nhấn `Ctrl + V` hoặc kéo thẳng tệp ảnh từ máy tính thả vào khung soạn thảo:

```mermaid
sequenceDiagram
    autonumber
    actor User as Tác giả (User)
    participant TME as TinyMCE Editor
    participant Comp as HTML5 Canvas (compressImageClient)
    participant API as Express API (/admin/api/media/upload)
    participant Cloud as Cloudinary Storage

    User->>TME: Nhấn Ctrl + V (Paste) hoặc Kéo thả ảnh vào Editor
    TME->>TME: Chuyển ảnh thành Blob (blobInfo)
    TME->>Comp: compressImageClient(blobInfo.blob(), 1600, 1600, 0.85)
    Note over Comp: Nén ảnh trên Canvas client<br/>(Giảm dung lượng 70-85%)
    Comp-->>TME: Trả về File Blob đã nén
    
    TME->>API: POST /admin/api/media/upload (FormData files)
    Note over TME,API: Lắng nghe xhr.upload.onprogress<br/>hiển thị thanh % tiến độ trên editor
    API->>Cloud: Multer CloudinaryStorage tải ảnh lên CDN
    Cloud-->>API: Trả về secure_url & public_id
    API-->>TME: Response JSON: { success: true, location: "https://res.cloudinary..." }
    
    TME->>TME: resolve(json.location)
    TME-->>User: Thay thế ảnh base64 tạm bằng URL Cloudinary chính thức
```

---

## 5. Sequence Diagram 4: Lưu Bài Viết & Tải Lại Khi Chỉnh Sửa (Post Persistence Flow)

Mô tả cách thức chuỗi HTML từ TinyMCE được lưu vào MongoDB và tải lại nguyên vẹn khi tác giả mở trang Edit Post:

```mermaid
sequenceDiagram
    autonumber
    actor User as Tác giả (User)
    participant View as Form add-post / edit-post
    participant Val as form-validator.js
    participant Server as Express Controller (addPost / updatePost)
    participant DB as MongoDB (Collection: blog)

    User->>View: Bấm nút "Xuất Bản Bài Viết" (Submit Form)
    View->>Val: initAdminFormValidation() kích hoạt
    Val->>Val: tinymce.get('editor-content').getContent({ format: 'text' })
    Note over Val: Kiểm tra text thuần >= 10 ký tự
    Val-->>View: Hợp lệ -> Cho phép gửi request POST / PUT
    
    View->>Server: POST /admin/posts (req.body: { title, slug, thumbnail, content })
    Note over Server: Tính toán readingTime(content)<br/>Tạo slug duy nhất (generateUniqueSlug)
    Server->>DB: blogModel.create({ content: req.body.content, ... })
    DB-->>Server: Lưu thành công Document
    Server-->>User: Redirect về /admin/posts kèm Toast Success

    Note over User,DB: --- KHI MỞ TRANG CHỈNH SỬA BÀI VIẾT ---
    User->>Server: GET /admin/posts/:id/edit
    Server->>DB: blogModel.findById(id)
    DB-->>Server: Trả về post document
    Server->>View: Render edit-post.ejs ({ blogs: post })
    Note over View: Đặt chuỗi HTML vào textarea:<br/><textarea id="editor-content"><%= blogs.content %></textarea>
    View->>View: tinymce.init({ selector: "#editor-content" })
    Note over View: TinyMCE đọc nội dung có sẵn trong textarea<br/>và khôi phục đầy đủ cây DOM soạn thảo
    View-->>User: Hiển thị bài viết sẵn sàng chỉnh sửa
```

---

## 6. Sequence Diagram 5: Chọn Ảnh Đại Diện Thumbnail Cho Bài Viết

Luồng mở Media Library độc lập từ bên ngoài TinyMCE (nút Thumbnail Picker):

```mermaid
sequenceDiagram
    autonumber
    actor User as Tác giả (User)
    participant Form as Thumbnail Widget Card
    participant MB as MediaBrowser Modal
    participant Input as #thumbnail-input
    participant Prev as .preview-image img

    User->>Form: Click nút "Thư Viện" (#thumbnail-btn)
    Form->>MB: Gán activeTargetInput = #thumbnail-input
    Form->>MB: Gán activeTargetPreview = .preview-image
    Form->>MB: showMediaBrowserModal()
    
    User->>MB: Click chọn ảnh và bấm "Choose / Insert Image"
    MB->>MB: insertSingleAsset(asset)
    Note over MB,Input: Do activePickerCallback == null,<br/>thực hiện nhánh cập nhật thumbnail:
    MB->>Input: activeTargetInput.value = asset.secure_url
    MB->>Prev: activeTargetPreview.src = asset.secure_url
    MB->>Prev: Gỡ bỏ class .disable để hiển thị khung preview
    MB->>MB: hideMediaBrowserModal()
    MB-->>User: Thông báo Toast: "Selected image from Cloudinary!"
```

---

## 7. Tóm Tắt Các Điểm Neo Kỹ Thuật (Integration Hooks)

Khi triển khai trên bất kỳ framework nào ở dự án mới, các móc nối sau cần được đảm bảo:

1. **Trước khi Submit Form**: Luôn gọi `tinymce.triggerSave()` (nếu dùng form submit chuẩn) hoặc đọc `tinymce.get('id').getContent()` (nếu gửi Ajax / Fetch JSON).
2. **Khi khởi tạo Picker Callback**: Luôn làm sạch biến callback (`activePickerCallback = null`) sau khi thực thi để tránh gọi nhầm ở lần mở modal tiếp theo.
3. **Thứ tự nạp Script**:
   - `block-script.ejs` (TinyMCE CDN) phải được tải trước.
   - Thẻ `<textarea id="editor-content">` phải có mặt trong DOM.
   - Module `public/js/admin.js` thực thi `initTinyMCE()` và `initMediaBrowser()`.

