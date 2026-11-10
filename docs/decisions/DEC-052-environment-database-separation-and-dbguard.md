# DEC-052: Tách Môi Trường Database (Local / Cloud) & Chốt Chặn An Toàn (dbGuard)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày quyết định:** 2026-11-10
- **Phạm vi:** GĐ E1, Architecture, Database Security, Environment Separation, Disaster Prevention
- **Người đề xuất:** Antigravity Tech Lead
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề

Hệ thống Treecraft CMS hiện đang kết nối trực tiếp vào MongoDB Atlas Cloud (`admin_cms`) thông qua một biến `MONGO_URI` duy nhất. Mặc dù các tính năng Backup & Restore (GĐ K1) và Serialization (GĐ 11) đã hoàn thành, quá trình phát triển (development), chạy thử nghiệm (testing), chạy seed dữ liệu hoặc chạy migration script trên máy lập trình viên vẫn tiềm ẩn rủi ro rất lớn:
1. **Nguy cơ ghi nhầm vào dữ liệu thật (Production/Staging):** Nếu một lập trình viên chạy `npm run seed`, `migrate:*` hoặc `seed:reset` khi đang để biến môi trường trỏ cloud, toàn bộ dữ liệu trên cloud sẽ bị ghi đè hoặc xáo trộn.
2. **Kỷ luật cá nhân là không đủ:** Chỉ dựa vào ý thức kiểm tra file `.env` trước khi gõ lệnh luôn có xác suất sai sót con người. Cần có chốt chặn kỹ thuật bằng mã nguồn (**`dbGuard`**), chủ động từ chối kết nối hoặc chặn lệnh nguy hiểm ngay từ khi tiến trình khởi động.
3. **Quy tắc bất biến về tên Database & Collection:** Nhằm bảo đảm tính nhất quán 100% giữa các môi trường, tên database (`admin_cms`) và toàn bộ 19 collections ở local **phải giống hệt** trên cloud (không dùng các hậu tố `_dev`, `_uat`, `_prod`). Do đó, chốt chặn an toàn không thể dựa vào tên DB mà phải dựa vào **phân loại Host** và **Fingerprint môi trường**.

---

## 2. Quyết định Kỹ thuật

### 2.1. Mô hình Môi trường 3 Cấp (Strict 3-Tier Environments)
Hệ thống chỉ chấp nhận đúng 3 giá trị cho biến `APP_ENV`:
- **`development`**: Sử dụng MongoDB local chạy bằng Docker container (`127.0.0.1:27017`), Cloudinary thư mục dev riêng biệt (`AdminCMS-dev`), cache site tắt, Basic Auth tắt, cho phép hiển thị lỗi chi tiết.
- **`staging`**: Sử dụng MongoDB cloud (cluster kiểm thử), Cloudinary thư mục `AdminCMS-uat`, Basic Auth bật (nếu có), ẩn stack trace chi tiết.
- **`production`**: Sử dụng MongoDB cloud production chính thức, bắt buộc kết nối TLS (`mongodb+srv`), Cloudinary thư mục chính thức (`AdminCMS`), cookie `secure`, HSTS bật, ẩn stack trace.

> [!IMPORTANT]
> - **Không có môi trường `test`:** Tuyệt đối không dùng `APP_ENV=test` hay `.env.test`.
> - Giá trị `APP_ENV` không hợp lệ (`develop`, `dev`, `test`, `prod`...) sẽ bị hệ thống **từ chối khởi động lập tức** kèm thông báo hướng dẫn sửa giá trị đúng.
> - `APP_ENV` quyết định toàn bộ logic nạp cấu hình và kết nối cơ sở dữ liệu. `NODE_ENV` chỉ phục vụ các thư viện bên ngoài (`development` tương ứng `development`; `staging`/`production` tương ứng `production`).

### 2.2. Quy tắc Nạp Tệp Cấu hình (Base .env & Layered Override)
- **Tệp mẫu chuẩn hoá:** Duy trì duy nhất **một tệp `.env.example`** chứa toàn bộ các biến cấu hình của Treecraft CMS với giá trị mặc định cho Local Development.
- **Tệp cấu hình chính (`.env`):** Đóng vai trò là Base Configuration chứa toàn bộ thiết lập hệ thống. Người dùng có thể thay đổi môi trường trực tiếp trên tệp này (`APP_ENV=development`).
- **Ghi đè theo môi trường (`.env.${APP_ENV}`):** Cho phép tạo thêm tệp nhỏ gọn (ví dụ `.env.staging` hoặc `.env.production`) chỉ khai báo những biến cần thay đổi (như `MONGO_URI`, `CLOUDINARY_ROOT_FOLDER`...). Hệ thống nạp `.env` trước, sau đó nạp đè tệp môi trường lên.
- **Thứ tự ưu tiên:** Biến môi trường có sẵn trong tiến trình hệ điều hành (`process.env.*`) luôn có mức ưu tiên cao nhất.

### 2.3. Chốt Chặn An Toàn Tập Trung (`dbGuard.js`)
Toàn bộ kết nối cơ sở dữ liệu và các script can thiệp dữ liệu phải đi qua module bảo vệ duy nhất [`src/config/dbGuard.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/dbGuard.js):
1. **Phân loại Host (Host Classifier):**
   - **Local Host:** `127.0.0.1`, `localhost`, hostname nội bộ container Docker.
   - **Remote Host:** `mongodb+srv://`, địa chỉ IP công cộng, domain bên ngoài.
   - Khi `APP_ENV === 'development'`: **Bắt buộc host phải là Local**. Nếu phát hiện Remote Host, hệ thống từ chối khởi động trừ khi có cờ tường minh `ALLOW_REMOTE_DB_IN_DEV=true` và xác nhận cảnh báo.
   - Khi `APP_ENV === 'staging' || 'production'`: Bắt buộc host phải là Remote và sử dụng kết nối bảo mật TLS.
2. **Fingerprint Cơ sở Dữ liệu (`settings.environment`):**
   - Mỗi database mang một bản ghi nhận diện duy nhất trong collection `settings`:
     ```json
     {
       "key": "environmentFingerprint",
       "value": {
         "appEnv": "development",
         "projectName": "Treecraft",
         "createdAt": "2026-11-10T...",
         "taggedBy": "admin"
       }
     }
     ```
   - Khi khởi động, `dbGuard` kiểm tra fingerprint trong database. Nếu `settings.environmentFingerprint.appEnv` không khớp với `APP_ENV` của tiến trình, hệ thống lập tức từ chối kết nối.
3. **Chốt chặn Lệnh Phá Hoại (Destructive Operations Guard):**
   - Các lệnh nguy hiểm (`seed:reset`, `db:reset-local`, `seed`, `migrate*`, `backup:restore --in-place`, `purge-expired-recyclebin`):
     - Chỉ được phép chạy tự do trên **Local Host** tại môi trường `development`.
     - Tuyệt đối cấm chạy các lệnh dọn sạch toàn bộ (`seed:reset`, `db:reset-local`) trên Remote Host.
     - Với các lệnh migration/restore trên Remote Host: Bắt buộc người dùng phải truyền cờ tường minh, phải gõ lại chính xác tên Database và Host, và tự động tạo bản sao lưu an toàn trước khi chạy.
4. **Hiển thị Trực quan (Banner & Visual Environment Badge):**
   - In banner rõ ràng khi tiến trình khởi động: `APP_ENV`, host (đã che mật khẩu), tên DB, Cloudinary folder.
   - Hiển thị dải nhãn màu môi trường trên Topbar Admin CMS: Xanh lá (`development`), Vàng/Cam (`staging`), Đỏ (`production`).

### 2.4. Chiến lược Chạy Kiểm Thử Jest (Isolated Temporary Test Databases)
- Jest chạy với `APP_ENV=development` nhưng **không đọc tệp `.env.development` thật**.
- Sử dụng Database tạm theo worker: `<tênDB>_tmp_<workerId>` (ví dụ `admin_cms_tmp_1`).
- Setup tự động tạo DB tạm trên MongoDB local Docker, Teardown tự động drop đúng DB tạm của worker đó.
- Nếu Jest phát hiện URI trỏ tới Remote Host: Bộ kiểm thử **fail ngay lập tức**.
- Hậu tố `_tmp_*` chỉ có hiệu lực khi có biến `JEST_WORKER_ID`, không được chấp nhận khi chạy ứng dụng thông thường.

### 2.5. Công cụ Clone 1 chiều từ Cloud về Local (`db:clone-from-remote`)
- Cho phép lập trình viên kéo dữ liệu mới nhất từ Cloud (Staging hoặc Production) về Local Docker để tái hiện lỗi.
- **Quy tắc 1 chiều:** Tuyệt đối chỉ kéo từ Remote về Local, không bao giờ có chiều ngược lại.
- Tự động thực hiện **Anonymization cơ bản**: Che email người dùng, đặt lại mật khẩu của tài khoản về mật khẩu dev chuẩn (`adminpass123`), xóa các bí mật nhạy cảm (hash Basic Auth).
- Tự động gắn Fingerprint môi trường local (`appEnv: 'development'`) sau khi clone thành công.

---

## 3. Hệ quả & Lợi ích

1. **An toàn tuyệt đối:** Loại bỏ 100% nguy cơ chạy nhầm seed/migration/test làm hỏng dữ liệu thật trên cloud.
2. **Bảo tồn tính toàn vẹn:** Tên database và collection trên local hoàn toàn đồng nhất với cloud, giúp việc debug và clone dữ liệu hoạt động trơn tru.
3. **Tự động hóa & Tiện lợi:** Các lệnh `npm run db:up`, `npm run db:down`, `npm run db:status` giúp việc dựng môi trường dev diễn ra trong 1 lệnh duy nhất.

