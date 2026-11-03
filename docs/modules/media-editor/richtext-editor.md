# Rich Text Editor – Đặc Tả Toàn Bộ Chức Năng Soạn Thảo (TinyMCE 6.3)

Tài liệu này đặc tả chi tiết module **Rich Text Editor** trong hệ thống CMS, dựa trên mã nguồn thực tế tại `public/js/admin/tinymce.js`, `views/admin/partials/block-script.ejs`, `public/js/admin/form-validator.js`, và `public/js/admin/post-preview.js`.

---

## 1. Nền Tảng & Thư Viện Editor

Hệ thống sử dụng **TinyMCE phiên bản 6.3** (WYSIWYG HTML Editor). 

### 1.1. Cách Thức Tải Thư Viện (Script Loading)
Trong template `views/admin/partials/block-script.ejs`, thư viện được tải qua thẻ `<script>`:
```html
<!-- TinyMCE 6.3 Rich Text Editor with Flmngr Plugin CDN -->
<script src="https://flmngr.com/js-demo/tinymce-6.3/tinymce.min.js"></script>
```

> [!IMPORTANT]
> **Khám Phá Kỹ Thuật Quan Trọng Về Gói Demo Flmngr**:
> Đường dẫn trên là một gói bundle demo từ Flmngr chứa lõi TinyMCE 6.3 cùng plugin Flmngr nhúng sẵn. Tuy nhiên, trong mã khởi tạo `public/js/admin/tinymce.js`, hệ thống **không đăng ký plugin `flmngr`** trong danh sách `plugins`, mà thay vào đó đã xây dựng toàn bộ cơ chế quản lý ảnh và upload kết nối trực tiếp với **Cloudinary Media Browser**.
> 
> **Khuyến nghị cho dự án mới**: Dự án mới hoàn toàn có thể thay thế đường link CDN này bằng TinyMCE 6.x / 7.x chính thức của Tiny Technologies (tự lưu trữ self-hosted hoặc qua CDN jsDelivr / cdnjs) mà không làm suy giảm bất kỳ tính năng nào.

---

## 2. Cấu Hình Khởi Tạo Editor (Initialization Specification)

Toàn bộ logic khởi tạo nằm trong hàm `initTinyMCE()` tại `public/js/admin/tinymce.js`:

```javascript
import { showMediaBrowserModal, setMediaPickerCallback } from './media-browser.js';
import { compressImageClient } from './utils.js';

export function initTinyMCE() {
    // 1. Kiểm tra sự tồn tại của textarea mục tiêu
    if (!$('#editor-content').length) return;

    if (typeof tinymce !== 'undefined') {
        tinymce.init({
            selector: "#editor-content",
            
            // 2. Danh sách Plugins được kích hoạt
            plugins: "link,image,media,table,advlist,lists,preview,code",
            
            // 3. Thanh công cụ Toolbar
            toolbar: "undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | numlist bullist | link image cloudinary_media media | code preview",
            
            // 4. Thiết lập xử lý Ảnh
            image_title: true,
            automatic_uploads: true,
            images_upload_url: '/admin/api/media/upload',
            file_picker_types: 'image',

            // 5. Đăng ký Custom Button & UI Event Hooks
            setup: (editor) => {
                editor.ui.registry.addButton('cloudinary_media', {
                    icon: 'image',
                    tooltip: 'Browse Cloudinary Media Library',
                    onAction: () => {
                        setMediaPickerCallback((url, alt) => {
                            const altText = alt || 'Cloudinary Image';
                            editor.insertContent(`<p><img src="${url}" alt="${altText}" style="max-width: 100%; height: auto;" loading="lazy" /></p>`);
                        });
                        showMediaBrowserModal();
                    }
                });
            },

            // 6. Chặn File Picker mặc định của TinyMCE
            file_picker_callback: (callback, value, meta) => {
                if (meta.filetype === 'image') {
                    setMediaPickerCallback((url, alt) => {
                        callback(url, { alt: alt || 'Cloudinary Image' });
                    });
                    showMediaBrowserModal();
                }
            },

            // 7. Xử lý Upload Kéo Thả / Paste trực tiếp từ Clipboard
            images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.withCredentials = false;
                xhr.open('POST', '/admin/api/media/upload');
                
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        progress(Math.round((e.loaded / e.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 401) {
                        reject('Session expired. Please login again.');
                        return;
                    }
                    if (xhr.status < 200 || xhr.status >= 300) {
                        reject('HTTP Error: ' + xhr.status);
                        return;
                    }
                    try {
                        const json = JSON.parse(xhr.responseText);
                        if (!json || (!json.location && !json.url)) {
                            reject('Invalid response from upload server');
                            return;
                        }
                        resolve(json.location || json.url);
                    } catch (e) {
                        reject('Failed to parse upload response');
                    }
                };

                xhr.onerror = () => {
                    reject('Network error during image upload to Cloudinary');
                };

                // Nén ảnh trên Client Canvas trước khi gửi request XHR
                compressImageClient(blobInfo.blob(), 1600, 1600, 0.85).then((compressedBlob) => {
                    const formData = new FormData();
                    formData.append('files', compressedBlob, blobInfo.filename());
                    xhr.send(formData);
                }).catch(() => {
                    const formData = new FormData();
                    formData.append('files', blobInfo.blob(), blobInfo.filename());
                    xhr.send(formData);
                });
            })
        });
    }
}
```

---

## 3. Các Phân Hệ Tính Năng Chi Tiết Trong Editor

### 3.1. Formatting & Soạn Thảo Văn Bản
- **History**: Hoàn tác (`undo`), Làm lại (`redo`).
- **Typography & Heading**: Menu thả xuống `styleselect` cho phép chọn các cấp thẻ Heading (`<h1>` đến `<h6>`), đoạn văn thường (`<p>`), khối trích dẫn (`<blockquote>`).
- **Font Styling**: Chữ đậm (`bold` - `<strong>`), Chữ nghiêng (`italic` - `<em>`).
- **Căn lề (Text Alignment)**: Căn trái (`alignleft`), Căn giữa (`aligncenter`), Căn phải (`alignright`), Căn đều 2 bên (`alignjustify`).
- **Danh sách (Lists)**: Danh sách có thứ tự đánh số (`numlist` - `<ol>`), Danh sách gạch đầu dòng (`bullist` - `<ul>`).

### 3.2. Chèn Siêu Liên Kết, Bảng & Nội Dung Nhúng (Link, Table, Media)
- **Plugin Link (`link`)**: Mở hộp thoại chèn link, hỗ trợ URL, văn bản hiển thị (Text to display), tiêu đề tooltip (`title`), và thuộc tính mở tab mới (`target="_blank"` kèm `rel="noopener"`).
- **Plugin Table (`table`)**: Chèn lưới bảng linh hoạt với giao diện kéo chọn số dòng x số cột. Hỗ trợ gộp ô (merge cells), thêm/xóa dòng/cột, thiết lập Header (`<th>`), định dạng viền bảng.
- **Plugin Media Embed (`media`)**: Hỗ trợ nhúng video YouTube, Vimeo, iframe hoặc audio HTML5 trực tiếp thông qua đường dẫn URL hoặc mã nhúng iframe.
- **Xem trước & Mã nguồn**:
  - `code`: Mở cửa sổ popup xem và chỉnh sửa trực tiếp mã HTML thô.
  - `preview`: Mở khung xem trước giao diện bài viết hoàn chỉnh.

### 3.3. Cơ Chế Chèn & Quản Lý Hình Ảnh (Image Insertion Mechanisms)

Hệ thống hỗ trợ **3 đường dẫn chèn ảnh độc lập** nhưng thống nhất về đích đến:

```
                      [Các đường dẫn chèn ảnh vào TinyMCE]
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
   [ĐƯỜNG DẪN 1]                 [ĐƯỜNG DẪN 2]                 [ĐƯỜNG DẪN 3]
Custom Button                 Native Image Dialog           Drag & Drop / Paste
`cloudinary_media`             `file_picker_callback`        `images_upload_handler`
         │                             │                             │
         ▼                             ▼                             ▼
Mở #cloudinaryMediaModal      Mở #cloudinaryMediaModal      Lấy blob từ clipboard / kéo thả
Chọn ảnh từ Media Library     Chọn ảnh từ Media Library     Nén client qua HTML5 Canvas
Trả về Callback(url, alt)     Trả về callback TinyMCE       Upload ngầm lên Cloudinary API
         │                             │                             │
         ▼                             ▼                             ▼
Chèn thẻ <img> tự sinh        Điền URL & alt vào Dialog     Tự động resolve(location)
có `loading="lazy"`           rồi bấm Save                  và chèn vào vị trí con trỏ
```

1. **Đường dẫn 1: Nút Custom `cloudinary_media` trên Toolbar**:
   - Khi click nút này, hàm callback được gán:
     ```javascript
     setMediaPickerCallback((url, alt) => {
         const altText = alt || 'Cloudinary Image';
         editor.insertContent(`<p><img src="${url}" alt="${altText}" style="max-width: 100%; height: auto;" loading="lazy" /></p>`);
     });
     showMediaBrowserModal();
     ```
   - Ảnh được chèn thẳng vào vị trí con trỏ trong văn bản dưới dạng responsive HTML: `style="max-width: 100%; height: auto;"` và kích hoạt tải trễ `loading="lazy"`.
2. **Đường dẫn 2: Hộp thoại TinyMCE Image Dialog qua `file_picker_callback`**:
   - Khi người dùng click nút `image` mặc định của TinyMCE và click icon duyệt tệp bên cạnh ô Source URL:
   - `file_picker_callback` chặn sự kiện mặc định và mở `#cloudinaryMediaModal`.
   - Khi người dùng chọn một ảnh trong modal, URL và Alt Text được trả ngược về cho dialog của TinyMCE: `callback(url, { alt: alt || 'Cloudinary Image' })`.
   - Người dùng có thể chỉnh sửa tiếp kích thước (dimensions), tỷ lệ khung hình hoặc khoảng cách viền trong dialog trước khi xác nhận chèn.
3. **Đường dẫn 3: Dán (Paste) hoặc Kéo thả ảnh trực tiếp vào thân bài viết (`images_upload_handler`)**:
   - Khi người dùng copy một file ảnh từ máy tính hoặc chụp màn hình và nhấn `Ctrl + V` vào khung editor:
   - TinyMCE chuyển ảnh thành một `blobInfo`.
   - Hàm `images_upload_handler` nén blob này qua `compressImageClient()` và gửi request POST dạng `multipart/form-data` tới endpoint `/admin/api/media/upload`.
   - Khi Cloudinary trả về JSON có thuộc tính `location`, ảnh ngay lập tức xuất hiện tại vị trí con trỏ mà không cần mở bất kỳ modal nào.

---

## 4. Quá Trình Lưu Trữ & Nạp Dữ Liệu Bài Viết (Lifecycle & Persistence)

### 4.1. Cách Lưu Nội Dung HTML Vào Database
1. Editor được gắn vào một thẻ form `<form method="post" action="/admin/posts">`:
   ```html
   <textarea class="form-control" id="editor-content" name="content" rows="16"></textarea>
   ```
2. Khi form được submit, TinyMCE tự động đồng bộ (sync) nội dung trong iframe soạn thảo về lại thẻ `<textarea id="editor-content">`.
3. Express nhận chuỗi HTML tại `req.body.content`.
4. Controller (`controllers/indexController.js` -> `addPost` / `updatePost`) gọi hàm xác thực:
   - Kiểm tra chuỗi sau khi loại bỏ tags HTML phải có độ dài tối thiểu 10 ký tự (`calculateReadingTime(validation.data.content)`).
   - Lưu trữ nguyên vẹn chuỗi HTML (bao gồm các thẻ `<p>`, `<img>`, `<table>`, `<iframe>`) vào trường `content: String` của collection `blog` trong MongoDB.

### 4.2. Cách Nạp Dữ Liệu Khi Edit Bài Viết (Edit Post Lifecycle)
Trong view `views/admin/pages/edit-post.ejs`:
```html
<textarea class="form-control" id="editor-content" name="content" rows="16"><%= blogs.content %></textarea>
```
Khi trang được render, nội dung HTML cũ đã nằm sẵn bên trong thẻ `<textarea>`. Khi hàm `initTinyMCE()` thực thi `tinymce.init({ selector: "#editor-content" })`, TinyMCE sẽ tự động đọc nội dung bên trong `<textarea>` để khởi dựng cây DOM của iframe soạn thảo, bảo toàn 100% hình ảnh, định dạng và cấu trúc bảng của bài viết cũ.

---

## 5. Các Cơ Chế Kiểm Soát & Bảo Vệ Đi Kèm (Form Validation & Safety)

### 5.1. Xác Thực Dữ Liệu Phía Client (`public/js/admin/form-validator.js`)
Form Validator kiểm tra độ dài thực tế của bài viết (bỏ qua các thẻ HTML rỗng như `<p><br></p>`):
```javascript
const editorTextarea = form.querySelector('textarea#editor-content');
if (editorTextarea) {
    let contentText = '';
    if (window.tinymce && window.tinymce.get('editor-content')) {
        const editor = window.tinymce.get('editor-content');
        contentText = editor.getContent({ format: 'text' }).trim();
    } else {
        contentText = (editorTextarea.value || '').trim();
    }

    if (!contentText || contentText.length < 10) {
        errors.push({
            input: editorTextarea,
            message: 'Nội dung bài viết không được để trống và phải có ít nhất 10 ký tự.'
        });
    }
}
```

### 5.2. Chống Mất Dữ Liệu Khi Điều Hướng (Unsaved Changes Guard)
Trong `form-validator.js`, hệ thống lắng nghe sự kiện thay đổi của TinyMCE để đánh dấu cờ `isDirty = true`:
```javascript
if (window.tinymce) {
    const checkTinyMCE = setInterval(() => {
        const editor = window.tinymce.get('editor-content');
        if (editor) {
            editor.on('input change keyup NodeChange', () => { isDirty = true; });
            clearInterval(checkTinyMCE);
        }
    }, 500);
}
```
Nếu người dùng vô tình nhấn phím F5, đóng tab hoặc click link sang trang khác khi chưa lưu, một modal cảnh báo hoặc thông báo `beforeunload` của trình duyệt sẽ chặn lại để bảo vệ nội dung đang viết dở.

### 5.3. Đồng Bộ Khung Xem Trước Thời Gian Thực (Live Preview Synchronization)
Trong `public/js/admin/post-preview.js`, khi người dùng chuyển sang tab "Live Preview" hoặc thao tác trên màn hình chia đôi:
```javascript
const editor = window.tinymce.get('editor-content');
if (editor) {
    editor.on('input change keyup NodeChange', () => {
        triggerLivePreviewUpdate();
    });
}
```
Nội dung HTML từ `editor.getContent()` sẽ được bơm trực tiếp vào khung preview responsive (chế độ Desktop, Tablet 768px, Mobile 375px) giúp tác giả quan sát trực quan bố cục hiển thị của ảnh và văn bản trên thiết bị thực tế trước khi xuất bản.

---

## 6. Xử Lý Lỗi & Ngoại Lệ Khi Upload Ảnh Trong Editor

Hàm `images_upload_handler` được bọc trong một `Promise` với các nhánh bắt lỗi chi tiết:

| Trường hợp lỗi | Mã phản hồi HTTP | Hành vi xử lý & Thông báo người dùng |
| :--- | :--- | :--- |
| **Hết hạn phiên đăng nhập** | `HTTP 401 Unauthorized` | Gọi `reject('Session expired. Please login again.')`. TinyMCE hiển thị thanh thông báo lỗi đỏ trên đầu editor. |
| **Lỗi máy chủ / Cloudinary** | `HTTP 500 / 502 / 503` | Gọi `reject('HTTP Error: ' + xhr.status)`. Ảnh tạm thời bị xóa khỏi nội dung soạn thảo. |
| **Phản hồi không hợp lệ** | `JSON parse error` hoặc thiếu `location` | Gọi `reject('Invalid response from upload server')`. |
| **Mất kết nối mạng** | `xhr.onerror` | Gọi `reject('Network error during image upload to Cloudinary')`. |

