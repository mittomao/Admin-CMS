# DEC-057: Cơ Chế Khởi Tạo Dự Án Mới Một Bước (One-Step Init Scaffolding & DB Bootstrap)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày:** 2026-11-13
- **Tác giả:** Senior Software Architect / Tech Lead
- **Giai đoạn liên quan:** GĐ S2 (Lệnh `treecraft init` một bước làm lại)
- **Tài liệu liên quan:** [DEC-052](DEC-052-environment-database-separation-and-dbguard.md), [DEC-053](DEC-053-section-based-yaml-serialization-and-sync.md), [DEC-054](DEC-054-shortened-serialization-directory-layout.md), [DEC-056](DEC-056-core-and-site-separation-and-sitepaths.md)

---

## 1. BỐI CẢNH (CONTEXT)
Trong mô hình kiến trúc phân tách Core (Bất biến) và Site (Dự án riêng) theo DEC-056, lập trình viên tạo mới một repository cho dự án và tích hợp Core thông qua Git Submodule (`git submodule add <core-repo> core`). 
Trước đây, sau khi khởi tạo khung thư mục `site/`, lập trình viên phải thực hiện thủ công nhiều bước rời rạc:
1. Bật Docker MongoDB thủ công ở thư mục core hoặc host.
2. Chạy `treecraft seed` để nạp tài khoản admin và roles.
3. Chạy các lệnh migrate và đồng bộ serialization.
4. Tự chạy publish để đưa dữ liệu mẫu sang Web Store.

Quy trình nhiều bước này dễ dẫn tới sai sót (quên seed, xung đột port, thiếu quyền admin, trang chủ bị 404 do chưa publish). Mục tiêu của GĐ S2 (làm lại) là cung cấp trải nghiệm **"Zero Configuration, One-Step Bootstrap"**: chỉ với một lệnh duy nhất `node core/bin/treecraft.js init`, toàn bộ hệ thống từ cấu trúc thư mục, biến môi trường, Docker MongoDB của site, migrate/seed, sync serialization YAML, mật khẩu admin ngẫu nhiên an toàn, đến publish nội dung mẫu `/` và `/about-us` đều được thực thi tự động, dừng ngay lập tức khi phát sinh lỗi và có khả năng chạy lại an toàn (Idempotent).

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)

### 2.1. Chuỗi Quy Trình 8 Bước Nghiêm Ngặt Của Lệnh `treecraft init`
Lệnh `treecraft init` sẽ thực thi tuần tự 8 bước với nguyên tắc: **dừng ngay khi gặp lỗi ở bất kỳ bước nào, in rõ nguyên nhân và hướng dẫn xử lý**, hỗ trợ in tiến độ trực quan:

1. **Bước 1 — Kiểm Tra Tiền Điều Kiện (Read-Only Preflight Checks):**
   - Kiểm tra phiên bản Node.js (yêu cầu Node.js >= 20.0.0 LTS).
   - Kiểm tra môi trường repository: Thư mục thực thi phải nằm bên trong một Git repository (`.git`).
   - Kiểm tra Core hợp lệ: Đọc `package.json` của Core để xác thực `coreApiVersion`.
   - Kiểm tra trạng thái `site/`: Nếu chưa tồn tại, tạo mới; nếu đã tồn tại, tự động chuyển sang chế độ bổ sung (Incremental Mode), tuyệt đối không ghi đè file của người dùng trừ khi có cờ `--force`.
   - Kiểm tra tính sẵn sàng của Docker hoặc MongoDB local:
     - Thử nghiệm Docker daemon (`docker info`). Nếu Docker không khả dụng, thử kết nối tới MongoDB local trên cổng `27017`.
     - Nếu cả hai đều vắng mặt: **Không tự ý cài phần mềm hệ thống**, in bảng hướng dẫn cài đặt chi tiết cho từng hệ điều hành (macOS, Windows, Linux) và dừng lại.

2. **Bước 2 — Khởi Tạo Khung Dự Án `site/` Từ Starter `corporate`:**
   - Sinh file cấu hình `site.config.js` với tên dự án mặc định lấy từ thư mục repo (hoặc ghi đè qua `--name`).
   - Sinh file biến môi trường `.env.development` với `SESSION_SECRET` và `BACKUP_ENCRYPTION_KEY` ngẫu nhiên 32 bytes Hex, cấu hình URI Mongo local qua `dbGuard`. Để trống các khóa Cloudinary kèm cảnh báo rõ ràng.
   - Sao chép các tệp `.env.staging.example`, `.env.production.example`.
   - Sao chép toàn bộ cây thư mục `views/`, `public/`, `serialization/` (bao gồm cả `Contents/` mẫu) từ `core/starter/corporate/`.
   - Sinh file `package.json` tối thiểu và file `.gitignore` chuẩn (loại trừ `.env.*` thật, `backups/`, `node_modules/`).
   - Trong chế độ bổ sung: Giữ nguyên các file đã tồn tại.

3. **Bước 3 — Dựng Cơ Sở Dữ Liệu MongoDB Local Cho Site:**
   - Ưu tiên Docker: Tạo file `site/docker-compose.dev.yml` sử dụng MongoDB official image với single-node replica set (`rs0`), bind loopback `127.0.0.1:27017`, volume có tên riêng `${dbPrefix}_mongodb_data`.
   - Tự động kích hoạt container (`docker compose -f site/docker-compose.dev.yml up -d`) và chờ container đạt trạng thái `healthy` (timeout 45 giây).
   - Nếu Docker không có nhưng MongoDB local đang chạy, sử dụng MongoDB local đó.
   - Hỗ trợ cờ `--db-uri <uri>` để chỉ định URI local khác; hỗ trợ `--skip-db` để bỏ qua. Tuyệt đối không cho phép cờ kết nối cloud trong lệnh init.

4. **Bước 4 — Migrate & Khởi Tạo Dữ Liệu Nền Tảng (Core Seed):**
   - Nạp các Roles hệ thống: `Administrator`, `Author`, `Editor`, `Approver`.
   - Nạp các ngôn ngữ mặc định (`vi`, `en`).
   - Nạp toàn bộ System Templates từ Core (`/root/templates/System`).
   - Khởi tạo các nhánh phân cấp hệ thống gốc (`/root`, `/root/content`, `/root/templates`, `/root/layouts`, `/root/renderings`, `/root/placeholders`, `/root/media-library`, `/root/system`).
   - Nạp ứng dụng Launchpad tiêu chuẩn.

5. **Bước 5 — Đồng Bộ Hoá Toàn Bộ Serialization YAML (Section Sync Engine):**
   - Thứ tự đồng bộ bắt buộc theo đồ thị phụ thuộc topo:
     $$\text{Templates} \longrightarrow \text{Layouts} \longrightarrow \text{Placeholders} \longrightarrow \text{Renderings} \longrightarrow \text{Contents}$$
   - Thực hiện **Dry-run ngầm**: Kiểm tra cú pháp YAML, kiểm tra tính toàn vẹn tham chiếu. Nếu có lỗi, dừng ngay và in chính xác `file:dòng:lỗi`.
   - Khi Dry-run vượt qua: Thực hiện ghi thật vào database với chế độ `overwrite` cho các mục cấu trúc (`Templates`, `Layouts`, `Placeholders`, `Renderings`) và chế độ `createOnly` cho mục `Contents` (không ghi đè nội dung người dùng đã chỉnh sửa).
   - Kiểm tra và cảnh báo nếu phát hiện thiếu asset media Cloudinary (không làm dừng chương trình).
   - Hỗ trợ cờ `--no-sample` để bỏ qua việc sync `Contents`.

6. **Bước 6 — Tạo Tài Khoản Quản Trị Viên An Toàn (Secure Admin Generation):**
   - Sinh mật khẩu ngẫu nhiên có độ phức tạp cao (16 ký tự bao gồm chữ hoa, chữ thường, số).
   - **Chỉ in mật khẩu một lần duy nhất ra màn hình console** trong khung thông báo nổi bật. Tuyệt đối không ghi mật khẩu vào file log, file `.env` hay báo cáo markdown.
   - Gán cờ `mustChangePassword: true` trên tài khoản User, bắt buộc quản trị viên phải đổi mật khẩu ngay trong lần đăng nhập đầu tiên tại `/admin`.
   - Hỗ trợ cờ `--admin-user <tên>` (mặc định là `admin`).

7. **Bước 7 — Xuất Bản Nội Dung Mẫu (Automatic Sample Publish):**
   - Trừ khi người dùng truyền cờ `--no-sample` hoặc `--no-publish`:
   - Kích hoạt dịch vụ `publishService.publishItem` để xuất bản toàn bộ nhánh nội dung `/root/content` (bao gồm trang Home và About Us) từ Master DB sang Web DB (`PublishedItem`).
   - Đảm bảo ngay sau khi `init` xong, website công khai tại `/` và `/about-us` sẽ phản hồi mã HTTP 200 ngay lập tức.

8. **Bước 8 — Kiểm Tra Sau Khởi Tạo & Hướng Dẫn Kế Tiếp (Mini Doctor & Next Steps):**
   - Kiểm tra kết nối cả hai database Master và Web.
   - Thống kê tổng số item theo từng section trong CMS.
   - Xác thực sự tồn tại của các file view EJS tương ứng với `viewPath` của mọi Layout và Rendering.
   - Xác thực route `/` phân giải thành công tới Home Item.
   - In bảng tóm tắt kết quả kiểm tra thành công.
   - In hướng dẫn các bước tiếp theo: lệnh `npm start` / `treecraft start`, URL truy cập `/admin`, nhắc nhở commit thư mục `site/` vào git và **tuyệt đối không commit các file `.env.*`**.

---

### 2.2. Tính Bổ Sung & Chống Ghi Đè (Idempotent Execution)
- Khi chạy lại `treecraft init` trên một thư mục `site/` đã tồn tại:
  - Hệ thống tự động nhận diện chế độ Incremental.
  - Không ghi đè các file cấu hình `site.config.js` hay `.env.*`.
  - Không ghi đè các Item Content đã có trên database.
  - Chỉ bổ sung những template, rendering hoặc dữ liệu nền tảng còn thiếu.
- Cờ `--dry-run`: Chạy thử toàn bộ quy trình, liệt kê chi tiết các hành động sẽ được thực hiện mà không làm biến đổi hệ thống tệp và database.

---

### 2.3. Bổ Sung Các Lệnh Phụ Trợ Quản Trị Container (`db:*`)
Bổ sung các lệnh quản trị Docker MongoDB riêng cho Site vào CLI `treecraft`:
- `treecraft db:up`: Khởi động container MongoDB theo `site/docker-compose.dev.yml`.
- `treecraft db:down`: Dừng container MongoDB của Site.
- `treecraft db:status`: Xem trạng thái hoạt động của container MongoDB.
- `treecraft where`: In thông tin đường dẫn Core, Site, Views, Serialization, Database.
- `treecraft doctor`: Chạy chẩn đoán toàn diện tính toàn vẹn hệ thống.
- `treecraft start` / `treecraft dev`: Khởi chạy ứng dụng Web và Admin.

---

## 3. HỆ QUẢ & TÁC ĐỘNG (CONSEQUENCES)
- **Ưu điểm:**
  - Trải nghiệm khởi tạo dự án mượt mà, đúng chuẩn một bước ("One-Step Bootstrap").
  - An toàn bảo mật: Mật khẩu admin ngẫu nhiên không lưu vết, khóa session sinh chuẩn cryptographic.
  - Website chạy được ngay lập tức với trang chủ trả về HTTP 200.
  - Phù hợp 100% với kiến trúc Core bất biến và mô hình Git Submodule.
- **Rủi ro & Biện pháp phòng ngừa:**
  - Xung đột cổng 27017 nếu máy phát triển đã chạy sẵn MongoDB service: Lệnh init kiểm tra kết nối, nếu port 27017 phản hồi sẵn sàng thì tự động sử dụng mà không cần bật lại container mới, hoặc hướng dẫn dùng `--db-uri`.

