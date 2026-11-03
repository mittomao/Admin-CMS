# DEC-020: Kiến trúc Presentation Headless (Shared Layout vs. Final Layout)

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 6 (Presentation), GĐ 4 (Versions & Languages)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Trong Sitecore, trang web thường có các component dùng chung cho mọi ngôn ngữ và mọi phiên bản (ví dụ Header, Footer, cấu trúc Grid layout), nhưng cũng có những component hoặc thứ tự component chỉ dành riêng cho một ngôn ngữ cụ thể (ví dụ banner quảng cáo tiếng Việt khác banner tiếng Anh) hoặc chỉ áp dụng cho một version đang dự thảo (Draft version). Cần một kiến trúc lưu trữ tách bạch hai nhu cầu này.

## 2. Quyết định
Phân chia cấu trúc Presentation của Item thành hai tầng:
1. **`sharedLayout`:**
   - Được lưu trực tiếp ở cấp Item (`item.presentation.sharedLayout`).
   - Áp dụng chung cho tất cả các ngôn ngữ và tất cả các phiên bản của Item đó.
   - Chứa bố cục khung và các component mặc định dùng chung.
2. **`finalLayout`:**
   - Được lưu trữ bên trong từng bản ghi ngôn ngữ và phiên bản cụ thể (`item.versions[lang][v].presentation.finalLayout`).
   - Chỉ lưu delta override (các thay đổi riêng biệt) của ngôn ngữ và phiên bản đó.
   - Khi tạo một phiên bản mới (ví dụ Version 2 từ Version 1), hệ thống tự động sao chép nguyên trạng `finalLayout` của version nguồn sang version mới.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tối ưu hóa việc biên tập: Biên tập viên chỉ cần chỉnh sửa `sharedLayout` một lần là áp dụng cho toàn bộ các bản dịch ngôn ngữ khác, nhưng vẫn giữ được toàn quyền cá nhân hóa bố cục cho từng ngôn ngữ và version khi cần thiết.
- Tầng schema của GĐ 4 cần chuẩn bị sẵn trường `presentation` bên trong mảng versions để đón đầu GĐ 6.

