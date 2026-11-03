# DEC-018: Bảo vệ Xóa An toàn Cho Template

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 3 (Template Manager)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Template là "khung xương" định nghĩa cấu trúc của toàn bộ hệ thống CMS. Nếu một Template đang được nhiều Item sử dụng hoặc đang được các Template khác kế thừa mà bị xóa đột ngột, toàn bộ các Item đó sẽ trở thành "mồ côi" schema, gây lỗi nghiêm trọng khi render giao diện và API.

## 2. Quyết định
Tại `templateService.deleteTemplate(templateId)`:
- Chặn xóa tuyệt đối nếu template có cờ `isSystem === true` (các template hệ thống như System, Folder, Device, Layout, Rendering...).
- Chặn xóa nếu đang có ít nhất một Content Item trong collection `items_master` đang sử dụng template này (`templateId === item.templateId`).
- Chặn xóa nếu đang có Template khác kế thừa nó trong mảng `baseTemplates`.
- Khi vi phạm bất kỳ điều kiện nào ở trên, hệ thống từ chối thao tác và ném lỗi HTTP 400 kèm thông báo chi tiết danh sách phụ thuộc đang cản trở việc xóa.

## 3. Hệ quả & Lưu ý kỹ thuật
- Bảo toàn tính toàn vẹn tham chiếu (Referential Integrity) cho cơ sở dữ liệu NoSQL MongoDB mà không cần khóa ngoại vật lý.
- Đảm bảo hệ thống quản trị luôn ổn định, không bao giờ rơi vào trạng thái gãy cấu trúc do sơ suất của người dùng.

