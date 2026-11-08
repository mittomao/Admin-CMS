# DEC-001: Kiến trúc Cây nội dung: Materialized Path + Ancestors Array
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 2 | Trạng thái: Đang áp dụng

## Bối cảnh
Hệ thống quản lý cây nội dung phân cấp sâu không giới hạn, đòi hỏi 3 tác vụ chính: Lazy load 1 cấp, truy vấn cả nhánh cây con (Move/Publish/Delete), và kiểm tra danh sách tổ tiên để tính toán quyền thừa kế ACL.

## Quyết định
Kết hợp 3 trường trên mỗi Item: `parentId` (ObjectId), `path` (String unique), và `ancestors` (mảng ObjectIds tổ tiên).

## Lý do
- `parentId` cho phép lazy loading con trực tiếp với index $O(\log N)$.
- `path` cho phép query cả nhánh cây bằng regex prefix (`^/root/content/home`).
- `ancestors` cho phép query toàn bộ tổ tiên bằng `$in` trong 1 query duy nhất, không cần đệ quy.

## Hệ quả
Khi đổi tên hoặc di chuyển một node cha, phải đệ quy cập nhật `path` và `ancestors` cho toàn bộ nhánh cây con bên dưới.

