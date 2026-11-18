# BÁO CÁO KIỂM TOÁN PHÁT HÀNH CORE LÊN NPM & GỠ BỎ GIT SUBMODULE (GĐ N)

> **Dự án:** Treecraft CMS — Enterprise Hierarchical Content Management  
> **Giai đoạn:** GĐ N (Bước 1: Kiểm toán và Lập kế hoạch)  
> **Người thực hiện:** Senior Software Architect kiêm Tech Lead  
> **Thời điểm kiểm toán:** 18/11/2026 | **Branch:** `master`  
> **Trạng thái:** Hoàn thành kiểm toán, sẵn sàng thẩm định  

---

## 1. KIỂM TOÁN GÓI NGUYÊN BẢN (`npm pack --dry-run`)

### 1.1. Thống kê hiện trạng
Chạy lệnh `npm pack --dry-run --json` trên mã nguồn hiện tại:
- **Tổng số tệp được đóng gói:** **721 tệp**
- **Kích thước đóng gói (Packed Size):** **1.19 MB**
- **Kích thước giải nén (Unpacked Size):** **4.99 MB**
- **Nguyên nhân phình to:** Hệ thống hiện chưa có trường `"files"` trong `package.json`, dẫn đến việc npm tự động đóng gói toàn bộ thư mục dựa theo `.gitignore`.

### 1.2. Danh mục các tệp/thư mục KHÔNG ĐƯỢC PHÉP công khai trong npm Tarball
Các tệp sau đang bị cuốn vào tarball và **bắt buộc phải loại bỏ** qua cơ chế `files` whitelist:

| Thư mục / Tệp tin | Số lượng | Lý do bắt buộc loại trừ khỏi gói npm |
| :--- | :---: | :--- |
| `tests/` | 65 test suites (~600 files) | Toàn bộ mã kiểm thử tự động, mocks, fixture tests nội bộ không dùng cho người dùng cuối. |
| `docs/` | ~60 tài liệu | Các báo cáo nội bộ (`docs/reports/*`), quyết định kiến trúc (`docs/decisions/*`), câu hỏi kỹ thuật (`open-questions.md`), tiến độ (`phases/*`). |
| `.agents/` | 3 files | Bộ quy tắc AI Agent nội bộ. |
| `.github/` | 1 file | Workflow CI của nhà phát triển Core. |
| `Dockerfile`, `docker-compose*.yml`, `.dockerignore` | 4 files | Cấu hình triển khai container của Core monolith. |
| `Serialization/` | ~30 files | Dữ liệu YAML mẫu của môi trường phát triển local (đã có trong `starter/`). |
| `.env.example`, `.editorconfig`, `.prettierrc.json` | 3 files | Cấu hình tooling môi trường dev của Core. |
| `src/scripts/` (các script migrate cũ) | ~15 files | Các script migration lịch sử (Phase 01 -> 12) không cần thiết khi người dùng cài gói mới. |

### 1.3. Đề xuất Danh mục Whitelist Tối giản (`files` trong `package.json`)
Khi phát hành, tarball npm **chỉ chứa đúng các thành phần runtime thiết yếu**:
```json
"files": [
  "bin/",
  "src/",
  "public/css/tailwind-admin.css",
  "public/css/admin.css",
  "public/js/admin/",
  "public/img/icons/",
  "starter/",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "SECURITY.md"
]
```
*Dự kiến sau khi áp dụng Whitelist:* Số tệp giảm từ **721 tệp** xuống còn **~95 tệp**, kích thước tarball giảm xuống **< 350 KB**.

---

## 2. KIỂM TOÁN CẤU HÌNH `package.json`

| Trường | Hiện trạng | Yêu cầu chuẩn hóa khi phát hành npm | Đánh giá |
| :--- | :--- | :--- | :--- |
| **`name`** | `"treecraft"` | Đổi thành scoped name `@treecraft/core` (hoặc `treecraft-core`) | ❌ Tên `treecraft` đã bị chiếm bởi một CLI khác trên npm. |
| **`version`** | `"1.0.0"` | Đề xuất bắt đầu từ `0.1.0` (theo chuẩn SemVer cho bản public đầu tiên) | ⚠️ Cần người dùng phê duyệt chọn `0.1.0` hay `1.0.0`. |
| **`bin`** | *Chưa khai báo* | Thêm `"bin": { "treecraft": "bin/treecraft.js" }` | ❌ Thiếu. Không thể gọi `npx treecraft init`. |
| **`files`** | *Chưa khai báo* | Khai báo mảng Whitelist chỉ định chính xác các thư mục runtime | ❌ Thiếu nghiêm trọng. Đang làm lộ toàn bộ `tests/` và `docs/`. |
| **`main`** | `"src/server.js"` | Giữ `"src/server.js"` hoặc xuất programmatic API qua `src/index.js` | ⚠️ Cần cung cấp entry point sạch cho code dự án require. |
| **`engines`** | *Chưa khai báo* | Thêm `"engines": { "node": ">=20.0.0", "npm": ">=10.0.0" }` | ❌ Thiếu kiểm soát phiên bản Node.js. |
| **`license`** | `"ISC"` | Cập nhật theo giấy phép người dùng chọn (MIT hoặc Apache-2.0) | ⚠️ Cần người dùng xác nhận giấy phép chính thức. |
| **`publishConfig`** | *Chưa khai báo* | Thêm `"publishConfig": { "access": "public" }` | ❌ Bắt buộc đối với scoped package `@scope/...`. |
| **`repository`** | *Chưa khai báo* | Khai báo URL Git repository chính thức | ❌ Thiếu metadata nguồn gốc. |
| **`scripts`** | Thiếu hook đóng gói | Thêm `prepack` (build Tailwind CSS minified) và `prepublishOnly` | ❌ Cần đảm bảo CSS luôn được biên dịch trước khi pack. |

---

## 3. KIỂM TOÁN TÀI NGUYÊN RUNTIME CỦA GÓI

1. **CSS Admin đã biên dịch (`public/css/tailwind-admin.css`):**
   - File đã được biên dịch minified sẵn trong kho mã nguồn (kích thước ~57 KB).
   - Hook `prepack` sẽ đảm bảo tự động chạy `npm run build:css:admin` trước khi đóng gói, đảm bảo gói tải về qua npm có sẵn CSS mà không bắt người dùng phải cài Tailwind CLI.
2. **Views EJS Admin (`src/views/`):**
   - Đầy đủ các view giao diện quản trị (Content Editor, Launchpad, Control Panel, Media Picker, Security Editor, Template Manager, Databases, Recycle Bin, Audit Log).
3. **Thư mục Mẫu Khởi Tạo (`starter/`):**
   - Thư mục `starter/corporate/` chứa đầy đủ cấu hình mẫu (`site.config.js`, `.env.example`, `views/`, `public/`, `Serialization/`). Khi người dùng chạy `npx treecraft init`, CLI sẽ sao chép cấu trúc từ `starter/` vào dự án mới.

---

## 4. KIỂM TOÁN HÀNH VI GHI FILE CỦA CORE & ĐƯỜNG DẪN RUNTIME

Theo nguyên tắc bất biến khi cài đặt qua npm (`node_modules`), **Core tuyệt đối không được ghi file vào chính thư mục của nó**.

| Vị trí code | Hành vi hiện tại | Đánh giá & Giải pháp khắc phục khi chuyển sang npm |
| :--- | :--- | :--- |
| `src/config/sitePaths.js` | Phân biệt `isStandaloneMode` dựa trên tên thư mục cha có bằng `'core'` hay không. | ❌ **Phải sửa đổi:** Khi cài qua npm, Core luôn nằm trong `node_modules/@scope/treecraft-core`. `sitePaths` phải xác định `CORE_DIR = path.resolve(__dirname, '..')` và `SITE_DIR = process.cwd()`. |
| `src/config/env.js` | Tìm file `.env` tại `sitePaths.SITE_DIR`. | ✅ **Hợp lệ:** Luôn nạp file cấu hình từ thư mục dự án của người dùng. |
| `src/services/backup/BackupStorage.js` | Lưu bản sao lưu tại `env.BACKUP_DIR` (trỏ về `site/backups/<env>`). | ✅ **Hợp lệ:** Dữ liệu sao lưu nằm ngoài Core. |
| Ghi file tạm upload | `multer` cấu hình upload ảnh lên Cloudinary hoặc lưu tại `site/public/uploads`. | ✅ **Hợp lệ:** Không ghi vào `node_modules`. |
| `src/server.js` | Kiểm tra tính bất biến Core qua `git status` trong thư mục Core. | ❌ **Phải thay thế:** Core trong `node_modules` không phải là git repository. Cần thay bằng cơ chế kiểm tra tính toàn vẹn (Integrity Check) qua hash package của `package-lock.json`. |

---

## 5. KIỂM TOÁN CÔNG KHAI (PUBLIC AUDIT)

### 5.1. Giấy phép Dependencies bên thứ ba
Chạy kiểm toán giấy phép qua `license-checker --summary`:
- **MIT:** 483 packages
- **ISC:** 38 packages
- **Apache-2.0:** 35 packages
- **BSD-3-Clause:** 17 packages
- **BSD-2-Clause:** 13 packages
- **0BSD / CC-BY-4.0 / Python-2.0:** 4 packages
- **Đánh giá:** **100% dependencies sử dụng giấy phép Permissive Open Source hợp lệ.** Không có dependency nào sử dụng giấy phép lây nhiễm copyleft (GPL / AGPL).

### 5.2. Bản quyền TinyMCE và Assets Tĩnh
- **TinyMCE:** Sử dụng phiên bản **TinyMCE 6.8.3 Community Edition** (phiên bản cuối cùng mang giấy phép MIT / LGPL-2.1+ trước khi chuyển sang GPL ở v7). Đồng thời, TinyMCE được nạp trực tiếp qua CDN công khai (`cdn.jsdelivr.net`), **không chứa mã nguồn hay binary TinyMCE bên trong gói npm**.
- **Icons & Fonts:** Sử dụng bộ icon mã nguồn mở **Tabler Icons** (MIT License) qua CDN và các file SVG tự thiết kế trong `public/img/icons/`.

### 5.3. Dấu vết bên thứ ba & Thuật ngữ vay mượn
1. **Từ khóa "sitecore" & "unicorn":**
   - Đã quét toàn bộ repo: Trong mã nguồn thực thi `src/` và `bin/` đạt **0 occurrences**.
   - Chỉ xuất hiện 5 vị trí trong tài liệu phân tích lịch sử (`docs/decisions/`, `docs/reports/`). Khi whitelist các file đóng gói vào npm, toàn bộ các tài liệu này **bị loại trừ 100% khỏi tarball**.
2. **Thuật ngữ vay mượn:**
   Hệ thống có một số thuật ngữ kinh điển trong kiến trúc CMS phân cấp:
   - `Launchpad`: Giao diện desktop-like khởi động ứng dụng.
   - `Workbox`: Hộp thư phê duyệt quy trình workflow.
   - `Standard Values`: Giá trị mặc định kế thừa của template.
   - `Insert Options`: Tùy chọn chèn item con theo template.
   - `Experience Editor`: Đang là stub chờ phát triển.
   - *Đề xuất Tech Lead:* **Giữ nguyên các thuật ngữ này** vì chúng mang tính quy chuẩn công nghiệp của CMS phân cấp (tương tự như thuật ngữ "Post", "Taxonomy" trong WordPress).

### 5.4. Quét rò rỉ bí mật trong lịch sử Git (Git History Secret Scan)
- Kiểm tra toàn bộ lịch sử git: Không có tệp `.env`, `.env.development`, `.env.production` nào từng bị commit vào repository.
- Các secret key trong `tests/` đều là các chuỗi mock fixture dành riêng cho unit test (`test_session_secret_for_ci_pipeline_2026`).

### 5.5. Kiểm tra Tên Gói trên npm Registry
- `treecraft`: **Đã bị chiếm** bởi package `treecraft@1.0.2` (công cụ vẽ cây thư mục CLI).
- `treecraft-core`: **Còn trống (404 Not Found)**.
- `@treecraft/core`: **Còn trống (404 Not Found)** (nếu người dùng đăng ký organization scope `@treecraft` trên npm).

---

## 6. KIỂM TOÁN VÀ DANH MỤC DẤU VẾT SUBMODULE CẦN GỠ BỎ

Dưới đây là danh sách toàn bộ các vị trí trong dự án đang chứa logic hoặc tham chiếu đến `git submodule` cần được gỡ bỏ triệt để trong GĐ N:

| Thành phần | Tệp tin cụ thể | Hiện trạng logic Submodule | Giải pháp chuyển đổi sang npm duy nhất |
| :--- | :--- | :--- | :--- |
| **Path Resolver** | `src/config/sitePaths.js` | Phân biệt `isStandaloneMode` bằng cách kiểm tra tên thư mục cha `core`. | Chuyển sang mô hình duy nhất: `CORE_DIR` là thư mục chứa package (`__dirname/..`), `SITE_DIR` là `process.cwd()`. |
| **Immutability Check** | `src/config/sitePaths.js`, `src/server.js` | Dùng `git status --porcelain` trong thư mục `core/`. | Thay bằng hàm `verifyPackageIntegrity()` kiểm tra sha512 hash trong `package-lock.json`. |
| **CLI Init** | `bin/treecraft.js` | Đọc starter từ `../starter/corporate` dựa trên cấu trúc submodule. | Nhận diện starter trực tiếp từ package root `path.resolve(__dirname, '../starter/corporate')`. Sinh `package.json` có dependency `@scope/treecraft-core`. |
| **Doctor Tool** | `src/scripts/doctor.js` | In ra thông báo `Chế độ: Site Project với Core Submodule`. | Chuyển sang kiểm tra phiên bản gói npm, core integrity và đường dẫn `node_modules`. |
| **Core Upgrade CLI** | `src/scripts/core-upgrade-cli.js` | Hướng dẫn lệnh `git submodule update --remote core`. | Chuyển sang kiểm tra phiên bản npm qua `npm view` và hướng dẫn `npm update @scope/treecraft-core`. |
| **Admin UI** | `src/views/admin/control-panel/index.ejs` | Hiển thị badge `Site với Core Submodule`. | Hiển thị thông tin phiên bản npm Core: `Treecraft Core vX.Y.Z (npm)`. |
| **Fresh Install Test** | `tests/verify-fresh-install.js` | Chạy `git submodule add` qua file protocol. | Viết lại: Tạo thư mục tạm $\rightarrow$ `npm init -y` $\rightarrow$ `npm install <local-tarball>` $\rightarrow$ `npx treecraft init` $\rightarrow$ test HTTP. |
| **Tài liệu Hướng dẫn** | `docs/guides/core-and-site.md`, `fresh-install.md` | Hướng dẫn lệnh `git submodule add`. | Viết lại theo luồng chuẩn: `npm init -y` $\rightarrow$ `npm install @scope/treecraft-core` $\rightarrow$ `npx treecraft init`. |
| **Quy tắc AI** | `AGENTS.md`, `.agents/rules/*` | Có mục quy ước cấu trúc Git Submodule. | Cập nhật định nghĩa: Core là npm package công khai, Site là ứng dụng độc lập. |

---

## 7. ĐÁNH GIÁ RỦI RO & BIỆN PHÁP KIỂM SOÁT

1. **Rủi ro rò rỉ mã nguồn/tài liệu nhạy cảm khi publish npm:**
   - *Biện pháp kiểm soát:* Cấu hình trường `files` Whitelist trong `package.json`. Viết script kiểm tra tự động `npm run pack:check` chạy `npm pack --dry-run` bắt buộc fail nếu phát hiện bất kỳ file nào nằm ngoài danh mục cho phép.
2. **Rủi ro người dùng tự ý chỉnh sửa mã nguồn trong `node_modules`:**
   - *Biện pháp kiểm soát:* Tích hợp cơ chế kiểm tra tính toàn vẹn (Integrity Check) tại thời điểm khởi động server: Cảnh báo ở môi trường Dev, từ chối khởi động ở môi trường Staging/Production nếu mã hash của gói không khớp.
3. **Rủi ro các dự án đang chạy bằng submodule bị gián đoạn:**
   - *Biện pháp kiểm soát:* Xây dựng công cụ chuyển đổi một lần `npx treecraft migrate-to-npm` với cơ chế tự động backup dữ liệu K1 trước khi chuyển đổi và xác minh toàn vẹn DB.
