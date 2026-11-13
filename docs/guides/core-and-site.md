# HƯỚNG DẪN KIẾN TRÚC TÁCH CORE / SITE VÀ VẬN HÀNH CLI TREECRAFT

> Tài liệu hướng dẫn chuẩn vận hành kiến trúc phân tách Core (Bất biến) và Site (Dự án riêng) theo DEC-056 (GĐ S1 & S2).

---

## MỤC LỤC
1. [Khái Niệm & Mô Hình Kiến Trúc](#1-khái-niệm--mô-hình-kiến-trúc)
2. [Lệnh `treecraft init` (Khởi Tạo Dự Án Mới)](#2-lệnh-treecraft-init-khởi-tạo-dự-án-mới)
3. [Lệnh `treecraft where` (Xem Thông Tin Đường Dẫn)](#3-lệnh-treecraft-where-xem-thông-tin-đường-dẫn)
4. [Lệnh `treecraft doctor` (Chẩn Đoán Tính Toàn Vẹn)](#4-lệnh-treecraft-doctor-chẩn-đoán-tính-toàn-vẹn)
5. [Lệnh `treecraft start` & `treecraft dev` (Khởi Chạy Server)](#5-lệnh-treecraft-start--treecraft-dev-khởi-chạy-server)
6. [Lệnh Migration Chuẩn Hóa `viewPath`](#6-lệnh-migration-chuẩn-hóa-viewpath)

---

## 1. KHÁI NIỆM & MÔ HÌNH KIẾN TRÚC

Hệ thống Treecraft CMS được phân chia thành 2 phần độc lập đặt song song:
```text
my-project/
├── core/                      # ENGINE BẤT BIẾN (Không ai sửa; thay thế khi nâng cấp)
│   ├── src/                   # Logic CMS, models, controllers, services, admin views
│   ├── bin/treecraft.js       # CLI entrypoint duy nhất
│   ├── starter/corporate/     # Bộ starter template chuẩn
│   └── package.json           # Khai báo bin và files sẵn sàng cho npm package
└── site/                      # TOÀN BỘ PHẦN CỦA DỰ ÁN (Chỉ ghi)
    ├── site.config.js         # Cấu hình dự án (Tên, Root, Ngôn ngữ, DB, Cloudinary)
    ├── .env.development       # File môi trường riêng của dự án
    ├── views/                 # View EJS công khai (layouts, components, partials, errors)
    ├── public/                # CSS, JS, ảnh tĩnh của website
    ├── serialization/         # Dữ liệu YAML (Templates, Layouts, Renderings, Contents)
    ├── backups/               # Thư mục lưu sao lưu database (không commit)
    └── extensions/            # Mã nguồn mở rộng nghiệp vụ dự án
```

### Nguyên tắc Vàng:
- **Core chỉ đọc, Site chỉ ghi:** Core tuyệt đối không bao giờ ghi file runtime (logs, cache, uploads, backups, serialization YAML) vào thư mục của nó.
- **Độc lập vị trí tuyệt đối (Location Independence):** Core có thể nằm ở bất kỳ đâu trên máy tính hoặc trong `node_modules/@treecraft/core`, giải quyết mọi đường dẫn thông qua module trung tâm `src/config/sitePaths.js`.

---

## 2. LỆNH `treecraft init` (KHỞI TẠO DỰ ÁN MỚI)

### (1) Mục đích / Khi nào sử dụng
Sử dụng khi bạn muốn tạo một dự án website mới từ một Starter Template có sẵn (mặc định là `corporate`). Lệnh này tự động tạo cấu trúc thư mục `site/` hoàn chỉnh, sinh file cấu hình `site.config.js`, các file môi trường `.env*` với khóa bí mật bảo mật ngẫu nhiên, sinh `package.json` tối giản và nạp dữ liệu serialization ban đầu.

### (2) Điều kiện trước
- Node.js phiên bản 20+ LTS hoặc 22+.
- Có quyền truy cập vào binary Core (`core/bin/treecraft.js` hoặc package `treecraft`).
- Đã cài đặt MongoDB (Docker local MongoDB) nếu muốn tự động đồng bộ schema DB lúc init.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Mở terminal tại thư mục bạn muốn đặt dự án

#### Bước 2: Chạy lệnh khởi tạo

- **macOS / Linux:**
  ```bash
  # Khởi tạo site mặc định tại ./site từ starter corporate:
  node bin/treecraft.js init ./site --name "My Corporate Portal"

  # Khởi tạo dự án vào một thư mục bất kỳ kèm prefix database riêng:
  node bin/treecraft.js init /path/to/my-new-site --name "Alpha Corp" --db-prefix "alpha_corp"

  # Bỏ qua bước kết nối DB (chỉ tạo khung thư mục và file cấu hình):
  node bin/treecraft.js init ./site --name "My Site" --skip-db
  ```

- **Windows (PowerShell / Command Prompt):**
  ```powershell
  # PowerShell:
  node .\bin\treecraft.js init .\site --name "My Corporate Portal"

  # CMD:
  node bin\treecraft.js init .\site --name "My Corporate Portal"
  ```

### (4) Kết quả mong đợi
Terminal hiển thị tiến trình tạo khung thư mục và thông báo thành công:
```text
🚀 [treecraft init] Đang khởi tạo dự án mới: "My Corporate Portal"...
📁 Thư mục đích: /path/to/my-project/site
📦 Starter mẫu : corporate
  ├── Sao chép views EJS...
  ├── Sao chép tài nguyên tĩnh public/...
  ├── Sao chép dữ liệu đồng bộ serialization/...
  ├── Sinh file cấu hình site.config.js...
  ├── Sinh file cấu hình môi trường (.env, .env.development, .env.example)...
  ├── Sinh package.json cho dự án Site...
  ├── Sinh tài liệu hướng dẫn README.md...

============================================================
🎉 KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "My Corporate Portal"!
============================================================

Các bước tiếp theo:
  1. Di chuyển vào thư mục dự án: cd site
  2. Kiểm tra tính toàn vẹn:      treecraft doctor --site ./site
  3. Khởi động server:            treecraft dev --site ./site
```

### (5) Cách kiểm tra thành công
1. Chạy lệnh chẩn đoán `treecraft doctor`:
   ```bash
   node bin/treecraft.js doctor --site ./site
   ```
   Kết quả phải hiển thị `10 bài kiểm tra đạt, 0 bài kiểm tra thất bại`.
2. Kiểm tra các file đã được sinh đầy đủ:
   - `site/site.config.js` chứa đúng `projectName`, `rootName: "root"`, tên DB.
   - `site/.env.development` chứa `SESSION_SECRET` và `BACKUP_ENCRYPTION_KEY` 64 ký tự hex.
   - `site/views/layouts/HomeLayout.ejs` đã có sẵn.

### (6) Lỗi thường gặp và cách xử lý
- **Lỗi `Thư mục đích "..." đã tồn tại và không rỗng`:**
  - *Nguyên nhân:* Thư mục đích đã có chứa file từ trước, hệ thống chặn ghi đè để bảo vệ dữ liệu.
  - *Cách xử lý:* Thêm cờ `--force` nếu bạn chắc chắn muốn ghi đè: `node bin/treecraft.js init ./site --force`.
- **Lỗi `Không tìm thấy Starter Template "..."`:**
  - *Nguyên nhân:* Tên starter truyền qua cờ `--starter` không tồn tại trong thư mục `core/starter/`.
  - *Cách xử lý:* Dùng starter mặc định `--starter corporate`.

### (7) Cảnh báo và rủi ro
- Tuyệt đối không lưu mật khẩu hoặc secret key vào `site.config.js`; các thông tin này phải nằm trong file `site/.env` hoặc `site/.env.development`.
- Không chỉnh sửa file bên trong `core/`; mọi tùy biến giao diện và template đều thực hiện trong thư mục `site/`.

---

## 3. LỆNH `treecraft where` (XEM THÔNG TIN ĐƯỜNG DẪN)

### (1) Mục đích / Khi nào sử dụng
Dùng khi bạn cần kiểm tra chính xác Core và Site đang được nạp từ những thư mục nào trên đĩa, kiểm tra xem biến môi trường `TREECRAFT_SITE_DIR` hoặc cờ `--site` có đang nhận đúng vị trí dự án hay không.

### (2) Điều kiện trước
- Node.js phiên bản 20+ LTS hoặc 22+.
- Đang đứng trong thư mục Core hoặc Site, hoặc có quyền truy cập vào binary `bin/treecraft.js`.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Mở terminal tại thư mục dự án

#### Bước 2: Chạy lệnh kiểm tra đường dẫn

- **macOS / Linux:**
  ```bash
  # Tự động nhận diện thư mục site mặc định
  node bin/treecraft.js where

  # Hoặc chỉ định rõ thư mục site
  node bin/treecraft.js where --site ./site
  ```

- **Windows (PowerShell / Command Prompt):**
  ```powershell
  # PowerShell
  node .\bin\treecraft.js where --site .\site

  # CMD
  node bin\treecraft.js where --site .\site
  ```

### (4) Kết quả mong đợi
Màn hình in ra bảng thông tin đường dẫn hệ thống đầy đủ:
```text
============================================================
  TREECRAFT CMS - THÔNG TIN ĐƯỜNG DẪN HỆ THỐNG
============================================================
Core Engine Dir : /path/to/my-project/core
Site Dir        : /path/to/my-project/site
Views Dir       : /path/to/my-project/site/views
Public Dir      : /path/to/my-project/site/public
Serialization   : /path/to/my-project/site/serialization
Backups Dir     : /path/to/my-project/site/backups
Env File        : /path/to/my-project/site/.env
Project Name    : Corporate Starter Site
Root Name       : root (/root)
Node Version    : v24.14.0
Process PID     : 12345
============================================================
```

### (5) Cách kiểm tra thành công
- Lệnh thoát với mã exit code 0.
- `Core Engine Dir` trỏ đúng vào thư mục core engine.
- `Site Dir` trỏ đúng vào thư mục site chứa `site.config.js`.

### (6) Lỗi thường gặp
- **Lỗi `[Treecraft Error] Không tìm thấy thư mục dự án (site/) hợp lệ!`:**
  - *Nguyên nhân:* Thư mục hiện tại và các thư mục cha không có `site.config.js`, và không có cờ `--site` hoặc `TREECRAFT_SITE_DIR`.
  - *Cách xử lý:* Truyền thêm cờ `--site /đường/dẫn/tới/site` hoặc chạy `npm run doctor -- --site ./site`.

### (7) Cảnh báo / Rủi ro
- Không gõ nhầm đường dẫn site; nếu trỏ vào một thư mục rỗng, hệ thống sẽ báo lỗi thiếu `site.config.js`.

---

## 4. LỆNH `treecraft doctor` (CHẨN ĐOÁN TÍNH TOÀN VẸN)

### (1) Mục đích / Khi nào sử dụng
Chẩn đoán và kiểm tra toàn diện 10 chỉ số liên kết giữa Core và Site: sự tồn tại của Core, tính hợp lệ của `site.config.js`, các thư mục con bắt buộc (`views/`, `public/`, `serialization/`, `backups/`) và file biến môi trường `.env`.

### (2) Điều kiện trước
- Đã có thư mục `site/` kèm `site.config.js` hợp lệ.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Chạy lệnh doctor

- **macOS / Linux:**
  ```bash
  node bin/treecraft.js doctor
  # hoặc qua npm:
  npm run doctor
  ```

- **Windows (PowerShell):**
  ```powershell
  node .\bin\treecraft.js doctor --site .\site
  # hoặc qua npm:
  npm run doctor
  ```

### (4) Kết quả mong đợi
Toàn bộ 10 bài kiểm tra hiển thị màu xanh `[PASS]`:
```text
============================================================
  TREECRAFT CMS - KIỂM TRA CHẨN ĐOÁN (DOCTOR)
============================================================

  ✅ [PASS] Thư mục Core tồn tại (/path/to/core)
  ✅ [PASS] Thư mục Core có src/ và views/ 
  ✅ [PASS] Thư mục Starter mẫu corporate 
  ✅ [PASS] Phân giải thư mục Site (/path/to/site)
  ✅ [PASS] Cấu hình site.config.js hợp lệ (Project: "Corporate Starter Site", Root: "/root")
  ✅ [PASS] Thư mục views/ 
  ✅ [PASS] Thư mục public/ 
  ✅ [PASS] Thư mục serialization/ 
  ✅ [PASS] Thư mục backups/ 
  ✅ [PASS] File cấu hình môi trường .env (/path/to/site/.env)

------------------------------------------------------------
Kết quả: 10 bài kiểm tra đạt, 0 bài kiểm tra thất bại.
------------------------------------------------------------
```

### (5) Cách kiểm tra thành công
- Lệnh trả về thông báo `10 bài kiểm tra đạt, 0 bài kiểm tra thất bại` và thoát với mã 0.

### (6) Lỗi thường gặp
- **`❌ [FAIL] Cấu hình site.config.js hợp lệ: site.config.js KHÔNG ĐƯỢC CHỨA thông tin bảo mật...`:**
  - *Nguyên nhân:* Vô tình lưu `password`, `secret`, `apiKey` trong file `site.config.js`.
  - *Cách xử lý:* Chuyển toàn bộ mật khẩu, token sang file `site/.env` hoặc `site/.env.development`.

### (7) Cảnh báo / Rủi ro
- Lệnh `doctor` là bài kiểm tra bắt buộc trước khi triển khai hoặc khởi động ứng dụng trên môi trường staging/production.

---

## 5. LỆNH `treecraft start` & `treecraft dev` (KHỞI CHẠY SERVER)

### (1) Mục đích / Khi nào sử dụng
Khởi chạy ứng dụng Treecraft (bao gồm Website công khai SSR và Giao diện Quản trị Admin CMS) với nguồn tài nguyên views và public được nạp độc lập từ thư mục `site/`.

### (2) Điều kiện trước
- MongoDB đã khởi động (Docker local MongoDB `127.0.0.1:27017` cho development).
- Đã chạy `npm run doctor` đạt kết quả xanh 10/10.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Khởi động container MongoDB (nếu chưa chạy)
```bash
npm run db:up
```

#### Bước 2: Khởi động Treecraft Server

- **Chế độ phát triển (Development):**
  ```bash
  npm run dev
  # hoặc:
  node bin/treecraft.js dev --site ./site
  ```

- **Chế độ sản xuất (Production):**
  ```bash
  npm start
  # hoặc:
  node bin/treecraft.js start --site ./site
  ```

### (4) Kết quả mong đợi
Terminal hiển thị banner khởi động chuẩn mực:
```text
====================================================
  Treecraft CMS is running
  Mode: development
  URL:  http://localhost:3000
  PID:  12345
====================================================
```

### (5) Cách kiểm tra thành công
- Mở trình duyệt truy cập Website công khai: `http://localhost:3000` (render từ `site/views/layouts/HomeLayout.ejs`).
- Mở trình duyệt truy cập Admin CMS: `http://localhost:3000/admin` (render từ views nội bộ của Core).

### (6) Lỗi thường gặp
- **Lỗi 404 hoặc 500 khi truy cập `/`:**
  - *Nguyên nhân:* Thư mục `site/views` thiếu các component EJS.
  - *Cách xử lý:* Chạy `npm run doctor` để kiểm tra các file view bị thiếu.

### (7) Cảnh báo / Rủi ro
- Không chỉnh sửa file trong thư mục `core/`. Mọi chỉnh sửa giao diện website phải thực hiện trong `site/views/` và `site/public/`.

---

## 6. LỆNH MIGRATION CHUẨN HÓA `viewPath`

### (1) Mục đích / Khi nào sử dụng
Chuẩn hóa các đường dẫn `viewPath` trong cơ sở dữ liệu Master và Web sau khi chuyển sang cấu trúc tách rời (loại bỏ tiền tố `site/`, `views/site/`).

### (2) Điều kiện trước
- MongoDB đang hoạt động và kết nối được.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Chạy thử nghiệm an toàn (Dry Run)
```bash
npm run migrate:viewpaths -- --dry-run
```

#### Bước 2: Chạy migration thực tế (tự động tạo backup K1 trước khi lưu)
```bash
npm run migrate:viewpaths
```

### (4) Kết quả mong đợi
Hệ thống tự động sao lưu dữ liệu sang thư mục `site/backups/`, quét các item trong DB và chuẩn hóa `viewPath` về dạng tương đối đối với `site/views/`.

### (5) Cách kiểm tra thành công
- Báo cáo in ra: `Tổng số item đã quét`, `Tổng số item chuẩn hóa`, và `COMPLETED (Đã lưu)`.

### (6) Lỗi thường gặp
- **Lỗi kết nối MongoDB:** Đảm bảo Docker MongoDB đang chạy bằng lệnh `npm run db:status`.

### (7) Cảnh báo / Rủi ro
- Luôn kiểm tra kết quả bằng cờ `--dry-run` trước khi chạy migration chính thức.

