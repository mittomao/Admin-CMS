# BÁO CÁO CHẨN ĐOÁN LỖI VÀ ĐIỂM NGHẼN (DIAGNOSIS) — GIAI ĐOẠN S

> **Mã tài liệu:** `docs/reports/S-diagnosis.md`  
> **Ngày lập:** 17/11/2026  
> **Phạm vi:** Mô phỏng luồng khởi tạo dự án mới: `git init` → `git submodule add` → `node core/bin/treecraft.js init` → `npm run dev`.

---

## 1. MÔ PHỎNG LUỒNG THỰC TẾ TRÊN MỘT THƯ MỤC DỰ ÁN TRẮNG

Khi một lập trình viên tạo repo mới hoàn toàn:
```bash
mkdir my-corporate-site && cd my-corporate-site
git init
git submodule add https://github.com/user/treecraft.git core
node core/bin/treecraft.js init --name "My Corporate Site" --slug corporate --yes
npm run dev
```

Qua phân tích và rà soát các module hiện tại, chúng tôi phát hiện **8 điểm nghẽn kỹ thuật (Failure Points)** có thể khiến luồng trên bị gãy nếu không được xử lý đồng bộ:

---

## 2. CHẨN ĐOÁN CHI TIẾT 8 ĐIỂM NGHẼN & GIẢI PHÁP TRIỆT ĐỂ

### Điểm nghẽn 1: Thiếu `node_modules` trong Core khi vừa `git submodule add`
- **Hiện tượng:** Khi chạy `node core/bin/treecraft.js init`, Node.js sẽ lập tức quăng lỗi `MODULE_NOT_FOUND` (ví dụ `cannot find module commander` hoặc `dotenv`) nếu `core/node_modules/` chưa được cài đặt.
- **Nguyên nhân:** `git submodule add` chỉ kéo mã nguồn git, không kéo các thư mục bị `.gitignore` như `node_modules`.
- **Giải pháp:**
  - File CLI entry point `core/bin/treecraft.js` phải được viết bằng **thuần chuẩn Node.js built-in** (`fs`, `path`, `child_process`, `readline`), tuyệt đối không `require` bất kỳ package ngoài nào (như `commander` hay `dotenv`) ở top-level.
  - Trong bước đầu tiên của `init`, script tự động kiểm tra `fs.existsSync(path.join(coreDir, 'node_modules'))`. Nếu chưa có, tự động thực thi `npm install --prefix core` trước khi nạp các module sâu hơn.

### Điểm nghẽn 2: Xung đột dấu phân tách đường dẫn Windows (`\`) và POSIX (`/`)
- **Hiện tượng:** Trên Windows, `path.resolve()` trả về dấu gạch chéo ngược `\`. Khi đưa vào EJS view path hoặc RegExp trong Express routes, dấu `\` bị hiểu nhầm là escape character hoặc gây lỗi 404/403 (DEC-033).
- **Nguyên nhân:** Các bộ xử lý `siteRenderer.js`, `presentationService.js`, `serializationPaths.js` dùng các phép cắt chuỗi hoặc so sánh `startsWith` nhạy cảm với dấu phân cách.
- **Giải pháp:**
  - Chuẩn hoá toàn bộ đường dẫn trong `sitePaths.js` qua hàm helper `normalizePath(p) => p.replace(/\\/g, '/')`.
  - Tất cả các kiểm tra traversal dùng `path.resolve()` kèm so sánh an toàn độc lập với hệ điều hành.

### Điểm nghẽn 3: Xung đột cổng MongoDB / Timeout kết nối
- **Hiện tượng:** Nếu lập trình viên chạy nhiều site Treecraft song song hoặc máy chưa bật MongoDB local trên cổng 27017, lệnh `init` sẽ bị treo mãi mãi hoặc sập với lỗi unhandled rejection.
- **Giải pháp:**
  - Đặt timeout rõ ràng: `serverSelectionTimeoutMS: 5000` trong bước kết nối thử nghiệm.
  - Bắt lỗi kết nối thân thiện, in ra hướng dẫn rõ ràng: *"Không thể kết nối đến MongoDB tại mongodb://127.0.0.1:27017. Vui lòng đảm bảo MongoDB daemon hoặc Docker container đã sẵn sàng."*

### Điểm nghẽn 4: Trùng lặp hoặc vi phạm định dạng Project Slug
- **Hiện tượng:** Tên dự án có dấu cách, chữ hoa, hoặc ký tự đặc biệt (ví dụ `"My Site!"`) nếu truyền thẳng làm tên database MongoDB sẽ gây lỗi cú pháp hoặc xung đột namespace.
- **Giải pháp:**
  - Chuẩn hoá slug: chuyển thành chữ thường, thay khoảng trắng và ký tự không phải chữ-số bằng gạch ngang `[a-z0-9_-]`.
  - Tên DB chuẩn: `treecraft_${slug}`.
  - Kiểm tra xem database này đã tồn tại dữ liệu chưa. Nếu đã có dữ liệu và không có cờ `--force`, hỏi người dùng xác nhận hoặc đổi slug.

### Điểm nghẽn 5: Chốt chặn `dbGuard.js` từ chối kết nối
- **Hiện tượng:** `dbGuard.js` kiểm tra an toàn database (DEC-052) và có thể chặn seed/init nếu tên database không khớp với cấu hình fingerprint hoặc bị đánh dấu là remote/production.
- **Giải pháp:**
  - Cập nhật `dbGuard.js` để nhận diện tiền tố hợp lệ `treecraft_*` trên môi trường `development` và `test`.

### Điểm nghẽn 6: Sai lệch thứ tự nạp Serialization (Topological Dependency)
- **Hiện tượng:** Nếu nạp Content hoặc Renderings trước khi nạp Templates, Mongoose sẽ báo lỗi Reference Validation hoặc mất liên kết template.
- **Giải pháp:**
  - Luôn tuân thủ tuyệt đối thứ tự `SYNC_EXECUTION_ORDER` đã định nghĩa trong `src/config/serializationSections.js`:
    `template` → `layout` → `placeholder` → `rendering` → `content`.

### Điểm nghẽn 7: Vòng lặp reset mật khẩu Admin lần đầu
- **Hiện tượng:** Khi admin đăng nhập lần đầu với mật khẩu khởi tạo, nếu không cấu hình đúng trạng thái `mustChangePassword: false` trong kịch bản init dev, admin sẽ bị kẹt tại màn hình đổi mật khẩu hoặc không có quyền truy cập launchpad.
- **Giải pháp:**
  - Trong quá trình `init`, tạo tài khoản admin với mật khẩu được chỉ định (hoặc ngẫu nhiên), băm bằng bcrypt, và đánh dấu sẵn sàng sử dụng. In thông tin đăng nhập rõ ràng ra terminal khi kết thúc.

### Điểm nghẽn 8: Bảo mật Traversal trong thư mục Site Views
- **Hiện tượng:** Lỗi `DEC-033: viewPath must be in site/` có thể từ chối các file view nằm ngoài thư mục `core/src/views/site/`.
- **Giải pháp:**
  - Cập nhật `siteRenderer.js` và `presentationService.js` để whitelist thư mục gốc `sitePaths.VIEWS_DIR`.
  - Đảm bảo cơ chế kiểm tra `..` (path traversal) vẫn hoạt động nguyên vẹn, nhưng gốc kiểm tra là `<SITE_DIR>/views/`.

