# DEC-007: Kết nối MongoDB không chặn khởi động và Graceful Reconnection
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 0 | Trạng thái: Đang áp dụng

## Bối cảnh
Trong môi trường phát triển cục bộ, nếu MongoDB chưa kịp bật mà server Express bị crash ngay lập tức sẽ gây khó chịu khi test layout tĩnh hoặc chạy healthcheck.

## Quyết định
Module `database.js` bắt lỗi kết nối ban đầu, ghi nhận cảnh báo và tự động thử kết nối lại (retry connection) thay vì thoát tiến trình (`process.exit(1)`); endpoint `/health` phản ánh trạng thái thực tế (`connected` hoặc `disconnected`).

## Lý do
Tăng tính ổn định và khả năng tự phục hồi của ứng dụng khi database gặp sự cố tạm thời.

## Hệ quả
Các tác vụ yêu cầu DB phải kiểm tra trạng thái kết nối hoặc đợi kết nối hoàn tất.

