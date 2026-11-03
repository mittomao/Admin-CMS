# Bảng Kiểm Tra Nghiệm Thu UI/UX (UI/UX Validation Checklist)
**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**

---

Tài liệu này ghi nhận kết quả nghiệm thu toàn diện trong **Phase 5 – Validation** sau khi đã tích hợp thành công Design System.

---

## 1. Kiểm Tra Tính Nhất Quán Của Design Tokens (Design Tokens Audit)

- [x] **Kiểu chữ (Typography):**
  - [x] Phông chữ Google Font **Inter** được áp dụng đồng bộ trên toàn bộ giao diện (`body`, `heading`, `buttons`, `inputs`).
  - [x] Thang cỡ chữ tuân thủ đúng chuẩn (`fs-1` cho tiêu đề trang, `fs-2` cho card title, `fs-3` cho header icon, base `14px`, label `13px`, caption `11px`).
  - [x] Chữ hiển thị sắc nét trên cả màn hình thông thường và Retina (`-webkit-font-smoothing: antialiased`).
- [x] **Bảng màu & Biến thể nhạt (Color Palette & Light Tints):**
  - [x] Các hành động chính dùng màu Primary (`#206bc4` / `#4f46e5`).
  - [x] Các trạng thái và badge sử dụng biến thể nhạt dịu mắt (`bg-green-lt`, `bg-warning-lt`, `bg-danger-lt`, `bg-purple-lt`, `bg-azure-lt`).
  - [x] Màu đỏ thương hiệu Sitecore Red (`#eb1c24`) xuất hiện đúng vị trí: Logo icon chữ S, viền trên Taskbar chân trang, vạch chỉ báo Active của Ribbon Tab.
- [x] **Bo góc & Đổ bóng (Border Radius & Shadows):**
  - [x] Nút bấm và ô nhập liệu bo góc `6px` (`rounded-2`).
  - [x] Thẻ chính (Card) và Tile ứng dụng bo góc `8px` (`rounded-3`).
  - [x] Hộp thoại Modal bo góc `12px` (`rounded-4`).
  - [x] Hiệu ứng đổ bóng mờ nhẹ (`shadow-sm`) ở trạng thái nghỉ, nâng cao (`translateY(-2px)` + `shadow-md`) khi rê chuột vào Tile ứng dụng.
- [x] **Giao diện Sáng / Tối (Dark / Light Theme):**
  - [x] Nút toggle trên Topbar chuyển đổi mượt mà giữa chế độ Sáng (`[data-bs-theme="light"]`) và Tối (`[data-bs-theme="dark"]`).
  - [x] Biểu tượng `ti-sun` và `ti-moon` đổi trạng thái tương ứng.
  - [x] Không xuất hiện hiện tượng chớp nháy trắng màn hình (FOUC) khi tải lại trang (F5).
  - [x] Trạng thái theme được lưu bền vững trong `localStorage`.

---

## 2. Kiểm Tra Cấu Trúc Khung & Thành Phần (Layout & Components Audit)

- [x] **Thanh Topbar Header:**
  - [x] Cố định ở đầu trang (`sticky-top`) với chiều cao chuẩn `56px - 60px`.
  - [x] Brand Logo và tên CMS hiển thị cân đối.
  - [x] Waffle App Switcher (Menu 9 chấm) mở thẻ dropdown phân chia 3 nhóm module ứng dụng.
  - [x] Dải Breadcrumb hiển thị chính xác tên màn hình hiện tại.
  - [x] Ô tìm kiếm nhanh hiển thị ký hiệu phím tắt `<kbd>Ctrl K</kbd>`.
  - [x] Avatar người dùng hiển thị đúng ký tự đầu tên tài khoản, dropdown chứa nút Đăng xuất.
- [x] **Thanh Taskbar Dưới Đáy (Sitecore Modernized):**
  - [x] Cố định chắc chắn ở đáy màn hình (`fixed-bottom`, viền trên màu đỏ Sitecore).
  - [x] Các nút ứng dụng (Launchpad, Content Editor, Media Library, Workbox) sử dụng icon Tabler sắc nét.
  - [x] Trạng thái Active hiển thị vạch sáng chỉ báo rõ ràng.
- [x] **Launchpad Dashboard (Hệ Thống 2 Tầng Thẻ):**
  - [x] Tầng 1: Các nhóm (Content Editing, Access Management, Control Panel) nằm trong Thẻ Khung Cấp 1 (`card shadow-sm border-0 mb-4`) có icon tiêu đề `fs-3`.
  - [x] Tầng 2: Lưới các Tile ứng dụng (`.app-tile-card`) hiển thị icon đặt trong avatar màu nhạt `rounded-3`, tên ứng dụng in đậm, mô tả ngắn 2 dòng (`line-clamp-2`).
  - [x] Khi rê chuột: Tile nâng nhẹ 2px, viền đổi sang màu Primary.
- [x] **Biểu Mẫu & Input Addons (Form & Input-Icons):**
  - [x] Mọi trường nhập liệu đều bọc trong `.input-icon` kèm icon ngữ nghĩa.
  - [x] Icon không đè lên chữ hoặc placeholder.
  - [x] Khi trường bị lỗi validation: viền đỏ xuất hiện, thẻ `<div class="invalid-feedback">` hiển thị thông báo bên dưới mà không làm lệch icon.
- [x] **Hộp Thoại Xác Nhận Xóa (#adminConfirmModal):**
  - [x] Mọi form có `data-confirm-delete` đều mở modal xác nhận an toàn thay vì dùng `window.confirm()`.
  - [x] Modal có vạch trạng thái màu đỏ (`modal-status bg-danger`).
  - [x] Tiêu điểm bàn phím (focus) tự động đặt vào nút "Hủy Bỏ" (Cancel) để bảo vệ dữ liệu.
  - [x] Nhấn phím `Esc` đóng modal an toàn.
- [x] **Thông Báo Toàn Cục (Toast Notifications):**
  - [x] Container `#adminToastContainer` cố định ở góc trên bên phải màn hình (`top-0 end-0 p-3`).
  - [x] Hiển thị thông báo thành công / thất bại qua URL toast loop mà không lặp lại khi ấn F5.

---

## 3. Kiểm Tra Khả Năng Thích Ứng (Responsive Audit)

- [x] **Điện thoại di động (Mobile < 576px):**
  - [x] Không xuất hiện thanh cuộn ngang ngoài ý muốn trên toàn trang (`overflow-x` được kiểm soát).
  - [x] Lưới Tile ứng dụng trên Launchpad tự động co về 1 cột hoặc 2 cột cân đối.
  - [x] Các nút thao tác trong bảng mở rộng vùng chạm cảm ứng tối thiểu `36px x 36px`.
  - [x] Nút phân trang thu gọn về `32px x 32px` với cỡ chữ `12px`.
  - [x] Header chuyển đổi linh hoạt: Ẩn bớt breadcrumb và chữ dài, ưu tiên logo và avatar.
- [x] **Máy tính bảng (Tablet 576px - 991px):**
  - [x] Bố cục lưới hiển thị 2 cột mượt mà.
  - [x] Ô tìm kiếm trên Header hiển thị rõ ràng.
- [x] **Màn hình máy tính lớn & UltraWide (Desktop >= 992px & >= 1400px):**
  - [x] Nội dung luôn được bọc trong `.container-xl` (giới hạn tối đa 1320px), không bị kéo dãn bất tận.
  - [x] Lưới Tile hiển thị đủ 4 cột đều đặn.

---

## 4. Khả Năng Tiếp Cận & Bàn Phím (Accessibility - WCAG 2.1 AA)

- [x] Nhấn tổ hợp phím `Ctrl + K` (hoặc `Cmd + K`) tự động focus con trỏ vào ô tìm kiếm nhanh.
- [x] Toàn bộ các trường form đều có `<label>` liên kết với `id`.
- [x] Các trường bắt buộc có dấu sao đỏ `*` hiển thị tự động qua class `.required`.
- [x] Điều hướng bằng phím `Tab` tuần tự qua các thành phần interactive một cách logic.
- [x] Độ tương phản màu sắc giữa chữ và nền đạt tối thiểu `4.5:1`.

---

## 5. Kiểm Tra Nghiệp Vụ & Không Gây Hồi Quy (Zero Regression Audit)

- [x] Toàn bộ luồng xác thực đăng nhập / đăng xuất (`/admin/login`, `/admin/logout`) hoạt động chuẩn xác 100%.
- [x] Dữ liệu session vẫn lưu trữ bình thường trong MongoDB Atlas.
- [x] Các route bảo vệ vẫn tự động chuyển hướng về `/admin/login` khi chưa có session.
- [x] Phân quyền hiển thị Launchpad (Admin thấy tất cả, Author chỉ thấy các app được cấp quyền) duy trì nguyên vẹn.
- [x] Chạy lệnh `npm test` &rarr; 100% các ca kiểm thử tự động (12/12) đều **PASS**.
- [x] Chạy lệnh `npm run lint` &rarr; Đạt **0 lỗi (0 errors, 0 warnings)**.
