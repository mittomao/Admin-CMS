# Báo cáo Phân loại & Rà soát R2 (R2 Findings)

> **Tổng số phát hiện:** 932 vị trí cần xử lý trong mã nguồn, tài liệu, test và scripts.
> **Ngày tạo:** 2026-11-08

## 1. Thống kê theo Khu vực

| Khu vực | Số lượng dòng | Hành động chính |
| :--- | :--- | :--- |
| **Documentation** | 405 | Chuẩn hóa theo quy ước R1/R2 |
| **Public Assets & JS** | 38 | Chuẩn hóa theo quy ước R1/R2 |
| **Code** | 118 | Chuẩn hóa theo quy ước R1/R2 |
| **Config & Infra** | 20 | Chuẩn hóa theo quy ước R1/R2 |
| **Scripts & Migration** | 135 | Chuẩn hóa theo quy ước R1/R2 |
| **Styles & Tokens** | 3 | Chuẩn hóa theo quy ước R1/R2 |
| **Views (EJS)** | 7 | Chuẩn hóa theo quy ước R1/R2 |
| **Tests** | 206 | Chuẩn hóa theo quy ước R1/R2 |

## 2. Bảng Phân loại Chi tiết (Tất cả các vị trí)

| File : Dòng | Nội dung rút gọn | Phân loại | Hành động đề xuất |
| :--- | :--- | :--- | :--- |
| `README.md:1` | `# Sitecore XM-like CMS (Node.js + Express + EJS + MongoDB)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `README.md:3` | `Hệ thống Quản trị Nội dung Phân cấp theo Phong cách Sitecore XM (Experience Mana` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `README.md:21` | `Điều chỉnh cấu hình nếu cần (mặc định chạy tại port `3000` và MongoDB `mongodb:/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/README.md:1` | `# TÀI LIỆU HỆ THỐNG QUẢN TRỊ NỘI DUNG (SITECORE-LIKE XM CMS)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/README.md:11` | `- [01-project-overview.md](rules/01-project-overview.md): Mục tiêu dự án, triết ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/README.md:24` | `- [items-and-tree.md](data-model/items-and-tree.md): Cấu trúc Item Master/Web, q` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/README.md:32` | ``db.items_master.find({ path: { $regex: '^/sitecore/content/home' } })`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/README.md:37` | `- `parentId`: ID của node cha trực tiếp (`null` đối với Root node `/sitecore`).` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/README.md:38` | `- `path`: Đường dẫn chuỗi văn bản duy nhất (ví dụ: `/sitecore/content/home/about` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/README.md:50` | `\| `presentation` (Item & Template) \| [`presentation.md`](./presentation.md) \|` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:15` | `parentId: ObjectId("64a1b2c3d4e5f67890123400"),   // ID node cha (null nếu là Ro` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:17` | `ObjectId("64a1b2c3d4e5f67890123000"), // /sitecore` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:18` | `ObjectId("64a1b2c3d4e5f67890123100"), // /sitecore/content` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:19` | `ObjectId("64a1b2c3d4e5f67890123400")  // /sitecore/content/home` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:21` | `path: "/sitecore/content/home/about-us", // Materialized path (duy nhất)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:84` | `Cây nội dung khởi tạo với các node gốc bất biến theo kiến trúc Sitecore XM Serve` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/data-model/items-and-tree.md:86` | `sitecore` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/data-model/items-and-tree.md:87` | `├── content                    (/sitecore/content - chứa các trang; Home là star` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:88` | `├── layout                     (/sitecore/layout - chứa Presentation, đúng 3 nhá` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:89` | `│   ├── Layouts                (/sitecore/layout/Layouts - chứa các Layout EJS i` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:90` | `│   ├── Placeholders           (/sitecore/layout/Placeholders - chứa các Placeho` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:91` | `│   └── Renderings             (/sitecore/layout/Renderings - chứa các Rendering` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:92` | `├── media library              (/sitecore/media library - chứa tài nguyên số)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:93` | `├── system                     (/sitecore/system - cấu hình hệ thống)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:94` | `└── templates                  (/sitecore/templates - định nghĩa schema)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:95` | `├── Feature                (/sitecore/templates/Feature/Components - Component T` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:96` | `├── Project                (/sitecore/templates/Project/Pages - Page Templates)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:97` | `└── System                 (/sitecore/templates/System - System Templates)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:99` | `- **Node Hệ thống Cốt lõi:** Bị cấm đổi tên, di chuyển và xóa (`/sitecore`, `/si` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:100` | `- **Phân quyền Presentation:** Mọi thao tác ghi dưới `/sitecore/layout/*` yêu cầ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/items-and-tree.md:101` | `- **Media Items dưới `/sitecore/media library` (DEC-038 & GĐ 5.1):** Tuân thủ tr` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:9` | `- Xóa bỏ hoàn toàn collection riêng biệt `media`. Toàn bộ tài nguyên số (ảnh, fi` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:11` | `- Quản lý phân cấp bằng System Templates tại `/sitecore/templates/System`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:28` | `ObjectId("64a1b2c3d4e5f67890123000"),            // /sitecore` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:29` | `ObjectId("64a1b2c3d4e5f67890123300"),            // /sitecore/media library` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:30` | `ObjectId("64a1b2c3d4e5f67890123700")             // /sitecore/media library/bann` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:32` | `path: "/sitecore/media library/banners/hero-banner",` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:102` | `\| `/sitecore/media library` (Root) \| `AdminCMS` \| - \|` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:103` | `\| `/sitecore/media library/Banners` (Folder) \| `AdminCMS/Banners` \| - \|` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:104` | `\| `/sitecore/media library/Banners/hero-banner` (Image) \| `AdminCMS/Banners` \` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/media.md:105` | `\| `/sitecore/media library/Docs/report` (PDF File) \| `AdminCMS/Docs` \| `Admin` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:15` | `layoutId: ObjectId("64a1b2c3d4e5f67890123910"), // Tham chiếu item Layout trong ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:19` | `renderingId: ObjectId("64a1b2c3d4e5f67890123920"), // Tham chiếu item Rendering ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:56` | `Được định nghĩa trong Schema `Template` (tại `src/models/Template.js`) dành cho ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:83` | `- Mỗi **Component Template** (nằm tại `/sitecore/templates/Feature/Components/`,` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:84` | `- Mỗi **Rendering Item** (nằm tại `/sitecore/layout/Renderings/`) gắn trực tiếp ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:85` | `- Mỗi **Page Template** (nằm tại `/sitecore/templates/Project/Pages/`, ví dụ `Ho` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:93` | `## 3. Cấu trúc Cây `/sitecore/layout/` (Đúng 3 Thư mục con)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:94` | `Nhánh `/sitecore/layout/` được chuẩn hóa thành **đúng 3 thư mục con bất biến**:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:97` | `/sitecore/layout/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:118` | `Được định nghĩa tại nhánh cây `/sitecore/templates/System/Layout/`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:131` | `- Trường **`componentTemplate`** (ObjectId, bắt buộc): Trỏ tới Template chứa các` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:134` | `- Dùng để tổ chức cây thư mục con phân cấp dưới `/sitecore/layout/`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/presentation.md:203` | `2. **Bảo vệ Node Hệ thống:** Ba node `/sitecore/layout/Layouts`, `/sitecore/layo` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/templates.md:8` | `Mô hình hóa định nghĩa schema cấu trúc tương tự Sitecore (`Template -&gt; Sectio` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/data-model/templates.md:111` | `1. **`/sitecore/templates/Feature/Components/` (Component Templates):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/templates.md:115` | `2. **`/sitecore/templates/Project/Pages/` (Page Templates):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/templates.md:120` | `3. **`/sitecore/templates/System/` (System Templates):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/users-roles-acl.md:31` | `name: "Sitecore Client Authoring",` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/data-model/users-roles-acl.md:46` | `itemId: ObjectId("64a1b2c3d4e5f67890123400"), // Áp dụng cho Item cụ thể (/sitec` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/workflow-publish-audit.md:75` | `{ itemId: ObjectId("..."), action: "PUBLISHED", path: "/sitecore/content/home" }` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/data-model/workflow-publish-audit.md:91` | `itemPath: "/sitecore/content/home",` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-001-materialized-path-ancestors.md:12` | `- `path` cho phép query cả nhánh cây bằng regex prefix (`^/sitecore/content/home` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-005-ejs-layouts-separation.md:5` | `Màn hình quản trị Sitecore có cấu trúc shell phức tạp (header, taskbar, floating` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-006-vanilla-css-sitecore-theme.md:1` | `# DEC-006: Kiến trúc CSS thuần Module hóa (Sitecore Theme)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-006-vanilla-css-sitecore-theme.md:5` | `Giao diện Sitecore đòi hỏi các tông màu chuẩn (Navy, Red, Xám tro, Pastel tiles)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-006-vanilla-css-sitecore-theme.md:8` | `Xây dựng CSS bằng Vanilla CSS thuần phân chia thành các file module: `variables.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-006-vanilla-css-sitecore-theme.md:11` | `Giữ mã giao diện nhẹ, dễ tùy biến chính xác theo từng pixel phong cách Sitecore ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-011-fancytree-dnd5.md:5` | `Cây nội dung của Sitecore có thể chứa hàng chục ngàn item. Việc tải toàn bộ cây ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-016-template-inheritance-cycle-detection.md:8` | `Template trong CMS phong cách Sitecore cho phép một Template kế thừa nhiều Templ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-019-presentation-phase-position.md:11` | `Theo yêu cầu chuyển đổi kiến trúc sang Headless CMS hỗ trợ React frontend theo c` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-020-presentation-shared-vs-final.md:11` | `Trong Sitecore, trang web thường có các component dùng chung cho mọi ngôn ngữ và` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-022-dynamic-placeholder-matching.md:4` | `&gt; **Trạng thái:** Bị thay thế bởi [DEC-032](DEC-032-three-branch-layout-tree-` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-022-dynamic-placeholder-matching.md:23` | `- Đơn giản hóa số lượng Placeholder Settings cần khởi tạo trong cây hệ thống `/s` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:10` | `2. Lưu trữ toàn bộ các cấu hình này thành các Node Item trong Cây nội dung dưới ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:15` | `- Lưu trữ dưới nhánh cây `/sitecore/layout/`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:16` | `- `/sitecore/layout/Devices`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:17` | `- `/sitecore/layout/Layouts`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:18` | `- `/sitecore/layout/Renderings`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:19` | `- `/sitecore/layout/Placeholder Settings`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-024-presentation-items-in-content-tree.md:25` | `- **Tính nhất quán:** Tuân thủ triệt để triết lý thiết kế của Sitecore XM, tạo s` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-025-version-restore-creates-new-version.md:18` | `- **Tuân thủ chuẩn Sitecore XM:** Hành vi khôi phục này tương đồng hoàn toàn với` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-027-three-level-field-resolution.md:8` | `Với mô hình Sitecore XM, một trường dữ liệu có thể là:` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-028-media-richtext-reference.md:12` | `Kiến trúc hiện tại của dự án chúng ta tuân thủ triết lý Sitecore XM ("Mọi thứ là` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-028-media-richtext-reference.md:28` | `- Tuân thủ nguyên tắc **"Mọi thứ là Item"**: Media được định nghĩa và quản lý dư` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-028-media-richtext-reference.md:43` | `- Điều chỉnh styling và cấu trúc DOM để đồng bộ với Sitecore Theme (màu sắc xám/` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-028-media-richtext-reference.md:52` | `- Khi chèn liên kết nội bộ: Cung cấp modal chọn Item cây nội dung, chèn `&lt;a h` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-028-media-richtext-reference.md:65` | `- **Tích cực:** Tận dụng được toàn bộ thiết kế UX/UI tinh hoa và logic tương tác` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:11` | `Tiếp nối quyết định DEC-024 (Quản lý Layout/Rendering như Item hệ thống trong Câ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:14` | `3. Chỉ người dùng có vai trò kỹ thuật (`Administrator`, `Developer` - sở hữu quy` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:19` | `### 2.1. Cấu trúc cây chuẩn dưới `/sitecore/layout`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:22` | `sitecore` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:31` | `- Layouts: `/sitecore/layout/layouts/...`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:32` | `- Renderings: `/sitecore/layout/renderings/...`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:45` | `- `/sitecore/layout`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:46` | `- `/sitecore/layout/layouts`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:47` | `- `/sitecore/layout/renderings`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:48` | `- `/sitecore/layout/devices`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:49` | `- `/sitecore/layout/placeholder settings`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:60` | `- Mọi thao tác ghi (`createItem`, `updateFields`, `renameItem`, `duplicateItem`,` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:65` | `- Chọn Layout: `rootPath: '/sitecore/layout/Layouts'`, `allowedTemplate: 'Layout` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:66` | `- Chọn Rendering: `rootPath: '/sitecore/layout/Renderings'`, `allowedTemplate: '` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:69` | `- Do tham chiếu lưu theo ID item (`ObjectId`), việc di chuyển Layout/Rendering g` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-030-layout-tree-structure-and-node-protection.md:73` | `- **Trải nghiệm người dùng:** Nhóm các rendering theo thư mục (Feature, Project,` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-032-three-branch-layout-tree-structure.md:10` | `Trước đây (DEC-030), nhánh `/sitecore/layout` được thiết kế có 4 nhánh con: `Lay` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-032-three-branch-layout-tree-structure.md:13` | `Chuẩn hóa nhánh `/sitecore/layout` thành **đúng 3 thư mục con bất biến**:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-032-three-branch-layout-tree-structure.md:15` | `/sitecore/layout/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-032-three-branch-layout-tree-structure.md:37` | `- Ba node `/sitecore/layout/Layouts`, `/sitecore/layout/Placeholders`, `/sitecor` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:26` | `- Mặc định, cây nội dung được tổ chức tại `/sitecore/content`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:27` | `- Node **`Home`** (`/sitecore/content/Home`) được quy định là **Start Item** của` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:34` | `- `/` $\rightarrow$ `/sitecore/content/Home`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:35` | `- `/about-us` $\rightarrow$ Item con của `Home` có name khớp với `about-us` (hoặ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:57` | `3. Khởi tạo parent = Start Item ('/sitecore/content/Home')` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-034-public-url-resolution-rules.md:77` | `- Rõ ràng, tự nhiên, bám sát mô hình phân cấp Sitecore Content Tree.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-035-component-field-inheritance-and-context.md:26` | `1. **Component Template (`/sitecore/templates/Feature/Components/`):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-035-component-field-inheritance-and-context.md:31` | `2. **Page Template (`/sitecore/templates/Project/Pages/`):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md:30` | `1. **Thuộc tính bắt buộc:** Mỗi item Rendering dưới `/sitecore/layout/Renderings` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md:31` | `2. **Nguồn chọn hợp lệ:** Chỉ được phép chọn các Template nằm trong nhánh thư mụ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md:38` | `- **Chặn xoá/di chuyển:** Không cho phép xoá hoặc di chuyển một Template ra khỏi` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:1` | `# DEC-037: ĐỊNH DẠNG SECTION QUICK INFO, ITEM ID VÀ QUẢN LÝ OWNER THEO CHUẨN SIT` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:13` | `Trong hệ thống Sitecore Experience Management (XM), mọi Item hiển thị trong Cont` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:22` | `1. **Quy tắc ngoặc nhọn:** Định dạng chuẩn của Sitecore là `{GUID-VIẾT-HOA}`.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:29` | `2. **Domain mặc định:** Do hệ thống hiện tại chưa cấu hình đa miền Windows Activ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:31` | `- Nếu `item.createdBy` có liên kết tới `User` còn tồn tại: hiển thị `sitecore\&l` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-037-quick-info-section-and-formatting.md:47` | `### 2.5. Giao diện Chuẩn Sitecore & Ghi nhớ Trạng thái Người Dùng` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:12` | `1. **Lệch khỏi triết lý Sitecore XM ("Mọi thứ là Item")**: Media tồn tại ở một c` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:15` | `- Do đó, người dùng yêu cầu tái định nghĩa: **Mọi Media đều là Item** trong `ite` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:23` | `- **System Templates cho Media (tại `/sitecore/templates/System`)**:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:35` | `- **Thư mục gốc:** `/AdminCMS` trên Cloudinary ánh xạ chính xác với `/sitecore/m` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:37` | `- Item `/sitecore/media library/Banners/Hero` ↔ File Cloudinary `AdminCMS/Banner` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:38` | `- Thư mục Item `/sitecore/media library/Banners` ↔ Thư mục Cloudinary `AdminCMS/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:64` | `- **Trường Image & MediaPicker:** Lưu `mediaId` (ID của Item media). Picker duyệ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-038-cloudinary-media-item-unification.md:73` | `- Kiến trúc đạt độ thuần khiết 100% chuẩn Sitecore XM ("Everything is an Item").` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-039-execute-phase-08-before-phase-07.md:34` | `\| `workflow:manage` \| Sửa định nghĩa workflow, states, commands \| `Administra` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md:10` | `Trước GĐ 7, việc phân quyền trong CMS được trừu tượng hóa qua hàm `canPerform(us` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md:55` | `- `publish:manage`: Yêu cầu quyền `publish` trên root item `/sitecore/content` v` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md:58` | `- `database:web:read` & `database:compare`: Phân quyền qua role cấu hình hệ thốn` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md:93` | `- Khi người dùng chỉ được cấp quyền đọc ở một nhánh sâu (ví dụ `/sitecore/conten` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-042-item-level-acl-and-permission-resolution.md:110` | `- Tạo các entry ACL mặc định trên các node gốc `/sitecore`, `/sitecore/content`,` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:4` | `Hệ thống CMS hiện tại được xây dựng mô phỏng triết lý kiến trúc của **Sitecore E` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:5` | `- **Tên dự án / Thương hiệu:** `Sitecore Experience Management`, `Sitecore XM CM` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:6` | `- **Gốc cây dữ liệu (Root Node):** `/sitecore`, với các nhánh con: `/sitecore/co` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:7` | `- **Domain mặc định:** `sitecore\admin`.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:9` | `Để độc lập hóa sản phẩm thành một nền tảng CMS riêng biệt mang thương hiệu riêng` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:18` | `- Topbar header: Logo `Treecraft` thay cho `Sitecore`.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:27` | `- Gốc phân cấp của toàn bộ cây Item đổi từ `/sitecore` thành `/root`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:64` | `- **Kỷ luật:** Cấm tuyệt đối việc hard-code chuỗi `/sitecore`, `/root`, hoặc `Tr` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:69` | `- Chuyển `ROOT_MEDIA_PATH` từ `/sitecore/media library` sang `/root/media librar` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:72` | `### 2.6. Thuật ngữ Nghiệp vụ Vay mượn (Sitecore XM Concepts)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:79` | `\| Thành phần Cây \| Đường dẫn Cũ (Sitecore) \| Đường dẫn Mới (Treecraft) \| Ghi` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:81` | `\| **Gốc Cây** \| `/sitecore` \| `/root` \| Giữ nguyên `_id` \|` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:82` | `\| **Nhánh Nội dung** \| `/sitecore/content` \| `/root/content` \| Chứa toàn bộ ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:83` | `\| **Trang chủ** \| `/sitecore/content/Home` \| `/root/content/Home` \| Trang bắ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:84` | `\| **Nhánh Presentation** \| `/sitecore/layout` \| `/root/layout` \| Chứa 3 nhán` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:85` | `\| **Layouts** \| `/sitecore/layout/Layouts` \| `/root/layout/Layouts` \| Chứa L` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:86` | `\| **Placeholders** \| `/sitecore/layout/Placeholders` \| `/root/layout/Placehol` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:87` | `\| **Renderings** \| `/sitecore/layout/Renderings` \| `/root/layout/Renderings` ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:88` | `\| **Nhánh Templates** \| `/sitecore/templates` \| `/root/templates` \| Chứa tất` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:89` | `\| **Component Templates** \| `/sitecore/templates/Feature/Components` \| `/root` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:90` | `\| **Page Templates** \| `/sitecore/templates/Project/Pages` \| `/root/templates` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:91` | `\| **System Templates** \| `/sitecore/templates/System` \| `/root/templates/Syst` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:92` | `\| **Common Templates** \| `/sitecore/templates/Common` \| `/root/templates/Comm` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:93` | `\| **Nhánh Media** \| `/sitecore/media library` \| `/root/media library` \| Đồng` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:94` | `\| **Nhánh Hệ thống** \| `/sitecore/system` \| `/root/system` \| Chứa Workflow, ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:103` | `3. Không lo ngại vấn đề bản quyền thương hiệu Sitecore trên giao diện và tài liệ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md:109` | `- *Biện pháp:* Viết script migration có `--dry-run`, thực hiện theo thứ tự độ sâ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/decisions/README.md:16` | `\| **DEC-006** \| Kiến trúc CSS thuần Module hóa (Sitecore Theme) \| GĐ 0 \| 202` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/decisions/README.md:47` | `\| **DEC-037** \| Định dạng Section Quick Info, Item ID và Quản lý Owner theo ch` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:2` | `**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:14` | `├── taskbar.ejs              # Bottom Taskbar chuẩn Sitecore (hiện đại hóa bằng ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:30` | `1. *Brand Logo:* Biểu tượng chữ S màu đỏ Sitecore (`#eb1c24`), tên hệ thống `Sit` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:35` | `3. *Breadcrumb Ngữ Cảnh:* Hiển thị màn hình hiện tại (ví dụ: `Launchpad` hoặc `C` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/design-system-integration/component-implementation-plan.md:42` | `- **Mục đích:** Giữ trọn vẹn trải nghiệm Desktop App Sitecore ở chân màn hình nh` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:45` | `- Viền trên màu đỏ Sitecore (`border-top: 2px solid var(--sc-red)`).` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/component-implementation-plan.md:116` | `- Tệp CSS mở rộng chứa toàn bộ các quy chuẩn: Launchpad tiles, input-icon addon ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:2` | `**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:11` | `- Đang dùng bộ CSS thủ công (`variables.css`, `base.css`, `layout.css`, `compone` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:98` | `- Duy trì thanh Taskbar cố định dưới đáy màn hình của Sitecore (`.sc-taskbar`), ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:103` | `- Brand Logo Sitecore S (`width: 32px; height: 32px; border-radius: 6px; backgro` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:104` | `- Tên CMS: `Sitecore XM CMS` (`fw-bold fs-2`).` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:119` | `- Nâng cấp Ribbon Tabs thành dạng thẻ Tabler chuẩn với viền nhấn màu đỏ Sitecore` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/design-system-mapping.md:125` | `- Thẻ đăng nhập trung tâm bo góc 12px (`rounded-4`), đổ bóng sâu `shadow-lg`, in` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:2` | `**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:10` | `\| `public/css/admin.css` \| CSS \| Tệp CSS mở rộng cốt lõi: Quy chuẩn Launchpad` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:27` | `\| **`src/views/partials/topbar.ejs`** \| Xây dựng thanh Topbar chuẩn Tabler (`n` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:28` | `\| **`src/views/partials/taskbar.ejs`** \| Hiện đại hóa thanh Taskbar Sitecore d` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:30` | `\| **`src/views/admin/auth/login.ejs`** \| Nâng cấp form đăng nhập: Dùng thẻ bo ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/files-to-modify.md:56` | `\|---&gt; Cập nhật src/views/partials/taskbar.ejs (Modernized Sitecore taskbar)` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/integration-risks.md:2` | `**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/integration-risks.md:11` | `\| **2** \| **Xung đột CSS Class (CSS Specificity Collisions)** giữa các file CS` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/integration-risks.md:14` | `\| **5** \| **Gãy Các Ca Kiểm Thử Tự Động (Test Regression)** trong `tests/smoke` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/ui-ux-validation-checklist.md:2` | `**Dự Án: Sitecore-like Hierarchical XM CMS (Node.js + Express + EJS + MongoDB)**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/ui-ux-validation-checklist.md:19` | `- [x] Màu đỏ thương hiệu Sitecore Red (`#eb1c24`) xuất hiện đúng vị trí: Logo ic` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/ui-ux-validation-checklist.md:42` | `- [x] **Thanh Taskbar Dưới Đáy (Sitecore Modernized):**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system-integration/ui-ux-validation-checklist.md:43` | `- [x] Cố định chắc chắn ở đáy màn hình (`fixed-bottom`, viền trên màu đỏ Sitecor` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system/design-system-overview.md:74` | `1. **Mô Hình Sitecore Experience Launchpad (Unified Topbar + Launchpad Grid)**:` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/design-system/layout-guidelines.md:3` | `Tài liệu này đặc tả cấu trúc khung tổng thể của Admin CMS, chi tiết hóa hai kiến` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/guides/add-page-and-component.md:3` | `Tài liệu này hướng dẫn lập trình viên và tác giả nội dung cách tạo thêm trang we` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/guides/add-page-and-component.md:10` | `[Content Tree (/sitecore/content)]` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:13` | `[Page Item: /sitecore/content/Services] ── (Kế thừa Presentation)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:55` | `2. Mở nhánh `/sitecore/layout/Renderings`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:58` | `- **Template:** `/sitecore/templates/System/Rendering`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:69` | `2. Dưới `/sitecore/templates/Project/Pages`, tạo template `Services Page`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:79` | `2. Nhấp chuột phải vào `/sitecore/content` hoặc `/sitecore/content/Home`, chọn *` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/guides/add-page-and-component.md:88` | `3. Kiểm tra bố cục, placeholder và giao diện hiển thị với thanh banner màu tối "` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:21` | `- **Lý do đề xuất:** Tránh làm ô nhiễm và biến dạng schema template; đúng chuẩn ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:46` | `- **Lựa chọn A (Đề xuất mặc định):** **Chỉ cảnh báo.** Trong Template Manager (t` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/open-questions.md:99` | `- **Lý do đề xuất:** Tránh rủi ro xóa nhầm làm mất vĩnh viễn tệp gốc của khách h` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:188` | `- **Lý do đề xuất:** Giữ đúng triết lý của Sitecore Desktop: Các công cụ quản tr` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:194` | `Tài liệu này lưu trữ danh sách 10 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho ` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/open-questions.md:198` | `### 1. Domain người dùng đổi `sitecore\admin` &rarr; `treecraft\admin` hay giữ `` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:201` | `- **Lựa chọn A (Đề xuất mặc định):** **Đổi sang `treecraft\admin`** (domain mặc ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:202` | `- **Lựa chọn B:** Giữ nguyên domain `sitecore\admin` hoặc đổi sang định danh tru` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:203` | `- **Lý do đề xuất:** Nhất quán 100% với thương hiệu mới `Treecraft`; loại bỏ tri` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/open-questions.md:239` | `- **Lý do đề xuất:** Các thuật ngữ này đã gắn liền với mã nguồn, tên model (`Wor` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/open-questions.md:261` | `### 8. Item gốc: Đổi `name` `sitecore` &rarr; `root` và giữ nguyên `_id`?` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:2` | `## Kế hoạch Rebrand "Treecraft" & Đổi Root Item `/sitecore` → `/root`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:13` | `\| **Số lần xuất hiện từ khóa `sitecore` (không phân biệt hoa thường)** \| 1.274` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:14` | `\| **Số lần xuất hiện đường dẫn `/sitecore/` hoặc `/sitecore`** \| 791 lần \| Nằ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:15` | `\| **Số lần xuất hiện cú pháp domain `sitecore\`** \| 12 lần \| Trên 8 tệp (auth` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:16` | `\| **Số lần xuất hiện cụm `Sitecore Experience`** \| 18 lần \| Trên 15 tệp giao ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:19` | `\| **Số Item trong Master (`items_master`)** \| 72 items \| 100% (72/72) có `pat` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:20` | `\| **Số Item trong Web (`items_web`)** \| 53 items \| 100% (53/53) có `path` bắt` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:21` | `\| **Số Template trong `templates`** \| 24 templates \| 100% (24/24) có `path` b` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:22` | `\| **Độ dài path lớn nhất trong DB** \| 104 ký tự \| `/sitecore/media library/te` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:25` | `\| **Số bản ghi Lịch sử Xuất bản (`publish_histories`)** \| 13 bản ghi \| Mảng `` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/R1-impact-matrix.md:34` | `\| **1. Dữ liệu Master và Web** \| Item gốc (Root Item) \| 2 bản ghi (1 Master, ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:35` | `\| \| Cây Item Master (`items_master`) \| 72 bản ghi \| Toàn bộ `path` bắt đầu b` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:36` | `\| \| Cây Item Web (`items_web`) \| 53 bản ghi \| Toàn bộ `path` bắt đầu bằng `/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:37` | `\| \| Cây Template (`templates`) \| 24 bản ghi \| `path: "/sitecore/templates/..` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:39` | `\| \| Trang chủ (`SITE_START_ITEM`) \| 1 cấu hình \| Mặc định `/sitecore/content` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:42` | `\| \| Lịch sử Publish (`publish_histories`) \| 13 bản ghi \| Mảng `logDetails[].` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/R1-impact-matrix.md:45` | `\| \| Domain người dùng (`domains`) \| 1 bản ghi \| `{ name: "sitecore", isDefau` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:47` | `\| **3. Seed, Migration cũ & Test** \| Seed chính (`src/scripts/seed-initial-dat` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:48` | `\| \| Seed Presentation (`seed-presentation-data.js`) \| 84 occurrences \| Hard-` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:49` | `\| \| Seed Sample Site (`seed-sample-site.js`) \| 28 occurrences \| Hard-code `/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:50` | `\| \| Đồng bộ Template (`sync-system-templates.js`) \| 32 occurrences \| Hard-co` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:51` | `\| \| Migration cũ (GĐ 0 &rarr; 8.1) \| 9 tệp migration \| Chứa chuỗi `/sitecore` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/R1-impact-matrix.md:52` | `\| \| Bộ kiểm thử (`tests/`) \| 24 tệp, 244 occurrences \| Khởi tạo mock tree `/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:53` | `\| **4. Mapper & Hằng số** \| Media Path Mapper (`src/utils/mediaPathMapper.js`)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:54` | `\| \| Site Resolver (`src/services/siteResolver.js`) \| 12 occurrences \| Prefix` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:56` | `\| \| Template Service (`src/services/templateService.js`) \| 16 occurrences \| ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:57` | `\| \| Presentation Service (`src/services/presentationService.js`) \| 14 occurre` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:58` | `\| \| ACL Service (`src/services/aclService.js`) \| 1 occurrence \| `isLayoutTre` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:59` | `\| \| Icon Registry (`src/config/icons.js`, `public/js/admin/icons.js`) \| 22 oc` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:60` | `\| **5. Cú pháp Cấu hình** \| Source của Field Template (`Template.sections.fiel` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:62` | `\| **6. Giao diện (UI)** \| Topbar Header (`src/views/partials/topbar.ejs`) \| 2` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:63` | `\| \| Trang đăng nhập (`src/views/admin/auth/login.ejs`) \| 2 occurrences \| "Si` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:64` | `\| \| Thẻ `&lt;title&gt;` (`src/views/partials/head.ejs`, `404.ejs`, ...) \| 6 t` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:67` | `\| **7. Domain & User** \| Domain người dùng \| 3 users (`admin`, `editor`, `aut` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:70` | `\| \| Biến môi trường (`.env.example`) \| 1 tệp \| `APP_NAME="Sitecore XM CMS"`,` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:71` | `\| **9. Thư viện & Gói** \| Thông tin dự án (`package.json`) \| 1 tệp \| `name: ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:73` | `\| \| Các file quy tắc (`docs/rules/*`) \| 5 tệp \| Đề cập `Sitecore`, `/sitecor` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:75` | `\| **11. Site Công khai** \| Public Site Controller (`src/controllers/site/siteC` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/R1-impact-matrix.md:76` | `\| \| Public Site Views (`src/views/site/partials/header.ejs`, `footer.ejs`) \| ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/R1-impact-matrix.md:88` | `\| **Đường dẫn `/sitecore` &rarr; `/root`** \| 791 \| Đường dẫn phân cấp CMS Ite` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/README.md:35` | `\| **0** \| Khởi tạo nền tảng & Layout Shell \| **Hoàn thành** \| - \| [`phase-0` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/README.md:36` | `\| **1** \| Nền tảng xác thực & Launchpad \| **Hoàn thành** \| 0 \| [`phase-01-f` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/README.md:41` | `\| **5.1** \| Tái định nghĩa Media Library (Cloudinary & Mọi Media là Item) \| *` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/README.md:44` | `\| **6.3** \| Quick Info cho mọi Item trong Content Editor \| **Hoàn thành** \| ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/README.md:50` | `\| **R1** \| Rebrand "Treecraft" & Đổi Root `/sitecore` → `/root` \| **Hoàn thàn` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/phase-00-bootstrap.md:13` | `&gt; Thiết lập khung sườn dự án Express, EJS layout engine, CSS Sitecore theme v` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-00-bootstrap.md:22` | `- [`docs/decisions/DEC-006-vanilla-css-sitecore-theme.md`](../decisions/DEC-006-` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-00-bootstrap.md:26` | `Thiết lập khung sườn dự án vững chắc với Node.js, Express, MongoDB, EJS Layout E` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-00-bootstrap.md:29` | `- **Làm:** Cấu trúc thư mục chuẩn; khởi tạo `package.json`, cài đặt dependencies` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-00-bootstrap.md:37` | `- [x] **Task 0.5:** Xây dựng bộ CSS Sitecore chuẩn (`src/public/css/sitecore-the` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-00-bootstrap.md:48` | `- `src/public/css/sitecore-theme.css`, `src/public/js/sitecore-shell.js`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-00-bootstrap.md:55` | `Kiểm tra kết nối thành công tới database MongoDB `sitecore_cms_master`.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-00-bootstrap.md:59` | `- Truy cập trình duyệt `http://localhost:3000` hiển thị đầy đủ giao diện shell: ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-01-foundation.md:13` | `&gt; Xây dựng User/Role model, phiên làm việc MongoDB, màn hình Login Sitecore v` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-01-foundation.md:27` | `- **Làm:** Model `User`, `Role`, `LaunchpadApp`; mã hóa mật khẩu với `bcryptjs`;` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-01-foundation.md:36` | `- [x] **Task 1.6:** Thiết kế giao diện EJS đăng nhập `src/views/admin/auth/login` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-01-foundation.md:60` | `- Dữ liệu ban đầu: Tài khoản admin, các role hệ thống, danh mục 6-8 apps chuẩn S` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-02-content-editor-mvp.md:39` | `- [x] **Task 2.3:** Tạo hạt giống dữ liệu ban đầu cho cây Sitecore: Node Root (`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-02-content-editor-mvp.md:91` | `- Khởi tạo cây mẫu Sitecore chuẩn.` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-02-content-editor-mvp.md:94` | `- Mở Content Editor, cây nội dung hiển thị node gốc `/sitecore`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-02-content-editor-mvp.md:95` | `- Bấm mở rộng node `/sitecore/content` -&gt; Lazy load hiển thị node `home`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-03-template-manager.md:47` | `- `src/views/admin/templates/manager.ejs`: Cây template nằm dưới nhánh `/sitecor` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-04-versions-languages.md:25` | `Hoàn thiện cơ chế Đa ngôn ngữ (Multilingual) và Quản lý phiên bản (Item Versioni` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-05-1-cloudinary-media.md:13` | `1. **Triết lý Sitecore XM thuần túy — "Mọi Media đều là Item"**:` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-05-1-cloudinary-media.md:15` | `- Mọi tệp ảnh, tài liệu, video và thư mục media đều là các **Item** chính danh t` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:16` | `- Mỗi item media gắn với một **System Template** tương ứng (`Media Folder`, `Ima` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:19` | `- Thư mục gốc `/AdminCMS` trên Cloudinary ánh xạ 1-1 với nhánh `/sitecore/media ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:29` | `\| **Vị trí lưu trữ dữ liệu** \| Bảng CSDL riêng `media` (`collection: 'media'`)` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:33` | `\| **System Templates cho Media** \| Chưa có System Template chuẩn cho media tro` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:56` | `- Cây Fancytree hiển thị các Item media bên dưới `/sitecore/media library` tương` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:59` | `- Đăng ký các System Templates trong nhánh `/sitecore/templates/System`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:83` | `- Nhánh gốc: `/sitecore/media library` tương ứng gốc `AdminCMS`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:84` | `- Item Path: `/sitecore/media library/Banners/Summer/hero-banner`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:89` | `- Item Path: `/sitecore/media library/Banners/Summer/hero-banner`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:127` | `- [x] Xây dựng migration/seed tạo 3 System Templates tại `/sitecore/templates/Sy` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:131` | `- [x] Đảm bảo node gốc `/sitecore/media library` là một `Item` chính danh sử dụn` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:152` | `- [x] Tạo Item media dưới `/sitecore/media library` khi upload.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:167` | `- [x] Picker duyệt trực tiếp cây Item bên dưới `/sitecore/media library`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:180` | `- [x] Tạo các node `Item` tương ứng dưới `/sitecore/media library` với template ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:222` | `1. [ ] **Mọi Media là Item:** Nhánh `/sitecore/media library` chỉ chứa các `Item` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-1-cloudinary-media.md:224` | `3. [ ] **Đầy đủ System Templates:** Các template `Media Folder`, `Image`, `File`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-media-library.md:28` | `Xây dựng ứng dụng Media Library quản lý tài nguyên số (hình ảnh, tài liệu) dạng ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-05-media-library.md:32` | `- Cây thư mục Media (phân cấp dưới `/sitecore/media library` theo Materialized P` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-media-library.md:103` | `- Seed các System Template (`Media Folder`, `Image`, `File`) và thư mục gốc `/si` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-reference-mapping.md:24` | `\| **9** \| **Mô hình Dữ liệu CSDL** \| Model `imagesModel.js` mồ côi (không dùn` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-05-reference-mapping.md:25` | `\| **10** \| **Cây Thư Mục (Folder Tree)** \| Thư mục phẳng trên Cloudinary, khô` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-05-reference-mapping.md:62` | `- [x] **Cây thư mục Media phân cấp:** Quản lý dưới `/sitecore/media library` bằn` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:34` | `\| **Thuộc tính Rendering Item** \| Field `componentTemplate` là tùy chọn, kiểu ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:53` | `1. Quét toàn bộ Rendering Item dưới `/sitecore/layout/Renderings/`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:54` | `- Nếu rendering chưa có `componentTemplate`: Tự động tìm Template tương ứng tron` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:57` | `2. Quét toàn bộ Page Template dưới `/sitecore/templates/Project/Pages/`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:58` | `- Kiểm tra mảng `baseTemplates`. Nếu có chứa ID của template thuộc `/sitecore/te` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:69` | `- Trường `componentTemplate` (ObjectId, bắt buộc), tham chiếu tới Template thuộc` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-2-rendering-template.md:107` | `- [x] Form biên tập Rendering có trường chọn `componentTemplate`, chỉ cho phép c` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-3-quick-info.md:14` | `&gt; Bổ sung section metadata "Quick Info" chuẩn Sitecore ở đầu form của mọi Ite` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-06-3-quick-info.md:32` | `\| **4** \| **Template** \| Đường dẫn đầy đủ của template kèm `{TEMPLATE_ID_UPPE` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-3-quick-info.md:34` | `\| **6** \| **Item owner** \| Người tạo theo định dạng `domain\username` (mặc đị` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-06-presentation.md:34` | `- Tổ chức quản trị cây `/sitecore/layout` với đúng 3 nhánh (`Layouts`, `Placehol` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:47` | `2. **Tái cấu trúc Cây Presentation (`/sitecore/layout/`):**` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:48` | `- Đúng 3 nhánh con cốt lõi: `/sitecore/layout/Layouts`, `/sitecore/layout/Placeh` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:56` | `- Page Templates: `Home` và `About us` dưới `/sitecore/templates/Project/Pages/`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:78` | `- [x] **Task 6.2:** Xây dựng script seed cây `/sitecore/layout/` với đúng 3 nhán` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:79` | `- [x] **Task 6.3:** Khởi tạo Component Templates mẫu dưới `/sitecore/templates/F` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:123` | `- Cây `/sitecore/layout/`: có 3 nhánh chính `Layouts`, `Placeholders`, `Renderin` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:126` | `- [x] Mở Content Editor, chọn node `/sitecore/content/Home`. Tab `Presentation` ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-06-presentation.md:133` | `- [x] Nhánh cây `/sitecore/layout` hiển thị đúng 3 folder chính (`Layouts`, `Pla` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-07-item-acl.md:23` | `Xây dựng hệ thống bảo mật phân quyền chi tiết tới từng Item theo mô hình Sitecor` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-07-item-acl.md:26` | `- **Làm:** Quản lý User và Role (CRUD, gán role cho user); Bảng phân quyền `Acce` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-08-1-database-switcher.md:33` | `\| **Duyệt Web DB** \| Chỉ có thể xem gián tiếp qua Website công khai (`/`, `/ab` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-08-workflow-publish.md:35` | `2. **Workflow Engine ("Mọi thứ là Item"):** Tạo template hệ thống `Workflow`, `W` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-08-workflow-publish.md:42` | `2. Workflow Engine: System templates và items trong `/sitecore/system/Workflows`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-08-workflow-publish.md:75` | `- Khởi tạo seed system templates và `Sample Workflow` trong `/sitecore/system/Wo` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-09-recycle-bin-audit.md:65` | `- Thử xoá một Rendering đang được sử dụng trong Home Page -&gt; Hệ thống chặn xo` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-10-delivery-layout-api.md:48` | `- Ánh xạ URL path sang item trong `items_web` bắt đầu từ Start Item `/sitecore/c` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-10-delivery-layout-api.md:85` | `- Ánh xạ đường dẫn sang item trong `items_web` từ Start Item `/sitecore/content/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:10` | `# GIAI ĐOẠN R1: REBRAND "TREECRAFT" & ĐỔI ROOT ITEM `/sitecore` → `/root`` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/phase-R1-rebrand-root-rename.md:22` | `Chuyển đổi toàn diện thương hiệu CMS sang **Treecraft** và chuyển đổi gốc cây ph` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:31` | `- Thay thế toàn bộ chuỗi hard-coded `/sitecore` trong `src/services/`, `src/cont` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:34` | `- Cập nhật trường `path` của 72 items trong `items_master` (`^/sitecore` &rarr; ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:35` | `- Cập nhật trường `path` của 53 items trong `items_web` (`^/sitecore` &rarr; `/r` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:37` | `- Cập nhật trường `source` của field template nếu có trỏ tới `/sitecore/...`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:39` | `- Cập nhật domain mặc định trong `domains` và user `domain` trong `users` (`site` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-R1-rebrand-root-rename.md:52` | `- Bổ sung test kiểm tra tính toàn vẹn: không còn bất kỳ chuỗi hard-code `/siteco` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:59` | `3. **Không đổi các thuật ngữ nghiệp vụ vay mượn của Sitecore:** Các khái niệm `L` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/phases/phase-R1-rebrand-root-rename.md:72` | `\| **3** \| **Hằng số hóa không triệt để (sót chuỗi `/sitecore/` cứng)** \| Trun` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:74` | `\| **5** \| **Đổi domain người dùng làm sai thông tin đăng nhập hoặc Item Owner*` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/phases/phase-R1-rebrand-root-rename.md:79` | `\| **10** \| **Không thể Rollback nếu có sự cố xảy ra** \| Thấp \| **Rất cao** \` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:82` | `\| **13** \| **Field Template Source lưu cứng `/sitecore/...`** \| Thấp \| Trung` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:123` | `- `--rollback`: Đảo ngược toàn bộ thay đổi từ `/root` trở lại `/sitecore`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:125` | `- Kiểm tra toàn vẹn sau khi chạy: `countDocuments({ path: /^\/sitecore/i }) === ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:148` | `- [x] Bổ sung test kiểm tra: Không còn bất kỳ file mã nguồn nào chứa chuỗi hard-` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:167` | `- Script tự động đổi ngược toàn bộ tiền tố `^/root` trở lại `/sitecore`, khôi ph` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:177` | `- [x] Tuyệt đối không còn chuỗi hard-code `/sitecore/` rải rác trong `src/servic` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/phases/phase-R1-rebrand-root-rename.md:179` | `- [x] Không còn bất kỳ bản ghi nào có `path` bắt đầu bằng `/sitecore` trong cả M` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-1-report.md:13` | `Giai đoạn 5.1 đã hoàn thành việc tái cấu trúc toàn diện kiến trúc Thư viện Đa ph` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-05-1-report.md:16` | `- Chuyển đổi toàn diện từ mô hình bảng CSDL tách rời `media` sang mô hình Item c` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-1-report.md:17` | `- Xây dựng 3 System Templates chính thức tại `/sitecore/templates/System`:` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-1-report.md:24` | `- Ánh xạ đường dẫn 1-1 giữa `/sitecore/media library` trên CMS và thư mục gốc `/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-1-report.md:61` | `\| Mọi media là Item dưới `/sitecore/media library` \| Đạt \| `templateId` gắn v` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-report.md:10` | `- **Mục tiêu:** Xây dựng Media Library dạng cây phân cấp (Materialized Path `/si` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-report.md:42` | `- [x] Cập nhật `src/scripts/seed-initial-data.js` seed node gốc `/sitecore/media` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-05-report.md:125` | `- **Mô hình Dữ liệu MongoDB Độc lập:** Thay vì phụ thuộc vào Search API của nhà ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-2-report.md:17` | `- Template hệ thống `Rendering` bổ sung trường bắt buộc `componentTemplate` (Obj` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-2-report.md:114` | `- Truy cập Content Editor $\rightarrow$ `/sitecore/layout/Renderings/HeroBanner`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-2-report.md:115` | `- Xác nhận trường `componentTemplate` đang trỏ tới Template `HeroBanner` dưới `/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-2-report.md:117` | `- Mở Item `/sitecore/content/Home`.` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-3-report.md:24` | `- Tạo `src/views/partials/quick-info.ejs` hiển thị đúng 6 dòng theo thứ tự chuẩn` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-06-3-report.md:30` | `- **Item owner:** `domain\username` (mặc định `sitecore\username`) hoặc `[unknow` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-06-report.md:16` | `1. **Tái cấu trúc Cây Presentation `/sitecore/layout/` với đúng 3 nhánh (DEC-032` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:19` | `- `/sitecore/layout/Layouts`: Chứa layout items (`HomeLayout`...).` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:20` | `- `/sitecore/layout/Placeholders`: Chứa placeholder items (`header`, `mainconten` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:21` | `- `/sitecore/layout/Renderings`: Chứa rendering items (`HeroBanner`, `Introducti` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:22` | `- Khóa bảo vệ các node hệ thống: cấm xoá, đổi tên, di chuyển đối với `/sitecore/` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:34` | `- Định nghĩa Component Templates dưới `/sitecore/templates/Feature/Components/` ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:35` | `- Định nghĩa Page Templates dưới `/sitecore/templates/Project/Pages/` (`Home`, `` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:135` | `\| Mở Content Editor, chọn node `/sitecore/content/Home`. Tab `Presentation` trê` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-06-report.md:142` | `\| Nhánh cây `/sitecore/layout` hiển thị đúng 3 folder chính (`Layouts`, `Placeh` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-07-report.md:15` | `Giai đoạn 7 đã chuyển đổi thành công toàn bộ hệ thống phân quyền của CMS từ cơ c` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-07-report.md:52` | `- Đã khởi tạo Domain mặc định `sitecore` và seed 55 quy tắc ACL gốc trên các nod` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-07-report.md:66` | `\| 2 \| `src/models/Domain.js` \| **Tạo mới** \| Schema miền bảo mật (mặc định: ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-08-1-report.md:18` | `- Content Editor tích hợp dropdown chuyển đổi `master \| web` tại 3 vị trí chuẩn` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-08-1-report.md:28` | `- **Dải banner cảnh báo:** Phía trên form hiển thị dải thông báo màu cam/vàng Si` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-08-1-report.md:45` | `- Giao diện Dashboard đối soát Master vs Web đạt chuẩn Sitecore desktop-like UI ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-08-1-report.md:48` | `- `/sitecore/content`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-08-1-report.md:49` | `- `/sitecore/layout`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-08-1-report.md:50` | `- `/sitecore/templates`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-08-1-report.md:51` | `- `/sitecore/media library`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-10-report.md:22` | `- Kiểm tra chống va chạm tên: Item có tên `admin` dưới `/sitecore/content` không` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-10-report.md:25` | `- Ánh xạ đường dẫn URL sang Content Item trong kho dữ liệu `items_web` theo chuẩ` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-10-report.md:59` | `- Dải banner cố định trên cùng (`#sitecorePreviewBanner`) màu vàng Sitecore cảnh` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-10-report.md:84` | `\| \| `src/views/partials/quick-info.ejs` \| Sửa dứt điểm CSS & Layout header Si` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/reports/phase-R1-report.md:2` | `## REBRAND CMS "TREECRAFT" & ĐỔI ROOT CÂY NỘI DUNG `/sitecore` → `/root`` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:15` | `Giai đoạn R1 đã chuyển đổi toàn diện thương hiệu CMS sang **Treecraft** và chuyể` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/reports/phase-R1-report.md:25` | `- Cấm triệt để việc viết cứng (hard-code) chuỗi `/sitecore/` hay `Treecraft` rải` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:30` | `- Cập nhật trường `path` cho **72 items trong `items_master`** (`^/sitecore` &ra` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:31` | `- Cập nhật trường `path` cho **53 items trong `items_web`** (`^/sitecore` &rarr;` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:32` | `- Cập nhật trường `path` cho **24 templates trong `templates`** (`^/sitecore` &r` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:33` | `- Cập nhật trường `source` của template `Rendering` (`/sitecore/templates/Featur` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:37` | `- **Hậu kiểm:** Số lượng bản ghi còn mang tiền tố `/sitecore*` trong cả Master v` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:52` | `- Cập nhật toàn bộ 24 test suites trước đây bị ảnh hưởng bởi đường dẫn `/sitecor` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/reports/phase-R1-report.md:109` | `feat(branding): rebrand CMS to Treecraft and rename root node from /sitecore to ` | Tài liệu | Giữ có lý do (Ghi chú lịch sử) |
| `docs/rules/01-project-overview.md:3` | `&gt; Mô tả: Mục tiêu cốt lõi, triết lý Sitecore XM, phân định Master vs Web, phạ` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/rules/01-project-overview.md:8` | `Xây dựng một hệ thống CMS (Content Management System) quản trị nội dung dạng cây` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/rules/01-project-overview.md:11` | `- Không chỉ bài viết/trang web, mà cả Template (schema định nghĩa cấu trúc), Med` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/rules/01-project-overview.md:15` | `3. **Giao diện quản trị phong cách Sitecore:**` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/rules/01-project-overview.md:40` | `- Nhánh `/sitecore/layout` có đúng 3 thư mục con: `Layouts`, `Placeholders`, `Re` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/rules/01-project-overview.md:56` | `- **xDB, CDP, Real-time Personalization:** Không xây dựng hệ thống thu thập hành` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `docs/rules/04-routing.md:63` | `- `GET /`: Phân giải tới Start Item (node `Home` tại `/sitecore/content/Home`).` | Tài liệu | Đổi sang /root/... (hoặc ROOT_PATH) |
| `docs/rules/05-security.md:35` | `Thứ tự ưu tiên đánh giá quyền theo chuẩn Sitecore:` | Tài liệu | Đổi sang Treecraft / Viết lại trung tính |
| `public/css/admin.css:6` | `/* Sitecore Brand Color Accents */` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `public/css/admin.css:227` | `8. SITECORE BOTTOM TASKBAR (MODERNIZED & ACCENTED)` | Văn bản giao diện | Đổi sang Treecraft / PROJECT_NAME |
| `public/js/admin/content-editor.js:3` | `* Sitecore XM-style Tree, Ribbon Controls, Form Validation & Optimistic Locking` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `public/js/admin/content-editor.js:502` | `'/sitecore',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:503` | `'/sitecore/content',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:504` | `'/sitecore/media library',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:505` | `'/sitecore/system',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:506` | `'/sitecore/templates',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:507` | `'/sitecore/layout',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:508` | `'/sitecore/layout/layouts',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:509` | `'/sitecore/layout/renderings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:510` | `'/sitecore/layout/devices',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:511` | `'/sitecore/layout/placeholder settings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:1298` | `activePath === '/sitecore/content' \|\| activePath.startsWith('/sitecore/content` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:1330` | `activePath === '/sitecore/templates/feature/components' \|\| activePath.startsWi` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/content-editor.js:1332` | `activePath === '/sitecore/templates/project/pages' \|\| activePath.startsWith('/` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:130` | `'/sitecore/templates',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:131` | `'/sitecore/templates/Feature',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:132` | `'/sitecore/templates/Project',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:133` | `'/sitecore/templates/System',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:134` | `'/sitecore/templates/Common',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:135` | `'/sitecore/layout',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:136` | `'/sitecore/layout/Layouts',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:137` | `'/sitecore/layout/Placeholders',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:138` | `'/sitecore/layout/Renderings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:155` | `if (itemPath === '/root/content' \|\| itemPath === '/sitecore/content') {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:180` | `if (tplName === 'Layout' \|\| itemPath.startsWith('/root/layout/layouts') \|\| i` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:183` | `if (tplName === 'Placeholder' \|\| itemPath.startsWith('/root/layout/placeholder` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:186` | `if (tplName === 'Rendering' \|\| itemPath.startsWith('/root/layout/renderings') ` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:193` | `itemPath.startsWith('/sitecore/templates')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:197` | `if (itemPath.startsWith('/root/media library') \|\| itemPath.startsWith('/siteco` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/icons.js:200` | `if (itemPath.startsWith('/root/content') \|\| itemPath.startsWith('/sitecore/con` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/item-picker.js:3` | `* Reusable component for Sitecore XM Admin CMS` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `public/js/admin/media-browser.js:475` | `if (!f.parentId \|\| f.path === '/root/media library' \|\| f.path === '/sitecore` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/media-browser.js:497` | `if (!node.parentId \|\| node.path === '/root/media library' \|\| node.path === '` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/media-browser.js:566` | `const isRoot = !node.parentId \|\| node.path === '/root/media library' \|\| node` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/media-browser.js:652` | `const isRoot = !crumb.parentId \|\| crumb.path === '/root/media library' \|\| cr` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `public/js/admin/security-editor.js:2` | `* Client-Side Security Editor & Access Viewer Module (Sitecore XM &bull; Phase 7` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `scripts/migrate-legacy-media-to-items.js:22` | `const mongoUri = process.env.MONGO_URI \|\| process.env.MONGODB_URI \|\| 'mongod` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/migrate-legacy-media-to-items.js:32` | `console.log('Rolling back: Deleting items created under /sitecore/media library ` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/migrate-legacy-media-to-items.js:34` | `path: { $regex: '^/sitecore/media library/' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/migrate-legacy-media-to-items.js:53` | `if (record.path === '/sitecore/media library') {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/migrate-legacy-media-to-items.js:54` | `let existingRoot = await Item.findOne({ path: '/sitecore/media library', deleted` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/migrate-legacy-media-to-items.js:91` | `const rootItem = await Item.findOne({ path: '/sitecore/media library' });` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/sync-cloudinary-media.js:26` | `const mongoUri = env.MONGO_URI \|\| process.env.MONGO_URI \|\| process.env.MONGO` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `scripts/sync-template-presentation.js:10` | `path: { $regex: '^/sitecore/templates', $options: 'i' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:147` | `// Backward compatibility for legacy sitecore paths` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/config/icons.js:148` | `'/sitecore/templates',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:149` | `'/sitecore/templates/Feature',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:150` | `'/sitecore/templates/Project',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:151` | `'/sitecore/templates/System',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:152` | `'/sitecore/templates/Common',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:153` | `'/sitecore/layout',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:154` | `'/sitecore/layout/Layouts',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:155` | `'/sitecore/layout/Placeholders',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:156` | `'/sitecore/layout/Renderings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:182` | `if (itemPath === branding.PATHS.CONTENT.toLowerCase() \|\| itemPath === '/siteco` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:211` | `if (tplName === 'Layout' \|\| itemPath.startsWith(branding.PATHS.LAYOUTS.toLower` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:214` | `if (tplName === 'Placeholder' \|\| itemPath.startsWith(branding.PATHS.PLACEHOLDE` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:217` | `if (tplName === 'Rendering' \|\| itemPath.startsWith(branding.PATHS.RENDERINGS.t` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:224` | `itemPath.startsWith('/sitecore/templates')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:228` | `if (itemPath.startsWith(branding.PATHS.MEDIA.toLowerCase()) \|\| itemPath.starts` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/icons.js:231` | `if (itemPath.startsWith(branding.PATHS.CONTENT.toLowerCase()) \|\| itemPath.star` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/config/ribbon.js:3` | `* Supports Sitecore tabs & groups hierarchy.` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/controllers/admin/contentEditorController.js:15` | `const isLayoutItem = (p) =&gt; p && (p.toLowerCase().startsWith(branding.PATHS.L` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/contentEditorController.js:40` | `// Fallback to /root/content/home, /sitecore/content/home or root` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/controllers/admin/contentEditorController.js:42` | `(await itemService.getByPath('/sitecore/content/home', currentDb)) \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/contentEditorController.js:1140` | `item = (await itemService.getByPath(branding.PATHS.HOME)) \|\| (await itemServic` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:14` | `{ path: branding.PATHS.CONTENT, legacyPath: '/sitecore/content', name: 'Content'` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:15` | `{ path: branding.PATHS.LAYOUT, legacyPath: '/sitecore/layout', name: 'Layout' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:16` | `{ path: branding.PATHS.TEMPLATES, legacyPath: '/sitecore/templates', name: 'Temp` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:17` | `{ path: branding.PATHS.MEDIA, legacyPath: '/sitecore/media library', name: 'Medi` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:110` | `? branch.replace(/^\/root/, '/sitecore')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/admin/databaseController.js:111` | `: branch.replace(/^\/sitecore/, '/root');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/site/siteController.js:151` | `const contentPattern = new RegExp(`^(${branding.PATHS.CONTENT}\|/sitecore/conten` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/site/siteController.js:165` | `pLower === '/sitecore/content/home' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/controllers/site/siteController.js:166` | `pLower === '/sitecore/content') continue;` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/scripts/migrate-content-insert-options.js:33` | `const mongoUri = process.env.MONGO_URI \|\| 'mongodb://localhost:27017/sitecore_` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:93` | `// 2. Kiểm tra node /sitecore/content và Insert Options` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:94` | `console.log('\n--- BƯỚC 2: Kiểm tra Insert Options cho node /sitecore/content --` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:95` | `const contentNode = await Item.findOne({ path: '/sitecore/content', deleted: fal` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:97` | `console.log('  -&gt; Không tìm thấy node /sitecore/content.');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:99` | `console.log(`Tìm thấy node /sitecore/content: ID = ${contentNode._id}`);` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:101` | `console.log(`Danh sách Insert Options cho /sitecore/content (${insertOptions.len` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-content-insert-options.js:114` | `console.log('  -&gt; TẤT CẢ Insert Options của /sitecore/content đều hợp lệ (thu` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-item-icons.js:91` | `// Special case: /sitecore/content` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-item-icons.js:92` | `if (item.path === '/sitecore/content') {` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:52` | `console.log('\n1. Ensuring default "sitecore" domain...');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:53` | `let defaultDomain = await Domain.findOne({ name: 'sitecore' });` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:57` | `name: 'sitecore',` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:58` | `displayName: 'Sitecore Local Domain',` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:62` | `console.log(' Created default domain "sitecore".');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:64` | `console.log(' [DRY-RUN] Would create default domain "sitecore".');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:67` | `console.log(' Default domain "sitecore" already exists.');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:80` | `domain: 'sitecore',` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:87` | `roleDoc.domain = 'sitecore';` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:101` | `u.domain = 'sitecore';` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:121` | `const rootSitecore = await Item.findOne({ path: '/sitecore', deleted: { $ne: tru` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:122` | `const rootContent = await Item.findOne({ path: '/sitecore/content', deleted: { $` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:123` | `const rootLayout = await Item.findOne({ path: '/sitecore/layout', deleted: { $ne` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:124` | `const rootMedia = await Item.findOne({ path: '/sitecore/media library', deleted:` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:125` | `const rootTemplates = await Item.findOne({ path: '/sitecore/templates', deleted:` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:126` | `const rootSystem = await Item.findOne({ path: '/sitecore/system', deleted: { $ne` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:128` | `if (!rootSitecore) {` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:129` | `console.warn(' [WARN] Root item "/sitecore" not found! Default ACLs will be skip` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:150` | `// A. Root /sitecore rules (inherited by entire tree)` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:167` | `addRule(rootSitecore, 'Administrator', r, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:171` | `addRule(rootSitecore, 'Author', RIGHTS.READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:172` | `addRule(rootSitecore, 'Author', RIGHTS.WRITE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:173` | `addRule(rootSitecore, 'Author', RIGHTS.CREATE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:174` | `addRule(rootSitecore, 'Author', RIGHTS.RENAME, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:175` | `addRule(rootSitecore, 'Author', RIGHTS.PRESENTATION_READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:176` | `addRule(rootSitecore, 'Author', 'workflow:execute:Submit', 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:179` | `addRule(rootSitecore, 'Editor', RIGHTS.READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:180` | `addRule(rootSitecore, 'Editor', RIGHTS.WRITE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:181` | `addRule(rootSitecore, 'Editor', RIGHTS.CREATE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:182` | `addRule(rootSitecore, 'Editor', RIGHTS.RENAME, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:183` | `addRule(rootSitecore, 'Editor', RIGHTS.DELETE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:184` | `addRule(rootSitecore, 'Editor', RIGHTS.PRESENTATION_READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:185` | `addRule(rootSitecore, 'Editor', 'workflow:execute:Submit', 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:188` | `addRule(rootSitecore, 'Approver', RIGHTS.READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:189` | `addRule(rootSitecore, 'Approver', RIGHTS.WRITE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:190` | `addRule(rootSitecore, 'Approver', RIGHTS.CREATE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:191` | `addRule(rootSitecore, 'Approver', RIGHTS.RENAME, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:192` | `addRule(rootSitecore, 'Approver', RIGHTS.DELETE, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:193` | `addRule(rootSitecore, 'Approver', RIGHTS.PUBLISH, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:194` | `addRule(rootSitecore, 'Approver', RIGHTS.PRESENTATION_READ, 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:195` | `addRule(rootSitecore, 'Approver', 'workflow:execute:Submit', 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:196` | `addRule(rootSitecore, 'Approver', 'workflow:execute:Approve', 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:197` | `addRule(rootSitecore, 'Approver', 'workflow:execute:Reject', 'allow', 'both');` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:199` | `// B. Protection Overrides on /sitecore/layout (only Admin/Dev can write)` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:213` | `// C. Protection Overrides on /sitecore/templates` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-07-default-acl.js:223` | `// D. Protection Overrides on /sitecore/system` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-phase-r1-root-rename.js:3` | `* Renames root node and all materialized paths from /sitecore to /root` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:4` | `* Migrates domains from "sitecore" to "treecraft"` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:40` | `const fromPrefix = isRollback ? '/root' : '/sitecore';` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:41` | `const toPrefix = isRollback ? '/sitecore' : '/root';` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:42` | `const fromDomain = isRollback ? branding.DEFAULT_DOMAIN : 'sitecore';` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:43` | `const toDomain = isRollback ? 'sitecore' : branding.DEFAULT_DOMAIN;` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:44` | `const rootName = isRollback ? 'sitecore' : branding.ROOT_NAME;` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:45` | `const rootDisplayName = isRollback ? 'Sitecore' : branding.ROOT_NAME;` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-phase-r1-root-rename.js:48` | `console.log(`Phase R1 Migration: ${isRollback ? 'ROLLBACK (/root -&gt; /sitecore` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/migrate-rendering-component-templates.js:33` | `const mongoUri = process.env.MONGO_URI \|\| 'mongodb://localhost:27017/sitecore_` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-rendering-component-templates.js:45` | `{ path: { $regex: '^/sitecore/templates/Feature/Components', $options: 'i' } },` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-rendering-component-templates.js:65` | `{ path: { $regex: '^/sitecore/layout/renderings', $options: 'i' } },` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-rendering-component-templates.js:135` | `{ path: { $regex: '^/sitecore/templates/Project/Pages', $options: 'i' } },` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-rendering-component-templates.js:164` | `path: { $in: ['/sitecore/content/home', '/sitecore/content/about-us'] },` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-sample-component-template.js:3` | `* Seed and ensure system template 'Standard Template' at /sitecore/templates/Sys` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-sample-component-template.js:33` | `const mongoUri = process.env.MONGO_URI \|\| 'mongodb://localhost:27017/sitecore_` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-sample-component-template.js:45` | `const expectedPath = '/sitecore/templates/System/Standard Template';` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-sample-component-template.js:99` | `const systemFolder = await Item.findOne({ path: '/sitecore/templates/System', de` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-sample-component-template.js:103` | `console.log('  [CẢNH BÁO] Không tìm thấy node thư mục /sitecore/templates/System` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:3` | `* Cấu trúc phân cấp: /sitecore/templates/ (System, Feature/Components, Project/P` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:32` | `console.log('MIGRATION: DI CHUYỂN TEMPLATES VÀO CONTENT TREE (/sitecore/template` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:37` | `const sitecoreRoot = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/s` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:38` | `if (!sitecoreRoot) {` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:120` | `parentId: sitecoreRoot._id,` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:121` | `ancestors: [sitecoreRoot._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:131` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:141` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:151` | `ancestors: [sitecoreRoot._id, templatesRoot._id, featureFolder._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:161` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:171` | `ancestors: [sitecoreRoot._id, templatesRoot._id, projectFolder._id],` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/migrate-templates-to-content-tree.js:191` | `path: { $regex: `^(${branding.PATHS.TEMPLATES}\|/sitecore/templates)`, $options:` | Script | Giữ có lý do (Migration lịch sử đã đóng băng) hoặc chuẩn hóa |
| `src/scripts/seed-initial-data.js:65` | `email: 'admin@sitecore.local',` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:84` | `email: 'author@sitecore.local',` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:555` | `let sitecoreRoot = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/sit` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:556` | `if (!sitecoreRoot) {` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:557` | `sitecoreRoot = await Item.create({` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:604` | `let branchItem = await Item.findOne({ path: { $in: [bPath, `/sitecore/${b.name}`` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:610` | `parentId: sitecoreRoot._id,` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:611` | `ancestors: [sitecoreRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:643` | `let homeItem = await Item.findOne({ path: { $in: [homePath, '/sitecore/content/h` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:650` | `ancestors: [sitecoreRoot._id, branchesMap['content']],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:709` | `const mediaLibraryBranch = await Item.findOne({ path: { $in: [branding.PATHS.MED` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:717` | `let bannersFolder = await Item.findOne({ path: { $in: [sampleBannersPath, '/site` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-initial-data.js:735` | `let editorUploadsFolder = await Item.findOne({ path: { $in: [editorUploadsPath, ` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:82` | `path: { $regex: new RegExp(`^(${branding.PATHS.LAYOUT}\|/sitecore/layout)`, 'i')` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:161` | `const sitecoreRoot = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/s` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:162` | `if (!sitecoreRoot) {` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:328` | `parentId: sitecoreRoot._id,` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:329` | `ancestors: [sitecoreRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:338` | `path: { $regex: new RegExp(`^(${branding.PATHS.LAYOUT}\|/sitecore/layout)/(Devic` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:351` | `ancestors: [sitecoreRoot._id, layoutRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:362` | `ancestors: [sitecoreRoot._id, layoutRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:373` | `ancestors: [sitecoreRoot._id, layoutRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:381` | `path: { $in: ['/sitecore/layout/Layouts/MainLayout', '/sitecore/layout/Rendering` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:397` | `ancestors: [sitecoreRoot._id, layoutRoot._id, layoutsFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:414` | `ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:432` | `ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:450` | `ancestors: [sitecoreRoot._id, layoutRoot._id, renderingsFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:469` | `ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:493` | `ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:513` | `ancestors: [sitecoreRoot._id, layoutRoot._id, placeholdersFolder._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:695` | `const contentRoot = await Item.findOne({ path: { $in: [branding.PATHS.CONTENT, '` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:702` | `ancestors: [sitecoreRoot._id, contentRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:723` | `ancestors: [sitecoreRoot._id, contentRoot._id],` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-presentation-data.js:738` | `// Đồng bộ toàn bộ Template vào Cây Nội Dung (/sitecore/templates)` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:14` | `let rootNode = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/sitecor` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:26` | `let contentRoot = await Item.findOne({ path: { $in: [branding.PATHS.CONTENT, '/s` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:41` | `let homeLayout = await Item.findOne({ path: { $in: [`${branding.PATHS.LAYOUTS}/H` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:59` | `let heroBannerRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.R` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:74` | `let introRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.RENDER` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:89` | `let imageTextRendering = await Item.findOne({ path: { $in: [`${branding.PATHS.RE` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:209` | `let homeItem = await Item.findOne({ path: { $in: [branding.PATHS.HOME, '/sitecor` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:280` | `{ path: '/sitecore/content/About us' },` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/seed-sample-site.js:281` | `{ path: '/sitecore/content/about-us' },` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/sync-system-templates.js:98` | `source: '/sitecore/templates/Feature/Components',` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/sync-system-templates.js:151` | `const item = await Item.findOne({ name: rConf.name, path: { $regex: '^/sitecore/` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/sync-system-templates.js:206` | `const homeLayoutItem = await Item.findOne({ name: 'HomeLayout', path: { $regex: ` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/sync-system-templates.js:233` | `'/sitecore/layout/Layouts/MainLayout',` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/scripts/sync-system-templates.js:234` | `'/sitecore/layout/Renderings/Feature',` | Script | Cập nhật branding.PATHS.* / Treecraft |
| `src/services/aclService.js:435` | `const isLayoutTree = item.path && (item.path.toLowerCase().startsWith(layoutPath` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:47` | `'/sitecore',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:48` | `'/sitecore/content',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:49` | `'/sitecore/media library',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:50` | `'/sitecore/system',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:51` | `'/sitecore/templates',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:52` | `'/sitecore/templates/system/sample component',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:53` | `'/sitecore/templates/system/standard template',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:54` | `'/sitecore/layout',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:55` | `'/sitecore/layout/layouts',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:56` | `'/sitecore/layout/placeholders',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:57` | `'/sitecore/layout/renderings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:58` | `'/sitecore/layout/devices',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:59` | `'/sitecore/layout/placeholder settings',` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:73` | `* Permission check gateway (Sitecore XM Item-Level ACL according to DEC-042 & Ph` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/itemService.js:115` | `* Get the root item of the CMS tree (/root or legacy /sitecore)` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/itemService.js:121` | `path: { $in: [branding.PATHS.ROOT, '/sitecore'] },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:328` | `* Get Sitecore Quick Info metadata for an item (DEC-037 / DEC-041)` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/itemService.js:470` | `if (targetPath === '/template' \|\| targetPath === '/templates' \|\| targetPath ` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:476` | `} else if (targetPath.toLowerCase().startsWith('/sitecore/template/')) {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:477` | `targetPath = branding.PATHS.TEMPLATES + '/' + targetPath.slice('/sitecore/templa` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:482` | `// Try finding exact targetPath first, with fallback to equivalent root/sitecore` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/itemService.js:484` | `if (targetPath.toLowerCase().startsWith('/sitecore')) {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:485` | `alternativePath = branding.PATHS.ROOT + targetPath.slice('/sitecore'.length);` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:487` | `alternativePath = '/sitecore' + targetPath.slice('/root'.length);` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:609` | `parentLowerPath === '/sitecore/templates/feature/components' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:610` | `parentLowerPath.startsWith('/sitecore/templates/feature/components/') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:611` | `parentLowerPath === '/sitecore/templates/project/pages' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:612` | `parentLowerPath.startsWith('/sitecore/templates/project/pages/');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:631` | `// Explicit constraint: only templates in Project/Pages and Common are allowed u` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/itemService.js:636` | `parent.path.toLowerCase() === '/sitecore/content' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:637` | `parent.path.toLowerCase().startsWith('/sitecore/content/')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:868` | `item.path?.toLowerCase().startsWith('/sitecore/layout/layouts') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/itemService.js:871` | `item.path?.toLowerCase().startsWith('/sitecore/layout/renderings') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaService.js:149` | `path: { $in: [branding.PATHS.MEDIA, '/sitecore/media library'] },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaService.js:153` | `// Đảm bảo node cha /root hoặc /sitecore tồn tại nếu có thể` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/mediaService.js:155` | `path: { $in: [branding.PATHS.ROOT, '/sitecore'] },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:40` | `let rootItem = await Item.findOne({ path: { $in: [branding.PATHS.MEDIA, '/siteco` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:43` | `let rootNode = await Item.findOne({ path: { $in: [branding.PATHS.ROOT, '/sitecor` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:156` | `.replace('/sitecore/media library', '')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:163` | `let currentPath = '/sitecore/media library';` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:277` | `path: { $regex: '^/sitecore/media library/' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:338` | `// 1. Quét tất cả folder thuộc /sitecore/media library để đảm bảo tồn tại trên C` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/mediaSyncService.js:341` | `path: { $regex: '^/sitecore/media library' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:347` | `if (f.path === '/sitecore/media library') continue;` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/mediaSyncService.js:369` | `path: { $regex: '^/sitecore/media library/' },` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:94` | `const layoutRegex = new RegExp(`^(${branding.PATHS.LAYOUTS}\|/sitecore/layout/La` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:128` | `const placeholderRegex = new RegExp(`^(${branding.PATHS.PLACEHOLDERS}\|/sitecore` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:169` | `const legacyPrefix = '/sitecore/layout/renderings/';` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:191` | `const renderingRegex = new RegExp(`^(${branding.PATHS.RENDERINGS}\|/sitecore/lay` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:549` | `if (!layoutItem.path.toLowerCase().startsWith(layoutsPathLower) && !layoutItem.p` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:568` | `if (!renderingItem.path.toLowerCase().startsWith(renderingsPathLower) && !render` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/presentationService.js:663` | `// Đồng bộ sang Template document nếu item là một Template (nằm dưới /sitecore/t` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/presentationService.js:667` | `const isTemplatePath = item.path && (item.path.toLowerCase().startsWith(template` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteRenderer.js:122` | `// 3. Resolve Navigation Items (Child pages of Home or /sitecore/content)` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteRenderer.js:304` | `homeNode = (await itemService.getByPath(branding.PATHS.HOME)) \|\| (await itemSe` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteRenderer.js:306` | `homeNode = (await webItemService.getByPath(branding.PATHS.HOME)) \|\| (await web` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:73` | `if (this.startItemPath !== '/sitecore/content/Home') {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:74` | `candidatePaths.push('/sitecore/content/Home');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:90` | `// Backward compatibility fallback for /sitecore/content` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteResolver.js:91` | ``/sitecore/content/${joinedSegments}`,` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:92` | ``/sitecore/content/${spacedSegments}`,` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:93` | ``/sitecore/content/Home/${joinedSegments}`,` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:94` | ``/sitecore/content/Home/${spacedSegments}`,` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:110` | `// Fallback: Segment-by-segment hierarchical tree traversal starting from /root/` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteResolver.js:128` | `lowerPath.startsWith('/sitecore/media library') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:129` | `lowerPath.startsWith('/sitecore/templates') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:130` | `lowerPath.startsWith('/sitecore/system') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:131` | `lowerPath.startsWith('/sitecore/layout')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:163` | `// Start node: Content root (/sitecore/content) or Start Item (/sitecore/content` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteResolver.js:172` | `path: { $regex: new RegExp(`^(${contentRootEscaped}\|/sitecore/content)$`, 'i') ` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/siteResolver.js:202` | `* Verify all ancestors up to /sitecore/content are published in Web Store` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteResolver.js:217` | `// Stop once we reach /sitecore/content or root` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/siteResolver.js:218` | `if (parent.path === '/sitecore/content' \|\| parent.path === '/sitecore' \|\| !p` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:275` | `if (p === branding.PATHS.DEVICES.toLowerCase() \|\| p === '/sitecore/layout/devi` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:278` | `if (p === branding.PATHS.PLACEHOLDER_SETTINGS.toLowerCase() \|\| p === '/sitecor` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:310` | `p === '/sitecore/templates/feature/components' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:311` | `p.startsWith('/sitecore/templates/feature/components/') \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:312` | `p === '/sitecore/templates/project/pages' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:313` | `p.startsWith('/sitecore/templates/project/pages/');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:347` | `item.path.toLowerCase() === '/sitecore/content' \|\|` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:348` | `item.path.toLowerCase().startsWith('/sitecore/content/')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:356` | `if (item && item.path && (item.path.toLowerCase() === contentLower \|\| item.pat` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:398` | `const allowedPathRegex = `^(${branding.PATHS.TEMPLATES}\|/sitecore/templates)/(p` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:409` | `// 2. Search via Item tree under /sitecore/templates/(project/pages\|common)` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/templateService.js:468` | `* Get all page templates located under /sitecore/templates/Project/Pages (recurs` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/templateService.js:1062` | `!tpl.path.toLowerCase().startsWith('/sitecore/templates/feature/components')) {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/templateService.js:1076` | `{ path: { $regex: `^(${featureComponentsPath}\|/sitecore/templates/Feature/Compo` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/userService.js:90` | `const { username, email, fullName, displayName, domain = 'sitecore', password, r` | Văn bản giao diện | Đổi sang Treecraft / PROJECT_NAME |
| `src/services/userService.js:136` | `domain: (domain \|\| 'sitecore').trim().toLowerCase(),` | Văn bản giao diện | Đổi sang Treecraft / PROJECT_NAME |
| `src/services/webItemService.js:33` | `* Get a published item by its materialized path (e.g. '/root/content/home' or le` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/services/webItemService.js:48` | `if (cleanPath.toLowerCase().startsWith('/sitecore')) {` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/webItemService.js:49` | `altPath = branding.PATHS.ROOT + cleanPath.slice('/sitecore'.length);` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/services/webItemService.js:51` | `altPath = '/sitecore' + cleanPath.slice(branding.PATHS.ROOT.length);` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/styles/admin/main.css:26` | `/* Sitecore Interactive System States */` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/styles/admin/main.css:308` | `/* Sitecore Section Bar & Quick Info Component (DEC-037 / GĐ 6.3) */` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/styles/tokens/sitecore-tokens.js:2` | `* Sitecore Design Tokens` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/utils/mediaPathMapper.js:6` | `const LEGACY_ROOT_MEDIA_PATH = '/sitecore/media library';` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/utils/mediaPathMapper.js:56` | `* @param {string} params.itemPath - Ví dụ '/sitecore/media library/Banners/Hero/` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/utils/mediaPathMapper.js:67` | `// Chuẩn hóa đường dẫn tương đối dưới /root/media library (hỗ trợ backward compa` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/views/content-editor/folder-view.ejs:15` | `const isMediaFolder = (item.path && (item.path.startsWith('/root/media library')` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/views/content-editor/index.ejs:2` | `&lt;!-- 1. Sitecore Data-driven Ribbon Toolbar --&gt;` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/views/content-editor/item-form.ejs:269` | `&lt;% const publicSlug=(item.path==='/root/content/Home' \|\| item.path==='/site` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/views/content-editor/item-form.ejs:465` | `field.source==='/sitecore/templates/Feature/Components' ) { %&gt;` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `src/views/partials/quick-info.ejs:23` | `&lt;!-- Section Bar Header (Sitecore Style with CSS & Test Compliant) --&gt;` | Comment | Viết lại trung tính hoặc xóa nếu thừa |
| `src/views/site/partials/head.ejs:7` | `&lt;link rel="canonical" href="&lt;%= site.host ? 'http://' + site.host + (item ` | Văn bản giao diện | Đổi sang Treecraft / PROJECT_NAME |
| `src/views/site/partials/header.ejs:12` | `&lt;a href="/" class="hover:text-white transition-colors &lt;%= (item && (item.p` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `tailwind.admin.config.js:2` | `const tokens = require('./src/styles/tokens/sitecore-tokens');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `tailwind.site.config.js:2` | `const tokens = require('./src/styles/tokens/sitecore-tokens');` | Path | Đổi sang branding.PATHS.* hoặc alias tương thích |
| `tests/aclService.test.js:39` | `path: '/sitecore/templates/sample',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:44` | `adminRole = await Role.create({ name: 'Administrator', domain: 'sitecore', isSys` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:45` | `editorRole = await Role.create({ name: 'Editor', domain: 'sitecore', isSystem: t` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:46` | `authorRole = await Role.create({ name: 'Author', domain: 'sitecore', isSystem: t` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:49` | `domain: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:56` | `email: 'admin@sitecore.test',` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:66` | `email: 'jane@sitecore.test',` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:76` | `email: 'bob@sitecore.test',` | Test-fixture | Đổi sang Treecraft |
| `tests/aclService.test.js:97` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:106` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:115` | `path: '/sitecore/content/home/news-1',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:136` | `// Parent (/sitecore/content/home) has DENY write for Editor role (scope: both)` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:146` | `// Child (/sitecore/content/home/news-1) has explicit ALLOW write for Editor rol` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/aclService.test.js:256` | `email: 'sub@sitecore.test',` | Test-fixture | Đổi sang Treecraft |
| `tests/auth.test.js:36` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/auth.test.js:47` | `email: 'author@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/brandingAudit.test.js:42` | `expect(value.toLowerCase()).not.toContain('sitecore');` | Test-fixture | Đổi sang Treecraft |
| `tests/contentEditorApi.test.js:48` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/contentInsertOptions.test.js:42` | `path: '/sitecore/templates/Common/Folder',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:51` | `path: '/sitecore/templates/System/SystemSetting',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:59` | `path: '/sitecore/templates/Feature/Components/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:67` | `path: '/sitecore/templates/Project/Pages/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:76` | `path: '/sitecore/templates/Project/Pages/AboutUs',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:88` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:95` | `describe('1. Insert options resolution on /sitecore/content', () =&gt; {` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:108` | `// Create nested template: /sitecore/templates/Project/Pages/Blog/Article` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:113` | `path: '/sitecore/templates/Project/Pages/Blog/Article',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:131` | `path: '/sitecore/templates/Common/ContentFolder',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:147` | `{ path: { $regex: '^/sitecore/templates/Project/Pages', $options: 'i' } },` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:148` | `{ path: { $regex: '^/sitecore/templates/Common', $options: 'i' } },` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:157` | `describe('2. Insert options resolution for child items under /sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:165` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:191` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:203` | `describe('3. Validation during item creation under /sitecore/content', () =&gt; ` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:208` | `expect(newItem.path).toBe('/sitecore/content/landing-page');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:215` | `expect(newFolder.path).toBe('/sitecore/content/news');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:240` | `path: '/sitecore/templates/Common',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:251` | `path: '/sitecore/templates/Project',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:260` | `path: '/sitecore/templates/Common/CustomTpl',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:271` | `path: '/sitecore/templates/Common/CustomTpl',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:280` | `expect(updatedTpl.path).toBe('/sitecore/templates/Project/CustomTpl');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:294` | `// Create item for folderTpl in /sitecore/templates/Common/Folder` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:300` | `path: '/sitecore/templates/Common/Folder',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/contentInsertOptions.test.js:310` | `expect(updatedFolder.path).toBe('/sitecore/templates/Common/Folder');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:62` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/databaseSwitcher.test.js:73` | `email: 'editor@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/databaseSwitcher.test.js:103` | `// Master Tree: /sitecore -&gt; /sitecore/content -&gt; publishedPage & unpublis` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:105` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/databaseSwitcher.test.js:106` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/databaseSwitcher.test.js:107` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:118` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:129` | `path: '/sitecore/content/published-page',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:151` | `path: '/sitecore/content/draft-page',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:169` | `// Web Tree (items_web): only /sitecore, /sitecore/content, publishedPage, and o` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/databaseSwitcher.test.js:215` | `path: '/sitecore/content/orphan-page',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:51` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/effectiveTemplate.test.js:52` | `displayName: 'Sitecore Root',` | Test-fixture | Đổi sang Treecraft |
| `tests/effectiveTemplate.test.js:54` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:65` | `path: '/sitecore/layout/layouts',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:76` | `path: '/sitecore/layout/renderings',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:87` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:122` | `path: '/sitecore/layout/layouts/mainlayout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:133` | `path: '/sitecore/templates/Feature/Components/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:154` | `path: '/sitecore/templates/Feature/Components/Introduction',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:172` | `path: '/sitecore/layout/renderings/herobanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:189` | `path: '/sitecore/layout/renderings/introduction',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:206` | `path: '/sitecore/templates/Project/Pages/HomePage',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/effectiveTemplate.test.js:246` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:81` | `expect(isFolderItem({ path: '/sitecore/templates' }, null)).toBe(true);` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:82` | `expect(isFolderItem({ path: '/sitecore/templates/Feature' }, null)).toBe(true);` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:83` | `expect(isFolderItem({ path: '/sitecore/layout/Layouts' }, null)).toBe(true);` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:84` | `expect(isFolderItem({ path: '/sitecore/layout/Renderings' }, null)).toBe(true);` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:85` | `expect(isFolderItem({ path: '/sitecore/layout/Placeholders' }, null)).toBe(true)` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:88` | `test('/sitecore/content is NOT a regular folder (it is content-root)', () =&gt; ` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:89` | `expect(isFolderItem({ path: '/sitecore/content' }, null)).toBe(false);` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:94` | `test('node /sitecore/content resolves to content-root', () =&gt; {` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:95` | `const item = { path: '/sitecore/content', name: 'content' };` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:100` | `const folderItem = { path: '/sitecore/templates/Project', name: 'Project' };` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:108` | `const item = { path: '/sitecore/layout/Layouts/HomeLayout', name: 'HomeLayout' }` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:114` | `const item = { path: '/sitecore/layout/Placeholders/maincontent', name: 'maincon` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:120` | `const item = { path: '/sitecore/layout/Renderings/HeroBanner', name: 'HeroBanner` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:126` | `const item = { path: '/sitecore/templates/Feature/Components/HeroBanner', name: ` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:132` | `const item = { path: '/sitecore/templates/System/Standard Template', name: 'Stan` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:137` | `test('Page item under /sitecore/content resolves to page', () =&gt; {` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:138` | `const item = { path: '/sitecore/content/Home', name: 'Home' };` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:144` | `const customItem = { path: '/sitecore/content/Special', icon: 'ti ti-star' };` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:149` | `const itemWithBadIcon = { path: '/sitecore/layout/Layouts/Custom', icon: 'invali` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:188` | `path: '/sitecore/templates/Feature',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:200` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemIcons.test.js:212` | `path: '/sitecore/layout/Renderings/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:60` | `// Seed tree: /sitecore -&gt; /sitecore/content -&gt; /sitecore/content/home` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:62` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/itemService.test.js:63` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/itemService.test.js:67` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:77` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:87` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:107` | `expect(newItem.path).toBe('/sitecore/content/home/about-us');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:171` | `expect(subItem.path).toBe('/sitecore/content/home/sub-page');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:175` | `expect(renamedHome.path).toBe('/sitecore/content/homepage');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:179` | `expect(updatedSub.path).toBe('/sitecore/content/homepage/sub-page');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:187` | `expect(copy1.path).toBe('/sitecore/content/copy-of-home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:197` | `expect(copyChildren[0].path).toBe('/sitecore/content/copy-of-home/sub-one');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/itemService.test.js:218` | `expect(movedHome.path).toBe('/sitecore/folder-two/home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/mediaApi.test.js:95` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/mediaApi.test.js:105` | `email: 'author@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/mediaPathMapper.test.js:52` | `test('supports legacy /sitecore/media library path in itemPathToCloudinary', () ` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/mediaPathMapper.test.js:54` | `itemPath: '/sitecore/media library/Banners/Hero/summer-sale',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/mediaService.test.js:385` | `path: '/sitecore/content/home-page',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/presentationApi.test.js:33` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/presentationApi.test.js:52` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/presentationApi.test.js:53` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/presentationApi.test.js:57` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/presentationApi.test.js:86` | `path: '/sitecore/product-page',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/presentationLayoutTree.test.js:38` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/presentationLayoutTree.test.js:46` | `email: 'author@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/presentationLayoutTree.test.js:54` | `email: 'dev@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/presentationService.test.js:43` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/presentationService.test.js:44` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/presentationService.test.js:48` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/presentationService.test.js:100` | `path: '/sitecore/test-article',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:63` | `path: '/sitecore/layout/layouts/main-layout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:71` | `path: '/sitecore/layout/renderings/hero-component',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:79` | `path: '/sitecore/content/data/hero-data',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:87` | `path: '/sitecore/content/home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:141` | `expect(webDoc.path).toBe('/sitecore/content/home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/publishService.test.js:205` | `const byPath = await webItemService.getByPath('/sitecore/content/home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/richTextHelper.test.js:22` | `path: '/sitecore/media library/banner.png',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/richTextHelper.test.js:40` | `path: '/sitecore/content/home/about-us'` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:46` | `path: '/sitecore/templates/System/Template Folder',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:55` | `path: '/sitecore/templates/System/Template',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:65` | `path: '/sitecore/templates/System/Standard Template',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:73` | `path: '/sitecore/templates/Feature/Components/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:81` | `path: '/sitecore/templates/Project/Pages/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:89` | `path: '/sitecore/templates/System/Layout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:94` | `const sitecoreRoot = await Item.create({` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:95` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:96` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:100` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:109` | `parentId: sitecoreRoot._id,` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:110` | `ancestors: [sitecoreRoot._id],` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:111` | `path: '/sitecore/templates',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:121` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:122` | `path: '/sitecore/templates/System',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:135` | `path: '/sitecore/templates/System/Standard Template',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:145` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:146` | `path: '/sitecore/templates/Feature',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:157` | `path: '/sitecore/templates/Feature/Components',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:167` | `ancestors: [sitecoreRoot._id, templatesRoot._id],` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:168` | `path: '/sitecore/templates/Project',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:179` | `path: '/sitecore/templates/Project/Pages',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:188` | `parentId: sitecoreRoot._id,` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:189` | `ancestors: [sitecoreRoot._id],` | Test-fixture | Đổi sang Treecraft |
| `tests/sampleComponentInsert.test.js:190` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sampleComponentInsert.test.js:269` | `expect(newCompItem.path).toBe('/sitecore/templates/Feature/Components/promocard'` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:28` | `path: '/sitecore/layout/Layouts/HomeLayout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:37` | `path: '/sitecore/layout/Layouts/HomeLayout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:48` | `path: '/sitecore/layout/Renderings/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:57` | `path: '/sitecore/layout/Renderings/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:68` | `path: '/sitecore/layout/Renderings/Introduction',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:77` | `path: '/sitecore/layout/Renderings/Introduction',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:84` | `const sitecore = await PublishedItem.create({` | Test-fixture | Đổi sang Treecraft |
| `tests/sitePublicRoutes.test.js:86` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/sitePublicRoutes.test.js:88` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:97` | `parentId: sitecore._id,` | Test-fixture | Đổi sang Treecraft |
| `tests/sitePublicRoutes.test.js:98` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:109` | `path: '/sitecore/content/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:149` | `path: '/sitecore/content/About us',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:180` | `path: '/sitecore/content/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/sitePublicRoutes.test.js:221` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/siteRenderer.test.js:28` | `path: '/sitecore/templates/Project/Pages/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteRenderer.test.js:38` | `path: '/sitecore/layout/Layouts/HomeLayout',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteRenderer.test.js:49` | `path: '/sitecore/layout/Renderings/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteRenderer.test.js:59` | `path: '/sitecore/layout/Renderings/Introduction',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteRenderer.test.js:70` | `path: '/sitecore/content/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteRenderer.test.js:110` | `path: '/sitecore/content/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:19` | `const sitecoreNode = await PublishedItem.create({` | Test-fixture | Đổi sang Treecraft |
| `tests/siteResolver.test.js:21` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/siteResolver.test.js:22` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/siteResolver.test.js:24` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:34` | `parentId: sitecoreNode._id,` | Test-fixture | Đổi sang Treecraft |
| `tests/siteResolver.test.js:35` | `path: '/sitecore/content',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:46` | `path: '/sitecore/content/Home',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:59` | `path: '/sitecore/content/About us',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:72` | `path: '/sitecore/content/About us/Team',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:83` | `parentId: sitecoreNode._id,` | Test-fixture | Đổi sang Treecraft |
| `tests/siteResolver.test.js:84` | `path: '/sitecore/media library/banner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:94` | `it('should resolve root "/" to Start Item (/sitecore/content/Home) with default ` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:97` | `expect(res.item.path).toBe('/sitecore/content/Home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:103` | `expect(res.item.path).toBe('/sitecore/content/Home');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:108` | `it('should resolve kebab-case segment "/about-us" to "/sitecore/content/About us` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:110` | `expect(res.item.path).toBe('/sitecore/content/About us');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:116` | `expect(res.item.path).toBe('/sitecore/content/About us/Team');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:122` | `expect(res.item.path).toBe('/sitecore/content/About us');` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/siteResolver.test.js:142` | `await expect(siteResolver.resolve('/sitecore/media library/banner')).rejects.toT` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateInContentTree.test.js:115` | `// 1. Path Resolution & Aliasing (/template -&gt; /sitecore/templates)` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateManagerApi.test.js:50` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/templateManagerApi.test.js:107` | `name: 'sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/templateManagerApi.test.js:108` | `displayName: 'Sitecore',` | Test-fixture | Đổi sang Treecraft |
| `tests/templateManagerApi.test.js:112` | `path: '/sitecore',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateManagerApi.test.js:122` | `path: '/sitecore/first-article',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateService.test.js:196` | `path: '/sitecore/sample-article',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateService.test.js:225` | `path: '/sitecore/annual-event',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/templateService.test.js:262` | `path: '/sitecore/layout/Renderings/Feature/HeroBanner',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
| `tests/versionApi.test.js:34` | `email: 'admin@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/versionApi.test.js:44` | `email: 'author@sitecore.local',` | Test-fixture | Đổi sang @treecraft.local |
| `tests/workflowService.test.js:78` | `path: '/sitecore/content/test-article',` | Test-fixture | Đổi sang branding.ROOT_PATH hoặc /root/... |
