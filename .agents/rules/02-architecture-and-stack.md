# KIẾN TRÚC HỆ THỐNG & TECH STACK

## 1. MÔ HÌNH DỰ ÁN
- **Hệ thống Treecraft CMS:** Quản trị nội dung phân cấp (Hierarchical Tree) theo triết lý "Mọi thứ là Item" với root node chuẩn hoá `/root`.
- **Monolithic Web App:** Chạy chung trên cổng 4000:
  - Admin CMS tại `/admin` (Launchpad, Content Editor, Ribbon, Fancytree, TinyMCE, Tabler UI).
  - Public Website tại `/` (100% Server-Side Rendering EJS).
- **Tech Stack cốt lõi:** Node.js (v20+ LTS) + Express.js + EJS SSR + MongoDB (Mongoose) + Tailwind CSS.

## 2. MÔ HÌNH DỮ LIỆU
- **1 Database, 2 Collections:**
  - `items_master`: Kho lưu trữ soạn thảo, phiên bản hóa, đa ngôn ngữ của biên tập viên.
  - `items_web`: Kho lưu trữ xuất bản tối ưu cho Public Site Renderer (chỉ đọc).
- Tên database động theo cấu hình: `treecraft_<project_slug>`.
- Chốt chặn `dbGuard`: Ngăn chặn tuyệt đối việc kết nối nhầm sang DB Remote/Cloud ở môi trường Dev, kiểm tra dấu vân tay môi trường `settings.environmentFingerprint`.

## 3. CẤU TRÚC CORE SUBMODULE & SITE (DEC-056)
- **Core CMS:** Nằm tại `core/` (hoặc thư mục gốc nếu Standalone Dev), bất biến, không sửa code.
- **Site Project:** Nằm tại thư mục cha, chứa `site.config.js`, `.env*`, `views/`, `public/`, `Serialization/`.
- Luôn tra cứu đường dẫn qua module trung tâm: `src/config/sitePaths.js`.
