# Hướng Dẫn Khởi Tạo Dự Án Mới (Fresh Installation Runbook)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Áp dụng cho:** Lập trình viên khởi tạo website mới sử dụng `treecraft-core` qua npm

---

## 1. Mục Đích / Khi Nào Sử Dụng
- Hướng dẫn chi tiết cách thiết lập một dự án website mới dựa trên nền tảng Treecraft CMS từ con số không (Fresh Install).
- Áp dụng khi:
  - Bắt đầu một dự án website mới cho khách hàng hoặc doanh nghiệp.
  - Thiết lập môi trường phát triển local từ starter package.
  - Khởi tạo môi trường Staging/UAT trên máy chủ kiểm thử.

---

## 2. Điều Kiện Tiên Quyết
- **Node.js:** Phiên bản `v20.x` LTS trở lên (khuyến nghị `v20` hoặc `v22`). Kiểm tra: `node -v`.
- **NPM:** Phiên bản `v10.x` trở lên kèm theo Node.js.
- **MongoDB:** Phiên bản `7.0` hoặc `8.0` chạy dưới dạng Replica Set `rs0` (hỗ trợ Mongoose Transactions).

---

## 3. Các Bước Thực Hiện (Windows / macOS / Linux)

### Bước 1: Chuẩn bị thư mục dự án và cài đặt `treecraft-core`

```bash
# Tạo thư mục dự án mới và di chuyển vào
mkdir my-treecraft-site && cd my-treecraft-site
npm init -y

# Cài đặt Treecraft Core
npm install treecraft-core
```

---

### Bước 2: Khởi tạo dự án bằng CLI tương tác

Chạy lệnh khởi tạo tự động:
```bash
npx treecraft init
```

CLI sẽ tự động nhận diện tên thư mục, hướng dẫn bạn nhập:
1. **Project Name:** Tên hiển thị dự án (ví dụ: `Corporate Portal`).
2. **Project Slug:** Định danh dùng cho domain và tên cơ sở dữ liệu (ví dụ: `corporate`).
3. **Server Port:** Cổng lắng nghe máy chủ (mặc định: `4000`).
4. **MongoDB URI:** Địa chỉ kết nối MongoDB (mặc định: `mongodb://127.0.0.1:27017`).

*Hoặc khởi tạo nhanh không tương tác với các giá trị mặc định:*
```bash
npx treecraft init --yes --slug=corporate --port=4000
```

---

### Bước 3: Khởi chạy máy chủ phát triển

```bash
npm run dev
```

---

## 4. Kết Quả Mong Đợi
- Cổng quản trị Admin CMS: `http://localhost:4000/admin` (Tài khoản: `admin` / `Admin@123456`).
- Website công khai: `http://localhost:4000/` hiển thị trang chủ starter corporate.
- Cấu trúc thư mục được thiết lập hoàn chỉnh dưới `site/`.

---

## 5. Cách Kiểm Tra & Nghiệm Thu
Chạy chẩn đoán toàn diện hệ thống:
```bash
npx treecraft doctor
```
Đảm bảo tất cả các hạng mục đều đạt trạng thái `[PASS]`.

---

## 6. Lỗi Thường Gặp & Xử Lý

### Lỗi: `Cannot find module 'treecraft-core'`
- **Khắc phục:** Chạy `npm install treecraft-core` tại thư mục gốc dự án.

### Lỗi: Port 4000 đã bị chiếm dụng
- **Khắc phục:** Thay đổi giá trị `PORT=4001` trong `site/.env.development` hoặc `site/site.config.js`.

---

## 7. Cảnh Báo An Toàn
- Tuyệt đối không chỉnh sửa file trong `node_modules/treecraft-core`.
- Luôn kiểm tra `.gitignore` để không đưa `site/.env.development` lên git repo.
