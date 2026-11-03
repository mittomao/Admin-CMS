# Mô hình Đa ngôn ngữ & Đa phiên bản (Versions & Languages)
> File: `docs/data-model/versions-languages.md`  
> Mô tả: Cấu trúc đa ngôn ngữ, đa phiên bản, cơ chế phân định 3 cấp độ trường: Shared, Unversioned, và Versioned.

---

## 1. Cấu trúc Mảng `languages` trong Item

```javascript
// Nằm bên trong document của collection items_master
languages: [
  {
    code: "en",                        // Mã ngôn ngữ chuẩn ISO (en, vi-VN, ja...)
    
    // Cấp độ 2: Unversioned Fields
    // Các trường phụ thuộc vào ngôn ngữ này nhưng dùng chung cho TẤT CẢ các version
    unversionedFields: {
      "64a1b2c3d4e5f67890123995": "seo, keywords, english"
    },
    
    // Cấp độ 3: Versioned Fields
    // Danh sách các phiên bản nội dung theo thời gian
    versions: [
      {
        version: 1,                    // Số thứ tự phiên bản: 1, 2, 3...
        workflowStateId: null,         // Trạng thái workflow (GĐ 8)
        createdAt: ISODate("2026-11-03T00:00:00.000Z"),
        createdBy: ObjectId("64a1b2c3d4e5f67890123501"),
        updatedAt: ISODate("2026-11-03T02:00:00.000Z"),
        updatedBy: ObjectId("64a1b2c3d4e5f67890123501"),
        note: "Initial version",
        
        // Dữ liệu nội dung của riêng phiên bản cụ thể này
        fields: {
          "64a1b2c3d4e5f67890123991": "About Our Corporation (v1)",
          "64a1b2c3d4e5f67890123992": "<p>Welcome to version 1...</p>",
          "64a1b2c3d4e5f67890123993": ObjectId("64a1b2c3d4e5f67890123777") // Tham chiếu Media ID
        }
      },
      {
        version: 2,
        workflowStateId: null,
        createdAt: ISODate("2026-11-03T03:00:00.000Z"),
        createdBy: ObjectId("64a1b2c3d4e5f67890123501"),
        updatedAt: ISODate("2026-11-03T03:00:00.000Z"),
        updatedBy: ObjectId("64a1b2c3d4e5f67890123501"),
        note: "Restored from version 1",
        fields: {
          "64a1b2c3d4e5f67890123991": "About Our Corporation (v2 - Updated)",
          "64a1b2c3d4e5f67890123992": "<p>Welcome to version 2...</p>"
        }
      }
    ]
  },
  {
    code: "vi",
    unversionedFields: {
      "64a1b2c3d4e5f67890123995": "gioi-thieu, cong-ty, tieng-viet"
    },
    versions: [
      {
        version: 1,
        createdAt: ISODate("2026-11-03T03:30:00.000Z"),
        createdBy: ObjectId("64a1b2c3d4e5f67890123501"),
        updatedAt: ISODate("2026-11-03T03:30:00.000Z"),
        updatedBy: ObjectId("64a1b2c3d4e5f67890123501"),
        note: "Vietnamese initial version",
        fields: {
          "64a1b2c3d4e5f67890123991": "Giới thiệu về Tập đoàn chúng tôi",
          "64a1b2c3d4e5f67890123992": "<p>Chào mừng bạn đến với phiên bản tiếng Việt...</p>"
        }
      }
    ]
  }
]
```

---

## 2. Quy tắc Phân giải 3 Cấp độ Trường (Field Inheritance Resolution)
Khi một client yêu cầu đọc giá trị trường của một Item tại một ngôn ngữ `langCode` và phiên bản `versionNumber`, thuật toán `itemService.resolveFieldValues` sẽ gộp các cấp độ theo thứ tự ưu tiên:

$$\text{Versioned Field} \xrightarrow{\text{fallback}} \text{Unversioned Field} \xrightarrow{\text{fallback}} \text{Shared Field} \xrightarrow{\text{fallback}} \text{Standard Value của Template}$$

1. **Shared Fields (`Item.sharedFields`):**
   - Áp dụng khi trường có thuộc tính `isShared === true` trên Template.
   - Thay đổi giá trị này ở bất kỳ đâu sẽ làm thay đổi trên toàn bộ mọi ngôn ngữ và mọi version.
2. **Unversioned Fields (`Item.languages[lang].unversionedFields`):**
   - Áp dụng khi trường có `isShared === false` và `isUnversioned === true`.
   - Mỗi ngôn ngữ có một giá trị riêng, nhưng dùng chung cho tất cả các version trong ngôn ngữ đó.
3. **Versioned Fields (`Item.languages[lang].versions[v].fields`):**
   - Áp dụng khi `isShared === false` và `isUnversioned === false` (mặc định).
   - Mỗi version lưu trữ độc lập một giá trị riêng.

---

## 3. Ngôn ngữ Mặc định (`vi`) & Cơ chế Fallback khi Ngôn ngữ Trống (GĐ 4.1 / DEC-029)
1. **Ngôn ngữ Mặc định Hệ thống:**
   - Hệ thống mặc định toàn bộ thao tác, API và form Content Editor là `vi` (Tiếng Việt).
   - Item mới tạo tự động sinh `languages: [{ code: 'vi', versions: [{ version: 1 }] }]`.
2. **Cơ chế Fallback không cần Migration:**
   - Dữ liệu cũ đang ở `lang: 'en'` được bảo toàn nguyên vẹn.
   - Khi truy cập ngôn ngữ `vi` trên item chỉ có `en`, thuật toán `resolveFields` tự động trích xuất nội dung từ version mới nhất của `en` làm fallback hiển thị (`origins: 'fallback'`, `hasLanguage: false`).
   - Không hiển thị bất kỳ hộp cảnh báo màu vàng gây cản trở nào trong Content Editor.
   - Khi người dùng bấm **Save**, hệ thống tự động khởi tạo nhánh `vi` với `version: 1` và lưu các giá trị mới mà không ghi đè hay làm mất dữ liệu `en`.


