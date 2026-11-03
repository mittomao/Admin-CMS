# DEC-003: Giao diện Form Editor: Partial HTML SSR
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 2 | Trạng thái: Đang áp dụng

## Bối cảnh
Content Editor cần trải nghiệm nhanh như desktop app khi click giữa các node trên cây mà không phải reload toàn bộ trang.

## Quyết định
Khi người dùng click vào một node trên Cây nội dung, client gửi AJAX gọi endpoint trả về **Partial HTML** (`item-form.ejs`) và nạp trực tiếp vào DOM (`#editor-workspace`).

## Lý do
Phát huy tối đa sức mạnh của EJS SSR: logic render các field phức tạp, kiểm tra quyền read/write, và hiển thị cảnh báo được tính toán tập trung trên server; client-side JS cực kỳ nhẹ và bảo mật.

## Hệ quả
Cần cấu hình Express hỗ trợ cả Full Page view khi truy cập URL trực tiếp và Partial view khi request qua AJAX.

