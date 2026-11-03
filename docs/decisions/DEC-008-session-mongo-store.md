# DEC-008: Quản lý Session bền vững với connect-mongo
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 1 | Trạng thái: Đang áp dụng

## Bối cảnh
Nếu lưu session trong RAM (`MemoryStore`), mỗi lần server khởi động lại (restart/nodemon) hoặc deploy phiên bản mới thì toàn bộ người dùng sẽ bị văng ra (mất đăng nhập).

## Quyết định
Sử dụng `express-session` kết hợp với `connect-mongo` để lưu trữ session tập trung trong collection `sessions` của MongoDB; fallback sang MemoryStore nếu DB chưa kết nối trong môi trường dev/test. Cấu hình cookie an toàn: `httpOnly: true`, `sameSite: 'lax'`, thời hạn 24 giờ.

## Lý do
Đảm bảo session tồn tại bền vững qua các lần restart server và sẵn sàng cho việc mở rộng nhiều tiến trình/node server sau này.

## Hệ quả
Cần dọn dẹp các session hết hạn định kỳ (do MongoDB TTL index tự động đảm nhận).

