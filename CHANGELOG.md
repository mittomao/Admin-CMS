# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi đáng chú ý của dự án Treecraft CMS Core sẽ được ghi nhận tại tệp này theo chuẩn [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-11-18

### Thêm Mới (Added)
- Đóng gói `treecraft-core` thành thư viện npm công khai với CLI `treecraft`.
- Lệnh `npx treecraft init` khởi tạo dự án một bước: tự động cấu hình `site.config.js`, sinh tệp môi trường, nạp starter views/assets và đồng bộ dữ liệu MongoDB.
- Cơ chế kiểm tra tính toàn vẹn (Package Integrity) bảo đảm mã nguồn Core trong `node_modules` không bị can thiệp.
- Chốt chặn `pack:check` và `prepublishOnly` bảo đảm an toàn đóng gói và bảo mật tài khoản maintainer.
- Bộ starter mẫu `starter/corporate` với đầy đủ component, layout, templates và dữ liệu mẫu chuẩn hóa.

### Thay Đổi (Changed)
- Chuyển đổi phương thức phân phối duy nhất sang npm package, loại bỏ hoàn toàn mô hình Git Submodule.
- Tinh chỉnh `sitePaths.js` để định vị tài nguyên chuẩn xác khi Core vận hành trong `node_modules`.
- Cập nhật tài liệu hướng dẫn phát triển Core và quy trình phát hành npm với xác thực 2FA.
