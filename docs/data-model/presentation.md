# Mô hình Cấu hình Headless Presentation (Layout, Rendering & Placeholders)
> File: `docs/data-model/presentation.md`  
> Mô tả: Cấu trúc Presentation trên Item (Shared & Final), Standard Presentation trên Template, System Templates và quy tắc toàn vẹn.

---

## 1. Cấu trúc `presentation` trên Item (`items_master` và `items_web`)

```javascript
// Nằm bên trong document Item
presentation: {
  // 1. Shared Layout: Dùng chung cho mọi ngôn ngữ và mọi phiên bản của Item
  shared: {
    devices: [
      {
        deviceId: ObjectId("64a1b2c3d4e5f67890123901"), // Tham chiếu item Device (Default Device)
        layoutId: ObjectId("64a1b2c3d4e5f67890123910"), // Tham chiếu item Layout (MainLayout)
        renderings: [
          {
            uid: "b8a5d448-6a3f-4e09-9154-1b12b5f63d33", // UUID v4 bất biến cho mỗi rendering instance
            renderingId: ObjectId("64a1b2c3d4e5f67890123920"), // Tham chiếu item Rendering (Hero)
            placeholder: "main",         // Khóa placeholder (main, header, footer, column-{*})
            sortOrder: 100,              // Thứ tự hiển thị trong placeholder
            datasourceId: ObjectId("64a1b2c3d4e5f67890123456"), // ID item chứa dữ liệu nguồn (hoặc null nếu dùng route context)
            parameters: {                // Key-Value parameters động theo schema
              "theme": "dark",
              "fullWidth": "true"
            }
          },
          {
            uid: "f2c3d4e5-6a3f-4e09-9154-1b12b5f63d99",
            renderingId: ObjectId("64a1b2c3d4e5f67890123921"), // Rendering RichText
            placeholder: "main",
            sortOrder: 200,
            datasourceId: null,
            parameters: {}
          }
        ]
      }
    ]
  },
  
  // 2. Final Layout: Ghi đè (Delta Override) theo từng cặp [ngôn ngữ + phiên bản] cụ thể
  final: [
    {
      language: "vi",
      version: 1,
      devices: [
        {
          deviceId: ObjectId("64a1b2c3d4e5f67890123901"),
          layoutId: ObjectId("64a1b2c3d4e5f67890123910"),
          renderings: [
            // Mảng rendering override: thêm mới, đổi vị trí, đổi datasource hoặc ẩn rendering từ shared/standard
          ]
        }
      ]
    }
  ]
}
```

---

## 2. Standard Presentation trên `Template`
Được định nghĩa trong Schema `Template` tại trường `presentation`:

```javascript
presentation: {
  devices: [
    {
      deviceId: ObjectId("64a1b2c3d4e5f67890123901"),
      layoutId: ObjectId("64a1b2c3d4e5f67890123910"),
      renderings: [
        {
          uid: "c194e432-8495-46aa-a982-f04bbf63e001",
          renderingId: ObjectId("64a1b2c3d4e5f67890123920"),
          placeholder: "main",
          sortOrder: 100,
          datasourceId: null,
          parameters: {}
        }
      ]
    }
  ]
}
```

---

## 3. Các Template Hệ thống cho Presentation (System Templates)
Nằm tại nhánh cây `/sitecore/templates/system/layout/`:
- **Template `Layout Folder`:** Thư mục nhóm các Layout (`isSystem: true`, icon: `ti ti-folder`). Insert options: `[Layout Folder, Layout]`.
- **Template `Rendering Folder`:** Thư mục nhóm các Rendering (`isSystem: true`, icon: `ti ti-folder`). Insert options: `[Rendering Folder, Rendering]`.
- **Template `Device`:** `name`, `displayName`, `fallbackDeviceId`, `userAgentRegex`, `isDefault`.
- **Template `Layout`:** `name`, `displayName`, `componentName` (tên React layout component tương ứng trên frontend), `placeholders` (mảng string các placeholder mặc định). Không cho tạo con (`insertOptions: []`).
- **Template `Rendering`:** `name`, `displayName`, `componentName` (khớp với React component), `datasourceTemplate` (ObjectId giới hạn template cho datasource), `datasourceLocation` (đường dẫn gốc gợi ý chọn datasource), `parametersTemplate` (ObjectId template định nghĩa parameters), `placeholders` (mảng placeholder lồng bên trong component), `icon`. Không cho tạo con (`insertOptions: []`).
- **Template `Placeholder Settings`:** `name`, `displayName`, `placeholderKey` (ví dụ: `main`, `content`, `column-{*}`), `allowedRenderings` (mảng ObjectId các Rendering được phép đặt vào), `description`.
- **Template `Rendering Parameters Folder`:** Schema định nghĩa các trường cấu hình parameters.

---

## 4. Các Item Hệ thống Dưới `/sitecore/layout/`
Khởi tạo tự động qua migration/seed script (`src/scripts/seed-presentation-data.js`):
- `/sitecore/layout/Layouts` (sortOrder: 100, template: `Layout Folder`):
  - `MainLayout` (`componentName: "MainLayout"`, `placeholders: ["header", "main", "footer"]`).
- `/sitecore/layout/Renderings` (sortOrder: 200, template: `Rendering Folder`):
  - `Feature` (sortOrder: 100, template: `Rendering Folder`):
    - `Hero` (`componentName: "HeroBanner"`, `placeholders: []`)
    - `RichText` (`componentName: "RichTextContent"`, `placeholders: []`)
    - `Promo` (`componentName: "PromoCard"`, `placeholders: []`)
    - `Navigation` (`componentName: "SiteNavigation"`, `placeholders: []`)
- `/sitecore/layout/Devices` (sortOrder: 300, template: `Folder`):
  - `Default` (isDefault=true), `Mobile`.
- `/sitecore/layout/Placeholder Settings` (sortOrder: 400, template: `Folder`):
  - `header` (allowedRenderings: `[Navigation]`)
  - `main` (allowedRenderings: `[Hero, RichText, Promo]`)
  - `footer` (allowedRenderings: `[Navigation, RichText]`)
  - `content` (allowedRenderings: `[RichText, Promo]`)
  - `column-{*}` (allowedRenderings: `[RichText, Promo]`)

---

## 5. Quy tắc Toàn vẹn Dữ liệu, Phân quyền & Định danh Bất biến
1. **Định danh Rendering Instance bằng UUID v4:** Mọi rendering instance bắt buộc mang một `uid` chuẩn **UUID v4** duy nhất, không thay đổi khi sắp xếp, kéo thả giữa các placeholder hay override delta.
2. **Bảo vệ Node Hệ thống Cốt lõi (DEC-030):**
   - Các node `/sitecore/layout`, `/sitecore/layout/layouts`, `/sitecore/layout/renderings`, `/sitecore/layout/devices`, `/sitecore/layout/placeholder settings` bị cấm đổi tên, di chuyển hoặc xóa bỏ ở cả tầng service lẫn giao diện Ribbon.
3. **Kiểm tra Toàn vẹn Đệ quy khi Xoá (Recursive Component In-Use Guard):**
   - Khi xoá một `Layout`, `Rendering` hoặc một thư mục (`Layout Folder`, `Rendering Folder`), hệ thống duyệt đệ quy toàn bộ con cháu và quét `Template.presentation` cùng `Item.presentation` (cả `shared` và `final`). Nếu có thành phần đang được tham chiếu, **chặn xoá** và liệt kê danh sách chi tiết các Item/Template đang dùng.
   - Khi xoá một item đang làm `datasourceId` cho rendering, hệ thống hiển thị cảnh báo; nếu vẫn xoá, Layout Service trả về `fields: null` để React frontend xử lý fallback an toàn.
4. **Phân quyền Thao tác Nhánh Presentation:**
   - Mọi thao tác ghi (tạo, cập nhật, đổi tên, nhân bản, di chuyển, xóa) dưới nhánh `/sitecore/layout/*` yêu cầu quyền `presentation:write` (thuộc vai trò `Administrator` hoặc `Developer`). Content Author chỉ có quyền đọc (`item:read`) để tham chiếu cấu hình.


