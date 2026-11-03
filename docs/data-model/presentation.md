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
      language: "en",
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
- **Template `Device`:** `name`, `displayName`, `fallbackDeviceId`, `userAgentRegex`, `isDefault`.
- **Template `Layout`:** `name`, `displayName`, `componentName` (tên React layout component tương ứng trên frontend), `placeholders` (mảng string các placeholder mặc định).
- **Template `Rendering`:** `name`, `displayName`, `componentName` (khớp với React component), `datasourceTemplate` (ObjectId giới hạn template cho datasource), `datasourceLocation` (đường dẫn gốc gợi ý chọn datasource), `parametersTemplate` (ObjectId template định nghĩa parameters), `placeholders` (mảng placeholder lồng bên trong component), `icon`.
- **Template `Placeholder Settings`:** `name`, `displayName`, `placeholderKey` (ví dụ: `main`, `content`, `column-{*}`), `allowedRenderings` (mảng ObjectId các Rendering được phép đặt vào), `description`.
- **Template `Rendering Parameters Folder`:** Schema định nghĩa các trường cấu hình parameters.

---

## 4. Các Item Hệ thống Dưới `/sitecore/layout/`
Khởi tạo tự động qua migration/seed script:
- `/sitecore/layout/Devices`: `Default` (isDefault=true), `Mobile`.
- `/sitecore/layout/Layouts`: `MainLayout` (`componentName: "MainLayout"`, `placeholders: ["header", "main", "footer"]`).
- `/sitecore/layout/Renderings`:
  - `Hero` (`componentName: "HeroBanner"`, `placeholders: []`)
  - `RichText` (`componentName: "RichTextContent"`, `placeholders: []`)
  - `Promo` (`componentName: "PromoCard"`, `placeholders: []`)
  - `Navigation` (`componentName: "SiteNavigation"`, `placeholders: []`)
- `/sitecore/layout/Placeholder Settings`:
  - `header` (allowedRenderings: `[Navigation]`)
  - `main` (allowedRenderings: `[Hero, RichText, Promo]`)
  - `footer` (allowedRenderings: `[Navigation, RichText]`)
  - `content` (allowedRenderings: `[RichText, Promo]`)
  - `column-{*}` (allowedRenderings: `[RichText, Promo]`)

---

## 5. Quy tắc Toàn vẹn Dữ liệu & Định danh Bất biến
1. **Định danh Rendering Instance bằng UUID v4:** Mọi rendering instance bắt buộc mang một `uid` chuẩn **UUID v4** duy nhất, không thay đổi khi sắp xếp, kéo thả giữa các placeholder hay override delta.
2. **Kiểm tra Toàn vẹn khi Xoá (Integrity Check):**
   - Khi xoá một `Layout` hoặc `Rendering`, hệ thống quét `templates.presentation` và `items_master.presentation`. Nếu đang có item tham chiếu, **chặn xoá** và hiển thị danh sách các item đang sử dụng.
   - Khi xoá một item đang làm `datasourceId` cho rendering, hệ thống hiển thị cảnh báo; nếu vẫn xoá, Layout Service trả về `fields: null` để React frontend xử lý fallback an toàn.

