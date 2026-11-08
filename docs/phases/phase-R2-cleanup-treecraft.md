---
phase: R2
name: Hoàn tất đổi tên Treecraft / Root (Quét và sửa toàn bộ phần còn sót sau R1)
depends_on: [R1]
status: Hoàn thành
estimate: 1 ngày
updated: 2026-11-08
---

# GIAI ĐOẠN R2: HOÀN TẤT ĐỔI TÊN TREECRAFT / ROOT (DỌN SẠCH DẤU VẾT CÒN SÓT)

## 1. TÀI LIỆU CẦN ĐỌC TRƯỚC
1. [`AGENTS.md`](../../AGENTS.md): Hướng dẫn kỷ luật AI Agent, nguyên tắc "chỉ code khi có lệnh" và quy tắc Git (tuyệt đối KHÔNG commit).
2. [`docs/decisions/DEC-043-rebrand-treecraft-and-root-rename.md`](../decisions/DEC-043-rebrand-treecraft-and-root-rename.md): Quyết định kiến trúc chuẩn hóa Treecraft và root `/root`.
3. [`docs/phases/phase-R1-rebrand-root-rename.md`](./phase-R1-rebrand-root-rename.md): Báo cáo & kế hoạch giai đoạn R1.
4. [`docs/reports/R2-allowlist.md`](../reports/R2-allowlist.md): Danh sách cho phép các tệp/chuỗi bảo toàn ngữ cảnh lịch sử.
5. [`docs/reports/R2-findings.md`](../reports/R2-findings.md): Bảng phân loại chi tiết các vị trí phát hiện ban đầu trước khi làm sạch.

---

## 2. MỤC TIÊU GIAI ĐOẠN
Dọn dẹp triệt để 100% mọi dấu vết còn sót lại của từ khóa `sitecore`/`Sitecore`/`SITECORE` trên toàn bộ codebase, giao diện người dùng, cấu hình, test suites, seed scripts, stylesheets, tài liệu kỹ thuật, nhằm hoàn thiện tuyệt đối giai đoạn chuyển đổi sang thương hiệu **Treecraft** và root `/root`.
Xây dựng công cụ kiểm tra tự động (`npm run check:branding`) để ngăn chặn việc tái xuất hiện từ khóa cũ trong tương lai.

---

## 3. CHECKLIST CÔNG VIỆC

### Nhóm 1: Quét khảo sát và Phân loại dấu vết (Audit & Inventory)
- [x] Quét toàn bộ repository bằng `git grep -i "sitecore"` và `git ls-files`
- [x] Lập baseline thống kê số lượng trước xử lý (`docs/reports/phase-R2-before.txt`: 932 vị trí)
- [x] Phân loại vị trí phát hiện vào `docs/reports/R2-findings.md` theo 9 nhóm khu vực
- [x] Xác định danh sách ngoại lệ hợp lệ vào `docs/reports/R2-allowlist.md` (chỉ gồm: archive, migration R1, DEC-043, test âm tính, các file báo cáo R1/R2)

### Nhóm 2: Đổi tên Tệp tin & Token (File Renames)
- [x] Đổi tên `src/styles/tokens/sitecore-tokens.js` &rarr; `src/styles/tokens/theme-tokens.js`
- [x] Cập nhật tham chiếu token trong `tailwind.admin.config.js` và `tailwind.site.config.js`
- [x] Đổi tên `docs/decisions/DEC-006-vanilla-css-sitecore-theme.md` &rarr; `docs/decisions/DEC-006-vanilla-css-treecraft-theme.md`
- [x] Cập nhật các liên kết trỏ tới DEC-006 trong toàn bộ hệ thống tài liệu `docs/`

### Nhóm 3: Làm sạch Mã nguồn & Giao diện (Code & Public Assets)
- [x] `public/css/admin.css`: Đổi tên CSS class, CSS variables (`--sc-*` &rarr; `--tc-*`), comments
- [x] `public/js/admin/content-editor.js`, `public/js/admin/item-picker.js`, `public/js/admin/media-browser.js`, `public/js/admin/security-editor.js`, `public/js/admin/icons.js`: Thay thế toàn bộ text và icon Sitecore sang Treecraft
- [x] `src/views/admin/` & `src/views/content-editor/`: Dọn sạch text trong EJS templates (thẻ title, tooltips, breadcrumbs, placeholder text)
- [x] `src/controllers/admin/databaseController.js`: Sửa lỗi hiển thị root path `/root`
- [x] `src/services/` (`aclService.js`, `itemService.js`, `mediaService.js`, `mediaSyncService.js`, `presentationService.js`, `siteRenderer.js`, `siteResolver.js`, `templateService.js`, `userService.js`, `webItemService.js`): Chuyển hóa toàn bộ sang `branding.PATHS.*` và `branding.DEFAULT_DOMAIN`

### Nhóm 4: Làm sạch Seed Scripts & Migration
- [x] `src/scripts/seed-initial-data.js`: 100% sử dụng `branding.PATHS` và domain `treecraft`
- [x] `src/scripts/seed-presentation-data.js`: Chuẩn hóa các đường dẫn `/root/layout/...`
- [x] `src/scripts/seed-sample-site.js`: Chuẩn hóa dữ liệu site mẫu sang Treecraft
- [x] `src/scripts/sync-system-templates.js`: Đã sửa lỗi tham chiếu branding và chuẩn hóa `/root/templates/System`
- [x] Các script di trú lịch sử trong `scripts/` và `src/scripts/`: Chuẩn hóa đường dẫn và import

### Nhóm 5: Chuẩn hóa Bộ Test Suite (30 Test Files)
- [x] Cập nhật mock email từ `@sitecore.local` &rarr; `@treecraft.local` trong toàn bộ test
- [x] Cập nhật các đường dẫn kiểm thử từ `/sitecore/...` &rarr; `/root/...`
- [x] Giữ nguyên test âm tính hợp lệ tại `tests/brandingAudit.test.js` (`expect(val).not.toContain('sitecore')`)
- [x] Xác minh 30/30 test suites (315 tests) vượt qua 100%

### Nhóm 6: Chuẩn hóa Tài liệu Kỹ thuật (Docs)
- [x] Cập nhật 117 file Markdown thuộc `docs/rules/`, `docs/data-model/`, `docs/decisions/`, `docs/phases/`, `docs/design-system/`
- [x] Chuẩn hóa toàn bộ ví dụ minh họa và sơ đồ cây từ `/sitecore` sang `/root`
- [x] Bảo toàn nguyên vẹn thư mục `docs/archive/` (bất biến)

### Nhóm 7: Xây dựng Công cụ Giám sát Tự động (Audit Tooling)
- [x] Tạo `src/scripts/check-branding.js` kiểm tra tự động cả tên file, nội dung code, và seed data
- [x] Thêm script `"check:branding": "node src/scripts/check-branding.js"` vào `package.json`
- [x] Tích hợp kiểm tra tự động chạy thành công với kết quả PASS 100%

---

## 4. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DoD)
- [x] **Zero residue outside allowlist:** 0 kết quả `sitecore` tồn tại trong mã nguồn, CSS, JS, EJS, test, scripts ngoài allowlist.
- [x] **Branding Audit:** Lệnh `npm run check:branding` thoát mã 0 (PASS).
- [x] **Full Regression:** Toàn bộ 30 test suites (315 test cases) vượt qua (PASS).
- [x] **Lint:** Không phát sinh lỗi cú pháp mới (`npm run check:branding` và server khởi động sạch sẽ).
- [x] **Git Compliance:** Không thực hiện bất kỳ lệnh `git commit`, `git add`, `git rm`, `git checkout`. Toàn bộ thay đổi nằm an toàn tại Working Tree chờ duyệt.
- [x] **Báo cáo nghiệm thu:** Đã hoàn thành `docs/reports/phase-R2-report.md`.

