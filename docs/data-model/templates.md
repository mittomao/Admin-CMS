# Mô hình Định nghĩa Template (Templates Model)
> File: `docs/data-model/templates.md`  
> Mô tả: Cấu trúc Collection `templates`, định nghĩa Sections, Fields, Kế thừa Base Templates, Standard Values và Insert Options.

---

## 1. Collection `templates`
Mô hình hóa định nghĩa schema cấu trúc theo chuẩn Treecraft (`Template -> Sections -> Fields`):

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123450"),
  name: "Standard Web Page",
  displayName: "Standard Web Page",
  icon: "ti ti-file-text",             // Icon hiển thị trên cây nội dung
  description: "Template chuẩn cho các trang nội dung thông thường",
  isSystem: false,                     // true nếu là template hệ thống không được xóa
  
  // Kế thừa nhiều Base Templates
  baseTemplates: [
    ObjectId("64a1b2c3d4e5f67890123401") // Ví dụ: _BaseSEO, _BaseAudit
  ],
  
  // Danh sách các phân vùng và trường dữ liệu
  sections: [
    {
      _id: ObjectId("64a1b2c3d4e5f67890123801"),
      name: "Content",                 // Tiêu đề Section (Page Metadata, Content, Settings)
      sortOrder: 10,
      fields: [
        {
          _id: ObjectId("64a1b2c3d4e5f67890123991"),
          name: "pageTitle",           // Tên kỹ thuật
          title: "Page Title",         // Tên hiển thị trên form editor
          type: "Single-Line Text",    // Kiểu dữ liệu trường
          required: true,
          defaultValue: "Default Page Title",
          source: "",                  // Query path cho Droplist / Multilist
          shared: false,               // true: dùng chung cho mọi ngôn ngữ
          unversioned: false,          // true: dùng chung mọi version trong 1 ngôn ngữ
          validation: "^.{1,100}$",    // Biểu thức regex kiểm tra dữ liệu
          helpText: "Nhập tiêu đề hiển thị chính của trang web (tối đa 100 ký tự)",
          sortOrder: 10
        },
        {
          _id: ObjectId("64a1b2c3d4e5f67890123992"),
          name: "bodyContent",
          title: "Body Content",
          type: "Rich Text",
          required: false,
          defaultValue: "",
          source: "",
          shared: false,
          unversioned: false,
          validation: "",
          helpText: "Nội dung chi tiết của trang",
          sortOrder: 20
        }
      ]
    }
  ],
  
  // Standard Values Động: Lưu giá trị mặc định cho các trường của Template
  // Key: fieldId (String), Value: giá trị mặc định
  standardValues: {
    "64a1b2c3d4e5f67890123991": "Default Page Title"
  },
  
  // Standard Presentation: Bố cục mặc định kế thừa cho item con (xem presentation.md)
  presentation: { ... },
  
  // Insert Options: Giới hạn các Template con được phép tạo bên dưới Item thuộc template này
  insertOptions: [
    ObjectId("64a1b2c3d4e5f67890123450"), // Tự tạo con cùng loại
    ObjectId("64a1b2c3d4e5f67890123455")  // Hoặc tạo Article Detail
  ],
  
  createdBy: ObjectId("..."),
  updatedBy: ObjectId("..."),
  createdAt: ISODate("2026-11-03T00:00:00.000Z"),
  updatedAt: ISODate("2026-11-03T00:00:00.000Z")
}
```

---

## 2. Danh mục Kiểu Trường Dữ liệu (Field Types)
Hỗ trợ đầy đủ các kiểu trường CMS chuyên nghiệp:
- `Single-Line Text`: Văn bản ngắn một dòng (tiêu đề, slug, mã).
- `Multi-Line Text`: Đoạn văn bản thuần nhiều dòng (tóm tắt, ghi chú).
- `Rich Text`: Văn bản định dạng HTML soạn thảo qua TinyMCE (được sanitize tự động).
- `Checkbox`: Giá trị logic Boolean (`true` / `false`).
- `Date`: Thời gian / Ngày tháng (ISO Date string).
- `Number`: Số nguyên hoặc số thực.
- `Droplist`: Hộp chọn đơn (Single-select dropdown), lấy nguồn từ đường dẫn item con (`source`).
- `Multilist`: Hộp chọn nhiều giá trị (Multi-select), trả về mảng IDs.
- `Image`: Tham chiếu tới tệp hình ảnh trong Media Library (lưu Media `_id`).

---

## 3. Quy tắc Kế thừa Đa cấp & Chống Chu trình (Cycle Detection)
- Theo quyết định kiến trúc [`DEC-016`](../decisions/DEC-016-template-inheritance-cycle-detection.md):
  - Hàm `templateService.resolveTemplate(templateId)` duyệt đệ quy đa cấp Base Templates theo thứ tự từ sâu nhất đến nông nhất.
  - Gộp các Section trùng tên; trường của Template con ghi đè trường trùng tên của Template cha.
  - Thuật toán kiểm tra Cycle Detection chặn hoàn toàn vòng lặp phụ thuộc (ví dụ $A \leftarrow B \leftarrow A$) với giới hạn tối đa 10 cấp thừa kế.

---

## 4. Phân loại Template & Quan hệ với Rendering Component Template (DEC-036)
Toàn bộ Template trong hệ thống được phân định rõ ràng thành 3 phân nhóm chức năng:
1. **`/root/templates/Feature/Components/` (Component Templates):**
   - Định nghĩa các trường dữ liệu nội dung của từng component riêng biệt (ví dụ `HeroBanner`, `Introduction`, `ImageText`).
   - Ví dụ template `HeroBanner` gồm Section "Hero Banner" chứa các field: `BackgroundImage` (Image), `HeroTitle` (Single-Line Text), `HeroDescription` (Rich Text).
   - Được gắn trực tiếp vào Item Rendering qua trường `componentTemplate`.
2. **`/root/templates/Project/Pages/` (Page Templates):**
   - Định nghĩa các loại trang nội dung cụ thể trong website (ví dụ `Home`, `About us`).
   - Mỗi Page Template cấu hình **Standard Presentation**: Chọn Layout sử dụng (`HomeLayout`) và các Rendering tương ứng đặt trong các Placeholders (`maincontent`).
   - **Độc lập hoàn toàn với Component Template:** Page Template **không** kế thừa Component Template qua `baseTemplates`. Mảng `baseTemplates` chỉ dùng để kế thừa cấu trúc chung (ví dụ `_BasePage`, `_BaseSEO`).
   - Khi tạo hoặc mở Page Item, các trường nhập liệu của component được **tự động suy ra (computed)** thông qua thuật toán `templateService.resolveEffectiveTemplate` dựa trên Presentation thực tế của trang.
3. **`/root/templates/System/` (System Templates):**
   - Chứa các template định nghĩa cấu trúc của chính CMS: `Layout`, `Placeholder`, `Rendering`, `Folder`, `Media Folder`, `Image`, `File`...
   - Toàn bộ System Templates có cờ `isSystem: true` và được bảo vệ cấm xóa/đổi tên tùy tiện.

