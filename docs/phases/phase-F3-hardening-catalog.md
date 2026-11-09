# Giai đoạn F3: Universal Custom Field System - An Toàn & Hoàn Thiện Danh Mục (Hardening & Complete Catalog)

> File: `docs/phases/phase-F3-hardening-catalog.md`  
> Giai đoạn: F3  
> Trạng thái: Hoàn thành  
> Phụ thuộc: GĐ F1, GĐ F2, GĐ 2, GĐ 3, GĐ 7  
> Ngày bắt đầu: 2026-11-09  
> Ngày hoàn thành: 2026-11-09  

---

## 1. Mục tiêu Giai đoạn F3
1. **Field-level Security (Phân Quyền Cấp Trường - Field ACL):**
   - Hỗ trợ 3 nhóm quyền: `readRoles` (cho phép xem), `writeRoles` (cho phép sửa), `hiddenRoles` (ẩn hoàn toàn).
   - Bảo mật 2 lớp:
     - **Tầng Server (Backend Enforcement):** `itemService.js` / `versionService.js` kiểm tra vai trò user khi cập nhật fields; từ chối hoặc lọc bỏ các trường mà user không có quyền sửa; lọc bỏ trường bị ẩn khi trả dữ liệu API.
     - **Tầng Giao diện (SSR UI Enforcement):** `universal-renderer.ejs` không kết xuất trường bị `hiddenRoles`; khoá chỉ đọc `readonly`/`disabled` kèm huy hiệu `[Read-only]` khi thiếu `writeRoles`.
   - Cập nhật Modal Template Manager (`field-modal.ejs`) để chọn roles phân quyền cho trường.

2. **Hoàn thiện Danh mục Toàn diện 30+ Loại Trường (Complete Field Catalog):**
   - Bổ sung đầy đủ các định nghĩa trường và view partials:
     - `Slug / Auto-Alias`: Tự động sinh slug URL từ tiêu đề (kebab-case).
     - `Currency`: Tiền tệ có định dạng phân cách hàng nghìn.
     - `Percentage`: Tỉ lệ phần trăm (0 - 100%).
     - `Range / Slider`: Thanh trượt chọn giá trị số trong khoảng.
     - `Radio Group`: Nhóm nút tròn chọn 1 giá trị.
     - `Checkbox List`: Danh sách chọn nhiều giá trị độc lập.
     - `Time`: Chọn giờ phút (HH:mm).
     - `Date-Time`: Chọn cả ngày và giờ (ISO 8601).
     - `Date Range`: Khoảng thời gian `{ from, to }`.
     - `Gallery (Multi-Image)`: Chọn nhiều ảnh từ Media Library có sắp xếp thứ tự.
     - `File / Attachment`: Chọn file tài liệu (PDF, Word, Excel, Zip).
     - `Video / Embed`: Nhúng YouTube/Vimeo/Video URL kèm preview player.
     - `Content Reference`: Liên kết 1 Item khác trong cây nội dung.
     - `Multi-Item List`: Liên kết nhiều Items trong cây nội dung.
     - `Geo Location`: Tọa độ bản đồ `{ lat, lng, address }`.
     - `Key-Value Map`: Danh sách cặp Khóa - Giá trị động.
     - `JSON / Raw Data`: Dữ liệu JSON thô có kiểm tra cú pháp.

3. **Kiểm thử Tự động & Nghiệm thu (Testing & Verification):**
   - Viết test suite `tests/fieldAcl.test.js` kiểm tra toàn diện bảo mật phân quyền cấp trường.
   - Viết test suite `tests/extendedFieldsCatalog.test.js` kiểm tra validation, sanitization cho toàn bộ danh mục trường mới.
   - Bảo đảm 100% test suites toàn hệ thống tiếp tục đạt PASS.

---

## 2. Checklist Công việc (Tasks)
- [x] **Task F3.1:** Triển khai Field-level ACL tại tầng server (`src/services/itemService.js` và `src/services/versionService.js`).
- [x] **Task F3.2:** Cập nhật `field-modal.ejs` và `template-manager.js` để thiết lập `permissions` (`readRoles`, `writeRoles`, `hiddenRoles`).
- [x] **Task F3.3:** Viết các module định nghĩa cho nhóm trường Numeric & Text mở rộng (`slug`, `currency`, `percentage`, `range-slider`, `json-data`).
- [x] **Task F3.4:** Viết các module định nghĩa cho nhóm trường Selection & DateTime mở rộng (`radio-group`, `checkbox-list`, `time`, `date-time`, `date-range`).
- [x] **Task F3.5:** Viết các module định nghĩa cho nhóm trường Media, Relation & Structured (`gallery`, `file-attachment`, `video-embed`, `content-reference`, `multi-item-list`, `geo-location`, `key-value-map`).
- [x] **Task F3.6:** Xây dựng toàn bộ các view partials tương ứng trong `src/views/content-editor/fields/`.
- [x] **Task F3.7:** Viết bộ test `tests/fieldAcl.test.js` và `tests/extendedFieldsCatalog.test.js`, chạy kiểm thử toàn hệ thống đạt 100% PASS.

---

## 3. Definition of Done (DoD)
- [x] Field-level ACL được kiểm soát chặt chẽ ở cả backend và UI.
- [x] Toàn bộ 33 loại trường được đăng ký đầy đủ trong `FieldRegistry` và có view partials hoạt động mượt mà.
- [x] 100% test suites đạt PASS (45/45 suites, 470/470 tests), 0 ESLint errors, 0 branding violations.
