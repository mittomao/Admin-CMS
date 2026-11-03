# DEC-026: Tự động Sao chép Final Layout khi Tạo Version Mới

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 4 (Versions & Languages), GĐ 6 (Presentation)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi một item đã được cấu hình Presentation riêng cho từng version (`finalLayout` trong `item.presentation.final`), nếu người dùng bấm "Add Version" để tạo version mới mà cấu hình này bị bỏ quên, phiên bản mới sẽ bị mất toàn bộ các rendering đã override của version trước và fallback về `sharedLayout`, gây hỏng giao diện trang.

## 2. Quyết định
Khi tạo một version mới (`addVersion`) hoặc thêm một ngôn ngữ mới từ ngôn ngữ nguồn (`addLanguageVersion`):
- Hệ thống tìm cấu hình `finalLayout` của version nguồn trong `item.presentation.final`.
- Nếu tồn tại, thực hiện **deep clone** mảng `devices` (bao gồm các rendering instances kèm `uid` UUID v4 của chúng).
- Tạo bản ghi mới trong `item.presentation.final` với cặp `{ language: targetLang, version: nextVersion, devices: clonedDevices }`.

## 3. Hệ quả & Lưu ý kỹ thuật
- Chuẩn bị nền tảng hoàn hảo cho GĐ 6 (Presentation Details) và GĐ 8 (Publishing theo version).
- Giữ nguyên trải nghiệm biên tập mượt mà: tạo version mới kế thừa trọn vẹn bố cục trang đang soạn thảo.

