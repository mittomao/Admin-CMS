---
phase: 11-Y3
name: Serialize Field Definition Của Template Vào YAML
status: Hoàn thành
depends_on: [11-Y2, 3]
estimate: 2 ngày làm việc
started: 2026-11-11
completed: 2026-11-11
updated: 2026-11-11
---

# GĐ 11-Y3 - Serialize Field Definition Của Template Vào YAML

> Bổ sung định nghĩa đầy đủ các trường (Sections, Fields, Base Templates, Insert Options, Standard Values) vào tệp YAML của Item Template, bảo đảm tính ổn định từng byte, hiển thị rõ ràng trên `git diff` khi thêm/sửa/xoá trường, và hỗ trợ cơ chế Sync an toàn bảo vệ dữ liệu Item.

---

## 1. Mục tiêu Giai đoạn 11-Y3

1. **Nhúng Đầy Đủ Field Definition Vào Tệp YAML Template:**
   - Khi Reserialize section `Templates`, hệ thống đọc đồng thời cả 2 thực thể: `Item` (cây phân cấp) và `Template` (schema definition).
   - Xuất đầy đủ: `sections`, `fields` (với toàn bộ thuộc tính: name, title, type, source, required, defaultValue, shared, unversioned, helpText, validation, sortOrder, visibility, permissions, layout, config), `baseTemplates`, `insertOptions`, và `standardValues`.
   - Xuất ổn định từng byte (deterministic): Sắp xếp `sections` theo `sortOrder` rồi `id`; sắp xếp `fields` theo `sortOrder` rồi `id`; thứ tự khóa cố định; chuỗi quote chuẩn; không ghi timestamp.
2. **Theo Dõi Thay Đổi Cấu Trúc Bằng `git diff`:**
   - ID của section và field là bất biến (nguồn sự thật).
   - Khi đổi tên field $\rightarrow$ `git diff` chỉ thay đổi đúng 1 dòng `name`.
   - Khi thêm/xoá field $\rightarrow$ `git diff` chỉ thêm/bớt đúng 1 khối field tương ứng.
3. **Cơ Chế Sync An Toàn & Bảo Vệ Dữ Liệu:**
   - Khớp section và field theo ID.
   - Field có trong DB nhưng thiếu trong YAML: Mặc định **không xoá** (chỉ báo "field sẽ bị gỡ"); chỉ xoá khi bật cờ tuỳ chọn `deleteMissingFields: true` và có xác nhận.
   - Xoá field khỏi template **không xoá dữ liệu trong các item** (giữ nguyên theo nguyên tắc GĐ 3). Dry-Run cảnh báo rõ ràng số item đang có dữ liệu của field đó.
   - Kiểm tra tương thích khi đổi kiểu dữ liệu field đã có dữ liệu; chặn nếu không tương thích theo bảng tương thích GĐ 3.
   - Validate kiểu trường hợp lệ theo Field Registry (báo lỗi file:dòng nếu sai type).
   - Vô hiệu hoá cache `resolveTemplate` / `resolveEffectiveTemplate` sau khi sync.
4. **Công Cụ So Sánh Thay Đổi Field (`serialize:diff`):**
   - Hỗ trợ lệnh CLI `npm run serialize:diff` và hiển thị chi tiết khác biệt mức field trong modal Dry-Run của tab YAML Sync.

---

## 2. Bảng Phân Tích: Hiện Trạng $\rightarrow$ Thay Đổi $\rightarrow$ Rủi Ro

| Thành phần | Hiện trạng (GĐ 11-Y2) | Thay đổi trong GĐ 11-Y3 | Rủi ro kỹ thuật & Giải pháp giảm thiểu |
| :--- | :--- | :--- | :--- |
| **Nội dung YAML Template** | Chỉ chứa thuộc tính node cây của `Item` (`_id`, `name`, `path`, `icon`...) | Nhúng toàn bộ schema từ collection `templates`: `sections`, `fields`, `baseTemplates`, `insertOptions`, `standardValues` | *Rủi ro:* Làm bẩn diff hoặc thứ tự field bị nhảy lung tung.<br>*Giải pháp:* Deterministic serialization: sort sections/fields theo sortOrder + ID, khóa cố định. |
| **Quá trình Sync Template** | Chỉ ghi vào collection `items_master`, bỏ qua collection `templates` | Ghi đồng thời vào cả 2 collection `items_master` và `templates` trong cùng 1 transaction/luồng atomic | *Rủi ro:* Lỗi dở dang khiến 1 bên có dữ liệu, 1 bên thiếu.<br>*Giải pháp:* Atomic per template, rollback nếu có lỗi validate schema. |
| **Bảo vệ Dữ liệu khi Xoá Field** | Chưa hỗ trợ field | Mặc định không xoá field thiếu; chỉ xoá khi bật xác nhận; không xóa dữ liệu item cũ | *Rủi ro:* Mất dữ liệu bài viết đã nhập nếu xoá field.<br>*Giải pháp:* Dry-run đếm và cảnh báo số item đang dùng field đó; giữ nguyên data trong item.languages. |
| **Đổi Field Type** | Không kiểm tra | Áp dụng bảng tương thích kiểu dữ liệu (DEC-011); chặn đổi nếu không tương thích | *Rủi ro:* Hỏng hiển thị form hoặc lỗi crash SSR.<br>*Giải pháp:* Chặn đổi type nguy hiểm khi field đã có dữ liệu. |
| **Cache Template** | Cache in-memory không tự xoá khi sync YAML | Tự động clear cache `templateService` sau khi sync thành công | *Rủi ro:* Giao diện Admin hiển thị schema cũ.<br>*Giải pháp:* Gọi hàm xoá cache template ngay khi kết thúc sync. |

---

## 3. Checklist Công Việc Chi Tiết (Tasks)

### Nhóm 1: Serializer Đầy Đủ Field Definition
- [x] **Task 11-Y3.1:** Cập nhật `src/services/yamlItemSerializer.js`:
  - Mở rộng hàm `serializeItemToYaml`: Nếu item là Template, nạp bản ghi schema tương ứng từ collection `templates`.
  - Format `sections`, `fields` với đầy đủ mọi thuộc tính (id, name, title, type, source, required, defaultValue, shared, unversioned, helpText, validation, sortOrder, visibility, permissions, layout, config).
  - Sắp xếp deterministic: sections theo sortOrder rồi ID; fields theo sortOrder rồi ID.
  - Nhúng `baseTemplates`, `insertOptions`, và `standardValues`.
  - Kiểm tra tự động chống sót trường: so sánh keys của schema với output.

### Nhóm 2: Deserializer, Validator & Sync Engine
- [x] **Task 11-Y3.2:** Cập nhật hàm `parseYamlToItem` trong `src/services/yamlItemSerializer.js` để parse cấu trúc `sections`, `fields`, `baseTemplates`, `insertOptions`, `standardValues`.
- [x] **Task 11-Y3.3:** Cập nhật `src/services/yamlSectionService.js`:
  - Trong `reserializeSection('template')`: Kết hợp dữ liệu từ `Item` và `Template`.
  - Trong `dryRunSyncSection('template')`: So sánh chi tiết mức field (thêm, sửa, gỡ, đổi thứ tự, đổi type), đếm số item đang dùng field bị gỡ.
  - Trong `syncSection('template')`: Khớp field theo ID, áp dụng `createOnly` / `overwrite`, cập nhật song song collection `items_master` và `templates`.
  - Tự động xóa cache `resolveTemplate` và `resolveEffectiveTemplate` sau khi sync.

### Nhóm 3: Công Cụ So Sánh CLI & Cập Nhật Giao Diện
- [x] **Task 11-Y3.4:** Xây dựng lệnh so sánh `npm run serialize:diff` hiển thị khác biệt mức field giữa YAML và DB.
- [x] **Task 11-Y3.5:** Cập nhật modal Dry-Run trên giao diện Web (`yaml-sync-modal.ejs` và `serialization-yaml-sync.js`) hiển thị bảng chi tiết thay đổi field và cảnh báo dữ liệu đang dùng.

### Nhóm 4: Hướng Dẫn Sử Dụng & Kiểm Thử Tự Động
- [x] **Task 11-Y3.6:** Cập nhật `docs/guides/serialization.md` bổ sung hướng dẫn thêm/sửa/xoá field và theo dõi qua `git diff`.
- [x] **Task 11-Y3.7:** Viết bộ test kiểm thử tự động toàn diện:
  - Kiểm tra xuất đủ mọi thuộc tính của field, không bỏ sót thuộc tính schema nào.
  - Kiểm tra tính ổn định từng byte và diff gọn gàng.
  - Kiểm tra round-trip export $\rightarrow$ import $\rightarrow$ export byte-identical.
  - Kiểm tra chặn đổi type không tương thích và cảnh báo field đang có dữ liệu.

---

## 4. Definition of Done (DoD)

- [x] File YAML của Template chứa đầy đủ 100% field definitions (sections, fields, baseTemplates, insertOptions, standardValues).
- [x] Đổi tên field chỉ đổi đúng 1 dòng `name` trong `git diff`; thêm/xoá field chỉ tác động đúng khối đó.
- [x] Quá trình Sync cập nhật chính xác cả collection `items_master` và `templates`.
- [x] Mặc định không xoá field thiếu; chỉ xoá khi bật cờ và không làm mất dữ liệu item cũ; chặn đổi type không tương thích.
- [x] Lệnh `npm run serialize:diff` hoạt động chính xác.
- [x] Toàn bộ test suites đạt 100% PASS, `npm run lint` 0 lỗi.
- [x] **Tuyệt đối không có commit nào được tạo trong suốt quá trình.**
