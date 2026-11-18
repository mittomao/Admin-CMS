# DEC-059: Phân Phối Độc Quyền Treecraft Core Qua NPM & Bỏ Hẳn Git Submodule

> **Trạng thái:** Đang đề xuất (Chờ duyệt)  
> **Ngày quyết định:** 18/11/2026  
> **Giai đoạn liên quan:** GĐ N (Phát hành công khai Core lên npm và loại bỏ Git Submodule)  
> **Người đề xuất:** Senior Software Architect kiêm Tech Lead  
> **Ghi đè:** DEC-056 (Mô hình Core Git Submodule)

---

## 1. Ngữ Cảnh & Đặt Vấn Đề

Tại Giai đoạn S (DEC-056), hệ thống đã thực hiện bước đi đầu tiên trong việc phân tách kiến trúc giữa **Treecraft Core** và **Site Project** thông qua cơ chế Git Submodule (`git submodule add <repo-url> core`). Mặc dù giải pháp này đã tách rời được mã nguồn và cho phép phát triển độc lập, trong thực tế vận hành và phân phối diện rộng, mô hình Git Submodule bộc lộ nhiều hạn chế nghiêm trọng:

1. **Rào cản gia nhập lớn (High Adoption Friction):** Lập trình viên mới bắt buộc phải hiểu sâu về Git Submodule, cấu hình `git submodule update --init --recursive`, xử lý lỗi SSH/HTTPS credentials và các vấn đề file protocol khi làm việc nhóm.
2. **Không tương thích với hệ sinh thái Node.js chuẩn:** Tiêu chuẩn công nghiệp của hệ sinh thái Node.js/JavaScript là phân phối thư viện qua **npm registry**. Việc yêu cầu quản lý submodule trong thư mục dự án gây khó khăn cho các nền tảng đám mây hiện đại (Vercel, Render, Railway, AWS Amplify, Docker multi-stage builds).
3. **Thiếu cơ chế quản lý phiên bản SemVer chuẩn mực:** Quản lý phiên bản qua commit SHA của Git Submodule thiếu tính trực quan và không tận dụng được các quy tắc phiên bản an toàn (`^`, `~`) của `package.json`.
4. **Nguy cơ chỉnh sửa vô tình làm bẩn mã nguồn Core:** Dù có cơ chế kiểm tra `git status`, việc thư mục `core/` nằm trực tiếp trong workspace vẫn tạo cơ hội cho lập trình viên chỉnh sửa nhầm file lõi.

Do đó, hệ thống cần thực hiện bước chuyển dịch kiến trúc mang tính chiến lược: **Phát hành Treecraft Core thành gói npm công khai, biến npm thành kênh phân phối DUY NHẤT, và gỡ bỏ hoàn toàn mọi dấu vết của Git Submodule khỏi hệ thống.**

---

## 2. Quyết Định Kiến Trúc

### 2.1. Phân phối độc quyền qua NPM Registry
- Treecraft Core được đóng gói thành thư viện công khai (Public Package) dưới tên gọi **`treecraft-core`** (Unscoped package để mọi maintainer có thể publish trực tiếp mà không cần cấu hình organization).
- Người dùng phát triển website mới chỉ cần thực hiện 3 bước tiêu chuẩn Node.js:
  ```bash
  mkdir my-project && cd my-project
  npm init -y
  npm install treecraft-core
  npx treecraft init
  npm run dev
  ```
- **Loại bỏ hoàn toàn Git Submodule:** Không còn thư mục `core/`, không còn `.gitmodules`, không còn các lệnh `node core/bin/treecraft.js`.

### 2.2. Cơ chế Định vị Tài nguyên Core trong `node_modules` (`sitePaths.js`)
- `CORE_DIR` sẽ được xác định tự động và bất biến thông qua vị trí vật lý của package: `path.resolve(__dirname, '..')`.
- `SITE_DIR` luôn luôn là thư mục gốc của dự án người dùng: `process.cwd()`.
- Mọi tài nguyên giao diện quản trị (Admin views, styles, icons, assets, CLI) được nạp trực tiếp từ `node_modules/treecraft-core`.
- **Nguyên tắc bất biến tuyệt đối:** Core chạy từ `node_modules` là Read-Only, không bao giờ ghi bất kỳ file nào (logs, backups, uploads, cache) vào chính nó. Toàn bộ dữ liệu ghi đều hướng về `SITE_DIR` hoặc thư mục tạm của hệ điều hành (`os.tmpdir()`).

### 2.3. Kiểm tra tính bất biến bằng Package Integrity thay cho Git Status
- Khi Core nằm trong `node_modules`, hệ thống không còn dùng lệnh `git status --porcelain` để kiểm tra sửa đổi.
- Thay vào đó, xây dựng cơ chế **Package Integrity Verification**: So khớp mã băm SHA-512 của gói trong `node_modules` với bản ghi trong `package-lock.json`.
  - Môi trường `development`: In cảnh báo nổi bật nếu phát hiện mã nguồn Core bị can thiệp.
  - Môi trường `staging` và `production`: **Từ chối khởi động** server nếu tính toàn vẹn bị vi phạm.

### 2.4. Quy trình Phát triển Core (Core Development Workflow)
- Các lập trình viên phát triển mã nguồn Treecraft Core sẽ làm việc trên repository Core độc lập.
- Để thử nghiệm các tính năng Core mới trên một dự án Site thực tế, sử dụng một trong các kỹ thuật chuẩn của npm:
  1. `npm link`: Liên kết symbolic link từ repo Core local sang dự án Site.
  2. `npm install ../path-to-core`: Cài đặt trực tiếp từ đường dẫn thư mục local.
  3. `npm pack` $\rightarrow$ `npm install ./treecraft-core-x.y.z.tgz`: Kiểm thử trên tarball đóng gói thực tế.
- Tuyệt đối không chỉnh sửa trực tiếp bên trong `node_modules` của Site.

### 2.5. Lược bỏ công cụ chuyển đổi `migrate-to-npm`
- Vì hiện tại hệ thống chưa có bất kỳ dự án thực tế nào đang sử dụng Git Submodule (toàn bộ mới dừng lại ở phạm vi thử nghiệm nội bộ của GĐ S), lệnh CLI `migrate-to-npm` được **lược bỏ hoàn toàn** theo chỉ đạo của Người dùng để giữ mã nguồn Core tinh gọn, không phát sinh công cụ thừa thãi phải bảo trì.
- Mọi dự án từ nay về sau đi theo một luồng chuẩn mực duy nhất của hệ sinh thái Node.js: `npm init` $\rightarrow$ `npm install @treecraft/core` $\rightarrow$ `npx treecraft init` $\rightarrow$ `npm run dev`.

---

## 3. Hệ Quả & Lợi Ích (Consequences)

### Lợi ích:
- ✅ **Trải nghiệm lập trình viên vượt trội (Zero Friction):** Khởi tạo dự án mới siêu tốc, không cần cấu hình git phức tạp.
- ✅ **Chuẩn hóa CI/CD:** Các pipeline build Docker, GitHub Actions, Cloud Deploy chạy mượt mà bằng các lệnh `npm ci` và `npx treecraft`.
- ✅ **Bảo mật mã nguồn Core:** Mã nguồn Core được đóng gói nguyên bản, người dùng không thể vô tình commit các thay đổi làm sai lệch hệ thống.
- ✅ **Kích thước nhẹ:** Loại bỏ hàng nghìn tệp test và docs nội bộ khỏi dự án của người dùng cuối.

### Rủi ro & Thách thức:
- ⚠️ Cần thiết lập quy trình kiểm tra tarball (`pack:check`) nghiêm ngặt để không bao giờ đóng gói nhầm file nhạy cảm (`.env`, docs nội bộ, test data).
- ⚠️ Cần hướng dẫn chi tiết cho các dự án hiện có chuyển đổi sang npm một cách an toàn mà không làm mất mát dữ liệu MongoDB.
