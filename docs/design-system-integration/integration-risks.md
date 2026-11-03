# Quản Trị Rủi Ro Khi Tích Hợp (Integration Risks & Mitigations)
**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**

---

## 1. Bảng Đánh Giá Rủi Ro Kỹ Thuật (Technical Risk Assessment)

| STT | Rủi Ro Kỹ Thuật Tiềm Ẩn | Mức Độ | Hậu Quả | Chiến Lược Giảm Thiểu (Mitigation Strategy) |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Xung đột Content Security Policy (CSP)** do Helmet chặn nạp CDN Tabler và Google Fonts | **Cao** | Trình duyệt từ chối nạp CSS, font, và icon; giao diện bị vỡ hoàn toàn | Điều chỉnh chính sách CSP trong `src/app.js` cho phép cụ thể các nguồn: `styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"]`, `fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"]`, `scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"]`. |
| **2** | **Xung đột CSS Class (CSS Specificity Collisions)** giữa các file CSS cũ (`base.css`, `layout.css`, `components.css`) và `@tabler/core` | **Cao** | Các thuộc tính layout ghi đè lẫn nhau, vỡ căn chỉnh cột flex/grid | Dọn dẹp và hợp nhất: Thay vì giữ các file CSS custom rời rạc dễ gây xung đột, toàn bộ các quy chuẩn mở rộng được gói gọn trong `public/css/admin.css` theo đúng hướng dẫn của Design System; giữ lại các biến đặc thù của Sitecore trong `variables.css`. |
| **3** | **Chớp Nháy Giao Diện (FOUC - Flash of Unstyled Content)** khi người dùng kích hoạt Dark Theme | **Trung bình** | Trang web hiển thị màu trắng trong vài mili-giây trước khi chuyển sang màu tối, gây mỏi mắt khó chịu | Đặt một đoạn script inline đồng bộ siêu nhỏ ở dòng đầu tiên của thẻ `<head>` trong `head.ejs` để đọc `localStorage.getItem('tablerTheme')` và gán thuộc tính `data-bs-theme` trước khi DOM bắt đầu render. |
| **4** | **Form Validator chặn các Form Lọc / Tìm Kiếm (GET Forms)** | **Trung bình** | Người dùng bấm nút "Lọc" hoặc "Tìm kiếm" không có kết quả vì bị script client bắt lỗi rỗng | Bắt buộc gắn thuộc tính `data-no-validate="true"` trên tất cả các thẻ `<form method="GET">`. Script `form-validator.js` tự động bỏ qua các form có cờ này. |
| **5** | **Gãy Các Ca Kiểm Thử Tự Động (Test Regression)** trong `tests/smoke.test.js` và `tests/auth.test.js` | **Cao** | CI/CD hoặc lệnh `npm test` bị báo lỗi đỏ do thay đổi cấu trúc HTML hoặc thẻ selector | Rà soát toàn bộ các text matcher và selector trong `tests/*.test.js` (ví dụ: `Sitecore Experience Management`, `Sitecore Launchpad`, `Content Editor`, `home`). Đảm bảo các từ khóa ngữ nghĩa này tiếp tục tồn tại nguyên vẹn trong giao diện mới. |
| **6** | **Tràn Chiều Ngang Trên Màn Hình Siêu Rộng (UltraWide 2K/4K)** | **Thấp** | Nội dung bị kéo dãn vô tận, dòng văn bản dài bất thường gây mỏi mắt | Luôn bọc nội dung màn hình chính trong lớp bao `.container-xl` (chiều rộng tối đa chuẩn mực 1320px). |

---

## 2. Kế Hoạch Ứng Phó & Khôi Phục (Rollback Strategy)

Nếu trong quá trình triển khai Phase 4 phát sinh lỗi nghiêm trọng không mong muốn:
1. **Kiểm tra tức thì qua Test Suite:** Sau mỗi bước chỉnh sửa file, chạy ngay `npm test` để phát hiện hồi quy sớm.
2. **Git Version Control:** Do dự án đã có Git (`.git`), mọi thay đổi đều có thể so sánh diff chi tiết (`git diff`) hoặc hoàn tác an toàn (`git restore .`) về trạng thái ổn định trước đó của GĐ 1.

