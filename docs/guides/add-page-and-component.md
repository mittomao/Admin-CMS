# HƯỚNG DẪN TẠO TRANG VÀ COMPONENT MỚI (PHASE 10)

Tài liệu này hướng dẫn lập trình viên và tác giả nội dung cách tạo thêm trang web mới (Page) và thành phần hiển thị (Rendering Component) trong hệ thống **Sitecore Experience Management (XM) Monolith SSR**.

---

## 1. Kiến trúc Tổng quan

```
[Content Tree (/sitecore/content)]
         │
         ▼
[Page Item: /sitecore/content/Services] ── (Kế thừa Presentation)
         │
         ├── Layout: HomeLayout (src/views/site/layouts/HomeLayout.ejs)
         │
         └── Placeholders:
               └── 'maincontent'
                     ├── Rendering 1: HeroBanner (src/views/site/components/HeroBanner.ejs)
                     └── Rendering 2: Introduction (src/views/site/components/Introduction.ejs)
```

1. **Website Công khai (Public Site):** Phục vụ tại cổng 4000, đọc dữ liệu **100% từ Web Store (`items_web`)**.
2. **Bộ nhớ đệm (In-Memory Cache):** Trang đã render được cache và tự động làm mới khi có lệnh Publish từ Event Bus.
3. **Chế độ Xem trước (Preview Mode):** Dành cho Admin tại `/admin/preview?id=...` đọc trực tiếp dữ liệu đang soạn thảo từ **Master Store (`items`)**.

---

## 2. Quy trình Tạo Component (Rendering) Mới

### Bước 1: Tạo file view EJS trong repo
Tạo file template EJS mới bên trong thư mục `src/views/site/components/`:
Ví dụ: `src/views/site/components/FeatureList.ejs`

```html
<section class="py-12 bg-white border-b border-slate-100">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <% if (fields && fields.SectionTitle) { %>
      <h2 class="text-3xl font-extrabold text-slate-900 mb-6 text-center">
        <%= fields.SectionTitle %>
      </h2>
    <% } %>

    <div class="prose max-w-3xl mx-auto text-slate-600">
      <%- richText(fields.SectionContent) %>
    </div>
  </div>
</section>
```

> **Quy tắc An toàn (DEC-033):** File EJS bắt buộc phải nằm trong `src/views/site/` và có đuôi `.ejs`. Bất kỳ đường dẫn có ký tự `..` hoặc trỏ ra ngoài thư mục trên đều bị hệ thống chặn (HTTP 403 Forbidden).

### Bước 2: Đăng ký Rendering Item trong CMS
1. Truy cập **Content Editor** tại `/admin/content-editor`.
2. Mở nhánh `/sitecore/layout/Renderings`.
3. Tạo item con mới:
   - **Tên (Name):** `FeatureList`
   - **Template:** `/sitecore/templates/System/Rendering`
   - **viewPath:** `components/FeatureList.ejs` (hoặc `site/components/FeatureList.ejs`)
   - **Icon:** `ti ti-list-check`
4. Bấm **Save**.

---

## 3. Quy trình Tạo Trang (Page) Mới

### Bước 1: Tạo Template cho Trang (Nếu chưa có)
1. Mở **Template Manager** tại `/admin/template-manager`.
2. Dưới `/sitecore/templates/Project/Pages`, tạo template `Services Page`.
3. Thêm các trường nội dung:
   - `PageTitle` (Single-Line Text)
   - `SectionTitle` (Single-Line Text)
   - `SectionContent` (Rich Text)
   - `MetaDescription` (Multi-Line Text)
4. (Tùy chọn) Gán **Standard Presentation**: Chọn Layout `HomeLayout` và thêm Component `FeatureList` vào placeholder `maincontent`.

### Bước 2: Tạo Page Item trong Content Tree
1. Mở **Content Editor** tại `/admin/content-editor`.
2. Nhấp chuột phải vào `/sitecore/content` hoặc `/sitecore/content/Home`, chọn **Insert** $\rightarrow$ `Services Page`.
3. Đặt tên item: `Services` (URL tương ứng sẽ là `/services` hoặc `/en/services`).
4. Nhập nội dung các trường trên form.
5. (Nếu chưa cấu hình ở Template): Chuyển sang tab **Presentation Details**, chọn Layout `HomeLayout`, thêm Rendering `FeatureList` vào placeholder `maincontent`.
6. Bấm **Save**.

### Bước 3: Xem trước trang trong Admin (Preview)
1. Trên thanh công cụ trên cùng của Content Editor, bấm nút **Preview**.
2. Một tab mới sẽ mở ra tại `/admin/preview?id={itemId}&lang=vi`.
3. Kiểm tra bố cục, placeholder và giao diện hiển thị với thanh banner màu tối "Sitecore XM Preview Mode".

### Bước 4: Xuất bản (Publish) trang ra Website Công khai
1. Trên Ribbon, chọn tab **PUBLISH** $\rightarrow$ **Publish Item** (hoặc mở `/admin/publish-manager`).
2. Chọn ngôn ngữ xuất bản (`vi`, `en`) và xác nhận.
3. Publish Engine sẽ sao chép phiên bản hoàn chỉnh sang **Web Store (`items_web`)** và tự động xóa bộ nhớ đệm trang cũ.
4. Truy cập trang web công khai:
   - Tiếng Việt: `http://localhost:4000/services`
   - Tiếng Anh: `http://localhost:4000/en/services`

---

## 4. Các View Helpers Có Sẵn trong Template EJS

| Helper | Cú pháp | Ý nghĩa |
| :--- | :--- | :--- |
| `field()` | `<%= field('Title', 'Tiêu đề mặc định') %>` | Lấy giá trị trường an toàn (tự động HTML escape). |
| `richText()` | `<%- richText(fields.Body) %>` | Hiển thị mã HTML đã sanitize và tự động phân giải link nội bộ (`~/item/...`) & link media (`~/media/...`). |
| `imageUrl()` | `<%= imageUrl(fields.Image) %>` | Trả về Cloudinary CDN URL kèm transformation preset tối ưu. |
| `link()` | `<%= link(targetItemId) %>` | Phân giải URL trang công khai từ Item ID. |
| `navItems()` | `<% const nav = navItems(); %>` | Trả về danh sách các trang con đã publish của Home để tạo menu navigation. |
| `placeholder()`| `<%- await placeholder('maincontent') %>` | Kết xuất tuần tự toàn bộ các Component được gán vào placeholder đó theo `sortOrder`. |

