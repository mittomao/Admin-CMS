# Ma trận Đánh giá Tác động & Rủi ro GĐ L1 (Language Manager Impact Matrix)
> File: `docs/phases/L1-impact-matrix.md`  
> Mô tả: Bảng đối soát chi tiết hiện trạng hard-code mã ngôn ngữ, kế hoạch hành động, phân tích rủi ro và phương pháp kiểm chứng cho từng phân vùng hệ thống.

---

## 1. Tổng quan Số liệu Quét Tĩnh (Codebase Language Audit)

Kết quả quét tự động phát hiện **349 vị trí hard-code** mã ngôn ngữ (`'vi'`, `'en'`, `"vi"`, `"en"`, `defaultLanguage`, `SITE_DEFAULT_LANGUAGE`, `supportedLanguages`, danh sách ngôn ngữ tĩnh) trên **73 tệp tin** trong toàn bộ codebase:

```
┌──────────────────────────────────────┬─────────────┬──────────────┐
│ Phân vùng / Khu vực                  │ Số tệp tin  │ Số lần xuất  │
├──────────────────────────────────────┼─────────────┼──────────────┤
│ 1. Models & Schemas                  │ 6 files     │ 12 matches   │
│ 2. Services & Helpers                │ 16 files    │ 81 matches   │
│ 3. Controllers & Routes              │ 6 files     │ 22 matches   │
│ 4. Views & SSR Templates             │ 28 files    │ 45 matches   │
│ 5. Public Frontend Scripts           │ 3 files     │ 7 matches    │
│ 6. Seeds & Migrations                │ 7 files     │ 29 matches   │
│ 7. Tests & Test Fixtures             │ 23 files    │ 151 matches  │
│ 8. Middlewares & Config              │ 1 files     │ 2 matches    │
├──────────────────────────────────────┼─────────────┼──────────────┤
│ TỔNG CỘNG                            │ 73 files    │ 349 matches  │
└──────────────────────────────────────┴─────────────┴──────────────┘
```

Truy vấn cơ sở dữ liệu hiện tại (Read-Only):
- `items_master`: Chứa các bản ghi nội dung có mã ngôn ngữ `vi` (53 items).
- `items_web`: Chứa các bản ghi xuất bản có mã ngôn ngữ `en` và `vi` (53 items).
- `languages`: Collection cũ hiện đang rỗng (`[]`).
- `/root/system/Languages`: Chưa được khởi tạo; `/root/system` đã sẵn sàng.

---

## 2. Bảng Đối soát Chi tiết: Hiện trạng → Hành động → Rủi ro → Cách kiểm chứng

| Khu vực | Hiện trạng (Kèm số liệu) | Hành động Cần thực hiện | Rủi ro Tiềm ẩn | Cách Kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **1. Models & Schemas** | 6 files (12 matches): `Item.js`, `Language.js`, `PublishedItem.js`, `PublishHistory.js`, `PublishJob.js`, `WorkflowHistory.js` đều gán cứng `default: 'vi'` hoặc `langCode = 'vi'`. `Item.js` có text index `{ name: 'text', displayName: 'text' }` chưa chỉ định stemmer. | - Giữ `default: 'vi'` ở Schema chỉ như fallback dự phòng mức database thô khi chưa tải cấu hình.<br>- Bỏ model `Language.js` (collection độc lập), thay thế bằng logic truy vấn Item dưới `/root/system/Languages`.<br>- Cấu hình text index với stemming phù hợp (DEC-049). | Gây lỗi khi schema validation yêu cầu mã ngôn ngữ nhưng service chưa sẵn sàng; xung đột index MongoDB khi sửa đổi. | Chạy lại `npm test` toàn bộ các model suites; kiểm tra `item.getLanguage()` và `publishedItem.getFieldValue()` với ngôn ngữ động. |
| **2. Services & Helpers** | 16 files (81 matches):<br>- `siteResolver.js`: `this.defaultLanguage = 'vi'`, `this.supportedLanguages = ['vi', 'en']`<br>- `versionService.js`: `Language.find({ active: true })`, hard-code `'vi'`, `'en'` trong `resolveFields`<br>- `publishService.js`: default `['vi']`<br>- `presentationService.js`: default `'vi'`<br>- `mediaService.js`: fallback cứng `vi`/`en` cho alt text. | - Thay thế toàn bộ bằng lời gọi tới `languageService` (nguồn sự thật duy nhất).<br>- `siteResolver.js` lấy danh sách ngôn ngữ `enabled` từ Web store.<br>- `versionService` duyệt danh sách ngôn ngữ động, fallback theo `getFallbackChain`.<br>- Bổ sung Language items vào `resolveRelatedItems` của `publishService`. | Chậm hiệu năng nếu truy vấn DB lặp đi lặp lại; lỗi vòng lặp fallback ngôn ngữ (A -> B -> A). | - Sử dụng In-Memory Cache tại `languageService` với TTL và event invalidation.<br>- Viết unit test thuật toán `getFallbackChain` với chu trình khép kín; kiểm thử tải URL site `/` và `/:lang/:slug`. |
| **3. Controllers & Routes** | 6 files (22 matches): `contentEditorController`, `presentationController`, `publishManagerController`, `siteController`, `itemRoutes` gán `req.query.lang || 'vi'` và kiểm tra regex cứng. | - Sử dụng `languageService.getDefault()` khi `req.query.lang` khuyết thiếu.<br>- Kiểm tra tính hợp lệ qua `languageService.isValid(lang)`.<br>- Định tuyến API `GET/POST /api/languages` có CSRF và `canPerform`. | Client gửi mã ngôn ngữ lạ gây sập controller hoặc sinh phiên bản rác trong DB. | Gửi request với mã ngôn ngữ không tồn tại (e.g. `?lang=unknown`) $\rightarrow$ nhận mã lỗi 400 hoặc tự động fallback chuẩn mực; kiểm thử Supertest `languageApi.test.js`. |
| **4. Views & SSR Templates** | 28 files (45 matches):<br>- Layout shell: `<html lang="vi">`<br>- Header site: hard-code menu chuyển ngữ `VI` và `EN`<br>- Dropdown chọn ngôn ngữ trong `item-form.ejs`, `details-modal.ejs`, `media-browser-core.ejs`, `publish-dialog.ejs`, `workbox/index.ejs`. | - Truyền danh sách ngôn ngữ động (`activeLanguages`, `currentLangInfo`) vào `res.locals`.<br>- Render `<html lang="<%= lang %>" dir="<%= dir %>">`.<br>- Vòng lặp EJS render các tùy chọn ngôn ngữ dựa trên danh sách từ `languageService`. | Giao diện vỡ layout khi tên ngôn ngữ dài hoặc `dir="rtl"`; dropdown rỗng nếu cache lỗi. | Kiểm tra hiển thị thực tế trên trình duyệt; thêm ngôn ngữ `ar` hoặc `ja` xem thẻ `<html>` và dropdown phản ánh tức thì. |
| **5. Public Frontend Scripts** | 3 files (7 matches): `content-editor.js`, `media-browser.js`, `presentation-details.js` chứa chuỗi `'vi'` mặc định khi khởi tạo query parameters. | - Đọc mã ngôn ngữ hiện tại từ thuộc tính `data-lang` hoặc `data-default-lang` của wrapper DOM thay vì gán cứng chuỗi `'vi'`. | Mất đồng bộ giữa client script và backend khi chuyển đổi tab ngôn ngữ. | Thao tác chuyển đổi ngôn ngữ trong Content Editor và Presentation Details, kiểm tra Ajax request gửi đúng `lang` tương ứng. |
| **6. Seeds & Migrations** | 7 files (29 matches): `seed-initial-data.js`, `seed-sample-site.js`, `migrate-to-versions-languages.js` tạo cấu trúc ngôn ngữ cứng `vi`/`en`. | - Bổ sung seed khởi tạo System Templates `Language` & `Languages Folder`.<br>- Tạo sẵn 2 Item ngôn ngữ mặc định: `/root/system/Languages/vi` (mặc định) và `/root/system/Languages/en`.<br>- Viết migration script `migrate-languages-to-items.js` có `--dry-run` và rollback. | Trùng lặp dữ liệu khi chạy seed nhiều lần; hỏng đường dẫn tổ tiên của cây hệ thống. | Thiết lập migration idempotent (`upsert` theo path); kiểm tra cờ `--dry-run` không làm thay đổi database thực tế. |
| **7. Tests & Test Fixtures** | 23 files (151 matches): Các file test cũ khởi tạo dữ liệu mẫu với `'vi'`, `'en'` hoặc tạo `Language.create(...)` trực tiếp trên collection cũ. | - Cập nhật test helper khởi tạo Item Language chuẩn trong môi trường test.<br>- Giữ nguyên các fixture `vi`/`en` đặc thù phục vụ kiểm thử ngữ cảnh 2 ngôn ngữ, nhưng tách biệt rõ ràng khỏi code ứng dụng chính.<br>- Bổ sung test suite mới `languageService.test.js` và `languageApi.test.js`. | Gãy hàng loạt các test suites cũ do phụ thuộc vào collection `languages` độc lập đã bị bãi bỏ. | Chạy toàn bộ 38 test suites; đảm bảo 100% test pass (không có regression). |
| **8. Bảo mật & Phân quyền** | Quyền quản lý ngôn ngữ chưa được khai báo tập trung. | - Khai báo quyền `language:read` và `language:manage` trong `permissions.js`.<br>- Kiểm soát truy cập màn hình `/admin/languages` và API qua `canPerform`.<br>- Chặn quyền xóa/sửa node hệ thống `/root/system/Languages`. | Người dùng không đủ thẩm quyền vô hiệu hóa ngôn ngữ chính hoặc xóa nhầm node hệ thống. | Kiểm thử phân quyền: User thường chỉ xem được; chỉ Administrator mới được thao tác thêm/sửa/đổi mặc định. |

---

## 3. Kế hoạch Kiểm tra Tự động (`check:languages`)

Nhằm ngăn chặn việc vô tình viết cứng mã ngôn ngữ trong quá trình phát triển sau này:
1. Tạo script kiểm tra tĩnh `src/scripts/check-languages.js`.
2. Định nghĩa danh sách tệp được phép chứa chuỗi ngôn ngữ mẫu (Whitelist):
   - `src/scripts/seed-*.js` (khởi tạo ban đầu)
   - `tests/**` (fixtures và mock dữ liệu)
   - `src/config/branding.js` (nếu có giá trị khởi tạo)
3. Toàn bộ code trong `src/services/`, `src/controllers/`, `src/routes/`, `src/views/`, `public/js/` xuất hiện chuỗi `'vi'`, `'en'`, `"vi"`, `"en"` ngoài whitelist sẽ bị báo lỗi và trả mã thoát `exit 1`.
4. Đăng ký script vào `package.json`:
   ```json
   "check:languages": "node src/scripts/check-languages.js"
   ```

