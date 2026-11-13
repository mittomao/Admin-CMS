# Corporate Starter Site — Treecraft Project

Thư mục này chứa toàn bộ tài nguyên riêng của website dự án Treecraft theo kiến trúc DEC-056:
- `site.config.js`: Cấu hình danh tính, tên DB, Cloudinary root folder.
- `views/`: Các view EJS kết xuất HTML công khai (layouts, components, partials, errors).
- `public/`: Tài nguyên CSS, JS, hình ảnh tĩnh của website.
- `serialization/`: Dữ liệu phân cấp dạng YAML của Templates, Layouts, Renderings, Placeholders, Contents.
- `backups/`: Thư mục chứa các bản sao lưu database (được bỏ qua bởi Git).

## Khởi động và Vận hành
```bash
# Khởi động chế độ phát triển
npm run dev

# Khởi động server
npm start

# Chẩn đoán tính toàn vẹn giữa Core và Site
npm run doctor
```

