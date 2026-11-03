# DEC-009: Mã hóa Mật khẩu: bcryptjs với salt rounds = 10
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 1 | Trạng thái: Đang áp dụng

## Bối cảnh
Mật khẩu người dùng cần được bảo vệ chống lại các hình thức tấn công brute-force và tra cứu từ điển (rainbow tables).

## Quyết định
Sử dụng thư viện `bcryptjs` với hệ số salt rounds = 10. Đóng gói phương thức tĩnh `hashPassword` và phương thức instance `comparePassword` trực tiếp trong Schema `User`.

## Lý do
`bcryptjs` là chuẩn công nghiệp mã hóa một chiều an toàn, không phụ thuộc C++ compilation (khác với `bcrypt` native), bảo đảm chạy ổn định trên mọi môi trường và Docker.

## Hệ quả
Tất cả mật khẩu lưu trong database đều là chuỗi hash, không thể giải mã ngược.

