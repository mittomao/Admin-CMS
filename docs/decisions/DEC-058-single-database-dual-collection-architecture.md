# DEC-058: Kiến Trúc Một Database Duy Nhất Với Hai Collection (Single-Database Dual-Collection Architecture)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày:** 2026-11-16
- **Tác giả:** Senior Software Architect / Tech Lead
- **Giai đoạn liên quan:** GĐ S4 (Kiểm tra và hoàn thiện luồng repo mới Submodule → Init → Dev)
- **Tài liệu liên quan:** [DEC-041](DEC-041-content-editor-database-switcher-master-web.md), [DEC-051](DEC-051-database-backup-and-restore-architecture.md), [DEC-052](DEC-052-environment-database-separation-and-dbguard.md), [DEC-056](DEC-056-core-and-site-separation-and-sitepaths.md), [DEC-057](DEC-057-one-step-init-scaffolding-and-db-bootstrap.md)

---

## 1. BỐI CẢNH (CONTEXT)

Trong các tài liệu và mã nguồn ban đầu của GĐ 8, 8.1, 10, E1 và S1/S2, thuật ngữ "Master Database" và "Web Database" được sử dụng song song, dẫn tới sự hiểu lầm ở một số chỗ rằng hệ thống duy trì hai database vật lý độc lập (với các biến môi trường như `MONGO_URI_MASTER`, `MONGO_URI_WEB` hoặc `mongoDbMaster`, `mongoDbWeb`). 

Trong thực tế vận hành và thiết kế gốc của Treecraft:
1. Mongoose model `Item` lưu vào collection `items_master`.
2. Mongoose model `PublishedItem` lưu vào collection `items_web`.
3. Cả hai model này cùng sử dụng chung một kết nối Mongoose kết nối vào một database duy nhất.
4. Việc duy trì 2 chuỗi kết nối URI riêng biệt (`MONGO_URI` và `MONGO_URI_WEB`) gây ra phức tạp không cần thiết trong quá trình khởi tạo dự án (`init`), cấu hình biến môi trường (`.env`), sao lưu / phục hồi (K1 backup), kiểm soát an toàn (`dbGuard`), và làm tăng chi phí quản trị hạ tầng cơ sở dữ liệu.

Do đó, giai đoạn S4 chính thức chuẩn hóa và đóng băng quy tắc kiến trúc: **Mỗi dự án Treecraft chỉ sử dụng duy nhất một database MongoDB**.

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)

### 2.1. Quy Tắc Một Database Duy Nhất (Single Database Principle)
1. Mỗi dự án Treecraft chỉ kết nối tới **duy nhất một cơ sở dữ liệu MongoDB** tại một thời điểm theo môi trường chạy (`development`, `staging`, `production`).
2. Tên database được đặt theo quy ước chuẩn:
   $$\text{Database Name} = \text{branding.DB\_PREFIX} + \text{"\_"} + \text{slug}$$
   - Tiền tố mặc định: `treecraft` (hằng số trong core, cho phép cấu hình).
   - Ví dụ: Dự án `celphones` có database name là `treecraft_celphones`.
3. **Tuyệt đối không có hậu tố `_web` hoặc `_master` trong tên database**.
4. **Tuyệt đối không sử dụng các biến môi trường:** `MONGO_URI_WEB`, `MONGO_DB_WEB`, `MONGO_URI_MASTER`.
5. Biến môi trường duy nhất đại diện cho kết nối MongoDB là:
   ```ini
   MONGO_URI=mongodb://127.0.0.1:27017/treecraft_<slug>?replicaSet=rs0
   ```

### 2.2. Hai Collection Song Song: `items_master` và `items_web`
1. Tách biệt giữa không gian soạn thảo (Master) và không gian xuất bản công khai (Web) được thực hiện ở **cấp độ Collection trong cùng một Database**:
   - `items_master`: Chứa toàn bộ cây nội dung phân cấp đang biên tập, nháp, phiên bản lịch sử và workflow (do model `Item` quản lý).
   - `items_web`: Chứa các bản ghi nội dung đã được phê duyệt và xuất bản sang Web Store công khai (do model `PublishedItem` quản lý).
2. **Giữ nguyên 100% tên collection hiện có trong Core:**
   - `items_master`
   - `items_web`
   - `templates`
   - `roles`
   - `users`
   - `languages`
   - `launchpad_apps`
   - `media`
   - `publish_histories`
   - `publish_jobs`
   - `access_control_lists`
   - `audit_logs`
   - `domains`
   - `settings`
   - `workflow_histories`
   Tuyệt đối không đổi tên, không thêm tiền tố hay hậu tố vào tên collection.

### 2.3. Quy Chuẩn Cấu Hình Site (`site.config.js`)
Loại bỏ hoàn toàn các trường `mongoDbMaster` và `mongoDbWeb`. Cấu hình database trong `site.config.js` được chuẩn hóa thành một đối tượng duy nhất:
```javascript
module.exports = {
  projectName: 'Celphones',
  rootName: 'root',
  dbName: 'treecraft_celphones', // Tên database duy nhất của dự án
  starter: 'corporate',
  // ...
};
```

### 2.4. Tác Động Tới Các Thành Phần Khác
1. **`dbGuard`:** Kiểm tra và xác thực an toàn trên duy nhất một kết nối URI (`env.MONGO_URI`), ghi và kiểm tra dấu vân tay môi trường (fingerprint) trên một database duy nhất.
2. **K1 Backup & Restore:** Tạo bản sao lưu dump toàn bộ các collection của một database duy nhất; khi phục hồi thì khôi phục toàn bộ database đó.
3. **Publish Engine (`publishService`):** Đọc từ collection `items_master`, chuyển đổi schema và ghi/cập nhật trực tiếp vào collection `items_web` trong cùng kết nối DB.
4. **Site Resolver & SSR Renderer (`siteResolver` & `webItemService`):** Truy vấn trực tiếp từ collection `items_web`.
5. **Database Switcher & Reconciliation UI (`databaseController`):** Đối soát giữa collection `items_master` và `items_web` bên trong cùng database.

---

## 3. HẬU QUẢ VÀ LỢI ÍCH (CONSEQUENCES)

### 3.1. Lợi Ích (Pros)
- **Đơn giản hóa vượt bậc quy trình `init`:** Chỉ cần tạo và kết nối tới một database duy nhất.
- **Loại bỏ hoàn toàn lỗi cấu hình:** Không còn tình trạng sai lệch cổng, thiếu chuỗi kết nối `MONGO_URI_WEB` hay quên cấu hình DB Web.
- **Tiết kiệm tài nguyên:** Giảm số lượng kết nối socket tới MongoDB daemon, giảm bộ nhớ của pool kết nối.
- **Đồng bộ transaction:** Mở ra khả năng sử dụng MongoDB Session Transaction giữa `items_master` và `items_web` trong quá trình publish vì cả 2 collection nằm trong cùng một database.

### 3.2. Cân Nhắc (Cons & Mitigations)
- Các tài liệu và báo cáo cũ có nhắc tới "Master và Web là 2 database" sẽ được đánh dấu là tài liệu lịch sử. DEC-058 là nguồn sự thật duy nhất (Single Source of Truth) từ GĐ S4 trở đi.

