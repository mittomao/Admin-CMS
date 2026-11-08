# DEC-036: RENDERING GẮN COMPONENT TEMPLATE & CƠ CHẾ SUY RA TRƯỜNG HIỆU LỰC (EFFECTIVE TEMPLATE RESOLUTION)

## Trạng thái
- **Trạng thái:** Đã đề xuất (Proposed — Chờ phê duyệt)
- **Ngày quyết định:** 2026-11-04
- **Người đề xuất:** Tech Lead / Solution Architect
- **Người duyệt:** Project Owner / Architecture Committee
- **Phạm vi áp dụng:** Giai đoạn 6.2, Giai đoạn 8, Giai đoạn 10, Giai đoạn 12
- **Thay thế:** Thay thế mục 2.1 của DEC-035 (Quy tắc Page Template kế thừa Component Template qua `baseTemplates`).

---

## 1. Ngữ cảnh & Đặt vấn đề

Theo thiết kế ban đầu tại [DEC-035](DEC-035-component-field-inheritance-and-context.md), để một Page Item (ví dụ `/about-us`) có sẵn các trường nhập liệu của component (như `HeroTitle`, `IntroHeading`), Page Template tương ứng (ví dụ `About us`) phải khai báo các Component Template trong mảng `baseTemplates`.

Tuy nhiên, cơ chế này bộc lộ nhiều bất cập trong thực tế vận hành CMS:
1. **Rời rạc và dư thừa thao tác:** Biên tập viên khi thêm một Rendering vào Standard Presentation của Page Template lại phải sang tab Base Templates để chọn thêm Component Template tương ứng.
2. **Sai lệch ngữ nghĩa của Base Template:** `baseTemplates` vốn được thiết kế để kế thừa cấu trúc trang (như `_BasePage`, `_BaseSEO`, `_AuditMetadata`), không nên bị lạm dụng để gắn kết component giao diện.
3. **Khó bảo trì khi thay đổi layout:** Khi gỡ một component khỏi Presentation của trang, template của component đó vẫn còn nằm trong `baseTemplates`, dẫn đến form nhập liệu tiếp tục hiển thị các trường không còn xuất hiện trên giao diện trang.
4. **Xung đột tên trường:** Khi hai component khác nhau cùng có trường mang tên `Title` hoặc `Description`, cơ chế kế thừa phẳng của `resolveTemplate` sẽ ghi đè trường của nhau.

Do đó, cần một cơ chế tự động suy ra trường (computed/effective template) dựa trên chính Presentation thực tế của trang, đồng thời Rendering Item phải trực tiếp mang định nghĩa `componentTemplate`.

---

## 2. Quyết định kỹ thuật

### 2.1. Rendering Item mang thuộc tính `componentTemplate`
1. **Thuộc tính bắt buộc:** Mỗi item Rendering dưới `/root/layout/Renderings/` có thêm trường **`componentTemplate`** (ObjectId, bắt buộc).
2. **Nguồn chọn hợp lệ:** Chỉ được phép chọn các Template nằm trong nhánh thư mục `/root/templates/Feature/Components` (hỗ trợ duyệt qua các thư mục con phân cấp, chỉ chọn được node Template, không chọn được node Folder).
3. **Form quản trị Rendering:**
   - `viewPath`: Đường dẫn view EJS (kiểm tra whitelist `src/views/site/` và đuôi `.ejs`).
   - `componentTemplate`: Hộp chọn đơn (ItemPicker / Dropdown) trỏ tới Component Template hợp lệ.
   - `icon`: Icon hiển thị của component.
   - `parametersTemplate`: Template định nghĩa tham số (tuỳ chọn).
4. **Ràng buộc toàn vẹn dữ liệu (Integrity Constraints):**
   - **Chặn xoá/di chuyển:** Không cho phép xoá hoặc di chuyển một Template ra khỏi `/root/templates/Feature/Components` nếu đang có Rendering tham chiếu đến nó. Hệ thống phải liệt kê rõ danh sách các Rendering đang sử dụng.
   - **Cảnh báo khi thay đổi:** Khi biên tập viên thay đổi `componentTemplate` của một Rendering đang được sử dụng trong các Presentation, hệ thống hiển thị hộp thoại cảnh báo số lượng Page Template và Content Item bị ảnh hưởng. Dữ liệu cũ đã nhập của item theo `fieldId` được giữ nguyên trong cơ sở dữ liệu, không bị xoá.

---

### 2.2. Page Template hoàn toàn độc lập, không kế thừa Component Template
1. Khi cấu hình **Standard Presentation** trên Page Template, việc thêm/bớt rendering diễn ra trực tiếp, **không yêu cầu và không hiển thị** bước chọn Base Template cho component.
2. Mảng `baseTemplates` trên Page Template chỉ phục vụ các template cấu trúc chung (ví dụ `_BasePage`, `_BaseSEO`), tuyệt đối không chứa các Component Template từ `Feature/Components`.
3. Trong giao diện Template Manager:
   - Tab Base Templates: Cảnh báo nếu người dùng chọn nhầm template thuộc `Feature/Components`.
   - Hiển thị khu vực "Fields từ Renderings" (chỉ đọc, suy ra từ Standard Presentation) tách biệt rõ ràng với "Fields của chính Template".

---

### 2.3. Cơ chế suy ra trường hiệu lực: `templateService.resolveEffectiveTemplate`
Xây dựng hàm cốt lõi thay thế `resolveTemplate` cho mọi nghiệp vụ liên quan đến **Item**:

$$\text{Effective Template} = \text{resolveTemplate}(\text{item.templateId}) + \sum_{r \in \text{getFinalPresentation}(\text{item})} \text{r.componentTemplate}$$

1. **Thuật toán phân giải:**
   - **Bước 1:** Lấy template cơ sở của trang thông qua `resolveTemplate(item.templateId)` (bao gồm các base template như `_BasePage`).
   - **Bước 2:** Lấy danh sách rendering thực tế của trang thông qua `presentationService.getFinalPresentation(item, lang, version)`.
   - **Bước 3:** Lấy danh sách `componentTemplate` của các rendering theo đúng thứ tự xuất hiện trong Presentation.
   - **Bước 4:** Gom trường của từng component template thành **một Section riêng biệt**, tên section đặt theo tên của Component/Rendering (ví dụ section `HeroBanner`, section `Introduction`).
   - **Bước 5:** Mỗi section mang thông tin nguồn gốc rõ ràng:
     ```javascript
     origin: {
       templateId: compTemplate._id.toString(),
       templateName: compTemplate.displayName || compTemplate.name,
       renderingName: r.name,
       isComponent: true
     }
     ```
2. **Xử lý trùng tên trường:** Vì mỗi component là một section độc lập và dữ liệu được lưu/truy xuất theo **`fieldId` (ObjectId)**, việc các component khác nhau có cùng trường `Title` hay `Description` hoàn toàn không gây xung đột dữ liệu.
3. **Bảo toàn dữ liệu khi gỡ Component:**
   - Dữ liệu người dùng đã nhập được lưu trong `item.fields` / `sharedFields` / `unversionedFields` / `versionedFields` theo `fieldId`.
   - Khi gỡ một Rendering khỏi Presentation của Item, section của component đó tạm thời không xuất hiện trên Form Content Editor.
   - Khi thêm lại Rendering đó vào Presentation, dữ liệu cũ tự động hiển thị lại nguyên vẹn mà không bị mất mát.
4. **Quy tắc lặp component:**
   - Nếu cùng một Component xuất hiện nhiều lần trên một trang (ví dụ 2 khối `HeroBanner`), cả hai sẽ **dùng chung một bộ field** đọc từ Page Item.
   - Nếu cần nội dung khác nhau cho từng instance, biên tập viên sẽ sử dụng trường tuỳ chọn `datasourceId` trỏ tới item nội dung riêng.
5. **Standard Values động:**
   - Các giá trị `standardValues` được cấu hình trên Component Template sẽ tự động áp dụng cho Page Item khi rendering thuộc Presentation của item đó.
6. **Bộ nhớ đệm (Cache):**
   - Kết quả `resolveEffectiveTemplate` được lưu cache in-memory theo key `[itemId, lang, version]`.
   - Tự động vô hiệu hoá cache khi:
     - Lưu Presentation (Standard Presentation của Template, Shared Presentation hoặc Final Presentation của Item).
     - Cập nhật định nghĩa Component Template.
     - Đổi `componentTemplate` trên item Rendering.

---

### 2.4. Điểm thay thế trong toàn bộ hệ thống
Thay thế các lệnh gọi `templateService.resolveTemplate` thành `templateService.resolveEffectiveTemplate(item, lang, version)` tại các phân hệ:
1. **Content Editor:**
   - `itemService.getItemWithRenderSchema`: Hiển thị form soạn thảo đầy đủ các section theo component.
   - Form view: Hiển thị nhãn nguồn `từ rendering <Tên Component>` trên tiêu đề section.
2. **Cập nhật & Xác thực Dữ liệu:**
   - `itemService.updateFields`: Xác thực regex, bắt buộc, kiểu dữ liệu cho toàn bộ các trường (cả trường trang và trường component).
   - `versionService.saveVersionFields`: Phân loại phạm vi lưu trữ (`shared`, `unversioned`, `versioned`) cho trường component.
3. **Khởi tạo Item Mới:**
   - `itemService.createFromTemplate`: Áp dụng Standard Values từ cả Page Template và các Component Templates trong Standard Presentation.
4. **Site Renderer (GĐ 10):**
   - Trích xuất dữ liệu `fields` truyền vào EJS View thông qua `resolveEffectiveTemplate`.
5. **Giữ nguyên `resolveTemplate` thuần tuý:** Chỉ dùng riêng cho phân hệ **Template Manager** (quản lý cây template, phân tích kế thừa base templates, kiểm tra cycle loop).

---

## 3. Hệ quả & Tác động

### Tích cực
- **Trải nghiệm người dùng vượt trội:** Thêm component vào presentation là form tự động có field ngay lập tức, không cần thao tác kế thừa thủ công.
- **Tách biệt kiến trúc rõ ràng:** Base template giữ đúng vai trò kế thừa thuộc tính trang; Component template gắn chặt với Rendering.
- **An toàn dữ liệu tuyệt đối:** Gỡ rendering không bao giờ làm mất dữ liệu người dùng đã nhập.
- **Tránh xung đột:** Gom nhóm theo section giải quyết triệt để vấn đề trùng tên trường giữa các component.

### Hạn chế & Giảm thiểu
- **Tính toán động tăng thêm:** `resolveEffectiveTemplate` cần gọi thêm `getFinalPresentation`.
  - *Giảm thiểu:* Tối ưu bằng LRU In-Memory Cache và vô hiệu hoá chính xác theo sự kiện cập nhật.
- **Lặp component dùng chung trường:** Hai component cùng loại trên một trang đọc chung dữ liệu nếu không dùng Datasource.
  - *Giảm thiểu:* Hỗ trợ trường `datasourceId` cho các trường hợp nâng cao cần dữ liệu độc lập.

---

## 4. Tài liệu liên quan
- [DEC-016: Cycle Detection trong Template Inheritance](DEC-016-template-inheritance-cycle-detection.md)
- [DEC-031: Server-Side EJS Renderer Architecture](DEC-031-server-side-ejs-renderer-architecture.md)
- [DEC-032: Three-Branch Layout Tree Structure](DEC-032-three-branch-layout-tree-structure.md)
- [DEC-035: Component Field Inheritance & View Context](DEC-035-component-field-inheritance-and-context.md) (Bị thay thế một phần bởi DEC này)
- `docs/phases/phase-06-2-rendering-template.md`

