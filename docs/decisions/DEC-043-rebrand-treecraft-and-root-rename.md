# DEC-043: Đổi tên dự án sang "Treecraft", đổi Root Item sang "/root" và Kiến trúc Hằng số hóa Thương hiệu

## 1. Bối cảnh & Vấn đề (Context & Problem)
Hệ thống CMS hiện tại được xây dựng mô phỏng triết lý kiến trúc của **Treecraft Experience Management (XM)**: "Mọi thứ là Item" và tách biệt Master/Web. Trong suốt các giai đoạn từ 0 đến 10, dự án sử dụng các định danh gắn liền với Sitecore:
- **Tên dự án / Thương hiệu:** `Treecraft Experience Management`, `Treecraft CMS`, `admin-cms`.
- **Gốc cây dữ liệu (Root Node):** `/root`, với các nhánh con: `/root/content`, `/root/layout`, `/root/templates`, `/root/media library`, `/root/system`.
- **Domain mặc định:** `treecraft\admin`.

Để độc lập hóa sản phẩm thành một nền tảng CMS riêng biệt mang thương hiệu riêng, dự án cần đổi tên thành **Treecraft**, đồng thời đổi gốc cây phân cấp từ `/root` thành `/root`.

---

## 2. Các Quyết định Kiến trúc Đã chốt (Architecture Decisions)

### 2.1. Tên Thương hiệu Sản phẩm: `Treecraft`
- Tên chính thức của CMS là **Treecraft** (hoặc **Treecraft CMS**).
- Tên này được áp dụng nhất quán trên:
  - Topbar header: Logo `Treecraft` thay cho `Sitecore`.
  - Thẻ `<title>` trình duyệt: `... - Treecraft CMS`.
  - Trang đăng nhập: `Treecraft Content Management System`.
  - File cấu hình gói: `package.json` (`name: "treecraft"`, `description: "Treecraft - Hierarchical XM Content Management System"`).
  - Tên cookie session: `treecraft_session_id` (thay cho `cms_session_id`).
  - Tiền tố logger: `[Treecraft]` trong các log hệ thống.
  - README và tài liệu kỹ thuật mới.

### 2.2. Gốc Cây Dữ liệu (Root Node): `/root`
- Gốc phân cấp của toàn bộ cây Item đổi từ `/root` thành `/root`.
- Cấu trúc cây 5 nhánh tiêu chuẩn:
  - `/root/content`: Nhánh chứa các trang nội dung (`/root/content/Home`, `/root/content/about-us`...).
  - `/root/layout`: Cây 3 nhánh Presentation EJS (`/root/layout/Layouts`, `/root/layout/Placeholders`, `/root/layout/Renderings`).
  - `/root/templates`: Cây khuôn mẫu (`/root/templates/Feature/Components`, `/root/templates/Project/Pages`, `/root/templates/System`, `/root/templates/Common`).
  - `/root/media library`: Cây tài nguyên số.
  - `/root/system`: Cây cấu hình hệ thống, workflow, languages, settings.
- **Bảo toàn ID Item gốc:** Item gốc giữ nguyên `_id: ObjectId("6ae95cc6b1e541e051fd4162")` trên cả hai cơ sở dữ liệu `items_master` và `items_web`. Chỉ cập nhật `name: "root"`, `displayName: "root"`, `path: "/root"`.

### 2.3. Tách biệt Hoàn toàn giữa Tên Thương hiệu và Cấu trúc Dữ liệu
- **Nguyên tắc cốt lõi:** Tên thương hiệu (`Treecraft`) **không bao giờ** xuất hiện trong đường dẫn cây dữ liệu (`path`).
- Nhờ tách biệt này, trong tương lai nếu sản phẩm có đổi thương hiệu hoặc triển khai cho khách hàng whitelabel, hệ thống **hoàn toàn không cần chạy database migration** để đổi path dữ liệu.

### 2.4. Hằng số hóa Tập trung (`src/config/branding.js`)
- Tạo một module cấu hình duy nhất `src/config/branding.js` chứa toàn bộ các hằng số thương hiệu và đường dẫn hệ thống:
  ```javascript
  const ROOT_NAME = 'root';
  const ROOT_PATH = `/${ROOT_NAME}`;

  module.exports = {
    PROJECT_NAME: 'Treecraft',
    PROJECT_TITLE: 'Treecraft CMS',
    ROOT_NAME,
    ROOT_PATH,
    DEFAULT_DOMAIN: 'treecraft',
    SESSION_COOKIE_NAME: 'treecraft_session_id',
    PATHS: {
      ROOT: ROOT_PATH,
      CONTENT: `${ROOT_PATH}/content`,
      LAYOUT: `${ROOT_PATH}/layout`,
      TEMPLATES: `${ROOT_PATH}/templates`,
      MEDIA: `${ROOT_PATH}/media library`,
      SYSTEM: `${ROOT_PATH}/system`,
      START_ITEM: `${ROOT_PATH}/content/Home`,
    },
  };
  ```
- **Kỷ luật:** Cấm tuyệt đối việc hard-code chuỗi `/root`, `/root`, hoặc `Treecraft` rải rác trong `src/services/`, `src/controllers/`, `src/models/` ngoài module `branding.js` này.

### 2.5. Xử lý Thư mục Cloudinary & Media Library
- **Giữ nguyên thư mục gốc Cloudinary:** Thư mục lưu trữ tài nguyên thực tế trên Cloudinary tiếp tục là `AdminCMS` (hoặc cấu hình qua biến môi trường `CLOUDINARY_ROOT_FOLDER`), không đổi tên trên cloud để tránh rủi ro đứt gãy liên kết ảnh đã upload.
- **Cập nhật Mapper ([`src/utils/mediaPathMapper.js`](../src/utils/mediaPathMapper.js)):**
  - Chuyển `ROOT_MEDIA_PATH` từ `/root/media library` sang `/root/media library` (đọc từ `branding.PATHS.MEDIA`).
  - Ánh xạ 1-1: `/root/media library/Banners/Hero/summer-sale` &harr; Cloudinary asset folder `AdminCMS/Banners/Hero` và public_id `AdminCMS/Banners/Hero/summer-sale`.

### 2.6. Thuật ngữ Nghiệp vụ Vay mượn (Treecraft Concepts)
- Các thuật ngữ nghiệp vụ cốt lõi: `Launchpad`, `Workbox`, `Standard Values`, `Experience Editor`, `Presentation Details`, `Insert Options` **được giữ nguyên** trong giai đoạn R1 để tránh gây xáo trộn tài liệu kiến trúc và trải nghiệm quen thuộc của người dùng.

---

## 3. Bảng Ánh xạ Đường dẫn Cây Hệ thống (Path Mapping Table)

| Thành phần Cây | Đường dẫn Cũ (Sitecore) | Đường dẫn Mới (Treecraft) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Gốc Cây** | `/root` | `/root` | Giữ nguyên `_id` |
| **Nhánh Nội dung** | `/root/content` | `/root/content` | Chứa toàn bộ cây website |
| **Trang chủ** | `/root/content/Home` | `/root/content/Home` | Trang bắt đầu mặc định (`SITE_START_ITEM`) |
| **Nhánh Presentation** | `/root/layout` | `/root/layout` | Chứa 3 nhánh layout |
| **Layouts** | `/root/layout/Layouts` | `/root/layout/Layouts` | Chứa Layout items |
| **Placeholders** | `/root/layout/Placeholders` | `/root/layout/Placeholders` | Chứa Placeholder items |
| **Renderings** | `/root/layout/Renderings` | `/root/layout/Renderings` | Chứa Component Rendering items |
| **Nhánh Templates** | `/root/templates` | `/root/templates` | Chứa tất cả template |
| **Component Templates** | `/root/templates/Feature/Components` | `/root/templates/Feature/Components` | Khuôn mẫu component |
| **Page Templates** | `/root/templates/Project/Pages` | `/root/templates/Project/Pages` | Khuôn mẫu trang |
| **System Templates** | `/root/templates/System` | `/root/templates/System` | Template kỹ thuật hệ thống |
| **Common Templates** | `/root/templates/Common` | `/root/templates/Common` | Thư mục chung (Folder, ...) |
| **Nhánh Media** | `/root/media library` | `/root/media library` | Đồng bộ Cloudinary `AdminCMS` |
| **Nhánh Hệ thống** | `/root/system` | `/root/system` | Chứa Workflow, Ngôn ngữ, Settings |

---

## 4. Hệ quả & Rủi ro Kỹ thuật (Consequences & Technical Risks)

### Hệ quả Tích cực
1. Sản phẩm hoàn toàn độc lập về mặt nhận diện thương hiệu (Treecraft).
2. Đường dẫn gọn hơn (`/root/...`), dễ nhớ và mang tính khái quát cao.
3. Không lo ngại vấn đề bản quyền thương hiệu Sitecore trên giao diện và tài liệu công khai.
4. Cấu trúc mã nguồn trở nên chuyên nghiệp hơn nhờ loại bỏ triệt để chuỗi hard-coded thông qua module `branding.js`.

### Rủi ro & Chiến lược Giảm thiểu
1. **Migration Path trên DB:**
   - Cần cập nhật hàng loạt trường `path` trên cả `items_master` (72 items), `items_web` (53 items), và `templates` (24 items).
   - *Biện pháp:* Viết script migration có `--dry-run`, thực hiện theo thứ tự độ sâu của cây hoặc bulk regex replace `^/sitecore` &rarr; `/root`, tự động rebuild index `path_1`.
2. **Invalidate Cache:**
   - Toàn bộ in-memory cache của Public Site Renderer và ACL LRU cache phải được xóa sạch sau khi migration hoàn tất.
3. **Mất phiên đăng nhập:**
   - Việc đổi cookie session name sang `treecraft_session_id` sẽ khiến người dùng đang đăng nhập phải đăng nhập lại một lần.

---

## 5. Trạng thái Quyết định
- **Trạng thái:** Đang đề xuất (Chờ phê duyệt `APPROVE GĐ R1`).
- **Giai đoạn áp dụng:** GĐ R1 (Rebrand & Root rename).

