# DEC-056: Kiến Trúc Tách Biệt Core Bất Biến Và Site Dự Án Qua Bộ Phân Giải Đường Dẫn Duy Nhất (`sitePaths`)

- **Trạng thái:** Đang đề xuất (Chờ duyệt)
- **Ngày:** 2026-11-13
- **Tác giả:** Senior Software Architect / Tech Lead
- **Giai đoạn liên quan:** GĐ S1 (Core/Site Split), GĐ S2 (treecraft init)
- **Tài liệu liên quan:** [DEC-031](DEC-031-server-side-ejs-renderer-architecture.md), [DEC-033](DEC-033-viewpath-and-template-security.md), [DEC-043](DEC-043-rebrand-treecraft-and-root-rename.md), [DEC-051](DEC-051-database-backup-and-restore-architecture.md), [DEC-052](DEC-052-environment-database-separation-and-dbguard.md), [DEC-053](DEC-053-section-based-yaml-serialization-and-sync.md)

---

## 1. BỐI CẢNH (CONTEXT)
Hiện tại, dự án Treecraft đang được tổ chức theo cấu trúc monolithic nguyên khối: toàn bộ mã nguồn của CMS (Admin UI, authentication, workflow, item tree engine, publishing, database access) nằm chung thư mục với mã nguồn và tài nguyên riêng của từng dự án website cụ thể (các file EJS view trong `src/views/site/`, file CSS Tailwind trong `public/site/`, file cấu hình biến môi trường `.env*` ở thư mục gốc, thư mục serialization `Serialization/`, và thư mục backup `storage/backups/`).

Mô hình này gây ra các hạn chế nghiêm trọng:
1. **Khó nâng cấp:** Khi Treecraft nâng cấp phiên bản core (sửa lỗi bảo mật, tối ưu hiệu năng), việc kéo mã nguồn mới về dễ dẫn tới xung đột git (merge conflicts) với code riêng của dự án.
2. **Thiếu tính tái sử dụng:** Không thể dùng chung một core cho nhiều dự án khác nhau; việc phân phối core dưới dạng git submodule hoặc private npm package là bất khả thi do mã nguồn bị gắn chặt vào đường dẫn cục bộ (`process.cwd()`, relative paths `../../`).
3. **Vi phạm nguyên tắc phân tách trách nhiệm (Separation of Concerns):** Core của hệ thống đang ghi trực tiếp các file runtime (backup, serialization YAML, logs) vào cấu trúc thư mục của chính nó, khiến việc đóng gói thành package chỉ đọc (read-only package trong `node_modules`) sẽ thất bại ngay lập tức do lỗi quyền truy cập file (`EACCES`).

---

## 2. QUYẾT ĐỊNH KIẾN TRÚC (DECISION)

Chúng tôi quyết định tái cấu trúc toàn diện kiến trúc dự án theo các nguyên tắc nền tảng sau:

### 2.1. Mô hình Phân tách Song song: Core Bất biến + Site Dự án
Mỗi dự án Treecraft thực tế sẽ bao gồm 2 phần độc lập:
```
my-project/
├── core/                      # ENGINE BẤT BIẾN (Không ai sửa, thay thế/upgrade nguyên khối)
│   ├── src/                   # Logic CMS, models, controllers, services, admin views
│   ├── bin/treecraft.js       # CLI entrypoint duy nhất của core
│   ├── starter/               # Bộ mẫu ban đầu (starter corporate)
│   └── package.json           # Khai báo bin và files chuẩn npm
└── site/                      # TOÀN BỘ PHẦN RIÊNG CỦA DỰ ÁN
    ├── site.config.js         # Cấu hình dự án (Tên, Root, Ngôn ngữ, Tên DB, Cloudinary)
    ├── .env.development       # Biến môi trường (E1)
    ├── views/                 # View EJS của website công khai (layouts, components, partials, errors)
    ├── public/                # CSS, JS, hình ảnh tĩnh của website
    ├── serialization/         # Dữ liệu đồng bộ dạng YAML
    ├── backups/               # Thư mục chứa các bản sao lưu database (không commit)
    └── extensions/            # Mã nguồn mở rộng nghiệp vụ riêng (chừa chỗ cho tương lai)
```

### 2.2. Nguyên tắc "Core Chỉ Đọc, Site Chỉ Ghi" (Core Read-Only, Site Write-Only)
- Core **tuyệt đối không bao giờ ghi** file vào thư mục của chính nó. Mọi hoạt động ghi dữ liệu runtime (sao lưu database K1, xuất tệp tin đồng bộ YAML 11-Y2, tạo file tạm) bắt buộc phải hướng đích vào thư mục `site/backups/` hoặc `site/serialization/` hoặc thư mục tạm của hệ điều hành (`os.tmpdir()`).
- Core có thể nằm trong thư mục chỉ đọc (ví dụ: `node_modules/@treecraft/core`) mà vẫn vận hành hoàn hảo 100%.

### 2.3. Bộ Phân Giải Đường Dẫn Duy Nhất (`src/config/sitePaths.js`)
- Cấm tuyệt đối sử dụng `process.cwd()` làm gốc để tìm kiếm tài nguyên dự án (views, env, public, serialization, backups).
- Cấm tuyệt đối viết các đường dẫn tương đối cứng kiểu `../../site/` rải rác trong code.
- Tất cả đường dẫn tới tài nguyên của Site phải được phân giải duy nhất thông qua module `src/config/sitePaths.js`.
- Thứ tự phân giải thư mục `SITE_DIR`:
  1. Tham số dòng lệnh CLI `--site <path>`.
  2. Biến môi trường `TREECRAFT_SITE_DIR`.
  3. Tìm ngược lên cây thư mục từ `process.cwd()` cho đến khi phát hiện file `site.config.js`.
  4. Thư mục `site/` nằm đồng cấp (sibling) với thư mục `core/`.
  5. Nếu không tìm thấy, hệ thống dừng lại và phát sinh lỗi ngoại lệ thân thiện kèm hướng dẫn chạy lệnh `treecraft init`.

### 2.4. Phân Tách Tuyệt Đối Giữa Admin View/Static và Site View/Static
- **Admin CMS của Core:** EJS views và tài nguyên tĩnh của Admin CMS được phân giải dựa trên vị trí tệp tin của Core (`__dirname` / `core/src/views/admin` và `core/public`). Được phục vụ tại prefix URL `/admin-assets/` hoặc bảo vệ trong phân vùng `/admin`.
- **Site Công khai:** EJS views được nạp trực tiếp từ `SITE_DIR/views/`. Tài nguyên tĩnh được phục vụ từ `SITE_DIR/public/` tại prefix `/site/` và `/`. Hai không gian này hoàn toàn độc lập, không trộn lẫn.

### 2.5. Adapter Tương Thích Ngược Cho `src/config/branding.js`
- File `src/config/branding.js` được giữ nguyên chữ ký hàm và các biến export (`PROJECT_NAME`, `ROOT_NAME`, `ROOT_PATH`, `DEFAULT_BRANDING`, `getBranding()`).
- Bên trong `branding.js`, logic được chuyển đổi thành Facade Adapter: đọc cấu hình trực tiếp từ `sitePaths.getSiteConfig()`. Nhờ đó, 41 tệp tin mã nguồn hiện tại đang import `branding.js` sẽ tự động hoạt động bình thường mà không cần sửa đổi bất kỳ dòng mã nào.

### 2.6. Điểm Vào Dòng Lệnh Tập Trung (`core/bin/treecraft.js`)
- Mọi thao tác quản trị, khởi động server, migration DB, sao lưu dữ liệu đều thông qua binary CLI `treecraft`.
- File `package.json` của Core khai báo trường `"bin": { "treecraft": "./bin/treecraft.js" }` và trường `"files"` rõ ràng, sẵn sàng để publish lên npm private registry mà không cần thay đổi cấu trúc thư mục.

---

## 3. HỆ QUẢ & TÁC ĐỘNG (CONSEQUENCES)

### Tích cực:
1. **Nâng cấp không xung đột:** Nhà phát triển có thể nâng cấp core chỉ bằng một lệnh `git pull` (nếu dùng submodule) hoặc `npm update` (nếu dùng npm package) mà không sợ ghi đè hay xung đột mã nguồn riêng của site.
2. **Độc lập vị trí (Location Independence):** Core có thể đặt ở bất kỳ đâu trên máy tính hoặc trong mạng nội bộ, quản lý nhiều site khác nhau bằng cách chỉ định cờ `--site`.
3. **Bảo mật cao hơn:** Core là read-only giúp ngăn chặn các cuộc tấn công ghi đè file mã nguồn lõi CMS.

### Tiêu cực & Biện pháp giảm thiểu:
1. **Đòi hỏi di chuyển cấu trúc file hiện tại:** Các file view và serialization hiện tại cần được bóc tách ra Starter và di chuyển sang `site/`.
   - *Biện pháp:* Cung cấp script migration tự động, kiểm tra cẩn thận với cơ chế Dry-run và tự động backup K1 trước khi chuyển đổi.
2. **Cần chuẩn hóa `viewPath`:** Một số `viewPath` đang lưu trong DB có thể chứa prefix cũ.
   - *Biện pháp:* Script migration quét và chuẩn hóa idempotent toàn bộ `viewPath` trong DB Master và Web.

