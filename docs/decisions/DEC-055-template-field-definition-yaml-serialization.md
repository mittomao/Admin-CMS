# DEC-055: Kiến Trúc Nhúng Định Nghĩa Trường (Field Definition) Của Template Vào YAML Serialization

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày quyết định:** 2026-11-11
- **Phạm vi:** GĐ 11-Y3, Template Engine, Field Registry, Serialization, Git Diff
- **Người đề xuất:** Antigravity Tech Lead
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề

Tại Giai đoạn 11-Y2, hệ thống đã hỗ trợ xuất/nhập YAML theo 5 section độc lập. Tuy nhiên, với section **`Templates`**, hệ thống mới chỉ xuất thuộc tính của thực thể `Item` (`items_master`: name, displayName, path, icon...) mà **hoàn toàn chưa xuất định nghĩa schema** từ collection `templates` (`sections`, `fields`, `baseTemplates`, `insertOptions`, `standardValues`).
Điều này dẫn đến các hệ quả:
1. Lập trình viên khi thêm, sửa, đổi tên, đổi thứ tự hoặc xoá trường (ví dụ `HeroTitle`, `HeroDescription`) không thể quan sát được biến động này qua `git diff`.
2. Khi sync section `Templates` sang môi trường khác (Staging / Production), database chỉ cập nhật cây thư mục mà không cập nhật schema trong collection `templates`, khiến Content Editor không hiển thị các trường mới.

---

## 2. Quyết định Kỹ thuật

### 2.1. Cấu trúc YAML nhúng đầy đủ Field Definition
Mỗi tệp YAML của template (`Serialization/Templates/.../<TemplateName>/<TemplateName>.yml`) sẽ tích hợp đầy đủ định nghĩa cấu trúc:

```yaml
id: 6aeaccf2b200083aee587086
name: HeroBanner
displayName: Hero Banner Component
path: /root/templates/Feature/Components/HeroBanner
icon: ti ti-ad-2
description: Template cho Hero Banner
isSystem: false

# Kế thừa Base Templates (theo thứ tự ghi đè)
baseTemplates:
  - id: 6aeae250248055b9172f8501
    name: _BaseSEO
    path: /root/templates/Foundation/Metadata/_BaseSEO

# Insert Options (các template được phép tạo con)
insertOptions:
  - id: 6aeae250248055b9172f8555
    name: HeroBannerSlide

# Phân vùng và danh sách trường động
sections:
  - id: 6aeae251248055b9172f8801
    name: Data
    sortOrder: 10
    fields:
      - id: 6aeae251248055b9172f8901
        name: HeroTitle
        title: Hero Title
        type: singleLineText
        required: true
        defaultValue: "Chào mừng đến với Treecraft"
        source: ""
        shared: false
        unversioned: false
        helpText: "Tiêu đề chính hiển thị trên banner"
        validation: "^.{1,100}$"
        sortOrder: 10
        visibility: {}
        permissions: {}
        layout: { colSpan: 12 }
        config: {}
      - id: 6aeae251248055b9172f8902
        name: HeroDescription
        title: Hero Description
        type: richText
        sortOrder: 20

# Standard Values (giá trị mặc định theo fieldId)
standardValues:
  6aeae251248055b9172f8901:
    fieldName: HeroTitle
    value: "Chào mừng đến với Treecraft"
```

### 2.2. Nguyên tắc Xuất Ổn Định Từng Byte (Deterministic)
1. **Sắp xếp thứ tự nhất quán:**
   - `sections` sắp xếp theo `sortOrder` tăng dần, sau đó theo `id`.
   - `fields` trong mỗi section sắp xếp theo `sortOrder` tăng dần, sau đó theo `id`.
   - Thuộc tính của từng field tuân theo thứ tự khóa cố định (id, name, title, type, source, required, defaultValue, shared, unversioned, helpText, validation, sortOrder, visibility, permissions, layout, config).
2. **ID là Nguồn Sự Thật:** ID của section và field là bất biến. Nếu lập trình viên đổi `name` của field, `git diff` chỉ hiển thị thay đổi trên 1 dòng `name`, không làm xáo trộn các trường khác.
3. **Không Timestamp:** Tuyệt đối không ghi timestamp vào nội dung tệp template.

### 2.3. Quy tắc Nhập (Sync) & Bảo Vệ An Toàn Dữ Liệu
1. **Khớp theo ID:** Khi sync, hệ thống khớp section và field theo `id`.
2. **Chính sách Field thiếu trong YAML:**
   - Mặc định: **KHÔNG XOÁ** field có trong DB nhưng thiếu trong YAML (chỉ cảnh báo).
   - Chỉ xoá khi người dùng bật tường minh cờ `deleteMissingFields: true` và bấm xác nhận.
   - Xoá field khỏi template **không xoá dữ liệu đã lưu trong Item** (tuân thủ nguyên tắc Safe Schema của GĐ 3).
3. **Kiểm tra tương thích khi đổi Type:**
   - Nếu một field đã có dữ liệu trong các Item và bị đổi `type` trong YAML: Áp dụng bảng chuyển đổi tương thích của GĐ 3 (DEC-011). Nếu không tương thích (ví dụ từ `Image` sang `Number`), hệ thống từ chối sync và báo lỗi chi tiết.
4. **Vô hiệu hóa Cache:**
   - Sau khi sync template thành công, lập tức xoá sạch cache `resolveTemplate` và `resolveEffectiveTemplate` để Content Editor và Public Site Renderer nhận diện schema mới ngay lập tức.
5. **Giao dịch Atomic:**
   - Quá trình sync mỗi template là atomic. Nếu một field lỗi (sai schema, không tìm thấy type trong registry), toàn bộ template đó không được ghi dở dang vào DB.

---

## 3. Hệ quả & Lợi ích

- Lập trình viên theo dõi được 100% thay đổi cấu trúc trường qua `git diff`.
- Đồng bộ mượt mà cấu trúc Template giữa Dev, Staging và Production.
- Tương thích hoàn toàn với hệ thống Universal Custom Field System (GĐ F1-F3).

