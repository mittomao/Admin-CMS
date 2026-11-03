# DEC-030: Cấu trúc Cây Item Layout, Thư mục Nhóm và Cơ chế Bảo vệ Node Hệ thống

- **Ngày quyết định:** 2026-11-04
- **Giai đoạn liên quan:** GĐ 6 (Presentation)
- **Trạng thái:** Đã chốt (Accepted)

## 1. Bối cảnh
Tiếp nối quyết định DEC-024 (Quản lý Layout/Rendering như Item hệ thống trong Cây nội dung), việc tổ chức các thành phần Presentation trong cây cần cấu trúc rõ ràng, hỗ trợ thư mục nhóm để phân chia theo tính năng hoặc domain (ví dụ `/sitecore/layout/Renderings/Feature`), đồng thời phải đảm bảo:
1. Các node hệ thống cốt lõi không bị người dùng vô tình đổi tên, di chuyển hoặc xóa bỏ làm gãy cấu trúc CMS.
2. Không thể xóa một Rendering hoặc Layout (hoặc thư mục chứa chúng) nếu thành phần đó đang được sử dụng trong Template Standard Presentation hoặc Item Overrides.
3. Chỉ người dùng có vai trò kỹ thuật (`Administrator`, `Developer` - sở hữu quyền `presentation:write`) mới được phép tạo, sửa, đổi tên, di chuyển hoặc xóa các mục dưới `/sitecore/layout`.
4. Giao diện `ItemPicker` cho phép duyệt theo đúng phạm vi (rootPath) và lọc chọn đúng template mục tiêu (`allowedTemplate`).

## 2. Quyết định

### 2.1. Cấu trúc cây chuẩn dưới `/sitecore/layout`
Cây Presentation được phân cấp cố định theo thứ tự `sortOrder`:
```
sitecore
└── layout                          (sortOrder: 200, Template: Folder)
    ├── Layouts                     (sortOrder: 100, Template: Layout Folder)
    ├── Renderings                  (sortOrder: 200, Template: Rendering Folder)
    │   └── Feature                 (sortOrder: 100, Template: Rendering Folder - chứa renderings mẫu)
    ├── Devices                     (sortOrder: 300, Template: Folder)
    └── Placeholder Settings        (sortOrder: 400, Template: Folder)
```
- Đường dẫn vật lý (chuẩn hóa chữ thường qua `cleanItemName`):
  - Layouts: `/sitecore/layout/layouts/...`
  - Renderings: `/sitecore/layout/renderings/...`

### 2.2. Template hệ thống thư mục và Insert Options
- Thêm 2 System Template: `Layout Folder` và `Rendering Folder` (icon `ti ti-folder`, `isSystem: true`).
- Cấu hình Insert Options nghiêm ngặt:
  - `Layouts` và `Layout Folder`: Chỉ cho phép tạo `Layout Folder` và `Layout`.
  - `Renderings` và `Rendering Folder`: Chỉ cho phép tạo `Rendering Folder` và `Rendering`.
  - `Layout` và `Rendering` leaf items: Không cho phép tạo con thủ công (`insertOptions: []`).
  - `Devices`: Chỉ cho phép tạo `Device`.
  - `Placeholder Settings`: Chỉ cho phép tạo `Placeholder Settings`.

### 2.3. Bảo vệ Node hệ thống (Protected System Paths)
Danh sách các đường dẫn bất biến:
- `/sitecore/layout`
- `/sitecore/layout/layouts`
- `/sitecore/layout/renderings`
- `/sitecore/layout/devices`
- `/sitecore/layout/placeholder settings`

Tất cả các thao tác `rename`, `moveTo`, `delete` đối với các node này đều bị chặn ở tầng `itemService` với mã lỗi `400` kèm thông báo bảo vệ hệ thống. Trên giao diện Content Editor, các nút thao tác tương ứng trên Ribbon bị vô hiệu hóa khi chọn các node này.

### 2.4. Chặn xóa thành phần đang được sử dụng (Recursive Component In-Use Guard)
- Khi thực hiện xóa một Item hoặc một Thư mục trong cây:
  - Hệ thống thu thập toàn bộ ID của item đó và tất cả con cháu của nó (đệ quy).
  - Gọi `presentationService.getUsage(itemIds)` để rà soát toàn bộ `Template.presentation` và `Item.presentation` (cả `shared` và `final`).
  - Nếu phát hiện bất kỳ Layout hoặc Rendering nào đang được tham chiếu, thao tác xóa bị từ chối với thông báo chi tiết danh sách Item/Template đang sử dụng.

### 2.5. Phân quyền thao tác nhánh Presentation (`presentation:write`)
- Mọi thao tác ghi (`createItem`, `updateFields`, `renameItem`, `duplicateItem`, `moveItem`, `deleteItem`) tác động lên các item có đường dẫn bắt đầu bằng `/sitecore/layout` đều yêu cầu quyền `presentation:write`.
- Quyền `presentation:write` được cấp cho `Administrator` và `Developer`. Các vai trò nội dung thuần túy (`Author`, `Editor`) bị từ chối với mã lỗi `403 Forbidden` khi cố gắng ghi dữ liệu, nhưng vẫn có quyền đọc (`item:read`) để xem cấu hình.

### 2.6. Duyệt và Kiểm tra tính hợp lệ của Presentation
- Modal Presentation Details tích hợp `ItemPicker` với cấu hình:
  - Chọn Layout: `rootPath: '/sitecore/layout/Layouts'`, `allowedTemplate: 'Layout'`.
  - Chọn Rendering: `rootPath: '/sitecore/layout/Renderings'`, `allowedTemplate: 'Rendering'`.
  - Folder được phép mở/thu gọn nhưng không thể chọn làm giá trị Layout/Rendering.
- Service `presentationService.validatePresentation` kiểm tra nghiêm ngặt đường dẫn và template của Layout/Rendering trước khi lưu.
- Do tham chiếu lưu theo ID item (`ObjectId`), việc di chuyển Layout/Rendering giữa các thư mục con trong `/sitecore/layout/Layouts` hoặc `/sitecore/layout/Renderings` không làm đứt gãy tham chiếu của các Item/Template đang dùng.

## 3. Hệ quả & Đánh giá kỹ thuật
- **Tính toàn vẹn dữ liệu:** Không thể vô tình xóa hoặc làm hỏng các node hệ thống hoặc các rendering đang phục vụ trang.
- **Trải nghiệm người dùng:** Nhóm các rendering theo thư mục (Feature, Project, Foundation) giúp cây nội dung gọn gàng, giống hệt cấu trúc Sitecore Helix / Sitecore XM tiêu chuẩn.
- **Phân tách trách nhiệm:** Tách biệt rõ ràng quyền hạn của Developer (được cấu hình Presentation) và Author (chỉ biên tập nội dung datasource hoặc dùng rendering có sẵn).

