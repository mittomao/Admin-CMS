# DEC-056: Tách bạch Kiến trúc Core và Site qua Git Submodule và sitePaths

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Treecraft ban đầu được phát triển dưới dạng ứng dụng monolithic kết hợp cả nhân hệ thống (CMS core: routing, schema, admin UI, publishing, backup, serialization) và mã nguồn của website cụ thể (site views, public assets, templates, content data). Khi người dùng bắt đầu triển khai cho nhiều dự án khác nhau (A, B, C), việc để chung mã nguồn dẫn đến các vấn đề nghiêm trọng:
1. Nâng cấp phiên bản CMS đòi hỏi merge git phức tạp, dễ gây xung đột với code riêng của từng site.
2. Không thể đóng gói Treecraft thành thư viện hoặc submodule bất biến dùng chung cho nhiều khách hàng.
3. Người dùng vô tình sửa trực tiếp vào mã nguồn core, làm mất khả năng bảo trì và cập nhật tự động.

## Quyết định
1. **Mô hình Submodule Bất Biến:**
   - Treecraft repo hiện tại trở thành **Core repo**. Khi triển khai dự án mới, lập trình viên tạo repo riêng (`my-project`) và tích hợp Core qua Git Submodule:
     ```bash
     git submodule add <url-core> core
     ```
   - Thư mục `core/` được coi là **Read-Only** (bất biến). Người dùng không sửa code trong `core/`.
2. **Thư mục Dự Án `site/` Độc Lập:**
   - Mọi tài nguyên thuộc về dự án được đặt trong thư mục `site/` ngang hàng hoặc do cấu hình trỏ tới:
     ```
     my-project/
     ├── core/                  # Git submodule (bất biến)
     ├── site/
     │   ├── site.config.js     # Cấu hình dự án (tên, slug, domain, cổng, ...)
     │   ├── .env.development  # Biến môi trường local
     │   ├── views/             # EJS views dành riêng cho website công khai (layouts, components)
     │   ├── public/            # Static assets riêng của website (css, js, images)
     │   ├── serialization/     # Dữ liệu YAML của dự án
     │   └── backups/           # Các bản sao lưu DB của dự án
     ├── package.json           # Wrapper scripts (dev, build, start, sync, ...)
     └── .gitignore
     ```
3. **Bộ Phân Giải Đường Dẫn Tập Trung `src/config/sitePaths.js`:**
   - Tạo module duy nhất `src/config/sitePaths.js` chịu trách nhiệm resolve toàn bộ đường dẫn tài nguyên:
     - `SITE_DIR`: Thư mục gốc của site.
     - `CORE_DIR`: Thư mục gốc của core.
     - `VIEWS_DIR`: Đường dẫn thư mục site views.
     - `PUBLIC_DIR`: Đường dẫn thư mục static assets của site.
     - `SERIALIZATION_DIR`: Đường dẫn thư mục serialization của site.
     - `BACKUP_DIR`: Đường dẫn lưu trữ backup của site.
   - **Thứ tự nhận diện `SITE_DIR` (Detection Order):**
     1. Flag CLI `--site <path>` (ưu tiên cao nhất).
     2. Biến môi trường `TREECRAFT_SITE_DIR`.
     3. Tự động dò ngược từ `process.cwd()` lên xem có `site.config.js` hoặc thư mục `site/` cạnh `core/`.
     4. Fallback: Nếu không phát hiện môi trường site (đang đứng trực tiếp trong repo core), tự động chạy ở chế độ Standalone/Monolith như cũ để đảm bảo tương thích ngược 100%.

## Hệ quả
- **Tích cực:**
  - Tách bạch hoàn hảo giữa logic CMS và code nghiệp vụ của website.
  - Nâng cấp core chỉ bằng một lệnh git: `cd core && git checkout v2.1.0`.
  - Giữ nguyên toàn bộ 51 vị trí đang import `branding.js` thông qua cơ chế facade wrapper.
- **Tiêu cực / Rủi ro:**
  - Đòi hỏi các lệnh CLI phải chạy thông qua entry point chuẩn `node core/bin/treecraft.js <command>`.
  - Cần đảm bảo `core/bin/treecraft.js` hoàn toàn độc lập với dependencies chưa được cài đặt.

