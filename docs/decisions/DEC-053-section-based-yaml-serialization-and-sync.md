# DEC-053: Kiến Trúc Đồng Bộ YAML Theo Từng Section Phân Cấp (Section-Based YAML Sync)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày quyết định:** 2026-11-11
- **Phạm vi:** GĐ 11-Y2, Serialization, Content Management, Developer Experience, Multi-Environment Sync
- **Người đề xuất:** Antigravity Tech Lead
- **Người duyệt:** max.nguyen

---

## 1. Ngữ cảnh & Đặt vấn đề

Giai đoạn 11 đã hoàn thành cơ chế đóng gói và phục hồi dữ liệu thông qua gói JSON đa phân vùng (`treecraft-package-*.json`). Mặc dù gói JSON giải quyết rất tốt bài toán sao lưu tổng thể và di chuyển môi trường trọn gói, trong quy trình phát triển hằng ngày của các lập trình viên và nhóm cộng tác mã nguồn (Git flow), việc serialize toàn bộ cây nội dung vào một file JSON duy nhất bộc lộ nhiều hạn chế:
1. **Xung đột Git (Merge Conflicts):** Khi nhiều lập trình viên cùng chỉnh sửa các template, component hoặc trang nội dung khác nhau, việc lưu tất cả vào một file JSON khổng lồ sẽ gây ra xung đột merge không thể giải quyết tự động.
2. **Không đồng bộ theo ngữ cảnh (Lack of Granular Scoping):** Lập trình viên frontend chỉ muốn đồng bộ nhánh `Renderings` và `Layouts`, trong khi chuyên viên giải pháp muốn đồng bộ `Templates`, và biên tập viên chỉ muốn đồng bộ một phần `Content`. Việc phải xuất/nhập toàn bộ cây gây tốn thời gian và rủi ro ghi đè dữ liệu ngoài ý muốn.
3. **Nhu cầu lưu trữ dạng file phân tán (One Item Per File):** Triết lý Sitecore Unicorn / Rainbow chứng minh rằng việc lưu mỗi item là một file YAML có định dạng ổn định giúp theo dõi lịch sử thay đổi rõ ràng trên Git diff từng dòng.

Do đó, hệ thống cần bổ sung **Tab thứ 3 "YAML Sync"** trên trang Serialization, cho phép thực thi Reserialize (DB $\rightarrow$ YAML) và Sync (YAML $\rightarrow$ DB) **theo từng section của cây**, độc lập và an toàn tuyệt đối.

---

## 2. Quyết định Kỹ thuật

### 2.1. Cấu Trúc 4 Section Cốt Lõi & Ánh Xạ Phân Cấp
Hệ thống chuẩn hóa 4 section được khai báo trong `src/config/serializationSections.js`:
1. **`content`:**
   - Nhánh DB: `ROOT_PATH/content`
   - Thư mục lưu trữ: `items/content/` (dưới `SERIALIZATION_DIR`)
   - Mode mặc định: `createOnly` (chỉ tạo item chưa có, không ghi đè bài viết đang sửa)
   - Phụ thuộc: `template`, `layout`, `rendering`
2. **`layout`:**
   - Nhánh DB: `ROOT_PATH/layout/Layouts` và `ROOT_PATH/layout/Placeholders`
   - Thư mục lưu trữ: `items/layout/Layouts/` và `items/layout/Placeholders/`
   - Mode mặc định: `overwrite`
   - Phụ thuộc: `template`
3. **`rendering`:**
   - Nhánh DB: `ROOT_PATH/layout/Renderings`
   - Thư mục lưu trữ: `items/layout/Renderings/`
   - Mode mặc định: `overwrite`
   - Phụ thuộc: `template`
4. **`template`:**
   - Nhánh DB: `ROOT_PATH/templates` (mặc định loại trừ `ROOT_PATH/templates/System`)
   - Thư mục lưu trữ: `items/templates/`
   - Mode mặc định: `overwrite`
   - Phụ thuộc: Không có

### 2.2. Xuất Ổn Định Từng Byte (Deterministic Byte-Stability) & Giữ Nguyên Mtime
- Mỗi item được lưu thành một tệp YAML (`<item-name>.yml`).
- Định dạng xuất YAML được chuẩn hóa:
  - Sắp xếp thứ tự các khóa theo thứ tự cố định (`id`, `name`, `path`, `template`, `parentId`, `sharedFields`, `languages`).
  - Sử dụng định dạng thụt lề 2 khoảng trắng, ngắt dòng LF (`\n`), không sử dụng YAML custom tags hoặc YAML aliases (`&anchor`, `*alias`).
  - Loại bỏ hoàn toàn các thông tin nhạy cảm: settings mật, mật khẩu hash, audit logs, lịch sử session.
- **Cơ chế so sánh giữ nguyên timestamp `mtime`:** Trước khi ghi file ra đĩa cứng, hệ thống so sánh chuỗi YAML mới với nội dung file hiện có. Nếu giống nhau 100%, bỏ qua việc ghi đè để giữ nguyên `mtime`, đảm bảo `git status` không hiển thị file thay đổi giả tạo.
- **Tách tệp Manifest:** Thông tin thống kê lần xuất (`.manifest.json`) được lưu tách biệt khỏi các file YAML của item để tránh gây bẩn diff Git.

### 2.3. Quy Trình Sync Bắt Buộc Dry-Run & Kiểm Tra Phụ Thuộc
1. **Giới hạn nghiêm ngặt theo nhánh:** Tệp YAML đọc vào bắt buộc phải có `path` nằm trong nhánh gốc của section đó. Mọi tệp có `path` ngoài nhánh sẽ bị từ chối ngay lập tức để chống tấn công Path Traversal.
2. **Dry-Run bắt buộc:** Người dùng không thể thực hiện Sync trực tiếp nếu chưa chạy Dry-Run thành công trong modal xác nhận. Dry-Run ghi nhận mã băm (hash) của thư mục; nếu thư mục bị sửa đổi sau khi Dry-Run, hệ thống bắt buộc phải Dry-Run lại.
3. **Kiểm tra phụ thuộc tham chiếu (Pre-check References):** Khi Sync một section (ví dụ `content`), hệ thống quét trước toàn bộ `templateId`, `layoutId`, `renderingId`. Nếu phát hiện tham chiếu chưa tồn tại trong DB và cũng không nằm trong các section đang được sync cùng lúc, tiến trình dừng lại kèm thông báo lỗi và hướng dẫn sync section phụ thuộc trước.
4. **Thứ tự thực thi khi sync hàng loạt:** Khi người dùng chọn nhiều section, hệ thống tự động sắp xếp theo đúng thứ tự phụ thuộc: `template` $\rightarrow$ `layout` $\rightarrow$ `rendering` $\rightarrow$ `content`.

### 2.4. Bảo Vệ Môi Trường (dbGuard) & Xử Lý File Mồ Côi
- Tại môi trường `staging` và `production`, mọi lệnh Sync bắt buộc phải vượt qua chốt chặn `dbGuard` (DEC-052): người dùng phải gõ lại chính xác tên Database và Host, đồng thời hệ thống tự động kích hoạt sao lưu an toàn pre-sync.
- Mặc định, các file YAML mồ côi (không còn item tương ứng trong DB) chỉ được liệt kê trong báo cáo; hệ thống chỉ xóa file mồ côi khi người dùng bật cờ tường minh `--prune-orphans` hoặc tick chọn tùy chọn trong giao diện.

---

## 3. Hệ quả & Lợi ích

- **Triệt tiêu xung đột Git:** Các nhóm phát triển có thể làm việc song song trên các nhánh khác nhau mà không lo đụng độ file package khổng lồ.
- **Độ an toàn tối đa:** Cơ chế Dry-run bắt buộc, mode `createOnly` cho Content và kiểm tra phụ thuộc tham chiếu loại bỏ triệt để nguy cơ mất mát dữ liệu hoặc đứt gãy quan hệ Item.
- **Tương thích hoàn hảo:** Giữ nguyên 100% hai tab JSON cũ cho các kịch bản sao lưu/phục hồi trọn gói truyền thống.

