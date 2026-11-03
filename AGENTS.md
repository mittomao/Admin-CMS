# TÀI LIỆU KIẾN TRÚC & KẾ HOẠCH DỰ ÁN (AGENTS.md)
**Hệ thống Quản trị Nội dung Phân cấp theo Phong cách Sitecore (Sitecore-like XM CMS)**

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mục tiêu
Xây dựng một hệ thống CMS (Content Management System) quản trị nội dung dạng cây phân cấp (Hierarchical Content Tree) chuyên nghiệp, kế thừa các triết lý cốt lõi của **Sitecore Experience Management (XM)**:
- **Triết lý "Mọi thứ là Item" (Everything is an Item):** Không chỉ bài viết/trang web, mà cả Template (schema định nghĩa cấu trúc), Media Library (tài sản số), Workflow (quy trình duyệt), Layout/Presentation, và System Configuration đều được lưu trữ và quản lý dưới dạng các node (Item) trong cây nội dung.
- **Tách biệt Môi trường Biên tập và Phân phối (Master vs. Web):**
  - **Master Database/Collection:** Lưu trữ toàn bộ các phiên bản dự thảo (Drafts), lịch sử phiên bản (Version History), các trạng thái workflow chưa duyệt.
  - **Web Database/Collection:** Chỉ chứa phiên bản đã được xuất bản (Published & Active), cấu trúc tối ưu và denormalized sẵn sàng phục vụ cho Delivery API với hiệu năng cao và độ trễ thấp nhất.
- **Giao diện quản trị phong cách Sitecore:**
  - **Launchpad (Dashboard):** Màn hình ứng dụng dạng ô lưới (Tiles) phân nhóm chuyên môn (Marketing, Content Editing, Control Panel, Access Management...), phân quyền hiển thị theo Role người dùng.
  - **Content Editor:** Giao diện 3 phân vùng tiêu chuẩn: Ribbon tabs điều hướng trên cùng (Home, Navigate, Review, Publish, Versions, Configure...), Cây nội dung (Content Tree) lazy-loading bên trái kèm ô tìm kiếm nhanh, Vùng soạn thảo form theo Section/Field ở giữa, và Taskbar chuyển nhanh ứng dụng dưới đáy màn hình.

### 1.2 Phạm vi dự án (In-Scope)
- Quản trị phân cấp cây nội dung với khả năng mở rộng không giới hạn độ sâu.
- Cơ chế Template linh hoạt: Section, Field Types (Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist), Base Template (kế thừa), Standard Values (giá trị mặc định), Insert Options (ràng buộc loại item con được tạo).
- Hệ thống Đa ngôn ngữ (Multilingual) và Đa phiên bản (Item Versioning) kèm tính năng so sánh (diff) và khôi phục (rollback).
- Thư viện tài nguyên số (Media Library) hỗ trợ quản lý thư mục, upload ảnh/file, resize tự động và bộ chọn Media Picker modal tích hợp vào form editor.
- Hệ thống phân quyền chi tiết (ACL - Access Control List) theo từng Item với cơ chế kế thừa quyền từ nút cha và quyền ghi đè (Allow, Deny, Inherit).
- Workflow Engine phân quyền theo vai trò (Draft -> In Review -> Approved -> Rejected) kèm Workbox cho biên tập viên và Publishing Engine (Master sang Web).
- Thùng rác (Recycle Bin) cho phép soft-delete và khôi phục kèm Audit Log ghi nhận mọi biến động dữ liệu.
- Headless Delivery API chuẩn JSON RESTful cung cấp nội dung đã publish cho các frontend ứng dụng ngoài (React, Next.js, Mobile App).
- Tiện ích mở rộng: Form Builder, Serialization (Export/Import cấu trúc và dữ liệu dạng JSON), Full-text search, Control Panel.

### 1.3 Ngoài phạm vi dự án (Out-of-Scope)
- Các tính năng xDB, CDP (Customer Data Platform), Real-time Personalization máy học phức tạp của Sitecore XP (tập trung 100% vào chức năng Core XM).
- WYSIWYG Experience Editor (soạn thảo trực tiếp trên trang live frontend dạng in-line) trong giai đoạn đầu; tập trung hoàn thiện Content Editor form-based chuẩn chỉ và ổn định.
- Triển khai multi-tenant / multi-site phức tạp trên nhiều domain khác nhau (tập trung vào cấu trúc Single-tenant / Multi-tree root trước).

---

## 2. CÔNG NGHỆ VÀ THƯ VIỆN

| Công nghệ / Thư viện | Vai trò | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Node.js (v20+ LTS) + Express.js** | Backend Web Framework | Nền tảng hướng sự kiện, non-blocking I/O tối ưu cho các thao tác đọc/ghi cây dữ liệu; pipeline middleware linh hoạt, dễ tích hợp bảo mật và session. |
| **EJS (Embedded JavaScript)** | Server-Side Rendering (SSR) | Cú pháp JavaScript tự nhiên, hỗ trợ layout/partials mạnh mẽ; render nhanh chóng phía server, tránh overhead bundle của SPA nặng nề khi tương tác quản trị backend. |
| **Client Script (Vanilla JS + Alpine.js)** | UI Interactivity | Giữ mã client nhẹ, tối giản dependencies; Alpine.js cung cấp reactive state cục bộ mượt mà cho các modal, dropdown, tabs mà không cần build step phức tạp. |
| **Fancytree (hoặc jsTree)** | Cây nội dung (Content Tree) | Hỗ trợ Lazy Loading node qua AJAX, Virtual Scrolling xử lý hàng chục ngàn item mượt mà, hỗ trợ Context Menu, Drag & Drop, và Keyboard Navigation chuyên nghiệp. |
| **SortableJS** | Kéo thả sắp xếp | Kéo thả nhẹ, ổn định để sắp xếp thứ tự Fields, Sections, Form Controls và Items con. |
| **TinyMCE (hoặc Quill)** | Rich Text WYSIWYG Editor | Chuẩn công nghiệp cho CMS doanh nghiệp; hỗ trợ plugin Media Picker tùy biến, kiểm soát chặt chẽ mã HTML đầu ra. |
| **MongoDB + Mongoose** | Cơ sở dữ liệu NoSQL | Cấu trúc Item linh hoạt (schema-less ở cấp độ fields động do template quy định), hỗ trợ truy vấn phân cấp mạnh mẽ qua Ancestors Array / Materialized Path và Transaction ACID khi cần. |
| **express-session + connect-mongo** | Quản lý Session | Lưu trữ session tập trung trong MongoDB, an toàn, hỗ trợ mở rộng nhiều node server và không bị mất đăng nhập khi khởi động lại ứng dụng. |
| **Multer + Sharp** | File Upload & Xử lý ảnh | Multer kiểm soát upload file streaming, giới hạn kích thước và định dạng an toàn; Sharp tạo thumbnail tự động tối ưu hóa tốc độ xem trước ảnh trong Media Library. |
| **Helmet + CSURF / Double-Submit Cookie** | Bảo mật Web | Thiết lập các HTTP response headers bảo vệ (X-Frame-Options, CSP, HSTS); cơ chế chống giả mạo yêu cầu chéo trang (CSRF) cho cả Form POST và Fetch/AJAX. |
| **DOMPurify / sanitize-html** | Làm sạch dữ liệu Rich Text | Ngăn chặn triệt để tấn công Stored XSS khi biên tập viên dán mã HTML/JS từ bên ngoài vào. |
| **bcryptjs** | Băm mật khẩu | Tiêu chuẩn mã hóa một chiều an toàn chống rainbow table và brute-force với salt rounds cấu hình được. |

---

## 3. QUY ƯỚC CHUNG

### 3.1 Cấu trúc thư mục dự án
```
Admin CMS/
├── src/
│   ├── app.js                          # Cấu hình Express app, middleware pipeline
│   ├── server.js                       # Entry point kết nối DB và lắng nghe cổng HTTP
│   ├── config/                         # Cấu hình hệ thống
│   │   ├── database.js                 # Kết nối Mongoose (Master & Web connection)
│   │   ├── session.js                  # Cấu hình express-session & MongoStore
│   │   ├── security.js                 # Cấu hình Helmet, CSRF, CORS
│   │   └── constants.js                # Hằng số hệ thống (Item IDs gốc, System Roles, Field Types)
│   ├── models/                         # Mongoose Models & Schemas
│   │   ├── Item.js                     # Item model (Master collection)
│   │   ├── PublishedItem.js            # Published Item model (Web collection)
│   │   ├── Template.js                 # Schema định nghĩa cấu trúc Item
│   │   ├── User.js                     # Người dùng CMS
│   │   ├── Role.js                     # Vai trò người dùng
│   │   ├── AccessControl.js            # Bảng quy tắc phân quyền theo Item
│   │   ├── Media.js                    # Tệp tin & Siêu dữ liệu Media
│   │   ├── Workflow.js                 # Định nghĩa quy trình làm việc & bước duyệt
│   │   ├── AuditLog.js                 # Nhật ký kiểm toán hành vi người dùng
│   │   ├── PublishHistory.js           # Lịch sử và nhật ký tác vụ publish
│   │   └── LaunchpadApp.js             # Danh mục ứng dụng trên Launchpad
│   ├── routes/                         # Bộ định tuyến Express
│   │   ├── admin/                      # Routes cho giao diện quản trị Admin (EJS/AJAX)
│   │   │   ├── authRoutes.js           # Đăng nhập, đăng xuất, đổi mật khẩu
│   │   │   ├── launchpadRoutes.js      # Dashboard Launchpad
│   │   │   ├── contentEditorRoutes.js  # Content Editor, Cây nội dung, Form Item
│   │   │   ├── templateManagerRoutes.js# Quản lý Templates, Sections, Fields
│   │   │   ├── mediaRoutes.js          # Media Library & Media Picker
│   │   │   ├── securityRoutes.js       # User Manager, Role Manager, Access Viewer
│   │   │   ├── workflowRoutes.js       # Workflow, Workbox
│   │   │   ├── publishRoutes.js        # Publish Dialog, Trạng thái publish
│   │   │   ├── recycleBinRoutes.js     # Thùng rác, khôi phục item
│   │   │   ├── auditRoutes.js          # Audit Log Viewer
│   │   │   ├── formBuilderRoutes.js    # Forms Editor
│   │   │   └── controlPanelRoutes.js   # Cài đặt hệ thống, rebuild index
│   │   └── api/                        # RESTful Headless Delivery APIs
│   │       └── v1/
│   │           ├── deliveryRoutes.js   # Lấy nội dung công khai theo Path / ID
│   │           └── mediaApiRoutes.js   # Lấy tệp media
│   ├── controllers/                    # Tầng điều khiển (request-response)
│   │   ├── admin/                      # Admin controllers (gọi service, render EJS / trả JSON AJAX)
│   │   └── api/                        # API controllers (trả REST JSON chuẩn)
│   ├── services/                       # Tầng nghiệp vụ cốt lõi (Business Logic độc lập)
│   │   ├── itemService.js              # CRUD item, tree traversal, resolve field inheritance
│   │   ├── templateService.js          # Phân giải template, kế thừa base template, standard values
│   │   ├── authService.js              # Xác thực, tạo session, hash password
│   │   ├── aclService.js               # Đánh giá quyền truy cập phân cấp (Item Access Calculation)
│   │   ├── mediaService.js             # Upload, resize, lưu trữ media item
│   │   ├── workflowService.js          # Chuyển trạng thái workflow, gửi email thông báo (nếu có)
│   │   ├── publishService.js           # Xử lý đồng bộ Master sang Web (Incremental/Full Publish)
│   │   ├── auditService.js             # Ghi nhận hành động người dùng vào log
│   │   ├── searchService.js            # Tìm kiếm nội dung theo từ khóa, path, template
│   │   └── serializationService.js     # Export/Import cấu trúc Item sang JSON
│   ├── middlewares/                    # Express Middlewares
│   │   ├── authMiddleware.js           # Kiểm tra đăng nhập (Session check)
│   │   ├── aclMiddleware.js            # Kiểm tra quyền thao tác trên item cụ thể
│   │   ├── csrfMiddleware.js           # Xác thực CSRF Token
│   │   ├── validationMiddleware.js     # Validate body / params qua Schema Validator
│   │   ├── uploadMiddleware.js         # Multer configuration middleware
│   │   └── errorHandler.js             # Xử lý lỗi tập trung, hiển thị trang lỗi EJS hoặc JSON lỗi
│   ├── utils/                          # Tiện ích bổ trợ
│   │   ├── treeHelper.js               # Biến đổi dữ liệu phẳng sang node Fancytree
│   │   ├── responseHelper.js           # Chuẩn hóa JSON response format
│   │   ├── logger.js                   # Logging hệ thống (console / file)
│   │   └── diffHelper.js               # So sánh khác biệt giữa 2 phiên bản item
│   ├── views/                          # Giao diện EJS
│   │   ├── layouts/                    # Layout khung
│   │   │   ├── main.ejs                # Layout chung có taskbar & header
│   │   │   ├── minimal.ejs             # Layout trang đăng nhập / màn hình đơn
│   │   │   └── editor.ejs              # Layout 3 vùng cho Content Editor
│   │   ├── partials/                   # Thành phần giao diện tái sử dụng
│   │   │   ├── header.ejs              # Thanh tiêu đề Sitecore (Logo, User info, Search)
│   │   │   ├── ribbon.ejs              # Ribbon điều khiển đa tabs (Home, Navigate, Review...)
│   │   │   ├── contentTree.ejs         # Khung cây nội dung bên trái
│   │   │   ├── taskbar.ejs             # Taskbar dưới đáy màn hình chuyển đổi ứng dụng
│   │   │   ├── alerts.ejs              # Flash messages / cảnh báo
│   │   │   └── modals/                 # Các cửa sổ bật lên (Insert, Rename, Media Picker, Access)
│   │   └── admin/                      # Màn hình nghiệp vụ chi tiết
│   │       ├── auth/                   # login.ejs, forgot-password.ejs
│   │       ├── launchpad/              # index.ejs
│   │       ├── content-editor/         # index.ejs, item-form.ejs, folder-view.ejs
│   │       ├── templates/              # manager.ejs, template-builder.ejs
│   │       ├── media/                  # library.ejs, picker-modal.ejs
│   │       ├── security/               # users.ejs, roles.ejs, access-viewer.ejs
│   │       ├── workflow/               # workbox.ejs, workflow-setup.ejs
│   │       ├── publish/                # publish-dialog.ejs, publish-status.ejs
│   │       ├── recycle-bin/            # index.ejs
│   │       ├── audit/                  # viewer.ejs
│   │       ├── forms/                  # index.ejs, form-designer.ejs
│   │       └── control-panel/          # index.ejs
│   └── public/                         # Tài sản tĩnh phía Client
│       ├── css/                        # CSS tùy biến giao diện phong cách Sitecore (Metro/Fluent)
│       ├── js/                         # Script điều khiển UI (ribbon tabs, modals, tree setup)
│       ├── vendor/                     # Thư viện ngoài (Fancytree, Alpine.js, Sortable, TinyMCE)
│       └── images/                     # Icon phong cách Sitecore 16x16, 24x24, 32x32, 48x48
├── storage/                            # Thư mục lưu trữ tệp (không commit vào Git)
│   ├── uploads/                        # Tệp media người dùng tải lên
│   ├── thumbnails/                     # Ảnh thu nhỏ sinh tự động
│   └── temp/                           # Tệp tạm thời khi import/export
├── tests/                              # Thư mục kiểm thử tự động (Unit / Integration)
├── .env.example                        # Mẫu biến môi trường
├── .gitignore
├── package.json
└── AGENTS.md                           # Bản đặc tả kiến trúc & Lộ trình thực hiện
```

### 3.2 Quy ước đặt tên
- **Tập tin mã nguồn JavaScript:** Sử dụng `camelCase` (ví dụ: `itemService.js`, `contentEditorController.js`, `authMiddleware.js`).
- **Tập tin giao diện EJS:** Sử dụng `kebab-case` (ví dụ: `content-editor.ejs`, `item-form.ejs`, `media-picker.ejs`).
- **Mongoose Models:** Sử dụng `PascalCase` danh từ số ít (ví dụ: `Item.js`, `Template.js`, `AuditLog.js`).
- **Tên Collection MongoDB:** Sử dụng `snake_case` số nhiều (ví dụ: `items_master`, `items_web`, `templates`, `users`, `roles`).
- **Đường dẫn URL Routes:** Sử dụng `kebab-case` theo nguyên tắc RESTful (ví dụ: `/admin/content-editor`, `/admin/template-manager/create-field`).

### 3.3 Quy ước Route (Phân định Full Page EJS vs Partial HTML vs JSON)
Để đạt trải nghiệm mượt mà giống Desktop App của Sitecore mà vẫn duy trì SSR:
1. **Full Page EJS (`GET /admin/...`):**
   - Trả về toàn bộ trang hoàn chỉnh (bao gồm Layout, Header, Ribbon, Tree, Workspace, Taskbar).
   - Được gọi khi người dùng truy cập trực tiếp từ URL, ấn F5, hoặc chuyển đổi ứng dụng từ Launchpad / Taskbar.
2. **Partial HTML EJS (`GET /admin/.../partial` hoặc request có header `X-Requested-With: Partial`):**
   - Chỉ render và trả về một phần HTML của giao diện (ví dụ: toàn bộ form chỉnh sửa của 1 item `item-form.ejs`, hoặc danh sách sub-items `folder-view.ejs`).
   - Được gọi bằng AJAX khi người dùng click vào một node trên Cây nội dung; client nhận HTML và đưa thẳng vào vùng `#editor-workspace` mà không cần reload trang.
3. **JSON Endpoints (`POST /admin/.../ajax` hoặc API `/api/v1/...`):**
   - **Internal AJAX (`/admin/.../ajax`):** Trả về JSON cho các tác vụ cập nhật nhanh: lưu form item, đổi tên node trên cây, kéo thả sắp xếp (sort), tải cây con lazy-load (Fancytree data format).
     - Cấu trúc phản hồi: `{ success: true, message: "...", data: { ... } }`
   - **Delivery API (`/api/v1/...`):** RESTful JSON dành riêng cho ứng dụng Frontend bên ngoài đọc dữ liệu từ `items_web`.

### 3.4 Phân tầng kiến trúc (Routes → Controllers → Services → Models)
- **Tầng Routes:** Chỉ định nghĩa URL, HTTP Method và gán các Middleware (Auth, CSRF, Validate, Upload).
- **Tầng Controllers:** Tiếp nhận Request (params, query, body), gọi các hàm ở tầng Services xử lý, sau đó quyết định render View EJS hoặc trả về JSON. **Tuyệt đối không viết câu lệnh truy vấn MongoDB hoặc logic nghiệp vụ phức tạp trong Controller.**
- **Tầng Services:** Chứa toàn bộ nghiệp vụ lõi (Business Logic). Tầng này độc lập hoàn toàn với HTTP request/response. Cả Controller Admin và Controller Delivery API đều sử dụng chung Service để tái sử dụng tối đa logic.
- **Tầng Models:** Khai báo cấu trúc bảng, kiểu dữ liệu, index, virtual fields, hooks (pre-save, post-save) của Mongoose.

### 3.5 Quy ước xử lý lỗi, validate input và logging
- **Lớp lỗi tùy biến `AppError`:**
  - Định nghĩa mã lỗi HTTP (`statusCode`), thông điệp (`message`), và mã lỗi nghiệp vụ (`errorCode`).
  - Phân loại lỗi: `OperationalError` (lỗi do người dùng nhập sai, không đủ quyền - trả về thông báo rõ ràng) và `SystemError` (lỗi server, crash - log chi tiết stack trace và trả về thông báo an toàn).
- **Validate Input:**
  - Mọi dữ liệu từ form POST và API đều phải được kiểm tra tính hợp lệ bằng schema validator trước khi xuống Service.
- **Logging:**
  - Sử dụng module logger tập trung ghi nhận các mức: `INFO`, `WARN`, `ERROR`.
  - Trong môi trường Development: log có màu sắc ra console. Trong môi trường Production: lưu file log kèm rotation.

### 3.6 Quy ước bảo mật
- **Bảo vệ CSRF (Cross-Site Request Forgery):**
  - Mọi Form EJS sử dụng method `POST`, `PUT`, `DELETE` đều phải đính kèm input ẩn `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`.
  - Mọi request AJAX/Fetch từ client phải gửi kèm header `X-CSRF-Token: <token>`.
- **Chống tấn công XSS (Cross-Site Scripting):**
  - Mặc định trong EJS luôn dùng cú pháp escape `<%= data %>`. Chỉ dùng `<%- data %>` tại những vị trí cố ý hiển thị HTML từ Rich Text.
  - Mọi dữ liệu HTML xuất phát từ field `Rich Text` trước khi lưu vào MongoDB phải được đi qua thư viện `sanitize-html` để loại bỏ các thẻ nguy hiểm (`<script>`, `<iframe>`, `onload=`, `onerror=`).
- **Phân quyền chặt chẽ:**
  - Mọi thao tác biên tập đều chạy qua middleware kiểm tra quyền Item (Read, Write, Create, Delete, Administer, Publish).

### 3.7 Quy ước Git Commit và Quản lý nhánh
- **Cú pháp Commit:** `<type>(<scope>): <mô tả ngắn bằng tiếng Việt hoặc tiếng Anh>`
  - Types: `feat` (tính năng mới), `fix` (sửa lỗi), `refactor` (tối ưu mã nguồn), `docs` (tài liệu), `chore` (cấu hình/cài đặt).
  - Scope: Tên giai đoạn hoặc module (ví dụ: `gd0`, `gd1`, `content-tree`, `acl`).
  - Ví dụ: `feat(gd2): bổ sung tính năng lazy loading cho cây nội dung`

---

## 4. MÔ HÌNH DỮ LIỆU MONGODB

### 4.1 Chiến lược Lưu trữ Cây nội dung: Materialized Path + Ancestors Array
Để đáp ứng các yêu cầu:
1. **Lazy Loading 1 cấp mượt mà:** Tìm các con trực tiếp nhanh (`find({ parentId: currentId }).sort({ sortOrder: 1 })`).
2. **Truy vấn toàn bộ cây con:** Tìm mọi con cháu bên dưới nhanh chóng khi di chuyển (move), xóa (delete), hoặc publish cả nhánh (`find({ path: { $regex: '^/sitecore/content/home' } })`).
3. **Kế thừa quyền và tính toán đường dẫn:** Kiểm tra nhanh danh sách tổ tiên mà không cần đệ quy (`find({ _id: { $in: item.ancestors } })`).

Mô hình kết hợp lưu trữ gồm 3 trường chính trên mỗi Item:
- `parentId`: ID của node cha trực tiếp (null đối với Root Item).
- `path`: Đường dẫn chuỗi văn bản (ví dụ: `/sitecore/content/home/about-us`).
- `ancestors`: Mảng chứa danh sách `ObjectId` của toàn bộ tổ tiên từ trên xuống dưới theo thứ tự phân cấp.

---

### 4.2 Chi tiết các Collection chính

#### 1. Collection `items_master` (và cấu trúc tương đương cho `items_web`)
```javascript
{
  _id: ObjectId("..."),
  name: "about-us",                    // Tên kỹ thuật (dùng tạo path & slug, không dấu, kebab-case)
  displayName: "About Us",             // Tên hiển thị trên cây nội dung
  templateId: ObjectId("..."),         // Tham chiếu đến Template định nghĩa item
  parentId: ObjectId("..."),           // ID node cha (null nếu là Root)
  ancestors: [ObjectId("..."), ...],   // Mảng ID các node tổ tiên
  path: "/sitecore/content/home/about-us", // Materialized path
  sortOrder: 100,                      // Thứ tự sắp xếp giữa các anh chị em cùng cấp
  
  // Các trường dùng chung không phụ thuộc ngôn ngữ hay version
  sharedFields: {
    // [fieldId: String]: Mixed
    "field_hide_in_nav": false
  },
  
  // Dữ liệu nội dung đa ngôn ngữ & đa phiên bản
  languages: [
    {
      code: "en",                      // Mã ngôn ngữ (en, vi-VN, ja...)
      // Các trường phụ thuộc ngôn ngữ nhưng dùng chung mọi version
      unversionedFields: {
        "field_meta_keywords": "company, profile"
      },
      // Danh sách các phiên bản nội dung
      versions: [
        {
          versionNumber: 1,            // Số phiên bản: 1, 2, 3...
          workflowStateId: ObjectId("..."), // Trạng thái workflow hiện tại (Draft, Approved...)
          createdDate: ISODate("..."),
          createdBy: ObjectId("..."),  // User tạo version này
          updatedDate: ISODate("..."),
          updatedBy: ObjectId("..."),
          
          // Dữ liệu trường nội dung của phiên bản cụ thể
          fields: {
            // [fieldId: String]: Mixed
            "field_page_title": "About Our Corporation",
            "field_body_content": "<p>Welcome to our official website...</p>",
            "field_banner_image": ObjectId("...") // Tham chiếu sang Media ID
          }
        }
      ]
    }
  ],
  
  isDeleted: false,                    // Đánh dấu soft-delete (nằm trong Recycle Bin)
  deletedAt: null,
  deletedBy: null,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```
*Chỉ mục (Indexes):*
- `{ path: 1 }` (unique)
- `{ parentId: 1, sortOrder: 1 }` (cho lazy loading con)
- `{ ancestors: 1 }` (cho tìm kiếm toàn bộ con cháu)
- `{ templateId: 1 }`
- `{ isDeleted: 1 }`

---

#### 2. Collection `templates`
Mô hình hóa định nghĩa trường giống hệt Sitecore (Section -> Fields).
```javascript
{
  _id: ObjectId("..."),
  name: "Standard Web Page",
  icon: "document_plain.png",          // Icon hiển thị trên cây nội dung
  baseTemplateIds: [ObjectId("...")],  // Cho phép kế thừa trường từ Template cơ sở
  
  // Các phân vùng và trường dữ liệu
  sections: [
    {
      _id: ObjectId("..."),
      name: "Content",                 // Tiêu đề Section (ví dụ: Page Metadata, Content, Settings)
      sortOrder: 10,
      fields: [
        {
          _id: ObjectId("..."),
          name: "Page Title",          // Tên kỹ thuật của field
          key: "field_page_title",     // Key lưu trữ trong Item fields
          type: "Single-Line Text",    // Single-Line Text, Rich Text, Image, Checkbox, Date, Droplist, Multilist
          isShared: false,             // Dùng chung mọi ngôn ngữ
          isUnversioned: false,        // Dùng chung mọi version trong 1 ngôn ngữ
          sortOrder: 10,
          source: "",                  // Truy vấn nguồn cho Droplist/Multilist (ví dụ path: /sitecore/content/categories)
          validationRule: "^.{1,100}$",
          helpText: "Nhập tiêu đề hiển thị chính của trang web (tối đa 100 ký tự)"
        }
      ]
    }
  ],
  
  // Standard Values: Giá trị mặc định khi tạo một Item mới thuộc Template này
  standardValues: {
    sharedFields: {},
    languages: {
      "en": {
        "field_page_title": "Default Page Title"
      }
    }
  },
  
  // Insert Options: Giới hạn các Template con được phép tạo bên dưới Item này
  insertOptions: [ObjectId("..."), ObjectId("...")],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

#### 3. Collection `users` & `roles`
```javascript
// users collection
{
  _id: ObjectId("..."),
  username: "admin",
  email: "admin@cms.local",
  passwordHash: "$2b$10$...",
  fullName: "System Administrator",
  avatar: "/images/avatars/default.png",
  roles: [ObjectId("role_admin_id"), ObjectId("role_author_id")],
  isActive: true,
  lastLogin: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// roles collection
{
  _id: ObjectId("..."),
  name: "Sitecore Client Authoring",
  description: "Cho phép soạn thảo nội dung cơ bản nhưng không có quyền cấu hình hệ thống",
  isSystem: true,                      // Role hệ thống không được xóa
  createdAt: ISODate("...")
}
```

---

#### 4. Collection `access_control_lists` (ACL theo Item)
```javascript
{
  _id: ObjectId("..."),
  itemId: ObjectId("..."),             // Áp dụng cho Item cụ thể nào
  identityType: "role",                // "user" hoặc "role"
  identityId: ObjectId("..."),         // ID của User hoặc Role
  
  // Bảng phân quyền chi tiết
  permissions: {
    read: "allow",                     // "allow" | "deny" | "inherit"
    write: "allow",
    create: "allow",
    delete: "deny",
    administer: "deny",
    publish: "allow"
  },
  
  applyToDescendants: true             // Kế thừa quyền này cho tất cả node con cháu
}
```
*Chỉ mục (Indexes):* `{ itemId: 1, identityType: 1, identityId: 1 }` (unique)

---

#### 5. Collection `media`
```javascript
{
  _id: ObjectId("..."),
  name: "hero-banner.jpg",
  displayName: "Hero Banner Homepage",
  isFolder: false,                     // true nếu là thư mục tổ chức media
  parentId: ObjectId("..."),           // Thư mục cha (null nếu ở gốc /sitecore/media)
  path: "/sitecore/media/banners/hero-banner.jpg",
  ancestors: [ObjectId("...")],
  fileDetails: {
    originalName: "hero-banner.jpg",
    storagePath: "uploads/2026/03/hero-banner_uuid.jpg",
    thumbnailPath: "thumbnails/2026/03/hero-banner_uuid_thumb.jpg",
    mimeType: "image/jpeg",
    fileSize: 245000,                  // bytes
    dimensions: { width: 1920, height: 800 },
    extension: "jpg"
  },
  altText: "Hình ảnh banner trang chủ giới thiệu sản phẩm",
  isDeleted: false,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

#### 6. Collection `workflows` & `audit_logs` & `publish_histories`
```javascript
// workflows collection
{
  _id: ObjectId("..."),
  name: "Standard Publishing Workflow",
  initialStateId: ObjectId("state_draft_id"),
  states: [
    {
      _id: ObjectId("state_draft_id"),
      name: "Draft",
      sortOrder: 1,
      isFinal: false,
      actions: [
        { name: "Submit for Review", nextStateId: ObjectId("state_review_id"), allowedRoleIds: [ObjectId("...")] }
      ]
    },
    {
      _id: ObjectId("state_review_id"),
      name: "Awaiting Approval",
      sortOrder: 2,
      isFinal: false,
      actions: [
        { name: "Approve", nextStateId: ObjectId("state_approved_id"), allowedRoleIds: [ObjectId("...")] },
        { name: "Reject", nextStateId: ObjectId("state_draft_id"), allowedRoleIds: [ObjectId("...")] }
      ]
    },
    {
      _id: ObjectId("state_approved_id"),
      name: "Approved",
      sortOrder: 3,
      isFinal: true                    // Khi đạt trạng thái này mới được phép Publish ra Web
    }
  ]
}

// audit_logs collection
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  username: "editor1",
  action: "ITEM_UPDATE",               // LOGIN, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE, PUBLISH, WORKFLOW_CHANGE
  targetItemId: ObjectId("..."),
  itemPath: "/sitecore/content/home",
  details: {
    changedFields: ["field_page_title"],
    oldValues: { "field_page_title": "Old Title" },
    newValues: { "field_page_title": "New Title" }
  },
  ipAddress: "192.168.1.10",
  timestamp: ISODate("...")
}

// publish_histories collection
{
  _id: ObjectId("..."),
  publishType: "SmartPublish",         // "IncrementalPublish" | "SmartPublish" | "RepublishAll"
  sourceDatabase: "master",
  targetDatabase: "web",
  rootItemId: ObjectId("..."),
  totalItemsProcessed: 45,
  totalItemsPublished: 12,
  languages: ["en", "vi-VN"],
  status: "Success",                   // "InProgress" | "Success" | "Failed"
  publishedBy: ObjectId("..."),
  startedAt: ISODate("..."),
  finishedAt: ISODate("..."),
  logDetails: []
}
```

---

## 5. KẾ HOẠCH TỪNG GIAI ĐOẠN (GĐ 0 → GĐ 11)

---

### GIAI ĐOẠN 0 (GĐ 0): KHỞI TẠO NỀN TẢNG DỰ ÁN & LAYOUT SHELL
- **Mục tiêu:** Thiết lập khung sườn dự án vững chắc với Node.js, Express, MongoDB, EJS Layout Engine, cấu hình bảo mật cơ bản và bộ giao diện khung vỏ (CSS/Layout Shell) theo đúng phong cách Sitecore.
- **Phạm vi:**
  - *Làm:* Cấu trúc thư mục chuẩn; khởi tạo `package.json`, cài đặt dependencies; kết nối MongoDB; cấu hình EJS layout với thư mục views/partials; thiết lập CSS giao diện phong cách Sitecore (Header xanh Sitecore, taskbar xám tro, cửa sổ window frame, font Segoe UI / Open Sans); trang chủ tạm kiểm tra layout.
  - *Không làm:* Chưa làm xác thực người dùng thật (chưa login session); chưa làm tương tác cây nội dung.
- **Phụ thuộc:** Không.
- **Danh sách Task:**
  - [x] **Task 0.1:** Khởi tạo `package.json`, khai báo các thư viện (express, mongoose, ejs, express-ejs-layouts, helmet, morgan, dotenv, cors, express-session, connect-mongo).
  - [x] **Task 0.2:** Thiết lập module kết nối cơ sở dữ liệu `src/config/database.js` kết nối tới MongoDB với cơ chế retry và log trạng thái.
  - [x] **Task 0.3:** Tạo ứng dụng Express `src/app.js` và file thực thi `src/server.js`, tích hợp các middleware bảo mật cơ bản (helmet, body-parser, cookie-parser, morgan logger).
  - [x] **Task 0.4:** Cấu hình EJS View Engine và hệ thống layout mẫu (`src/views/layouts/main.ejs`, `src/views/layouts/minimal.ejs`, `src/views/partials/header.ejs`, `src/views/partials/taskbar.ejs`).
  - [x] **Task 0.5:** Xây dựng bộ CSS Sitecore chuẩn (`src/public/css/sitecore-theme.css`) mô phỏng màu sắc, typography (Segoe UI), thanh taskbar dưới đáy và phong cách Ribbon bar phía trên.
  - [x] **Task 0.6:** Tạo route test `GET /` hiển thị trang shell giao diện mẫu xác nhận layout render mượt mà không lỗi.
  - [x] **Task 0.7:** Thiết lập cấu hình biến môi trường `.env.example`, `.env` và file `.gitignore` tiêu chuẩn.
- **File/Thư mục dự kiến:**
  - `package.json`, `.env.example`, `.gitignore`
  - `src/server.js`, `src/app.js`
  - `src/config/database.js`, `src/config/constants.js`
  - `src/views/layouts/main.ejs`, `src/views/layouts/minimal.ejs`
  - `src/views/partials/header.ejs`, `src/views/partials/taskbar.ejs`, `src/views/partials/alerts.ejs`
  - `src/views/index.ejs`
  - `src/public/css/sitecore-theme.css`, `src/public/js/sitecore-shell.js`
- **Route / API dự kiến:**
  - `GET /`: Trang chủ hiển thị khung vỏ layout shell để kiểm tra CSS và partials.
  - `GET /health`: Endpoint kiểm tra trạng thái hoạt động của server và database.
- **Thay đổi Database:** Kiểm tra kết nối thành công tới database MongoDB `sitecore_cms_master`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Khởi động server bằng `npm start` không phát sinh cảnh báo lỗi.
  - Truy cập trình duyệt `http://localhost:3000` hiển thị đầy đủ giao diện shell: thanh tiêu đề Sitecore trên cùng, thanh taskbar bên dưới, theme màu xám/xanh chuẩn enterprise.
  - Endpoint `http://localhost:3000/health` trả về `{ status: "ok", db: "connected" }`.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Lỗi kết nối MongoDB do sai URI hoặc phiên bản Node.js không tương thích.
  - *Giảm thiểu:* Bọc kết nối trong khối try/catch với log chi tiết, cung cấp URI mặc định kết nối localhost.
- **Ước tính thời gian:** 1 ngày làm việc.
- **Trạng thái:** Hoàn thành.

---

### GIAI ĐOẠN 1 (GĐ 1): NỀN TẢNG XÁC THỰC & DASHBOARD LAUNCHPAD
- **Mục tiêu:** Xây dựng hệ thống đăng nhập, đăng xuất, lưu trữ phiên làm việc an toàn với MongoDB Store, và màn hình điều khiển Launchpad hiển thị các ô ứng dụng (Tiles) theo phân quyền của người dùng.
- **Phạm vi:**
  - *Làm:* Model `User`, `Role`, `LaunchpadApp`; mã hóa mật khẩu với `bcryptjs`; phiên làm việc `express-session` lưu trong MongoStore; middleware bảo vệ route `authMiddleware`; màn hình đăng nhập phong cách Sitecore; màn hình Launchpad phân nhóm các ứng dụng (Content Editing, Marketing, Media, Security, Control Panel); script tạo tài khoản `admin` mặc định (Seed data).
  - *Không làm:* Chưa làm phân quyền chi tiết từng nút trong cây (ACL theo Item để sang GĐ 6).
- **Phụ thuộc:** GĐ 0.
- **Danh sách Task:**
  - [ ] **Task 1.1:** Định nghĩa Mongoose Model `User` (`src/models/User.js`) và `Role` (`src/models/Role.js`).
  - [ ] **Task 1.2:** Định nghĩa Mongoose Model `LaunchpadApp` (`src/models/LaunchpadApp.js`) chứa thông tin icon, tên, mô tả, nhóm, URL, và danh sách Role được phép truy cập.
  - [ ] **Task 1.3:** Cấu hình session `src/config/session.js` sử dụng `express-session` và `connect-mongo`.
  - [ ] **Task 1.4:** Xây dựng `authService.js` xử lý logic xác thực đăng nhập, so sánh mật khẩu băm, và cập nhật `lastLogin`.
  - [ ] **Task 1.5:** Xây dựng `authController.js` và routes `src/routes/admin/authRoutes.js` (`GET /admin/login`, `POST /admin/login`, `POST /admin/logout`).
  - [ ] **Task 1.6:** Thiết kế giao diện EJS đăng nhập `src/views/admin/auth/login.ejs` (logo Sitecore, form nhập username/password, thông báo lỗi).
  - [ ] **Task 1.7:** Xây dựng `authMiddleware.js` bảo vệ toàn bộ các route tiền tố `/admin/*` (chuyển hướng về `/admin/login` nếu chưa đăng nhập).
  - [ ] **Task 1.8:** Xây dựng `launchpadController.js` và route `src/routes/admin/launchpadRoutes.js` (`GET /admin/launchpad`).
  - [ ] **Task 1.9:** Thiết kế giao diện Launchpad `src/views/admin/launchpad/index.ejs` hiển thị danh sách ứng dụng chia nhóm (Content Editing, Media, Control Panel) dựa trên role của user hiện tại.
  - [ ] **Task 1.10:** Viết script seed data `src/scripts/seed-initial-data.js` khởi tạo các role mặc định (`Administrator`, `Author`, `Editor`) và tài khoản `admin` / `admin123`.
- **File/Thư mục dự kiến:**
  - `src/models/User.js`, `src/models/Role.js`, `src/models/LaunchpadApp.js`
  - `src/config/session.js`
  - `src/services/authService.js`
  - `src/controllers/admin/authController.js`, `src/controllers/admin/launchpadController.js`
  - `src/routes/admin/authRoutes.js`, `src/routes/admin/launchpadRoutes.js`
  - `src/middlewares/authMiddleware.js`
  - `src/views/admin/auth/login.ejs`, `src/views/admin/launchpad/index.ejs`
  - `src/scripts/seed-initial-data.js`
- **Route / API dự kiến:**
  - `GET /admin/login`: Hiển thị form đăng nhập.
  - `POST /admin/login`: Tiếp nhận thông tin đăng nhập, thiết lập session.
  - `POST /admin/logout`: Hủy session, đăng xuất.
  - `GET /admin/launchpad`: Trang chủ Launchpad hiển thị các ứng dụng.
- **Thay đổi Database:**
  - Collections: `users`, `roles`, `launchpad_apps`, `sessions`.
  - Dữ liệu ban đầu: Tài khoản admin, các role hệ thống, danh mục 6-8 apps chuẩn Sitecore.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Chạy `node src/scripts/seed-initial-data.js` tạo thành công user admin.
  - Truy cập bất kỳ route `/admin/launchpad` khi chưa đăng nhập -> Tự động redirect về `/admin/login`.
  - Đăng nhập với sai mật khẩu -> Hiển thị cảnh báo lỗi màu đỏ trên form.
  - Đăng nhập đúng với `admin` -> Chuyển hướng tới `/admin/launchpad`, hiển thị đầy đủ các Tile ứng dụng với tên user `System Administrator` trên header.
  - Ấn nút Đăng xuất -> Hủy session, chuyển về trang đăng nhập, ấn nút Back trên trình duyệt không thể quay lại trang trước.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Lỗ hổng session fixation hoặc mất session khi restart server.
  - *Giảm thiểu:* Thiết lập cookie options an toàn (`httpOnly: true`, `sameSite: 'lax'`, `maxAge`), lưu session bền vững trong MongoDB qua `connect-mongo`.
- **Ước tính thời gian:** 1.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 2 (GĐ 2): CONTENT EDITOR MVP (CÂY NỘI DUNG, CRUD ITEM & RIBBON HOME)
- **Mục tiêu:** Xây dựng hạt nhân Content Editor: hiển thị Cây nội dung lazy-loading bên trái bằng Fancytree/jsTree, form chỉnh sửa dữ liệu item ở giữa, và dải Ribbon "Home" hỗ trợ đầy đủ các thao tác CRUD cơ bản (Insert, Duplicate, Delete, Rename, Sort, Move).
- **Phạm vi:**
  - *Làm:* Cấu trúc Item Model theo Materialized Path; Cây nội dung nạp dữ liệu phân cấp lười (Lazy-loading AJAX); Form hiển thị các field cơ bản (Single-Line Text, Rich Text); Các thao tác Ribbon Home: Insert Item (chọn template cơ bản), Duplicate Item, Delete Item, Rename Item, Move Item, Sort Item; cập nhật đồng bộ Cây và Form qua AJAX.
  - *Không làm:* Chưa làm Versioning/Ngôn ngữ (mặc định xử lý version 1 ngôn ngữ `en`); chưa xử lý Base Template phức tạp; chưa có ACL.
- **Phụ thuộc:** GĐ 1.
- **Danh sách Task:**
  - [ ] **Task 2.1:** Xây dựng Mongoose Model `Item` (`src/models/Item.js`) với các trường: `name`, `displayName`, `templateId`, `parentId`, `ancestors`, `path`, `sortOrder`, `sharedFields`, `languages`.
  - [ ] **Task 2.2:** Xây dựng Mongoose Model `Template` (`src/models/Template.js`) cơ bản phục vụ cho việc tạo item.
  - [ ] **Task 2.3:** Tạo hạt giống dữ liệu ban đầu cho cây Sitecore: Node Root (`/sitecore`), các node nhánh chuẩn (`/sitecore/content`, `/sitecore/media library`, `/sitecore/templates`, `/sitecore/system`), và node trang chủ mẫu (`/sitecore/content/home`).
  - [ ] **Task 2.4:** Xây dựng `itemService.js` với các phương thức nghiệp vụ: `getChildren(parentId)`, `getItemById(id)`, `getItemByPath(path)`, `createItem(data)`, `updateItemFields(id, fields)`, `deleteItem(id)`, `renameItem(id, newName)`, `moveItem(id, newParentId)`, `duplicateItem(id)`.
  - [ ] **Task 2.5:** Xây dựng `treeHelper.js` chuyển đổi danh sách Item từ MongoDB sang định dạng JSON chuẩn của Fancytree (`{ title, key, folder, lazy, icon }`).
  - [ ] **Task 2.6:** Xây dựng các route và controller Content Editor:
    - `GET /admin/content-editor`: Render giao diện 3 vùng (Ribbon, Tree container, Workspace container).
    - `GET /admin/content-editor/tree/nodes`: Trả về mảng JSON các node con theo `parentId` phục vụ lazy loading cây.
    - `GET /admin/content-editor/item/:id/partial`: Trả về HTML partial chứa form soạn thảo của Item tương ứng.
    - `POST /admin/content-editor/item/:id/save`: AJAX lưu giá trị các trường.
    - `POST /admin/content-editor/item/insert`: AJAX tạo item mới.
    - `POST /admin/content-editor/item/:id/rename`: AJAX đổi tên item.
    - `POST /admin/content-editor/item/:id/delete`: AJAX xóa item.
    - `POST /admin/content-editor/item/:id/duplicate`: AJAX nhân bản item.
    - `POST /admin/content-editor/item/:id/move`: AJAX di chuyển item sang cha mới.
  - [ ] **Task 2.7:** Thiết kế giao diện EJS Content Editor:
    - `src/views/admin/content-editor/index.ejs`: Khung chính chia cột layout có resizer kéo giãn chiều rộng.
    - `src/views/partials/ribbon.ejs`: Tab "Home" với các nút: Insert, Save, Duplicate, Rename, Delete, Move, Sort.
    - `src/views/admin/content-editor/item-form.ejs`: Form soạn thảo render các trường của Item theo từng Section.
    - `src/views/admin/content-editor/modals/insert-modal.ejs`: Modal chọn tên và chọn Template khi ấn Insert.
  - [ ] **Task 2.8:** Viết mã Client-side JS (`src/public/js/content-editor.js`):
    - Tích hợp thư viện Fancytree kết nối endpoint lazy loading.
    - Bắt sự kiện click node -> gửi Fetch request lấy partial form HTML nạp vào vùng soạn thảo.
    - Bắt sự kiện ấn nút trên Ribbon -> thực hiện các hành động AJAX tương ứng và tự động cập nhật lại node trên cây.
    - Tích hợp bộ gõ TinyMCE cho trường Rich Text.
- **File/Thư mục dự kiến:**
  - `src/models/Item.js`, `src/models/Template.js`
  - `src/services/itemService.js`, `src/utils/treeHelper.js`
  - `src/controllers/admin/contentEditorController.js`
  - `src/routes/admin/contentEditorRoutes.js`
  - `src/views/admin/content-editor/index.ejs`
  - `src/views/admin/content-editor/item-form.ejs`
  - `src/views/admin/content-editor/modals/*.ejs`
  - `src/public/js/content-editor.js`, `src/public/css/content-editor.css`
- **Route / API dự kiến:**
  - `GET /admin/content-editor`
  - `GET /admin/content-editor/tree/nodes?parentId=...`
  - `GET /admin/content-editor/item/:id/partial`
  - `POST /admin/content-editor/item/save`
  - `POST /admin/content-editor/item/insert`
  - `POST /admin/content-editor/item/rename`
  - `POST /admin/content-editor/item/delete`
  - `POST /admin/content-editor/item/duplicate`
  - `POST /admin/content-editor/item/move`
- **Thay đổi Database:**
  - Collection `items_master` với các index `{ parentId: 1, sortOrder: 1 }`, `{ path: 1 }`.
  - Khởi tạo cây mẫu Sitecore chuẩn.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Mở Content Editor, cây nội dung hiển thị node gốc `/sitecore`.
  - Bấm mở rộng node `/sitecore/content` -> Lazy load hiển thị node `home`.
  - Click vào `home` -> Form soạn thảo hiển thị tức thì bên phải với các trường: Title, Body (Rich Text).
  - Sửa nội dung Title và Body, bấm nút "Save" trên Ribbon -> Dữ liệu được lưu vào MongoDB và hiển thị thông báo "Item saved successfully".
  - Thử các tính năng trên Ribbon Home:
    - Bấm Insert -> Tạo thành công trang con bên dưới `home`, cây tự động refresh hiển thị node mới.
    - Bấm Rename -> Đổi tên thành công, node trên cây cập nhật tên mới.
    - Bấm Duplicate -> Nhân bản thành công item cùng cấp.
    - Bấm Delete -> Xóa item, node trên cây biến mất.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Cập nhật cây khi có nhiều cấp con bị lệch đường dẫn `path` hoặc mảng `ancestors`.
  - *Giảm thiểu:* Viết hàm đệ quy cập nhật toàn bộ cây con khi di chuyển hoặc đổi tên node cha trong `itemService.js`.
- **Ước tính thời gian:** 3 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 3 (GĐ 3): TEMPLATE MANAGER (QUẢN LÝ CẤU TRÚC, KẾ THỪA & INSERT OPTIONS)
- **Mục tiêu:** Xây dựng công cụ Template Manager cho phép người quản trị định nghĩa cấu trúc dữ liệu của Item trực quan (Sections, Fields, Field Types), hỗ trợ kế thừa Base Templates, thiết lập Standard Values (giá trị mặc định) và Insert Options (ràng buộc loại item con được tạo).
- **Phạm vi:**
  - *Làm:* Giao diện quản lý Template; Trình thiết kế Section & Field với đầy đủ các Field Types: Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist; Kế thừa nhiều Base Template; Thiết lập Standard Values; Cấu hình Insert Options; Tự động phản ánh cấu trúc trường mới vào Form của Content Editor.
  - *Không làm:* Chưa làm Validation Rules nâng cao bằng Regex tùy biến phức tạp.
- **Phụ thuộc:** GĐ 2.
- **Danh sách Task:**
  - [ ] **Task 3.1:** Hoàn thiện Mongoose Schema `Template` (`src/models/Template.js`) hỗ trợ mảng `sections`, `fields`, `baseTemplateIds`, `standardValues`, và `insertOptions`.
  - [ ] **Task 3.2:** Xây dựng `templateService.js`:
    - `getAllTemplates()`: Lấy danh sách template trong hệ thống.
    - `getTemplateWithInheritance(templateId)`: Thu thập toàn bộ section và field từ chính template đó và đệ quy lên tất cả các base templates.
    - `createTemplate(data)`, `updateTemplate(id, data)`, `deleteTemplate(id)`.
    - `saveStandardValues(templateId, values)`.
    - `setInsertOptions(templateId, allowedTemplateIds)`.
  - [ ] **Task 3.3:** Xây dựng `templateManagerController.js` và route `src/routes/admin/templateManagerRoutes.js`:
    - `GET /admin/template-manager`: Giao diện danh sách và cây template.
    - `GET /admin/template-manager/:id`: Chi tiết màn hình thiết kế template (Sections, Fields).
    - `POST /admin/template-manager/save`: Lưu cấu trúc template.
    - `POST /admin/template-manager/:id/standard-values`: Lưu giá trị mặc định.
    - `POST /admin/template-manager/:id/insert-options`: Cập nhật insert options.
  - [ ] **Task 3.4:** Thiết kế giao diện EJS Template Manager:
    - `src/views/admin/templates/manager.ejs`: Cây template nằm dưới nhánh `/sitecore/templates`.
    - `src/views/admin/templates/builder.ejs`: Bảng thiết kế Section và Field cho phép thêm/sửa/xóa trường nhanh, chọn loại trường từ dropdown.
    - `src/views/admin/templates/modals/insert-options-modal.ejs`: Hộp thoại chọn template con được phép tạo.
  - [ ] **Task 3.5:** Tích hợp kế thừa trường vào Content Editor:
    - Cập nhật `itemService.getItemWithRenderSchema(itemId)` để merge toàn bộ trường của Template và Base Templates, điền giá trị từ Item hoặc fallback về Standard Values nếu trường đang trống.
    - Cập nhật Modal "Insert Item" trên Content Editor: Chỉ hiển thị các template được chỉ định trong `insertOptions` của item hiện tại.
- **File/Thư mục dự kiến:**
  - `src/models/Template.js`
  - `src/services/templateService.js`
  - `src/controllers/admin/templateManagerController.js`
  - `src/routes/admin/templateManagerRoutes.js`
  - `src/views/admin/templates/manager.ejs`, `src/views/admin/templates/builder.ejs`
  - `src/views/admin/templates/modals/*.ejs`
  - `src/public/js/template-builder.js`
- **Route / API dự kiến:**
  - `GET /admin/template-manager`
  - `GET /admin/template-manager/:id`
  - `POST /admin/template-manager/save`
  - `POST /admin/template-manager/:id/standard-values`
  - `POST /admin/template-manager/:id/insert-options`
- **Thay đổi Database:**
  - Cập nhật collection `templates`.
  - Liên kết `templateId` trên các item tới collection `templates`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Vào Template Manager, tạo một Base Template tên `_BasePage` chứa Section "SEO" gồm 2 field: `Meta Title` (Single-Line Text) và `Meta Description` (Multi-Line Text).
  - Tạo Template con tên `Article Page`, kế thừa `_BasePage`, và bổ sung Section "Article Body" gồm field `Author` và `Content` (Rich Text).
  - Thiết lập Standard Values cho `Article Page`: `Meta Title` mặc định là "Default Article Title".
  - Thiết lập Insert Options cho `home` item: chỉ cho phép tạo `Article Page`.
  - Mở Content Editor, bấm Insert trên node `home` -> Hộp thoại chỉ cho phép tạo `Article Page`.
  - Tạo một bài viết mới -> Form hiển thị đầy đủ 2 section "SEO" và "Article Body", trường `Meta Title` tự động điền giá trị từ Standard Values.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Kế thừa vòng tròn (Circular Inheritance: Template A kế thừa B, B kế thừa A) gây tràn bộ nhớ đệ quy.
  - *Giảm thiểu:* Kiểm tra phát hiện chu trình (Cycle Detection) trong `templateService` trước khi cho phép lưu danh sách `baseTemplateIds`.
- **Ước tính thời gian:** 2.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 4 (GĐ 4): QUẢN LÝ PHIÊN BẢN & ĐA NGÔN NGỮ (VERSIONS & LANGUAGES)
- **Mục tiêu:** Hoàn thiện cơ chế Đa ngôn ngữ (Multilingual) và Quản lý phiên bản (Item Versioning) chuẩn Sitecore: cho phép thêm phiên bản mới, chuyển đổi qua lại giữa các phiên bản/ngôn ngữ, so sánh khác biệt (Diff View) và khôi phục (Rollback).
- **Phạm vi:**
  - *Làm:* Cấu hình danh mục ngôn ngữ hỗ trợ hệ thống (en, vi-VN, ja...); Cấu trúc lưu trữ Versioned, Unversioned, và Shared fields; Bộ chọn ngôn ngữ và version trên Ribbon/Header của Content Editor; Tính năng "Add Version", "Remove Version"; Màn hình so sánh hai phiên bản (Diff View làm nổi bật thay đổi); Khôi phục phiên bản cũ.
  - *Không làm:* Chưa làm tự động dịch thuật (Auto-translate).
- **Phụ thuộc:** GĐ 2, GĐ 3.
- **Danh sách Task:**
  - [ ] **Task 4.1:** Tạo Model hoặc cấu hình hệ thống `Language` (`src/models/Language.js`) lưu trữ danh sách ngôn ngữ kích hoạt trong CMS (mã code, tên hiển thị, icon cờ quốc gia).
  - [ ] **Task 4.2:** Nâng cấp `itemService.js` hỗ trợ đầy đủ cấu trúc phân cấp:
    - `getFieldsByLanguageAndVersion(itemId, langCode, versionNumber)`.
    - `createNewVersion(itemId, langCode, baseFromVersion)`: Sao chép dữ liệu từ version trước sang version mới với số hiệu tăng thêm 1.
    - `deleteVersion(itemId, langCode, versionNumber)`.
    - `resolveFieldValues(item, langCode, versionNumber)`: Gộp chính xác 3 cấp độ trường: Shared (dùng chung) -> Unversioned (theo ngôn ngữ) -> Versioned (theo phiên bản cụ thể).
  - [ ] **Task 4.3:** Xây dựng `diffHelper.js` so sánh 2 object trường dữ liệu, trả về danh sách trường thay đổi kèm highlight văn bản dạng diff HTML.
  - [ ] **Task 4.4:** Bổ sung các Ribbon Tabs "Versions" trên Content Editor:
    - Nút chọn Ngôn ngữ (Language Switcher Dropdown).
    - Nút chọn Phiên bản (Version Switcher Dropdown).
    - Nút "Add Version" (tạo bản thảo mới).
    - Nút "Compare Versions" (mở modal so sánh).
    - Nút "Remove Version".
  - [ ] **Task 4.5:** Xây dựng modal so sánh phiên bản `src/views/admin/content-editor/modals/compare-versions-modal.ejs` hiển thị 2 cột trực quan (Version A vs Version B).
  - [ ] **Task 4.6:** Cập nhật Controller và Route xử lý các hành động Version và Language qua AJAX.
- **File/Thư mục dự kiến:**
  - `src/models/Language.js`
  - `src/utils/diffHelper.js`
  - `src/views/admin/content-editor/modals/compare-versions-modal.ejs`
  - Cập nhật: `itemService.js`, `contentEditorController.js`, `contentEditorRoutes.js`, `ribbon.ejs`, `content-editor.js`
- **Route / API dự kiến:**
  - `POST /admin/content-editor/item/:id/version/add`: Thêm version mới cho ngôn ngữ hiện tại.
  - `POST /admin/content-editor/item/:id/version/delete`: Xóa version chỉ định.
  - `GET /admin/content-editor/item/:id/compare?v1=1&v2=2&lang=en`: Lấy dữ liệu so sánh 2 phiên bản.
- **Thay đổi Database:** Cập nhật collection `languages` và cấu trúc mảng `languages` trong collection `items_master`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Mở một Item bất kỳ, đang ở ngôn ngữ `en` Version 1.
  - Sửa Title từ "Hello" thành "Hello World", bấm Lưu.
  - Bấm nút "Add Version" trên tab Versions của Ribbon -> Hệ thống tạo ra Version 2, số phiên bản trên giao diện chuyển thành "Version 2".
  - Sửa Title thành "Hello Universe", bấm Lưu.
  - Chuyển dropdown quay lại "Version 1" -> Form lập tức hiển thị lại giá trị "Hello World".
  - Bấm nút "Compare Versions" -> Màn hình so sánh hiển thị rõ sự khác biệt giữa "Hello World" và "Hello Universe" (có màu xanh/đỏ đánh dấu diff).
  - Chuyển sang ngôn ngữ `vi-VN` -> Hệ thống cho phép nhập nội dung tiếng Việt hoàn toàn tách biệt với tiếng Anh.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Nhầm lẫn giữa Shared Fields và Versioned Fields khiến việc chỉnh sửa ở version mới vô tình làm thay đổi giá trị của version cũ.
  - *Giảm thiểu:* Kiểm tra chặt chẽ cờ `isShared` và `isUnversioned` trong `Template` trước khi quyết định vị trí ghi đè dữ liệu trong document MongoDB.
- **Ước tính thời gian:** 2 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 5 (GĐ 5): MEDIA LIBRARY (QUẢN LÝ TÀI NGUYÊN SỐ & MEDIA PICKER MODAL)
- **Mục tiêu:** Xây dựng ứng dụng Media Library quản lý tài nguyên số (hình ảnh, tài liệu) dạng cây thư mục, hỗ trợ upload nhiều tệp tin, tự động tạo ảnh thu nhỏ (thumbnail), và cung cấp cửa sổ Media Picker tích hợp liền mạch vào các field kiểu Image trong Content Editor.
- **Phạm vi:**
  - *Làm:* Cây thư mục Media (phân cấp dưới `/sitecore/media library`); Upload file đơn và đa tệp sử dụng Multer; Tự động xử lý resize và thumbnail bằng `sharp`; Xem trước chi tiết media (kích thước, dung lượng, đường dẫn URL, alt text); Modal Media Picker tích hợp với Content Editor (chọn ảnh cho field Image, xem trước và gỡ bỏ ảnh).
  - *Không làm:* Chưa làm chỉnh sửa cắt cúp ảnh trực tiếp trên trình duyệt (image cropping tool).
- **Phụ thuộc:** GĐ 2, GĐ 3.
- **Danh sách Task:**
  - [ ] **Task 5.1:** Xây dựng Mongoose Model `Media` (`src/models/Media.js`) lưu trữ: `name`, `displayName`, `isFolder`, `parentId`, `ancestors`, `path`, `fileDetails` (storagePath, thumbnailPath, mimeType, fileSize, dimensions), `altText`.
  - [ ] **Task 5.2:** Cấu hình middleware `uploadMiddleware.js` sử dụng Multer: lọc loại file an toàn (jpeg, png, webp, svg, pdf), giới hạn kích thước (tối đa 10MB), lưu file vào thư mục `storage/uploads/YYYY/MM/`.
  - [ ] **Task 5.3:** Xây dựng `mediaService.js`:
    - Quản lý thư mục media: tạo thư mục, lấy danh sách theo thư mục cha.
    - Xử lý file upload: gọi thư viện Sharp tạo ảnh thu nhỏ lưu vào `storage/thumbnails/`.
    - Xóa file media (xóa bản ghi và xóa tệp vật lý trên đĩa).
  - [ ] **Task 5.4:** Xây dựng `mediaController.js` và route `src/routes/admin/mediaRoutes.js`:
    - `GET /admin/media-library`: Màn hình ứng dụng Media Library đầy đủ.
    - `POST /admin/media/upload`: Tiếp nhận upload tệp tin.
    - `POST /admin/media/create-folder`: Tạo thư mục media mới.
    - `GET /admin/media/picker`: Modal chọn ảnh dành cho Content Editor.
    - `GET /media/file/:id`: Route stream trả về tệp ảnh gốc hoặc thumbnail.
  - [ ] **Task 5.5:** Thiết kế giao diện EJS Media Library:
    - `src/views/admin/media/library.ejs`: Cây thư mục bên trái, lưới hiển thị thumbnail ở giữa, bảng thuộc tính chi tiết bên phải.
    - `src/views/admin/media/picker-modal.ejs`: Cửa sổ pop-up cho phép duyệt cây media và chọn 1 ảnh để gán vào form.
  - [ ] **Task 5.6:** Tích hợp field `Image` vào Content Editor:
    - Khi field có `type === "Image"`, hiển thị khung xem trước ảnh, nút "Browse" (mở Media Picker), và nút "Clear".
    - Khi người dùng chọn ảnh từ modal -> cập nhật ID và URL ảnh vào field tương ứng và hiển thị ngay preview.
- **File/Thư mục dự kiến:**
  - `src/models/Media.js`
  - `src/middlewares/uploadMiddleware.js`
  - `src/services/mediaService.js`
  - `src/controllers/admin/mediaController.js`
  - `src/routes/admin/mediaRoutes.js`
  - `src/views/admin/media/library.ejs`, `src/views/admin/media/picker-modal.ejs`
  - `src/public/js/media-library.js`, `src/public/js/media-picker.js`
- **Route / API dự kiến:**
  - `GET /admin/media-library`
  - `POST /admin/media/upload`
  - `POST /admin/media/create-folder`
  - `DELETE /admin/media/:id`
  - `GET /admin/media/picker`
  - `GET /media/file/:id`
- **Thay đổi Database:** Collection `media` với các index `{ parentId: 1 }`, `{ path: 1 }`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Mở ứng dụng Media Library từ Launchpad hoặc Taskbar.
  - Tạo thư mục con "Banners" bên dưới Media Library.
  - Upload thử 2 bức ảnh JPG vào thư mục "Banners" -> Hệ thống sinh thumbnail hiển thị mượt mà trên giao diện lưới.
  - Click vào 1 ảnh -> Hiển thị chính xác kích thước (width x height), dung lượng (KB), và cho phép sửa `Alt Text`.
  - Quay lại Content Editor, mở một trang có trường `Hero Image`.
  - Bấm nút "Browse" -> Modal Media Picker mở ra, điều hướng tới thư mục "Banners" và chọn bức ảnh vừa upload.
  - Bấm "Select" -> Modal đóng lại, form lập tức hiển thị hình ảnh preview vừa chọn. Bấm "Save" lưu thành công.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Người dùng tải lên mã độc trá hình (ví dụ file `.php`, `.exe` đổi đuôi thành `.jpg`).
  - *Giảm thiểu:* Kiểm tra MIME-type thực tế dựa trên magic bytes thay vì chỉ dựa vào phần mở rộng tệp tin; lưu tệp ngoài thư mục thực thi công khai và stream qua controller.
- **Ước tính thời gian:** 2.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 6 (GĐ 6): BẢO MẬT NÂNG CAO & PHÂN QUYỀN TRUY CẬP (ITEM-LEVEL ACL & ACCESS VIEWER)
- **Mục tiêu:** Xây dựng hệ thống bảo mật phân quyền chi tiết tới từng Item theo mô hình Sitecore: quản lý User/Role, gán quyền trên Item (Read, Write, Create, Delete, Administer, Publish) với cơ chế kế thừa phân cấp từ cha xuống con, hỗ trợ quyền ghi đè (Allow / Deny / Inherit) và công cụ trực quan hóa Access Viewer.
- **Phạm vi:**
  - *Làm:* Quản lý User và Role (CRUD, gán role cho user); Bảng phân quyền `AccessControl`; Thuật toán tính toán quyền hiệu dụng (Effective Rights Calculation: Deny luôn thắng Allow; quyền gán trực tiếp trên item ưu tiên hơn quyền kế thừa; quyền của Role kết hợp); Giao diện phân quyền trên Ribbon tab "Security"; Ứng dụng "Access Viewer" dạng bảng ma trận hiển thị quyền của user trên toàn bộ cây.
  - *Không làm:* Chưa làm Single Sign-On (SSO) SAML/OAuth2 ngoài hệ thống.
- **Phụ thuộc:** GĐ 1, GĐ 2.
- **Danh sách Task:**
  - [ ] **Task 6.1:** Xây dựng Mongoose Model `AccessControl` (`src/models/AccessControl.js`).
  - [ ] **Task 6.2:** Xây dựng module tính toán quyền `aclService.js`:
    - `getEffectivePermissions(itemId, userId)`: Tính toán quyền thực tế của một user trên một item dựa trên cây tổ tiên (`ancestors`) và tất cả các Role của user.
    - Quy tắc đánh giá quyền: Explicit Deny > Explicit Allow > Inherited Deny > Inherited Allow > Default Deny.
    - `setItemPermission(itemId, identityType, identityId, permissions, applyToDescendants)`.
  - [ ] **Task 6.3:** Xây dựng middleware `aclMiddleware.js` bảo vệ các thao tác biên tập:
    - Kiểm tra quyền `read` trước khi cho phép xem item.
    - Kiểm tra quyền `write` trước khi cho phép lưu form item.
    - Kiểm tra quyền `create` trước khi cho phép insert item con.
    - Kiểm tra quyền `delete` trước khi cho phép xóa item.
  - [ ] **Task 6.4:** Xây dựng các ứng dụng quản trị bảo mật:
    - User Manager: Tạo, sửa, khóa tài khoản, gán roles (`src/views/admin/security/users.ejs`).
    - Role Manager: Tạo role, gán quyền mặc định (`src/views/admin/security/roles.ejs`).
    - Access Viewer: Bảng ma trận trực quan hóa quyền của từng user/role trên từng node cây (`src/views/admin/security/access-viewer.ejs`).
  - [ ] **Task 6.5:** Bổ sung Tab "Security" trên Ribbon của Content Editor:
    - Nút "Assign Permissions": Mở modal cấu hình quyền trực tiếp cho item hiện tại.
    - Nút "Access Viewer": Mở nhanh công cụ kiểm tra quyền.
- **File/Thư mục dự kiến:**
  - `src/models/AccessControl.js`
  - `src/services/aclService.js`
  - `src/middlewares/aclMiddleware.js`
  - `src/controllers/admin/securityController.js`
  - `src/routes/admin/securityRoutes.js`
  - `src/views/admin/security/users.ejs`, `src/views/admin/security/roles.ejs`, `src/views/admin/security/access-viewer.ejs`
  - `src/views/admin/security/modals/assign-permissions-modal.ejs`
- **Route / API dự kiến:**
  - `GET /admin/security/users`, `POST /admin/security/users/create`, `POST /admin/security/users/:id/update`
  - `GET /admin/security/roles`, `POST /admin/security/roles/create`
  - `GET /admin/security/access-viewer?identityId=...&identityType=...`
  - `POST /admin/security/item/:id/permissions`
- **Thay đổi Database:** Collection `access_control_lists` với index `{ itemId: 1, identityType: 1, identityId: 1 }`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Tạo một Role mới `Content Authors` và một User `john_editor` thuộc role này.
  - Cấu hình quyền trên node `/sitecore/content/home`: Role `Content Authors` được quyền `Read` và `Write`, nhưng bị `Deny Delete`.
  - Đăng nhập với tài khoản `john_editor`:
    - Người này xem và sửa được nội dung của trang `home`.
    - Nút "Delete" trên Ribbon bị mờ (disabled) hoặc khi cố tình gọi API xóa thì nhận thông báo lỗi HTTP 403 "Permission Denied".
  - Mở "Access Viewer", chọn user `john_editor`: Hệ thống hiển thị bảng ma trận với các dấu tích xanh (Allow) cho Read/Write và dấu gạch chéo đỏ (Deny) cho Delete trên toàn bộ nhánh cây `home` do tính kế thừa.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Truy vấn tính toán quyền phân cấp làm chậm tốc độ render cây nội dung.
  - *Giảm thiểu:* Sử dụng truy vấn gộp lấy toàn bộ quy tắc ACL của danh sách `ancestors` trong một câu lệnh MongoDB duy nhất và tính toán in-memory tại tầng service.
- **Ước tính thời gian:** 3 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 7 (GĐ 7): WORKFLOW ENGINE, WORKBOX & PUBLISHING (MASTER → WEB)
- **Mục tiêu:** Xây dựng quy trình phê duyệt nội dung (Workflow Engine) kết hợp ứng dụng Workbox cho biên tập viên, và cơ chế Xuất bản (Publishing Engine) chuyển dữ liệu từ `items_master` sang `items_web`.
- **Phạm vi:**
  - *Làm:* Model Workflow (Draft -> In Review -> Approved); Workbox hiển thị các item đang chờ duyệt theo quyền của reviewer; Chuyển trạng thái workflow (Submit, Approve, Reject); Publishing Engine hỗ trợ 3 chế độ: Incremental Publish, Smart Publish (so sánh ngày cập nhật), và Republish (toàn bộ cây); Tách biệt collection `items_master` và `items_web`.
  - *Không làm:* Chưa làm tính năng hẹn giờ publish bằng Cron nâng cao (đưa vào GĐ 10 nếu cần).
- **Phụ thuộc:** GĐ 2, GĐ 4, GĐ 6.
- **Danh sách Task:**
  - [ ] **Task 7.1:** Xây dựng Mongoose Model `Workflow` (`src/models/Workflow.js`) và `PublishedItem` (`src/models/PublishedItem.js` ánh xạ tới collection `items_web`).
  - [ ] **Task 7.2:** Xây dựng Model `PublishHistory` (`src/models/PublishHistory.js`) lưu lại nhật ký các lần publish.
  - [ ] **Task 7.3:** Xây dựng `workflowService.js`:
    - Lấy trạng thái hiện tại của item version.
    - Thực hiện chuyển trạng thái (Execute Action: ví dụ "Submit for Review", "Approve", "Reject").
    - Lấy danh sách các item đang chờ duyệt thuộc quyền của user hiện tại cho màn hình Workbox.
  - [ ] **Task 7.4:** Xây dựng `publishService.js`:
    - Sao chép phiên bản mới nhất ở trạng thái "Approved" từ `items_master` sang `items_web`.
    - Chế độ Smart Publish: Chỉ publish những item có `updatedAt` mới hơn thời điểm publish lần trước.
    - Chế độ Republish: Ghi đè toàn bộ cây con sang `items_web`.
    - Xử lý xóa trên `items_web` đối với các item đã bị xóa trên Master.
  - [ ] **Task 7.5:** Xây dựng ứng dụng Workbox:
    - Route `GET /admin/workbox`, controller và view `src/views/admin/workflow/workbox.ejs`.
    - Cho phép duyệt nhanh nhiều item cùng lúc (Approve Selected, Reject Selected kèm lý do phản hồi).
  - [ ] **Task 7.6:** Tích hợp Workflow và Publishing lên Content Editor:
    - Cảnh báo trạng thái Workflow trên thanh thông tin đầu form (Item Info Bar): "This item is in Draft state".
    - Tab "Review" trên Ribbon: Hiển thị các nút hành động tương ứng với trạng thái hiện tại (Submit, Approve...).
    - Tab "Publish" trên Ribbon: Nút "Publish Item" mở hộp thoại chọn chế độ publish, chọn ngôn ngữ và tùy chọn "Publish sub-items".
- **File/Thư mục dự kiến:**
  - `src/models/Workflow.js`, `src/models/PublishedItem.js`, `src/models/PublishHistory.js`
  - `src/services/workflowService.js`, `src/services/publishService.js`
  - `src/controllers/admin/workflowController.js`, `src/controllers/admin/publishController.js`
  - `src/routes/admin/workflowRoutes.js`, `src/routes/admin/publishRoutes.js`
  - `src/views/admin/workflow/workbox.ejs`
  - `src/views/admin/publish/publish-dialog.ejs`, `src/views/admin/publish/publish-status.ejs`
- **Route / API dự kiến:**
  - `GET /admin/workbox`
  - `POST /admin/workflow/action`: Thực thi chuyển bước duyệt.
  - `GET /admin/publish/dialog`: Mở modal cấu hình publish.
  - `POST /admin/publish/execute`: Chạy tác vụ publish.
  - `GET /admin/publish/status/:id`: Kiểm tra tiến độ publish.
- **Thay đổi Database:**
  - Tạo collection `items_web` (bản sao tối ưu của `items_master` đã published).
  - Collections `workflows`, `publish_histories`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Biên tập viên sửa bài viết, trạng thái bài viết là `Draft`. Bấm "Submit for Review" trên Ribbon -> Trạng thái chuyển thành `Awaiting Approval`.
  - Quản trị viên mở ứng dụng Workbox -> Thấy bài viết trên xuất hiện trong danh sách chờ duyệt.
  - Quản trị viên bấm "Approve" -> Trạng thái chuyển thành `Approved`.
  - Trên Ribbon, bấm "Publish Item" -> Chọn "Smart Publish", bao gồm cả sub-items.
  - Hệ thống thực hiện publish và thông báo thành công.
  - Kiểm tra database: Bản ghi tương ứng đã xuất hiện trong collection `items_web` với dữ liệu chính xác, trong khi các item đang ở trạng thái `Draft` tuyệt đối không được đưa sang `items_web`.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Quá trình Publish cây lớn làm khóa database hoặc nghẽn luồng xử lý của Node.js.
  - *Giảm thiểu:* Thực hiện publish theo batch (từng cụm 50-100 items), xử lý bất đồng bộ và trả về tiến trình (progress bar) cho client theo dõi.
- **Ước tính thời gian:** 3.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 8 (GĐ 8): THÙNG RÁC & NHẬT KÝ KIỂM TOÁN (RECYCLE BIN & AUDIT LOG)
- **Mục tiêu:** Đảm bảo an toàn dữ liệu với cơ chế xóa mềm (Soft Delete) đưa item vào Thùng rác (Recycle Bin) cho phép khôi phục nguyên trạng vị trí trên cây, kết hợp ghi nhận toàn bộ hoạt động của người dùng vào Nhật ký kiểm toán (Audit Log) để truy vết.
- **Phạm vi:**
  - *Làm:* Cơ chế Soft-delete trên Item (`isDeleted: true`, ghi nhận ngày xóa và người xóa); Ứng dụng Recycle Bin: xem danh sách item đã xóa, khôi phục item về vị trí cha cũ (nếu cha bị xóa thì khôi phục về root hoặc cảnh báo), xóa vĩnh viễn (Hard Delete); Ghi nhận tự động Audit Log cho các hành vi: Login, Logout, Create, Update, Delete, Publish, Workflow state change; Màn hình xem Audit Log có bộ lọc theo User, Action, và khoảng thời gian.
  - *Không làm:* Chưa làm tự động dọn dẹp thùng rác theo lịch định kỳ (retention policy).
- **Phụ thuộc:** GĐ 2, GĐ 7.
- **Danh sách Task:**
  - [ ] **Task 8.1:** Xây dựng Mongoose Model `AuditLog` (`src/models/AuditLog.js`) với các trường: `userId`, `username`, `action`, `targetItemId`, `itemPath`, `details` (oldValues, newValues), `ipAddress`, `timestamp`.
  - [ ] **Task 8.2:** Xây dựng `auditService.js` cung cấp hàm `logAction(req, action, targetItem, details)` và hàm truy vấn log có phân trang, lọc theo điều kiện.
  - [ ] **Task 8.3:** Tích hợp gọi `auditService.logAction` vào tất cả các tác vụ trọng yếu trong hệ thống (Auth, Item CRUD, Publish, Workflow).
  - [ ] **Task 8.4:** Cập nhật `itemService.deleteItem`: Chuyển cờ `isDeleted = true` thay vì xóa vật lý khỏi MongoDB; ẩn các item này khỏi Cây nội dung của Content Editor.
  - [ ] **Task 8.5:** Xây dựng tính năng khôi phục trong `itemService.restoreItem(id)`: Đặt `isDeleted = false`, kiểm tra xem node cha cũ còn tồn tại hay không, tự động gắn lại vào cây.
  - [ ] **Task 8.6:** Xây dựng ứng dụng Recycle Bin:
    - Controller và route `src/routes/admin/recycleBinRoutes.js` (`GET /admin/recycle-bin`).
    - View EJS `src/views/admin/recycle-bin/index.ejs`: Danh sách các item trong thùng rác, nút "Restore" và "Delete Permanently".
  - [ ] **Task 8.7:** Xây dựng ứng dụng Audit Log Viewer:
    - Controller và route `src/routes/admin/auditRoutes.js` (`GET /admin/audit-log`).
    - View EJS `src/views/admin/audit/viewer.ejs`: Bảng hiển thị lịch sử thay đổi có bộ lọc tìm kiếm và modal xem chi tiết diff.
- **File/Thư mục dự kiến:**
  - `src/models/AuditLog.js`
  - `src/services/auditService.js`
  - `src/controllers/admin/recycleBinController.js`, `src/controllers/admin/auditController.js`
  - `src/routes/admin/recycleBinRoutes.js`, `src/routes/admin/auditRoutes.js`
  - `src/views/admin/recycle-bin/index.ejs`, `src/views/admin/audit/viewer.ejs`
- **Route / API dự kiến:**
  - `GET /admin/recycle-bin`
  - `POST /admin/recycle-bin/restore/:id`
  - `POST /admin/recycle-bin/purge/:id`
  - `GET /admin/audit-log`
  - `GET /admin/audit-log/details/:id`
- **Thay đổi Database:** Collection `audit_logs` với các index `{ timestamp: -1 }`, `{ targetItemId: 1 }`, `{ userId: 1 }`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Xóa thử một item bài viết trên Content Editor -> Item biến mất khỏi cây.
  - Mở ứng dụng Recycle Bin từ Launchpad -> Thấy bài viết vừa xóa xuất hiện trong danh sách với đầy đủ thông tin đường dẫn gốc.
  - Bấm nút "Restore" -> Item biến mất khỏi thùng rác.
  - Quay lại Content Editor -> Item đã xuất hiện trở lại đúng vị trí phân cấp cũ trên cây.
  - Mở ứng dụng Audit Log -> Thấy ghi nhận rõ ràng 2 dòng log: hành động `ITEM_DELETE` và `ITEM_RESTORE` kèm tên người thực hiện và mốc thời gian chính xác.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Bảng `audit_logs` tăng dung lượng nhanh chóng theo thời gian.
  - *Giảm thiểu:* Thiết lập index tối ưu và chuẩn bị sẵn cơ chế TTL Index (Time-To-Live) hoặc script lưu trữ nén (archive) khi dữ liệu vượt ngưỡng.
- **Ước tính thời gian:** 2 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 9 (GĐ 9): HEADLESS DELIVERY API & BỘ NHỚ ĐỆM (DELIVERY API & CACHE)
- **Mục tiêu:** Cung cấp hệ thống RESTful JSON API công khai (Headless Delivery API) đọc dữ liệu từ `items_web`, hỗ trợ lấy nội dung theo Item ID, theo Path, lấy danh sách con cháu, tích hợp cơ chế Caching in-memory giúp phản hồi cực nhanh cho các ứng dụng ngoài (Next.js/React).
- **Phạm vi:**
  - *Làm:* Bộ API `/api/v1/content/*` đọc độc quyền từ collection `items_web`; Chuẩn hóa cấu trúc JSON đầu ra (flatten fields, resolve media URL); Hỗ trợ tham số truy vấn: `language`, `depth` (độ sâu con cháu); Tích hợp bộ nhớ đệm (In-memory Cache bằng `node-cache` hoặc LRU cache); Cơ chế tự động xóa cache (Cache Invalidation) ngay khi một sự kiện Publish hoàn tất; Giới hạn tần suất gọi API (Rate Limiting).
  - *Không làm:* Chưa làm GraphQL API (tập trung tối ưu RESTful JSON trước).
- **Phụ thuộc:** GĐ 7.
- **Danh sách Task:**
  - [ ] **Task 9.1:** Xây dựng module cache `src/utils/cacheManager.js` quản lý lưu và xóa cache theo tag/key.
  - [ ] **Task 9.2:** Xây dựng `deliveryService.js`:
    - `getPublishedItemByPath(path, language)`
    - `getPublishedItemById(id, language)`
    - `getChildren(id, language)`
    - Tự động chuyển đổi các trường Media ID thành URL đầy đủ (`/media/file/:id`).
  - [ ] **Task 9.3:** Xây dựng `deliveryController.js` và route `src/routes/api/v1/deliveryRoutes.js`:
    - `GET /api/v1/content/item?path=/sitecore/content/home&lang=en`
    - `GET /api/v1/content/item/:id?lang=en`
    - `GET /api/v1/content/children/:id?lang=en`
  - [ ] **Task 9.4:** Tích hợp middleware xóa cache vào `publishService.js`: Ngay khi tác vụ publish hoàn thành, tự động invalidate các cache key tương ứng.
  - [ ] **Task 9.5:** Cấu hình bảo mật và giới hạn tốc độ: Sử dụng `express-rate-limit` bảo vệ endpoint `/api/v1/*` chống tấn công DDoS.
- **File/Thư mục dự kiến:**
  - `src/utils/cacheManager.js`
  - `src/services/deliveryService.js`
  - `src/controllers/api/deliveryController.js`
  - `src/routes/api/v1/deliveryRoutes.js`
- **Route / API dự kiến:**
  - `GET /api/v1/content/item?path=...`
  - `GET /api/v1/content/item/:id`
  - `GET /api/v1/content/children/:id`
- **Thay đổi Database:** Không thay đổi schema (truy vấn trực tiếp trên `items_web`).
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Gọi Postman hoặc trình duyệt tới `http://localhost:3000/api/v1/content/item?path=/sitecore/content/home&lang=en`.
  - Nhận về phản hồi JSON chuẩn có HTTP Status 200, chứa toàn bộ trường của trang chủ đã publish.
  - Kiểm tra Header phản hồi: Lần gọi thứ 2 thấy thời gian phản hồi giảm xuống dưới 10ms do hit cache (`X-Cache: HIT`).
  - Vào CMS, sửa trang chủ và Publish lại -> Gọi lại API, thấy dữ liệu đã được cập nhật mới nhất (cache đã tự động xóa).
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Lộ dữ liệu nhạy cảm hoặc dữ liệu draft chưa qua phê duyệt.
  - *Giảm thiểu:* Delivery API tuyệt đối không truy vấn vào collection `items_master`, chỉ đọc từ `items_web` và lọc bỏ các metadata nội bộ không cần thiết.
- **Ước tính thời gian:** 1.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 10 (GĐ 10): MỞ RỘNG TÍNH NĂNG (FORMS BUILDER, SERIALIZATION, TÌM KIẾM & CONTROL PANEL)
- **Mục tiêu:** Bổ sung các công cụ cao cấp gia tăng sức mạnh hệ sinh thái CMS: Forms Builder (kéo thả biểu mẫu khảo sát/liên hệ), Serialization (kết xuất và nhập khẩu dữ liệu Item ra tệp JSON phục vụ backup/di chuyển môi trường), Full-text search toàn hệ thống, và Control Panel quản trị hệ thống.
- **Phạm vi:**
  - *Làm:*
    - **Forms Builder:** Thiết kế form kéo thả trường (Text, Email, Dropdown, Button), lưu trữ submission của người dùng.
    - **Serialization:** Tính năng "Serialize Item / Tree" xuất toàn bộ nhánh cây ra tệp JSON và "Sync/Deserialize" nhập lại vào hệ thống.
    - **Full-Text Search:** Ô tìm kiếm trên Cây nội dung và tìm kiếm nâng cao theo từ khóa, template, ngày tạo.
    - **Control Panel:** Màn hình quản trị cấu hình hệ thống, dọn dẹp cache, xem thông số MongoDB.
  - *Không làm:* Chưa làm tích hợp gửi mail SMTP thực tế của form submission (chỉ lưu vào database).
- **Phụ thuộc:** GĐ 2, GĐ 3, GĐ 7.
- **Danh sách Task:**
  - [ ] **Task 10.1:** Xây dựng tính năng Serialization trong `serializationService.js`:
    - `exportTreeToJson(rootItemId)`: Đệ quy xuất item và toàn bộ con cháu kèm metadata và versions thành 1 file JSON tải về.
    - `importTreeFromJson(jsonData, targetParentId)`: Đọc file JSON và tạo/cập nhật tương ứng vào MongoDB.
  - [ ] **Task 10.2:** Tích hợp Serialization vào Ribbon Tab "Developer" hoặc "Configure" trên Content Editor.
  - [ ] **Task 10.3:** Xây dựng tính năng Tìm kiếm `searchService.js`: Sử dụng MongoDB Text Index trên các trường `displayName`, `fields` của Item để tìm kiếm nhanh từ khóa; hỗ trợ tìm theo đường dẫn và template.
  - [ ] **Task 10.4:** Bổ sung ô Search nhanh ngay phía trên Cây nội dung Content Editor (gõ từ khóa -> lọc danh sách kết quả trực tiếp).
  - [ ] **Task 10.5:** Xây dựng Forms Builder:
    - Model `CmsForm` và `FormSubmission`.
    - Giao diện kéo thả form fields sử dụng SortableJS (`src/views/admin/forms/form-designer.ejs`).
    - API tiếp nhận nộp form từ frontend.
  - [ ] **Task 10.6:** Xây dựng ứng dụng Control Panel (`src/views/admin/control-panel/index.ejs`):
    - Quản trị dọn dẹp cache hệ thống (Flush Cache).
    - Thống kê dung lượng database, số lượng items, số lượng media files.
    - Re-index tìm kiếm.
- **File/Thư mục dự kiến:**
  - `src/models/CmsForm.js`, `src/models/FormSubmission.js`
  - `src/services/serializationService.js`, `src/services/searchService.js`
  - `src/controllers/admin/formBuilderController.js`, `src/controllers/admin/controlPanelController.js`
  - `src/routes/admin/formBuilderRoutes.js`, `src/routes/admin/controlPanelRoutes.js`
  - `src/views/admin/forms/*.ejs`, `src/views/admin/control-panel/index.ejs`
- **Route / API dự kiến:**
  - `GET /admin/control-panel`
  - `POST /admin/control-panel/flush-cache`
  - `POST /admin/control-panel/rebuild-index`
  - `GET /admin/serialization/export?itemId=...`
  - `POST /admin/serialization/import`
  - `GET /admin/content-editor/search?q=...`
  - `GET /admin/forms`, `GET /admin/forms/designer/:id`
- **Thay đổi Database:**
  - Collections `cms_forms`, `form_submissions`.
  - Tạo Text Index trên collection `items_master`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Chọn một nhánh cây nội dung, bấm "Export Tree" -> Tải về file `.json` chứa đầy đủ cấu trúc phân cấp.
  - Thử xóa một item con, sau đó bấm "Import Tree" chọn file vừa xuất -> Cây nội dung được phục hồi trọn vẹn.
  - Gõ từ khóa vào ô tìm kiếm trên cây nội dung -> Trả về danh sách các item khớp nội dung trong vòng dưới 100ms.
  - Vào Forms Builder, tạo một form "Liên hệ" gồm 3 trường: Họ tên, Email, Nội dung. Lưu thành công và xem lại bản thiết kế.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Tệp JSON import quá lớn gây tràn bộ nhớ Node.js.
  - *Giảm thiểu:* Sử dụng JSON stream parser (`stream-json`) khi xử lý file import kích thước lớn.
- **Ước tính thời gian:** 3.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 11 (GĐ 11): HOÀN THIỆN, BẢO MẬT, HIỆU NĂNG, TÀI LIỆU & DOCKER
- **Mục tiêu:** Kiểm thử toàn diện hệ thống (Unit / Integration Test), tối ưu hóa hiệu năng truy vấn database, rà soát lỗ hổng bảo mật, đóng gói container hóa bằng Docker & Docker Compose, và hoàn thiện bộ tài liệu hướng dẫn vận hành.
- **Phạm vi:**
  - *Làm:*
    - Viết bộ test tự động (Jest / Supertest) kiểm thử các service trọng yếu (Item CRUD, Tree calculation, ACL calculation, Publish).
    - Rà soát bảo mật: kiểm tra escape EJS, chống NoSQL Injection, kiểm tra CSRF token toàn bộ forms, bảo vệ HTTP headers với Helmet.
    - Tối ưu hóa hiệu năng: kiểm tra execution plan MongoDB (`explain()`), bảo đảm 100% các câu truy vấn cây đều sử dụng index tối ưu.
    - Container hóa: Viết `Dockerfile` và `docker-compose.yml` (bao gồm App Node.js và MongoDB sẵn sàng chạy chỉ với 1 lệnh).
    - Tài liệu: `README.md` hoàn chỉnh hướng dẫn cài đặt, cấu hình, kiến trúc và vận hành.
  - *Không làm:* Chưa triển khai hạ tầng Kubernetes phân tán.
- **Phụ thuộc:** Hoàn thành toàn bộ từ GĐ 0 đến GĐ 10.
- **Danh sách Task:**
  - [ ] **Task 11.1:** Thiết lập framework kiểm thử tự động với Jest và Supertest.
  - [ ] **Task 11.2:** Viết bộ kiểm thử Unit Test cho `aclService.js` (kiểm tra tính toán quyền kế thừa và quyền ghi đè).
  - [ ] **Task 11.3:** Viết bộ kiểm thử Integration Test cho các luồng: Đăng nhập -> Tạo Template -> Tạo Item -> Chuyển Workflow -> Publish ra Web -> Gọi Delivery API.
  - [ ] **Task 11.4:** Rà soát và vá các lỗ hổng bảo mật tiềm ẩn (CSRF, XSS, NoSQL Injection, Brute Force).
  - [ ] **Task 11.5:** Tối ưu hóa Database: Tạo compound index cho các truy vấn phức tạp, loại bỏ các index dư thừa.
  - [ ] **Task 11.6:** Xây dựng `Dockerfile` đa tầng (multi-stage build) tối ưu kích thước image và thiết lập người dùng non-root an toàn.
  - [ ] **Task 11.7:** Xây dựng `docker-compose.yml` kết nối container ứng dụng Node.js với container MongoDB kèm persistent volume.
  - [ ] **Task 11.8:** Soạn thảo tài liệu `README.md` và tài liệu hướng dẫn sử dụng giao diện CMS cho người dùng cuối.
- **File/Thư mục dự kiến:**
  - `tests/unit/aclService.test.js`, `tests/integration/contentFlow.test.js`
  - `Dockerfile`, `docker-compose.yml`, `.dockerignore`
  - `README.md`
- **Route / API dự kiến:** Đảm bảo toàn bộ route hiện hữu hoạt động ổn định và đạt chuẩn kiểm thử.
- **Thay đổi Database:** Bổ sung các compound indexes hoàn thiện.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Chạy `npm test` -> 100% các ca kiểm thử tự động đều PASS.
  - Chạy lệnh `docker compose up --build` -> Toàn bộ hệ thống khởi chạy trơn tru, seed data tự động được nạp, truy cập web hoạt động hoàn hảo.
  - Kiểm tra rà soát bảo mật không phát hiện lỗi rò rỉ token hoặc không escape mã HTML.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Dung lượng Docker image quá nặng hoặc kết nối giữa container app và container mongo bị timeout.
  - *Giảm thiểu:* Sử dụng base image `node:20-alpine`, sử dụng Docker healthcheck để đảm bảo MongoDB sẵn sàng trước khi app khởi động.
- **Ước tính thời gian:** 3 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

## 6. BẢNG TỔNG HỢP TIẾN ĐỘ

| Giai đoạn | Tên giai đoạn | Trạng thái | Ngày bắt đầu | Ngày hoàn thành | Ghi chú |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **GĐ 0** | Khởi tạo nền tảng & Layout Shell | **Hoàn thành** | 2026-11-03 | 2026-11-03 | Hoàn tất cấu trúc dự án, layout shell, CSS Sitecore và smoke tests |
| **GĐ 1** | Nền tảng xác thực & Launchpad | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 2** | Content Editor MVP (Cây, CRUD, Ribbon Home) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 3** | Template Manager (Fields, Kế thừa, Insert Options) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 4** | Quản lý Phiên bản & Đa ngôn ngữ | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 5** | Media Library & Media Picker Modal | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 6** | Bảo mật nâng cao & Phân quyền truy cập (ACL) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 7** | Workflow Engine, Workbox & Publishing (Master -> Web) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 8** | Thùng rác (Recycle Bin) & Nhật ký kiểm toán (Audit Log) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 9** | Headless Delivery API & Bộ nhớ đệm (Cache) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 10** | Mở rộng tính năng (Forms, Serialization, Search) | **Chưa bắt đầu** | - | - | Chờ phê duyệt |
| **GĐ 11** | Hoàn thiện, Bảo mật, Hiệu năng, Test & Docker | **Chưa bắt đầu** | - | - | Chờ phê duyệt |

---

## 7. CÂU HỎI CẦN XÁC NHẬN (KÈM ĐỀ XUẤT MẶC ĐỊNH)

1. **Cơ chế tách biệt Master và Web Database:**
   - *Lựa chọn A:* Dùng 2 database vật lý riêng biệt (ví dụ: `sitecore_master` và `sitecore_web`) cần quản lý 2 kết nối Mongoose riêng.
   - *Lựa chọn B (Đề xuất mặc định):* Dùng chung 1 database nhưng tách biệt 2 collections riêng (`items_master` và `items_web`).
   - *Lý do đề xuất:* Đơn giản hóa cấu hình kết nối, dễ quản lý backup và transaction trong môi trường phát triển ban đầu, trong khi vẫn đạt được sự cách ly dữ liệu tuyệt đối giữa bản soạn thảo và bản public.

2. **Thư viện Cây nội dung phía Client:**
   - *Lựa chọn A (Đề xuất mặc định):* **Fancytree**.
   - *Lựa chọn B:* **jsTree**.
   - *Lý do đề xuất:* Fancytree có hiệu năng render DOM ảo (Virtual Scrolling) tốt hơn khi danh sách node lên tới hàng ngàn item, hỗ trợ layout dạng bảng (table extension) nếu cần hiển thị cột thuộc tính giống Sitecore, và API xử lý Lazy Loading qua AJAX rất ổn định, sạch sẽ.

3. **Cơ chế tải Form Item trong Content Editor:**
   - *Lựa chọn A (Đề xuất mặc định):* Khi click vào node trên cây, gửi AJAX gọi endpoint trả về **Partial HTML** (`item-form.ejs`) và nạp trực tiếp vào DOM.
   - *Lựa chọn B:* Client nhận JSON từ server và tự dùng JavaScript client-side để render các thẻ input HTML.
   - *Lý do đề xuất:* Lựa chọn A phát huy tối đa sức mạnh của EJS Server-Side Rendering: logic render trường phức tạp, kiểm tra quyền read/write, và hiển thị cảnh báo được tính toán tập trung trên server, mã client-side cực kỳ nhẹ và bảo mật.

4. **Kiến trúc lưu trữ các trường dữ liệu động (Item Fields):**
   - *Lựa chọn A (Đề xuất mặc định):* Lưu trữ dạng Key-Value Object (`fields: { [fieldId]: value }`).
   - *Lựa chọn B:* Lưu trữ dạng mảng đối tượng (`fields: [ { fieldId: "...", value: "..." } ]`).
   - *Lý do đề xuất:* Dạng Key-Value Object cho phép truy xuất trực tiếp `fields[fieldId]` với độ phức tạp $O(1)$ mà không cần duyệt mảng, cú pháp trong EJS template ngắn gọn và trực quan hơn.

5. **Giải pháp kiểm soát CSRF Token cho tương tác lai (SSR Form + AJAX):**
   - *Lựa chọn A (Đề xuất mặc định):* Cơ chế Cookie-to-Header / Double Submit Cookie kết hợp Token trong hidden input. Server đọc token từ cả header `X-CSRF-Token` (đối với AJAX) và form field `_csrf` (đối với standard submit).
   - *Lý do đề xuất:* Tương thích hoàn hảo cho cả form submit truyền thống lẫn các thao tác ngầm (như đổi tên item trên cây, kéo thả sắp xếp).

6. **Lưu trữ Tệp tin Media:**
   - *Lựa chọn A (Đề xuất mặc định):* Lưu trữ tệp trên Local Disk tại thư mục `storage/uploads` và phân phối qua endpoint controller.
   - *Lựa chọn B:* Tích hợp Cloud Storage (Amazon S3 / Google Cloud Storage).
   - *Lý do đề xuất:* Giúp dự án chạy độc lập hoàn toàn mà không phụ thuộc vào tài khoản cloud hay chi phí bên ngoài; kiến trúc Service được thiết kế module hóa sẵn sàng đổi sang S3 Driver khi đưa lên production lớn.

---

## 8. NHẬT KÝ QUYẾT ĐỊNH (DECISION LOG)

- **[2026-11-03] - Quyết định Kiến trúc Cây nội dung:** Sử dụng kết hợp **Materialized Path + Ancestors Array** để tối ưu hóa đồng thời cả truy vấn lazy-load con trực tiếp lẫn truy vấn toàn bộ nhánh cây phục vụ Publish và Move.
- **[2026-11-03] - Quyết định Tầng điều khiển:** Mọi Controller (Admin và Public API) đều phải gọi qua Service chung, không truy vấn database trực tiếp từ Controller nhằm đảm bảo toàn vẹn nghiệp vụ.
- **[2026-11-03] - Quyết định Giao diện Form Editor:** Sử dụng mô hình Partial HTML SSR: Server render form EJS gửi về client khi click node, giữ mã client-side tối giản và bảo mật.
- **[2026-11-03] - Quyết định Logging (GĐ 0):** Sử dụng **Winston** làm logger tập trung; tự động định dạng màu và timestamp trên console môi trường dev, xuất JSON chuẩn trên môi trường production.
- **[2026-11-03] - Quyết định Layout Engine (GĐ 0):** Sử dụng **`express-ejs-layouts`** để tách biệt shell master layout (`shell.ejs`) và layout auth (`auth.ejs`), hỗ trợ trích xuất block styles/scripts tự động.
- **[2026-11-03] - Quyết định Kiến trúc CSS (GĐ 0):** Xây dựng bằng CSS thuần theo module `variables.css` (biến màu Sitecore navy, red, xám, và pastel tiles), `base.css`, `layout.css`, `components.css`. Không phụ thuộc Tailwind/Bootstrap.
- **[2026-11-03] - Quyết định Quản lý Kết nối MongoDB (GĐ 0):** Không block server crash khi MongoDB chưa bật trong môi trường dev; endpoint `/health` trả về trạng thái thực tế (`connected` hoặc `disconnected`) với graceful reconnection.

---

## 9. QUY TẮC LÀM VIỆC CỦA AI AGENT

Để đảm bảo chất lượng, tính kỷ luật và đúng phạm vi của dự án, AI Agent bắt buộc phải tuân thủ nghiêm ngặt các quy tắc sau trong suốt các phiên làm việc:

1. **Tuyệt đối tuân thủ cơ chế phê duyệt từng giai đoạn:**
   - Chỉ được phép viết code ứng dụng, cài đặt thư viện hoặc chạy lệnh khi người dùng gửi chính xác cú pháp: `APPROVE GĐ <số>` (ví dụ: `APPROVE GĐ 0`).
   - Mỗi lệnh phê duyệt chỉ cho phép thực hiện **đúng một giai đoạn duy nhất**. Tuyệt đối không tự ý làm gộp hoặc làm trước sang giai đoạn tiếp theo.
2. **Kỷ luật trước khi code:**
   - Trước khi bắt đầu viết code cho một giai đoạn, đọc lại `AGENTS.md`, nhắc lại phạm vi (In-Scope/Out-of-Scope) và danh sách task của giai đoạn đó cho người dùng.
3. **Thực hiện theo Checklist:**
   - Làm tuần tự theo từng task trong checklist `- [ ]`.
   - Hoàn thành task nào thì tick `[x]` ngay vào file `AGENTS.md`.
4. **Kỷ luật sau khi hoàn thành giai đoạn:**
   - Chạy kiểm tra (linting/test nếu có), kiểm tra thủ công theo mục "Definition of Done".
   - Cập nhật lại trạng thái của giai đoạn trong `AGENTS.md` thành `Hoàn thành`, ghi nhận các thay đổi hoặc quyết định phát sinh vào "Nhật ký quyết định".
   - Báo cáo kết quả ngắn gọn và **dừng lại chờ lệnh tiếp theo** từ người dùng.
5. **Xử lý khi có thay đổi hoặc vướng mắc:**
   - Nếu phát hiện vấn đề kỹ thuật làm lệch phạm vi hoặc cần thay đổi kế hoạch, AI Agent phải dừng lại và hỏi ý kiến người dùng trước khi tiếp tục. Không tự ý suy diễn.

