# DEC-033: Sử dụng Thuộc tính `viewPath` và Kiểm soát Bảo mật Tệp View EJS

- **Ngày quyết định:** 2026-11-04
- **Giai đoạn liên quan:** GĐ 6 (Presentation), GĐ 10 (Site Renderer)
- **Trạng thái:** Đã chốt (Accepted)

---

## 1. Bối cảnh
Trước đây, item Layout và Rendering lưu thuộc tính `componentName` để React frontend tự ánh xạ Component qua Component Factory. Khi chuyển sang Server-Side EJS, backend cần biết chính xác file template EJS nào trên ổ đĩa sẽ chịu trách nhiệm render component đó. Cần một cơ chế định danh tệp tin an toàn, tránh tấn công đọc tệp tùy ý (Local File Inclusion / Directory Traversal).

## 2. Quyết định
Thay thế hoàn toàn trường `componentName` bằng trường **`viewPath`**:
1. **Định dạng `viewPath`:**
   - Là đường dẫn tương đối tính từ thư mục gốc `src/views/site/`.
   - Ví dụ:
     - Layout: `layouts/HomeLayout.ejs`
     - Rendering: `components/HeroBanner.ejs`, `components/Introduction.ejs`
2. **Quy tắc Kiểm soát Bảo mật Tệp tin (Path Security Guard):**
   - **Whitelist thư mục gốc:** Tệp view chỉ được phép nằm trong `src/views/site/`. Hệ thống chuẩn hóa đường dẫn bằng `path.resolve` và kiểm tra nghiêm ngặt `resolvedPath.startsWith(path.resolve('src/views/site'))`.
   - **Chặn ký tự traversal:** Nghiêm cấm ký tự `..` hoặc đường dẫn tuyệt đối.
   - **Bắt buộc đuôi `.ejs`:** Chỉ chấp nhận tệp có đuôi mở rộng `.ejs`.
   - Nếu vi phạm các điều kiện trên, hệ thống từ chối lưu và ném ngoại lệ HTTP 403 Forbidden.
3. **Kiểm tra tệp tin thực tế trên đĩa:**
   - Khi lưu cấu hình Layout hoặc Rendering trong Content Editor, hệ thống kiểm tra sự tồn tại vật lý của file trên ổ đĩa.
   - Nếu file chưa tồn tại trong repo: Hệ thống cho phép lưu nhưng đưa ra thông báo cảnh báo màu vàng (*Warning*) để lập trình viên biết cần tạo file view EJS tương ứng.
4. **Cô lập lỗi Component (Error Boundary):**
   - Khi thực thi render từng component trong helper `<%- placeholder(key) %>`, mỗi component được bao bọc trong khối try-catch độc lập.
   - Nếu xảy ra lỗi runtime EJS trong component: ghi log lỗi `logger.error`, hiển thị khung cảnh báo chi tiết ở môi trường phát triển (`development`) và ẩn đi ở môi trường sản xuất (`production`). Lỗi một component **không làm gián đoạn hay sập toàn bộ trang web**.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tách bạch rõ ràng giữa thư mục view quản trị (`src/views/admin/`) và thư mục view của website công khai (`src/views/site/`).
- Đảm bảo an toàn tuyệt đối cho hệ thống máy chủ trước các nguy cơ tấn công qua đường dẫn file.

