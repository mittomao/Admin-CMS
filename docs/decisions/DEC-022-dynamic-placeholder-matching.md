# DEC-022: Quy tắc Khớp Dynamic Placeholder Keys

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 6 (Presentation)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Trong các thiết kế layout hiện đại bằng React (ví dụ component Grid 2 cột, 3 cột, Tab pane, Accordion), mỗi cột hoặc tab là một placeholder động có tên như `column-1`, `column-2`, `column-left`, `column-right`. Nếu hệ thống chỉ cho phép cấu hình Placeholder Settings với key tĩnh tuyệt đối, người quản trị sẽ phải tạo hàng chục item cấu hình lặp đi lặp lại rất phiền toái.

## 2. Quyết định
Hỗ trợ cú pháp placeholder key động với ký tự đại diện (Wildcard) dạng `column-{*}`:
- Khi kiểm tra một placeholder thực tế (ví dụ `column-1` hoặc `column-left`) xem có hợp lệ và được phép chèn những rendering nào, tầng service sẽ:
  - Tìm cấu hình khớp tĩnh chính xác (`placeholderKey === "column-1"`) trước.
  - Nếu không tìm thấy khớp tĩnh, tìm các cấu hình có chứa mẫu wildcard `{*}`.
  - Ánh xạ chuỗi pattern `column-{*}` thành biểu thức chính quy (Regex): `^column-.*$`.
  - Nếu khớp Regex, áp dụng danh sách `allowedRenderings` của Placeholder Settings đó.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tăng tính linh hoạt vượt trội cho các component layout phức tạp trên React Frontend.
- Đơn giản hóa số lượng Placeholder Settings cần khởi tạo trong cây hệ thống `/sitecore/layout/Placeholder Settings`.

