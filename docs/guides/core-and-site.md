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

## 2. LỆNH `treecraft init` (KHỞI TẠO DỰ ÁN MỚI MỘT BƯỚC — ONE-STEP BOOTSTRAP)

### (1) Mục đích / Khi nào sử dụng
Sử dụng khi bạn muốn tạo một dự án website mới trong một repository riêng biệt với Core được tích hợp qua Git Submodule (`git submodule add <core-repo> core`). 
Lệnh này thực hiện cơ chế **"One-Step Bootstrap"** hoàn toàn tự động qua 8 bước:
1. Kiểm tra tiền điều kiện (Node.js >= 20, Git repo, Core hợp lệ, Docker/MongoDB).
2. Tạo khung thư mục `site/` từ starter `corporate` (`site.config.js`, `.env.development`, `views/`, `public/`, `serialization/`, `package.json`, `.gitignore`, `docker-compose.dev.yml`).
3. Dựng MongoDB local qua Docker (`site/docker-compose.dev.yml`) hoặc kết nối Mongo local đang chạy.
4. Migrate & Seed dữ liệu nền tảng hệ thống (System Templates, Roles, Ngôn ngữ, System root items).
5. Đồng bộ toàn bộ serialization YAML (`Templates → Layouts → Placeholders → Renderings → Contents`) với kiểm tra dry-run ngầm trước khi ghi thật.
6. Sinh tài khoản Admin với mật khẩu ngẫu nhiên an toàn, chỉ in 1 lần duy nhất ra màn hình và bắt buộc đổi ở lần đăng nhập đầu tiên (`mustChangePassword: true`).
7. Tự động xuất bản (publish) trang Home và About Us sang Web Database để route `/` và `/about-us` hoạt động ngay lập tức.
8. Kiểm tra cuối (mini doctor) và in bảng hướng dẫn vận hành chi tiết.

Lệnh có tính **Idempotent** (chạy lại an toàn không ghi đè dữ liệu đã tùy biến) và hỗ trợ cờ `--dry-run` để kiểm tra trước.

### (2) Điều kiện trước
- **Node.js:** Phiên bản `v20.0.0 LTS` trở lên (khuyên dùng v20 hoặc v22).
- **Git:** Đã khởi tạo Git repository tại thư mục dự án (`git init`) và đã kéo Core qua submodule (`git submodule add <core-url> core`).
- **Cơ sở dữ liệu:** Đã cài đặt một trong hai:
  - **Docker Desktop** (khuyên dùng): Docker daemon đang chạy.
  - **MongoDB local** độc lập: Đang lắng nghe trên cổng mặc định `27017`.
  *(Nếu thiếu cả hai, lệnh init sẽ in bảng hướng dẫn cài đặt theo từng hệ điều hành rồi dừng lại; hệ thống không tự ý cài đặt phần mềm ngoài)*.

### (3) Các bước thực hiện đánh số với lệnh copy được

#### Bước 1: Mở terminal tại thư mục gốc repository dự án của bạn

#### Bước 2: Chạy lệnh khởi tạo một bước

- **macOS / Linux:**
  ```bash
  # Khởi tạo mặc định một bước đầy đủ:
  node core/bin/treecraft.js init

  # Tùy biến tên website và tiền tố database:
  node core/bin/treecraft.js init --name "Celphones Portal" --db-prefix "celphones"

  # Chỉ định tài khoản admin riêng:
  node core/bin/treecraft.js init --name "Alpha Corp" --admin-user "superadmin"

  # Chạy thử nghiệm an toàn không ghi đĩa/DB (Dry-Run):
  node core/bin/treecraft.js init --dry-run

  # Bỏ qua nạp nội dung mẫu (chỉ nạp cấu trúc):
  node core/bin/treecraft.js init --no-sample

  # Bỏ qua bước kết nối cơ sở dữ liệu:
  node core/bin/treecraft.js init --skip-db
  ```

- **Windows (PowerShell):**
  ```powershell
  # Khởi tạo mặc định:
  node .\core\bin\treecraft.js init

  # Tùy biến tên dự án:
  node .\core\bin\treecraft.js init --name "Celphones Portal" --db-prefix "celphones"
  ```

- **Windows (Command Prompt / CMD):**
  ```cmd
  node core\bin\treecraft.js init --name "Celphones Portal" --db-prefix "celphones"
  ```

### (4) Kết quả mong đợi
Màn hình console hiển thị tiến trình 8 bước với biểu tượng trạng thái rõ ràng, kết thúc bằng bảng tóm tắt và hộp mật khẩu Admin bảo mật:
```text
🚀 [treecraft init] Bắt đầu khởi tạo dự án: "Celphones Portal"...
📁 Thư mục đích : /path/to/my-project/site
📦 Starter mẫu  : corporate

  🔍 [Bước 1/8] Kiểm tra tiền điều kiện hệ thống (Preflight Checks)...
  ✅ [Bước 1/8] Tiền điều kiện hợp lệ (Node.js, Git, Core, Docker/Mongo).
  📁 [Bước 2/8] Khởi tạo khung thư mục site/ từ starter corporate ...
  ✅ [Bước 2/8] Khung thư mục và tệp cấu hình đã sẵn sàng.
  🐳 [Bước 3/8] Thiết lập cơ sở dữ liệu MongoDB Local...
  ✅ [Bước 3/8] Kết nối MongoDB thành công.
  🌱 [Bước 4/8] Khởi tạo dữ liệu nền tảng hệ thống (Core Migration & Seeds)...
  ✅ [Bước 4/8] Nạp dữ liệu nền tảng hệ thống hoàn tất.
  📦 [Bước 5/8] Đồng bộ hóa Serialization YAML (Templates → Layouts → Placeholders → Renderings → Contents)...
  ✅ [Bước 5/8] Đồng bộ cấu trúc và nội dung mẫu hoàn tất.
  🔑 [Bước 6/8] Thiết lập tài khoản quản trị viên Admin...
  🚀 [Bước 7/8] Xuất bản (Publish) nội dung mẫu sang Web Store...
  ✅ [Bước 7/8] Đã xuất bản trang Home và About Us sang Web DB.
  🩺 [Bước 8/8] Kiểm tra chẩn đoán tính toàn vẹn (Mini Doctor)...

============================================================
🎉 KHỞI TẠO DỰ ÁN SITE THÀNH CÔNG: "Celphones Portal"!
============================================================
📊 Thống kê tài nguyên đã nạp vào CMS:
   - Templates   : 12 mục
   - Layouts     : 2 mục
   - Renderings  : 5 mục
   - Contents    : 3 mục (Home, About Us)

┌────────────────────────────────────────────────────────────┐
│ 🔐 TÀI KHOẢN QUẢN TRỊ VIÊN CMS (CHỈ HIỂN THỊ MỘT LẦN)      │
│ Tên đăng nhập: admin                                       │
│ Mật khẩu     : k9Ax7M2pL9qW4zRt                            │
│ Lưu ý        : Bạn bắt buộc phải đổi mật khẩu ở lần đăng   │
│                nhập đầu tiên tại: /admin                   │
└────────────────────────────────────────────────────────────┘

👉 Các bước tiếp theo:
   1. Di chuyển vào thư mục dự án: cd site
   2. Khởi chạy máy chủ phát triển: node core/bin/treecraft.js dev
   3. Truy cập website công khai:  http://localhost:3000/
   4. Đăng nhập trang quản trị:    http://localhost:3000/admin

⚠️  LƯU Ý QUẢN TRỊ MÃ NGUỒN GIT:
   - Hãy commit toàn bộ thư mục site/ vào kho mã nguồn của bạn.
   - TUYỆT ĐỐI KHÔNG commit các file chứa mật khẩu bí mật: .env, .env.development
```

### (5) Cách kiểm tra thành công
1. **Kiểm tra Website Công Khai:**
   - Chạy lệnh: `node core/bin/treecraft.js dev`
   - Mở trình duyệt truy cập: `http://localhost:3000/` và `http://localhost:3000/about-us`.
   - Cả hai trang đều phải tải nhanh và trả về mã HTTP 200.
2. **Kiểm tra Trang Quản Trị (Admin CMS):**
   - Mở trình duyệt truy cập: `http://localhost:3000/admin`.
   - Đăng nhập bằng tài khoản `admin` và mật khẩu ngẫu nhiên vừa được in ra.
   - Xác nhận hệ thống yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
3. **Kiểm tra Chẩn Đoán Tính Toàn Vẹn:**
   - Chạy lệnh: `node core/bin/treecraft.js doctor`
   - Kết quả phải đạt 10/10 bài kiểm tra (10 PASSED, 0 FAILED).

### (6) Lỗi thường gặp và cách xử lý
- **Lỗi `[Preflight Error] Thư mục hiện tại không nằm trong một Git repository`:**
  - *Nguyên nhân:* Thư mục dự án chưa khởi tạo Git.
  - *Cách xử lý:* Chạy lệnh `git init` tại thư mục dự án rồi chạy lại lệnh `init`.
- **Lỗi `[Preflight Error] Không tìm thấy Docker hoặc dịch vụ MongoDB local đang hoạt động`:**
  - *Nguyên nhân:* Docker daemon chưa được bật và máy tính chưa chạy MongoDB.
  - *Cách xử lý:* Bật ứng dụng Docker Desktop trên máy tính của bạn, hoặc khởi động service MongoDB local (`brew services start mongodb-community` trên macOS hoặc `sudo systemctl start mongod` trên Linux).
- **Lỗi `Starter "..." không được hỗ trợ`:**
  - *Nguyên nhân:* Cung cấp tên starter khác ngoài starter chuẩn `corporate`.
  - *Cách xử lý:* Bỏ cờ `--starter` để sử dụng mặc định starter `corporate`.
- **Lỗi xung đột cổng 27017:**
  - *Nguyên nhân:* Một container MongoDB của dự án khác đang chiếm cổng 27017.
  - *Cách xử lý:* Chạy lệnh `treecraft db:down` ở thư mục dự án cũ, hoặc truyền cờ `--db-uri <uri>` để trỏ tới database khác.

### (7) Cảnh báo và rủi ro
- **Bảo Mật Mật Khẩu Admin:** Mật khẩu ngẫu nhiên chỉ xuất hiện duy nhất 1 lần trên màn hình console khi chạy lệnh `init`. Hãy lưu lại ngay và đổi mật khẩu khi đăng nhập lần đầu. Mật khẩu không bao giờ được ghi ra bất kỳ file log nào.
- **Bảo Vệ Biến Môi Trường:** Thư mục `site/.gitignore` đã tự động chặn các file `.env` và `.env.*`. Tuyệt đối không xóa bỏ quy tắc này hoặc đưa file `.env.development` lên kho mã nguồn Git công khai.
- **Tính Bất Biến Của Core:** Không bao giờ sửa đổi code trong thư mục `core/`. Mọi mã nguồn EJS, CSS, script và dữ liệu riêng phải đặt hoàn toàn trong thư mục `site/`.

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

