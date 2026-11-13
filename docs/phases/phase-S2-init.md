---
phase: S2
name: Lệnh Khởi Tạo Dự Án Mới Một Bước (treecraft init - One-Step Bootstrap)
depends_on: [S1]
status: Hoàn thành
start_date: 2026-11-13
end_date: 2026-11-13
lead: Senior Software Architect / Tech Lead
---

# GIAI ĐOẠN S2: LỆNH KHỞI TẠO DỰ ÁN MỚI MỘT BƯỚC (`treecraft init` LÀM LẠI)

## 1. MỤC TIÊU & TỔNG QUAN
Cung cấp lệnh CLI `treecraft init` chạy một bước duy nhất ("One-Step Bootstrap") trên một repository mới (với Core tích hợp qua Git Submodule: `git submodule add <core> core`).
Chỉ với một câu lệnh:
```bash
node core/bin/treecraft.js init
```
Hệ thống tự động thực thi tuần tự và hoàn tất trọn vẹn:
1. Kiểm tra tiền điều kiện (Node.js, Git repo, Core hợp lệ, Docker/Mongo local).
2. Tạo khung thư mục `site/` từ starter `corporate` (views, public, serialization, config, .env.development, package.json, .gitignore).
3. Tự động dựng MongoDB local qua Docker (`site/docker-compose.dev.yml`) hoặc kết nối Mongo local đang chạy.
4. Migrate và nạp dữ liệu hệ thống (System Templates, Roles, Ngôn ngữ, System root items).
5. Đồng bộ toàn bộ serialization YAML (`Templates → Layouts → Placeholders → Renderings → Contents`) với kiểm tra dry-run ngầm trước khi ghi thật.
6. Sinh tài khoản Admin với mật khẩu ngẫu nhiên an toàn, chỉ in 1 lần duy nhất ra console và bắt buộc đổi ở lần đăng nhập đầu tiên.
7. Tự động xuất bản (publish) nội dung mẫu sang Web Database để route `/` và `/about-us` hoạt động ngay lập tức.
8. Kiểm tra cuối (mini doctor) và in bảng hướng dẫn các bước tiếp theo (`treecraft start`, URL `/admin`, lưu ý git commit).

Toàn bộ quy trình có tính **Idempotent** (chạy lại an toàn, bổ sung phần thiếu mà không ghi đè dữ liệu đã chỉnh sửa), dừng ngay khi gặp lỗi ở bất kỳ bước nào kèm hướng dẫn khắc phục cụ thể.

---

## 2. BẢNG SO SÁNH HIỆN TRẠNG, THAY ĐỔI VÀ RỦI RO

| Hạng mục | Hiện trạng (S2 cũ) | Sau khi làm lại S2 (One-Step Bootstrap) | Rủi ro & Giải pháp phòng ngừa |
|:---|:---|:---|:---|
| **Trải nghiệm khởi tạo** | Phải chạy `init`, sau đó chạy `seed`, cấu hình Mongo thủ công. | Đúng **1 lệnh duy nhất** `node core/bin/treecraft.js init`, mọi thứ từ file đến DB và dữ liệu mẫu sẵn sàng 100%. | Rủi ro: Docker/Mongo chưa bật. Giải pháp: Tự bật Docker Compose hoặc dùng Mongo local; thiếu thì in hướng dẫn cài đặt theo từng OS rồi dừng. |
| **Cơ sở dữ liệu** | Phụ thuộc Docker Compose ở thư mục Core. | Sinh riêng `site/docker-compose.dev.yml` cho dự án site, hỗ trợ `treecraft db:up\|db:down\|db:status`. | Rủi ro: Xung đột port 27017. Giải pháp: Kiểm tra kết nối trước, nếu có sẵn Mongo local thì tái sử dụng; hỗ trợ `--db-uri`. |
| **Bảo mật Admin** | Mật khẩu cố định `admin123`. | Sinh mật khẩu ngẫu nhiên mạnh (16 ký tự), chỉ in 1 lần ra console, bắt buộc đổi mật khẩu ở lần đăng nhập đầu (`mustChangePassword: true`). | Rủi ro: Mật khẩu bị lọt vào log/file. Giải pháp: Tuyệt đối không ghi ra file log, .env hay tài liệu markdown. |
| **Tính Idempotent** | Gặp lỗi khi chạy lại trên thư mục đã có. | Tự động chuyển sang chế độ bổ sung (Incremental Mode): không ghi đè cấu trúc hay nội dung đã sửa, bù đắp phần thiếu. | Rủi ro: Ghi đè file người dùng. Giải pháp: Chỉ ghi file chưa có; hỗ trợ `--dry-run` để duyệt trước. |
| **Độ sẵn sàng của Website** | Chạy server xong trang chủ bị lỗi nếu chưa publish. | Tự động publish nhánh `/root/content` sang Web DB; website `/` và `/about-us` trả về HTTP 200 ngay sau khi chạy `start`. | Rủi ro: Publish lỗi do thiếu rendering. Giải pháp: Sync serialization nghiêm ngặt theo đúng thứ tự topo trước khi publish. |

---

## 3. CHECKLIST CÔNG VIỆC CHI TIẾT (TASKS)

- [x] **Task S2.1: Triển khai Bước 1 — Kiểm Tra Tiền Điều Kiện (Preflight Checks)**
  - [x] Kiểm tra Node.js phiên bản >= 20.0.0.
  - [x] Kiểm tra đang nằm trong một Git repository (`.git` tồn tại).
  - [x] Xác thực thư mục `core/` hợp lệ (đọc `coreApiVersion` hoặc `package.json` của Core).
  - [x] Kiểm tra trạng thái thư mục `site/`: Chưa có thì tạo mới, đã có thì kích hoạt chế độ bổ sung (Incremental).
  - [x] Kiểm tra tính sẵn sàng của Docker daemon hoặc MongoDB local:
    - [x] Nếu không có cả hai: In bảng hướng dẫn cài đặt cho macOS (`brew`), Windows (`docker desktop`), Linux (`apt/systemctl`) rồi dừng lại.
    - [x] Tuyệt đối không tự ý cài đặt phần mềm hệ thống.

- [x] **Task S2.2: Triển khai Bước 2 — Khởi Tạo Khung Thư Mục `site/` Từ Starter `corporate`**
  - [x] Tạo file `site.config.js`: Tên dự án mặc định lấy theo tên thư mục repository/cha, hỗ trợ ghi đè qua `--name`.
  - [x] Sinh file `.env.development`:
    - [x] MongoDB local URI: `mongodb://127.0.0.1:27017/${dbPrefix}_master?replicaSet=rs0`
    - [x] `MONGO_URI_WEB=mongodb://127.0.0.1:27017/${dbPrefix}_web?replicaSet=rs0`
    - [x] Khóa bí mật `SESSION_SECRET` và `BACKUP_ENCRYPTION_KEY` ngẫu nhiên 32 bytes Hex.
    - [x] `CLOUDINARY_ROOT_FOLDER=${dbPrefix}_dev`.
    - [x] Để trống khoá Cloudinary kèm cảnh báo rõ ràng.
  - [x] Sao chép `.env.staging.example` và `.env.production.example`.
  - [x] Sao chép toàn bộ `views/`, `public/`, `serialization/` (bao gồm `Contents/` mẫu) từ `starter/corporate/`.
  - [x] Tạo file `site/package.json` tối thiểu và file `site/.gitignore` chuẩn.
  - [x] Không ghi đè các file đã tồn tại nếu đang chạy ở chế độ bổ sung.

- [x] **Task S2.3: Triển khai Bước 3 — Dựng Cơ Sở Dữ Liệu MongoDB Local Cho Site**
  - [x] Tạo template `starter/corporate/docker-compose.dev.yml` và copy sang `site/docker-compose.dev.yml`:
    - [x] Image `mongo:8.0` (hoặc `mongo:7.0`).
    - [x] Single-node replica set `rs0` tự động `rs.initiate()`.
    - [x] Volume có tên: `${dbPrefix}_mongodb_data`.
    - [x] Chỉ bind loopback interface `127.0.0.1:27017:27017`.
    - [x] Healthcheck và cơ chế chờ container sẵn sàng với timeout (45 giây).
  - [x] Khởi động container: `docker compose -f site/docker-compose.dev.yml up -d`.
  - [x] Nếu Docker vắng mặt nhưng cổng 27017 đã có MongoDB local đang chạy thì tự động dùng MongoDB local đó.
  - [x] Hỗ trợ cờ `--db-uri <uri>` để chỉ định MongoDB URI local khác; `--skip-db` để bỏ qua.

- [x] **Task S2.4: Triển khai Bước 4 — Migrate & Nạp Dữ Liệu Nền Tảng (Core Seed)**
  - [x] Nạp các Roles hệ thống: `Administrator`, `Author`, `Editor`, `Approver`.
  - [x] Nạp ngôn ngữ mặc định (`vi`, `en`).
  - [x] Nạp System Templates từ Core (`/root/templates/System`).
  - [x] Khởi tạo các nhánh phân cấp hệ thống gốc (`/root`, `/root/content`, `/root/templates`, `/root/layouts`, `/root/renderings`, `/root/placeholders`, `/root/media-library`, `/root/system`).
  - [x] Nạp ứng dụng Launchpad tiêu chuẩn.

- [x] **Task S2.5: Triển khai Bước 5 — Đồng Bộ Serialization YAML Theo Thứ Tự Chuẩn**
  - [x] Bổ sung thư mục `starter/corporate/serialization/Contents/` chứa 2 trang mẫu: `home.yml` và `about-us.yml`.
  - [x] Thứ tự đồng bộ bắt buộc: `Templates → Layouts → Placeholders → Renderings → Contents`.
  - [x] Cơ chế Dry-run ngầm trước: Kiểm tra cú pháp YAML, dừng ngay nếu lỗi và in `file:dòng:lỗi`.
  - [x] Ghi thật vào database: Chế độ `overwrite` cho 4 section cấu trúc, chế độ `createOnly` cho section `Contents`.
  - [x] Kiểm tra phụ thuộc và cảnh báo nếu thiếu media Cloudinary (không dừng chương trình).
  - [x] Hỗ trợ cờ `--no-sample` để bỏ qua sync `Contents`.

- [x] **Task S2.6: Triển khai Bước 6 — Sinh Tài Khoản Quản Trị Viên An Toàn**
  - [x] Bổ sung trường `mustChangePassword: { type: Boolean, default: false }` vào `User` model.
  - [x] Sinh mật khẩu ngẫu nhiên mạnh (16 ký tự an toàn).
  - [x] **Chỉ in mật khẩu 1 lần duy nhất ra màn hình console** trong khung viền nổi bật; không ghi vào file log hay markdown.
  - [x] Gán cờ `mustChangePassword: true` cho User admin; cập nhật Auth logic yêu cầu đổi mật khẩu ở lần đăng nhập đầu.
  - [x] Hỗ trợ cờ `--admin-user <tên>` (mặc định: `admin`).

- [x] **Task S2.7: Triển khai Bước 7 — Xuất Bản Nội Dung Mẫu (Automatic Publish)**
  - [x] Trừ khi có cờ `--no-sample` hoặc `--no-publish`:
  - [x] Kích hoạt `publishService.publishItem` để xuất bản toàn bộ nhánh `/root/content` (Home và About Us) sang Web DB (`PublishedItem`).
  - [x] Đảm bảo route `/` và `/about-us` sẵn sàng trả về HTTP 200.

- [x] **Task S2.8: Triển khai Bước 8 — Kiểm Tra Cuối (Mini Doctor) & In Bảng Hướng Dẫn**
  - [x] Kiểm tra kết nối cả hai DB Master và Web.
  - [x] Đếm số item theo từng section trong hệ thống.
  - [x] Kiểm tra sự tồn tại của file view EJS ứng với `viewPath` của Layout và Rendering.
  - [x] Kiểm tra route `/` resolve được về Home Item.
  - [x] In bảng tóm tắt trạng thái và các bước tiếp theo (`treecraft start`, URL `/admin`, lưu ý git commit).

- [x] **Task S2.9: Bổ Sung Các Lệnh Phụ Trợ & Hỗ Trợ Idempotent / Dry-Run**
  - [x] Thêm các lệnh: `treecraft db:up`, `treecraft db:down`, `treecraft db:status`.
  - [x] Hỗ trợ cờ `--dry-run`: Liệt kê mọi việc sẽ làm mà không thay đổi bất kỳ file hay DB nào.
  - [x] Chặn starter khác: Từ chối nếu `site.config.js` khai báo `starter` khác ngoài `corporate`.

- [x] **Task S2.10: Cập Nhật Tài Liệu Hướng Dẫn `docs/guides/core-and-site.md`**
  - [x] Cập nhật toàn diện tài liệu theo đúng mẫu 7 mục:
    - [x] 1. Mục đích / Khi nào sử dụng.
    - [x] 2. Điều kiện trước (Node.js, Docker/Mongo).
    - [x] 3. Các bước thực hiện đánh số kèm lệnh copy-paste (Windows CMD/PowerShell, Linux, macOS).
    - [x] 4. Kết quả mong đợi trên màn hình và cấu trúc thư mục sinh ra.
    - [x] 5. Cách kiểm tra thành công (doctor, truy cập `/admin` và `/`).
    - [x] 6. Các lỗi thường gặp và cách xử lý (port bị chiếm, Docker chưa chạy, thiếu Git repo).
    - [x] 7. Cảnh báo và rủi ro (bảo mật file `.env`, mật khẩu admin, cấm sửa mã nguồn `core/`).

- [x] **Task S2.11: Xây Dựng Bộ Kiểm Thử Toàn Diện (Jest Tests)**
  - [x] Test kiểm tra tiền điều kiện (dừng đúng khi thiếu Node, thiếu repo, thiếu Docker/Mongo).
  - [x] Test chạy lại an toàn không ghi đè (Idempotent).
  - [x] Test cờ `--dry-run` không ghi file và DB.
  - [x] Test đồng bộ serialization theo đúng thứ tự topo và dừng khi YAML lỗi.
  - [x] Test mật khẩu admin không lọt vào log, cờ `mustChangePassword: true`.
  - [x] Test publish mẫu làm cho `/` và `/about-us` trả về 200.
  - [x] Test từ chối khi starter không phải `corporate`.
  - [x] Test E2E: Khởi tạo từ repo trống + core → init → start → kiểm tra `/`, `/about-us`, `/admin`.

---

## 4. DEFINITION OF DONE (DOD) CHO GIAI ĐOẠN S2 (LÀM LẠI)
1. **Một Lệnh Duy Nhất Hoàn Tất:** Chạy `node core/bin/treecraft.js init` trên một repository mới hoàn tất trọn vẹn 8 bước mà không cần thêm bất kỳ thao tác thủ công nào.
2. **Khởi Động Thành Công Ngay Lập Tức:** Chạy `treecraft start` hoặc `npm start`, website công khai trả về HTTP 200 tại `/` và `/about-us`, giao diện Admin CMS đăng nhập được tại `/admin` bằng mật khẩu ngẫu nhiên đã in.
3. **Bảo Mật Cao Cấp:** Mật khẩu admin không ghi ra log/file, admin bắt buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên.
4. **Core Bất Biến 100%:** Quá trình `init` không tạo hay sửa bất kỳ file nào trong thư mục `core/`.
5. **Idempotent & Xử Lý Lỗi Tường Minh:** Chạy lại nhiều lần không sinh lỗi, không ghi đè; lỗi ở bước nào dừng tại đó kèm hướng dẫn xử lý rõ ràng.
6. **Bộ Lệnh Phụ Trợ Đầy Đủ:** Các lệnh `db:up`, `db:down`, `db:status`, `doctor`, `where`, `start`, `dev` hoạt động ổn định trên cả macOS, Linux, Windows.
7. **Tài Liệu & Test Đầy Đủ:** `docs/guides/core-and-site.md` đủ 7 mục; 100% test Jest vượt qua; ESLint không có lỗi; tuyệt đối không commit git theo quy tắc.
