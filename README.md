# Sitecore XM-like CMS (Node.js + Express + EJS + MongoDB)

Hệ thống Quản trị Nội dung Phân cấp theo Phong cách Sitecore XM (Experience Management).

## 1. Yêu cầu môi trường
- **Node.js**: v20+ LTS (khuyên dùng Node 20 hoặc cao hơn)
- **MongoDB**: v6.0+ (chạy cục bộ trên port 27017 hoặc Mongo Atlas)

## 2. Cài đặt & Khởi chạy

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Thiết lập biến môi trường
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```
Điều chỉnh cấu hình nếu cần (mặc định chạy tại port `3000` và MongoDB `mongodb://localhost:27017/sitecore_cms_master`).

### Bước 3: Chạy ứng dụng

- Chế độ phát triển (tự động reload với nodemon):
```bash
npm run dev
```

- Chế độ Production:
```bash
npm start
```

- Kiểm tra Linting:
```bash
npm run lint
```

- Chạy kiểm thử tự động (Smoke Test):
```bash
npm test
```

## 3. Các URL kiểm tra (Giai đoạn 0)
- **Health Check:** [http://localhost:3000/health](http://localhost:3000/health)
- **Launchpad (Shell tĩnh):** [http://localhost:3000/admin/launchpad](http://localhost:3000/admin/launchpad)
- **Content Editor (Shell tĩnh):** [http://localhost:3000/admin/content-editor](http://localhost:3000/admin/content-editor)
- **Trang lỗi 404:** [http://localhost:3000/not-found](http://localhost:3000/not-found)
- **API 404 JSON:** [http://localhost:3000/api/not-found](http://localhost:3000/api/not-found)

## 4. Cấu trúc thư mục
Xem tài liệu kiến trúc chi tiết tại `AGENTS.md`.
