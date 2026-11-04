# DEC-031: Chuyển đổi Kiến trúc sang 100% Server-Side EJS (Loại bỏ React)

- **Ngày quyết định:** 2026-11-04
- **Giai đoạn liên quan:** Lộ trình tổng thể, GĐ 6 (Presentation), GĐ 10 (Site Renderer)
- **Trạng thái:** Đã chốt (Accepted)

---

## 1. Bối cảnh
Trước đây, dự án được định hướng theo mô hình Headless CMS: Backend Node.js phục vụ RESTful JSON Layout Service (`/api/v1/layout`) và yêu cầu một ứng dụng frontend độc lập viết bằng React / Next.js để đọc cấu hình JSON và render ra HTML.

Mô hình này mang lại sự phức tạp không cần thiết:
1. Đòi hỏi xây dựng hai codebase riêng biệt (Backend Admin CMS và Frontend React).
2. Phải duy trì hạ tầng cấu hình CORS, API Key, quản lý bundle build phức tạp.
3. Việc biên tập và xem trước trang (Preview) trong Admin bị chia tách, phải xây dựng cơ chế bridge/iframe phức tạp.

## 2. Quyết định
Chuyển đổi toàn diện dự án sang mô hình **Monolithic Web Application với Server-Side Rendering (SSR) 100% bằng EJS**:
1. **Chung một tiến trình Express.js:**
   - Cả Admin CMS và Public Website chạy chung một ứng dụng Express.js tại cổng 4000.
   - Admin CMS đặt tại tiền tố `/admin` (được bảo vệ bằng Auth và Session).
   - Website công khai phục vụ trực tiếp tại root `/`.
2. **Loại bỏ 100% React:**
   - Xóa bỏ hoàn toàn React, Next.js, Headless Layout Service JSON RESTful, API Key, và cấu hình CORS ra khỏi tài liệu và kế hoạch phát triển.
   - Website công khai được render hoàn toàn phía máy chủ bằng template engine **EJS**.
3. **Cơ chế Site Renderer (GĐ 10):**
   - Thay thế giai đoạn "Headless Delivery API" bằng giai đoạn **"Site Renderer"**.
   - Pipeline render: URL $\rightarrow$ Page Item (đọc từ database `items_web`) $\rightarrow$ Phân giải Presentation (`presentationService.getFinalPresentation`) $\rightarrow$ Render Layout EJS $\rightarrow$ Helper `<%- placeholder(key) %>` nạp và render tuần tự các Rendering EJS.

## 3. Hệ quả & Lưu ý kỹ thuật
- **Tối ưu hiệu năng & đơn giản hóa hạ tầng:** Chỉ cần 1 server Node.js duy nhất để chạy toàn bộ hệ thống; không cần build step SPA.
- **Bảo mật tối đa:** Không mở API công khai ra ngoài; toàn bộ logic render được bảo vệ và kiểm soát chặt chẽ tại tầng server.
- **SEO vượt trội:** HTML được sinh sẵn 100% phía server, thân thiện tuyệt đối với các công cụ tìm kiếm (Googlebot, Bing) mà không cần cấu hình SSR phức tạp.
- **Thay thế các quyết định cũ:** Quyết định này thay thế các nội dung liên quan đến React và Layout Service JSON trong DEC-019, DEC-020, DEC-021, DEC-023.

