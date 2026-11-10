# HƯỚNG DẪN QUẢN TRỊ MÔI TRƯỜNG VÀ CƠ SỞ DỮ LIỆU (PHASE E1)

Tài liệu này hướng dẫn chi tiết quy trình quản lý các môi trường (`development`, `staging`, `production`), thiết lập MongoDB Local Docker, cơ chế bảo vệ `dbGuard`, sao chép dữ liệu từ Cloud về Local và các kịch bản vận hành cơ sở dữ liệu của hệ thống **Treecraft CMS**.

---

## MỤC LỤC 12 KỊCH BẢN VẬN HÀNH

1. [Dựng MongoDB Local Docker lần đầu](#kịch-bản-1-dựng-mongodb-local-docker-lần-đầu)
2. [Bật, tắt và kiểm tra trạng thái MongoDB Local](#kịch-bản-2-bật-tắt-và-kiểm-tra-trạng-thái-mongodb-local)
3. [Tạo file cấu hình môi trường từ tệp mẫu](#kịch-bản-3-tạo-file-cấu-hình-môi-trường-từ-tệp-mẫu)
4. [Kiểm tra tính toàn vẹn và đồng bộ cấu hình (check:env)](#kịch-bản-4-kiểm-tra-tính-toàn-vẹn-và-đồng-bộ-cấu-hình-checkenv)
5. [Khởi động ứng dụng trong môi trường Local Development](#kịch-bản-5-khởi-động-ứng-dụng-trong-môi-trường-local-development)
6. [Gắn nhãn dấu vân tay môi trường (Fingerprint)](#kịch-bản-6-gắn-nhãn-dấu-vân-tay-môi-trường-fingerprint)
7. [Sao chép dữ liệu 1 chiều từ Cloud về Local (clone-from-remote)](#kịch-bản-7-sao-chép-dữ-liệu-1-chiều-từ-cloud-về-local-clone-from-remote)
8. [Khởi tạo dữ liệu mẫu (Seed) an toàn trên Local](#kịch-bản-8-khởi-tạo-dữ-liệu-mẫu-seed-an-toàn-trên-local)
9. [Chạy di chuyển dữ liệu (Migration) có chốt chặn](#kịch-bản-9-chạy-di-chuyển-dữ-liệu-migration-có-chốt-chặn)
10. [Sao lưu và Khôi phục Database phân lập theo môi trường](#kịch-bản-10-sao-lưu-và-khôi-phục-database-phân-lập-theo-môi-trường)
11. [Dọn dẹp database tạm mồ côi sinh ra từ kiểm thử (clean-tmp)](#kịch-bản-11-dọn-dẹp-database-tạm-mồ-côi-sinh-ra-từ-kiểm-thử-clean-tmp)
12. [Xử lý sự cố và mở khóa kết nối Cloud trong Dev (ALLOW_REMOTE_DB_IN_DEV)](#kịch-bản-12-xử-lý-sự-cố-và-mở-khóa-kết-nối-cloud-trong-dev-allow_remote_db_in_dev)

---

### KỊCH BẢN 1: DỰNG MONGODB LOCAL DOCKER LẦN ĐẦU

#### 1. Mục đích và khi nào dùng
Dùng khi thiết lập máy phát triển mới hoặc muốn tách biệt hoàn toàn dữ liệu lập trình khỏi cụm Cloud MongoDB Atlas, đảm bảo các thao tác phát triển, seed và migration không bao giờ chạm vào dữ liệu thật.

#### 2. Điều kiện trước
- Đã cài đặt Docker và Docker Compose trên máy tính.
- Docker daemon đang chạy (`docker info` không báo lỗi).
- Cổng `27017` trên máy host chưa bị chiếm dụng bởi tiến trình khác.

#### 3. Các bước thực hiện
```bash
# Bước 1: Khởi động container MongoDB 8.0 và tự động cấu hình replica set rs0
npm run db:up

# Bước 2: Kiểm tra container đã khởi chạy thành công
npm run db:status
```

#### 4. Kết quả mong đợi
- Container `treecraft-mongo-dev` chạy ở trạng thái `healthy`.
- Container khởi tạo `treecraft-mongo-dev-init` chạy xong lệnh `rs.initiate` và thoát với mã 0 (`Exited (0)`).
- Cổng `127.0.0.1:27017` sẵn sàng tiếp nhận kết nối.

#### 5. Cách kiểm tra thành công
```bash
mongosh "mongodb://127.0.0.1:27017/admin_cms?replicaSet=rs0" --eval "rs.status().ok"
```
Đầu ra in ra `1`.

#### 6. Lỗi thường gặp và cách xử lý
- **Lỗi cổng 27017 bị chiếm:** Chạy `lsof -i :27017` để tìm tiến trình đang chiếm cổng và tắt tiến trình đó.
- **Docker daemon chưa bật:** Mở ứng dụng Docker Desktop trên macOS/Windows hoặc chạy `sudo systemctl start docker` trên Linux.

#### 7. Cảnh báo/rủi ro
Dữ liệu container được lưu vào Docker Named Volume `treecraft-mongo-dev-data`. Không chạy `docker volume prune` nếu chưa sao lưu.

---

### KỊCH BẢN 2: BẬT, TẮT VÀ KIỂM TRA TRẠNG THÁI MONGODB LOCAL

#### 1. Mục đích và khi nào dùng
Dùng hàng ngày khi bắt đầu hoặc kết thúc phiên làm việc để tiết kiệm RAM và CPU của máy lập trình.

#### 2. Điều kiện trước
Docker daemon đang chạy.

#### 3. Các bước thực hiện
```bash
# Khởi động database local
npm run db:up

# Xem trạng thái hoạt động
npm run db:status

# Dừng database local (dữ liệu volume vẫn được bảo toàn)
npm run db:down
```

#### 4. Kết quả mong đợi
Container được khởi động hoặc dừng lại một cách có trật tự mà không làm hỏng volume dữ liệu.

#### 5. Cách kiểm tra thành công
Chạy `npm run db:status` thấy trạng thái `Up` (khi bật) hoặc danh sách trống (khi tắt).

#### 6. Lỗi thường gặp và cách xử lý
Nếu container bị kẹt, chạy `docker compose -f docker-compose.dev.yml restart mongo`.

#### 7. Cảnh báo/rủi ro
Tuyệt đối không dùng cờ `-v` khi chạy lệnh down (`docker compose down -v`) trừ khi bạn muốn xóa sạch dữ liệu local để dựng lại từ đầu.

---

### KỊCH BẢN 3: TẠO VÀ QUẢN LÝ CẤU HÌNH MÔI TRƯỜNG TỪ .ENV.EXAMPLE

#### 1. Mục đích và khi nào dùng
Dùng khi thiết lập cấu hình ban đầu cho dự án hoặc khi cần thay đổi thiết lập giữa các môi trường (`development`, `staging`, `production`).

#### 2. Điều kiện trước
Repo có tệp mẫu chuẩn hóa duy nhất: `.env.example`.

#### 3. Các bước thực hiện
```bash
# Bước 1: Tạo file cấu hình chính .env từ file mẫu chuẩn hóa
cp .env.example .env

# Bước 2: Thay đổi trực tiếp môi trường trên .env (ví dụ APP_ENV=development)
# Hoặc nếu muốn cấu hình riêng biệt cho Staging / Production mà không làm xáo trộn .env chính,
# bạn chỉ cần tạo file override nhỏ gọn chỉ chứa các biến khác biệt:
# Ví dụ tạo .env.staging để ghi đè MONGO_URI Cloud:
echo 'MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/admin_cms' > .env.staging
```

#### 4. Kết quả mong đợi
- Tệp `.env` đóng vai trò là Base Config chứa toàn bộ thiết lập nền tảng.
- Tệp `.env.${APP_ENV}` (nếu có) tự động nạp đè các giá trị đặc thù cho môi trường tương ứng.

#### 5. Cách kiểm tra thành công
```bash
npm run check:env
```

#### 6. Lỗi thường gặp và cách xử lý
- **Thiếu biến bắt buộc:** Nếu `.env` thiếu các biến cốt lõi (`APP_ENV`, `PORT`, `MONGO_URI`), hệ thống sẽ dừng khởi động kèm thông báo lỗi.

#### 7. Cảnh báo/rủi ro
Tất cả các tệp `.env`, `.env.*` (ngoại trừ `.env.example`) đều đã nằm trong `.gitignore` để bảo vệ bí mật. Không bao giờ commit tệp env chứa mật khẩu lên Git.

---

### KỊCH BẢN 4: KIỂM TRA TÍNH TOÀN VẸN CẤU HÌNH (CHECK:ENV)

#### 1. Mục đích và khi nào dùng
Dùng để xác thực tính đầy đủ của các biến cấu hình trong `.env` so với mẫu `.env.example`, đồng thời kiểm tra chốt chặn an toàn `dbGuard` đối với kết nối MongoDB hiện tại.

#### 2. Điều kiện trước
Đã có tệp `.env` trong thư mục gốc.

#### 3. Các bước thực hiện
```bash
npm run check:env
```

#### 4. Kết quả mong đợi
- Kiểm tra 3 file mẫu: 100% đồng bộ.
- Kiểm tra chốt chặn URI: `HỢP LỆ VÀ AN TOÀN`.
- Mã thoát trả về 0.

#### 5. Cách kiểm tra thành công
Màn hình xuất hiện dòng thông báo: `🎉 KIỂM TRA MÔI TRƯỜNG THÀNH CÔNG!`.

#### 6. Lỗi thường gặp và cách xử lý
Nếu có thông báo lỗi `LỖI AN TOÀN: APP_ENV=development nhưng MONGO_URI trỏ tới Remote`, hãy kiểm tra lại URI trong `.env.development`.

#### 7. Cảnh báo/rủi ro
Không bỏ qua cảnh báo nếu `check:env` trả về mã lỗi 1 trong quy trình CI/CD.

---

### KỊCH BẢN 5: KHỞI ĐỘNG ỨNG DỤNG TRONG MÔI TRƯỜNG LOCAL DEVELOPMENT

#### 1. Mục đích và khi nào dùng
Khởi động máy chủ Treecraft CMS phục vụ phát triển tính năng và kiểm thử giao diện.

#### 2. Điều kiện trước
- Đã chạy `npm run db:up`.
- Đã có file `.env.development`.

#### 3. Các bước thực hiện
```bash
# Khởi động chế độ development với nodemon
npm run dev

# Hoặc khởi động thông thường
npm start
```

#### 4. Kết quả mong đợi
- Terminal hiển thị Banner khởi động của Treecraft CMS với Badge xanh `[ DEV (LOCAL) ]`.
- Xác nhận chốt chặn dbGuard `ĐANG KÍCH HOẠT (ACTIVE)`.
- Server lắng nghe tại cổng chỉ định (mặc định 4000).

#### 5. Cách kiểm tra thành công
- Truy cập trình duyệt tại `http://localhost:4000/admin`.
- Góc phải thanh Topbar xuất hiện Badge xanh lục `DEV (LOCAL)`.

#### 6. Lỗi thường gặp và cách xử lý
- **Lỗi kết nối DB:** Nếu terminal báo không kết nối được tới `127.0.0.1:27017`, hãy kiểm tra `npm run db:status`.

#### 7. Cảnh báo/rủi ro
Ở môi trường dev, `SITE_CACHE=false` để thấy ngay thay đổi layout EJS. Không dùng cờ này trên production.

---

### KỊCH BẢN 6: GẮN NHÃN DẤU VÂN TAY MÔI TRƯỜNG (FINGERPRINT)

#### 1. Mục đích và khi nào dùng
Dùng để đóng dấu định danh môi trường vào collection `settings` của database. Nhờ dấu vân tay này, nếu một ứng dụng `production` vô tình trỏ nhầm vào DB đã bị đóng dấu `staging` hoặc `development`, `dbGuard` sẽ lập tức từ chối khởi động để bảo vệ dữ liệu.

#### 2. Điều kiện trước
Database đích đang hoạt động và cho phép kết nối.

#### 3. Các bước thực hiện
```bash
# Đóng dấu cho database hiện tại theo file env đang nạp
npm run db:init-fingerprint

# Hoặc chỉ định môi trường cụ thể
node src/scripts/init-fingerprint.js --env staging
```

#### 4. Kết quả mong đợi
Ghi một bản ghi vào collection `settings`:
```json
{
  "key": "environmentFingerprint",
  "value": {
    "appEnv": "development",
    "projectName": "Treecraft",
    "taggedAt": "2026-11-10T...",
    "taggedBy": "manual-cli:admin"
  }
}
```

#### 5. Cách kiểm tra thành công
Terminal in ra: `🎉 ĐÓNG DẤU VÂN TAY THÀNH CÔNG CHO MÔI TRƯỜNG [...]!`.

#### 6. Lỗi thường gặp và cách xử lý
Nếu database đã có dấu vân tay cũ khác với môi trường yêu cầu, script sẽ dừng lại để tránh ghi đè nhầm. Thêm cờ `--force` nếu bạn thực sự muốn cập nhật lại.

#### 7. Cảnh báo/rủi ro
Tuyệt đối không đóng dấu môi trường `development` lên database Remote/Cloud. Script có chốt chặn tự động từ chối thao tác này.

---

### KỊCH BẢN 7: SAO CHÉP DỮ LIỆU 1 CHIỀU TỪ CLOUD VỀ LOCAL (CLONE-FROM-REMOTE)

#### 1. Mục đích và khi nào dùng
Dùng khi lập trình viên cần kéo dữ liệu mới nhất từ môi trường `staging` hoặc `production` về máy local để tái hiện lỗi (debug), kiểm thử tính tương thích của template hoặc viết migration mới.

#### 2. Điều kiện trước
- Có file `.env.staging` hoặc `.env.production` chứa URI Cloud nguồn.
- MongoDB Local đang chạy (`npm run db:up`).

#### 3. Các bước thực hiện
```bash
# Sao chép từ Staging về Local (có hỏi xác nhận, tự động ẩn danh hóa mật khẩu và email)
npm run db:clone-from-remote -- --env staging

# Sao chép từ Production về Local (bỏ qua bước hỏi xác nhận nếu chạy script tự động)
npm run db:clone-from-remote -- --env production --yes
```

#### 4. Kết quả mong đợi
- Toàn bộ 19 collections nghiệp vụ được kéo về MongoDB Local.
- Collection `sessions` và bộ đếm tạm thời được loại trừ.
- Mật khẩu của toàn bộ tài khoản người dùng được đặt lại thành `adminpass123`.
- Email người dùng được ẩn danh hóa.
- Dấu vân tay local được tự động gán là `development`.

#### 5. Cách kiểm tra thành công
Đăng nhập vào CMS Local (`http://localhost:4000/admin`) bằng tài khoản `admin` với mật khẩu `adminpass123`.

#### 6. Lỗi thường gặp và cách xử lý
- **Lỗi mạng khi kết nối Cloud:** Kiểm tra IP máy tính của bạn đã được thêm vào Access List của cụm MongoDB Atlas hay chưa.

#### 7. Cảnh báo/rủi ro
Lệnh này có tính chất **1 chiều duy nhất** (Cloud -> Local). Chốt chặn `dbGuard` cấm tuyệt đối việc đặt máy chủ đích là Remote để ngăn ngừa việc clone đè lên Cloud.

---

### KỊCH BẢN 8: KHỞI TẠO DỮ LIỆU MẪU (SEED) AN TOÀN TRÊN LOCAL

#### 1. Mục đích và khi nào dùng
Dùng để tạo mới cấu trúc ban đầu: tài khoản quản trị mặc định, cây thư mục gốc (`/root`), template hệ thống và trang mẫu.

#### 2. Điều kiện trước
MongoDB Local đang chạy và đang ở môi trường `development`.

#### 3. Các bước thực hiện
```bash
# Seed dữ liệu quản trị cơ bản (Roles, Users, Root Nodes)
npm run seed

# Seed dữ liệu mẫu Presentation (Layout, Renderings, Placeholders)
npm run seed:presentation

# Seed toàn bộ website mẫu tiếng Việt và tiếng Anh
npm run seed:sample
```

#### 4. Kết quả mong đợi
Dữ liệu được nạp đầy đủ vào database local.

#### 5. Cách kiểm tra thành công
Mở trình duyệt truy cập `http://localhost:4000/` xem website công khai hoặc truy cập `/admin` để vào giao diện quản trị.

#### 6. Lỗi thường gặp và cách xử lý
Nếu vô tình chạy lệnh seed khi đang trỏ tới Cloud, `dbGuard` sẽ chặn đứng với lỗi:
`[dbGuard DESTRUCTIVE BLOCK] Lệnh "seed-initial-data" có tính chất PHÁ HỦY / XÓA TOÀN BỘ dữ liệu và BỊ CẤM TUYỆT ĐỐI trên máy chủ Remote/Cloud!`.

#### 7. Cảnh báo/rủi ro
Không bao giờ tắt chốt chặn này trên môi trường thật.

---

### KỊCH BẢN 9: CHẠY DI CHUYỂN DỮ LIỆU (MIGRATION) CÓ CHỐT CHẶN

#### 1. Mục đích và khi nào dùng
Dùng khi cập nhật cấu trúc schema (ví dụ thêm trường mới, chuyển đổi ngôn ngữ, nâng cấp quyền).

#### 2. Điều kiện trước
- Đã sao lưu database trước khi chạy.
- Đã kiểm tra migration thành công trên local dev.

#### 3. Các bước thực hiện
```bash
# Chạy migration trên Local:
npm run migrate

# Nếu cần chạy migration trên môi trường Remote/Staging, phải truyền cờ xác nhận:
node src/scripts/migrate-to-versions-languages.js --confirm-remote
```

#### 4. Kết quả mong đợi
Các bản ghi được nâng cấp schema đồng loạt mà không làm gián đoạn hệ thống.

#### 5. Cách kiểm tra thành công
Xem log terminal báo số lượng bản ghi cập nhật và kiểm tra dữ liệu qua `Content Editor`.

#### 6. Lỗi thường gặp và cách xử lý
Nếu chạy trên Cloud mà thiếu `--confirm-remote`, script sẽ dừng lại kèm hướng dẫn.

#### 7. Cảnh báo/rủi ro
Luôn tạo một bản backup (`npm run backup:create`) trước khi chạy bất kỳ migration nào trên Staging hoặc Production.

---

### KỊCH BẢN 10: SAO LƯU VÀ KHÔI PHỤC DATABASE PHÂN LẬP THEO MÔI TRƯỜNG

#### 1. Mục đích và khi nào dùng
Dùng để tạo bản lưu trữ định kỳ hoặc khôi phục dữ liệu khi cần rollback hệ thống (Phase K1 / DEC-051).

#### 2. Điều kiện trước
Công cụ `mongodump` và `mongorestore` đã có sẵn trong PATH (hoặc hệ thống sẽ tự động fallback sang cơ chế Stream Extended NDJSON).

#### 3. Các bước thực hiện
```bash
# Tạo bản sao lưu đầy đủ:
npm run backup:create -- --note "Backup truoc khi release"

# Xem danh sách bản sao lưu:
npm run backup:list

# Khôi phục thử nghiệm vào database phụ (an toàn, không ghi đè DB chính):
npm run backup:restore <backupId> -- --mode target-db --target-db admin_cms_rollback_test

# Khôi phục ghi đè trực tiếp (Chế độ in-place):
npm run backup:restore <backupId> -- --mode in-place --confirm-db-name admin_cms
```

#### 4. Kết quả mong đợi
- Thư mục sao lưu được tổ chức phân lập theo môi trường: `storage/backups/<APP_ENV>/YYYY/MM/<backupId>`.
- Bản sao lưu được mã hóa AES-256-GCM nếu có cấu hình `BACKUP_ENCRYPTION_KEY`.

#### 5. Cách kiểm tra thành công
```bash
npm run backup:verify <backupId>
```
Đầu ra báo `✅ TOÀN VẸN DỮ LIỆU ĐẠT CHUẨN (100%)`.

#### 6. Lỗi thường gặp và cách xử lý
Khôi phục `in-place` trên host remote sẽ bị `dbGuard` từ chối nếu không truyền thêm `--confirm-remote`.

#### 7. Cảnh báo/rủi ro
Thao tác khôi phục `in-place` sẽ xóa toàn bộ dữ liệu hiện tại trong DB đích trước khi nạp lại. Luôn kiểm tra kỹ `backupId`.

---

### KỊCH BẢN 11: DỌN DẸP DATABASE TẠM MỒ CÔI SINH RA TỪ KIỂM THỬ (CLEAN-TMP)

#### 1. Mục đích và khi nào dùng
Dùng sau khi chạy kiểm thử tự động (Jest test suite) nếu có các worker test bị ngắt đột ngột (Ctrl+C) khiến các database tạm `admin_cms_tmp_*` chưa kịp tự hủy.

#### 2. Điều kiện trước
MongoDB Local đang hoạt động.

#### 3. Các bước thực hiện
```bash
npm run db:clean-tmp
```

#### 4. Kết quả mong đợi
Script quét toàn bộ database có tên bắt đầu bằng `admin_cms_tmp_` hoặc chứa `_tmp_` và thực hiện drop an toàn.

#### 5. Cách kiểm tra thành công
Terminal in ra: `🎉 Dọn dẹp hoàn tất! Đã xóa thành công N database tạm.` hoặc `Không tìm thấy database tạm nào`.

#### 6. Lỗi thường gặp và cách xử lý
Nếu vô tình chạy khi trỏ vào Remote, script lập tức từ chối thực thi với thông báo `Từ chối thực thi trên máy chủ Remote`.

#### 7. Cảnh báo/rủi ro
Script chỉ xóa các database có tên chứa chuỗi `_tmp_`. Database nghiệp vụ chính `admin_cms` tuyệt đối không bị ảnh hưởng.

---

### KỊCH BẢN 12: XỬ LÝ SỰ CỐ VÀ MỞ KHÓA KẾT NỐI CLOUD TRONG DEV (ALLOW_REMOTE_DB_IN_DEV)

#### 1. Mục đích và khi nào dùng
Chỉ sử dụng trong tình huống khẩn cấp hoặc khi lập trình viên cần tạm thời kết nối trực tiếp vào một cụm Cloud MongoDB để kiểm tra mà không thể dựng Docker local.

#### 2. Điều kiện trước
Người phát triển nhận thức rõ nguy cơ và chịu trách nhiệm về dữ liệu.

#### 3. Các bước thực hiện
```bash
# Bước 1: Mở file .env.development
# Bước 2: Điền URI Cloud và bật cờ cho phép:
# MONGO_URI=mongodb+srv://...
# ALLOW_REMOTE_DB_IN_DEV=true

# Bước 3: Khởi động lại ứng dụng
npm run dev
```

#### 4. Kết quả mong đợi
- `dbGuard` cho phép tiếp tục khởi động nhưng in một dải CẢNH BÁO NGUY HIỂM màu đỏ trên màn hình console.
- Các lệnh có tính hủy hoại (`seed`, `seed:reset`, `db:reset-local`) **VẪN TIẾP TỤC BỊ KHÓA CHẶT** để bảo vệ dữ liệu Cloud.

#### 5. Cách kiểm tra thành công
Terminal xuất hiện dòng cảnh báo: `[dbGuard CẢNH BÁO NGUY HIỂM] Môi trường "development" ĐANG KẾT NỐI TỚI DATABASE REMOTE/CLOUD`.

#### 6. Lỗi thường gặp và cách xử lý
Sau khi kiểm tra xong, cần lập tức đưa `ALLOW_REMOTE_DB_IN_DEV=false` và trỏ lại `MONGO_URI=mongodb://127.0.0.1:27017/admin_cms?replicaSet=rs0`.

#### 7. Cảnh báo/rủi ro
Tuyệt đối không bật cờ này thường xuyên. Đây chỉ là phương án tình thế khẩn cấp.

