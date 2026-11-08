# DEC-037: ĐỊNH DẠNG SECTION QUICK INFO, ITEM ID VÀ QUẢN LÝ OWNER THEO CHUẨN TREECRAFT

## Trạng thái
- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày quyết định:** 2026-11-04
- **Người đề xuất:** Tech Lead / Senior Full-stack Developer
- **Người duyệt:** Project Owner / Architecture Committee
- **Phạm vi áp dụng:** Giai đoạn 6.3, Content Editor, Item Model, API

---

## 1. Ngữ cảnh & Đặt vấn đề
Trong hệ thống Treecraft Experience Management (XM), mọi Item hiển thị trong Content Editor đều có một section metadata đặc trưng ở đầu form có tên là **Quick Info**. Section này cung cấp nhanh các thông số kỹ thuật cốt lõi giúp biên tập viên và lập trình viên dễ dàng định vị, sao chép ID, kiểm tra template và người sở hữu item mà không cần chuyển qua các tab chi tiết thống kê.

Cần chuẩn hóa các quy tắc hiển thị, định dạng Item ID, ánh xạ Item Owner, liên kết template và lưu trữ trạng thái thu gọn/mở rộng theo người dùng.

---

## 2. Quyết định kỹ thuật

### 2.1. Định dạng Item ID và Template ID
1. **Quy tắc ngoặc nhọn:** Định dạng chuẩn của Treecraft là `{GUID-VIẾT-HOA}`.
2. **Ánh xạ MongoDB ObjectId:** Vì hệ thống sử dụng MongoDB ObjectId (`24 ký tự hex`), Item ID và Template ID được chuẩn hóa thành chuỗi viết hoa đầy đủ bọc trong cặp ngoặc nhọn:
   - Ví dụ: `{64A1B2C3D4E5F67890123456}`.
3. **Tiện ích sao chép:** Cung cấp nút copy nhanh dạng icon nhỏ bên cạnh Item ID và Item path để tiện lợi cho nhà phát triển copy vào clipboard.

### 2.2. Định dạng Item Owner và Domain Mặc định
1. **Cấu trúc Owner:** `domain\username`.
2. **Domain mặc định:** Do hệ thống hiện tại chưa cấu hình đa miền Windows Active Directory / LDAP phức tạp, domain mặc định được chuẩn hóa là **`treecraft`**.
3. **Ánh xạ User:**
   - Nếu `item.createdBy` có liên kết tới `User` còn tồn tại: hiển thị `treecraft\<username>` (ví dụ `treecraft\admin`).
   - Nếu `item.createdBy` rỗng hoặc user đã bị xóa khỏi hệ thống: hiển thị `[unknown]`.

### 2.3. Dữ liệu Item Nguồn (Created From)
1. **Mở rộng Schema Item:** Bổ sung trường `createdFrom: { type: ObjectId, ref: 'Item', default: null }` vào `Item`.
2. **Cơ chế ghi nhận:**
   - Khi thực hiện `itemService.duplicate` hoặc `copyTo`: `newItem.createdFrom` được gán bằng `sourceItem._id`.
   - Với các item tạo thủ công mới từ Template (`createFromTemplate`): `createdFrom` để `null`.
3. **Hiển thị:**
   - Nếu `item.createdFrom` trỏ tới một item đang tồn tại: hiển thị `${sourceItem.displayName || sourceItem.name} - {${sourceItem._id.toString().toUpperCase()}}`.
   - Nếu không có hoặc item nguồn đã bị xóa: hiển thị `[unknown]`.

### 2.4. Liên kết Mở Template Trực Tiếp (Template Hyperlink)
1. **Dòng Template:** Hiển thị `${template.path} - {${template._id.toString().toUpperCase()}}`.
2. **Liên kết điều hướng:** Chuỗi `${template.path}` được bọc trong thẻ `<a>` hoặc click handler: khi click, hệ thống tự động chọn và kích hoạt node template tương ứng trên Content Tree của Content Editor mà không tải lại toàn trang.

### 2.5. Giao diện Chuẩn Treecraft & Ghi nhớ Trạng thái Người Dùng
1. **Header Bar (`.sc-section-bar`):**
   - Màu nền xám đậm (`#474747` / `--color-section-bar`).
   - Vạch chỉ thị màu đỏ bên mép trái (`#d93829` / `--color-section-accent`).
   - Tiêu đề chữ trắng đậm "Quick Info" và chevron toggle thu gọn bên phải.
2. **Nội dung (`.sc-quick-info`):**
   - Màu nền xám nhạt (`#f4f4f4` / `--color-section-body-bg`).
   - Cột nhãn in đậm bên trái, cột giá trị bên phải, khoảng cách dòng thoáng (padding 6px-8px).
3. **Ghi nhớ trạng thái (Persistence):**
   - Lưu trạng thái thu gọn/mở rộng vào `localStorage` theo khóa `sc_quickinfo_collapsed_<userId>` (hoặc `sc_quickinfo_collapsed`).
   - Bọc toàn bộ thao tác `localStorage.getItem` và `localStorage.setItem` trong khối `try/catch` để phòng ngừa lỗi trong môi trường hạn chế (Private/Incognito browsing hoặc Security Sandbox).

