# Hướng Dẫn Triển Khai Hệ Thống Bằng Docker & Compose (Container Deployment Runbook)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Áp dụng cho:** DevOps, Sysadmin và Lập trình viên triển khai Staging / Production

---

## 1. Mục Đích / Khi Nào Sử Dụng
- Hướng dẫn đóng gói và triển khai hệ thống Treecraft CMS hoàn chỉnh trong môi trường container hóa (Docker).
- Áp dụng khi:
  - Triển khai môi trường thử nghiệm độc lập (Staging/UAT).
  - Triển khai máy chủ sản xuất (Production).
  - Chạy hệ thống trên CI/CD pipeline hoặc Kubernetes/Cloud Container Apps.

---

## 2. Điều Kiện Tiên Quyết
- **Docker Engine:** Phiên bản `24.x` trở lên (`docker --version`).
- **Docker Compose:** Phiên bản `v2.x` trở lên (`docker compose version`).
- Cổng `4000` trên máy chủ chưa bị chiếm dụng.
- RAM tối thiểu: 2GB (Khuyến nghị 4GB cho cả App + MongoDB).

---

## 3. Các Bước Thực Hiện (Windows / macOS / Linux)

### Bước 1: Chuẩn bị file cấu hình môi trường

Tạo file `.env.staging` (hoặc `.env.production`) tại thư mục gốc:
```env
APP_ENV=staging
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb://mongo:27017/treecraft_staging?replicaSet=rs0
SESSION_SECRET=your_super_secure_random_production_secret_32chars
STORAGE_PROVIDER=local
TRUST_PROXY=true
```

---

### Bước 2: Build Docker Image cho ứng dụng (Multi-stage)

```bash
docker build -t treecraft-cms:latest .
```
Quá trình build multi-stage sẽ:
1. Cài đặt dependencies và biên dịch tối ưu Tailwind CSS minified.
2. Loại bỏ toàn bộ `devDependencies` (`npm prune --omit=dev`).
3. Đóng gói vào image runner `node:20-alpine` chạy dưới user non-root `node` (UID 1000).

---

### Bước 3: Khởi chạy cụm dịch vụ bằng Docker Compose

Khởi động đồng thời ứng dụng Treecraft và MongoDB Replica Set:
```bash
docker compose -f docker-compose.staging.yml up -d --build
```

---

### Bước 4: Kiểm tra trạng thái các container

```bash
docker compose -f docker-compose.staging.yml ps
```

---

### Bước 5: Đồng bộ dữ liệu khởi tạo (Chỉ chạy lần đầu khi DB mới)

```bash
docker exec -it treecraft-app-staging npm run tree:sync
```

---

## 4. Kết Quả Mong Đợi
- Cả hai container đều ở trạng thái `running (healthy)`:
  - `treecraft-app-staging`: Đang lắng nghe tại cổng `4000`.
  - `treecraft-mongo-staging`: MongoDB replica set `rs0` hoạt động ổn định trên mạng nội bộ `treecraft-staging-net`.
- Cổng MongoDB `27017` được cô lập hoàn toàn trong container network, không bị lộ ra ngoài internet.
- Truy cập trình duyệt tại `http://localhost:4000` kết xuất SSR mượt mà.

---

## 5. Cách Kiểm Tra Xác Nhận
1. **Kiểm tra Liveness Probe:**
   ```bash
   curl -i http://localhost:4000/health
   ```
   Kết quả: HTTP `200 OK`, JSON `{"status":"ok", "uptime": ...}`.
2. **Kiểm tra Readiness Probe:**
   ```bash
   curl -i http://localhost:4000/ready
   ```
   Kết quả: HTTP `200 OK`, JSON `{"status":"ready", "database":{"status":"connected"}}`.
3. **Kiểm tra Docker Healthcheck:**
   ```bash
   docker inspect --format='{{json .State.Health.Status}}' treecraft-app-staging
   ```
   Kết quả: `"healthy"`.
4. **Kiểm tra chạy chẩn đoán bên trong container:**
   ```bash
   docker exec -it treecraft-app-staging npm run doctor
   ```
   Kết quả: `🎉 HỆ THỐNG ĐẠT CHUẨN SẴN SÀNG VẬN HÀNH (0 Errors, 0 Warnings)`.

---

## 6. Xử Lý Sự Cố & Lỗi Thường Gặp
1. **Container `treecraft-app-staging` liên tục restart:**
   - *Nguyên nhân:* MongoDB chưa khởi tạo xong replica set trước khi app kết nối.
   - *Khắc phục:* `docker-compose.staging.yml` đã cấu hình `depends_on: { condition: service_healthy }` và `mongo-init`. Xem logs qua lệnh:
     ```bash
     docker compose -f docker-compose.staging.yml logs app
     ```
2. **Lỗi `EACCES: permission denied` khi ghi file backup:**
   - *Nguyên nhân:* Quyền sở hữu thư mục volume host chưa cấp cho user `node` (UID 1000).
   - *Khắc phục:* Chạy `sudo chown -R 1000:1000 staging-backups` hoặc sử dụng Docker named volume (như cấu hình mặc định).
3. **Không kết nối được vào MongoDB từ máy host:**
   - *Lưu ý thiết kế:* Cổng 27017 cố ý không publish ra host để bảo mật. Muốn kết nối, dùng:
     ```bash
     docker exec -it treecraft-mongo-staging mongosh
     ```

---

## 7. Cảnh Báo & Lưu Ý Quan Trọng
- ⚠️ **Dữ liệu Volume:** Dữ liệu MongoDB và Backups được lưu trữ trong 2 persistent volume: `mongo-staging-data` và `staging-backups`. Không dùng cờ `-v` khi `docker compose down` trừ khi bạn chủ động muốn xóa sạch dữ liệu.
- ⚠️ **Mật khẩu & Secrets:** Tuyệt đối không commit file `.env.staging` hoặc `.env.production` lên Git. Hãy dùng Docker Secrets hoặc Environment Variables của nền tảng CI/CD.
