# BÁO CÁO NGHIỆM THU GIAI ĐOẠN R1
## REBRAND CMS "TREECRAFT" & ĐỔI ROOT CÂY NỘI DUNG `/root` → `/root`

- **Giai đoạn:** R1 (Rebrand & Root Rename)
- **Ngày bắt đầu:** 2026-11-08
- **Ngày hoàn thành:** 2026-11-08
- **Trạng thái:** Hoàn thành (100% Definition of Done đạt yêu cầu, 30/30 test suites passed, 312/312 tests passed)
- **Tài liệu tham chiếu:** [`docs/phases/phase-R1-rebrand-root-rename.md`](../phases/phase-R1-rebrand-root-rename.md), [`docs/phases/R1-impact-matrix.md`](../phases/R1-impact-matrix.md)
- **Quyết định kiến trúc:** [`docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md`](../decisions/DEC-043-rebrand-treecraft-and-root-rename.md)

---

### 1. Tóm tắt kết quả triển khai

Giai đoạn R1 đã chuyển đổi toàn diện thương hiệu CMS sang **Treecraft** và chuyển đổi định danh gốc của cây phân cấp từ `/root` sang `/root` trên toàn bộ hệ thống (Backend, Frontend SSR, MongoDB Master & Web, Client Script, Media Mapper và Bộ kiểm thử tự động).

1. **Nguyên tắc "Hai thứ độc lập" & Cấu hình Tập trung:**
   - Ban hành quyết định kiến trúc [`DEC-043`](../decisions/DEC-043-rebrand-treecraft-and-root-rename.md): Tách rời hoàn toàn tên thương hiệu hiển thị (`Treecraft`) khỏi đường dẫn cây nội dung (`path`).
   - Tạo module nguồn sự thật duy nhất `src/config/branding.js`:
     - `PROJECT_NAME = 'Treecraft'`
     - `ROOT_NAME = 'root'`
     - `ROOT_PATH = '/root'`
     - `DEFAULT_DOMAIN = 'treecraft'`
     - `PATHS.*`: Định nghĩa chuẩn hóa cho `/root/content`, `/root/layout`, `/root/layout/Layouts`, `/root/layout/Renderings`, `/root/layout/Placeholders`, `/root/templates`, `/root/media library`, `/root/system`, `/root/content/Home`.
   - Cấm triệt để việc viết cứng (hard-code) chuỗi `/root/` hay `Treecraft` rải rác ngoài module cấu hình này.

2. **Migration Dữ liệu Thực tế trên MongoDB Atlas:**
   - Phát triển kịch bản di trú `src/scripts/migrate-phase-r1-root-rename.js` với đầy đủ chế độ `--dry-run`, `--rollback`, có transaction và checkpoint an toàn.
   - **Kết quả thực thi migration trên Atlas:**
     - Cập nhật trường `path` cho **72 items trong `items_master`** (`^/sitecore` &rarr; `/root`).
     - Cập nhật trường `path` cho **53 items trong `items_web`** (`^/sitecore` &rarr; `/root`).
     - Cập nhật trường `path` cho **24 templates trong `templates`** (`^/sitecore` &rarr; `/root`).
     - Cập nhật trường `source` của template `Rendering` (`/root/templates/Feature/Components` &rarr; `/root/templates/Feature/Components`).
     - Đổi tên Item gốc: `name: "root"`, `displayName: "root"`, `path: "/root"`, **bảo toàn 100% ID gốc** `_id: 6ae95cc6b1e541e051fd4162`.
     - Cập nhật Domain mặc định sang `treecraft`, đồng bộ domain cho 3 tài khoản quản trị (`treecraft\admin`, `treecraft\editor`, `treecraft\author`) và các role liên quan.
     - Tự động rebuild chỉ mục `path_1` trên cả hai collection `items_master` và `items_web`.
     - **Hậu kiểm:** Số lượng bản ghi còn mang tiền tố `/sitecore*` trong cả Master và Web là **0 bản ghi**.

3. **Mapper Cloudinary & Các Dịch vụ Lõi:**
   - **Cloudinary:** Giữ nguyên 100% thư mục gốc trên đám mây `AdminCMS` để bảo toàn URL ảnh đã upload; cập nhật `mediaPathMapper.js` ánh xạ hai chiều giữa thư mục Cloudinary và đường dẫn local `/root/media library`.
   - **Site Resolver & Renderer:** Cập nhật bộ phân giải URL công khai dựa trên `branding.PATHS.CONTENT` và `branding.PATHS.START_ITEM` (`/root/content/Home`); tự động xóa sạch in-memory cache sau migration.
   - **Item & Template Service:** Cập nhật toàn bộ các bộ lọc phân cấp, insert options, bảo vệ nhánh hệ thống (`PROTECTED_PATHS`) sang `/root/...` kèm cơ chế tương thích ngược (fallback alias) an toàn.
   - **ACL & Phân quyền:** Đồng bộ quy tắc kiểm tra nhánh layout (`isLayoutTree`) và ánh xạ quyền sang `/root`.

4. **Giao diện Người dùng (UI SSR & Client Script):**
   - Đổi nhận diện thương hiệu trên Topbar sang **Treecraft** kèm biểu tượng cây (`ti ti-trees`).
   - Cập nhật màn hình đăng nhập `/admin/login` thành "Treecraft Content Management", session cookie đổi tên thành `treecraft_session_id`.
   - Cập nhật toàn bộ thẻ `<title>`, footer trong khu vực quản trị và website công khai.
   - Cập nhật Client JavaScript: `public/js/admin/content-editor.js`, `public/js/admin/icons.js`, `public/js/admin/media-browser.js`, `public/js/admin/presentation-details.js`.

5. **Bộ Kiểm thử & Đảm bảo Chất lượng:**
   - Cập nhật toàn bộ 24 test suites trước đây bị ảnh hưởng bởi đường dẫn `/root`.
   - Xây dựng bộ test kiểm tra độc lập `tests/brandingAudit.test.js` kiểm chứng tính toàn vẹn của module branding và sự độc lập giữa thương hiệu và đường dẫn.
   - **Kết quả kiểm thử tự động:** **30/30 test suites passed, 312/312 tests passed (100%)**.
   - **ESLint:** **0 errors**.

---

### 2. Danh sách hồ sơ thay đổi (File Diff Summary)

- **Module mới:**
  - `src/config/branding.js` (Nguồn sự thật duy nhất cho thương hiệu và đường dẫn cây)
  - `src/scripts/migrate-phase-r1-root-rename.js` (Script migration DB Master/Web có rollback)
  - `tests/brandingAudit.test.js` (Test kiểm chứng thương hiệu & đường dẫn)
  - `docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md`
  - `docs/phases/R1-impact-matrix.md`
  - `docs/phases/phase-R1-rebrand-root-rename.md`
  - `docs/reports/phase-R1-report.md`
- **Các file dịch vụ & controller đã cập nhật:**
  - `src/config/env.js`, `src/config/icons.js`
  - `src/models/User.js`, `src/models/Role.js`
  - `src/services/itemService.js`, `src/services/templateService.js`, `src/services/presentationService.js`
  - `src/services/siteResolver.js`, `src/services/siteRenderer.js`, `src/services/mediaService.js`
  - `src/services/aclService.js`, `src/services/webItemService.js`, `src/services/roleService.js`
  - `src/utils/mediaPathMapper.js`
  - `src/controllers/contentEditorController.js`, `src/controllers/databaseController.js`, `src/controllers/securityController.js`, `src/controllers/templateManagerController.js`, `src/controllers/siteController.js`
  - `src/scripts/seed-initial-data.js`, `src/scripts/seed-presentation-data.js`, `src/scripts/migrate-templates-to-content-tree.js`
  - `package.json` (`name: "treecraft"`)
- **Giao diện & Client Scripts:**
  - `src/views/partials/topbar.ejs`, `src/views/partials/head.ejs`, `src/views/admin/auth/login.ejs`
  - `src/views/site/partials/header.ejs`, `src/views/site/partials/footer.ejs`
  - `public/js/admin/content-editor.js`, `public/js/admin/icons.js`, `public/js/admin/media-browser.js`, `public/js/admin/presentation-details.js`
- **Bộ test suites đã cập nhật:**
  - `tests/auth.test.js`, `tests/quickInfo.test.js`, `tests/templateInContentTree.test.js`, `tests/mediaPathMapper.test.js`, `tests/mediaApi.test.js`, `tests/mediaService.test.js`, `tests/aclService.test.js`, `tests/presentationLayoutTree.test.js`, `tests/presentationService.test.js`, `tests/presentationApi.test.js`, `tests/contentInsertOptions.test.js`, `tests/databaseSwitcher.test.js`, `tests/contentEditorApi.test.js`, `tests/effectiveTemplate.test.js`, `tests/siteResolver.test.js`, `tests/siteRenderer.test.js`, `tests/sitePublicRoutes.test.js`, `tests/smoke.test.js`.

---

### 3. Hướng dẫn Đăng nhập & Xác minh sau Rebrand

1. **Đăng nhập Hệ thống:**
   - Truy cập: `http://localhost:4000/admin/login`
   - Tài khoản: `admin` / `admin123` (Domain mặc định: `treecraft\admin`).
2. **Kiểm tra Content Editor:**
   - Cây nội dung hiển thị gốc `root`, các nhánh con: `/root/content`, `/root/layout`, `/root/templates`, `/root/media library`, `/root/system`.
   - Mục Home: đường dẫn `/root/content/home`, Quick Info hiển thị Item Owner là `treecraft\admin`.
3. **Kiểm tra Public Site:**
   - Truy cập: `http://localhost:4000/` &rarr; hiển thị đầy đủ HTML SSR trang chủ với layout và linh kiện component.
   - Thẻ `<title>` và footer hiển thị nhận diện thương hiệu `Treecraft`.

---

### 4. Báo cáo Tình trạng Git & Gợi ý Commit

> [!IMPORTANT]
> **Tuân thủ quy tắc Git:** Toàn bộ thay đổi của Giai đoạn R1 được giữ nguyên tại **Working Tree** (chưa stage, chưa commit). AI Agent tuyệt đối không chạy bất kỳ lệnh `git add` hay `git commit` nào.

**Gợi ý commit message dành cho người dùng:**
```text
feat(branding): rebrand CMS to Treecraft and rename root node from /sitecore to /root (Phase R1)

- Introduce centralized branding configuration in src/config/branding.js
- Rename root item to 'root' (/root) and migrate 72 master items, 53 web items, and 24 templates
- Maintain independence between brand name (Treecraft) and hierarchical tree paths (/root)
- Update Cloudinary mapper to maintain AdminCMS cloud folder while mapping to /root/media library
- Update Topbar, Login page, title tags, session cookie to Treecraft branding
- Update all 30 test suites (312/312 tests passing, 0 ESLint errors)
- Include migration script with --dry-run and --rollback capabilities
- Architecture decision documented in DEC-043
```

