---
phase: 11-Y2
name: Tab "YAML Sync" Theo Từng Section Trên Trang Serialization
status: Hoàn thành
depends_on: [11]
estimate: 2 ngày làm việc
started: 2026-11-11
completed: 2026-11-11
updated: 2026-11-11
---

# GĐ 11-Y2 - Tab "YAML Sync" Theo Từng Section Trên Trang Serialization

> Hệ thống đồng bộ YAML theo từng nhánh phân cấp độc lập: Thêm Tab thứ 3 "YAML Sync" trên trang `/admin/serialization`, hỗ trợ 4 section cốt lõi (Content, Layout, Rendering, Template), nút Reserialize và Sync theo section, cơ chế Dry-run bắt buộc, quản lý phụ thuộc tham chiếu, giữ nguyên 100% hành vi 2 tab JSON cũ.

---

## 1. Mục tiêu Giai đoạn 11-Y2

1. **Tab Thứ 3 "YAML Sync" Trực Quan & Thống Nhất Phong Cách:**
   - Mở rộng giao diện `/admin/serialization` thêm Tab thứ 3 bên cạnh 2 tab JSON hiện có (Xuất Gói & Nhập Gói).
   - Tái sử dụng 100% hệ thống design tokens, class Tailwind có sẵn và Tabler / Bootstrap components (không thêm bất kỳ thư viện CSS hay cấu hình style song song nào).
   - Hiển thị 4 khối section xếp dọc: **Content**, **Layout**, **Rendering**, **Template**.
   - Mỗi khối có: Checkbox chọn, tên section, mô tả 1 dòng, nút **Reserialize** (DB $\rightarrow$ YAML), nút **Sync** (YAML $\rightarrow$ DB), liên kết **Show Config** (mở rộng xem chi tiết nhánh gốc, thư mục tương đối, mode mặc định, phụ thuộc), và badge **Dep: n** khi có phụ thuộc.
   - Trạng thái trực quan tải bất đồng bộ: Số item trong DB, số file YAML trong thư mục, thời điểm reserialize/sync gần nhất, và badge so sánh trạng thái (Đồng bộ / DB mới hơn / YAML mới hơn / Chưa có YAML).
   - Checkbox tổng "Chọn tất cả" và 2 nút thao tác hàng loạt: **Reserialize selected** và **Sync selected** (chạy tuần tự theo đúng thứ tự phụ thuộc).

2. **Ánh Xạ Section $\rightarrow$ Nhánh Cây $\rightarrow$ Thư Mục Lưu Trữ (`serializationSections.js`):**
   - Quản lý cấu hình 4 section trong một file duy nhất `src/config/serializationSections.js`:
     - **Content:** Nhánh `ROOT_PATH/content` $\rightarrow$ Thư mục `items/content/`. Mode mặc định: `createOnly`. Phụ thuộc: `Template`, `Layout`, `Rendering`.
     - **Layout:** Nhánh `ROOT_PATH/layout/Layouts` và `ROOT_PATH/layout/Placeholders` $\rightarrow$ Thư mục `items/layout/Layouts/`, `items/layout/Placeholders/`. Mode mặc định: `overwrite`. Phụ thuộc: `Template`.
     - **Rendering:** Nhánh `ROOT_PATH/layout/Renderings` $\rightarrow$ Thư mục `items/layout/Renderings/`. Mode mặc định: `overwrite`. Phụ thuộc: `Template`.
     - **Template:** Nhánh `ROOT_PATH/templates` (mặc định loại trừ `System`) $\rightarrow$ Thư mục `items/templates/`. Mode mặc định: `overwrite`. Không phụ thuộc.
   - Thư mục gốc `SERIALIZATION_DIR` dùng chung mọi môi trường, được xác thực an toàn trong `src/config/serializationPaths.js` (chống path traversal, cấm trỏ vào `public/`, `src/`, `.git/`, `BACKUP_DIR`).

3. **Cơ Chế Reserialize (DB $\rightarrow$ YAML, theo Section):**
   - Quét luồng (stream) các item thuộc nhánh cây của section đó.
   - Mỗi item một file YAML có định dạng chuẩn, ổn định từng byte (deterministic serialization: sắp xếp keys, thụt lề cố định, LF newline).
   - **Giữ nguyên timestamp `mtime`:** Không ghi đè nếu nội dung file không thay đổi để `git status` / `git diff` chỉ hiển thị những item thực sự có biến động.
   - Tệp manifest của section (`.manifest.json`) tách riêng để không làm bẩn diff của các file item.
   - Phát hiện "file mồ côi" (file có trong thư mục nhưng không còn trong DB); chỉ xóa khi người dùng chủ động bật cờ **Dọn file mồ côi** (mặc định tắt).

4. **Cơ Chế Sync (YAML $\rightarrow$ DB, theo Section):**
   - Chỉ đọc các tệp YAML trong thư mục của section đó.
   - Xác thực schema, cấm YAML tags/aliases độc hại, kiểm tra giới hạn kích thước tệp.
   - **Từ chối ngay lập tức** bất kỳ tệp YAML nào có `path` nằm ngoài nhánh của section đó.
   - **Bắt buộc Dry-Run trước khi ghi thật:** Modal hiển thị bảng xem trước (số item tạo mới, cập nhật, giữ nguyên, lỗi). Chỉ khi hoàn tất Dry-Run thành công mới bật nút "Thực hiện Sync". Ghi nhận hash thư mục; nếu thư mục bị thay đổi sau khi dry-run, bắt buộc phải dry-run lại.
   - **Xử lý xung đột theo Mode:** `createOnly` (chỉ tạo item mới, giữ nguyên item đã có) và `overwrite` (cập nhật fields, ngôn ngữ, presentation). Cảnh báo đỏ khi người dùng chuyển sang `overwrite` cho Content.
   - **Kiểm tra phụ thuộc (Pre-check References):** Khi sync một section, nếu phát hiện tham chiếu tới Template hoặc Rendering chưa có trong DB và cũng không nằm trong các section đang được sync cùng lúc, hệ thống dừng lại và hiển thị cảnh báo hướng dẫn sync section phụ thuộc trước.
   - Môi trường `staging` / `production`: Đi qua chốt chặn an toàn `dbGuard` (bắt buộc gõ lại tên DB và Host, tự động tạo bản sao lưu an toàn pre-sync).

5. **CLI, API & Phân Quyền Bảo Mật:**
   - CLI script: `npm run serialize:section -- reserialize <key|all>`, `npm run serialize:section -- sync <key|all> [--dry-run] [--mode createOnly|overwrite]`, `npm run serialize:section -- status`.
   - API endpoints bảo mật: `/api/serialization/sections/...` với CSRF, `canPerform` (`serialization:reserialize`, `serialization:sync`), khoá chống chạy trùng tiến trình (concurrency lock).
   - Phát sự kiện audit log cho mọi thao tác Reserialize và Sync.

---

## 2. Bảng Phân Tích: Hiện Trạng $\rightarrow$ Thay Đổi $\rightarrow$ Rủi Ro

| Thành phần | Hiện trạng (GĐ 11) | Thay đổi trong GĐ 11-Y2 | Rủi ro kỹ thuật & Giải pháp giảm thiểu |
| :--- | :--- | :--- | :--- |
| **Giao diện trang Quản trị** | Có 2 Tab: "Xuất Gói" và "Nhập Gói" định dạng JSON | Thêm Tab thứ 3: "YAML Sync", hiển thị 4 khối section, nút Reserialize/Sync, Show Config, Dep badge, status badge, modal xác nhận kèm dry-run | *Rủi ro:* Làm vỡ giao diện 2 tab cũ hoặc lệch style.<br>*Giải pháp:* Giữ nguyên 100% HTML/JS của 2 tab cũ, dùng chung class Tabler và Tailwind có sẵn. |
| **Định dạng Lưu trữ** | 1 file JSON duy nhất chứa toàn bộ các nhánh | Mỗi item 1 file YAML độc lập trong thư mục section tương ứng dưới `SERIALIZATION_DIR` | *Rủi ro:* Diff Git bị bẩn do key xáo trộn hoặc mtime thay đổi.<br>*Giải pháp:* Deterministic serialization (sort keys), không ghi nếu nội dung trùng, tách manifest riêng. |
| **Phạm vi Thao tác** | Toàn bộ cây hoặc các phân vùng xuất chung vào 1 file | Giới hạn nghiêm ngặt theo từng nhánh section: Content, Layout, Rendering, Template | *Rủi ro:* File YAML giả mạo path ngoài nhánh ghi đè hệ thống.<br>*Giải pháp:* Kiểm tra nghiêm ngặt `item.path`, từ chối file có path ngoài nhánh section. |
| **An toàn Dữ liệu khi Nhập** | 4 bước tuần tự trong 1 file JSON | Nhập theo section, bắt buộc Dry-run trước khi ghi thật, kiểm tra phụ thuộc tham chiếu (Template trước, Content sau) | *Rủi ro:* Mất dữ liệu bài viết trên Content hoặc thiếu template.<br>*Giải pháp:* Content mặc định `createOnly`, cảnh báo khi chọn `overwrite`, kiểm tra phụ thuộc trước khi chạy. |
| **Bảo vệ Môi trường** | Kiểm tra quyền qua `canPerform` | Bổ sung chốt chặn `dbGuard` cho `staging`/`production`: gõ lại tên DB & Host, auto backup K1 pre-sync | *Rủi ro:* Sync nhầm đè dữ liệu Cloud.<br>*Giải pháp:* Bắt buộc qua `dbGuard` và modal xác nhận 2 lớp. |

---

## 3. Bảng Thành Phần UI Tái Sử Dụng

| Tên Component | Trạng thái | Nguồn gốc / Triển khai | Mô tả & Cách áp dụng |
| :--- | :--- | :--- | :--- |
| **Tab Navigation Header** | Có sẵn | `src/views/admin/serialization/index.ejs` | Thêm thẻ `<li>` thứ 3 với `data-bs-target="#tab-yaml-sync"`, icon `ti ti-refresh`. |
| **Section Card Block** | Có sẵn mẫu | `index.ejs` (Branch Checkboxes Grid) | Card bo góc `rounded-2xl`, viền `border-slate-200 dark:border-slate-700`, nền trắng/slate-900. |
| **Button Primary / Success / Outline** | Có sẵn | Tabler Core & Tailwind buttons | Nút Reserialize: `btn-outline-primary`; Nút Sync: `btn-outline-success`; Nút hàng loạt: `btn-primary`, `btn-success`. |
| **Badge Trạng thái & Phụ thuộc** | Có sẵn | Tabler badge + Tailwind classes | Badge `Dep: n`: `bg-amber-50 text-amber-700`; Badge Đồng bộ: `bg-emerald-50 text-emerald-700`; DB mới hơn: `bg-blue-50 text-blue-700`. |
| **Show Config Accordion/Collapse** | Có sẵn | Bootstrap 5 Collapse (`data-bs-toggle="collapse"`) | Bấm vào mở rộng thông tin: root path, folder tương đối, default mode, danh sách phụ thuộc. |
| **Modal Xác Nhận & Dry-Run** | Cần tạo partial | `src/views/admin/serialization/partials/yaml-sync-modal.ejs` | Modal Bootstrap 5 chuẩn hệ thống, hiển thị hướng dữ liệu, tên nhánh, môi trường, bảng xem trước dry-run, thanh progress bar. |
| **Job Progress Bar & Log Terminal** | Có sẵn mẫu | Tabler Progress Bar & Backup CLI logs | Thanh progress `bg-primary rounded-full`, terminal dark monospace `bg-slate-900 text-emerald-400`. |
| **Toast Notifications** | Có sẵn | Hàm `showToast()` trong `index.ejs` | Báo cáo chi tiết kết quả thao tác xuất, dry-run và sync. |

---

## 4. Checklist Công Việc Chi Tiết (Tasks)

### Nhóm 1: Cấu hình, Đường dẫn & Lõi Serialization YAML
- [x] **Task 11-Y2.1:** Tạo cấu hình `src/config/serializationSections.js` khai báo 4 section (`content`, `layout`, `rendering`, `template`), dựng root path từ `branding.PATHS`, mode mặc định và quan hệ phụ thuộc `dependsOn`.
- [x] **Task 11-Y2.2:** Tạo module quản lý đường dẫn `src/config/serializationPaths.js` (xác thực `SERIALIZATION_DIR`, ngăn chặn path traversal, cấm trỏ vào thư mục nguy hiểm `public/`, `src/`, `.git/`, `BACKUP_DIR`).
- [x] **Task 11-Y2.3:** Xây dựng module đọc/ghi YAML deterministic `src/services/yamlItemSerializer.js` (sắp xếp key ổn định, format chuẩn 2 spaces, LF newline, no tags/aliases, cơ chế so sánh tránh đổi mtime khi nội dung không đổi).
- [x] **Task 11-Y2.4:** Xây dựng dịch vụ quản lý Section YAML `src/services/yamlSectionService.js`:
  - `getSectionStatus(sectionKey)`: Thống kê items trong DB, số file YAML, thời điểm reserialize/sync gần nhất, trạng thái so sánh.
  - `reserializeSection(sectionKey, options)`: Quét nhánh cây, ghi file YAML, cập nhật `.manifest.json`, báo file mồ côi, hỗ trợ tùy chọn `pruneOrphans`.
  - `dryRunSyncSection(sectionKey, options)`: Đọc file YAML, validate schema, kiểm tra path ngoài nhánh, phát hiện xung đột, kiểm tra phụ thuộc tham chiếu, sinh mã hash kiểm soát thay đổi.
  - `syncSection(sectionKey, options)`: Thực thi ghi dữ liệu theo mode (`createOnly` / `overwrite`), khớp theo ID, ghi cha trước con, tích hợp `dbGuard` và audit log.

### Nhóm 2: Controller, Route API & Background Job
- [x] **Task 11-Y2.5:** Xây dựng các API endpoints trong `src/controllers/admin/serializationSectionController.js` và `src/routes/api/serializationSectionRoutes.js`:
  - `GET /api/serialization/sections`: Trả về danh sách section kèm trạng thái chi tiết.
  - `POST /api/serialization/sections/:key/reserialize`: Thực thi xuất section.
  - `POST /api/serialization/sections/:key/sync/dry-run`: Xem trước kết quả sync.
  - `POST /api/serialization/sections/:key/sync`: Thực thi sync dữ liệu thật.
  - `GET /api/serialization/sections/jobs/:id` & `POST /:id/cancel`: Quản lý tiến trình job.
- [x] **Task 11-Y2.6:** Xây dựng công cụ dòng lệnh CLI `src/scripts/serialize-section-cli.js` và đăng ký lệnh npm trong `package.json` (`npm run serialize:section`).

### Nhóm 3: Giao diện Tab "YAML Sync" & Trải nghiệm Người dùng
- [x] **Task 11-Y2.7:** Cập nhật `src/views/admin/serialization/index.ejs`:
  - Thêm thẻ Tab thứ 3 `<li class="nav-item">` "YAML Sync".
  - Thêm nội dung `<div class="tab-pane" id="tab-yaml-sync">`: Thanh công cụ trên cùng (checkbox chọn tất cả, nút Reserialize selected, nút Sync selected), danh sách 4 thẻ section với đầy đủ thông tin, trạng thái, nút hành động, liên kết Show Config và badge Dep.
  - Tích hợp modal xác nhận & dry-run `src/views/admin/serialization/partials/yaml-sync-modal.ejs`.
- [x] **Task 11-Y2.8:** Xây dựng client script `public/js/admin/serialization-yaml-sync.js`:
  - Tải trạng thái bất đồng bộ của 4 section khi mở tab.
  - Xử lý sự kiện Reserialize, Sync, Dry-run trong modal, hiển thị progress bar và log trực tiếp.
  - Lắng nghe kết quả và phát Toast thông báo chi tiết.

### Nhóm 4: Hướng Dẫn Sử Dụng & Kiểm Thử Tự Động
- [x] **Task 11-Y2.9:** Viết hướng dẫn sử dụng chi tiết chuẩn 7 mục tại `docs/guides/serialization.md`.
- [x] **Task 11-Y2.10:** Viết bộ test tự động:
  - `tests/yamlSerializationService.test.js`: Kiểm thử reserialize, deterministic byte-matching, giữ mtime, validate schema, từ chối path ngoài nhánh, mode `createOnly` và `overwrite`.
  - `tests/yamlSectionSyncApi.test.js`: Kiểm thử API dry-run, sync, quyền `canPerform`, kiểm tra phụ thuộc Template $\rightarrow$ Content.
  - Chạy toàn bộ test suites của hệ thống, bảo đảm 100% PASS, 0 ESLint errors, 0 branding violations.

---

## 5. Definition of Done (DoD)

- [x] Tab thứ 3 "YAML Sync" hiển thị đầy đủ trên `/admin/serialization` với 4 section chuẩn hóa, phong cách đồng nhất với hệ thống.
- [x] Reserialize và Sync hoạt động độc lập và chính xác theo từng section, tuyệt đối không chạm vào các item ngoài nhánh cây.
- [x] Quá trình xuất đạt tính deterministic từng byte, không ghi đè nếu file không đổi (giữ nguyên `mtime`).
- [x] Quá trình Sync bắt buộc có bước Dry-run, tuân thủ đúng mode (`createOnly` cho Content, `overwrite` cho các mục còn lại), và kiểm tra phụ thuộc tham chiếu chặt chẽ.
- [x] Hai tab JSON cũ giữ nguyên 100% giao diện và hành vi hoạt động bình thường.
- [x] Không có role cứng, mọi thao tác phân quyền đi qua `canPerform`.
- [x] Hướng dẫn sử dụng `docs/guides/serialization.md` hoàn thiện theo đúng mẫu 7 mục.
- [x] Toàn bộ test suites đạt 100% PASS, ESLint 0 lỗi, Branding 100% Treecraft.
- [x] **Tuyệt đối không có commit nào được tạo trong suốt quá trình thực hiện.**

