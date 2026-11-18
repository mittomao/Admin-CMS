# Hướng Dẫn Phát Triển và Thử Nghiệm Treecraft Core (Develop Core)

Tài liệu hướng dẫn quy trình phát triển, kiểm thử cục bộ và đóng gói Treecraft Core độc lập mà không chỉnh sửa trực tiếp trong `node_modules`.

---

## 1. Mục Đích (Purpose)
- Cung cấp quy trình làm việc chuẩn mực cho các lập trình viên muốn mở rộng, sửa lỗi hoặc phát triển tính năng mới cho package `treecraft-core`.
- Thiết lập phương pháp liên kết và kiểm thử Core với các dự án Site thực tế thông qua các cơ chế chuẩn của Node.js/npm (`npm link`, `.tgz` tarball cục bộ) mà không gây rủi ro phá vỡ mã nguồn gốc.

---

## 2. Điều Kiện Trước (Prerequisites)
- Đã cài đặt Node.js phiên bản $\ge 20.0.0$ LTS và npm $\ge 10.0.0$.
- Đã cài đặt và đang chạy MongoDB phiên bản 7.0 hoặc 8.0 dưới dạng Replica Set (`mongodb://127.0.0.1:27017`).
- Đã clone kho lưu trữ mã nguồn Treecraft Core:
  ```bash
  git clone https://github.com/mittomao/Admin-CMS.git treecraft-core
  cd treecraft-core
  npm install
  ```

---

## 3. Các Bước Thực Hiện (Step-by-Step Instructions)

### Phương án A: Thử nghiệm nhanh bằng `npm link` (Khuyến nghị khi đang code tính năng)

1. **Khởi tạo liên kết symlink trong thư mục Core:**
   ```bash
   cd path/to/treecraft-core
   npm link
   ```

2. **Liên kết Core vào dự án Site thử nghiệm:**
   ```bash
   cd path/to/my-site-project
   npm link treecraft-core
   ```

3. **Chạy máy chủ phát triển trên Site:**
   ```bash
   npm run dev
   ```
   Mọi thay đổi trên mã nguồn Core trong thư mục `treecraft-core/src` sẽ có hiệu lực ngay lập tức.

4. **Hủy liên kết sau khi hoàn tất thử nghiệm:**
   ```bash
   cd path/to/my-site-project
   npm unlink treecraft-core
   npm install
   ```

---

### Phương án B: Thử nghiệm gói đóng gói thực tế bằng `.tgz` Tarball (Bắt buộc trước khi release)

1. **Kiểm tra tính toàn vẹn của tệp đóng gói:**
   ```bash
   cd path/to/treecraft-core
   npm run pack:check
   ```

2. **Đóng gói tarball cục bộ:**
   ```bash
   npm pack
   ```
   Lệnh sẽ tự động chạy `prepack` để biên dịch CSS admin và sinh ra file nén `treecraft-core-0.1.0.tgz`.

3. **Cài đặt file `.tgz` vào dự án Site:**
   ```bash
   cd path/to/my-site-project
   npm install path/to/treecraft-core/treecraft-core-0.1.0.tgz
   npm run dev
   ```

---

## 4. Kết Quả Mong Đợi (Expected Results)
- Khi chạy `npm run dev` trên dự án Site, máy chủ khởi động thành công trên cổng đã cấu hình (mặc định 4000).
- Truy cập `http://localhost:4000/admin` hiển thị giao diện quản trị Treecraft với đầy đủ kiểu dáng Tailwind CSS.
- Truy cập `http://localhost:4000/` hiển thị trang chủ công khai của site.
- Console ghi nhận thông tin nạp cấu hình thành công từ `site.config.js`.

---

## 5. Cách Kiểm Tra (Verification & Diagnostics)
Chạy bộ công cụ chẩn đoán sức khỏe hệ thống từ thư mục Site:
```bash
npx treecraft doctor
```
**Kết quả chuẩn:**
- Kiểm tra môi trường Node.js: `[PASS]`
- Kiểm tra tính toàn vẹn Core: `[PASS] (verified)`
- Quyền truy cập thư mục lưu trữ: `[PASS]`
- Kết nối MongoDB: `[PASS]`

---

## 6. Lỗi Thường Gặp & Cách Khắc Phục (Troubleshooting)

### Lỗi 1: `npm link` gặp lỗi quyền truy cập hoặc EPERM trên Windows
- **Nguyên nhân:** Windows yêu cầu quyền Administrator hoặc Developer Mode để tạo symbolic link.
- **Khắc phục:** Mở terminal PowerShell dưới quyền Run as Administrator hoặc chuyển sang sử dụng Phương án B (cài đặt trực tiếp file `.tgz`).

### Lỗi 2: Admin mất kiểu dáng CSS sau khi sửa file CSS
- **Nguyên nhân:** CSS của admin được biên dịch sẵn (`public/css/tailwind-admin.css`).
- **Khắc phục:** Chạy lệnh biên dịch lại CSS trong thư mục Core:
  ```bash
  npm run build:css:admin
  ```

### Lỗi 3: Site không nhận thay đổi mới trong Core
- **Nguyên nhân:** Node.js module cache hoặc package-lock giữ phiên bản cũ.
- **Khắc phục:** Chạy `npm install --force` hoặc xóa thư mục `.cache` nếu có.

---

## 7. Cảnh Báo An Toàn (Safety & Best Practices)
- ⛔ **Tuyệt đối không chỉnh sửa mã nguồn trực tiếp bên trong `node_modules/treecraft-core`:**
  - Mọi thay đổi trong `node_modules` sẽ bị xóa sạch khi chạy `npm install` hoặc `npm update`.
  - Cơ chế **Package Integrity** của Treecraft sẽ phát hiện và từ chối khởi động ở môi trường staging/production.
- ⛔ **Luôn chạy `npm run pack:check` trước khi gửi pull request:** Đảm bảo không vô tình làm lộ file bí mật hoặc tài liệu nội bộ vào gói phân phối.
