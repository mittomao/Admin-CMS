# DEC-032: Chuẩn hóa Cây Presentation thành 3 Nhánh (Loại bỏ Device & Placeholder Settings)

- **Ngày quyết định:** 2026-11-04
- **Giai đoạn liên quan:** GĐ 6 (Presentation), GĐ 10 (Site Renderer)
- **Trạng thái:** Đã chốt (Accepted)

---

## 1. Bối cảnh
Trước đây (DEC-030), nhánh `/root/layout` được thiết kế có 4 nhánh con: `Layouts`, `Renderings`, `Devices`, và `Placeholder Settings`. Cấu hình Device (`Default`, `Mobile`) và Placeholder Settings (`column-{*}`) được vay mượn từ hệ thống cũ nhằm hỗ trợ React JSS, gây cồng kềnh và dư thừa trong kiến trúc EJS SSR.

## 2. Quyết định
Chuẩn hóa nhánh `/root/layout` thành **đúng 3 thư mục con bất biến**:
```text
/root/layout/
├── Layouts/              # Chứa các item Layout
│   └── HomeLayout        # viewPath: "layouts/HomeLayout.ejs"
├── Placeholders/         # Chứa các item Placeholder giữ chỗ
│   ├── header            # placeholderKey: "header"
│   ├── maincontent       # placeholderKey: "maincontent"
│   └── footer            # placeholderKey: "footer"
└── Renderings/           # Chứa các item Rendering (Component)
    ├── HeroBanner        # viewPath: "components/HeroBanner.ejs"
    ├── Introduction      # viewPath: "components/Introduction.ejs"
    └── ImageText         # viewPath: "components/ImageText.ejs"
```

1. **Loại bỏ hoàn toàn thư mục `Devices`:**
   - Trong phát triển web hiện đại, tính năng Responsive Design được xử lý bằng CSS Media Queries phía client thay vì chia cắt cấu hình backend theo User-Agent Devices. Toàn bộ logic `resolveDevice` và mảng `devices[]` trong schema Presentation được xóa bỏ.
2. **Loại bỏ thư mục `Placeholder Settings`:**
   - Thay thế bằng thư mục **`Placeholders`**. Mỗi item đại diện cho một block giữ chỗ của layout:
     - Trường `placeholderKey` (String, bắt buộc): Khóa placeholder xuất hiện trong layout EJS (`header`, `maincontent`, `footer`...).
     - Trường `allowedRenderings` (Array of ObjectId): Danh sách các Rendering được phép đặt vào placeholder này (rỗng = cho phép tất cả).
3. **Cơ chế lồng nhiều cấp:**
   - Các thư mục con bên trong `Layouts`, `Placeholders`, `Renderings` được phép lồng nhiều cấp để phân nhóm theo domain hoặc tính năng (ví dụ `Renderings/Feature/...`, `Renderings/Foundation/...`).
4. **Bảo vệ Node Hệ thống:**
   - Ba node `/root/layout/Layouts`, `/root/layout/Placeholders`, `/root/layout/Renderings` là node hệ thống bất biến: cấm đổi tên, di chuyển hoặc xóa bỏ.
5. **Tham chiếu theo ID:**
   - Mọi liên kết giữa Item, Layout, Placeholder, Rendering đều lưu bằng **ObjectId**, không lưu theo đường dẫn chuỗi (path) để tránh đứt gãy liên kết khi đổi tên hoặc di chuyển folder.

## 3. Hệ quả & Lưu ý kỹ thuật
- Tinh giản vượt bậc cấu trúc cây nội dung và form Presentation Details.
- Biên tập viên chỉ cần làm việc với 3 khái niệm trực quan: Layout (khung trang), Placeholder (vị trí trên khung), và Rendering (thành phần giao diện đặt vào vị trí đó).
- Thay thế hoàn toàn DEC-022 và DEC-030.

