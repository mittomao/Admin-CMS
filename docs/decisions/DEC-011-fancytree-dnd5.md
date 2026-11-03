# DEC-011: Cây nội dung Fancytree & Kéo thả native dnd5
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 2 | Trạng thái: Đang áp dụng

## Bối cảnh
Cây nội dung của Sitecore có thể chứa hàng chục ngàn item. Việc tải toàn bộ cây một lần sẽ gây nghẽn trình duyệt; ngoài ra cần hỗ trợ kéo thả di chuyển node.

## Quyết định
Sử dụng thư viện **Fancytree** kết hợp với extension HTML5 native Drag & Drop (`dnd5`). Nạp dữ liệu cây con theo cơ chế lazy loading qua endpoint `/api/items/:id/children`.

## Lý do
Fancytree hỗ trợ render DOM ảo (Virtual Scrolling) mượt mà khi số node lớn; extension `dnd5` cho phép kéo thả di chuyển tự nhiên mà không phụ thuộc vào thư viện jQuery UI cồng kềnh.

## Hệ quả
Client chỉ nạp node khi người dùng bấm mở rộng (expand), giảm tải bộ nhớ tối đa.

