# DEC-019: Bổ sung Giai đoạn Presentation (GĐ 6) & Tịnh tiến Đánh số (GĐ 0 → GĐ 12)

> [!WARNING]
> **Trạng thái:** Bị thay thế một phần bởi [DEC-031](DEC-031-server-side-ejs-renderer-architecture.md). Vị trí GĐ 6 được giữ nguyên, nhưng bối cảnh kiến trúc chuyển từ Headless React sang 100% Server-Side EJS.

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** Lộ trình tổng thể dự án, GĐ 6 (Presentation)
- **Trạng thái:** Bị thay thế một phần (Partially Superseded by DEC-031)

## 1. Bối cảnh
Theo yêu cầu chuyển đổi kiến trúc sang Headless CMS hỗ trợ React frontend theo chuẩn Sitecore JSS, hệ thống cần bổ sung năng lực quản trị Layout, Rendering, Placeholder Settings và Layout Service. Cần xác định vị trí của giai đoạn này trong lộ trình phát triển sao cho hợp lý và tối ưu nhất về mặt phụ thuộc kỹ thuật.

## 2. Quyết định
- Đặt Giai đoạn Presentation là **Giai đoạn 6 (GĐ 6)**, ngay sau Media Library (GĐ 5) và trước Bảo mật nâng cao (GĐ 7).
- Lý do kỹ thuật:
  - Phải có Quản lý Phiên bản & Đa ngôn ngữ (GĐ 4) và Media Library (GĐ 5) trước để Presentation có thể hỗ trợ Final Layout theo ngôn ngữ/version và Rendering có thể gán hình ảnh Media.
  - Phải hoàn thiện cấu trúc Presentation trước khi xây dựng Bảo mật ACL (GĐ 7), Phê duyệt & Publish (GĐ 8), Thùng rác (GĐ 9) để các giai đoạn sau có thể áp dụng phân quyền, publish và khôi phục cho cả dữ liệu Presentation.
- Toàn bộ các giai đoạn phía sau được tịnh tiến số thứ tự lên 1 nấc, tạo thành lộ trình chuẩn hóa gồm 13 giai đoạn từ **GĐ 0 đến GĐ 12**.

## 3. Hệ quả & Lưu ý kỹ thuật
- Các giai đoạn đã hoàn thành (GĐ 0, 1, 2, 3) giữ nguyên trạng thái `Hoàn thành`.
- Bảng tiến độ và mọi quy ước `APPROVE GĐ <số>` được cập nhật đồng bộ sang bảng đánh số mới từ 0 đến 12.

