# DEC-013: Sanitize HTML tại Server

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 2 (Content Editor MVP)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Người dùng biên tập nội dung có thể sử dụng TinyMCE (Rich Text) hoặc dán mã HTML/JS từ bên ngoài vào. Nếu không được làm sạch, các đoạn mã độc (`<script>`, `<iframe onerror=...>`, `onload=...`) sẽ được lưu vào cơ sở dữ liệu và kích hoạt khi người dùng khác xem hoặc khi hiển thị ra giao diện frontend, dẫn đến tấn công Stored XSS nghiêm trọng.

## 2. Quyết định
Sử dụng thư viện `sanitize-html` (phiên bản tương thích CommonJS) ngay tại tầng server (`src/fields/index.js`) trước khi lưu giá trị trường Rich Text vào MongoDB:
- Lọc bỏ triệt để các thẻ nguy hiểm (`<script>`, `<iframe>`, `<object>`, `<embed>`).
- Lọc bỏ các thuộc tính bắt sự kiện inline (`onload`, `onerror`, `onclick`, `onmouseover`...).
- Giữ lại các thẻ định dạng văn bản hợp lệ (`<p>`, `<h1>`-`<h6>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<img>`, `<table>`...).

## 3. Hệ quả & Lưu ý kỹ thuật
- **Bảo mật:** Triệt tiêu hoàn toàn lỗ hổng Stored XSS từ dữ liệu do biên tập viên nhập.
- **Tính toàn vẹn:** Việc sanitize thực hiện ở tầng server độc lập với client, không phụ thuộc vào việc trình duyệt có chạy script sanitize hay không.
- **Quy tắc View:** Trong EJS, vẫn ưu tiên dùng cú pháp `<%= data %>`; chỉ dùng `<%- data %>` tại những vị trí cố ý hiển thị HTML đã qua sanitize từ trường Rich Text.

