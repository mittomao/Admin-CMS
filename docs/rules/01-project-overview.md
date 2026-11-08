# Tổng quan Dự án & Phạm vi Hệ thống
> File: `docs/rules/01-project-overview.md`  
> Mô tả: Mục tiêu cốt lõi, triết lý Treecraft, phân định Master vs Web, phạm vi In-Scope / Out-of-Scope và kiến trúc Server-Side EJS.

---

## 1. Mục tiêu Dự án
Xây dựng một hệ thống CMS (Content Management System) quản trị nội dung dạng cây phân cấp (Hierarchical Content Tree) chuyên nghiệp, kế thừa các triết lý cốt lõi của **Treecraft Experience Management (XM)**:

1. **Triết lý "Mọi thứ là Item" (Everything is an Item):**
   - Không chỉ bài viết/trang web, mà cả Template (schema định nghĩa cấu trúc), Media Library (tài sản số), Workflow (quy trình duyệt), Presentation (Layout, Rendering, Placeholder dưới nhánh `/root/layout`), và System Configuration đều được lưu trữ và quản lý dưới dạng các node (Item) trong cây nội dung.
2. **Tách biệt Môi trường Biên tập và Phân phối (Master vs. Web):**
   - **Master Database/Collection (`items_master`):** Lưu trữ toàn bộ các phiên bản dự thảo (Drafts), lịch sử phiên bản (Version History), các cấu hình Presentation (Shared & Final Layouts), các trạng thái workflow chưa duyệt.
   - **Web Database/Collection (`items_web`):** Chỉ chứa phiên bản đã được xuất bản (Published & Active) cùng cấu hình Presentation hoàn chỉnh đã resolved sẵn sàng phục vụ cho Site Renderer công khai với hiệu năng cao và độ trễ thấp nhất.
3. **Giao diện quản trị theo chuẩn Treecraft:**
   - **Launchpad (Dashboard):** Màn hình ứng dụng dạng ô lưới (Tiles) phân nhóm chuyên môn (Marketing, Content Editing, Control Panel, Access Management...), phân quyền hiển thị theo Role người dùng.
   - **Content Editor:** Giao diện 3 phân vùng tiêu chuẩn: Ribbon tabs điều hướng trên cùng (Home, Navigate, Review, Publish, Versions, Configure, Presentation...), Cây nội dung (Content Tree) lazy-loading bên trái kèm ô tìm kiếm nhanh, Vùng soạn thảo form theo Section/Field ở giữa, và Taskbar chuyển nhanh ứng dụng dưới đáy màn hình.

---

## 2. Kiến trúc Nguyên khối Tích hợp (100% Server-Side EJS)
- **Chung một ứng dụng Express.js (Monolithic Architecture):**
  - Website public và Admin CMS chạy **chung một tiến trình Express.js duy nhất** tại cổng 4000.
  - Phân vùng quản trị đặt tại tiền tố `/admin` (được bảo vệ bằng cơ chế xác thực và phân quyền).
  - Website công khai phục vụ trực tiếp tại root `/`.
- **Render hoàn toàn phía máy chủ (Server-Side Rendering - SSR):**
  - Website public được render 100% bằng **EJS phía server** (không SPA, không hydration).
  - **Loại bỏ hoàn toàn React:** Dự án không sử dụng React, Next.js, Headless Layout Service JSON RESTful, API Key, hay cấu hình CORS cho ứng dụng bên ngoài. Toàn bộ trải nghiệm người dùng cuối được xây dựng bằng HTML ngữ nghĩa, CSS và JavaScript nhẹ nhàng.
- **Cơ chế Site Renderer:**
  - Route công khai phân giải URL $\rightarrow$ Page Item (đọc từ database `items_web` sau khi publish) $\rightarrow$ Lấy cấu hình Presentation $\rightarrow$ Render file EJS Layout thông qua thuộc tính `viewPath` $\rightarrow$ Sử dụng helper `<%- placeholder(key) %>` để nạp và render tuần tự các file EJS Rendering tương ứng.

---

## 3. Phạm vi Dự án (In-Scope)
- **Quản trị phân cấp cây nội dung:** Cấu trúc Materialized Path + Ancestors Array với độ sâu không giới hạn.
- **Cơ chế Template linh hoạt:** Section, Field Types (Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist), Base Template (kế thừa), Standard Values (giá trị mặc định), Insert Options (ràng buộc loại item con được tạo).
- **Đa ngôn ngữ & Đa phiên bản:** Item Versioning, so sánh (diff) và khôi phục (rollback), phân định các trường Shared, Unversioned, và Versioned.
- **Thư viện tài nguyên số (Media Library):** Quản lý thư mục, upload ảnh/file, resize thumbnail tự động qua Sharp, Media Picker modal tích hợp form và presentation.
- **Kiến trúc Presentation EJS:**
  - Nhánh `/root/layout` có đúng 3 thư mục con: `Layouts`, `Placeholders`, `Renderings`.
  - Quản lý tệp giao diện qua thuộc tính `viewPath` (trỏ tới `src/views/site/`).
  - Placeholder là Item trực tiếp (`placeholderKey`, `allowedRenderings[]`).
  - Standard Presentation trên Page Template; kế thừa Component Template làm Base Template.
  - Phân định Shared vs Final Layout; giao diện Presentation Details trực quan với SortableJS.
- **Phân quyền chi tiết (ACL):** Theo từng Item với cơ chế kế thừa phân cấp từ cha xuống con, hỗ trợ quyền ghi đè (Allow, Deny, Inherit) và Access Viewer.
- **Workflow & Publishing:** Quy trình phê duyệt (Draft -> In Review -> Approved), ứng dụng Workbox, và Publishing Engine đồng bộ toàn diện từ Master sang Web (bao gồm Page, Layout, Placeholder, Rendering, Component Template và Media).
- **Thùng rác & Audit Log:** Cơ chế soft-delete, khôi phục item về vị trí cũ, và Audit Log ghi nhận toàn bộ biến động dữ liệu.
- **Site Renderer (GĐ 10):** Bộ engine dựng trang công khai thuần EJS, phân giải URL (`/`, `/:slug`), helper `placeholder(key)`, cache HTML, 404 trang chưa publish, SEO meta tags cơ bản.
- **Mở rộng:** Form Builder kéo thả, Serialization (Export/Import JSON), Full-text search, Control Panel.

---

## 4. Ngoài Phạm vi Dự án (Out-of-Scope)
- **React, Next.js, Headless SPA Frontend:** Không hỗ trợ React hoặc các framework frontend bên ngoài; website công khai render hoàn toàn bằng server-side EJS.
- **Layout Service JSON RESTful & External API Key:** Không phát triển API JSON cung cấp layout cho bên ngoài; không cần cấu hình CORS cho client độc lập.
- **xDB, CDP, Real-time Personalization:** Không xây dựng hệ thống thu thập hành vi phức tạp; tập trung 100% vào năng lực lõi Treecraft (Experience Management).
- **WYSIWYG Experience Editor in-line:** Giai đoạn MVP không làm tính năng soạn thảo trực tiếp trên trang live frontend trong Admin.
- **Multi-tenant / Multi-site:** Tập trung tối ưu cấu trúc Single-tenant / Multi-tree root trước.

