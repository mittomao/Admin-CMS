# Treecraft CMS — Enterprise Hierarchical Content Management System

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B%20LTS-brightgreen.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%208.0%20(Replica%20Set)-green.svg)](https://www.mongodb.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Monolith%20SSR%20EJS-blue.svg)](#kiến-trúc-hệ-thống)
[![Test Suite](https://img.shields.io/badge/Tests-65%20suites%20%7C%20601%20passing-success.svg)](#kiểm-thử-tự-động)

Treecraft CMS là hệ thống quản trị nội dung cấp doanh nghiệp (Enterprise CMS) dựa trên triết lý **"Mọi thứ là Item"** (Everything is an Item), tổ chức nội dung theo cấu trúc cây phân cấp (Hierarchical Tree) với gốc chuẩn hóa `/root`. 

Ứng dụng được xây dựng theo mô hình monolithic hiệu năng cao: **Node.js (v20+ LTS) + Express.js + EJS SSR (100% Server-Side Rendering) + MongoDB (Mongoose)** kết hợp giao diện quản trị desktop-like (Launchpad, Content Editor 3 vùng, Ribbon, Fancytree, Tabler UI, TinyMCE).

---

## 1. Điểm Nhấn Kiến Trúc

1. **Mô hình Cây Phân cấp & Triết lý "Mọi thứ là Item":**
   Mọi thành phần trong hệ thống (Trang nội dung, Template định nghĩa, Presentation Layout, Rendering component, Thư viện Media, Phân quyền) đều kế thừa từ thực thể Item với Materialized Path (`/root/...`).
2. **Tách biệt Master & Web Store trong 1 Database:**
   - `items_master`: Kho soạn thảo nội dung của biên tập viên, hỗ trợ đa phiên bản (Versions), đa ngôn ngữ (Languages) và quy trình phê duyệt Workflow (Draft $\rightarrow$ Review $\rightarrow$ Approved).
   - `items_web`: Kho xuất bản tối ưu hóa cho Public Site Renderer (chỉ đọc), đáp ứng thời gian phản hồi cực nhanh (&lt; 50ms khi có Render Cache).
3. **Phân phối Độc quyền qua NPM Package (`treecraft-core`):**
   - **Treecraft Core:** Đóng gói thành thư viện npm công khai, bất biến, cài đặt trong `node_modules`, quản lý toàn bộ engine xử lý, admin dashboard, API và CLI quản trị.
   - **Site Project:** Nơi chứa giao diện EJS views, styles Tailwind CSS, assets tĩnh, cấu hình thương hiệu và các file Serialization YAML độc lập của từng dự án.
4. **An ninh Bảo mật Đa lớp (Defense in Depth):**
   - Chốt chặn `dbGuard` ngăn ngừa vô tình ghi đè DB Remote/Cloud ở môi trường Dev.
   - Helmet CSP phân tách chặt chẽ giữa Admin CMS và Public Site.
   - Tái tạo Session ID chống Session Fixation, Rate Limiting chống Brute Force trên trang đăng nhập.
   - Lá chắn chu vi Basic Auth bảo vệ toàn bộ URL `/admin`.

---

## 2. Yêu Cầu Môi Trường

- **Node.js:** Phiên bản `v20.x` LTS trở lên (`node -v`).
- **NPM:** Phiên bản `v10.x` trở lên (`npm -v`).
- **MongoDB:** Phiên bản `7.0` hoặc `8.0` chạy dưới dạng **Replica Set** (`rs0`) để hỗ trợ Mongoose Transactions.
- **Docker & Docker Compose** (Tùy chọn, khuyến nghị cho triển khai nhanh).

---

## 3. Khởi Động Nhanh (Quickstart)

### Cách 1: Khởi tạo Website Mới từ NPM (Khuyến nghị)

```bash
mkdir my-project && cd my-project
npm init -y
npm install treecraft-core
npx treecraft init
npm run dev
```

### Cách 2: Phát triển mã nguồn Treecraft Core cục bộ (Local Core Dev)

```bash
# 1. Cài đặt thư viện dependencies
npm install

# 2. Khởi động MongoDB Replica Set bằng Docker
docker compose up -d

# 3. Đồng bộ dữ liệu mẫu khởi đầu (Starter Data & Templates)
npm run tree:sync

# 4. Kiểm tra sức khỏe hệ thống (System Doctor)
npm run doctor

# 5. Khởi chạy máy chủ phát triển
npm run dev
```

### Cách 2: Triển khai hoàn chỉnh bằng Docker Compose (Staging / Production)

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

---

## 4. Các Đường Dẫn Truy Cập Chính

| Điểm truy cập | URL | Mục đích |
| :--- | :--- | :--- |
| **Trang chủ Website (SSR)** | [http://localhost:4000/](http://localhost:4000/) | Website công khai kết xuất HTML phía server |
| **Bảng Điều khiển Launchpad** | [http://localhost:4000/admin](http://localhost:4000/admin) | Cổng khởi động ứng dụng quản trị CMS |
| **Content Editor** | [http://localhost:4000/admin/content-editor](http://localhost:4000/admin/content-editor) | Biên tập cây nội dung 3 vùng, quản lý fields |
| **System Health & Control Panel** | [http://localhost:4000/admin/control-panel](http://localhost:4000/admin/control-panel) | Giám sát RAM, DB, Site Cache và công cụ vận hành |
| **Liveness Probe** | [http://localhost:4000/health](http://localhost:4000/health) | Kiểm tra trạng thái sống của Node process |
| **Readiness Probe** | [http://localhost:4000/ready](http://localhost:4000/ready) | Kiểm tra kết nối MongoDB socket & collections |

*Tài khoản quản trị mặc định: `admin` / mật khẩu khởi tạo trong seed.*

---

## 5. Bảng Lệnh CLI Thường Dùng (Cheatsheet)

```bash
# === KIỂM TRA & CHẨN ĐOÁN ===
npm test                    # Chạy toàn bộ 65 test suites (Jest)
npm run lint                # Kiểm tra cú pháp và quy chuẩn mã nguồn (ESLint)
npm run doctor              # Chẩn đoán toàn diện hệ thống ở chế độ chỉ đọc
npm run check:branding      # Kiểm tra tuân thủ thương hiệu Treecraft & root "/root"
npm run check:env           # Kiểm tra tính toàn vẹn của biến môi trường

# === DỮ LIỆU & ĐỒNG BỘ ===
npm run tree:sync           # Đồng bộ dữ liệu mẫu starter vào MongoDB
npm run tree:compare        # Đối soát 100% tính toàn vẹn cây nội dung (Tree Parity)
npm run serialize:section   # Đồng bộ cấu hình Template, Layout, Content dạng file YAML

# === SAO LƯU & KHÔI PHỤC THẢM HOẠ (K1) ===
npm run backup:create       # Tạo bản sao lưu toàn diện K1 (hỗ trợ mã hóa AES-256)
npm run backup:list         # Xem danh sách các bản sao lưu
npm run backup:verify <id>  # Xác minh tính toàn vẹn Checksum SHA-256
npm run backup:restore <id> # Phục hồi dữ liệu an toàn

# === VẬN HÀNH & NÂNG CẤP CORE ===
npm run core:check          # Kiểm tra trạng thái Core Submodule
npm run core:prepare        # Tự động sao lưu K1 an toàn trước khi pull Core mới
npm run core:verify         # Xác minh phiên bản Core mới sau cập nhật
npm run core:rollback       # Tự động khôi phục dữ liệu nếu phiên bản mới bị lỗi
```

---

## 6. Tài Liệu Hướng Dẫn Chi Tiết

Mọi quy trình vận hành và tài liệu kỹ thuật được lưu trữ trong thư mục `docs/`:

* **Hướng dẫn vận hành chuẩn 7 mục (Guides):**
  * [Khởi tạo dự án mới từ con số không (Fresh Install)](docs/guides/fresh-install.md)
  * [Sao lưu & Phục hồi thảm họa K1 (Backup & Restore)](docs/guides/backup-and-restore.md)
  * [Kiến trúc tách biệt Core & Site (Submodule Workflow)](docs/guides/core-and-site.md)
  * [Triển khai hệ thống bằng Docker & Compose](docs/guides/deployment-docker.md)
  * [Thiết lập an ninh môi trường Production](docs/guides/security-hardening.md)
  * [Quy trình Đồng bộ YAML Serialization theo Section](docs/guides/serialization.md)
* **Quy tắc & Tiêu chuẩn kỹ thuật:**
  * [Quy trình làm việc AI Agent & Workflow](docs/rules/00-workflow.md)
  * [Ngăn xếp công nghệ chuẩn (Tech Stack)](docs/rules/02-tech-stack.md)
  * [Quy ước viết code, phân tầng & xử lý lỗi](docs/rules/03-conventions.md)
  * [Tiêu chuẩn bảo mật (Security Rules)](docs/rules/05-security.md)
* **Kiến trúc & Quyết định kỹ thuật:**
  * [Mô hình Item & Cây phân cấp](docs/data-model/items-and-tree.md)
  * [Danh mục các quyết định kiến trúc (DEC-001 -> DEC-058)](docs/decisions/README.md)
  * [Tiến độ tổng thể 13 giai đoạn phát triển](docs/phases/README.md)

---

## 7. Giấy Phép (License)
Dự án Treecraft CMS được phát triển nội bộ cho mục đích quản trị nội dung cấp doanh nghiệp. Bản quyền &copy; 2026 Treecraft Core Team.
