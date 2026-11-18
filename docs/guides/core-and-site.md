# HƯỚNG DẪN KIẾN TRÚC TÁCH BIỆT CORE & SITE (GĐ S)

Tài liệu này hướng dẫn chi tiết quy trình khởi tạo, phát triển và vận hành dự án dựa trên mô hình tách biệt **Treecraft Core** (bất biến dưới dạng Git Submodule) và **Site Repository** (chứa giao diện, mã nguồn, nội dung và cấu hình của từng dự án độc lập).

---

## 1. MỤC ĐÍCH / KHI DÙNG

### Mục đích
- **Tách biệt tuyệt đối giữa Core CMS và Dự án Website:** Treecraft Core chỉ chứa engine xử lý, admin dashboard, logic serialization, dynamic routing, CLI và API lõi. Mọi thành phần của dự án (Views EJS, Public Assets, Serialization YAML, Cấu hình thương hiệu, Database) nằm trọn vẹn trong repo dự án con.
- **Quy trình One-Step Init:** Người dùng tạo một dự án mới và đưa vào hoạt động chỉ với đúng 3 lệnh: `git submodule add` -> `treecraft init` -> `npm run dev`. Không cần `npm install` thủ công, không cần tạo `.env` thủ công, không cần chạy script `migrate`/`seed` thủ công.
- **Đồng nhất Cây Nội Dung Tuyệt Đối (Content Tree Parity 100%):** Dự án mới khởi tạo sở hữu chính xác 54 nodes chuẩn (Deterministic System IDs, Roots, System Templates, Presentation Branches, Sample Site) giống 100% cây chuẩn mực của hệ thống.

### Khi dùng
- Bắt đầu xây dựng một website/portal mới dựa trên Treecraft CMS (ví dụ: Website Doanh nghiệp Corporate, Cổng Thông tin Portal, E-Commerce...).
- Khi nâng cấp phiên bản Core CMS (`git submodule update`) mà không làm ảnh hưởng hay xung đột với mã nguồn của Site.
- Khi cần kiểm tra hoặc đối soát tính toàn vẹn của cây nội dung giữa hai môi trường qua CLI `tree:compare`.

---

## 2. ĐIỀU KIỆN TRƯỚC

Trước khi bắt đầu, môi trường của bạn cần chuẩn bị:
1. **Node.js:** Phiên bản LTS `v20.0.0` trở lên (`node -v`).
2. **Git:** Phiên bản `2.30.0` trở lên (`git --version`).
3. **MongoDB:** Đang chạy cục bộ hoặc trên cloud (`mongodb://127.0.0.1:27017`).
4. **Quyền truy cập Git:** Quyền clone / pull repository `Treecraft Core`.

---

## 3. CÁC BƯỚC ĐÁNH SỐ VỚI LỆNH COPY ĐƯỢC

### Bước 1: Khởi tạo Git Repository cho Dự án Mới

**Trên Windows (PowerShell / Command Prompt):**
```powershell
mkdir my-corporate-site
cd my-corporate-site
git init
```

**Trên macOS / Linux (Bash / Zsh):**
```bash
mkdir my-corporate-site
cd my-corporate-site
git init
```

---

### Bước 2: Thêm Treecraft Core dưới dạng Git Submodule

**Lưu ý:** Thay `<core-repo-url>` bằng URL repository Core thực tế (hoặc đường dẫn local repository).

```bash
git submodule add <core-repo-url> core
```

*Ví dụ clone từ Git Server:*
```bash
git submodule add https://github.com/organization/treecraft-core.git core
```

---

### Bước 3: Chạy Lệnh Khởi Tạo Tự Động Một Bước (`init`)

Chạy lệnh init qua Node.js trực tiếp từ thư mục `core/bin`:

**Chế độ Tương tác (Interactive Mode):**
```bash
node core/bin/treecraft.js init
```
CLI sẽ tự động nhận diện tên thư mục hiện tại làm tên dự án mặc định, sau đó hỏi xác nhận:
- **Project Name:** Mặc định là tên thư mục hiện tại (ví dụ: `my-portal`).
- **Project Slug:** Tự động chuẩn hoá thành snake_case để đặt tên Database: `treecraft_<slug>` (ví dụ: `treecraft_my_portal`).
- **Port & MongoDB URI:** Cổng chạy server (mặc định: `4000`) và kết nối MongoDB cục bộ (mặc định: `mongodb://127.0.0.1:27017`).

**Chế độ Tự động Nhanh (--yes / Thích hợp cho CI/CD hoặc chạy nhanh):**
```bash
# Tự động lấy tên thư mục làm tên dự án và sinh DB: treecraft_{tên_thư_mục}
node core/bin/treecraft.js init --yes

# Hoặc tùy biến tên dự án và cổng mạng:
node core/bin/treecraft.js init --name "My Corporate Portal" --port 4000 --yes
```

Lệnh `init` sẽ tự động thực hiện:
1. Sinh file `package.json` gốc với các npm scripts tiện ích (`dev`, `start`, `tree:compare`, `tree:snapshot`).
2. Tạo cấu trúc thư mục `site/` (`site/views`, `site/public`, `site/serialization`, `site/backups`).
3. Tạo file `site/site.config.js` chứa cấu hình thương hiệu và database riêng biệt của dự án.
4. Tạo `site/.env.development` và `site/.env.example` với chuỗi `SESSION_SECRET` ngẫu nhiên an toàn.
5. Sao chép bộ starter views, CSS/JS assets và serialization YAML từ `starter/corporate`.
6. Khởi tạo Database MongoDB (`treecraft_<slug>`), seed người dùng mặc định (`admin`), roles, và cấu trúc hệ thống.
7. Đồng bộ tự động các YAML sections theo đúng thứ tự topo (`template` -> `layout` -> `placeholder` -> `rendering` -> `content`).

---

### Bước 4: Khởi Động Server Phát Triển

Sau khi `init` xong, bạn chỉ cần chạy:

```bash
npm run dev
```

Hoặc chạy trực tiếp qua Treecraft CLI:
```bash
node core/bin/treecraft.js dev
```

---

## 4. KẾT QUẢ MONG ĐỢI

- **Terminal:** Hiển thị thông báo khởi động thành công:
  ```text
  Treecraft CMS dev server started on http://localhost:4000
  Admin Portal:  http://localhost:4000/admin
  Public Site:   http://localhost:4000/
  Environment:   development
  Site Dir:      /path/to/my-corporate-site/site
  ```
- **Public Site (`http://localhost:4000`):** Hiển thị đầy đủ trang chủ Corporate Starter với HeroBanner, Introduction, ImageText và Footer được render phía server qua EJS.
- **Admin CMS (`http://localhost:4000/admin`):**
  - Đăng nhập bằng tài khoản: `admin` / `admin123`.
  - Content Editor hiển thị cây nội dung chuẩn mực với đúng 54 nodes.
  - Phân vùng `/root/templates`, `/root/layout`, `/root/content`, `/root/media library`, `/root/system` sẵn sàng hoạt động.

---

## 5. CÁCH KIỂM TRA THÀNH CÔNG

### 1. Kiểm tra Cây Nội Dung Đạt Chuẩn Tuyệt Đối (Content Tree Parity 100%)
Chạy script đối soát cây nội dung giữa Starter Manifest và Database hiện tại:

```bash
npm run tree:compare
```

**Kết quả thành công:**
```text
=== KẾT QUẢ ĐỐI SOÁT CÂY NỘI DUNG (TREE PARITY) ===
Source A total nodes: 54
Source B total nodes: 54

✅ PARITY 100%: Hai cây nội dung hoàn toàn đồng nhất tuyệt đối! (54 nodes)
```

### 2. Kiểm tra Tính Độc Lập của Core (Core Immutability)
Kiểm tra git status trong thư mục `core/` để đảm bảo Core không bị ghi bẩn bất kỳ file tạm, file log hay dữ liệu nào:

```bash
cd core
git status
```
**Kết quả thành công:** `nothing to commit, working tree clean`.

### 3. Kiểm tra Tách Biệt Views và Assets
- Mở `site/views/layouts/main.ejs` và thêm dòng thử nghiệm `<meta name="project" content="MySite">`.
- Tải lại `http://localhost:4000/` và xem mã nguồn HTML (Ctrl+U) thấy xuất hiện thẻ meta vừa sửa.
- Điều này chứng minh server nạp view từ `site/views/` chứ không phụ thuộc vào `core`.

---

## 6. LỖI THƯỜNG GẶP

### 1. Lỗi MongoDB không kết nối được
- **Hiện tượng:** CLI báo `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`.
- **Nguyên nhân:** Dịch vụ MongoDB cục bộ chưa được bật.
- **Khắc phục:** Khởi động MongoDB service:
  - Windows: `net start MongoDB`
  - Linux/macOS: `sudo systemctl start mongod` hoặc `brew services start mongodb-community`.

### 2. Lỗi `git submodule add` bị từ chối file protocol (khi test local)
- **Hiện tượng:** `fatal: transport 'file' not allowed`.
- **Khắc phục:** Cho phép file protocol trong cấu hình git:
  ```bash
  git config --global protocol.file.allow always
  ```

### 3. Cổng mạng bị chiếm dụng (Port Collision)
- **Hiện tượng:** `Error: listen EADDRINUSE: address already in use :::4000`.
- **Khắc phục:** Mở `site/.env.development` hoặc `site/site.config.js`, đổi giá trị `PORT=4001` (hoặc cổng khác còn trống) rồi chạy lại `npm run dev`.

---

## 7. CẢNH BÁO / RỦI RO

1. **Tuyệt đối không sửa code trực tiếp trong thư mục `core/`:**
   - Thư mục `core/` là một Git Submodule bất biến được quản lý bởi phiên bản phát hành của Treecraft. Mọi thay đổi cục bộ trong `core/` sẽ bị ghi đè hoặc gây xung đột khi chạy `git submodule update`.
   - Nếu bạn cần mở rộng tính năng, hãy đặt mã nguồn tùy biến trong `site/`.
2. **Quản lý file bí mật `.env`:**
   - File `site/.env.development` chứa thông tin kết nối và `SESSION_SECRET`. File này đã được thêm vào `.gitignore` tự động. Tuyệt đối không commit file này lên repository công khai.
3. **Phân biệt Database Master và Web:**
   - Treecraft áp dụng mô hình một cơ sở dữ liệu `treecraft_<slug>` với 2 collections riêng biệt (`items_master` và `items_web`).
   - Mọi thao tác chỉnh sửa trong Admin CMS ghi vào `items_master`. Dữ liệu chỉ hiển thị ra ngoài Public Site khi thực hiện thao tác **Publish**.

