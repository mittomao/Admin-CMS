# DEC-004: Logging tập trung đa cấp độ bằng Winston
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 0 | Trạng thái: Đang áp dụng

## Bối cảnh
Cần cơ chế ghi nhật ký hệ thống nhất quán, hỗ trợ định dạng dễ đọc trong môi trường dev và xuất log có cấu trúc trong production.

## Quyết định
Sử dụng **Winston** làm logger tập trung cho toàn bộ ứng dụng; kết hợp **Morgan** để ghi log HTTP requests.

## Lý do
Winston hỗ trợ phân cấp log (`info`, `warn`, `error`), tự động format màu sắc trên console dev và xuất JSON file kèm log rotation trên production.

## Hệ quả
Mọi service và controller sử dụng `logger.info()` hoặc `logger.error()` thay vì `console.log()` bừa bãi.

