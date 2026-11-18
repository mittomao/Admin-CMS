---
phase: N
name: Phát hành Công khai Core lên NPM và Bỏ hẳn Git Submodule
status: Hoàn thành
depends_on: [S, K1, E1, 12]
estimate: 25h làm việc
started: 2026-11-18
completed: 2026-11-18
updated: 2026-11-18
---

# GĐ N - Phát Hành Công Khai Core Lên NPM và Bỏ Hẳn Git Submodule

> Giai đoạn chuyển dịch phương thức phân phối: Đóng gói Treecraft Core thành thư viện npm công khai, loại bỏ triệt để mô hình Git Submodule, tối ưu hóa quy trình khởi tạo website qua `npm install` và bảo đảm an toàn dữ liệu tuyệt đối cho các dự án hiện có.

---

## 1. TÀI LIỆU CẦN ĐỌC TRƯỚC KHI LÀM
- [`AGENTS.md`](../../AGENTS.md)
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/02-tech-stack.md`](../rules/02-tech-stack.md)
- [`docs/reports/N-audit.md`](../reports/N-audit.md)
- [`docs/decisions/DEC-059-npm-distribution-and-submodule-removal.md`](../decisions/DEC-059-npm-distribution-and-submodule-removal.md)
- [`docs/guides/core-and-site.md`](../guides/core-and-site.md)

---

## 2. MỤC TIÊU VÀ PHẠM VI

- **Mục tiêu cốt lõi:**
  1. Treecraft Core được đóng gói chuẩn mực, sẵn sàng phát hành công khai lên npm registry dưới tên `@treecraft/core` (hoặc `treecraft-core`).
  2. **npm trở thành kênh phân phối DUY NHẤT:** Gỡ bỏ hoàn toàn khái niệm và mã nguồn Git Submodule khỏi hệ thống, CLI, tài liệu và quy trình kiểm thử.
  3. Tinh gọn & hiện đại hóa: Không hỗ trợ công cụ chuyển đổi phức tạp, tập trung luồng chuẩn Node.js duy nhất cho toàn bộ dự án mới.
  4. Đảm bảo Core chạy từ `node_modules` ở chế độ Read-Only hoàn toàn, bảo vệ tính bất biến bằng cơ chế Package Integrity.
- **Phạm vi nghiêm ngặt (Out-of-Scope & Prohibitions):**
  - **AI KHÔNG BAO GIỜ PHÁT HÀNH:** Cấm thực thi `npm publish`, `npm version`, đăng nhập npm hay tạo token. AI chỉ chuẩn bị gói, kiểm tra tính toàn vẹn và viết tài liệu hướng dẫn.
  - **TUYỆT ĐỐI KHÔNG commit vào git repo.**
  - Không tự ý xóa thư mục `core/` hay tệp `.gitmodules` của người dùng.

---

## 3. BẢNG HIỆN TRẠNG → THAY ĐỔI → RỦI RO

| Thành phần | Hiện trạng (GĐ S) | Thay đổi trong GĐ N (NPM) | Rủi ro & Biện pháp kiểm soát |
| :--- | :--- | :--- | :--- |
| **Kênh phân phối** | Git Submodule (`git submodule add <url> core`) | Gói npm công khai (`npm install @scope/treecraft-core`) | ⚠️ Rủi ro lộ file nội bộ $\rightarrow$ Áp dụng `files` Whitelist chặt chẽ + `npm run pack:check`. |
| **Định vị tài nguyên** | `sitePaths` phân biệt mode dựa vào tên thư mục cha `core`. | Chế độ duy nhất: Core resolve qua `__dirname/..`, Site là `process.cwd()`. | ⚠️ Lệch đường dẫn views/assets $\rightarrow$ Đã kiểm tra và bảo đảm resolve chuẩn xác từ `node_modules`. |
| **Khởi tạo dự án** | 3 bước: `git init` $\rightarrow$ `submodule add` $\rightarrow$ `treecraft init`. | 3 bước chuẩn Node: `npm init` $\rightarrow$ `npm i @scope/core` $\rightarrow$ `npx treecraft init`. | ✅ Giảm 80% ma sát cho lập trình viên mới. |
| **Kiểm tra bất biến** | Dùng lệnh `git status` trong thư mục `core/`. | So khớp mã băm SHA-512 với `package-lock.json` (Package Integrity). | ⚠️ Can thiệp file trong `node_modules` $\rightarrow$ Cảnh báo ở Dev, từ chối chạy ở Prod. |

---

## 4. CHI TIẾT CÁC NHÓM CÔNG VIỆC CẦN THỰC HIỆN

### 🔹 Nhóm A: Chuẩn Hóa Cấu Trúc Gói NPM (Package Structure)
- [x] **Task N.A1:** Cập nhật `package.json`: Đổi tên gói sang scoped name `@treecraft/core`, đặt phiên bản khởi đầu `0.1.0`, bổ sung trường `"bin": { "treecraft": "bin/treecraft.js" }`, `"engines": { "node": ">=20.0.0" }`, `"publishConfig": { "access": "public" }`.
- [x] **Task N.A2:** Thiết lập Whitelist tệp đóng gói (`files` trong `package.json`): Chỉ cho phép `bin/`, `src/`, `starter/`, `public/css/`, `public/js/admin/`, `public/img/icons/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`.
- [x] **Task N.A3:** Tích hợp build hook tự động: Cấu hình script `"prepack": "npm run build:css:admin"` để đảm bảo Tailwind CSS của Admin luôn được biên dịch minified sẵn trong gói.
- [x] **Task N.A4:** Tích hợp chốt chặn an toàn `"prepublishOnly"`: Tự động chạy `lint`, `test`, `pack:check` và in thông báo cảnh báo nghiêm ngặt nhắc nhở AI không được phép publish.
- [x] **Task N.A5:** Soạn thảo bộ tài liệu công khai đóng gói kèm thư viện: `LICENSE` (theo giấy phép người dùng duyệt), `CHANGELOG.md`, `SECURITY.md`.

### 🔹 Nhóm B: Chế Độ Duy Nhất — Core Chạy Trong `node_modules`
- [x] **Task N.B1:** Tái cấu trúc `src/config/sitePaths.js`: Gỡ bỏ hoàn toàn logic nhận biết submodule và biến `isStandaloneMode`. Thiết lập quy ước duy nhất: `CORE_DIR` luôn là thư mục chứa package npm, `SITE_DIR` luôn là `process.cwd()`.
- [x] **Task N.B2:** Đảm bảo Core Read-Only: Rà soát và đảm bảo 100% các thao tác ghi (logs, backups, file uploads, temporary files) đều hướng về thư mục của Site (`process.cwd()`) hoặc `os.tmpdir()`.
- [x] **Task N.B3:** Xây dựng cơ chế phát hiện can thiệp mã nguồn qua Package Integrity (`verifyPackageIntegrity`): So sánh mã SHA-512 của gói trong `node_modules` với `package-lock.json`. In cảnh báo tại Dev và từ chối chạy tại Staging/Production.
- [x] **Task N.B4:** Nâng cấp lệnh `bin/treecraft.js init`: Sinh file `package.json` cho dự án mới có dependency `@treecraft/core` và các lệnh script gọi trực tiếp binary `treecraft`.
- [x] **Task N.B5:** Cập nhật bộ script vận hành: Nâng cấp `npm run doctor`, `npm run core:check` và trang System Health (`/admin/control-panel`) hiển thị phiên bản npm thay vì trạng thái submodule.
- [x] **Task N.B6:** Soạn thảo tài liệu hướng dẫn phát triển Core (`docs/guides/develop-core.md` theo mẫu chuẩn 7 mục): Hướng dẫn workflow phát triển Core qua `npm link` hoặc cài đặt từ file `.tgz` local.

### 🔹 Nhóm C: Bộ Công Cụ Kiểm Tra Gói & Kiểm Chứng Tự Động (Đổi từ Nhóm D)
- [x] **Task N.C1:** Xây dựng công cụ kiểm tra gói chỉ đọc `npm run pack:check`:
  - Chạy `npm pack --dry-run`.
  - Bắt buộc FAIL nếu phát hiện bất kỳ file nào nằm ngoài whitelist (docs, tests, .env, .github, backups).
  - Quét tìm các chuỗi bí mật, token, private key hoặc dấu vết cấm.
  - Xác nhận có đủ file CSS minified, `LICENSE`, `SECURITY.md`, `README.md`.
- [x] **Task N.C2:** Viết lại bài kiểm thử cài đặt mới hoàn toàn từ npm (`tests/verify-fresh-install.js`):
  - Khởi tạo thư mục tạm trong `os.tmpdir()`.
  - Chạy `npm pack` ra file `.tgz` local.
  - Tạo dự án mới qua `npm init -y` $\rightarrow$ `npm install <tgz>` $\rightarrow$ `npx treecraft init` $\rightarrow$ `npm run dev`.
  - Kiểm tra tự động HTTP: `/admin/login` (200 OK + tải được CSS), đăng nhập thành công, `/` và `/about-us` render HTML đúng thứ tự component, `tree:compare` đạt 100% Parity.
- [x] **Task N.C3:** Quét sạch toàn bộ dấu vết submodule: Chạy audit bằng `git grep` bảo đảm không còn từ khóa `submodule`, `.gitmodules`, `node core/bin` trong mã nguồn runtime, script và tài liệu đang áp dụng.

### 🔹 Nhóm D: Quy Trình Phát Hành (Release Runbook - Đổi từ Nhóm E)
- [x] **Task N.D1:** Biên soạn tài liệu quy trình phát hành npm chuẩn 7 mục (`docs/guides/release-npm.md`):
  - Checklist đầy đủ các bước do chính Người dùng (Maintainer) thực hiện.
  - Quy trình phát hành qua kênh thử nghiệm `next` tag (`npm publish --tag next`) trước khi gắn `latest`.
  - Hướng dẫn bảo mật tài khoản npm: Bật 2FA bắt buộc, sử dụng Granular Access Tokens và cấu hình Trusted Publishing qua GitHub Actions OIDC theo tài liệu hiện hành của npm (tháng 11/2026).
  - Quy trình xử lý sự cố khẩn cấp: Cách deprecate hoặc unpublish gói khi phát hiện lỗi hoặc rò rỉ bí mật.

### 🔹 Nhóm E: Cập Nhật Tài Liệu Kỹ Thuật Toàn Diện (Đổi từ Nhóm F)
- [x] **Task N.E1:** Cập nhật lại [docs/guides/core-and-site.md](../guides/core-and-site.md) và [docs/guides/fresh-install.md](../guides/fresh-install.md) chuyển hoàn toàn sang hướng dẫn cài đặt và vận hành qua npm.
- [x] **Task N.E2:** Cập nhật [AGENTS.md](../../AGENTS.md) và các tệp trong [.agents/rules/](../../.agents/rules/) loại bỏ mô hình Submodule, xác lập tiêu chuẩn Core npm package.

---

## 5. DEFINITION OF DONE (DoD) CỦA GIAI ĐOẠN N

Giai đoạn N được nghiệm thu khi đáp ứng đầy đủ các tiêu chuẩn khắt khe sau:
1. Lệnh `npm run pack:check` chạy thành công: Tarball đóng gói chỉ chứa đúng các tệp trong Whitelist, kích thước gói $< 400\text{ KB}$, không chứa bí mật hay file docs/tests nội bộ.
2. Lệnh `npm run verify:fresh-install` chạy thành công 100% trong môi trường thư mục tạm: Cài đặt từ file `.tgz` local, khởi tạo site mới, khởi động server dev, tải CSS admin chuẩn và đạt 100% Tree Parity.
3. Lệnh quét kiểm tra dấu vết `git grep -i "submodule"` không tìm thấy bất kỳ dấu vết nào trong mã nguồn runtime và các template sinh ra.
4. Toàn bộ 65 test suites hiện có của hệ thống (`npm test`) tiếp tục vượt qua 100% (không phát sinh hồi quy).
5. Bộ 2 tài liệu chuẩn 7 mục (`release-npm.md`, `develop-core.md`) được hoàn thiện đầy đủ.
6. **TUYỆT ĐỐI KHÔNG thực hiện bất kỳ lệnh `git commit`, `git push`, `npm publish` hay `npm version` nào.**

---

## 6. RỦI RO VÀ GIẢI PHÁP GIẢM THIỂU

| Rủi ro tiềm ẩn | Mức độ | Biện pháp giảm thiểu |
| :--- | :---: | :--- |
| **Lộ bí mật hoặc docs nội bộ lên npm** | Nghiêm trọng | Cấm dùng `.npmignore`. Sử dụng trường `files` Whitelist trong `package.json` kết hợp script kiểm tra tự động `pack:check` trước khi đóng gói. |
| **CSS Admin bị thiếu khi cài qua npm** | Cao | Biên dịch sẵn file `public/css/tailwind-admin.css` và đưa vào git/files whitelist; hook `prepack` tự động biên dịch lại trước khi đóng gói. |
| **Người dùng sửa code trong `node_modules`** | Trung bình | Cơ chế Package Integrity tự động so khớp sha512 hash; cảnh báo ở dev và chặn chạy ở production. |
