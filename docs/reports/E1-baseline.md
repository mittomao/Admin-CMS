# BÁO CÁO ĐIỀU TRA HIỆN TRẠNG DATABASE & KẾT NỐI (E1-BASELINE)

> **Dự án:** Treecraft CMS  
> **Giai đoạn:** GĐ E1 (DEC-052)  
> **Thời điểm kiểm tra:** 2026-11-10  
> **Quy tắc an toàn:** Không in bí mật, che thông tin host và user (`wainii.***.mongodb.net`).

---

## 1. Nơi Cấu hình Kết nối & Phụ thuộc Môi trường

Qua rà soát toàn bộ mã nguồn, cấu hình kết nối MongoDB và phân định môi trường đang nằm tại các vị trí sau:

1. **Điểm nạp cấu hình tập trung:**
   - [`src/config/env.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/env.js): Nạp từ `process.env.MONGO_URI` qua `dotenv.config()`. Mặc định yêu cầu biến `MONGO_URI`.
   - [`src/config/db.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/db.js): Kết nối qua `mongoose.connect(env.MONGO_URI)` với `serverSelectionTimeoutMS: 15000`, `maxPoolSize: 10`.
   - [`src/config/session.js`](file:///Users/wainiidev/Downloads/Projects/Backend/Admin-CMS/src/config/session.js): Quản lý session qua `MongoStore.create({ mongoUrl: env.MONGO_URI })`.
2. **Các tệp mẫu cấu hình:**
   - `.env.example`: Hiện chỉ có một tệp chung duy nhất, khai báo mẫu `MONGO_URI=mongodb://localhost:27017/cms_master`.
3. **Hiện trạng Docker:**
   - Chưa có tệp `docker-compose.yml` hay `docker-compose.dev.yml` trong thư mục gốc.
4. **Hiện trạng Bộ kiểm thử (Jest / Supertest):**
   - Đang sử dụng thư viện `mongodb-memory-server` trong `devDependencies` để khởi tạo database in-memory trên cổng ngẫu nhiên cho các file kiểm thử integration.
5. **Các script quản trị & migration (`src/scripts/`):**
   - Hầu hết kết nối qua `env.MONGO_URI` (ví dụ: `seed-initial-data.js`, `migrate-languages-to-items.js`, `backup-cli.js`).
   - Một số script có fallback hardcode URI cũ (như `treecraft_cms`, `admin_cms` trên localhost). Tất cả cần được đưa qua chốt chặn `dbGuard`.

---

## 2. Thông tin Database Cloud & Cluster Hiện Tại

| Tiêu chí | Giá trị khảo sát thực tế (Đã che bảo mật) |
| :--- | :--- |
| **Giao thức kết nối** | `mongodb+srv:` (Replica Set trên MongoDB Atlas) |
| **Host Cluster** | `wainii.***.mongodb.net` (MongoDB Atlas Cloud) |
| **Phiên bản MongoDB** | **v8.0.37** (MongoDB 8.0 Community / Atlas) |
| **Tên Database Đang Dùng** | **`admin_cms`** (Dùng chung cho cả Master và Web) |
| **Master Store** | Collection **`items_master`** bên trong database `admin_cms` |
| **Web Store** | Collection **`items_web`** bên trong database `admin_cms` |
| **Có dùng Transaction không?** | **Không** (Toàn bộ mã nguồn `src/` hiện không dùng `session.startTransaction()`) |

> [!WARNING]
> **Rủi ro hiện tại:** Khi chạy `npm run dev`, `seed*` hoặc `migrate*` trên máy dev, ứng dụng đang kết nối thẳng vào database cloud **`admin_cms`**. Nếu chạy nhầm lệnh seed hoặc migration lỗi, dữ liệu thật trên cloud sẽ bị thay đổi hoặc ghi đè.

---

## 3. Danh mục Toàn bộ 19 Collections & Indexes Hiện Hữu (Baseline)

Dưới đây là tập hợp đầy đủ 19 collections và indexes hiện hữu trên database `admin_cms` làm cơ sở đối soát (baseline invariant) cho môi trường local:

| STT | Tên Collection | Số Index | Danh sách tên Index chi tiết |
| :---: | :--- | :---: | :--- |
| 1 | `access_control_lists` | 3 | `_id_`, `itemId_1`, `itemId_1_principalType_1_principalId_1_right_1`, `principalType_1_principalId_1` |
| 2 | `audit_logs` | 11 | `_id_`, `at_1`, `userId_1`, `action_1`, `itemId_1`, `result_1`, `at_-1`, `userId_1_at_-1`, `itemId_1_at_-1`, `action_1_at_-1`, `itemPath_1_at_-1` |
| 3 | `backupjobs` | 5 | `_id_`, `backupId_1`, `status_1`, `status_1_mode_1`, `createdAt_-1` |
| 4 | `domains` | 2 | `_id_`, `name_1` |
| 5 | `items_master` | 20 | `_id_`, `parentId_1_sortOrder_1_deleted_1`, `path_1_deleted_1`, `ancestors_1`, `templateId_1`, `deleted_1`, `name_text_displayName_text`, `languages.code_1`, `languages.versions.version_1`, `_id_1_languages.code_1_languages.versions.version_1`, `presentation.shared.renderings.renderingId_1`, `presentation.final.renderings.renderingId_1`, `presentation.shared.renderings.datasourceId_1`, `presentation.final.renderings.datasourceId_1`, `languages.versions.workflowState_1`, `workflowId_1`, `isDeleted_1`, `deletedAt_1`, `deletionBatchId_1`, `deleted_1_deletedAt_-1` |
| 6 | `items_web` | 6 | `_id_`, `path_1`, `parentId_1_sortOrder_1_isDeleted_1`, `ancestors_1`, `templateId_1`, `languages.code_1` |
| 7 | `languages` | 3 | `_id_`, `code_1`, `active_1_sortOrder_1` |
| 8 | `launchpad_apps` | 2 | `_id_`, `group_1_sortOrder_1` |
| 9 | `media` | 12 | `_id_`, `isFolder_1`, `parentId_1`, `path_1`, `fileDetails.mimeType_1`, `fileDetails.checksum_1`, `isDeleted_1`, `parentId_1_isFolder_1_isDeleted_1_sortOrder_1`, `ancestors_1`, `name_text_displayName_text`, `fileDetails.provider_1`, `fileDetails.publicId_1` |
| 10 | `publish_histories` | 4 | `_id_`, `startedAt_-1`, `status_1`, `rootItemId_1` |
| 11 | `publish_jobs` | 3 | `_id_`, `status_1_createdAt_-1`, `lockToken_1` |
| 12 | `roles` | 2 | `_id_`, `name_1` |
| 13 | `sessions` | 2 | `_id_`, `expires_1` |
| 14 | `settings` | 2 | `_id_`, `key_1` |
| 15 | `templates` | 5 | `_id_`, `name_1`, `baseTemplates_1`, `isSystem_1`, `path_1` |
| 16 | `testmaps` | 1 | `_id_` |
| 17 | `users` | 3 | `_id_`, `username_1`, `email_1` |
| 18 | `workflows` | 3 | `_id_`, `name_1`, `itemId_1` |
| 19 | `workflow_histories` | 5 | `_id_`, `itemId_1`, `toState_1`, `at_1`, `itemId_1_lang_1_version_1_at_-1` |

---

## 4. Danh sách Các Lệnh Phá Hoại / Thay Đổi Dữ Liệu Lớn

Các lệnh sau đây có tính chất thay đổi hoặc xóa hàng loạt dữ liệu và **bắt buộc phải được bọc qua chốt chặn `dbGuard.assertSafeFor('destructive')`**:

| Lệnh npm | Tệp script thực thi | Hành vi nguy hiểm | Rủi ro nếu chạy trên Cloud |
| :--- | :--- | :--- | :--- |
| `npm run seed` | `src/scripts/seed-initial-data.js` | Ghi đè/upsert dữ liệu gốc, users, roles, templates, item root | Thay đổi tài khoản admin, xóa sạch tùy biến |
| `npm run seed:presentation` | `src/scripts/seed-presentation-data.js` | Tạo/ghi đè các Layouts và Renderings hệ thống | Làm gãy cấu hình layout đang chạy |
| `npm run seed:sample` | `src/scripts/seed-sample-site.js` | Tạo cây site mẫu | Trộn dữ liệu mẫu vào trang thật |
| `npm run migrate:*` | `src/scripts/migrate-*.js` | Quét và sửa đổi hàng loạt schema, rename root, update fields | Xáo trộn toàn bộ Item nếu script chưa hoàn thiện |
| `npm run backup:restore` | `src/scripts/backup-cli.js restore` | Khôi phục cơ sở dữ liệu (đặc biệt `--in-place`) | Ghi đè toàn bộ dữ liệu đang có |
| `npm run recyclebin:purge-expired`| `src/scripts/purge-expired-recyclebin.js` | Xóa vĩnh viễn các item trong thùng rác | Mất dữ liệu không thể phục hồi |
| `npm run audit:prune` | `src/scripts/prune-expired-audit-logs.js` | Xóa bớt audit logs cũ | Mất vết kiểm toán |

---

## 5. Kết luận cho Giai đoạn E1

1. Tên database **`admin_cms`** và 19 collections trên local Docker sẽ được **giữ nguyên 100% không đổi**, không thêm hậu tố `_dev` hay `_local`.
2. Chốt chặn an toàn sẽ dựa trên **Phân loại Host** (Local vs Remote) kết hợp **Fingerprint môi trường** (`settings.environment = { appEnv: 'development' }`).
3. Chạy lệnh dev và test sẽ được cách ly tuyệt đối vào Docker MongoDB `127.0.0.1:27017` và DB tạm `_tmp_*` của Jest.

