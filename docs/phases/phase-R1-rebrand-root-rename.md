---
phase: R1
name: Rebrand Treecraft và đổi root
depends_on: [0, 1, 2, 3, 4, 5, 5.1, 6, 6.2, 6.3, 7, 8, 8.1, 10]
status: Hoàn thành
estimate: 2-3 ngày
updated: 2026-11-08
---

# GIAI ĐOẠN R1: REBRAND "TREECRAFT" & ĐỔI ROOT ITEM `/root` → `/root`

## 1. TÀI LIỆU CẦN ĐỌC TRƯỚC
1. [`AGENTS.md`](../../AGENTS.md): Hướng dẫn AI Agent, kỷ luật phê duyệt và quy tắc Git.
2. [`docs/rules/00-workflow.md`](../rules/00-workflow.md): Quy trình làm việc, tiêu chuẩn kiểm thử và báo cáo nghiệm thu.
3. [`docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md`](../decisions/DEC-043-rebrand-treecraft-and-root-rename.md): Quyết định kiến trúc chốt về việc đổi tên sang Treecraft, root `/root` và kiến trúc hằng số hóa.
4. [`docs/phases/R1-impact-matrix.md`](./R1-impact-matrix.md): Bảng phân tích phạm vi ảnh hưởng chi tiết 12 khu vực.
5. [`docs/open-questions.md`](../open-questions.md): 10 câu hỏi kỹ thuật/nghiệp vụ kèm đề xuất mặc định của Tech Lead.

---

## 2. MỤC TIÊU GIAI ĐOẠN
Chuyển đổi toàn diện thương hiệu CMS sang **Treecraft** và chuyển đổi gốc cây phân cấp từ `/root` sang `/root`. Đạt được mục tiêu **"Hai thứ độc lập"**: Tên thương hiệu `Treecraft` không bao giờ xuất hiện trong đường dẫn cây dữ liệu (`path`), toàn bộ đường dẫn và định danh được quản lý tập trung qua hằng số duy nhất `src/config/branding.js`, cấm tuyệt đối chuỗi hard-code rải rác.

---

## 3. PHẠM VI CÔNG VIỆC

### 3.1. Việc CẦN LÀM
1. **Kiến trúc Hằng số hóa Thương hiệu:**
   - Tạo module cấu hình duy nhất `src/config/branding.js` định nghĩa: `PROJECT_NAME`, `PROJECT_TITLE`, `ROOT_NAME`, `ROOT_PATH`, `DEFAULT_DOMAIN`, `SESSION_COOKIE_NAME`, và `PATHS` (`ROOT`, `CONTENT`, `LAYOUT`, `TEMPLATES`, `MEDIA`, `SYSTEM`, `START_ITEM`).
   - Thay thế toàn bộ chuỗi hard-coded `/root` trong `src/services/`, `src/controllers/`, `src/models/`, `src/config/` bằng các hằng số từ `branding.js`.
2. **Migration Dữ liệu Database (Master & Web):**
   - Viết script `src/scripts/migrate-phase-r1-root-rename.js` có `--dry-run`, idempotent, có checkpoint và rollback đảo chiều.
   - Cập nhật trường `path` của 72 items trong `items_master` (`^/sitecore` &rarr; `/root`).
   - Cập nhật trường `path` của 53 items trong `items_web` (`^/sitecore` &rarr; `/root`).
   - Cập nhật trường `path` của 24 templates trong `templates`.
   - Cập nhật trường `source` của field template nếu có trỏ tới `/root/...`.
   - Đổi `name: "root"`, `displayName: "root"`, `path: "/root"` cho Item gốc (giữ nguyên `_id`).
   - Cập nhật domain mặc định trong `domains` và user `domain` trong `users` (`sitecore` &rarr; `treecraft`).
   - Tự động rebuild index `path_1` trên cả hai collection `items_master` và `items_web`.
3. **Cập nhật Mapper & Bộ phân giải:**
   - Cập nhật `src/utils/mediaPathMapper.js` ánh xạ `ROOT_MEDIA_PATH = '/root/media library'` sang Cloudinary folder `AdminCMS`.
   - Cập nhật `src/services/siteResolver.js` phân giải URL công khai dựa trên `branding.PATHS.CONTENT` và `branding.PATHS.START_ITEM`.
   - Xóa sạch (invalidate) toàn bộ in-memory cache của Public Site Renderer và ACL LRU cache sau migration.
4. **Cập nhật Giao diện (UI & EJS):**
   - Đổi logo/chữ trên topbar (`src/views/partials/topbar.ejs`), taskbar, footer sang "Treecraft".
   - Cập nhật tiêu đề trang đăng nhập (`src/views/admin/auth/login.ejs`) và thẻ `<title>` toàn hệ thống.
   - Cập nhật cây Content Editor (`public/js/admin/content-editor.js`) và Icon registry (`public/js/admin/icons.js`).
5. **Cập nhật Seed Data & Kiểm thử:**
   - Cập nhật các seed script (`seed-initial-data.js`, `seed-presentation-data.js`, `seed-sample-site.js`, `sync-system-templates.js`) sử dụng hằng số `branding.PATHS.*`.
   - Cập nhật 24 file test suites trong `tests/` đồng bộ theo `ROOT_PATH`.
   - Bổ sung test kiểm tra tính toàn vẹn: không còn bất kỳ chuỗi hard-code `/root` nào ngoài danh sách cho phép.
6. **Cập nhật Tài liệu:**
   - Cập nhật `AGENTS.md` và các tài liệu quy chuẩn dưới `docs/`.

### 3.2. Việc KHÔNG LÀM (Out of Scope)
1. **Không đổi tên thư mục Cloudinary trên cloud:** Tiếp tục giữ thư mục gốc Cloudinary `AdminCMS` để bảo toàn 100% đường dẫn ảnh đã upload.
2. **Không đổi tên cơ sở dữ liệu vật lý MongoDB Atlas đang chạy:** Giữ nguyên database hiện tại, chỉ đổi tên hiển thị và giá trị mẫu trong `.env.example`.
3. **Không đổi các thuật ngữ nghiệp vụ vay mượn của Sitecore:** Các khái niệm `Launchpad`, `Workbox`, `Standard Values`, `Experience Editor`, `Presentation Details`, `Insert Options` được giữ nguyên trong R1.
4. **Không đổi tên repository Git hay thư mục dự án:** Tên folder máy trạm `Admin-CMS` giữ nguyên, việc đổi tên do người dùng chủ động thực hiện sau.
5. **Không sửa các file tài liệu trong `docs/archive/`:** Thư mục archive là dữ liệu lưu trữ lịch sử bất biến.
6. **Không sửa các file migration lịch sử từ GĐ 0 đến GĐ 8:** Giữ nguyên lịch sử di trú; chỉ tạo migration mới cho R1.

---

## 4. PHÂN TÍCH RỦI RO & BIỆN PHÁP GIẢM THIỂU (RISK ASSESSMENT)

| STT | Rủi ro tiềm ẩn | Khả năng | Mức ảnh hưởng | Biện pháp giảm thiểu | Cách phát hiện & Kiểm chứng |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | **Migration `path` hàng loạt làm gãy cây hoặc lệch giữa Master và Web** | Trung bình | **Rất cao** | Chạy migration theo thứ tự, hỗ trợ `--dry-run`, có rollback đảo chiều; cập nhật Master và Web trong cùng một quy trình có checkpoint. | Đếm số lượng item trước/sau; so sánh diff đối soát `/admin/databases`; kiểm tra `parentId` của mọi node. |
| **2** | **Thay thế chuỗi mù quáng va chạm với từ `root` đã có** (`root=`, `rootNode`, `getRoot`, CSS `:root`) | Cao | **Rất cao** | Không dùng regex replace toàn cục mù quáng; phân tích kỹ bảng va chạm tại `R1-impact-matrix.md`; dùng hằng số `branding.PATHS.ROOT`. | Chạy `npm run lint`, kiểm tra CSS layout hiển thị đúng, chạy 305 tests tự động. |
| **3** | **Hằng số hóa không triệt để (sót chuỗi `/root/` cứng)** | Trung bình | **Cao** | Viết test assertion quét toàn bộ thư mục `src/` để đảm bảo không còn chuỗi `/root/` nào ngoài danh sách cho phép (Allowlist). | Viết test `expect(scanForLegacySitecorePaths()).toHaveLength(0)`. |
| **4** | **Mất phiên đăng nhập của người dùng quản trị** | **Chắc chắn** | Thấp | Thông báo trước trong kế hoạch; đổi cookie session name sang `treecraft_session_id`, người dùng chỉ cần đăng nhập lại một lần. | Kiểm tra set-cookie header khi login thành công với tên cookie mới. |
| **5** | **Đổi domain người dùng làm sai thông tin đăng nhập hoặc Item Owner** | Trung bình | **Cao** | Viết script cập nhật trường `domain` của các tài khoản user hiện có (`sitecore` &rarr; `treecraft`); cập nhật model Domain. | Thử đăng nhập bằng tài khoản `admin` với mật khẩu cũ; kiểm tra Quick Info mục Item Owner. |
| **6** | **Script Seed / Migration cũ không chạy lại được trên Database sạch** | Trung bình | **Cao** | Cập nhật toàn bộ các file seed chính (`seed-initial-data.js`, `seed-presentation-data.js`) sử dụng `branding.PATHS.*`; kiểm tra chạy seed trên in-memory DB trống. | Chạy thử `node src/scripts/seed-initial-data.js` trên một database test mới. |
| **7** | **Lệch mapper Cloudinary làm đứt gãy hình ảnh hiển thị** | Trung bình | **Rất cao** | Giữ nguyên thư mục `AdminCMS` trên Cloudinary; chỉ cập nhật `ROOT_MEDIA_PATH = '/root/media library'`; kiểm tra kỹ hàm `itemPathToCloudinary` và `cloudinaryToItemPath`. | Chạy lại trọn bộ `tests/mediaPathMapper.test.js` (phải pass 100%); kiểm tra load ảnh Media Library và Public Site. |
| **8** | **Index `path` bị khóa hoặc chậm khi bulk update dữ liệu lớn** | Thấp | Trung bình | Vì dữ liệu hiện tại chỉ có 72 items Master và 53 items Web, thời gian cập nhật dưới 1 giây. Tự động gọi `collection.reindex()` hoặc recreate index `path_1`. | Kiểm tra `getIndexes()` và thời gian thực thi migration log. |
| **9** | **Public Site và In-Memory Render Cache bị lỗi 404** | Cao | **Cao** | Cập nhật đồng thời `SITE_START_ITEM = '/root/content/Home'` trong cấu hình; gọi `siteRenderer.clearCache()` ngay sau khi migration hoàn tất. | Truy cập `GET /`, `GET /about-us`, `GET /sitemap.xml` khẳng định trả về HTTP 200 HTML đầy đủ. |
| **10** | **Không thể Rollback nếu có sự cố xảy ra** | Thấp | **Rất cao** | Yêu cầu bắt buộc: **Tạo bản backup DB (mongodump) trước khi chạy**; script migration có cờ `--rollback` đảo ngược chính xác từ `/root` về `/root`. | Thử nghiệm migration & rollback trên bản sao DB test trước khi chạy trên Atlas. |
| **11** | **Công cụ AI sửa nhầm các file loại trừ (`docs/archive/`, `node_modules`, binary)** | Trung bình | Trung bình | Đưa danh sách loại trừ rõ ràng vào prompt và quy tắc; kiểm tra kỹ bằng `git status --short` trước khi nghiệm thu. | Kiểm tra `git status`, đảm bảo không có file nào trong thư mục cấm bị sửa. |
| **12** | **Publish Job hoặc Scheduler đang chạy dở trong lúc migration** | Thấp | **Cao** | Dừng toàn bộ node service trước khi chạy migration dữ liệu (bảo trì offline 2 phút). | Kiểm tra `publish_jobs` không có job nào ở trạng thái `Running`. |
| **13** | **Field Template Source lưu cứng `/root/...`** | Thấp | Trung bình | Rà soát phát hiện 1 template (`Rendering`) có `source: '/root/templates/Feature/Components'`; migration bao gồm cập nhật trường `source` này. | Mở Content Editor chọn một component rendering, kiểm tra dropdown template nạp đủ options. |

---

## 5. DANH SÁCH LOẠI TRỪ KHI TÌM VÀ THAY CHUỖI (EXCLUSION LIST)
Khi rà soát và thay thế, **tuyệt đối bỏ qua** các thư mục và tập tin sau:
1. `node_modules/` (thư viện ngoài)
2. `.git/` (lịch sử git)
3. `docs/archive/` (tài liệu sao lưu gốc bất biến)
4. `package-lock.json` (chỉ cập nhật thông qua lệnh `npm`)
5. File nhị phân, ảnh (`.png`, `.jpg`, `.webp`, `.ico`)
6. `coverage/` và `.gemini/`
7. Nội dung do người dùng tự nhập trong các trường Text/RichText của DB (ngoại trừ trường `path` và `source` hệ thống)
8. Các URL bên thứ ba (Cloudinary, Google Fonts, CDN...)
9. Giá trị bí mật trong file `.env` (chỉ sửa tên biến nếu có)

---

## 6. THỨ TỰ THỰC HIỆN ĐỀ XUẤT (EXECUTION PHASES)

### Bước 1: Chuẩn bị & Bản sao lưu (Backup Baseline)
- [x] Kiểm tra `git status` đảm bảo working tree sạch sẽ.
- [x] Chạy trọn bộ `npm test` để xác nhận trạng thái xanh ban đầu (305/305 tests passed).
- [x] **Nhắc người dùng tạo bản sao lưu MongoDB Atlas (Export/Dump) trước khi chạy bất kỳ migration nào.**
- [x] Tiêu chí qua: Test suite ban đầu pass 100%, có backup DB an toàn.

### Bước 2: Tạo `src/config/branding.js` & Hằng số hóa
- [x] Tạo module `src/config/branding.js` chứa các hằng số nhận diện thương hiệu và đường dẫn cây `/root`.
- [x] Thay thế các chuỗi hard-coded trong:
  - `src/services/itemService.js` (`PROTECTED_PATHS`, `getRoot`, tree rules)
  - `src/services/templateService.js` (Component & Page Template paths)
  - `src/services/presentationService.js` (Layout, Rendering, Placeholder paths)
  - `src/services/aclService.js` (`isLayoutTree`)
  - `src/services/siteResolver.js` (Candidate paths, start item path)
  - `src/utils/mediaPathMapper.js` (`ROOT_MEDIA_PATH`)
  - `src/config/icons.js` và `src/config/env.js`
- [x] **Chạy lại `npm test`:** Toàn bộ test suite phải tiếp tục pass xanh khi chạy với cấu hình mới.

### Bước 3: Phát triển Script Migration & Kiểm thử Dry-run
- [x] Tạo file script `src/scripts/migrate-phase-r1-root-rename.js` hỗ trợ:
  - `--dry-run`: Đếm và in chi tiết số lượng bản ghi sẽ thay đổi mà không ghi DB.
  - `--rollback`: Đảo ngược toàn bộ thay đổi từ `/root` trở lại `/root`.
  - Transaction hoặc Bulk Write an toàn.
  - Kiểm tra toàn vẹn sau khi chạy: `countDocuments({ path: /^\/root/i }) === 0`.
- [x] Chạy kiểm thử `--dry-run` trên database thực tế và báo cáo số liệu.

### Bước 4: Thực thi Migration Database & Invalidate Cache
- [x] Chạy migration chính thức:
  - Cập nhật 72 items trong `items_master`.
  - Cập nhật 53 items trong `items_web`.
  - Cập nhật 24 templates trong `templates`.
  - Cập nhật field `source` của template `Rendering`.
  - Cập nhật Item gốc `name: "root"`, `path: "/root"`.
  - Cập nhật domain mặc định `treecraft` và 3 tài khoản user.
  - Rebuild index `path_1` trên cả Master và Web.
- [x] Invalidate toàn bộ In-Memory Cache của Site Renderer và ACL Cache.

### Bước 5: Cập nhật Giao diện (UI EJS & Client JS)
- [x] Topbar: Đổi logo text sang "Treecraft" kèm icon cây (`src/views/partials/topbar.ejs`).
- [x] Trang đăng nhập: Đổi tiêu đề sang "Treecraft Content Management" (`src/views/admin/auth/login.ejs`).
- [x] Thẻ `<title>` và footer trên toàn hệ thống admin và public site.
- [x] Client JS: Cập nhật `public/js/admin/content-editor.js` (`PROTECTED_PATHS`) và `public/js/admin/icons.js`.

### Bước 6: Cập nhật Seed Scripts & Bộ Kiểm thử (Tests)
- [x] Cập nhật các seed script (`seed-initial-data.js`, `seed-presentation-data.js`, `seed-sample-site.js`, `sync-system-templates.js`) dùng `branding.PATHS.*`.
- [x] Cập nhật 24 file test suites trong `tests/` đồng bộ theo `/root/...`.
- [x] Bổ sung test kiểm tra: Không còn bất kỳ file mã nguồn nào chứa chuỗi hard-code `/root`.
- [x] Chạy `npm test` và `npm run lint`.

### Bước 7: Cập nhật Tài liệu & Xác minh Toàn diện
- [x] Cập nhật `AGENTS.md` (mô tả dự án Treecraft, bảng tìm nhanh).
- [x] Cập nhật các tài liệu hướng dẫn trong `docs/rules/` và `docs/data-model/`.
- [x] Xác minh luồng E2E trên trình duyệt:
  - Đăng nhập tài khoản admin (`treecraft\admin`).
  - Mở Content Editor duyệt cây `/root/content/Home`.
  - Mở Media Library xem ảnh Cloudinary.
  - Mở Public Site `http://localhost:4000/` render đầy đủ trang Home.
  - Mở `/sitemap.xml` kiểm tra URL sitemap.

---

## 7. KẾ HOẠCH ROLLBACK CHI TIẾT (ROLLBACK PLAN)
Trong trường hợp phát sinh sự cố nghiêm trọng không thể khắc phục:
1. **Phương án 1 (Rollback qua Script Migration):**
   - Chạy lệnh: `node src/scripts/migrate-phase-r1-root-rename.js --rollback`
   - Script tự động đổi ngược toàn bộ tiền tố `^/root` trở lại `/root`, khôi phục tên item gốc thành `sitecore`, khôi phục domain thành `sitecore`, và rebuild lại index `path_1`.
2. **Phương án 2 (Phục hồi từ Bản sao lưu):**
   - Khôi phục cơ sở dữ liệu MongoDB Atlas từ bản backup đã tạo ở Bước 1 qua lệnh `mongorestore`.
3. **Phục hồi mã nguồn:**
   - Người dùng có thể hoàn tác working tree bằng lệnh git tương ứng vì toàn bộ thay đổi đều được lưu ở working tree mà không tự ý commit.

---

## 8. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DoD)
- [x] Module `src/config/branding.js` được tạo và là nguồn sự thật duy nhất cho thương hiệu và root path.
- [x] Tuyệt đối không còn chuỗi hard-code `/root/` rải rác trong `src/services/`, `src/controllers/`, `src/models/`.
- [x] Toàn bộ 72 items Master, 53 items Web, 24 templates trong MongoDB Atlas có `path` bắt đầu bằng `/root/...`.
- [x] Không còn bất kỳ bản ghi nào có `path` bắt đầu bằng `/root` trong cả Master và Web.
- [x] Item gốc giữ nguyên `_id: 6ae95cc6b1e541e051fd4162`, có `name: "root"` và `path: "/root"`.
- [x] Ảnh Cloudinary hiển thị bình thường trong Media Library và Public Site; mapper hoạt động chính xác.
- [x] Giao diện Topbar, Login, `<title>` hiển thị thương hiệu "Treecraft".
- [x] Đăng nhập thành công với domain `treecraft\admin`.
- [x] Public site render thành công trang chủ `/` và trang con `/about-us` không có lỗi 404/500.
- [x] `npm test` vượt qua 100% test cases (312/312 tests).
- [x] `npm run lint` đạt 0 errors.
- [x] Báo cáo nghiệm thu `docs/reports/phase-R1-report.md` được lập đầy đủ theo mẫu chuẩn.

