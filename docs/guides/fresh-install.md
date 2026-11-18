# Hướng Dẫn Khởi Tạo Dự Án Mới (Fresh Installation Runbook)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Áp dụng cho:** Lập trình viên khởi tạo website mới sử dụng Core Submodule hoặc Standalone

---

## 1. Mục Đích / Khi Nào Sử Dụng
- Hướng dẫn chi tiết cách thiết lập một dự án website mới dựa trên nền tảng Treecraft CMS từ con số không (Fresh Install).
- Áp dụng khi:
  - Bắt đầu một dự án website mới cho khách hàng hoặc doanh nghiệp.
  - Thiết lập môi trường phát triển local từ repo mẫu (Starter).
  - Khởi tạo môi trường Staging/UAT trên máy chủ kiểm thử.

---

## 2. Điều Kiện Tiên Quyết
- **Node.js:** Phiên bản `v20.x` LTS trở lên (khuyến nghị `v20` hoặc `v22`). Kiểm tra: `node -v`.
- **NPM:** Phiên bản `v10.x` trở lên kèm theo Node.js.
- **MongoDB:** Phiên bản `7.0` hoặc `8.0` chạy dưới dạng Replica Set `rs0` (hỗ trợ Mongoose Transactions). Khuyến nghị sử dụng Docker Compose.
- **Git:** Đã cài đặt trên máy.

---

## 3. Các Bước Thực Hiện (Windows / macOS / Linux)

### Bước 1: Chuẩn bị thư mục dự án và tải mã nguồn

**Trên macOS / Linux:**
```bash
# Tạo thư mục dự án mới và di chuyển vào
mkdir my-treecraft-site && cd my-treecraft-site
git init

# Thêm Treecraft Core làm Git Submodule
git submodule add https://github.com/your-org/treecraft-core.git core
git submodule update --init --recursive
```

**Trên Windows (PowerShell):**
```powershell
# Tạo thư mục dự án mới và di chuyển vào
mkdir my-treecraft-site
cd my-treecraft-site
git init

# Thêm Treecraft Core làm Git Submodule
git submodule add https://github.com/your-org/treecraft-core.git core
git submodule update --init --recursive
```

---

### Bước 2: Khởi tạo dự án bằng CLI tương tác

Chạy lệnh khởi tạo tự động từ Core CLI:
```bash
node core/bin/treecraft.js init
```
CLI sẽ tự động nhận diện tên thư mục, hướng dẫn bạn nhập:
1. **Tên dự án (Project Name):** Mặc định theo tên thư mục hiện tại.
2. **Slug & Tên Database:** Tự động sinh `treecraft_<slug>`.
3. **Cổng mạng (PORT):** Mặc định `4000`.
4. **MongoDB Connection URI:** Mặc định `mongodb://127.0.0.1:27017`.

*(Nếu muốn khởi tạo tự động không cần hỏi, thêm cờ `--yes`: `node core/bin/treecraft.js init --yes`)*

---

### Bước 3: Cài đặt thư viện dependencies

```bash
npm install
```

---

### Bước 4: Khởi động cơ sở dữ liệu MongoDB Local (Nếu dùng Docker)

```bash
docker compose up -d
```

---

### Bước 5: Đồng bộ dữ liệu mẫu khởi đầu (Starter Seed & Sync)

```bash
npm run tree:sync
```

---

### Bước 6: Khởi chạy máy chủ phát triển (Development Server)

```bash
npm run dev
```

---

## 4. Kết Quả Mong Đợi
- Terminal hiển thị Startup Banner của Treecraft CMS:
  ```text
  ========================================================================
    TREECRAFT CMS — Enterprise Hierarchical Content Management
  ========================================================================
    Môi trường (APP_ENV)    : [ DEV (LOCAL) ]
    Cổng lắng nghe (PORT)   : http://localhost:4000
    Database Mục tiêu       : treecraft_<project_name> (LOCAL)
    MongoDB Connection      : mongodb://127.0.0.1:27017/treecraft_<project_name>
    Chốt chặn dbGuard       : ĐANG KÍCH HOẠT (ACTIVE)
  ========================================================================
  ```
- Quản trị CMS hoạt động tại: `http://localhost:4000/admin`
- Public Site kết xuất SSR tại: `http://localhost:4000/`

---

## 5. Cách Kiểm Tra Xác Nhận
1. **Kiểm tra sức khỏe hệ thống (System Doctor):**
   ```bash
   npm run doctor
   ```
   Kết quả mong đợi: `🎉 HỆ THỐNG ĐẠT CHUẨN SẴN SÀNG VẬN HÀNH (0 Errors, 0 Warnings)`.
2. **Kiểm tra Readiness Probe:**
   Mở trình duyệt hoặc dùng cURL:
   ```bash
   curl -i http://localhost:4000/ready
   ```
   Kết quả mong đợi: HTTP Status `200 OK`, JSON trả về `{"status":"ready", "database":{"status":"connected"}}`.
3. **Đăng nhập Admin CMS:**
   Truy cập `http://localhost:4000/admin/login`, đăng nhập với tài khoản:
   - Username: `admin`
   - Password: `Password123!` (hoặc mật khẩu do seed quy định)

---

## 6. Xử Lý Sự Cố & Lỗi Thường Gặp
1. **Lỗi `MongoServerError: Transaction numbers are only allowed on a replica set member`:**
   - *Nguyên nhân:* MongoDB đang chạy ở chế độ standalone, chưa kích hoạt Replica Set `rs0`.
   - *Khắc phục:* Khởi động MongoDB qua `docker compose up -d` có sẵn cấu hình `rs.initiate()` trong repo.
2. **Lỗi `[dbGuard FATAL] Chặn kết nối: Môi trường "development" không được phép kết nối tới database Remote/Cloud`:**
   - *Nguyên nhân:* File `.env` chứa URI trỏ tới MongoDB Atlas / Cloud trong khi `APP_ENV=development`.
   - *Khắc phục:* Đổi URI về `mongodb://127.0.0.1:27017/...` hoặc thêm `ALLOW_REMOTE_DB_IN_DEV=true` nếu thực sự cần thử nghiệm.
3. **Lỗi `Port 4000 is already in use`:**
   - *Khắc phục:* Đổi biến `PORT=4001` trong file `.env.development` hoặc tắt tiến trình đang chiếm dụng cổng 4000.

---

## 7. Cảnh Báo & Lưu Ý Quan Trọng
- ⚠️ **Tính bất biến của Core:** Tuyệt đối không chỉnh sửa trực tiếp các tệp trong thư mục `core/`. Toàn bộ tùy biến giao diện, layout, styles và views của website phải đặt tại thư mục `site/` (hoặc views gốc của site).
- ⚠️ **Bảo mật Production:** Khi đưa lên production, bắt buộc phải thay đổi `SESSION_SECRET`, mật khẩu quản trị viên mặc định và thiết lập `APP_ENV=production`.
