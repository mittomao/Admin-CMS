# DEC-025: Khôi phục Phiên bản Bằng Cách Tạo Version Mới

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 4 (Versions & Languages)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Khi biên tập viên muốn khôi phục một phiên bản nội dung cũ (ví dụ khôi phục từ Version 1 khi đang ở Version 3), nếu hệ thống ghi đè trực tiếp lên Version 3 hoặc xóa các version trung gian, toàn bộ lịch sử biên tập và dấu vết kiểm toán (Audit Trail) sẽ bị phá hủy.

## 2. Quyết định
Tại `versionService.restoreVersion(itemId, langCode, versionNumber)`:
- Quá trình khôi phục **tuyệt đối không ghi đè** lên bản ghi lịch sử của bất kỳ version nào.
- Thay vào đó, hệ thống tạo ra một **PHIÊN BẢN MỚI** với số hiệu tăng tiến (`nextVersion = max(currentVersions) + 1`), sao chép toàn bộ giá trị các trường và `finalLayout` từ version được chọn.
- Tự động gán ghi chú: `note: "Khôi phục từ Phiên bản <v>"`.

## 3. Hệ quả & Lưu ý kỹ thuật
- **Bảo toàn lịch sử 100%:** Dữ liệu lịch sử luôn là bản ghi chỉ thêm (Append-only / Immutable History), biên tập viên có thể so sánh hoặc quay lại bất kỳ thời điểm nào mà không sợ mất dữ liệu.
- **Tuân thủ chuẩn Sitecore XM:** Hành vi khôi phục này tương đồng hoàn toàn với cơ chế Versioning của Sitecore.

