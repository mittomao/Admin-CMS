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
Thứ tự ưu tiên đánh giá quyền theo chuẩn Sitecore:
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

## 4. Bảo vệ Headless Delivery API & Layout Service
- **Phân ly dữ liệu tuyệt đối:** Delivery API và Layout Service chỉ được đọc từ `items_web`; không bao giờ truy vấn `items_master`.
- **Chống DDoS / Brute Force:** Áp dụng `express-rate-limit` giới hạn số lượt request tối đa trên mỗi IP trong cửa sổ thời gian (ví dụ 100 req/phút).
- **Cấu hình CORS:** Chỉ cho phép các domain Frontend React được cấu hình trong biến môi trường (`CORS_ALLOWED_ORIGINS`).
- **Phòng chống NoSQL Injection:** Sử dụng Mongoose Schema typing và validate input, không truyền trực tiếp query parameters không kiểm soát vào lệnh `find()`.

