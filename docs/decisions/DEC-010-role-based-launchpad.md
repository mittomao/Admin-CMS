# DEC-010: Phân quyền Hiển thị Launchpad theo Role
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 1 | Trạng thái: Đang áp dụng

## Bối cảnh
Người dùng đăng nhập vào hệ thống có các vai trò khác nhau (Administrator, Author, Editor...). Launchpad không nên hiển thị những ứng dụng mà người dùng không có quyền truy cập.

## Quyết định
Mỗi ứng dụng trong `LaunchpadApp` có mảng `allowedRoles`. Khi render `GET /admin/launchpad`:
- Nếu user có role `Administrator` -> hiển thị 100% ứng dụng.
- Nếu user là các role khác -> chỉ hiển thị ứng dụng nếu `allowedRoles` để trống hoặc có chứa ít nhất một role của user. Fallback sang danh mục default apps nếu database chưa được seed.

## Lý do
Đơn giản hóa giao diện, tăng tính bảo mật ngay từ lớp UI đầu vào.

## Hệ quả
Cần seed danh mục Launchpad apps mặc định kèm theo `allowedRoles` hợp lệ.

