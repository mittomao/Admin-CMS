# DEC-012: Khóa Lạc quan (Optimistic Locking) HTTP 409 Conflict
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 2 | Trạng thái: Đang áp dụng

## Bối cảnh
Nhiều biên tập viên có thể cùng mở và chỉnh sửa một trang nội dung tại cùng một thời điểm, dẫn đến nguy cơ người lưu sau ghi đè mất dữ liệu của người lưu trước mà không hề hay biết.

## Quyết định
Áp dụng cơ chế **Khóa lạc quan (Optimistic Locking)**. Khi lưu form (`PUT /api/items/:id/fields`), client gửi kèm thời điểm cập nhật trước đó (`expectedUpdatedAt`). Server kiểm tra với `updatedAt` thực tế trên DB: nếu có sai lệch, từ chối lưu và trả về mã lỗi **HTTP 409 Conflict**.

## Lý do
Bảo vệ toàn vẹn dữ liệu chống ghi đè chéo session mà không cần cơ chế khóa cứng (Pessimistic Locking) gây treo dữ liệu.

## Hệ quả
Client cần hiển thị cảnh báo cho biên tập viên và cho phép họ reload hoặc so sánh dữ liệu trước khi lưu lại.

