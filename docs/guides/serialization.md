# Hướng Dẫn Sử Dụng Tính Năng Serialization & YAML Sync (DEC-054 / DEC-055)

> Tài liệu hướng dẫn chi tiết dành cho Lập trình viên và Quản trị viên hệ thống Treecraft CMS về quy trình Đóng gói (JSON Package), Đồng bộ YAML theo phân vùng (Section-Based YAML Sync), Cấu trúc thư mục rút gọn (DEC-054) và Đồng bộ Định nghĩa Field của Template (DEC-055).

---

## 1. Mục Đích & Khi Nào Sử Dụng

### 1.1. Mục đích
Tính năng Serialization trong Treecraft CMS phục vụ 2 kịch bản chính:
1. **Gói JSON Đa Phân Vùng (Tab 1 "Xuất Gói" & Tab 2 "Nhập Gói"):** Sử dụng khi cần xuất/nhập toàn bộ dữ liệu hoặc trích xuất các phân vùng lớn thành một tệp `.json` duy nhất để sao lưu hệ thống, chuyển giao dự án hoặc khôi phục thảm họa.
2. **Đồng bộ YAML theo từng Section (Tab 3 "YAML Sync"):** Sử dụng trong quy trình phát triển mã nguồn hàng ngày (Git flow) tương tự Sitecore Unicorn / Rainbow. Dữ liệu được chia nhỏ thành từng file YAML độc lập lưu trong thư mục `Serialization/` tại gốc repository, hỗ trợ commit lên Git, theo dõi lịch sử thay đổi từng dòng (diff), và đồng bộ chính xác từng nhánh cây mà không đụng chạm đến toàn bộ hệ thống.

### 1.2. Khi nào sử dụng từng Section
Theo kiến trúc **DEC-054** và **DEC-055**, hệ thống chuẩn hóa 5 section độc lập:
- **`Templates` (DEC-055):** Sử dụng khi lập trình viên thêm/sửa cấu trúc Template, Section, Field động hoặc Standard Values (`/root/templates`). Toàn bộ định nghĩa Field Schema (`sections[].fields[]`), danh sách `baseTemplates`, `insertOptions` và `standardValues` được nhúng trực tiếp vào file YAML với ID bất biến làm nguồn sự thật.
- **`Renderings`:** Sử dụng khi đăng ký Component hiển thị mới, cấu hình viewPath EJS hoặc liên kết componentTemplate (`/root/layout/Renderings`).
- **`Layouts`:** Sử dụng khi định nghĩa Master Layout EJS view (`/root/layout/Layouts`).
- **`Placeholders`:** Sử dụng khi thêm/sửa khoá vùng chứa Placeholder của Layout (`/root/layout/Placeholders`).
- **`Contents`:** Sử dụng khi đồng bộ trang Home, các trang nội dung, bài viết giữa local và môi trường kiểm thử (`/root/content`).

---

## 2. Điều Kiện Tiên Quyết

1. **Quyền truy cập:** Tài khoản người dùng cần có quyền `serialization:read` (để vào trang), `serialization:export` (để Reserialize) và `serialization:import` (để Sync) thông qua phân quyền ACL của Treecraft. Mặc định vai trò `Administrator` được cấp đầy đủ các quyền này.
2. **Thư mục Serialization chuẩn (DEC-054):**
   - Thư mục lưu trữ mặc định là `Serialization/` ngay tại gốc repository (cấu hình qua biến môi trường `SERIALIZATION_DIR=Serialization`).
   - Cấu trúc thư mục rút gọn:
     ```
     Serialization/
     ├── serialization.manifest.yml      # Manifest toàn cục (layoutVersion: 2)
     ├── Templates/                       # ROOT_PATH/templates (nhúng đầy đủ Field Definitions)
     ├── Renderings/                      # ROOT_PATH/layout/Renderings
     ├── Layouts/                         # ROOT_PATH/layout/Layouts
     ├── Placeholders/                    # ROOT_PATH/layout/Placeholders
     └── Contents/                        # ROOT_PATH/content
     ```
3. **Môi trường:**
   - Tại `development`: Lập trình viên có thể Reserialize và Sync tự do trên MongoDB Local Docker.
   - Tại `staging` / `production`: Hệ thống kích hoạt chốt chặn an toàn `dbGuard`, bắt buộc phải xác nhận đúng tên Database và Host trước khi cho phép ghi vào DB, đồng thời tự động kích hoạt sao lưu an toàn pre-sync.

---

## 3. Các Bước Thực Hiện Với Lệnh Copy Được

### 3.1. Di chuyển dữ liệu cũ sang cấu trúc rút gọn mới (Migrate Layout)
Nếu repository của bạn còn chứa cấu trúc cũ dạng `data/serialization/items/...` hoặc `Serialization/items/...`:

```bash
# 1. Chạy kiểm tra trước (Dry-Run) để xem danh sách tệp dự kiến di chuyển
npm run serialize:migrate-layout -- --dry-run

# 2. Thực thi di chuyển thật sang cấu trúc rút gọn DEC-054
npm run serialize:migrate-layout

# 3. Kiểm tra trạng thái thay đổi Git
git status --short
git diff Serialization/
```

### 3.2. Xem Diff Cấp Field giữa YAML và Database (`npm run serialize:diff`)
Khi nhận code mới từ đồng nghiệp (git pull) hoặc trước khi thực hiện Sync, hãy kiểm tra danh sách thay đổi chi tiết cấp field:

```bash
# So sánh section Template (mặc định)
npm run serialize:diff

# So sánh chi tiết kèm cảnh báo xóa field (nếu có cờ --delete-missing-fields)
npm run serialize:diff -- --delete-missing-fields
```

### 3.3. Thao tác trên Giao diện Web Admin CMS (`/admin/serialization`)

#### Kịch bản A: Xuất (Reserialize) một Section trên Development
1. Truy cập `/admin/serialization`, chọn **Tab 3: YAML Sync**.
2. Tìm đến khối section mong muốn (ví dụ **Templates**).
3. Bấm nút **Reserialize** màu xanh dương bên phải thẻ section.
4. Trên modal xác nhận, kiểm tra hướng dữ liệu (DB $\rightarrow$ YAML), chọn cờ *"Dọn tệp mồ côi"* nếu muốn xóa các file YAML cũ không còn tồn tại trong DB.
5. Bấm **Bắt đầu Xuất (Reserialize)**. Hệ thống sẽ quét DB và ghi tệp YAML vào `Serialization/Templates/`.
6. Mở terminal và kiểm tra kết quả bằng lệnh Git:
   ```bash
   git status
   git diff Serialization/Templates/
   ```

#### Kịch bản B: Nhập (Sync) Template trên Môi trường Mới hoặc Staging
1. Kéo mã nguồn mới nhất từ Git về:
   ```bash
   git pull origin main
   ```
2. Truy cập `/admin/serialization` $\rightarrow$ chọn **Tab 3: YAML Sync**.
3. Tại khối section **Templates**, bấm nút **Sync** màu xanh lá.
4. Trên modal xác nhận:
   - Chế độ đồng bộ: Mặc định là `overwrite` (cập nhật schema vào DB).
   - Tùy chọn xóa field: Nếu muốn xóa triệt để các field đã bỏ trong YAML, tick chọn *"Xóa trường (fields) khỏi Template nếu không có trong YAML"*. Mặc định cờ này tắt để bảo vệ an toàn dữ liệu.
5. Bấm nút **Chạy Xem Trước (Dry-Run)**.
   - Modal hiển thị bảng **Chi tiết thay đổi Trường Template (Field Diffs)**: danh sách các trường được Thêm mới (`+`), Sửa đổi kiểu, Đổi tên, Đổi thứ tự hoặc Bị xóa (`-`), cùng cảnh báo số lượng content item đang chứa dữ liệu của trường đó.
6. Khi kết quả Dry-Run báo trạng thái **Hợp Lệ**, nút **Thực Hiện Sync** sẽ tự động được kích hoạt.
7. Bấm **Thực Hiện Sync** để nạp schema vào MongoDB và tự động xóa cache bộ nhớ `templateService`.

#### Kịch bản C: Đồng bộ hàng loạt nhiều Section
1. Tick chọn checkbox của các section cần đồng bộ (hoặc tick checkbox tổng *"Chọn tất cả các sections"*).
2. Bấm nút **Sync selected** trên thanh công cụ.
3. Chạy Dry-Run $\rightarrow$ Kiểm tra bảng xem trước $\rightarrow$ Bấm Thực hiện. Hệ thống sẽ **tự động sắp xếp tuần tự theo đúng thứ tự phụ thuộc**:
   $$\text{Template} \longrightarrow \text{Layout} \longrightarrow \text{Placeholder} \longrightarrow \text{Rendering} \longrightarrow \text{Content}$$

---

### 3.4. Thao tác bằng Dòng Lệnh CLI (`npm run serialize:section`)

```bash
# 1. Kiểm tra trạng thái so sánh hiện tại của tất cả 5 sections
npm run serialize:section -- status

# 2. Xem khác biệt Field Definition giữa YAML và DB
npm run serialize:diff

# 3. Reserialize section Template ra file YAML (có nhúng sections và fields)
npm run serialize:section -- reserialize template

# 4. Reserialize tất cả sections và dọn sạch file mồ côi
npm run serialize:section -- reserialize all --prune-orphans

# 5. Chạy xem trước (Dry-Run) khi Sync section Template
npm run serialize:section -- sync template --dry-run

# 6. Thực thi Sync section Template (giữ nguyên field thiếu trong YAML)
npm run serialize:section -- sync template

# 7. Thực thi Sync section Template có xóa field cũ khỏi schema
npm run serialize:section -- sync template --delete-missing-fields

# 8. Thực thi Sync toàn bộ hệ thống theo đúng thứ tự phụ thuộc
npm run serialize:section -- sync all
```

---

## 4. Kết Quả Mong Đợi

1. **Cấu trúc YAML của Item Template (DEC-055):**
   Mỗi tệp template chứa định nghĩa phân cấp và schema ổn định từng byte:
   ```yaml
   _id: 6aeaccf2b200083aee587086
   name: HeroBanner
   displayName: Hero Banner Component
   path: /root/templates/Feature/Components/HeroBanner
   template:
     id: 6aeae250248055b9172f85eb
     name: Template
     path: /root/templates/System/Template
   sections:
     - id: 6aeaccf2b200083aee587087
       name: Hero Data
       sortOrder: 100
       fields:
         - id: 6aeaccf2b200083aee587088
           name: HeroTitle
           title: Hero Title
           type: singleLineText
           source: ''
           required: false
           defaultValue: ''
           shared: false
           sortOrder: 10
           unversioned: false
         - id: 6aeaccf2b200083aee587089
           name: HeroDescription
           title: Hero Description
           type: richText
           sortOrder: 20
   baseTemplates: []
   insertOptions: []
   standardValues: {}
   ```
2. **Quy tắc Bất Biến ID (Immutable ID):**
   - Section ID và Field ID là nguồn sự thật duy nhất.
   - Khi đổi tên field (`HeroTitle` $\rightarrow$ `BannerTitle`), `git diff` chỉ hiển thị thay đổi đúng dòng `name:` và `title:`, giữ nguyên ID $\rightarrow$ content item không bị mất liên kết.
3. **Nguyên tắc An Toàn Dữ Liệu (Safe Schema):**
   - Xóa một field khỏi template schema **tuyệt đối KHÔNG xóa dữ liệu bài viết** trong `items_master`.
   - Dry-run luôn đếm và cảnh báo chính xác bao nhiêu content item đang lưu trữ dữ liệu của field đó trước khi thực thi.
4. **Bảo toàn Timestamp `mtime`:**
   - Các file YAML không có thay đổi nội dung sẽ không bị cập nhật lại timestamp mtime $\rightarrow$ `git status` giữ nguyên trạng thái sạch sẽ.
5. **Xóa Cache Tự Động:**
   - Sau mỗi lần Sync template thành công, hệ thống tự động gọi `templateService.invalidateCache()` để giao diện Content Editor và website SSR áp dụng ngay lập tức schema mới mà không cần khởi động lại Node.js server.

---

## 5. Cách Kiểm Tra & Xác Minh Tính Đúng Đắn

1. **Kiểm tra tính toàn vẹn qua Git:**
   ```bash
   git status --short
   git diff Serialization/Templates/
   ```
   *Kết quả mong đợi:* Chỉ hiển thị thay đổi cục bộ tại đúng field được thêm/sửa/xóa, không có trường thừa.
2. **Kiểm tra Round-Trip Serialization:**
   - Xuất dữ liệu: `npm run serialize:section -- reserialize template`
   - Chạy lại lần 2: `npm run serialize:section -- reserialize template`
   - *Kết quả mong đợi:* Hệ thống báo toàn bộ 15 file là `unchanged`, mtime giữ nguyên 100%.
3. **Kiểm tra toàn bộ Test Suites:**
   ```bash
   npm test
   npm test -- tests/templateFieldSerialization.test.js
   npm run lint
   npm run check:env
   npm run check:branding
   ```

---

## 6. Các Sự Cố Thường Gặp & Cách Xử Lý

| Sự cố | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **`Kiểu trường "xyz" không tồn tại trong Field Registry (file:line)`** | Tệp YAML khai báo `type` không hợp lệ hoặc gõ sai tên | Sửa lại thuộc tính `type` trong YAML về đúng typeKey được hỗ trợ trong Registry (ví dụ `singleLineText`, `richText`, `image`, `number`, `checkbox`...). |
| **`Chuyển đổi kiểu trường "..." không tương thích (... item có dữ liệu)`** | Thay đổi kiểu dữ liệu của một trường mà không nằm trong bảng chuyển đổi an toàn (`COMPATIBLE_TYPE_TRANSITIONS`), trong khi các item content đã có dữ liệu | Hệ thống cố tình chặn để chống mất dữ liệu. Chuyển đổi dữ liệu item trước, hoặc chỉ đổi sang kiểu tương thích (ví dụ `Single-Line Text` $\leftrightarrow$ `Rich Text`). |
| **`Phát hiện cấu trúc lưu trữ Serialization cũ (v1)`** | Thư mục còn chứa cấu trúc `items/` cũ hoặc chưa chạy di chuyển | Chạy lệnh `npm run serialize:migrate-layout` để chuyển đổi sang DEC-054. |
| **`Thư mục đã bị thay đổi sau khi chạy Dry-Run`** | Tệp YAML trong thư mục bị chỉnh sửa hoặc git pull sau khi bấm Dry-Run | Bấm lại nút **Chạy Xem Trước (Dry-Run)** để sinh mã băm hash mới rồi bấm Thực hiện. |
| **`Trường bị mất trong file YAML nhưng vẫn còn trong DB`** | Mặc định tính năng Sync đặt `deleteMissingFields: false` để chống xóa nhầm | Bật cờ `--delete-missing-fields` trên CLI hoặc tick chọn checkbox xóa field trên modal web. |

---

## 7. Cảnh Báo An Toàn Quan Trọng

> [!CAUTION]
> 1. **Chuyển đổi Field Type:** Tuyệt đối không tùy tiện sửa `type` của field trực tiếp trên file YAML nếu trên môi trường Production/Staging đã có hàng ngàn bài viết đang dùng field đó. Hệ thống sẽ từ chối sync nếu phát hiện chuyển đổi không tương thích.
> 2. **Cờ `--delete-missing-fields`:** Chỉ bật cờ này khi bạn chắc chắn muốn xóa vĩnh viễn định nghĩa trường khỏi Template. Mặc dù dữ liệu bài viết cũ không bị xóa khỏi MongoDB, biên tập viên sẽ không thể nhìn thấy hoặc chỉnh sửa trường đó trên Content Editor nữa.
> 3. **Quy tắc Git:** Tuyệt đối không commit các file rác, file nháp hoặc file cấu hình môi trường chứa secret. Luôn kiểm tra `git status --short` và `git diff Serialization/` trước khi tạo commit.
