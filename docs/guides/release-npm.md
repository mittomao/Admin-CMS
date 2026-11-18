# Quy Trình Phát Hành Gói NPM Treecraft Core (Release Runbook)

Tài liệu quy trình chuẩn vận hành cho Maintainer (Người quản trị dự án) để kiểm tra, đóng gói và phát hành an toàn `treecraft-core` lên npm Registry công khai.

> [!IMPORTANT]
> **Quy tắc an ninh tối cao:** Trợ lý AI tuyệt đối không bao giờ được cấp quyền chạy lệnh `npm publish` hay lưu trữ token npm. Toàn bộ tiến trình phát hành bắt buộc phải do chính Maintainer con người thực hiện có xác thực 2 lớp (2FA).

---

## 1. Mục Đích (Purpose)
- Thiết lập quy trình phát hành nhất quán, bảo mật và có thể tái hiện để đưa các phiên bản mới của Treecraft Core lên npm registry công khai (`https://registry.npmjs.org`).
- Kiểm soát chất lượng thông qua các cổng kiểm tra tự động (`prepublishOnly`, `pack:check`, `verify:fresh-install`) trước khi phân phối mã nguồn tới cộng đồng.

---

## 2. Điều Kiện Trước (Prerequisites)
1. **Tài khoản NPM:**
   - Đã đăng ký tài khoản trên [npmjs.com](https://www.npmjs.com/).
   - Đã kích hoạt bắt buộc **Xác thực 2 lớp (2FA)** cho Authorization và Publishing (dùng ứng dụng Authenticator như Google Authenticator / 1Password).
   - Có quyền Maintainer/Owner của package `treecraft-core`.
2. **Môi trường phát triển:**
   - Node.js phiên bản $\ge 20.0.0$ LTS, npm phiên bản $\ge 10.0.0$.
   - Working tree trong Git repo hoàn toàn sạch sẽ (`git status --short` không có file chưa commit).
   - Tất cả 65 test suites đã pass 100% (`npm test`).

---

## 3. Các Bước Thực Hiện (Step-by-Step Instructions)

### Bước 1: Kiểm toán và Đóng gói thử nghiệm (Dry-Run)
Kiểm tra xem danh sách file trong gói có đạt chuẩn Whitelist không:
```bash
npm run pack:check
```
*Lệnh này phải trả về kết quả `✔ PACKAGE CHECK PASSED: Tarball contains only whitelisted, clean files.`*

### Bước 2: Chạy kiểm thử cài đặt sạch từ tarball cục bộ
```bash
node tests/verify-fresh-install.js
```
*Bảo đảm việc đóng gói ra file `.tgz`, khởi tạo dự án và đối soát Parity thành công 100%.*

### Bước 3: Đăng nhập vào tài khoản NPM (Chỉ thực hiện một lần trên máy của Maintainer)
```bash
npm login
```
*Nhập Username, Password và mã OTP 2FA từ ứng dụng Authenticator.*

Kiểm tra người dùng đã đăng nhập thành công:
```bash
npm whoami
```

### Bước 4: Phát hành thử nghiệm qua tag `next` (Từ máy tính cá nhân)
Chạy lệnh phát hành lên kênh thử nghiệm:
```bash
npm publish --access public --tag next
```
*Nhập mã xác thực 2FA OTP từ ứng dụng Authenticator khi npm yêu cầu.*

> [!NOTE]
> Cờ `--provenance` chỉ sử dụng khi publish tự động trong môi trường CI/CD (GitHub Actions). Khi publish thủ công từ máy tính cá nhân, không thêm cờ `--provenance` để tránh lỗi `EUSAGE`.

Kiểm tra cài đặt thử nghiệm từ tag `next`:
```bash
npx treecraft-core@next --version
```

### Bước 5: Phát hành chính thức lên kênh `latest`
Sau khi xác minh bản `next` hoạt động hoàn hảo, phát hành hoặc gắn tag `latest`:
```bash
npm publish --access public
```
*Hoặc chuyển tag nếu đã publish ở bước 4:*
```bash
npm dist-tag add treecraft-core@0.1.0 latest
```

---

## 4. Kết Quả Mong Đợi (Expected Results)
- Gói `treecraft-core` xuất hiện công khai trên trang `https://www.npmjs.com/package/treecraft-core`.
- Người dùng trên toàn cầu có thể cài đặt và khởi tạo dự án mới:
  ```bash
  mkdir my-cms && cd my-cms
  npm init -y
  npm install treecraft-core
  npx treecraft init
  ```
- Thư viện sẵn sàng cài đặt trực tiếp không phụ thuộc tổ chức hay cấu hình scope phức tạp.

---

## 5. Cách Kiểm Tra (Verification & Post-Release Smoke Test)
1. Kiểm tra thông tin gói từ npm registry (chỉ đọc):
   ```bash
   npm view treecraft-core
   ```
2. Thử nghiệm cài đặt sạch trên một máy tính hoặc thư mục độc lập:
   ```bash
   npx treecraft-core init --yes
   ```

---

## 6. Lỗi Thường Gặp & Cách Khắc Phục (Troubleshooting)

### Lỗi 1: `npm error code E403 403 Forbidden - You do not have permission to publish`
- **Nguyên nhân:** Gói đã có người khác đăng ký hoặc bạn chưa đăng nhập tài khoản có quyền sở hữu.
- **Khắc phục:** Đảm bảo package `treecraft-core` còn trống và bạn đã hoàn tất `npm login`.

### Lỗi 2: `npm error code EOTP - One-time password required`
- **Nguyên nhân:** Thiếu mã OTP 2FA trong môi trường không tương tác.
- **Khắc phục:** Thêm cờ `--otp=<code>` vào cuối lệnh:
  ```bash
  npm publish --access public --otp=123456
  ```

### Lỗi 3: `npm error code EPUBLISHCONFLICT - Cannot publish over existing version`
- **Nguyên nhân:** Phiên bản trong `package.json` đã tồn tại trên npm registry (npm không cho phép ghi đè phiên bản cũ).
- **Khắc phục:** Nâng phiên bản trong `package.json` (ví dụ từ `0.1.0` lên `0.1.1`) theo chuẩn SemVer.

---

## 7. Cảnh Báo An Toàn & Quy Trình Xử Lý Sự Cố (Emergency Playbook)

### Khi phát hiện rò rỉ bí mật hoặc lỗi nghiêm trọng sau khi publish:
1. **Trong vòng 72 giờ đầu tiên:**
   Nếu phiên bản chưa có nhiều người tải về, có thể unpublish phiên bản lỗi:
   ```bash
   npm unpublish treecraft-core@0.1.0
   ```
   *(Lưu ý: Sau khi unpublish một phiên bản, bạn không thể sử dụng lại số phiên bản đó).*
2. **Sau 72 giờ hoặc đã có người dùng:**
   Đánh dấu phiên bản là deprecated kèm thông điệp cảnh báo rõ ràng:
   ```bash
   npm deprecate treecraft-core@0.1.0 "Phiên bản này có lỗi bảo mật, vui lòng nâng cấp lên 0.1.1"
   ```
   Sau đó phát hành ngay bản vá `0.1.1`.
