# DEC-057: Mô hình Một Database Duy nhất Với Hai Collections items_master và items_web

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Trong các tài liệu sơ khai và một số văn bản hướng dẫn cũ, có sự xuất hiện của thuật ngữ "chuyển đổi giữa 2 Database Master và Web", dẫn tới sự ngộ nhận rằng hệ thống kết nối tới 2 database MongoDB riêng biệt (hoặc cần 2 chuỗi URI `MONGO_URI_MASTER` và `MONGO_URI_WEB`).
Tuy nhiên, trong thực tế kiến trúc Mongoose của Treecraft từ các giai đoạn đầu (GĐ 8, GĐ 10):
- Master Store được lưu tại collection `items_master` thông qua model `Item.js`.
- Web Store được lưu tại collection `items_web` thông qua model `PublishedItem.js`.
- Cả hai model cùng trực thuộc **một database duy nhất** thông qua một kết nối Mongoose chung (`MONGO_URI` + `MONGO_DB_NAME`).

Sự không thống nhất về câu chữ này gây bối rối khi cấu hình triển khai tách Core/Site, dẫn đến việc người dùng tự hỏi có cần thiết lập 2 database hay không.

## Quyết định
1. **Một Database Duy Nhất Cho Mỗi Dự Án:**
   - Mỗi dự án chỉ sử dụng đúng **một database duy nhất** trên MongoDB.
   - Chuẩn hoá tiền tố tên database cho các dự án: `treecraft_<slug>` (ví dụ: `treecraft_corporate`, `treecraft_ecommerce`).
   - Cấu hình qua `.env.development`: `MONGO_DB_NAME=treecraft_<slug>` (mặc định nếu không chỉ định là `treecraft_default`).
2. **Tách Biệt Master và Web Bằng Collections:**
   - Master Store: Collection `items_master` (soạn thảo, phiên bản nháp, preview).
   - Web Store: Collection `items_web` (nội dung đã publish, phục vụ SSR công khai).
   - Tuyệt đối không tạo hoặc duy trì khái niệm 2 database riêng rẽ (`MONGO_DB_WEB`, `MONGO_URI_WEB`).
3. **Chuẩn Hoá Ngôn Từ Trong Tài Liệu & Giao Diện:**
   - Trang `/admin/databases` được hiểu chính xác là công cụ so khớp và chuyển đổi ngữ cảnh dữ liệu giữa Master Store (`items_master`) và Web Store (`items_web`) trong cùng một cơ sở dữ liệu.
   - Toàn bộ tài liệu, script kiểm tra (`dbInvariant.test.js`) và `dbGuard.js` đồng bộ theo quy ước này.

## Hệ quả
- **Tích cực:**
  - Đơn giản hoá tối đa quá trình cài đặt: lệnh `init` chỉ cần tạo và kết nối 1 database duy nhất.
  - Tiết kiệm tài nguyên kết nối (chỉ 1 connection pool Mongoose).
  - Tránh nhầm lẫn trong các thao tác backup/restore: backup 1 DB là bao gồm cả Master và Web.
- **Tuân thủ:**
  - Mọi script kiểm thử và kiểm tra môi trường nghiêm cấm yêu cầu biến `MONGO_DB_WEB`.

