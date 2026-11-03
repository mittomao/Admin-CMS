# DEC-017: Standard Values Động

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 3 (Template Manager)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi định nghĩa Template, người quản trị thường cấu hình các giá trị mặc định (Standard Values) cho các trường (ví dụ: Meta Robots mặc định là `index, follow`, Banner mặc định là ảnh chung). Nếu ta gán tĩnh các giá trị này vào bản ghi của từng Item tại thời điểm tạo mới:
- Cơ sở dữ liệu sẽ bị phình to do lưu dữ liệu trùng lặp.
- Quan trọng nhất: khi quản trị viên cập nhật Standard Values ở Template (ví dụ đổi copyright text hoặc ảnh mặc định), hàng nghìn item đã tạo trước đó sẽ không nhận được giá trị mới.

## 2. Quyết định
Áp dụng cơ chế **Standard Values động (Dynamic Standard Values)**:
- Tại Item: Chỉ lưu trữ các trường mà người dùng đã thực sự chỉnh sửa hoặc ghi đè (explicitly overridden).
- Tại thời điểm đọc dữ liệu (`itemService.getItemWithSchema`): Nếu trường đó chưa có giá trị tại Item (hoặc là `undefined`), hệ thống tự động lấy giá trị từ Standard Values của Template tương ứng để hiển thị.
- Cung cấp nút thao tác **"Reset to Standard Value"** trên form Content Editor để biên tập viên có thể xóa giá trị ghi đè cục bộ và khôi phục giá trị mặc định từ Template bất kỳ lúc nào.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tiết kiệm dung lượng lưu trữ đáng kể trong MongoDB.
- Quản trị viên cập nhật Standard Value ở Template thì lập tức toàn bộ các trang thuộc template đó (chưa bị ghi đè cục bộ) được cập nhật đồng loạt theo thời gian thực mà không cần chạy batch script cập nhật database.

