# TÀI LIỆU KIẾN TRÚC & KẾ HOẠCH DỰ ÁN (AGENTS.md)
**Hệ thống Quản trị Nội dung Phân cấp theo Phong cách Sitecore (Sitecore-like XM CMS)**

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Mục tiêu
Xây dựng một hệ thống CMS (Content Management System) quản trị nội dung dạng cây phân cấp (Hierarchical Content Tree) chuyên nghiệp, kế thừa các triết lý cốt lõi của **Sitecore Experience Management (XM)**:
- **Triết lý "Mọi thứ là Item" (Everything is an Item):** Không chỉ bài viết/trang web, mà cả Template (schema định nghĩa cấu trúc), Media Library (tài sản số), Workflow (quy trình duyệt), Presentation (Layout, Rendering, Device, Placeholder Settings dưới nhánh `/sitecore/layout`), và System Configuration đều được lưu trữ và quản lý dưới dạng các node (Item) trong cây nội dung.
- **Tách biệt Môi trường Biên tập và Phân phối (Master vs. Web):**
  - **Master Database/Collection:** Lưu trữ toàn bộ các phiên bản dự thảo (Drafts), lịch sử phiên bản (Version History), các cấu hình Presentation (Shared & Final Layouts), các trạng thái workflow chưa duyệt.
  - **Web Database/Collection:** Chỉ chứa phiên bản đã được xuất bản (Published & Active) cùng cấu hình Presentation hoàn chỉnh đã resolved sẵn sàng phục vụ cho Delivery API và Layout Service với hiệu năng cao và độ trễ thấp nhất.
- **Giao diện quản trị phong cách Sitecore:**
  - **Launchpad (Dashboard):** Màn hình ứng dụng dạng ô lưới (Tiles) phân nhóm chuyên môn (Marketing, Content Editing, Control Panel, Access Management...), phân quyền hiển thị theo Role người dùng.
  - **Content Editor:** Giao diện 3 phân vùng tiêu chuẩn: Ribbon tabs điều hướng trên cùng (Home, Navigate, Review, Publish, Versions, Configure, Presentation...), Cây nội dung (Content Tree) lazy-loading bên trái kèm ô tìm kiếm nhanh, Vùng soạn thảo form theo Section/Field ở giữa, và Taskbar chuyển nhanh ứng dụng dưới đáy màn hình.

### 1.2 Phạm vi dự án (In-Scope)
- Quản trị phân cấp cây nội dung với khả năng mở rộng không giới hạn độ sâu.
- Cơ chế Template linh hoạt: Section, Field Types (Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist), Base Template (kế thừa), Standard Values (giá trị mặc định), Insert Options (ràng buộc loại item con được tạo).
- Hệ thống Đa ngôn ngữ (Multilingual) và Đa phiên bản (Item Versioning) kèm tính năng so sánh (diff) và khôi phục (rollback).
- Thư viện tài nguyên số (Media Library) hỗ trợ quản lý thư mục, upload ảnh/file, resize tự động và bộ chọn Media Picker modal tích hợp vào form editor.
- **Kiến trúc Headless Presentation (Layout, Rendering, Placeholder Settings) theo Sitecore JSS Pattern:**
  - Quản lý Device (Default, Mobile), Layouts, Renderings và Placeholder Settings dưới dạng Items hệ thống (`/sitecore/layout/*`).
  - Cấu hình Presentation Details trực quan cho từng Item (chọn Layout theo Device, thêm/sắp xếp/xoá Rendering bằng SortableJS, gán Datasource Item, nhập Parameters).
  - Standard Presentation kế thừa từ Template, phân định Shared Layout (cấp item) và Final Layout (override theo language + version).
  - Nút xem trước JSON Presentation (Layout Preview) cho developer.
- Hệ thống phân quyền chi tiết (ACL - Access Control List) theo từng Item với cơ chế kế thừa quyền từ nút cha và quyền ghi đè (Allow, Deny, Inherit), bao gồm phân quyền Presentation.
- Workflow Engine phân quyền theo vai trò (Draft -> In Review -> Approved -> Rejected) kèm Workbox cho biên tập viên và Publishing Engine (Master sang Web bao gồm Item và Presentation).
- Thùng rác (Recycle Bin) cho phép soft-delete và khôi phục kèm Audit Log ghi nhận mọi biến động dữ liệu và Presentation.
- Headless Delivery API & Layout Service chuẩn JSON RESTful cung cấp nội dung và layout đã publish cho các frontend ứng dụng ngoài (React, Next.js, Mobile App) phân giải component tương ứng.
- Tiện ích mở rộng: Form Builder, Serialization (Export/Import cấu trúc và dữ liệu dạng JSON), Full-text search, Control Panel.

### 1.3 Ngoài phạm vi dự án (Out-of-Scope)
- Các tính năng xDB, CDP (Customer Data Platform), Real-time Personalization máy học phức tạp của Sitecore XP (tập trung 100% vào chức năng Core XM).
- WYSIWYG Experience Editor (soạn thảo trực tiếp trên trang live frontend dạng in-line) trong giai đoạn đầu; tập trung hoàn thiện Content Editor form-based chuẩn chỉ và ổn định. Admin CMS chỉ lưu **dữ liệu cấu hình** Layout/Rendering/Placeholder và trả JSON qua Layout Service; ứng dụng React frontend độc lập tự chịu trách nhiệm ánh xạ `componentName` sang React component thực tế. Admin **không** render React component. (Một bản Experience Editor rút gọn xem trước trong iframe có thể được cân nhắc ở giai đoạn mở rộng GĐ 11 với mức ưu tiên thấp).
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
│   │   │   ├── presentationRoutes.js   # Presentation Details, Layout, Rendering, Placeholder Settings
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
│   │           ├── layoutRoutes.js     # Layout Service: phân giải route, placeholders và render components
│   │           └── mediaApiRoutes.js   # Lấy tệp media
│   ├── controllers/                    # Tầng điều khiển (request-response)
│   │   ├── admin/                      # Admin controllers (gọi service, render EJS / trả JSON AJAX)
│   │   │   └── presentationController.js # Quản trị Presentation Details, Renderings
│   │   └── api/                        # API controllers (trả REST JSON chuẩn)
│   │       └── layoutController.js     # Layout Service controller phục vụ React frontend
│   ├── services/                       # Tầng nghiệp vụ cốt lõi (Business Logic độc lập)
│   │   ├── itemService.js              # CRUD item, tree traversal, resolve field inheritance
│   │   ├── templateService.js          # Phân giải template, kế thừa base template, standard values
│   │   ├── presentationService.js      # Gộp Layout, Renderings, Placeholders (Shared + Final override)
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
│   │   │   └── modals/                 # Các cửa sổ bật lên (Insert, Rename, Media Picker, Access, Presentation Details)
│   │   └── admin/                      # Màn hình nghiệp vụ chi tiết
│   │       ├── auth/                   # login.ejs, forgot-password.ejs
│   │       ├── launchpad/              # index.ejs
│   │       ├── content-editor/         # index.ejs, item-form.ejs, folder-view.ejs
│   │       │   └── presentation/       # details-modal.ejs, select-rendering-modal.ejs, rendering-instance-modal.ejs, preview-json-modal.ejs
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
│       ├── js/                         # Script điều khiển UI (ribbon tabs, modals, tree setup, presentation)
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
- **Tập tin mã nguồn JavaScript:** Sử dụng `camelCase` (ví dụ: `itemService.js`, `contentEditorController.js`, `presentationService.js`, `authMiddleware.js`).
- **Tập tin giao diện EJS:** Sử dụng `kebab-case` (ví dụ: `content-editor.ejs`, `item-form.ejs`, `media-picker.ejs`, `details-modal.ejs`).
- **Mongoose Models:** Sử dụng `PascalCase` danh từ số ít (ví dụ: `Item.js`, `Template.js`, `AuditLog.js`).
- **Tên Collection MongoDB:** Sử dụng `snake_case` số nhiều (ví dụ: `items_master`, `items_web`, `templates`, `users`, `roles`).
- **Đường dẫn URL Routes:** Sử dụng `kebab-case` theo nguyên tắc RESTful (ví dụ: `/admin/content-editor`, `/admin/template-manager/create-field`).

### 3.3 Quy ước Route (Phân định Full Page EJS vs Partial HTML vs JSON)
Để đạt trải nghiệm mượt mà giống Desktop App của Sitecore mà vẫn duy trì SSR:
1. **Full Page EJS (`GET /admin/...`):**
   - Trả về toàn bộ trang hoàn chỉnh (bao gồm Layout, Header, Ribbon, Tree, Workspace, Taskbar).
   - Được gọi khi người dùng truy cập trực tiếp từ URL, ấn F5, hoặc chuyển đổi ứng dụng từ Launchpad / Taskbar.
2. **Partial HTML EJS (`GET /admin/.../partial` hoặc request có header `X-Requested-With: Partial`):**
   - Chỉ render và trả về một phần HTML của giao diện (ví dụ: toàn bộ form chỉnh sửa của 1 item `item-form.ejs`, danh sách sub-items `folder-view.ejs`, hoặc modal Presentation Details `GET /admin/content-editor/item/:id/presentation`).
   - Được gọi bằng AJAX khi người dùng click vào một node trên Cây nội dung hoặc ấn nút trên Ribbon; client nhận HTML và đưa thẳng vào vùng `#editor-workspace` hoặc nạp vào modal mà không cần reload trang.
3. **JSON Endpoints (`POST /admin/.../ajax` hoặc API `/api/v1/...`):**
   - **Internal AJAX (`/admin/.../ajax`, `/admin/content-editor/item/:id/presentation`):** Trả về JSON cho các tác vụ cập nhật nhanh: lưu form item, đổi tên node trên cây, kéo thả sắp xếp (sort), tải cây con lazy-load (Fancytree data format), lưu Presentation Details, Reset presentation, xem JSON Preview.
     - Cấu trúc phản hồi: `{ success: true, message: "...", data: { ... } }`
   - **Delivery API & Layout Service (`/api/v1/...`):** RESTful JSON dành riêng cho ứng dụng Frontend bên ngoài (React/Next.js) đọc dữ liệu từ `items_web`:
     - `GET /api/v1/content/*`: Lấy dữ liệu nội dung thô theo Path / ID.
     - `GET /api/v1/layout?path=...&lang=...&device=...`: Layout Service trả về cấu trúc component phân cấp (route, placeholders, components và datasource resolved).

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
  
  // Cấu hình Presentation (Layout, Renderings) - Headless cho React Frontend
  presentation: {
    // Shared Layout: Dùng chung cho mọi ngôn ngữ và phiên bản
    shared: {
      devices: [
        {
          deviceId: ObjectId("..."),       // Tham chiếu item Device (mặc định: Default Device)
          layoutId: ObjectId("..."),       // Tham chiếu item Layout (ví dụ: MainLayout)
          renderings: [
            {
              uid: "b8a5d448-6a3f-4e09-9154-1b12b5f63d33", // UUID v4 bất biến cho mỗi rendering instance
              renderingId: ObjectId("..."), // Tham chiếu item Rendering (ví dụ: Hero, RichText)
              placeholder: "main",         // Khóa placeholder (main, header, footer, column-{*})
              sortOrder: 100,              // Thứ tự hiển thị trong placeholder
              datasourceId: ObjectId("..."), // ID của item chứa dữ liệu nguồn (hoặc null nếu dùng context item)
              parameters: {                // Tham số rendering động (Key-Value)
                "theme": "dark",
                "showTitle": "true"
              }
            }
          ]
        }
      ]
    },
    // Final Layout: Ghi đè (override/delta) theo từng phiên bản và ngôn ngữ cụ thể
    final: [
      {
        language: "en",
        version: 1,
        devices: [
          {
            deviceId: ObjectId("..."),
            layoutId: ObjectId("..."),     // Có thể override layout khác nếu cần
            renderings: [
              // Mảng rendering override: thêm mới, đổi vị trí, đổi datasource hoặc ẩn rendering từ shared/standard
            ]
          }
        ]
      }
    ]
  },
  
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
- `{ "presentation.shared.devices.renderings.renderingId": 1 }` (kiểm tra toàn vẹn khi xoá Rendering)
- `{ "presentation.shared.devices.renderings.datasourceId": 1 }` (kiểm tra tham chiếu Datasource)
- `{ "presentation.final.devices.renderings.renderingId": 1 }`

---

#### 2. Collection `templates`
Mô hình hóa định nghĩa trường giống hệt Sitecore (Section -> Fields) và Standard Presentation.
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
  
  // Standard Presentation: Cấu hình Layout & Rendering mặc định được kế thừa cho các item mới
  presentation: {
    devices: [
      {
        deviceId: ObjectId("..."),
        layoutId: ObjectId("..."),
        renderings: [
          {
            uid: "c194e432-8495-46aa-a982-f04bbf63e001",
            renderingId: ObjectId("..."),
            placeholder: "main",
            sortOrder: 100,
            datasourceId: null,
            parameters: {}
          }
        ]
      }
    ]
  },
  
  // Insert Options: Giới hạn các Template con được phép tạo bên dưới Item này
  insertOptions: [ObjectId("..."), ObjectId("...")],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

#### 2.1 Các Template hệ thống cho Presentation (System Templates)
Được định nghĩa sẵn dưới nhánh `/sitecore/templates/system/layout/`:
- **Template `Device`:** `name`, `displayName`, `fallbackDeviceId`, `userAgentRegex`, `isDefault`.
- **Template `Layout`:** `name`, `displayName`, `componentName` (tên React layout component tương ứng trên frontend), `placeholders` (mảng string các placeholder mặc định).
- **Template `Rendering`:** `name`, `displayName`, `componentName` (khớp với React component trên frontend), `datasourceTemplate` (ObjectId tham chiếu template giới hạn cho datasource), `datasourceLocation` (chuỗi đường dẫn gốc gợi ý chọn datasource), `parametersTemplate` (ObjectId tham chiếu template định nghĩa các tham số), `placeholders` (mảng placeholder con mà component này cung cấp), `icon`.
- **Template `Placeholder Settings`:** `name`, `displayName`, `placeholderKey` (ví dụ: `main`, `content`, `column-{*}`), `allowedRenderings` (mảng ObjectId các Rendering được phép đặt trong placeholder này), `description`.
- **Template `Rendering Parameters Folder`:** Thư mục và schema định nghĩa các trường cấu hình cho parameters.

#### 2.2 Các Item hệ thống dưới `/sitecore/layout/`
Khởi tạo tự động qua migration/seed script:
- `/sitecore/layout/Devices`: `Default` (isDefault=true), `Mobile`.
- `/sitecore/layout/Layouts`: `MainLayout` (`componentName: "MainLayout"`, `placeholders: ["header", "main", "footer"]`).
- `/sitecore/layout/Renderings`:
  - `Hero` (`componentName: "HeroBanner"`, `placeholders: []`)
  - `RichText` (`componentName: "RichTextContent"`, `placeholders: []`)
  - `Promo` (`componentName: "PromoCard"`, `placeholders: []`)
  - `Navigation` (`componentName: "SiteNavigation"`, `placeholders: []`)
- `/sitecore/layout/Placeholder Settings`:
  - `header` (allowedRenderings: `[Navigation]`)
  - `main` (allowedRenderings: `[Hero, RichText, Promo]`)
  - `footer` (allowedRenderings: `[Navigation, RichText]`)
  - `content` (allowedRenderings: `[RichText, Promo]`)
  - `column-{*}` (allowedRenderings: `[RichText, Promo]`)

#### 2.3 Quy tắc Tham chiếu và Toàn vẹn Dữ liệu Presentation
- **Định danh Rendering Instance:** Mọi rendering instance trong Presentation Details đều bắt buộc có `uid` chuẩn **UUID v4** để bảo đảm định danh duy nhất không bị thay đổi khi sắp xếp, ghi đè hoặc di chuyển giữa các placeholders.
- **Xoá Layout / Rendering:** Khi người dùng thực hiện xoá một item Layout hoặc Rendering:
  1. Kiểm tra trong `templates.presentation` và `items_master.presentation`: nếu đang có template hoặc item tham chiếu tới `layoutId` hoặc `renderingId` này, hệ thống sẽ **chặn xoá** và liệt kê danh sách các item đang sử dụng.
  2. Nếu không có tham chiếu nào, cho phép chuyển vào Recycle Bin.
- **Xoá Item Datasource:** Khi xoá một item đang được một Rendering tham chiếu làm `datasourceId`, hệ thống cảnh báo "Item này đang được sử dụng làm Datasource cho [Tên Item]". Nếu vẫn xoá, rendering trên frontend sẽ nhận `fields: null` và xử lý graceful fallback an toàn.

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

## 5. KẾ HOẠCH TỪNG GIAI ĐOẠN (GĐ 0 → GĐ 12)

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
  - *Không làm:* Chưa làm phân quyền chi tiết từng nút trong cây (ACL theo Item để sang GĐ 7).
- **Phụ thuộc:** GĐ 0.
- **Danh sách Task:**
  - [x] **Task 1.1:** Định nghĩa Mongoose Model `User` (`src/models/User.js`) và `Role` (`src/models/Role.js`).
  - [x] **Task 1.2:** Định nghĩa Mongoose Model `LaunchpadApp` (`src/models/LaunchpadApp.js`) chứa thông tin icon, tên, mô tả, nhóm, URL, và danh sách Role được phép truy cập.
  - [x] **Task 1.3:** Cấu hình session `src/config/session.js` sử dụng `express-session` và `connect-mongo`.
  - [x] **Task 1.4:** Xây dựng `authService.js` xử lý logic xác thực đăng nhập, so sánh mật khẩu băm, và cập nhật `lastLogin`.
  - [x] **Task 1.5:** Xây dựng `authController.js` và routes `src/routes/admin/authRoutes.js` (`GET /admin/login`, `POST /admin/login`, `POST /admin/logout`).
  - [x] **Task 1.6:** Thiết kế giao diện EJS đăng nhập `src/views/admin/auth/login.ejs` (logo Sitecore, form nhập username/password, thông báo lỗi).
  - [x] **Task 1.7:** Xây dựng `authMiddleware.js` bảo vệ toàn bộ các route tiền tố `/admin/*` (chuyển hướng về `/admin/login` nếu chưa đăng nhập).
  - [x] **Task 1.8:** Xây dựng `launchpadController.js` và route `src/routes/admin/launchpadRoutes.js` (`GET /admin/launchpad`).
  - [x] **Task 1.9:** Thiết kế giao diện Launchpad `src/views/admin/launchpad/index.ejs` hiển thị danh sách ứng dụng chia nhóm (Content Editing, Media, Control Panel) dựa trên role của user hiện tại.
  - [x] **Task 1.10:** Viết script seed data `src/scripts/seed-initial-data.js` khởi tạo các role mặc định (`Administrator`, `Author`, `Editor`) và tài khoản `admin` / `admin123`.
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
- **Trạng thái:** Hoàn thành.

---

### GIAI ĐOẠN 2 (GĐ 2): CONTENT EDITOR MVP (CÂY NỘI DUNG, CRUD ITEM & RIBBON HOME)
- **Mục tiêu:** Xây dựng hạt nhân Content Editor: hiển thị Cây nội dung lazy-loading bên trái bằng Fancytree/jsTree, form chỉnh sửa dữ liệu item ở giữa, và dải Ribbon "Home" hỗ trợ đầy đủ các thao tác CRUD cơ bản (Insert, Duplicate, Delete, Rename, Sort, Move).
- **Phạm vi:**
  - *Làm:* Cấu trúc Item Model theo Materialized Path; Cây nội dung nạp dữ liệu phân cấp lười (Lazy-loading AJAX); Form hiển thị các field cơ bản (Single-Line Text, Rich Text); Các thao tác Ribbon Home: Insert Item (chọn template cơ bản), Duplicate Item, Delete Item, Rename Item, Move Item, Sort Item; cập nhật đồng bộ Cây và Form qua AJAX.
  - *Không làm:* Chưa làm Versioning/Ngôn ngữ (mặc định xử lý version 1 ngôn ngữ `en`); chưa xử lý Base Template phức tạp; chưa có ACL.
- **Phụ thuộc:** GĐ 1.
- **Danh sách Task:**
  - [x] **Task 2.1:** Xây dựng Mongoose Model `Item` (`src/models/Item.js`) với các trường: `name`, `displayName`, `templateId`, `parentId`, `ancestors`, `path`, `sortOrder`, `fields`, `deleted`, `createdBy`, `updatedBy`.
  - [x] **Task 2.2:** Xây dựng Mongoose Model `Template` (`src/models/Template.js`) cơ bản phục vụ cho việc tạo item (sections, fields, field types, insertOptions).
  - [x] **Task 2.3:** Tạo hạt giống dữ liệu ban đầu cho cây Sitecore: Node Root (`/sitecore`), các node nhánh chuẩn (`/sitecore/content`, `/sitecore/media library`, `/sitecore/templates`, `/sitecore/system`), và node trang chủ mẫu (`/sitecore/content/home`).
  - [x] **Task 2.4:** Xây dựng `itemService.js` với các phương thức nghiệp vụ: `getChildren(parentId)`, `getItemById(id)`, `getItemByPath(path)`, `createItem(data)`, `updateItemFields(id, fields)`, `deleteItem(id)`, `renameItem(id, newName)`, `moveItem(id, newParentId)`, `duplicateItem(id)`, `sort(id, direction)`, `search(keyword)`.
  - [x] **Task 2.5:** Xây dựng `treeHelper.js` chuyển đổi danh sách Item từ MongoDB sang định dạng JSON chuẩn của Fancytree (`{ title, key, folder, lazy, icon, data }`).
  - [x] **Task 2.6:** Xây dựng các route và controller Content Editor:
    - `GET /admin/content-editor` và `GET /admin/content-editor/:id`: Render giao diện 3 vùng (Ribbon, Tree container, Workspace container).
    - `GET /api/items/:id/children`: Trả về mảng JSON các node con theo `parentId` phục vụ lazy loading cây.
    - `GET /admin/content-editor/item/:id/form`: Trả về HTML partial chứa form soạn thảo của Item tương ứng.
    - `GET /admin/content-editor/item/:id/folder-view`: Trả về HTML partial dạng lưới tile danh sách con.
    - `GET /admin/content-editor/item/:id/insert-options`: Trả về danh sách template được phép tạo con.
    - `POST /api/items`: AJAX tạo item mới.
    - `PUT /api/items/:id/fields`: AJAX lưu giá trị các trường kèm Optimistic Locking (409 Conflict).
    - `POST /api/items/:id/rename`: AJAX đổi tên item và cập nhật materialized path toàn bộ cây con.
    - `POST /api/items/:id/delete`: AJAX xóa mềm item và toàn bộ con cháu.
    - `POST /api/items/:id/duplicate`: AJAX nhân bản item và tùy chọn nhân bản toàn bộ con cháu.
    - `POST /api/items/:id/move`: AJAX di chuyển item sang cha mới có thuật toán phát hiện vòng lặp (cycle detection).
    - `POST /api/items/:id/sort`: AJAX sắp xếp thứ tự anh em (up, down, first, last).
  - [x] **Task 2.7:** Thiết kế giao diện EJS Content Editor:
    - `src/views/content-editor/index.ejs`: Khung chính chia cột layout cây bên trái và workspace bên phải.
    - `src/views/partials/ribbon.ejs`: Data-driven Ribbon với Tab "Home" hoạt động đầy đủ: Write (Save, Refresh), Insert, Operations (Duplicate, Copy, Move, Delete), Rename, Sorting. Các tab khác disabled kèm thông báo giai đoạn.
    - `src/views/content-editor/item-form.ejs`: Form soạn thảo render các trường của Item theo từng Section accordion.
    - `src/views/content-editor/folder-view.ejs`: Giao diện xem thư mục dạng lưới thẻ con.
    - `src/views/content-editor/fields/*.ejs`: Thư viện partial cho từng field type cơ bản (Single-Line Text, Multi-Line Text, Rich Text, Checkbox, Date, Number, Droplist, Image).
    - `src/views/content-editor/modals/*.ejs`: Modal Insert, Rename, Move, Delete.
  - [x] **Task 2.8:** Viết mã Client-side JS (`public/js/admin/content-editor.js`):
    - Tích hợp thư viện Fancytree kết nối endpoint lazy loading, hỗ trợ kéo thả dnd5.
    - Bắt sự kiện click node -> gửi Fetch request lấy partial form HTML nạp vào workspace mà không reload trang.
    - Bắt sự kiện ấn nút trên Ribbon -> thực hiện các hành động AJAX tương ứng và tự động cập nhật lại node trên cây.
    - Theo dõi dirty form (`isDirty`), cảnh báo khi rời trang hoặc chuyển node chưa lưu.
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
- **Trạng thái:** Hoàn thành.

---

### GIAI ĐOẠN 3 (GĐ 3): TEMPLATE MANAGER (QUẢN LÝ CẤU TRÚC, KẾ THỪA & INSERT OPTIONS)
- **Mục tiêu:** Xây dựng công cụ Template Manager cho phép người quản trị định nghĩa cấu trúc dữ liệu của Item trực quan (Sections, Fields, Field Types), hỗ trợ kế thừa Base Templates, thiết lập Standard Values (giá trị mặc định) và Insert Options (ràng buộc loại item con được tạo).
- **Phạm vi:**
  - *Làm:* Giao diện quản lý Template; Trình thiết kế Section & Field với đầy đủ các Field Types: Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist; Kế thừa nhiều Base Template; Thiết lập Standard Values; Cấu hình Insert Options; Tự động phản ánh cấu trúc trường mới vào Form của Content Editor.
  - *Không làm:* Chưa làm Validation Rules nâng cao bằng Regex tùy biến phức tạp.
- **Phụ thuộc:** GĐ 2.
- **Danh sách Task:**
  - [x] **Task 3.1:** Hoàn thiện Mongoose Schema `Template` (`src/models/Template.js`) hỗ trợ mảng `sections`, `fields`, `baseTemplateIds`, `standardValues`, và `insertOptions`.
  - [x] **Task 3.2:** Xây dựng `templateService.js`:
    - `getAllTemplates()`: Lấy danh sách template trong hệ thống.
    - `getTemplateWithInheritance(templateId)`: Thu thập toàn bộ section và field từ chính template đó và đệ quy lên tất cả các base templates.
    - `createTemplate(data)`, `updateTemplate(id, data)`, `deleteTemplate(id)`.
    - `saveStandardValues(templateId, values)`.
    - `setInsertOptions(templateId, allowedTemplateIds)`.
  - [x] **Task 3.3:** Xây dựng `templateManagerController.js` và route `src/routes/admin/templateManagerRoutes.js`:
    - `GET /admin/template-manager`: Giao diện danh sách và cây template.
    - `GET /admin/template-manager/:id`: Chi tiết màn hình thiết kế template (Sections, Fields).
    - `POST /admin/template-manager/save`: Lưu cấu trúc template.
    - `POST /admin/template-manager/:id/standard-values`: Lưu giá trị mặc định.
    - `POST /admin/template-manager/:id/insert-options`: Cập nhật insert options.
  - [x] **Task 3.4:** Thiết kế giao diện EJS Template Manager:
    - `src/views/admin/templates/manager.ejs`: Cây template nằm dưới nhánh `/sitecore/templates`.
    - `src/views/admin/templates/builder.ejs`: Bảng thiết kế Section và Field cho phép thêm/sửa/xóa trường nhanh, chọn loại trường từ dropdown.
    - `src/views/admin/templates/modals/insert-options-modal.ejs`: Hộp thoại chọn template con được phép tạo.
  - [x] **Task 3.5:** Tích hợp kế thừa trường vào Content Editor:
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
- **Trạng thái:** Hoàn thành.

---

### GIAI ĐOẠN 4 (GĐ 4): QUẢN LÝ PHIÊN BẢN & ĐA NGÔN NGỮ (VERSIONS & LANGUAGES)
- **Mục tiêu:** Hoàn thiện cơ chế Đa ngôn ngữ (Multilingual) và Quản lý phiên bản (Item Versioning) chuẩn Sitecore: cho phép thêm phiên bản mới, chuyển đổi qua lại giữa các phiên bản/ngôn ngữ, so sánh khác biệt (Diff View) và khôi phục (Rollback); đồng thời thiết kế sẵn cấu trúc schema chừa chỗ cho Presentation (Shared Layout và Final Layout theo từng phiên bản/ngôn ngữ).
- **Phạm vi:**
  - *Làm:* Cấu hình danh mục ngôn ngữ hỗ trợ hệ thống (en, vi-VN, ja...); Cấu trúc lưu trữ Versioned, Unversioned, và Shared fields; Xác nhận và áp dụng thực tế cờ `isShared` và `isUnversioned` đã định nghĩa trên Template từ GĐ 3; Bộ chọn ngôn ngữ và version trên Ribbon/Header của Content Editor; Tính năng "Add Version", "Remove Version"; Màn hình so sánh hai phiên bản (Diff View làm nổi bật thay đổi); Khôi phục phiên bản cũ; **Thiết kế schema chừa chỗ cho Presentation:** cấu trúc trường `Item.presentation.shared` (cấp item) và `Item.presentation.final` (theo từng `lang + version`), cơ chế sao chép `finalLayout` từ version nguồn khi tạo version mới hoặc nhân bản version.
  - *Không làm:* Chưa làm tự động dịch thuật (Auto-translate); **Chưa làm UI biên tập và nghiệp vụ Presentation** (được triển khai ở GĐ 6, GĐ 4 chỉ chuẩn bị cấu trúc schema và quy tắc sao chép version).
- **Phụ thuộc:** GĐ 2, GĐ 3.
- **Danh sách Task:**
  - [ ] **Task 4.1:** Tạo Model hoặc cấu hình hệ thống `Language` (`src/models/Language.js`) lưu trữ danh sách ngôn ngữ kích hoạt trong CMS (mã code, tên hiển thị, icon cờ quốc gia).
  - [ ] **Task 4.2:** Nâng cấp `itemService.js` hỗ trợ đầy đủ cấu trúc phân cấp:
    - `getFieldsByLanguageAndVersion(itemId, langCode, versionNumber)`.
    - `createNewVersion(itemId, langCode, baseFromVersion)`: Sao chép dữ liệu từ version trước sang version mới với số hiệu tăng thêm 1; đồng thời **sao chép `finalLayout` của version nguồn** sang version mới.
    - `deleteVersion(itemId, langCode, versionNumber)`.
    - `resolveFieldValues(item, langCode, versionNumber)`: Gộp chính xác 3 cấp độ trường theo Template: Shared (dùng chung mọi ngôn ngữ/version) -> Unversioned (theo ngôn ngữ) -> Versioned (theo phiên bản cụ thể).
  - [ ] **Task 4.3:** Thiết kế schema và migration chừa sẵn cấu trúc Presentation trên Model `Item`:
    - `presentation.shared`: lưu layout & renderings dùng chung cho toàn bộ item.
    - `presentation.final`: mảng các bản ghi theo `{ language, version, devices: [...] }` để sẵn sàng cho GĐ 6.
    - Đặt sẵn quy tắc phân giải presentation: Ưu tiên `finalLayout` của version hiện tại -> `sharedLayout` của item -> `standardPresentation` của template.
  - [ ] **Task 4.4:** Xây dựng `diffHelper.js` so sánh 2 object trường dữ liệu, trả về danh sách trường thay đổi kèm highlight văn bản dạng diff HTML.
  - [ ] **Task 4.5:** Bổ sung các Ribbon Tabs "Versions" trên Content Editor:
    - Nút chọn Ngôn ngữ (Language Switcher Dropdown).
    - Nút chọn Phiên bản (Version Switcher Dropdown).
    - Nút "Add Version" (tạo bản thảo mới).
    - Nút "Compare Versions" (mở modal so sánh).
    - Nút "Remove Version".
  - [ ] **Task 4.6:** Xây dựng modal so sánh phiên bản `src/views/admin/content-editor/modals/compare-versions-modal.ejs` hiển thị 2 cột trực quan (Version A vs Version B).
  - [ ] **Task 4.7:** Cập nhật Controller và Route xử lý các hành động Version và Language qua AJAX.
- **File/Thư mục dự kiến:**
  - `src/models/Language.js`
  - `src/utils/diffHelper.js`
  - `src/views/admin/content-editor/modals/compare-versions-modal.ejs`
  - Cập nhật: `Item.js`, `itemService.js`, `contentEditorController.js`, `contentEditorRoutes.js`, `ribbon.ejs`, `content-editor.js`
- **Route / API dự kiến:**
  - `POST /admin/content-editor/item/:id/version/add`: Thêm version mới cho ngôn ngữ hiện tại.
  - `POST /admin/content-editor/item/:id/version/delete`: Xóa version chỉ định.
  - `GET /admin/content-editor/item/:id/compare?v1=1&v2=2&lang=en`: Lấy dữ liệu so sánh 2 phiên bản.
- **Thay đổi Database:** Cập nhật collection `languages` và cấu trúc mảng `languages` trong collection `items_master`; bổ sung trường `presentation` rỗng chuẩn hoá vào Schema `Item`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Mở một Item bất kỳ, đang ở ngôn ngữ `en` Version 1.
  - Sửa Title từ "Hello" thành "Hello World", bấm Lưu.
  - Bấm nút "Add Version" trên tab Versions của Ribbon -> Hệ thống tạo ra Version 2, số phiên bản trên giao diện chuyển thành "Version 2".
  - Sửa Title thành "Hello Universe", bấm Lưu.
  - Chuyển dropdown quay lại "Version 1" -> Form lập tức hiển thị lại giá trị "Hello World".
  - Bấm nút "Compare Versions" -> Màn hình so sánh hiển thị rõ sự khác biệt giữa "Hello World" và "Hello Universe" (có màu xanh/đỏ đánh dấu diff).
  - Chuyển sang ngôn ngữ `vi-VN` -> Hệ thống cho phép nhập nội dung tiếng Việt hoàn toàn tách biệt với tiếng Anh.
  - Schema `Item` có sẵn trường `presentation.shared` và `presentation.final`; chạy test tạo version mới xác nhận cấu trúc presentation không bị lỗi và `finalLayout` được sao chép nguyên vẹn từ version cũ.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Nhầm lẫn giữa Shared Fields và Versioned Fields khiến việc chỉnh sửa ở version mới vô tình làm thay đổi giá trị của version cũ.
  - *Giảm thiểu:* Kiểm tra chặt chẽ cờ `isShared` và `isUnversioned` trong `Template` trước khi quyết định vị trí ghi đè dữ liệu trong document MongoDB.
- **Ước tính thời gian:** 2.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 5 (GĐ 5): MEDIA LIBRARY (QUẢN LÝ TÀI NGUYÊN SỐ & MEDIA PICKER MODAL)
- **Mục tiêu:** Xây dựng ứng dụng Media Library quản lý tài nguyên số (hình ảnh, tài liệu) dạng cây thư mục, hỗ trợ upload nhiều tệp tin, tự động tạo ảnh thu nhỏ (thumbnail), và cung cấp cửa sổ Media Picker tích hợp liền mạch vào các field kiểu Image trong Content Editor cũng như sẵn sàng cho Datasource Items và Rendering Parameters của Presentation.
- **Phạm vi:**
  - *Làm:* Cây thư mục Media (phân cấp dưới `/sitecore/media library`); Upload file đơn và đa tệp sử dụng Multer; Tự động xử lý resize và thumbnail bằng `sharp`; Xem trước chi tiết media (kích thước, dung lượng, đường dẫn URL, alt text); Modal Media Picker tích hợp với Content Editor (chọn ảnh cho field Image, xem trước và gỡ bỏ ảnh; thiết kế module hoá sẵn sàng dùng cho các field của Datasource Items hoặc Rendering Parameters ở các giai đoạn sau).
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

### GIAI ĐOẠN 6 (GĐ 6): PRESENTATION (LAYOUT, RENDERING, PLACEHOLDER SETTINGS & PRESENTATION DETAILS)
- **Mục tiêu:** Xây dựng hệ thống quản lý Presentation (Layout, Rendering, Placeholder Settings) theo phong cách Sitecore cho kiến trúc Headless: lưu cấu hình bố cục trang, phân giải component cho React frontend (giống Sitecore JSS/Layout Service), hỗ trợ Standard Presentation kế thừa từ Template, phân định Shared Layout và Final Layout (theo phiên bản/ngôn ngữ), và giao diện biên tập Presentation Details trực quan với SortableJS.
- **Phạm vi:**
  - *Làm:*
    1. **Device (mức đơn giản):** `Default`, `Mobile` (cấu hình được), lưu trữ dưới dạng item dưới `/sitecore/layout/Devices`.
    2. **Layout:** Item dưới `/sitecore/layout/Layouts`: `name`, `componentName` (tên React layout), `placeholders[]` mặc định. Định nghĩa bởi Template hệ thống `Layout`.
    3. **Rendering:** Item dưới `/sitecore/layout/Renderings`: `componentName` (khớp React component), `datasourceTemplate`, `datasourceLocation`, `parametersTemplate`, `placeholders[]` mà nó cung cấp (hỗ trợ nesting), `icon`. Định nghĩa bởi Template hệ thống `Rendering`.
    4. **Placeholder Settings:** Item dưới `/sitecore/layout/Placeholder Settings`: `placeholderKey`, `allowedRenderings[]`, có hỗ trợ key động (ví dụ: `column-{*}` theo quy tắc khớp Regex ghi trong Decision Log).
    5. **Presentation Details của Item:** Cấu trúc `{ layoutId (theo device), renderings[{ uid, renderingId, placeholder, sortOrder, datasourceId, parameters }] }`. Giao diện (UI) trong Content Editor: chọn layout theo device, thêm/xoá/sắp xếp rendering (SortableJS), modal chọn rendering (lọc theo Placeholder Settings), chọn datasource item (Tree Picker), nhập parameters theo `parametersTemplate`, validate placeholder tồn tại và rendering được phép.
    6. **Standard Presentation (kế thừa từ Template):** Mở rộng `Template` có trường `presentation` (đặt ở Standard Values của template). Item mới tạo tự động thừa hưởng; Item chỉ lưu phần **override (delta)** so với standard presentation (ghi Decision Log). Có nút "Reset to standard presentation".
    7. **Ribbon Tab "Presentation":** Kích hoạt tab `PRESENTATION` trên Ribbon (các nút: Details, Layout Details, Reset, Preview JSON) bằng cơ chế ribbon config động.
    8. **Preview (đơn giản):** Nút/modal xem cấu trúc JSON Layout & Renderings của item (Layout Service format preview) cho lập trình viên (không render component trong admin).
    9. **Seed Data:** Khởi tạo các item hệ thống: Devices (`Default`, `Mobile`), Layouts (`MainLayout`), Renderings mẫu (`Hero`, `RichText`, `Promo`, `Navigation`), Placeholder Settings (`header`, `main`, `footer`, `content`, `column-{*}`).
    10. **Hàm dùng chung:** `presentationService.getFinalPresentation(item, device, lang, version)` trả về presentation đã gộp (standard + override) phục vụ cho giao diện Admin và cho Delivery API / Layout Service ở GĐ 10.
  - *Không làm:* WYSIWYG / Experience Editor (soạn thảo trực tiếp trên trang live frontend dạng in-line), render component React trong Admin CMS, A/B testing, personalization, rules engine phức tạp, branch template, workflow riêng cho từng rendering.
- **Phụ thuộc:** GĐ 2, GĐ 3, GĐ 4, GĐ 5.
- **Danh sách Task:**
  - [ ] **Task 6.1:** Tạo các Template hệ thống cho Presentation (`Device`, `Layout`, `Rendering`, `Placeholder Settings`, `Rendering Parameters`) và script seed các item cấu hình ban đầu dưới `/sitecore/layout/`.
  - [ ] **Task 6.2:** Mở rộng Mongoose Model `Template` với trường `presentation` (Standard Presentation) và mở rộng `Item` với cấu trúc `presentation: { shared: {...}, final: [...] }`.
  - [ ] **Task 6.3:** Xây dựng `presentationService.js`:
    - CRUD cấu hình Presentation cho Item và Template.
    - Thuật toán gộp `getFinalPresentation(item, device, lang, version)` kết hợp Standard Presentation, Shared Layout và Final Layout theo cơ chế delta override dựa trên UID (UUID v4) của rendering instance.
    - Hàm validate Placeholder Settings: kiểm tra tính hợp lệ của placeholder key (bao gồm wildcard `column-{*}`) và danh sách `allowedRenderings`.
    - Hàm reset presentation về giá trị mặc định của Template (`resetToStandardPresentation`).
  - [ ] **Task 6.4:** Xây dựng Controller và Route Presentation:
    - `GET /admin/content-editor/item/:id/presentation`: Trả về giao diện Partial HTML modal Presentation Details.
    - `POST /admin/content-editor/item/:id/presentation`: Lưu cấu hình Presentation (Shared hoặc Final theo version hiện hành).
    - `POST /admin/content-editor/item/:id/presentation/reset`: Reset presentation về Standard Presentation.
    - `GET /admin/content-editor/item/:id/presentation/preview`: Trả về JSON preview của presentation đã phân giải.
    - `GET /admin/presentation/renderings/allowed?placeholder=...`: Trả về danh sách rendering hợp lệ theo placeholder.
  - [ ] **Task 6.5:** Thiết kế giao diện EJS Presentation Details:
    - Modal `presentation-details-modal.ejs`: Cho phép chuyển đổi giữa các Device tabs (`Default`, `Mobile`), chọn Layout, danh sách Renderings gom nhóm theo Placeholder.
    - Tích hợp SortableJS để kéo thả sắp xếp thứ tự các Rendering trong cùng Placeholder hoặc di chuyển giữa các Placeholders hợp lệ.
    - Modal `select-rendering-modal.ejs`: Hiển thị danh mục Rendering được phép chèn vào placeholder đang chọn.
    - Modal `rendering-instance-modal.ejs`: Cấu hình chi tiết 1 rendering: gán Datasource Item (Item Picker), nhập Parameters theo template.
  - [ ] **Task 6.6:** Kích hoạt Tab "Presentation" trên Ribbon Content Editor (`src/config/ribbon.js`):
    - Cập nhật ribbon config: chuyển tab `presentation` từ disabled sang enabled ở GĐ 6.
    - Bổ sung các nút: "Presentation Details", "Reset", "Preview JSON".
  - [ ] **Task 6.7:** Viết client-side script `presentation-details.js` xử lý mở modal, kéo thả SortableJS, chọn datasource, preview JSON và gửi AJAX lưu dữ liệu.
- **File/Thư mục dự kiến:**
  - `src/services/presentationService.js`
  - `src/controllers/admin/presentationController.js`
  - `src/routes/admin/presentationRoutes.js`
  - `src/views/admin/content-editor/presentation/details-modal.ejs`
  - `src/views/admin/content-editor/presentation/select-rendering-modal.ejs`
  - `src/views/admin/content-editor/presentation/rendering-instance-modal.ejs`
  - `src/views/admin/content-editor/presentation/preview-json-modal.ejs`
  - `src/public/js/presentation-details.js`
  - `src/public/css/presentation-details.css`
  - `src/scripts/seed-presentation-data.js`
- **Route / API dự kiến:**
  - `GET /admin/content-editor/item/:id/presentation`
  - `POST /admin/content-editor/item/:id/presentation`
  - `POST /admin/content-editor/item/:id/presentation/reset`
  - `GET /admin/content-editor/item/:id/presentation/preview`
  - `GET /admin/presentation/renderings/allowed`
- **Thay đổi Database:**
  - Mở rộng collection `templates`: trường `presentation` (Standard Presentation).
  - Mở rộng collection `items_master`: trường `presentation` (`shared` & `final`).
  - Tạo các Template hệ thống và các item mẫu dưới `/sitecore/layout/Devices`, `/sitecore/layout/Layouts`, `/sitecore/layout/Renderings`, `/sitecore/layout/Placeholder Settings`.
  - Indexes: `{ "presentation.shared.devices.renderings.renderingId": 1 }`, `{ "presentation.final.devices.renderings.renderingId": 1 }`, `{ "presentation.shared.devices.renderings.datasourceId": 1 }`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Mở Content Editor, chọn node `/sitecore/content/home`. Tab `Presentation` trên Ribbon sáng và có thể tương tác.
  - Bấm nút "Presentation Details" -> Mở modal hiển thị Device `Default`, Layout đang gán (`MainLayout`), và các Rendering mặc định được kế thừa từ Standard Presentation của Template.
  - Thêm Rendering `Hero` vào placeholder `main`: Modal chọn rendering chỉ hiển thị những rendering hợp lệ theo Placeholder Settings của `main`.
  - Chọn 1 item datasource cho rendering `Hero`, nhập thông số parameters (ví dụ `theme=dark`).
  - Dùng chuột kéo thả sắp xếp đổi vị trí giữa `Hero` và `RichText` -> Thứ tự hiển thị thay đổi mượt mà.
  - Bấm Lưu Presentation -> Dữ liệu lưu thành công vào MongoDB (lưu delta override).
  - Bấm "Preview JSON" -> Modal hiển thị cấu trúc JSON đầy đủ của Layout và các Renderings theo từng Placeholder.
  - Bấm "Reset to Standard Presentation" -> Cấu hình override bị xoá, presentation quay về trạng thái mặc định kế thừa từ Template.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Cơ chế override rendering phức tạp dẫn đến xung đột hoặc mất rendering khi template gốc thay đổi.
  - *Giảm thiểu:* Định danh mỗi rendering instance bằng `uid` (UUID v4) bất biến; delta override lưu rõ hành động thêm mới, ghi đè thuộc tính hoặc xoá bỏ (tombstone) rendering so với standard.
- **Ước tính thời gian:** 3–4 tuần.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 7 (GĐ 7): BẢO MẬT NÂNG CAO & PHÂN QUYỀN TRUY CẬP (ITEM-LEVEL ACL & ACCESS VIEWER)
- **Mục tiêu:** Xây dựng hệ thống bảo mật phân quyền chi tiết tới từng Item theo mô hình Sitecore: quản lý User/Role, gán quyền trên Item (Read, Write, Create, Delete, Administer, Publish, và quyền Presentation `presentation:read`, `presentation:write`) với cơ chế kế thừa phân cấp từ cha xuống con, hỗ trợ quyền ghi đè (Allow / Deny / Inherit) và công cụ trực quan hóa Access Viewer.
- **Phạm vi:**
  - *Làm:* Quản lý User và Role (CRUD, gán role cho user); Bảng phân quyền `AccessControl`; Phân quyền thao tác trên toàn bộ Item bao gồm các item cấu hình hệ thống dưới nhánh `/sitecore/layout/*` (Device, Layout, Rendering, Placeholder Settings); Phân quyền riêng cho cấu hình Presentation (`presentation:read` cho xem cấu hình và `presentation:write` cho sửa/gán rendering); Thuật toán tính toán quyền hiệu dụng (Effective Rights Calculation: Deny luôn thắng Allow; quyền gán trực tiếp trên item ưu tiên hơn quyền kế thừa; quyền của Role kết hợp); Giao diện phân quyền trên Ribbon tab "Security"; Ứng dụng "Access Viewer" dạng bảng ma trận hiển thị quyền của user trên toàn bộ cây.
  - *Không làm:* Chưa làm Single Sign-On (SSO) SAML/OAuth2 ngoài hệ thống.
- **Phụ thuộc:** GĐ 1, GĐ 2, GĐ 6.
- **Danh sách Task:**
  - [ ] **Task 7.1:** Xây dựng Mongoose Model `AccessControl` (`src/models/AccessControl.js`).
  - [ ] **Task 7.2:** Xây dựng module tính toán quyền `aclService.js`:
    - `getEffectivePermissions(itemId, userId)`: Tính toán quyền thực tế của một user trên một item dựa trên cây tổ tiên (`ancestors`) và tất cả các Role của user.
    - Quy tắc đánh giá quyền: Explicit Deny > Explicit Allow > Inherited Deny > Inherited Allow > Default Deny.
    - Hỗ trợ thêm các quyền Presentation: `presentation:read`, `presentation:write`.
    - `canPerform(userId, action, itemId)`: Kiểm tra user có quyền thực hiện hành động cụ thể không (`read`, `write`, `create`, `delete`, `publish`, `presentation:read`, `presentation:write`).
    - `setItemPermission(itemId, identityType, identityId, permissions, applyToDescendants)`.
  - [ ] **Task 7.3:** Xây dựng middleware `aclMiddleware.js` bảo vệ các thao tác biên tập:
    - Kiểm tra quyền `read` trước khi cho phép xem item.
    - Kiểm tra quyền `write` trước khi cho phép lưu form item.
    - Kiểm tra quyền `create` trước khi cho phép insert item con.
    - Kiểm tra quyền `delete` trước khi cho phép xóa item.
    - Kiểm tra quyền `presentation:read` trước khi mở modal Presentation Details.
    - Kiểm tra quyền `presentation:write` trước khi lưu thay đổi Presentation Details hoặc Reset presentation.
  - [ ] **Task 7.4:** Xây dựng các ứng dụng quản trị bảo mật:
    - User Manager: Tạo, sửa, khóa tài khoản, gán roles (`src/views/admin/security/users.ejs`).
    - Role Manager: Tạo role, gán quyền mặc định (`src/views/admin/security/roles.ejs`).
    - Access Viewer: Bảng ma trận trực quan hóa quyền của từng user/role trên từng node cây bao gồm cột quyền Presentation (`src/views/admin/security/access-viewer.ejs`).
  - [ ] **Task 7.5:** Bổ sung Tab "Security" trên Ribbon của Content Editor:
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
  - Cấu hình quyền trên node `/sitecore/content/home`: Role `Content Authors` được quyền `Read`, `Write` và `presentation:read`, nhưng bị `Deny Delete` và `Deny presentation:write`.
  - Đăng nhập với tài khoản `john_editor`:
    - Người này xem và sửa được nội dung của trang `home`.
    - Nút "Delete" trên Ribbon bị mờ (disabled) hoặc nhận thông báo lỗi HTTP 403 khi cố gọi API.
    - Bấm xem Presentation Details được, nhưng các nút Lưu hoặc thêm/sắp xếp rendering bị disabled hoặc nhận HTTP 403 khi cố gửi API lưu.
  - Mở "Access Viewer", chọn user `john_editor`: Hệ thống hiển thị bảng ma trận với các dấu tích xanh và dấu gạch chéo đỏ chính xác theo tính kế thừa.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Truy vấn tính toán quyền phân cấp làm chậm tốc độ render cây nội dung.
  - *Giảm thiểu:* Sử dụng truy vấn gộp lấy toàn bộ quy tắc ACL của danh sách `ancestors` trong một câu lệnh MongoDB duy nhất và tính toán in-memory tại tầng service.
- **Ước tính thời gian:** 3 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 8 (GĐ 8): WORKFLOW ENGINE, WORKBOX & PUBLISHING (MASTER → WEB)
- **Mục tiêu:** Xây dựng quy trình phê duyệt nội dung (Workflow Engine) kết hợp ứng dụng Workbox cho biên tập viên, và cơ chế Xuất bản (Publishing Engine) chuyển dữ liệu Item và Presentation từ `items_master` sang `items_web`.
- **Phạm vi:**
  - *Làm:* Model Workflow (Draft -> In Review -> Approved); Workbox hiển thị các item đang chờ duyệt theo quyền của reviewer; Chuyển trạng thái workflow (Submit, Approve, Reject); Workflow áp dụng chặt chẽ cho từng phiên bản nội dung kèm `finalLayout` của phiên bản đó; Publishing Engine hỗ trợ 3 chế độ: Incremental Publish, Smart Publish (so sánh ngày cập nhật), và Republish (toàn bộ cây); **Publish toàn diện Item và Presentation Details (cả Shared Layout và Final Layout theo phiên bản đã duyệt) sang `items_web`; Publish các Item hệ thống dưới `/sitecore/layout/*` (Device, Layout, Rendering, Placeholder Settings); Cơ chế xử lý Datasource khi Publish:** Kiểm tra nếu Datasource của Rendering chưa được publish lên Web thì hiển thị cảnh báo (Warning) trong Publish Dialog kèm tuỳ chọn tự động publish kèm các Datasource liên quan (ghi Decision Log).
  - *Không làm:* Chưa làm tính năng hẹn giờ publish bằng Cron nâng cao (đưa vào GĐ 11 nếu cần).
- **Phụ thuộc:** GĐ 2, GĐ 4, GĐ 6, GĐ 7.
- **Danh sách Task:**
  - [ ] **Task 8.1:** Xây dựng Mongoose Model `Workflow` (`src/models/Workflow.js`) và `PublishedItem` (`src/models/PublishedItem.js` ánh xạ tới collection `items_web`).
  - [ ] **Task 8.2:** Xây dựng Model `PublishHistory` (`src/models/PublishHistory.js`) lưu lại nhật ký các lần publish.
  - [ ] **Task 8.3:** Xây dựng `workflowService.js`:
    - Lấy trạng thái hiện tại của item version.
    - Thực hiện chuyển trạng thái (Execute Action: ví dụ "Submit for Review", "Approve", "Reject").
    - Lấy danh sách các item đang chờ duyệt thuộc quyền của user hiện tại cho màn hình Workbox.
  - [ ] **Task 8.4:** Xây dựng `publishService.js`:
    - Sao chép phiên bản mới nhất ở trạng thái "Approved" từ `items_master` sang `items_web`.
    - Đồng bộ trọn vẹn cấu trúc `presentation` (Shared Layout và Final Layout của phiên bản được duyệt) sang `items_web`.
    - Hỗ trợ publish các item hệ thống cấu hình Layout/Rendering/Devices/Placeholder Settings từ Master sang Web.
    - Chế độ Smart Publish: Chỉ publish những item có `updatedAt` mới hơn thời điểm publish lần trước.
    - Chế độ Republish: Ghi đè toàn bộ cây con sang `items_web`.
    - Xử lý xóa trên `items_web` đối với các item đã bị xóa trên Master.
    - **Kiểm tra Datasource:** Quét danh sách `datasourceId` trong presentation của các item được publish. Nếu datasource chưa tồn tại trên Web, trả về danh sách cảnh báo (Warnings) cho Publish Dialog.
  - [ ] **Task 8.5:** Xây dựng ứng dụng Workbox:
    - Route `GET /admin/workbox`, controller và view `src/views/admin/workflow/workbox.ejs`.
    - Cho phép duyệt nhanh nhiều item cùng lúc (Approve Selected, Reject Selected kèm lý do phản hồi).
  - [ ] **Task 8.6:** Tích hợp Workflow và Publishing lên Content Editor:
    - Cảnh báo trạng thái Workflow trên thanh thông tin đầu form (Item Info Bar): "This item is in Draft state".
    - Tab "Review" trên Ribbon: Hiển thị các nút hành động tương ứng với trạng thái hiện tại (Submit, Approve...).
    - Tab "Publish" trên Ribbon: Nút "Publish Item" mở hộp thoại chọn chế độ publish, chọn ngôn ngữ, tùy chọn "Publish sub-items", và hiển thị cảnh báo nếu có Datasource liên quan chưa publish.
  - [ ] **Task 8.7:** Xây dựng màn hình Publish Status & Logs theo dõi tiến trình publish theo thời gian thực.
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
  - Tạo collection `items_web` (bản sao tối ưu của `items_master` đã published, bao gồm trường `presentation`).
  - Collections `workflows`, `publish_histories`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Biên tập viên sửa bài viết và thay đổi Presentation, trạng thái bài viết là `Draft`. Bấm "Submit for Review" trên Ribbon -> Trạng thái chuyển thành `Awaiting Approval`.
  - Quản trị viên mở ứng dụng Workbox -> Thấy bài viết trên xuất hiện trong danh sách chờ duyệt.
  - Quản trị viên bấm "Approve" -> Trạng thái chuyển thành `Approved`.
  - Trên Ribbon, bấm "Publish Item" -> Publish Dialog hiển thị; nếu item có rendering trỏ tới datasource item chưa publish, dialog hiển thị cảnh báo màu vàng và cho phép tick chọn "Publish kèm Datasources".
  - Bấm Publish -> Hệ thống thực hiện publish thành công.
  - Kiểm tra database: Bản ghi tương ứng đã xuất hiện trong collection `items_web` với dữ liệu trường và cấu trúc `presentation` chính xác, trong khi các item đang ở trạng thái `Draft` tuyệt đối không xuất hiện trên `items_web`.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Quá trình Publish cây lớn làm khóa database hoặc nghẽn luồng xử lý của Node.js.
  - *Giảm thiểu:* Thực hiện publish theo batch (từng cụm 50-100 items), xử lý bất đồng bộ và trả về tiến trình (progress bar) cho client theo dõi.
- **Ước tính thời gian:** 3.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 9 (GĐ 9): THÙNG RÁC & NHẬT KÝ KIỂM TOÁN (RECYCLE BIN & AUDIT LOG)
- **Mục tiêu:** Đảm bảo an toàn dữ liệu với cơ chế xóa mềm (Soft Delete) đưa item vào Thùng rác (Recycle Bin) cho phép khôi phục nguyên trạng vị trí trên cây, kiểm tra toàn vẹn tham chiếu Presentation khi xoá, kết hợp ghi nhận toàn bộ hoạt động của người dùng (bao gồm thay đổi Presentation) vào Nhật ký kiểm toán (Audit Log) để truy vết.
- **Phạm vi:**
  - *Làm:* Cơ chế Soft-delete trên Item (`isDeleted: true`, ghi nhận ngày xóa và người xóa); Ứng dụng Recycle Bin: xem danh sách item đã xóa, khôi phục item về vị trí cha cũ (nếu cha bị xóa thì khôi phục về root hoặc cảnh báo), xóa vĩnh viễn (Hard Delete); **Kiểm tra toàn vẹn tham chiếu Presentation (Integrity Check):** Khi xoá Layout hoặc Rendering, kiểm tra xem có Item nào đang sử dụng không; nếu có thì chặn xoá hoặc đưa cảnh báo danh sách item bị ảnh hưởng; **Ghi nhận tự động Audit Log cho các hành vi:** Login, Logout, Create, Update, Delete, Publish, Workflow state change, và **ITEM_PRESENTATION_UPDATE** (ai sửa, item nào, rendering nào được thêm/xoá/sắp xếp); Màn hình xem Audit Log có bộ lọc theo User, Action, và khoảng thời gian.
  - *Không làm:* Chưa làm tự động dọn dẹp thùng rác theo lịch định kỳ (retention policy).
- **Phụ thuộc:** GĐ 2, GĐ 8.
- **Danh sách Task:**
  - [ ] **Task 9.1:** Xây dựng Mongoose Model `AuditLog` (`src/models/AuditLog.js`) với các trường: `userId`, `username`, `action`, `targetItemId`, `itemPath`, `details` (oldValues, newValues, presentationChanges), `ipAddress`, `timestamp`.
  - [ ] **Task 9.2:** Xây dựng `auditService.js` cung cấp hàm `logAction(req, action, targetItem, details)` và hàm truy vấn log có phân trang, lọc theo điều kiện.
  - [ ] **Task 9.3:** Tích hợp gọi `auditService.logAction` vào tất cả các tác vụ trọng yếu trong hệ thống (Auth, Item CRUD, Publish, Workflow, Presentation Update).
  - [ ] **Task 9.4:** Cập nhật `itemService.deleteItem`: Chuyển cờ `isDeleted = true` thay vì xóa vật lý khỏi MongoDB; ẩn các item này khỏi Cây nội dung của Content Editor.
  - [ ] **Task 9.5:** Xây dựng tính năng kiểm tra toàn vẹn trước khi xoá Layout/Rendering hoặc Datasource item (cảnh báo hoặc chặn xoá nếu đang có liên kết).
  - [ ] **Task 9.6:** Xây dựng tính năng khôi phục trong `itemService.restoreItem(id)`: Đặt `isDeleted = false`, kiểm tra xem node cha cũ còn tồn tại hay không, tự động gắn lại vào cây.
  - [ ] **Task 9.7:** Xây dựng ứng dụng Recycle Bin & Audit Log Viewer:
    - Route `src/routes/admin/recycleBinRoutes.js` và `src/routes/admin/auditRoutes.js`.
    - Views `src/views/admin/recycle-bin/index.ejs` và `src/views/admin/audit/viewer.ejs`.
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
- **Thay đổi Database:** Collection `audit_logs` với các index `{ timestamp: -1 }`, `{ targetItemId: 1 }`, `{ userId: 1 }`, `{ action: 1 }`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Xóa thử một item bài viết trên Content Editor -> Item biến mất khỏi cây.
  - Mở ứng dụng Recycle Bin từ Launchpad -> Thấy bài viết vừa xóa xuất hiện trong danh sách với đầy đủ thông tin đường dẫn gốc.
  - Thử xoá một Rendering đang được sử dụng trong Home Page -> Hệ thống chặn xoá và hiển thị cảnh báo "Rendering đang được sử dụng bởi /sitecore/content/home".
  - Thay đổi Presentation của một Item (thêm rendering, đổi vị trí) và lưu -> Mở Audit Log thấy xuất hiện dòng log `ITEM_PRESENTATION_UPDATE` ghi rõ chi tiết thay đổi rendering.
  - Bấm nút "Restore" bài viết trong Recycle Bin -> Item biến mất khỏi thùng rác và xuất hiện lại đúng vị trí trên cây Content Editor.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Bảng `audit_logs` tăng dung lượng nhanh chóng theo thời gian.
  - *Giảm thiểu:* Thiết lập index tối ưu và chuẩn bị sẵn cơ chế TTL Index (Time-To-Live) hoặc script lưu trữ nén (archive) khi dữ liệu vượt ngưỡng.
- **Ước tính thời gian:** 2 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 10 (GĐ 10): HEADLESS DELIVERY API, LAYOUT SERVICE & BỘ NHỚ ĐỆM (DELIVERY API, LAYOUT SERVICE & CACHE)
- **Mục tiêu:** Cung cấp hệ thống RESTful JSON API công khai gồm Headless Delivery API và **Layout Service** đọc dữ liệu độc quyền từ `items_web`, hỗ trợ ứng dụng React/Next.js frontend lấy toàn bộ cấu trúc component (route, placeholders, components và datasource resolved) với hiệu năng cao nhờ In-Memory Caching và cơ chế Invalidation tức thì khi publish.
- **Phạm vi:**
  - *Làm:*
    - **Content Delivery API (`/api/v1/content/*`):** Đọc nội dung thô của item đã publish theo ID hoặc Path, lấy cây con, flatten fields, chuyển đổi Media ID sang Media URL đầy đủ (`/media/file/:id`).
    - **Layout Service (`/api/v1/layout` hoặc `/api/delivery/layout`):**
      - Endpoint: `GET /api/v1/layout?path=...&lang=...&device=...`
      - Định dạng JSON chuẩn Sitecore JSS phong cách Headless:
        ```json
        {
          "route": {
            "id": "64a1b2c3d4e5f67890123456",
            "name": "home",
            "displayName": "Home Page",
            "templateId": "64a1b2c3d4e5f67890123450",
            "templateName": "Standard Web Page",
            "fields": {
              "pageTitle": { "value": "Welcome to our Company" }
            },
            "placeholders": {
              "main": [
                {
                  "uid": "b8a5d448-6a3f-4e09-9154-1b12b5f63d33",
                  "componentName": "HeroBanner",
                  "fields": {
                    "headline": { "value": "Future of Content Management" },
                    "image": { "value": { "src": "/media/file/64abc...", "alt": "Hero Image" } }
                  },
                  "params": { "theme": "dark", "fullWidth": "true" }
                }
              ]
            }
          }
        }
        ```
      - Tự động resolve dữ liệu từ Datasource item (đọc từ `items_web`) gán vào `fields` của từng component; nếu component không có datasource riêng, fallback sử dụng chính fields của route item (context item).
      - Xử lý khi Datasource bị thiếu (ví dụ chưa publish lên Web): Vẫn trả rendering với `fields: null` kèm cảnh báo, không làm sập response.
      - Mã lỗi chuẩn: 404 (route/path không tồn tại), 400 (thiếu param bắt buộc), 422 (không tìm thấy layout hợp lệ cho device).
    - **Bộ nhớ đệm (Cache):** In-memory Cache bằng `node-cache` hoặc LRU cache; tự động Invalidate cache khi Publish hoàn tất (xoá cache theo item path hoặc tag liên quan).
    - **Bảo mật API & Tích hợp:** Cấu hình CORS cho phép React frontend kết nối; hỗ trợ API Key hoặc Bearer Token; tích hợp `express-rate-limit` chống DDoS.
  - *Không làm:* Chưa làm GraphQL API (tập trung tối ưu RESTful JSON trước).
- **Phụ thuộc:** GĐ 6, GĐ 8.
- **Danh sách Task:**
  - [ ] **Task 10.1:** Xây dựng module cache `src/utils/cacheManager.js` quản lý lưu và xóa cache theo tag/key cho cả Content và Layout Service.
  - [ ] **Task 10.2:** Xây dựng `deliveryService.js`:
    - `getPublishedItemByPath(path, language)`.
    - `getPublishedItemById(id, language)`.
    - `getChildren(id, language)`.
    - Format fields và chuyển đổi Media ID thành URL đầy đủ.
  - [ ] **Task 10.3:** Xây dựng logic Layout Service trong `presentationService.js` / `deliveryService.js`:
    - Phân giải Layout và Renderings của route từ `items_web`.
    - Gom nhóm các Rendering theo từng Placeholder key (bao gồm việc xử lý các placeholder lồng nhau nếu có).
    - Query dữ liệu của các Datasource items tương ứng từ `items_web` và format cấu trúc `{ uid, componentName, fields, params }`.
  - [ ] **Task 10.4:** Xây dựng `layoutController.js` và route `src/routes/api/v1/layoutRoutes.js` (`GET /api/v1/layout`).
  - [ ] **Task 10.5:** Xây dựng `deliveryController.js` và route `src/routes/api/v1/deliveryRoutes.js` (`GET /api/v1/content/*`).
  - [ ] **Task 10.6:** Tích hợp middleware xóa cache vào `publishService.js`: Khi publish thành công, tự động invalidate các cache key tương ứng của cả item và layout.
  - [ ] **Task 10.7:** Cấu hình CORS middleware cho phép frontend React truy cập, thiết lập rate limiting và xác thực API Key nếu được bật.
- **File/Thư mục dự kiến:**
  - `src/utils/cacheManager.js`
  - `src/services/deliveryService.js`
  - `src/controllers/api/deliveryController.js`, `src/controllers/api/layoutController.js`
  - `src/routes/api/v1/deliveryRoutes.js`, `src/routes/api/v1/layoutRoutes.js`
- **Route / API dự kiến:**
  - `GET /api/v1/content/item?path=...&lang=...`
  - `GET /api/v1/content/item/:id?lang=...`
  - `GET /api/v1/content/children/:id?lang=...`
  - `GET /api/v1/layout?path=/sitecore/content/home&lang=en&device=default`
- **Thay đổi Database:** Không thay đổi schema (truy vấn trực tiếp trên `items_web`).
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Gọi `GET http://localhost:3000/api/v1/layout?path=/sitecore/content/home&lang=en` bằng Postman hoặc trình duyệt.
  - Nhận về phản hồi JSON chuẩn có HTTP 200, chứa đúng `route` và mảng components gom theo `placeholders` (ví dụ `main: [{ componentName: "HeroBanner", ... }]`).
  - Dữ liệu `fields` của component HeroBanner hiển thị đầy đủ tiêu đề và URL hình ảnh media đã resolve chính xác.
  - Lần gọi thứ 2: Response time dưới 10ms do hit cache (`X-Cache: HIT`).
  - Sửa presentation của item trong Admin CMS và Publish lại -> Gọi lại API, cache được làm mới tự động và trả về dữ liệu mới nhất.
  - Thử gọi path không tồn tại -> Trả về HTTP 404 với error message rõ ràng.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Lộ dữ liệu nhạy cảm hoặc dữ liệu draft chưa qua phê duyệt.
  - *Giảm thiểu:* Delivery API và Layout Service tuyệt đối không truy vấn vào collection `items_master`, chỉ đọc từ `items_web` và lọc bỏ các metadata nội bộ không cần thiết.
- **Ước tính thời gian:** 2.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 11 (GĐ 11): MỞ RỘNG TÍNH NĂNG (FORMS BUILDER, SERIALIZATION, TÌM KIẾM & CONTROL PANEL)
- **Mục tiêu:** Bổ sung các công cụ cao cấp gia tăng sức mạnh hệ sinh thái CMS: Forms Builder (kéo thả biểu mẫu khảo sát/liên hệ), Serialization (kết xuất và nhập khẩu dữ liệu Item ra tệp JSON phục vụ backup/di chuyển môi trường), Full-text search toàn hệ thống, Control Panel quản trị hệ thống, và phiên bản thử nghiệm Experience Editor đơn giản (xem trước trang trong iframe).
- **Phạm vi:**
  - *Làm:*
    - **Forms Builder:** Thiết kế form kéo thả trường (Text, Email, Dropdown, Button), lưu trữ submission của người dùng.
    - **Serialization:** Tính năng "Serialize Item / Tree" xuất toàn bộ nhánh cây ra tệp JSON và "Sync/Deserialize" nhập lại vào hệ thống (hỗ trợ cả dữ liệu fields và presentation).
    - **Full-Text Search:** Ô tìm kiếm trên Cây nội dung và tìm kiếm nâng cao theo từ khóa, template, ngày tạo.
    - **Control Panel:** Màn hình quản trị cấu hình hệ thống, dọn dẹp cache, xem thông số MongoDB.
    - **Experience Editor đơn giản (Mở rộng - Mức ưu tiên thấp):** Cửa sổ xem trước trang React frontend trong thẻ `<iframe>` kèm thanh công cụ bên cạnh cho phép biên tập nhanh các trường và component parameters của trang mà không cần vào Content Editor.
  - *Không làm:* Chưa làm tích hợp gửi mail SMTP thực tế của form submission (chỉ lưu vào database).
- **Phụ thuộc:** GĐ 2, GĐ 3, GĐ 8.
- **Danh sách Task:**
  - [ ] **Task 11.1:** Xây dựng tính năng Serialization trong `serializationService.js`:
    - `exportTreeToJson(rootItemId)`: Đệ quy xuất item và toàn bộ con cháu kèm metadata, versions và presentation thành 1 file JSON tải về.
    - `importTreeFromJson(jsonData, targetParentId)`: Đọc file JSON và tạo/cập nhật tương ứng vào MongoDB.
  - [ ] **Task 11.2:** Tích hợp Serialization vào Ribbon Tab "Developer" hoặc "Configure" trên Content Editor.
  - [ ] **Task 11.3:** Xây dựng tính năng Tìm kiếm `searchService.js`: Sử dụng MongoDB Text Index trên các trường `displayName`, `fields` của Item để tìm kiếm nhanh từ khóa; hỗ trợ tìm theo đường dẫn và template.
  - [ ] **Task 11.4:** Bổ sung ô Search nhanh ngay phía trên Cây nội dung Content Editor (gõ từ khóa -> lọc danh sách kết quả trực tiếp).
  - [ ] **Task 11.5:** Xây dựng Forms Builder: Model `CmsForm` và `FormSubmission`, giao diện kéo thả form fields sử dụng SortableJS (`src/views/admin/forms/form-designer.ejs`), API tiếp nhận nộp form.
  - [ ] **Task 11.6:** Xây dựng ứng dụng Control Panel (`src/views/admin/control-panel/index.ejs`): Quản trị dọn dẹp cache hệ thống (Flush Cache), thống kê dung lượng database, số lượng items/media, re-index tìm kiếm.
  - [ ] **Task 11.7 (Ưu tiên thấp):** Xây dựng trang Experience Editor Preview đơn giản (`src/views/admin/content-editor/experience-editor-preview.ejs`): nạp URL live frontend vào `<iframe>` với thanh thuộc tính chỉnh sửa nhanh.
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
- **Thay đổi Database:** Collections `cms_forms`, `form_submissions`; tạo Text Index trên collection `items_master`.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Chọn một nhánh cây nội dung, bấm "Export Tree" -> Tải về file `.json` chứa đầy đủ cấu trúc phân cấp và presentation.
  - Thử xóa một item con, sau đó bấm "Import Tree" chọn file vừa xuất -> Cây nội dung và presentation được phục hồi trọn vẹn.
  - Gõ từ khóa vào ô tìm kiếm trên cây nội dung -> Trả về danh sách các item khớp nội dung trong vòng dưới 100ms.
  - Vào Forms Builder, tạo một form "Liên hệ" gồm 3 trường: Họ tên, Email, Nội dung. Lưu thành công.
- **Rủi ro & Giảm thiểu:**
  - *Rủi ro:* Tệp JSON import quá lớn gây tràn bộ nhớ Node.js.
  - *Giảm thiểu:* Sử dụng JSON stream parser (`stream-json`) khi xử lý file import kích thước lớn.
- **Ước tính thời gian:** 3.5 ngày làm việc.
- **Trạng thái:** Chưa bắt đầu.

---

### GIAI ĐOẠN 12 (GĐ 12): HOÀN THIỆN, BẢO MẬT, HIỆU NĂNG, TÀI LIỆU & DOCKER
- **Mục tiêu:** Kiểm thử toàn diện hệ thống (Unit / Integration / E2E Test), tối ưu hóa hiệu năng truy vấn database, rà soát lỗ hổng bảo mật, đóng gói container hóa bằng Docker & Docker Compose, và hoàn thiện bộ tài liệu hướng dẫn vận hành.
- **Phạm vi:**
  - *Làm:*
    - Viết bộ test tự động (Jest / Supertest) kiểm thử các service trọng yếu (Item CRUD, Tree calculation, ACL calculation, Presentation calculation, Publish, Layout Service).
    - **Kiểm thử End-to-End (E2E Test) luồng Headless Presentation:** Admin cấu hình Presentation Details (chọn Layout, gán Rendering, gán Datasource) -> Chuyển Workflow & Publish sang Web -> Gọi Layout Service `GET /api/v1/layout` -> Xác nhận JSON trả về đúng layout, đúng placeholders và datasource resolved chuẩn xác.
    - Rà soát bảo mật: kiểm tra escape EJS, chống NoSQL Injection, kiểm tra CSRF token toàn bộ forms, bảo vệ HTTP headers với Helmet, bảo vệ API Delivery với Rate Limit và API Key.
    - Tối ưu hóa hiệu năng: kiểm tra execution plan MongoDB (`explain()`), bảo đảm 100% các câu truy vấn cây và presentation đều sử dụng index tối ưu.
    - Container hóa: Viết `Dockerfile` và `docker-compose.yml` (bao gồm App Node.js và MongoDB sẵn sàng chạy chỉ với 1 lệnh).
    - Tài liệu: `README.md` hoàn chỉnh hướng dẫn cài đặt, cấu hình, kiến trúc và vận hành.
  - *Không làm:* Chưa triển khai hạ tầng Kubernetes phân tán.
- **Phụ thuộc:** Hoàn thành toàn bộ từ GĐ 0 đến GĐ 11.
- **Danh sách Task:**
  - [ ] **Task 12.1:** Thiết lập framework kiểm thử tự động với Jest và Supertest.
  - [ ] **Task 12.2:** Viết bộ kiểm thử Unit Test cho `aclService.js` (tính toán quyền kế thừa và quyền ghi đè, quyền presentation).
  - [ ] **Task 12.3:** Viết bộ kiểm thử Unit Test cho `presentationService.js` (gộp Standard Presentation + Shared Layout + Final Layout delta override).
  - [ ] **Task 12.4:** Viết bộ kiểm thử Integration Test cho các luồng: Đăng nhập -> Tạo Template -> Tạo Item -> Cấu hình Presentation -> Chuyển Workflow -> Publish ra Web -> Gọi Layout Service.
  - [ ] **Task 12.5:** Rà soát và vá các lỗ hổng bảo mật tiềm ẩn (CSRF, XSS, NoSQL Injection, Brute Force).
  - [ ] **Task 12.6:** Tối ưu hóa Database: Tạo compound index cho các truy vấn phức tạp, loại bỏ các index dư thừa.
  - [ ] **Task 12.7:** Xây dựng `Dockerfile` đa tầng (multi-stage build) tối ưu kích thước image và thiết lập người dùng non-root an toàn.
  - [ ] **Task 12.8:** Xây dựng `docker-compose.yml` kết nối container ứng dụng Node.js với container MongoDB kèm persistent volume.
  - [ ] **Task 12.9:** Soạn thảo tài liệu `README.md` và tài liệu hướng dẫn sử dụng giao diện CMS cho người dùng cuối.
- **File/Thư mục dự kiến:**
  - `tests/unit/aclService.test.js`, `tests/unit/presentationService.test.js`, `tests/integration/presentationFlow.test.js`
  - `Dockerfile`, `docker-compose.yml`, `.dockerignore`
  - `README.md`
- **Route / API dự kiến:** Đảm bảo toàn bộ route hiện hữu hoạt động ổn định và đạt chuẩn kiểm thử.
- **Thay đổi Database:** Bổ sung các compound indexes hoàn thiện.
- **Definition of Done (DoD) & Cách kiểm thử:**
  - Chạy `npm test` -> 100% các ca kiểm thử tự động đều PASS, bao gồm test e2e luồng Presentation và Layout Service.
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
| **GĐ 1** | Nền tảng xác thực & Launchpad | **Hoàn thành** | 2026-11-03 | 2026-11-03 | Đã xong User/Role model, Session MongoStore, Auth Middleware, Màn hình Login Sitecore, dynamic Launchpad theo role, Seed script |
| **GĐ 2** | Content Editor MVP (Cây, CRUD, Ribbon Home) | **Hoàn thành** | 2026-11-03 | 2026-11-03 | Đã xong Item/Template model, Fancytree lazy-load + dnd5, Partial HTML Form, Ribbon Home CRUD, Optimistic locking 409, Rich Text sanitize |
| **GĐ 3** | Template Manager (Fields, Kế thừa, Insert Options) | **Hoàn thành** | 2026-11-03 | 2026-11-03 | Đã xong Template/Section/Field schema, Kế thừa Base Templates đa cấp chống chu trình, Standard Values động, Insert Options |
| **GĐ 4** | Quản lý Phiên bản & Đa ngôn ngữ | **Chưa bắt đầu** | - | - | Chờ phê duyệt (bổ sung chừa chỗ schema Presentation) |
| **GĐ 5** | Media Library & Media Picker Modal | **Chưa bắt đầu** | - | - | Chờ phê duyệt (Media Picker sẵn sàng cho Presentation) |
| **GĐ 6** | Presentation (Layout, Rendering, Placeholder Settings) | **Chưa bắt đầu** | - | - | Giai đoạn mới thêm vào theo Change Request kiến trúc Headless |
| **GĐ 7** | Bảo mật nâng cao & Phân quyền truy cập (ACL) | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 6 cũ; bổ sung phân quyền Presentation |
| **GĐ 8** | Workflow Engine, Workbox & Publishing (Master -> Web) | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 7 cũ; bổ sung publish Presentation và xử lý Datasource |
| **GĐ 9** | Thùng rác (Recycle Bin) & Nhật ký kiểm toán (Audit Log) | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 8 cũ; bổ sung audit log Presentation và kiểm tra toàn vẹn |
| **GĐ 10** | Headless Delivery API, Layout Service & Bộ nhớ đệm | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 9 cũ; bổ sung Layout Service cho React frontend |
| **GĐ 11** | Mở rộng tính năng (Forms, Serialization, Search) | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 10 cũ; thêm Experience Editor đơn giản (ưu tiên thấp) |
| **GĐ 12** | Hoàn thiện, Bảo mật, Hiệu năng, Test & Docker | **Chưa bắt đầu** | - | - | Đánh số lại từ GĐ 11 cũ; bổ sung E2E test cho luồng Presentation |

---

## 7. CÂU HỎI CẦN XÁC NHẬN (KÈM ĐỀ XUẤT MẶC ĐỊNH)

1. **Quản lý Layout/Rendering/Placeholder Settings trong Content Editor hay trang riêng?**
   - *Lựa chọn A (Đề xuất mặc định):* Quản lý ngay trong Content Editor dưới nhánh cây hệ thống `/sitecore/layout/*` (Everything is an Item), form biên tập tự động sinh theo System Template (`Layout`, `Rendering`, `Placeholder Settings`).
   - *Lựa chọn B:* Xây dựng ứng dụng quản trị riêng biệt ngoài Content Editor (ví dụ giao diện "Presentation Manager" trên Launchpad).
   - *Lý do đề xuất:* Tuân thủ triệt để triết lý Sitecore "Mọi thứ là Item", tái sử dụng 100% nền tảng Content Editor (Fancytree, CRUD, ACL, Template inheritance) mà không phải viết thêm trang quản trị riêng.

2. **Cơ chế lưu trữ Presentation của Item (Lưu toàn bộ hay Delta Override)?**
   - *Lựa chọn A (Đề xuất mặc định):* **Delta Override** so với Standard Presentation của Template. Item chỉ lưu danh sách thay đổi (thêm rendering mới, ghi đè datasource/parameters/sortOrder, hoặc đánh dấu ẩn rendering từ Standard).
   - *Lựa chọn B:* Lưu trọn vẹn toàn bộ mảng Renderings của Item khi biên tập.
   - *Lý do đề xuất:* Khi cấu hình Standard Presentation ở Template thay đổi (ví dụ thêm footer component), tất cả các item chưa override sẽ tự động thừa hưởng thay đổi đó ngay lập tức; đồng thời tối ưu kích thước document MongoDB.

3. **Cú pháp Placeholder Key động (`column-{*}`) ở MVP:**
   - *Lựa chọn A (Đề xuất mặc định):* Có hỗ trợ ở mức đơn giản bằng ánh xạ Wildcard sang Regular Expression (ví dụ: `column-{*}` khớp với `column-1`, `column-left`, `column-2`).
   - *Lựa chọn B:* Chỉ hỗ trợ các key placeholder tĩnh tuyệt đối (như `main`, `header`, `footer`).
   - *Lý do đề xuất:* Cực kỳ quan trọng để frontend React xây dựng các component layout dạng lưới (Grid 2 cột, 3 cột) mà không phải cấu hình hàng chục Placeholder Settings thủ công.

4. **Tách Presentation theo Device ngay từ GĐ 6:**
   - *Lựa chọn A (Đề xuất mặc định):* Có, thiết kế hỗ trợ 2 device cơ bản là `Default` và `Mobile` (với `Mobile` có thể fallback về `Default`).
   - *Lựa chọn B:* Chỉ hỗ trợ 1 thiết bị duy nhất ở MVP.
   - *Lý do đề xuất:* Định hình cấu trúc dữ liệu schema chuẩn hóa ngay từ đầu tránh phải migration phức tạp sau này; giao diện tab Device đơn giản, dễ sử dụng.

5. **Xử lý Datasource chưa publish khi Publish Item:**
   - *Lựa chọn A (Đề xuất mặc định):* **Cảnh báo (Warning)** trong Publish Dialog và cung cấp checkbox "Publish kèm các Datasource liên đới", cho phép người dùng quyết định tiếp tục publish.
   - *Lựa chọn B:* Chặn cứng (Hard Block), không cho phép publish item nếu có bất kỳ datasource nào chưa được publish lên Web.
   - *Lý do đề xuất:* Giúp trải nghiệm biên tập linh hoạt; trên frontend React, nếu datasource thiếu thì Layout Service trả `fields: null` và component tự xử lý fallback an toàn mà không làm gãy toàn bộ trang.

6. **Định dạng JSON của Layout Service đối với React Frontend:**
   - *Lựa chọn A (Đề xuất mặc định):* Định dạng chuẩn Headless tương tự Sitecore JSS Layout Service (gồm đối tượng `route` và bản đồ `placeholders: { [key]: components[] }`), tối giản phù hợp với Component Factory của React.
   - *Lựa chọn B:* Tuân thủ 100% toàn bộ metadata phức tạp của Sitecore Layout Service (kể cả context tracking, visitor data).
   - *Lý do đề xuất:* Giữ JSON tinh gọn, giảm payload network, tối ưu tốc độ render cho Next.js/React.

7. **Bổ sung Tile "Presentation" riêng trên Dashboard Launchpad:**
   - *Lựa chọn A (Đề xuất mặc định):* Không cần tile riêng; người dùng thao tác Presentation Details trực tiếp qua Ribbon tab `Presentation` trong Content Editor, và cấu hình Layout/Rendering tại nhánh `/sitecore/layout/`.
   - *Lựa chọn B:* Tạo một tile "Presentation Designer" riêng trên Launchpad.
   - *Lý do đề xuất:* Giữ Launchpad gọn gàng, đúng luồng tác vụ Sitecore tiêu chuẩn.

8. **Mức độ ưu tiên của Experience Editor đơn giản (WYSIWYG Preview trong iframe):**
   - *Lựa chọn A (Đề xuất mặc định):* Xếp vào danh sách mở rộng ở **GĐ 11 với mức ưu tiên thấp (Optional)**. Trọng tâm cốt lõi là hoàn thiện Content Editor form-based và Headless Layout Service ổn định.
   - *Lựa chọn B:* Làm ngay Experience Editor WYSIWYG cùng lúc ở GĐ 6.
   - *Lý do đề xuất:* Làm WYSIWYG in-line cho headless React rất tốn thời gian (cần iframe bridge, postMessage sync, content editable tags), trong khi MVP headless chỉ cần Layout Service trả JSON chính xác cho frontend.

---

## 8. NHẬT KÝ QUYẾT ĐỊNH (DECISION LOG)

- **[2026-11-03] - Quyết định Kiến trúc Cây nội dung:** Sử dụng kết hợp **Materialized Path + Ancestors Array** để tối ưu hóa đồng thời cả truy vấn lazy-load con trực tiếp lẫn truy vấn toàn bộ nhánh cây phục vụ Publish và Move.
- **[2026-11-03] - Quyết định Tầng điều khiển:** Mọi Controller (Admin và Public API) đều phải gọi qua Service chung, không truy vấn database trực tiếp từ Controller nhằm đảm bảo toàn vẹn nghiệp vụ.
- **[2026-11-03] - Quyết định Giao diện Form Editor:** Sử dụng mô hình Partial HTML SSR: Server render form EJS gửi về client khi click node, giữ mã client-side tối giản và bảo mật.
- **[2026-11-03] - Quyết định Logging (GĐ 0):** Sử dụng **Winston** làm logger tập trung; tự động định dạng màu và timestamp trên console môi trường dev, xuất JSON chuẩn trên môi trường production.
- **[2026-11-03] - Quyết định Layout Engine (GĐ 0):** Sử dụng **`express-ejs-layouts`** để tách biệt shell master layout (`shell.ejs`) và layout auth (`auth.ejs`), hỗ trợ trích xuất block styles/scripts tự động.
- **[2026-11-03] - Quyết định Kiến trúc CSS (GĐ 0):** Xây dựng bằng CSS thuần theo module `variables.css` (biến màu Sitecore navy, red, xám, và pastel tiles), `base.css`, `layout.css`, `components.css`. Không phụ thuộc Tailwind/Bootstrap.
- **[2026-11-03] - Quyết định Quản lý Kết nối MongoDB (GĐ 0):** Không block server crash khi MongoDB chưa bật trong môi trường dev; endpoint `/health` trả về trạng thái thực tế (`connected` hoặc `disconnected`) với graceful reconnection.
- **[2026-11-03] - Quyết định Quản lý Session & Lưu trữ (GĐ 1):** Sử dụng `express-session` kết hợp `connect-mongo` lưu trữ session tập trung trong collection `sessions` của MongoDB, fallback sang `MemoryStore` trong môi trường test/dev khi Mongo chưa kết nối; cấu hình cookie `httpOnly: true`, `sameSite: 'lax'`, thời hạn 24h.
- **[2026-11-03] - Quyết định Mã hóa Mật khẩu (GĐ 1):** Sử dụng `bcryptjs` với salt rounds = 10, đóng gói phương thức tĩnh `hashPassword` và phương thức instance `comparePassword` trực tiếp trong User Mongoose schema.
- **[2026-11-03] - Quyết định Phân quyền Hiển thị Launchpad (GĐ 1):** Administrator được xem toàn bộ ứng dụng; các role khác (Author, Editor...) chỉ thấy ứng dụng nếu `allowedRoles` trống hoặc chứa role của user. Fallback sang danh mục default apps nếu database chưa seed.
- **[2026-11-03] - Quyết định Thư viện Cây Fancytree & Kéo thả (GĐ 2):** Sử dụng Fancytree CDN kết hợp extension `dnd5` (HTML5 native Drag & Drop) để hỗ trợ lazy-load qua AJAX `/api/items/:id/children` và kéo thả di chuyển node mà không phụ thuộc jQuery UI nặng nề.
- **[2026-11-03] - Quyết định Khóa Lạc quan Optimistic Locking (GĐ 2):** Kiểm tra `updatedAt` gửi lên từ client (`expectedUpdatedAt`). Nếu bản ghi trên DB có `updatedAt` khác biệt, trả về HTTP `409 Conflict` để bảo vệ dữ liệu chống ghi đè chéo session.
- **[2026-11-03] - Quyết định Sanitize HTML Rich Text (GĐ 2):** Sử dụng `sanitize-html` (phiên bản CJS tương thích) tại tầng server (`src/fields/index.js`), lọc bỏ toàn bộ các thẻ script, iframe, inline event handler nguy hiểm để triệt tiêu Stored XSS.
- **[2026-11-03] - Quyết định Kiểm tra Vòng lặp khi Move Item (GĐ 2):** Kiểm tra `targetParent.ancestors` không được chứa `item._id`, chặn hoàn toàn việc di chuyển một node cha vào bên trong node con cháu của chính nó.
- **[2026-11-03] - Quyết định Quy tắc Insert Options (GĐ 2):** Nếu Template của node cha đã cấu hình `insertOptions`, chỉ cho phép tạo các template nằm trong danh sách; nếu chưa cấu hình (mảng rỗng), mặc định cho phép chọn toàn bộ Template hiện có.
- **[2026-11-03] - Quyết định Lưu trữ Giá trị Field theo Immutable Field ID (GĐ 3):** Chuyển đổi khóa lưu trữ giá trị field từ `fieldName` sang `fieldId` (`_id.toString()`) bất biến của Field Schema. Cung cấp cơ chế dual-key fallback và script di trú dữ liệu tự động `npm run migrate`.
- **[2026-11-03] - Quyết định Thuật toán Kế thừa Đa cấp & Chống Chu trình (GĐ 3):** `resolveTemplate` duyệt đệ quy đa cấp Base Templates theo thứ tự sâu nhất đến nông nhất, gộp sections trùng tên, con ghi đè field trùng tên của cha, gán nhãn `origin` (kế thừa từ template nào) và kiểm tra Cycle Detection chặn vòng lặp phụ thuộc (ví dụ A ← B ← A) với giới hạn độ sâu 10 cấp.
- **[2026-11-03] - Quyết định Standard Values Động (GĐ 3):** Giá trị mặc định (Standard Values) không gán tĩnh cố định vào item khi khởi tạo mà được tính toán động tại thời điểm đọc; nếu người dùng chưa ghi đè field, sửa Standard Value ở Template sẽ ngay lập tức phản ánh sang toàn bộ các Content Item thuộc Template đó. Hỗ trợ nút "Reset to Standard Value" để biên tập viên khôi phục giá trị mặc định.
- **[2026-11-03] - Quyết định Bảo vệ Xóa An toàn Cho Template (GĐ 3):** Chặn xóa template nếu `isSystem === true`, hoặc đang có Content Items đang dùng template đó, hoặc có Template khác đang kế thừa (`baseTemplates`).
- **[2026-11-03] - Quyết định Bổ sung Giai đoạn Presentation (GĐ 6) & Tịnh tiến Đánh số (GĐ 0 → GĐ 12):** Đặt Giai đoạn Presentation (GĐ 6) ngay sau Media Library (GĐ 5) và trước Bảo mật nâng cao (GĐ 7) nhằm hoàn thiện năng lực tổ chức bố cục trang và phân giải component Headless trước khi xây dựng phân quyền (ACL), phê duyệt (Workflow) và xuất bản (Publish). Các giai đoạn sau được tịnh tiến số thứ tự tương ứng tạo thành lộ trình 13 giai đoạn (GĐ 0 đến GĐ 12).
- **[2026-11-03] - Quyết định Kiến trúc Presentation Headless (Shared Layout vs. Final Layout):** Phân chia Presentation thành 2 tầng: `sharedLayout` (lưu ở cấp item, áp dụng cho mọi ngôn ngữ và version) và `finalLayout` (lưu delta override theo từng cặp `language + version`). Khi nhân bản hoặc tạo version mới, `finalLayout` của version nguồn được tự động sao chép sang version mới.
- **[2026-11-03] - Quyết định Thuật toán Phân giải Presentation (Delta Resolution):** Phân giải theo thứ tự ưu tiên: `finalLayout` (override theo version) -> `sharedLayout` (override cấp item) -> `standardPresentation` (kế thừa từ Template). Mỗi rendering instance bắt buộc mang `uid` chuẩn UUID v4 bất biến để đối chiếu delta (thêm mới, chỉnh sửa datasource/parameters, hoặc đánh dấu ẩn rendering từ cấp cha).
- **[2026-11-03] - Quyết định Quy tắc Khớp Dynamic Placeholder Keys:** Hỗ trợ placeholder key dạng wildcard `column-{*}` bằng cách ánh xạ sang Regex `^column-.*$` tại tầng service, cho phép một thiết lập Placeholder Settings áp dụng linh hoạt cho nhiều cột lưới động (column-1, column-2...).
- **[2026-11-03] - Quyết định Xử lý Datasource Chưa Publish (Cảnh báo mềm):** Khi publish một item có rendering trỏ tới datasource item chưa publish trên Web, hệ thống đưa ra cảnh báo Warning trong Publish Dialog kèm checkbox cho phép người dùng lựa chọn "Publish liên đới các Datasource liên quan" thay vì chặn cứng.
- **[2026-11-03] - Quyết định Quản lý Layout/Rendering như Item Hệ thống:** Tổ chức Layout, Rendering, Device, Placeholder Settings dưới dạng các Item thông thường bên dưới nhánh `/sitecore/layout/*` trong Content Editor (kế thừa triết lý "Everything is an Item"), không tạo thêm giao diện quản trị riêng biệt ngoài Content Editor.

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

