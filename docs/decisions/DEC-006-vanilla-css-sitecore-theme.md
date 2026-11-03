# DEC-006: Kiến trúc CSS thuần Module hóa (Sitecore Theme)
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 0 | Trạng thái: Đang áp dụng

## Bối cảnh
Giao diện Sitecore đòi hỏi các tông màu chuẩn (Navy, Red, Xám tro, Pastel tiles) và kiểu dáng desktop window frame đặc trưng. Sử dụng framework lớn như Tailwind/Bootstrap có thể làm rối class và dư thừa bundle.

## Quyết định
Xây dựng CSS bằng Vanilla CSS thuần phân chia thành các file module: `variables.css`, `base.css`, `layout.css`, `components.css` tổng hợp tại `sitecore-theme.css`.

## Lý do
Giữ mã giao diện nhẹ, dễ tùy biến chính xác theo từng pixel phong cách Sitecore Metro/Fluent, không cần bước build CSS phức tạp.

## Hệ quả
Cần tuân thủ quy ước đặt tên class và sử dụng biến CSS `var(--sc-color-...)` nhất quán.

