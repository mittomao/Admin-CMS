# DEC-005: Layout Engine: Tách Shell và Auth layout qua express-ejs-layouts
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 0 | Trạng thái: Đang áp dụng

## Bối cảnh
Màn hình quản trị Sitecore có cấu trúc shell phức tạp (header, taskbar, floating windows), trong khi màn hình Login/Auth lại có bố cục tối giản (minimal).

## Quyết định
Sử dụng package `express-ejs-layouts` để quản lý các master layout tách biệt: `main.ejs` (shell chung) và `minimal.ejs` (màn hình login đơn giản).

## Lý do
Tránh lặp lại boilerplate HTML header/meta, hỗ trợ trích xuất tự động các block style và script của từng màn hình con vào đúng vị trí thẻ `<head>` hoặc cuối `<body>`.

## Hệ quả
Controller có thể chỉ định `layout: 'layouts/minimal'` hoặc dùng mặc định `main.ejs`.

