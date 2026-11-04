# DEC-023: Xử lý Datasource Chưa Publish (Cảnh báo mềm)

> [!WARNING]
> **Trạng thái:** Bị thay thế và điều chỉnh bởi [DEC-031](DEC-031-server-side-ejs-renderer-architecture.md) và [DEC-035](DEC-035-component-field-inheritance-and-context.md). Trong kiến trúc mới, component mặc định đọc trường trực tiếp từ chính Page Item (nhờ kế thừa Component Template). Nếu rendering sử dụng datasource riêng chưa publish, Site Renderer EJS tự động xử lý fallback an toàn (không render hoặc hiển thị placeholder trống) thay vì gửi payload tới React.

- **Ngày quyết định:** 2026-11-03
- **Giai đoạn liên quan:** GĐ 8 (Workflow & Publishing), GĐ 6 (Presentation)
- **Trạng thái:** Bị thay thế (Superseded by DEC-031, DEC-035)

## 1. Bối cảnh
Khi một trang được xuất bản (Publish) từ Master sang Web, các rendering của nó có thể đang tham chiếu tới các Datasource Item (ví dụ bài viết promo, banner). Nếu các Datasource Item này vẫn đang ở trạng thái Draft hoặc chưa từng được publish lên Web, khi gọi Layout Service phía React frontend, dữ liệu `fields` của component đó sẽ bị trống (`null`). Cần quyết định ứng xử của hệ thống khi biên tập viên publish trang có datasource chưa publish.

## 2. Quyết định
Chọn phương án **Cảnh báo mềm (Warning) kèm Checkbox hỗ trợ**:
- Không chặn cứng (Hard Block): Việc chặn cứng sẽ làm gãy luồng biên tập nhanh của người dùng khi họ chỉ muốn xuất bản cấu trúc khung trang trước.
- Khi mở Publish Dialog, hệ thống kiểm tra các datasource liên quan:
  - Nếu phát hiện có datasource chưa publish, hiển thị thông báo cảnh báo Warning màu vàng: *"Trang này chứa 2 component có Datasource chưa được xuất bản lên Web"*.
  - Hiển thị danh sách các datasource này kèm checkbox: `[x] Tự động xuất bản các Datasource liên quan`.
  - Nếu người dùng bỏ tích checkbox và tiếp tục publish: trang vẫn được publish lên Web; Layout Service sẽ trả về component với `fields: null`, và component phía React frontend phải có fallback an toàn để không làm sập toàn bộ trang.

## 3. Hệ quả & Lưu ý kỹ thuật
- Trải nghiệm người dùng mượt mà, linh hoạt.
- Phối hợp chặt chẽ giữa Backend Layout Service và React Frontend Component Factory: component React bắt buộc phải kiểm tra `if (!props.fields) return null;` hoặc hiển thị fallback placeholder.

