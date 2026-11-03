# DEC-027: Thuật toán Phân giải Trường 3 Cấp độ & Fallback

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 4 (Versions & Languages), GĐ 3 (Template Manager)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Với mô hình Sitecore XM, một trường dữ liệu có thể là:
- Dùng chung cho mọi ngôn ngữ và version (`shared: true`).
- Dùng chung cho mọi version của 1 ngôn ngữ (`unversioned: true`).
- Riêng biệt cho từng version (`versioned: true`).
Cần một thuật toán phân giải hợp nhất (resolve) có trật tự ưu tiên rõ ràng khi hiển thị lên form hoặc trả về cho API.

## 2. Quyết định
Thứ tự ưu tiên phân giải giá trị trường:
$$\text{Versioned Field} \xrightarrow{\text{fallback}} \text{Unversioned Field} \xrightarrow{\text{fallback}} \text{Shared Field} \xrightarrow{\text{fallback}} \text{Standard Value}$$

- Tại thời điểm đọc (`versionService.resolveFields`):
  - Giá trị ở cấp ưu tiên cao hơn sẽ ghi đè giá trị ở cấp thấp hơn.
  - Hệ thống trả về metadata `origin` để giao diện hiển thị rõ nguồn gốc trường (thuộc version, unversioned, shared hay standard value).
- Tại thời điểm ghi (`versionService.updateFields`):
  - Dựa vào schema của Template, trường `shared` được lưu vào `item.sharedFields`.
  - Trường `unversioned` được lưu vào `item.languages[lang].unversionedFields`.
  - Trường thường được lưu vào `item.languages[lang].versions[v].fields`.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tách biệt rõ ràng phạm vi ảnh hưởng: sửa trường `shared` ở bất kỳ đâu thì toàn bộ các bản dịch và versions đều tự động cập nhật; sửa trường `unversioned` thì chỉ ảnh hưởng ngôn ngữ đó; sửa trường thường thì chỉ ảnh hưởng duy nhất version đang chọn.

