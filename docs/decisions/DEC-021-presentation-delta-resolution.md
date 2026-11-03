# DEC-021: Thuật toán Phân giải Presentation (Delta Resolution)

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 6 (Presentation), GĐ 10 (Delivery & Layout API)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi một trang web có nhiều tầng cấu hình Presentation (Standard Presentation từ Template, Shared Layout của Item, và Final Layout của Version), hệ thống cần một thuật toán phân giải hợp nhất (merge/resolve) để ra được danh sách Renderings cuối cùng phục vụ cho biên tập và trả về cho React Frontend qua Layout Service.

## 2. Quyết định
Tại `presentationService.getFinalPresentation(item, device, lang, version)`:
1. **Mã định danh duy nhất (UUID v4):** Mỗi thực thể Rendering instance khi được thêm vào (dù ở Template hay Item) bắt buộc phải được gán một trường `uid` ngẫu nhiên chuẩn UUID v4 bất biến.
2. **Quy tắc hợp nhất:**
   - Bắt đầu từ danh sách Renderings của `standardPresentation` thuộc Template của Item.
   - Áp dụng các thay đổi từ `sharedLayout` của Item dựa theo `uid`:
     - Nếu trùng `uid`: ghi đè các thuộc tính (`datasourceId`, `parameters`, `sortOrder`, `placeholder`).
     - Nếu có cờ `hidden: true`: loại bỏ rendering đó khỏi danh sách cuối.
     - Nếu là `uid` mới: thêm rendering mới vào danh sách.
   - Áp dụng tiếp các thay đổi từ `finalLayout` của cặp `lang + version` đang xét (cũng theo cơ chế đối chiếu `uid` tương tự).
   - Sắp xếp lại danh sách renderings theo `placeholder` và `sortOrder`.

## 3. Hệ quả & Lưu ý kỹ thuật
- Cho phép kế thừa sống (live inheritance): khi Template thêm mới một rendering, tất cả các Item chưa bị override sẽ tự động nhận rendering đó.
- Cung cấp nút thao tác **"Reset to standard presentation"** để biên tập viên xóa delta override và khôi phục hoàn toàn cấu hình ban đầu từ Template.

