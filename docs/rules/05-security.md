# Quy ước Bảo mật Hệ thống (Security Rules)
> File: `docs/rules/05-security.md`  
> Mô tả: Cơ chế chống CSRF, chống XSS, kiểm soát quyền truy cập Item-level ACL, action canPerform và bảo vệ API.

---

## 1. Phòng chống Giả mạo Yêu cầu Chéo trang (CSRF Protection)
- Áp dụng cơ chế lai phù hợp cho cả SSR Form và AJAX Fetch:
  - Mọi Form HTML trong EJS gửi qua `POST`, `PUT`, `DELETE` bắt buộc có input ẩn:
    ```html
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
    ```
  - Mọi request AJAX / Fetch từ client script bắt buộc gửi kèm header:
    ```javascript
    headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' }
    ```
  - Server middleware xác thực token từ cả 2 nguồn: `req.body._csrf` và `req.headers['x-csrf-token']`.

---

## 2. Phòng chống Tấn công XSS (Cross-Site Scripting)
- **Quy tắc render EJS:**
  - Luôn sử dụng cú pháp tự động escape `<%= data %>` cho 100% dữ liệu văn bản từ database hoặc user input.
  - Tuyệt đối không dùng `<%- data %>` bừa bãi; chỉ sử dụng `<%- data %>` tại những vị trí hiển thị mã HTML của field kiểu `Rich Text`.
- **Sanitize HTML tại tầng Server:**
  - Toàn bộ dữ liệu HTML xuất phát từ field `Rich Text` trước khi ghi vào MongoDB phải đi qua thư viện `sanitize-html` (`src/fields/index.js`).
  - Lọc bỏ triệt để các thẻ nguy hiểm (`<script>`, `<iframe>`, `<object>`, `<embed>`) và các thuộc tính thực thi script (`onload=`, `onerror=`, `onclick=`, `javascript:`).

---

## 3. Hệ thống Phân quyền Chi tiết (Item-Level ACL)
Mỗi Item trên cây nội dung có thể được gán quyền riêng cho User hoặc Role với cơ chế kế thừa phân cấp từ nút cha xuống con:

### Thuật toán Đánh giá Quyền Hiệu dụng (Effective Permissions Calculation)
Thứ tự ưu tiên đánh giá quyền theo chuẩn Treecraft:
$$\text{Explicit Deny} > \text{Explicit Allow} > \text{Inherited Deny} > \text{Inherited Allow} > \text{Default Deny}$$

- **Explicit (Gán trực tiếp trên Item):** Ưu tiên cao hơn mọi quyền kế thừa từ tổ tiên.
- **Deny luôn thắng Allow:** Nếu user có 2 Role trên cùng một item, một Role Allow và một Role Deny thì kết quả là **Deny**.

### Hàm `canPerform(userId, action, itemId)`
Tầng `aclService.js` cung cấp hàm chuẩn kiểm tra quyền của user trên item trước mọi tác vụ:
- Các action được hỗ trợ:
  - `read`: Xem item và nội dung fields.
  - `write`: Sửa và lưu fields của item.
  - `create`: Tạo item con bên dưới.
  - `delete`: Xóa item vào thùng rác hoặc xóa vĩnh viễn.
  - `publish`: Xuất bản item từ Master sang Web.
  - `presentation:read`: Xem cấu hình Presentation Details.
  - `presentation:write`: Sửa, thêm, sắp xếp rendering hoặc reset Presentation Details.

---

## 4. Bảo mật Tải lên & Phục vụ Tệp tin (Media Upload & Serving Security — GĐ 5.1 & DEC-038)
- **Bảo mật Cloudinary Credentials:** `CLOUDINARY_API_SECRET` chỉ được sử dụng nghiêm ngặt tại backend Node.js (`src/services/storage/CloudinaryStorageProvider.js`), tuyệt đối không gửi ra phía client hoặc render trong mã nguồn frontend EJS.
- **Kiểm tra Magic Bytes nhị phân:** Không chỉ dựa vào đuôi mở rộng file (`.jpg`, `.png`) hay MIME type do client khai báo. Mọi file upload đều được quét Magic Bytes thực tế (`src/utils/fileSniffer.js`) trong bộ nhớ buffer trước khi stream lên Cloudinary, ngăn chặn kẻ xấu đổi đuôi file mã độc thực thi (`.exe`, `.sh`, `.php` đổi thành `.jpg`).
- **Khử độc file SVG (SVG Sanitization):** File vector SVG bản chất là XML text có nguy cơ chứa mã JavaScript độc hại. Mọi tệp SVG tải lên đều được tự động làm sạch qua `sanitize-html` loại bỏ thẻ `<script>`, `onload`, `onclick`, `javascript:` trước khi tải lên Cloudinary.
- **Giới hạn kích thước:** Server áp dụng Multer memory limit tối đa 10MB/tệp; Client hỗ trợ nén canvas HTML5 trước khi truyền tải qua mạng.
- **Bảo vệ Transformation & CDN Caching:** Giới hạn whitelisted transformation presets (`thumb`, `medium`, `large`), ngăn chặn tấn công spam tham số biến đổi làm cạn kiệt hạn ngạch Cloudinary. Endpoint `GET /media/file/:id` chuyển hướng HTTP 302 trực tiếp sang Cloudinary CDN kèm header `Cache-Control: public, max-age=31536000, immutable`.

---

## 5. Bảo mật Cơ chế Site Renderer & Quản lý `viewPath`
- **Whitelist thư mục view gốc:** 
  - Chỉ cho phép thuộc tính `viewPath` của Layout và Rendering trỏ vào bên trong thư mục `src/views/site/` (ví dụ `layouts/HomeLayout.ejs`, `components/HeroBanner.ejs`).
  - Sử dụng `path.resolve` và kiểm tra nghiêm ngặt `resolvedPath.startsWith(path.resolve('src/views/site'))`. Mọi đường dẫn chứa `../` hoặc cố tình trỏ sang thư mục `src/views/admin/` hay các tệp nhạy cảm trong hệ thống đều bị chặn lập tức và ném ngoại lệ 403 Forbidden.
- **Bắt buộc định dạng `.ejs`:** Chỉ chấp nhận các tệp tin có đuôi mở rộng `.ejs`.
- **Kiểm tra sự tồn tại của tệp tin:** Khi tạo hoặc cập nhật Layout / Rendering trong Content Editor, hệ thống kiểm tra sự tồn tại thực tế của tệp EJS trên đĩa và đưa ra cảnh báo cho biên tập viên nếu tệp chưa được tạo trong repo.
- **Cô lập lỗi Component (Error Boundary):**
  - Khi render từng Rendering bên trong helper `placeholder(key)`, mỗi component được bọc trong khối try-catch an toàn.
  - Nếu một component bị lỗi runtime EJS, hệ thống ghi log lỗi `logger.error`, hiển thị khung cảnh báo chi tiết ở môi trường phát triển (`NODE_ENV === 'development'`) và ẩn nhẹ nhàng ở môi trường production. Lỗi của một component **tuyệt đối không làm sập cả trang web**.
- **Phân ly dữ liệu tuyệt đối (Master vs Web):** 
  - Tuyến đường công khai của Site Renderer chỉ được phép đọc dữ liệu từ collection `items_web`. Trang web chưa từng được publish hoặc đang ở trạng thái nháp sẽ trả về HTTP 404 Not Found.
- **Quy tắc render an toàn:** Mặc định luôn escape bằng `<%= %>`. Cú pháp `<%- %>` chỉ được dùng cho nội dung trường `Rich Text` đã qua `sanitize-html` và được xử lý qua hàm `resolveRichText(html)`.
- **Chống DDoS & Brute Force:** Áp dụng `express-rate-limit` giới hạn tần suất request công khai trên mỗi IP (ví dụ 100 req/phút).

---

## 6. Bảo vệ Website Công Khai Bằng HTTP Basic Authentication (GĐ B1 / DEC-046)
- **Chuẩn RFC 7617:** Khi tính năng bật, yêu cầu header `Authorization: Basic <base64(user:pass)>`. Nếu thiếu hoặc sai, trả về `401 Unauthorized` kèm header `WWW-Authenticate: Basic realm="..."`.
- **Mật khẩu an toàn:** Mật khẩu người dùng Basic Auth chỉ lưu dạng băm bcrypt (`SALT_ROUNDS = 10`) trong collection `settings` (key `basicAuth`). Tuyệt đối không lưu mật khẩu thô và không trả `passwordHash` ra API hoặc giao diện.
- **Timing Attack Mitigation:** Khi username không tồn tại, thực hiện so sánh với `DUMMY_HASH` để đảm bảo thời gian tính toán bcrypt không làm lộ sự tồn tại của người dùng.
- **Chống Brute-force:** Rate-limit in-memory theo `(ip, username)` khóa tạm tài khoản sau 5 lần thử sai trong 15 phút (`429 Too Many Requests` kèm `Retry-After: 900`).
- **Phân định phạm vi:** Tuyệt đối không chặn các route quản trị (`/admin`), API (`/api`), kiểm tra trạng thái (`/health`), hoặc trang xem trước (`/admin/preview`). Hỗ trợ cấu hình `excludePaths` và `ipAllowlist` (hỗ trợ dải CIDR).
- **Chống rò rỉ Cache:** Mọi phản hồi thuộc phạm vi bảo vệ của Basic Auth luôn mang header `Cache-Control: private, no-store, max-age=0, must-revalidate`.
- **Technical SEO:** Endpoint `/robots.txt` tự động trả về `User-agent: *\nDisallow: /` khi Basic Auth bật để ngăn chặn máy tìm kiếm thu thập dữ liệu site staging/dev.
- **Quyền hạn quản trị:** Toàn bộ quyền xem và thay đổi cấu hình Basic Auth được kiểm soát qua `canPerform(user, null, 'basicauth:read')` và `canPerform(user, null, 'basicauth:manage')`. Không kiểm tra cứng role name.
- **Gỡ khoá khẩn cấp:** Hỗ trợ biến môi trường `BASIC_AUTH_ENABLED=false` và các lệnh CLI cứu hộ (`npm run basicauth:disable`, `npm run basicauth:add-user -- <username>`).

---

## 7. Bảo mật Sao lưu & Phục hồi Cơ sở Dữ liệu (Backup & Restore - GĐ K1 / DEC-051)
- **Chống tấn công Path Traversal:**
  - `backupId` chỉ chấp nhận ký tự an toàn theo biểu thức chính quy `^[a-zA-Z0-9_-]+$`. Mọi chuỗi chứa `..`, `/`, `\` hoặc ký tự đặc biệt đều bị từ chối với lỗi 400 ValidationError.
  - Phân giải đường dẫn luôn đi qua `path.resolve` và kiểm tra nghiêm ngặt `resolvedPath.startsWith(path.resolve(baseDir))`.
- **Mã hóa dữ liệu lưu trữ (Encryption at Rest):**
  - Hỗ trợ mã hóa đối xứng **AES-256-GCM** với khóa dẫn xuất từ biến môi trường `BACKUP_ENCRYPTION_KEY`.
  - Khóa bí mật tuyệt đối không bao giờ được lưu kèm theo archive sao lưu hoặc manifest.
- **Chữ ký toàn vẹn dữ liệu (Integrity Check):**
  - Mọi tệp dữ liệu được tính mã băm **SHA-256** và lưu trữ trong `manifest.json`.
  - Chức năng Verify kiểm tra toàn vẹn băm trước khi cho phép giải nén hoặc khôi phục.
- **Phân quyền truy cập tập trung qua `canPerform`:**
  - `backup:read`: Xem danh sách, chi tiết manifest và kiểm tra toàn vẹn (Administrator, Developer).
  - `backup:create`: Tạo bản sao lưu mới (Administrator, Developer).
  - `backup:download`: Tải luồng file archive đã ký hoặc mã hóa (Administrator, Developer).
  - `backup:restore`: Khôi phục cơ sở dữ liệu (chỉ Administrator).
  - `backup:delete`: Xóa bản sao lưu (chỉ Administrator).
  - `maintenance:manage`: Bật/tắt chế độ bảo trì (chỉ Administrator).
- **Ràng buộc an toàn khôi phục đè (In-Place Restore Guard):**
  - Bắt buộc hệ thống phải ở Chế độ Bảo trì (HTTP 503 cho site công khai, khóa thao tác ghi trên admin).
  - Tự động tạo bản sao lưu an toàn `pre-restore` và kiểm tra toàn vẹn thành công trước khi ghi đè.
  - Người dùng bắt buộc phải gõ chính xác tên database đích hiện tại để xác nhận.
- **Quy tắc vàng về dọn dẹp (Retention Golden Rule):**
  - Tuyệt đối không bao giờ xóa bản sao lưu duy nhất còn lại của hệ thống.
  - Không bao giờ xóa bản sao lưu `pre-restore` gần nhất.



