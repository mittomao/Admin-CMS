# DEC-015: Lưu trữ Giá trị Field theo Immutable Field ID

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 3 (Template Manager)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Trước đây ở GĐ 2 MVP, giá trị các trường dữ liệu của Item được lưu trữ trong map `fields` dưới dạng key là `fieldName` (ví dụ `fields: { title: "Hello", content: "..." }`). Tuy nhiên, khi quản trị viên đổi tên một Field trong Template (ví dụ đổi `title` thành `pageTitle`), toàn bộ dữ liệu nội dung đã nhập của hàng ngàn Content Item thuộc Template đó sẽ bị đứt gãy hoặc biến mất vì key không còn khớp.

## 2. Quyết định
Chuyển đổi khóa lưu trữ giá trị field từ `fieldName` sang `fieldId` bất biến (`_id.toString()` của schema field):
- Cấu trúc lưu trữ: `fields: { "<fieldId>": "<giá trị>" }`.
- Cung cấp cơ chế **dual-key fallback** trong giai đoạn chuyển đổi: Khi đọc trường, hệ thống tìm theo `fieldId` trước; nếu không có, tìm fallback theo `fieldName` cũ để đảm bảo backward compatibility.
- Cung cấp script migration tự động `npm run migrate` quét toàn bộ items cũ và ánh xạ tên trường sang fieldId bất biến.

## 3. Hệ quả & Lưu ý kỹ thuật
- **An toàn tuyệt đối:** Quản trị viên có thể đổi tên trường (`name`), tiêu đề hiển thị (`title`), mô tả trường bất kỳ lúc nào mà không làm mất dữ liệu của Content Items.
- **Tầng Service:** `itemService.getItemWithSchema` và `templateService.resolveTemplate` chịu trách nhiệm ánh xạ hai chiều giữa schema field và giá trị lưu trữ để trả về định dạng thân thiện cho form EJS và API.

