# Hướng Dẫn Kiến Trúc Tách Biệt Core & Site (DEC-059 / GĐ N)

Tài liệu này hướng dẫn chi tiết quy trình khởi tạo, phát triển và vận hành dự án dựa trên mô hình tách biệt **Treecraft Core** (được phân phối độc quyền qua npm package `treecraft-core`) và **Site Project** (chứa giao diện, mã nguồn, nội dung và cấu hình của từng dự án độc lập).

---

## 1. Mục Đích / Khi Dùng (Purpose)

### Mục đích
- **Tách biệt tuyệt đối giữa Core CMS và Dự án Website:** Treecraft Core chỉ chứa engine xử lý, admin dashboard, logic serialization, dynamic routing, CLI và API lõi. Mọi thành phần của dự án (Views EJS, Public Assets, Serialization YAML, Cấu hình thương hiệu, Database) nằm trọn vẹn trong thư mục của Site (`site/`).
- **Quy trình Khởi Tạo Đơn Giản (Zero-Friction Init):** Người dùng tạo một dự án mới và đưa vào hoạt động chỉ với đúng các lệnh tiêu chuẩn của hệ sinh thái Node.js: `npm init -y` $\rightarrow$ `npm i treecraft-core` $\rightarrow$ `npx treecraft init` $\rightarrow$ `npm run dev`. Không cần thao tác cấu hình phức tạp hay quản lý submodule.
- **Đồng nhất Cây Nội Dung Tuyệt Đối (Content Tree Parity 100%):** Dự án mới khởi tạo sở hữu chính xác 54 nodes chuẩn (Deterministic System IDs, Roots, System Templates, Presentation Branches, Sample Site) giống 100% cây chuẩn mực của hệ thống.

### Khi dùng
- Bắt đầu xây dựng một website/portal mới dựa trên Treecraft CMS.
- Khi nâng cấp phiên bản Core CMS (`npm install treecraft-core@latest`) mà không làm ảnh hưởng hay xung đột với mã nguồn của Site.
- Khi cần kiểm tra hoặc đối soát tính toàn vẹn của cây nội dung giữa hai môi trường qua CLI `tree:compare`.

---

## 2. Điều Kiện Trước (Prerequisites)
1. **Node.js:** Phiên bản LTS `v20.0.0` trở lên (`node -v`).
2. **NPM:** Phiên bản `v10.0.0` trở lên (`npm -v`).
3. **MongoDB:** Đang chạy cục bộ hoặc trên cloud dạng Replica Set (`mongodb://127.0.0.1:27017`).

---

## 3. Các Bước Đánh Số Với Lệnh Copy Được

### Bước 1: Khởi tạo Thư mục Dự án
```bash
mkdir my-corporate-site
cd my-corporate-site
npm init -y
```

### Bước 2: Cài đặt Treecraft Core
```bash
npm install treecraft-core
```

### Bước 3: Khởi tạo Cấu trúc Dự án Một Bước (One-Step Init)
Chế độ tương tác (nhập thông tin dự án, cổng, database):
```bash
npx treecraft init
```

*Hoặc chế độ không tương tác với giá trị mặc định:*
```bash
npx treecraft init --yes --slug=corporate --port=4000
```

### Bước 4: Khởi chạy Máy chủ Phát triển
```bash
npm run dev
```

---

## 4. Kết Quả Mong Đợi (Expected Results)
- Máy chủ khởi chạy thành công:
  - Cổng Quản trị Admin: `http://localhost:4000/admin` (Đăng nhập bằng tài khoản: `admin` / `Admin@123456`)
  - Website Công khai: `http://localhost:4000/` (Hiển thị trang chủ Corporate đầy đủ bố cục)
- Cấu trúc thư mục dự án được sinh ra:
  ```text
  my-corporate-site/
  ├── node_modules/
  ├── site/
  │   ├── .env.development
  │   ├── site.config.js
  │   ├── views/
  │   │   ├── layouts/
  │   │   ├── components/
  │   │   └── partials/
  │   ├── public/
  │   ├── serialization/
  │   └── backups/
  ├── package.json
  └── .gitignore
  ```

---

## 5. Cách Kiểm Tra (Verification)
1. **Kiểm tra chẩn đoán sức khỏe hệ thống:**
   ```bash
   npx treecraft doctor
   ```
2. **Kiểm tra độ đồng nhất của cây nội dung (Tree Parity 100%):**
   ```bash
   npm run tree:compare
   ```

---

## 6. Lỗi Thường Gặp & Cách Khắc Phục (Troubleshooting)

### Lỗi 1: `MongoServerError: not primary and secondaryOk=false`
- **Nguyên nhân:** MongoDB chưa được cấu hình dạng Replica Set.
- **Khắc phục:** Khởi động MongoDB với cờ `--replSet rs0` và chạy `rs.initiate()` trong mongo shell.

### Lỗi 2: Lỗi quyền khi chạy CLI trên Windows PowerShell
- **Nguyên nhân:** Execution Policy chặn script.
- **Khắc phục:** Chạy `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` hoặc dùng `npx --no-install treecraft init`.

---

## 7. Cảnh Báo An Toàn (Safety & Best Practices)
- ⚠️ **Không sửa đổi trực tiếp bên trong `node_modules/treecraft-core`:** Toàn bộ tùy biến giao diện và component phải được thực hiện trong thư mục `site/views/`.
- ⚠️ **Bảo mật `.env`:** Tệp `site/.env.development` chứa thông tin nhạy cảm đã được tự động thêm vào `.gitignore`. Không bao giờ commit tệp này lên kho mã nguồn công khai.
