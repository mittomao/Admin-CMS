# DEC-002: Kỷ luật Tầng điều khiển (Controller qua Service chung)
> Ngày: 2026-11-03 | GĐ liên quan: GĐ 0, toàn dự án | Trạng thái: Đang áp dụng

## Bối cảnh
Hệ thống vừa có giao diện Admin (EJS/SSR) vừa có Public API (RESTful JSON). Nếu viết query MongoDB trong Controller sẽ dẫn đến trùng lặp mã và khó kiểm soát nghiệp vụ.

## Quyết định
Mọi Controller (Admin và API) bắt buộc phải gọi qua Tầng Services (`src/services/`). Tuyệt đối không query MongoDB trực tiếp trong Controller.

## Lý do
Đảm bảo toàn vẹn dữ liệu, tập trung logic kiểm tra quyền, tái sử dụng tối đa logic giữa Admin và Delivery API.

## Hệ quả
Controller trở nên cực kỳ gọn gàng: chỉ nhận request, gọi service và trả về view EJS hoặc JSON.

