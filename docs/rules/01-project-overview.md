# Tổng quan Dự án & Phạm vi Hệ thống
> File: `docs/rules/01-project-overview.md`  
> Mô tả: Mục tiêu cốt lõi, triết lý Sitecore XM, phân định Master vs Web, phạm vi In-Scope / Out-of-Scope và bối cảnh Headless React.

---

## 1. Mục tiêu Dự án
Xây dựng một hệ thống CMS (Content Management System) quản trị nội dung dạng cây phân cấp (Hierarchical Content Tree) chuyên nghiệp, kế thừa các triết lý cốt lõi của **Sitecore Experience Management (XM)**:

1. **Triết lý "Mọi thứ là Item" (Everything is an Item):**
   - Không chỉ bài viết/trang web, mà cả Template (schema định nghĩa cấu trúc), Media Library (tài sản số), Workflow (quy trình duyệt), Presentation (Layout, Rendering, Device, Placeholder Settings dưới nhánh `/sitecore/layout`), và System Configuration đều được lưu trữ và quản lý dưới dạng các node (Item) trong cây nội dung.
2. **Tách biệt Môi trường Biên tập và Phân phối (Master vs. Web):**
   - **Master Database/Collection (`items_master`):** Lưu trữ toàn bộ các phiên bản dự thảo (Drafts), lịch sử phiên bản (Version History), các cấu hình Presentation (Shared & Final Layouts), các trạng thái workflow chưa duyệt.
   - **Web Database/Collection (`items_web`):** Chỉ chứa phiên bản đã được xuất bản (Published & Active) cùng cấu hình Presentation hoàn chỉnh đã resolved sẵn sàng phục vụ cho Delivery API và Layout Service với hiệu năng cao và độ trễ thấp nhất.
3. **Giao diện quản trị phong cách Sitecore:**
   - **Launchpad (Dashboard):** Màn hình ứng dụng dạng ô lưới (Tiles) phân nhóm chuyên môn (Marketing, Content Editing, Control Panel, Access Management...), phân quyền hiển thị theo Role người dùng.
   - **Content Editor:** Giao diện 3 phân vùng tiêu chuẩn: Ribbon tabs điều hướng trên cùng (Home, Navigate, Review, Publish, Versions, Configure, Presentation...), Cây nội dung (Content Tree) lazy-loading bên trái kèm ô tìm kiếm nhanh, Vùng soạn thảo form theo Section/Field ở giữa, và Taskbar chuyển nhanh ứng dụng dưới đáy màn hình.

---

## 2. Bối cảnh Kiến trúc Headless (React Frontend)
- **Kiến trúc Headless:** CMS hoạt động như một Backend quản trị nội dung thuần túy. Frontend hiển thị người dùng cuối là một ứng dụng độc lập viết bằng **React/Next.js** (tương tự mô hình Sitecore JSS).
- **Phân tách trách nhiệm:**
  - **Admin EJS:** Chỉ lưu trữ và biên tập **dữ liệu cấu hình** (Layout, Rendering, Placeholder, Datasource, Parameters) và trả JSON qua Headless Layout Service. Admin **không** render React component và **không** làm WYSIWYG live editor trong MVP.
  - **React Frontend:** Đọc cấu hình JSON từ Layout Service và tự ánh xạ `componentName` sang React component thực tế tương ứng để render ra HTML phía client hoặc SSR.

---

## 3. Phạm vi Dự án (In-Scope)
- **Quản trị phân cấp cây nội dung:** Cấu trúc Materialized Path + Ancestors Array với độ sâu không giới hạn.
- **Cơ chế Template linh hoạt:** Section, Field Types (Single-Line Text, Multi-Line Text, Rich Text, Image, Droplist, Checkbox, Date, Number, Multilist), Base Template (kế thừa), Standard Values (giá trị mặc định), Insert Options (ràng buộc loại item con được tạo).
- **Đa ngôn ngữ & Đa phiên bản:** Item Versioning, so sánh (diff) và khôi phục (rollback), phân định các trường Shared, Unversioned, và Versioned.
- **Thư viện tài nguyên số (Media Library):** Quản lý thư mục, upload ảnh/file, resize thumbnail tự động qua Sharp, Media Picker modal tích hợp form và presentation.
- **Kiến trúc Headless Presentation:** Quản lý Devices (`Default`, `Mobile`), Layouts, Renderings, Placeholder Settings (`column-{*}`), cấu hình Presentation Details bằng SortableJS, Standard Presentation kế thừa Template, phân định Shared vs Final Layout, JSON Layout Preview.
- **Phân quyền chi tiết (ACL):** Theo từng Item với cơ chế kế thừa phân cấp từ cha xuống con, hỗ trợ quyền ghi đè (Allow, Deny, Inherit) và Access Viewer.
- **Workflow & Publishing:** Quy trình phê duyệt (Draft -> In Review -> Approved), ứng dụng Workbox, và Publishing Engine đồng bộ Master sang Web (bao gồm Item và Presentation).
- **Thùng rác & Audit Log:** Cơ chế soft-delete, khôi phục item về vị trí cũ, và Audit Log ghi nhận toàn bộ biến động dữ liệu.
- **Headless Delivery API & Layout Service:** RESTful JSON API cung cấp dữ liệu và layout đã publish cho React frontend.
- **Mở rộng:** Form Builder kéo thả, Serialization (Export/Import JSON), Full-text search, Control Panel.

---

## 4. Ngoài Phạm vi Dự án (Out-of-Scope)
- **xDB, CDP, Real-time Personalization:** Không xây dựng hệ thống thu thập hành vi phức tạp của Sitecore XP; tập trung 100% vào năng lực lõi Sitecore XM (Experience Management).
- **WYSIWYG Experience Editor in-line:** Giai đoạn MVP không làm tính năng soạn thảo trực tiếp trên trang live frontend trong Admin; một bản rút gọn xem trước trong iframe có thể được cân nhắc ở GĐ 11 với mức ưu tiên thấp.
- **Multi-tenant / Multi-site:** Tập trung tối ưu cấu trúc Single-tenant / Multi-tree root trước.

