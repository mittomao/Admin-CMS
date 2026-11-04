# DEC-035: KẾ THỪA FIELD COMPONENT VÀ NGỮ CẢNH TRUYỀN VÀO VIEW (COMPONENT FIELD INHERITANCE & VIEW CONTEXT)

## Trạng thái
- **Trạng thái:** Bị thay thế một phần (Partially Superseded by DEC-036)
- **Ngày quyết định:** 2026-11-04
- **Người đề xuất:** Tech Lead / Solution Architect
- **Người duyệt:** Project Owner / Architecture Committee
- **Phạm vi áp dụng:** Giai đoạn 6, Giai đoạn 8, Giai đoạn 10, Giai đoạn 12
- **Ghi chú thay thế:** Mục 2.1 (Quy tắc Page Template kế thừa Component Template qua `baseTemplates`) bị thay thế bởi DEC-036 (Cơ chế Effective Template suy ra từ Rendering). Các mục 2.2, 2.3 và 3 (Ngữ cảnh truyền vào View và Helper placeholder) vẫn giữ nguyên giá trị.

---

## 1. Ngữ cảnh & Đặt vấn đề
Trong mô hình Presentation SSR:
- Mỗi trang (Page) bao gồm một Layout chính và nhiều Component (Renderings) được đặt vào các Placeholders.
- Một câu hỏi cốt lõi: **Dữ liệu hiển thị của component lấy từ đâu?**
  1. Đọc trực tiếp từ chính Page Item (nhờ kế thừa trường dữ liệu từ template của component).
  2. Hay trỏ tới một DataSource Item độc lập nằm ngoài cây Page (ví dụ nằm trong folder Data chung).
- Làm thế nào để truyền dữ liệu và ngữ cảnh vào file EJS của layout và component một cách chuẩn mực, an toàn và thuận tiện nhất?

---

## 2. Quyết định kỹ thuật

### 2.1. Kế thừa Template (Template Inheritance): Component Template $\rightarrow$ Page Template
1. **Component Template (`/sitecore/templates/Feature/Components/`):**
   - Mỗi component (Rendering) được liên kết với một Component Template xác định các field nội dung của nó.
   - Ví dụ:
     - Component `HeroBanner` có template chứa các fields: `BackgroundImage` (Image), `HeroTitle` (Single-Line Text), `HeroDescription` (Rich Text).
     - Component `Introduction` có template chứa: `IntroHeading` (Single-Line Text), `IntroBody` (Rich Text).
2. **Page Template (`/sitecore/templates/Project/Pages/`):**
   - Page Template (ví dụ `Home`, `About us`) kế thừa (thông qua mảng `base_templates`) các Component Template tương ứng với những component xuất hiện trên trang đó.
   - Nhờ đó, khi Content Author tạo một Page Item từ Page Template, Form nhập liệu của trang sẽ có sẵn đầy đủ các section và field của tất cả các component trên trang.
3. **Mặc định Component đọc field từ chính Page Item:**
   - Khi render một component trên trang, renderer truyền các field đã resolve của chính Page Item đó vào view của component.
   - **Hạn chế được chấp nhận:** Một page item không thể chứa hai component cùng loại (ví dụ 2 component `HeroBanner`) với nội dung khác nhau nếu chỉ dựa vào kế thừa template trên trang. Trong trường hợp cần tái sử dụng nhiều component cùng loại trên một trang, tác giả sẽ cấu hình trường `dataSource` trỏ tới item nội dung riêng (tính năng mở rộng/tuỳ chọn).

### 2.2. Ngữ cảnh truyền vào View (View Context)
Khi `siteRendererController` và helper `placeholder(key)` biên dịch và include các file EJS layout và rendering, một object context thống nhất được truyền vào:

```javascript
{
  item: pageItem,               // Toàn bộ metadata của Page Item (id, name, path, template_id,...)
  fields: resolvedFields,       // Object key-value các trường dữ liệu của Page (đã qua Standard Values và fallback)
  params: renderingParameters,  // Object tham số rendering (CSS class, theme, animation,...)
  datasource: datasourceItem,   // Object item datasource riêng (null nếu đọc từ page item)
  site: siteConfig,             // Cấu hình site (name: 'website', hostName, rootPath,...)
  lang: currentLanguage         // Ngôn ngữ hiện tại ('vi', 'en',...)
}
```

### 2.3. Xử lý trường Media và Rich Text trước khi vào View
- Mọi trường kiểu `Image` / `Media` đều được tự động resolve sang đường dẫn URL `/media/{mediaId}` hoặc URL static có kích thước/alt tương ứng (kế thừa từ Giai đoạn 5 Media Library).
- Mọi trường kiểu `Rich Text` đều được xử lý qua hàm `resolveRichText(html)` để phân giải link nội bộ (`~/item/{id}`) và link media (`~/media/{id}`) trước khi đưa vào context.
- Trong file EJS của component:
  - Dữ liệu text thông thường hiển thị an toàn bằng `<%= fields.HeroTitle %>` (tự động HTML escape).
  - Dữ liệu Rich Text đã sanitize hiển thị bằng `<%- fields.HeroDescription %>`.

---

## 3. Quy trình thực thi tại Helper `placeholder(key)`
```javascript
// Helper placeholder được bind vào response locals:
locals.placeholder = function(placeholderKey) {
  const renderings = presentation.renderings.filter(r => r.placeholderKey === placeholderKey);
  let html = '';
  for (const rendering of renderings) {
    try {
      const componentFields = rendering.dataSource 
        ? await resolveItemFields(rendering.dataSource, lang, version)
        : fields; // Mặc định kế thừa từ page fields

      html += ejs.render(fs.readFileSync(rendering.viewFullPath, 'utf8'), {
        item,
        fields: componentFields,
        params: rendering.params || {},
        datasource: rendering.dataSource ? componentFields : null,
        site,
        lang,
        placeholder // Cho phép placeholder lồng nhau nếu có
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        html += `<div class="component-render-error" style="border:2px dashed red; padding:10px; color:red;">
                   <strong>Error rendering [${rendering.name}]:</strong> ${err.message}
                 </div>`;
      } else {
        logger.error(`Error rendering component ${rendering.name}:`, err);
        // Ở production: ẩn lỗi, không làm sập toàn bộ trang
      }
    }
  }
  return html;
};
```

---

## 4. Tài liệu liên quan
- `docs/rules/05-security.md`
- `docs/data-model/presentation.md`
- `docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`
- `docs/decisions/DEC-033-viewpath-and-template-security.md`

