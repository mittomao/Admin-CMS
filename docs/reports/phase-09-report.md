# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 9
## THÙNG RÁC (RECYCLE BIN), NHẬT KÝ KIỂM TOÁN (AUDIT LOG) & CHẶN XOÁ ITEM ĐANG DÙNG

- **Giai đoạn:** 9 (Recycle Bin, Audit Log, Safe Deletion & Reference Integrity)
- **Ngày bắt đầu:** 2026-11-09
- **Ngày hoàn thành:** 2026-11-09
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu)
- **Tài liệu tham chiếu:** [`docs/phases/phase-09-recycle-bin-audit.md`](../phases/phase-09-recycle-bin-audit.md)
- **Quyết định kiến trúc:**
  - [`docs/decisions/DEC-044-safe-deletion-reference-integrity-and-recycle-bin.md`](../decisions/DEC-044-safe-deletion-reference-integrity-and-recycle-bin.md)
  - [`docs/decisions/DEC-045-audit-log-event-bus-and-retention.md`](../decisions/DEC-045-audit-log-event-bus-and-retention.md)

---

### 1. Tóm tắt kết quả triển khai

Toàn bộ mục tiêu kỹ thuật và yêu cầu an toàn dữ liệu của Giai đoạn 9 đã được hoàn thiện 100%:

1. **Cơ chế Kiểm tra Toàn vẹn Tham chiếu (`referenceService.findReferences`):**
   - Độc lập, phân định rành mạch giữa **Chặn cứng (`BLOCK`, HTTP 409 Conflict)** và **Cảnh báo (`WARN`, HTTP 200/400 yêu cầu `confirmWarnings: true`)**:
     - `BLOCK`: Node hệ thống (`/root`, `/root/content`, `/root/layout`...), System Templates (`isSystem: true`), Layout / Rendering / Placeholder đang dùng trong Standard / Shared / Final Presentation, Component Template đang trỏ bởi Renderings, Base Template đang được kế thừa, Template đang có Item khởi tạo (Instance).
     - `WARN`: Datasource Items (`datasourceId`), Media Items, Rich Text Internal Links / Media links, Item hoặc nhánh con đang xuất bản trên Web Store (`items_web`).
   - Cung cấp API `GET /api/items/:id/references` cho Content Editor và các dịch vụ quản trị tra cứu trước khi thực hiện thao tác.

2. **Cơ chế Xóa mềm & Thùng rác (Recycle Bin):**
   - Mô hình `Item` được mở rộng metadata: `deleted`, `isDeleted`, `deletedAt`, `deletedBy`, `deletedFromPath`, `deletedFromParentId`, `deletionBatchId`.
   - Khi xóa một node có con cháu: Sinh `deletionBatchId` chung duy nhất cho toàn bộ nhánh con, đảm bảo khôi phục hoặc xóa vĩnh viễn trọn gói theo phiên.
   - Dịch vụ `recycleBinService.js`:
     - `list`: Lọc theo từ khóa (`q`), người xóa, khoảng thời gian, phân trang.
     - `getById`: Lấy thông tin kèm trạng thái node cha gốc (`parentStatus`) và bảng tham chiếu phụ thuộc.
     - `restore`: Khôi phục vị trí cũ nếu cha còn sống; yêu cầu chọn `targetParentId` nếu cha đã mất; tự động thêm hậu tố `(Restored)`, `(Restored 2)`... khi trùng tên; tính toán lại `path` và `ancestors` cho toàn bộ nhánh con.
     - `purge`: Xóa vĩnh viễn (Hard Delete) khỏi MongoDB Master; tự động đồng bộ dọn sạch trên Web Store (`PublishedItem.deleteMany`); dọn dẹp tài nguyên Cloudinary (`storageProvider.deleteFile`) khi và chỉ khi không còn bất kỳ item nào khác dùng chung `publicId`.
     - `purgeAll`: Xóa sạch toàn bộ Thùng rác (hoặc theo điều kiện lọc).
   - Giao diện người dùng tại `/admin/recycle-bin`: Danh sách, lọc, modal khôi phục, modal cảnh báo xóa vĩnh viễn.

3. **Nhật ký Kiểm toán (Audit Log):**
   - Collection `audit_logs` tương ứng với model bất biến `AuditLog.js` (compound indexes `{ at: -1 }`, `{ itemId: 1 }`, `{ userId: 1 }`, `{ action: 1 }`, `{ result: 1 }`).
   - Dịch vụ `auditService.js`:
     - Ghi log bất đồng bộ (Asynchronous via `eventBus`), không làm nghẽn hoặc ngắt quãng luồng xử lý chính.
     - Tự động làm sạch dữ liệu nhạy cảm (`password`, `token`, `secret`, `_csrf`...).
     - Tự động băm (hash SHA-256) và cắt ngắn các trường văn bản dài > 1000 ký tự.
     - Xuất dữ liệu CSV chuẩn RFC 4180 (thoát ký tự nháy kép, UTF-8 BOM cho Microsoft Excel).
     - Lắng nghe sự kiện toàn diện: Auth (login/logout/failed), Item lifecycle (create/update/rename/move/sort/duplicate/copy/delete/restore/purge), Versioning, Workflow state change, Web Publish/Unpublish, Presentation changes, Security/ACL.
   - Giao diện người dùng tại `/admin/audit-log`: Bảng tra cứu, tìm kiếm, lọc theo ngày/hành động/người dùng, xem JSON chi tiết, xuất CSV.

4. **Kịch bản Bảo trì & Chính sách Lưu trữ (Retention Policy):**
   - `npm run migrate:phase-09`: Backfill metadata Recycle Bin cho các item đã xóa mềm cũ (`src/scripts/migrate-phase-09-recycle-bin.js`), hỗ trợ `--dry-run` và `--rollback`.
   - `npm run recyclebin:purge-expired`: Tự động dọn dẹp các mục trong thùng rác cũ hơn `RECYCLE_BIN_RETENTION_DAYS` (mặc định 30 ngày, hỗ trợ `--dry-run`, `--days=X`).
   - `npm run audit:prune`: Tỉa bớt các bản ghi kiểm toán cũ hơn `AUDIT_RETENTION_DAYS` (mặc định 90 ngày, hỗ trợ `--dry-run`, `--days=X`).

5. **Phân quyền & Kiểm soát Truy cập:**
   - Hoàn toàn tuân thủ `canPerform`:
     - `recyclebin:read`: Xem danh sách Thùng rác.
     - `recyclebin:restore`: Khôi phục dữ liệu.
     - `recyclebin:purge`: Xóa vĩnh viễn dữ liệu.
     - `audit:read`: Xem và xuất Nhật ký kiểm toán.
   - Đã kích hoạt 2 thẻ ứng dụng hoạt động chính thức trên Launchpad: **Recycle Bin** và **Audit Log**.

---

### 2. Kết quả Kiểm thử & Đảm bảo Chất lượng

- **Kiểm thử tự động (Jest):**
  - Đã chạy toàn bộ test suite dự án: **34/34 test suites passed (100%)**.
  - Tổng số test case: **335/335 passed (100%)**.
  - Các bộ test trọng điểm của GĐ 9:
    - `tests/referenceService.test.js` (5/5 passed)
    - `tests/recycleBinService.test.js` (5/5 passed)
    - `tests/auditService.test.js` (5/5 passed)
    - `tests/recycleBinApi.test.js` (5/5 passed)
    - Toàn bộ các test cũ GĐ 0 → 8.1, 10, R1, R2 đều tương thích và pass 100%.
- **Kiểm tra Mã nguồn (ESLint):**
  - `npm run lint`: **0 lỗi (0 errors, 6 warnings cho phép)**.
- **Kiểm tra Thương hiệu (Branding Audit):**
  - `npm run check:branding`: **100% Treecraft & Root `/root` compliance**.

---

### 3. Trạng thái Git (`git status --short`)

> **LƯU Ý:** Tuân thủ tuyệt đối quy tắc vàng, agent **không thực hiện bất kỳ lệnh commit nào**. Dưới đây là danh sách thay đổi để người dùng review:

```text
 M docs/decisions/README.md
 M docs/phases/README.md
 M docs/phases/phase-09-recycle-bin-audit.md
 M package.json
 M public/js/admin/content-editor.js
 M src/app.js
 M src/config/env.js
 M src/config/permissions.js
 M src/controllers/admin/authController.js
 M src/controllers/admin/contentEditorController.js
 M src/controllers/admin/launchpadController.js
 M src/models/Item.js
 M src/routes/api/itemRoutes.js
 M src/services/aclService.js
 M src/services/itemService.js
 M src/services/presentationService.js
 M src/services/webItemService.js
 M tests/siteRenderer.test.js
?? docs/decisions/DEC-044-safe-deletion-reference-integrity-and-recycle-bin.md
?? docs/decisions/DEC-045-audit-log-event-bus-and-retention.md
?? docs/reports/phase-09-report.md
?? src/controllers/admin/auditController.js
?? src/controllers/admin/recycleBinController.js
?? src/models/AuditLog.js
?? src/routes/admin/auditRoutes.js
?? src/routes/admin/recycleBinRoutes.js
?? src/routes/api/auditRoutes.js
?? src/routes/api/recycleBinRoutes.js
?? src/scripts/migrate-phase-09-recycle-bin.js
?? src/scripts/prune-expired-audit-logs.js
?? src/scripts/purge-expired-recyclebin.js
?? src/services/auditService.js
?? src/services/recycleBinService.js
?? src/services/referenceService.js
?? src/utils/requestHelper.js
?? src/views/admin/audit/viewer.ejs
?? src/views/admin/recycle-bin/index.ejs
?? tests/auditService.test.js
?? tests/recycleBinApi.test.js
?? tests/recycleBinService.test.js
?? tests/referenceService.test.js
```

---

### 4. Gợi ý Commit Messages (Cho người dùng)

Người dùng có thể gom và commit theo 4 commit nhỏ tương ứng:

#### Commit 1: Kiến trúc, Quyết định và Phân quyền GĐ 9
```bash
git add docs/decisions/DEC-044* docs/decisions/DEC-045* docs/decisions/README.md docs/phases/ src/config/permissions.js src/services/aclService.js src/config/env.js package.json
git commit -m "docs(decisions): add DEC-044 and DEC-045 for safe deletion, recycle bin and audit log"
```

#### Commit 2: Model & Dịch vụ Toàn vẹn Tham chiếu, Soft Delete, Thùng rác
```bash
git add src/models/Item.js src/services/referenceService.js src/services/itemService.js src/services/recycleBinService.js src/services/storage/ src/scripts/migrate-phase-09-recycle-bin.js src/scripts/purge-expired-recyclebin.js tests/referenceService.test.js tests/recycleBinService.test.js
git commit -m "feat(recycle-bin): implement referenceService, soft delete batching and recycleBinService with Web/Cloudinary purge"
```

#### Commit 3: Dịch vụ Audit Log và Lắng nghe Sự kiện Hệ thống
```bash
git add src/models/AuditLog.js src/services/auditService.js src/utils/requestHelper.js src/controllers/admin/authController.js src/controllers/admin/contentEditorController.js src/services/presentationService.js src/scripts/prune-expired-audit-logs.js tests/auditService.test.js
git commit -m "feat(audit): implement immutable auditLog model, eventBus listeners, and retention prune script"
```

#### Commit 4: Giao diện Người dùng, Routes, Launchpad Tiles và Kiểm thử Toàn diện
```bash
git add src/app.js src/routes/admin/ src/routes/api/ src/controllers/admin/launchpadController.js src/controllers/admin/recycleBinController.js src/controllers/admin/auditController.js src/views/admin/recycle-bin/ src/views/admin/audit/ public/js/admin/content-editor.js tests/recycleBinApi.test.js docs/reports/phase-09-report.md
git commit -m "feat(ui): add recycle bin and audit log viewer pages, launchpad tiles, and API routes"
```

---

### 5. Hướng dẫn Kiểm thử Thủ công (Manual Verification Guide)

1. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```
2. **Đăng nhập:**
   - Mở trình duyệt tại `http://localhost:4000/admin/login`.
   - Đăng nhập với tài khoản Administrator (`admin` / `pass123`).
3. **Kiểm tra Launchpad:**
   - Tại `http://localhost:4000/admin/launchpad`, nhóm *Control Panel & Maintenance* có 2 tile hoạt động: **Recycle Bin** và **Audit Log**.
4. **Kiểm tra Safe Deletion (Chặn xóa):**
   - Vào Content Editor (`/admin/content-editor`), chọn node Rendering `/root/layout/Renderings/HeroBanner`.
   - Bấm nút Delete trên Ribbon.
   - Hệ thống sẽ chặn và hiển thị thông báo lỗi (409 Conflict): `Không thể xóa item: Rendering đang được sử dụng trong Standard Presentation của Template...`.
5. **Kiểm tra Xóa mềm & Thùng rác:**
   - Tạo một trang mới dưới `/root/content` (ví dụ: `bai-viet-thu-nghiem`).
   - Xóa trang này. Item biến mất khỏi cây Content Editor.
   - Mở Thùng rác (`/admin/recycle-bin`), thấy `bai-viet-thu-nghiem` xuất hiện với đầy đủ đường dẫn gốc, người xóa, thời gian xóa.
   - Bấm nút **Restore** -> Xác nhận khôi phục -> Quay lại Content Editor thấy bài viết xuất hiện trở lại đúng vị trí cũ.
6. **Kiểm tra Nhật ký Kiểm toán:**
   - Truy cập `/admin/audit-log`.
   - Thấy toàn bộ chuỗi hành động vừa thực hiện: `AUTH_LOGIN`, `ITEM_CREATE`, `ITEM_DELETE`, `ITEM_RESTORE`.
   - Bấm nút con mắt xem chi tiết JSON của từng dòng log.
   - Bấm nút **Xuất CSV** để tải về file `audit_logs_YYYY-MM-DD.csv`.

