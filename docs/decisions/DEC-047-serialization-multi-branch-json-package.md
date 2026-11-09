# DEC-047: Kiến Trúc Đóng Gói & Phục Hồi Dữ Liệu Serialization (Multi-Branch JSON Package v1.0)

- **Trạng thái:** Đang áp dụng
- **Ngày quyết định:** 2026-11-09
- **Phạm vi:** GĐ 11, Serialization, Content Management, Backup & Restore
- **Người đề xuất:** Antigravity Team
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề
Trong quá trình vận hành Treecraft CMS, nhu cầu sao lưu, di chuyển dữ liệu giữa các môi trường phát triển (Development $\rightarrow$ Staging $\rightarrow$ Production) và khôi phục khi gặp sự cố là tối quan trọng.
Nếu chỉ trích xuất dữ liệu thô (raw database dump), các ObjectId giữa các môi trường sẽ không đồng nhất, dẫn đến đứt gãy liên kết Presentation (layoutId, renderingId), Template (templateId) và quan hệ cha con (parentId, ancestors).

Người dùng đã yêu cầu:
1. Tập trung hoàn thành duy nhất tính năng Serialization trong Giai đoạn 11.
2. Giao diện trang quản trị chuyên biệt chia thành **2 Tab độc lập: Export Package và Import Package**.
3. Cung cấp tùy chọn linh hoạt 5 phân vùng xuất: `Content`, `Template`, `Layout`, `Rendering`, `Placeholder`.
4. Hiển thị **thông báo Toast kết quả chi tiết, rõ ràng** cho mọi hành vi người dùng.

---

## 2. Quyết định Kỹ thuật

### 2.1. Định dạng Gói Đa Phân Vùng Độc Lập Môi Trường (Multi-Branch JSON Package v1.0)
Gói dữ liệu JSON được cấu trúc với metadata đầy đủ và phân giải các liên kết ObjectId thành đường dẫn logic (Portable Path):
- Đối với mỗi Item: lưu `templatePath` và `templateName` song song với `templateId`.
- Đối với Presentation: lưu `layoutPath`, `renderingPath`, `renderingName` và `datasourcePath` song song với các ObjectId.
- Cấu trúc các phân vùng: `templates`, `templateDefinitions`, `layouts`, `renderings`, `placeholders`, `content`.

### 2.2. Thứ Tự Nhập Khẩu 4 Bước An Toàn Phụ Thuộc Kỹ Thuật (4-Step Sequential Import)
Để đảm bảo toàn vẹn dữ liệu khi nạp sang database mới, quá trình import thực thi nghiêm ngặt theo 4 bước:
1. **Bước 1: Templates & Definitions:** Nạp định nghĩa Schema (Template collection) và các mục template dưới `/root/templates` để chuẩn bị cấu trúc trường động.
2. **Bước 2: Layouts & Placeholders:** Nạp các item bố cục trang EJS dưới `/root/layout/Layouts` và vùng chứa dưới `/root/layout/Placeholders`.
3. **Bước 3: Renderings:** Nạp các component hiển thị dưới `/root/layout/Renderings`, liên kết `componentTemplate`.
4. **Bước 4: Content:** Sắp xếp các item nội dung theo độ sâu đường dẫn (`path.split('/').length` tăng dần) để cha luôn được tạo trước con. Tự động ánh xạ lại `parentId`, `ancestors`, `templateId`, `layoutId`, `renderingId` thông qua bảng tra cứu `idMap` và đường dẫn logic.

### 2.3. Ba Chế Độ Xử Lý Trùng Lặp (Conflict Modes)
- `OVERWRITE` (Mặc định): Cập nhật fields, phiên bản ngôn ngữ và presentation của item hiện tại.
- `SKIP`: Giữ nguyên item hiện tại nếu đã tồn tại, chỉ thêm các item mới.
- `RENAME`: Tạo bản sao độc lập với hậu tố ` - Copy` và cập nhật đường dẫn phả hệ.

### 2.4. Giao Diện 2 Tab Độc Lập & Hệ Thống Thông Báo Toast
- Màn hình `/admin/serialization` sử dụng chuẩn Tabler Nav-Tabs 2 tab:
  - Tab 1: Xuất Gói (Export Package) với 5 thẻ checkbox chọn phân vùng, preset buttons và tải về tệp JSON.
  - Tab 2: Nhập Gói (Import Package) với Dropzone kéo thả tệp JSON, khung Inspector thống kê phân tích số lượng items, tùy chọn Conflict mode và thanh trạng thái.
- Hệ thống Toast nổi góc trên bên phải báo cáo chi tiết trạng thái và số lượng items:
  - Xuất thành công: Báo số lượng item từng loại được đóng gói.
  - Kiểm tra tệp (Inspect): Báo tính hợp lệ của tệp và số item phát hiện.
  - Nhập thành công: Báo cáo số lượng tạo mới, cập nhật và bỏ qua.

---

## 3. Hệ quả & Lợi ích
- **Độc lập môi trường:** Gói JSON có thể xuất từ môi trường Dev và nạp hoàn hảo vào Staging hoặc Production mà không lo lệch ObjectId.
- **An toàn phụ thuộc:** Khắc phục triệt để lỗi thiếu template hoặc rendering khi nạp nội dung.
- **Trải nghiệm trực quan:** Người dùng luôn nắm bắt chính xác tiến trình và kết quả nhờ hệ thống Toast rõ ràng.

