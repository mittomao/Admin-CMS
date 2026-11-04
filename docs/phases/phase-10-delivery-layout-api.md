---
phase: 10
name: Public Site Renderer (100% Server-Side EJS & In-Memory Cache)
status: Chưa bắt đầu
depends_on: [6, 8]
estimate: 2.5 ngày làm việc
started: null
completed: null
updated: 2026-11-04
---

# GĐ 10 - Public Site Renderer (100% Server-Side EJS & In-Memory Cache)
> Bộ phân giải định tuyến công khai (Public Site Router & URL Resolver), kết xuất giao diện Server-Side EJS từ cơ sở dữ liệu `items_web`, helper `<%- placeholder(key) %>`, cơ chế bắt lỗi Error Boundary, bộ nhớ đệm trang và tối ưu hóa SEO cơ bản.

## Tài liệu cần đọc trước khi làm
- [`docs/rules/00-workflow.md`](../rules/00-workflow.md)
- [`docs/rules/01-project-overview.md`](../rules/01-project-overview.md)
- [`docs/rules/03-conventions.md`](../rules/03-conventions.md)
- [`docs/rules/04-routing.md`](../rules/04-routing.md)
- [`docs/rules/05-security.md`](../rules/05-security.md)
- [`docs/data-model/presentation.md`](../data-model/presentation.md)
- [`docs/data-model/items-and-tree.md`](../data-model/items-and-tree.md)
- [`docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`](../decisions/DEC-031-server-side-ejs-renderer-architecture.md)
- [`docs/decisions/DEC-033-viewpath-and-template-security.md`](../decisions/DEC-033-viewpath-and-template-security.md)
- [`docs/decisions/DEC-034-public-url-resolution-rules.md`](../decisions/DEC-034-public-url-resolution-rules.md)
- [`docs/decisions/DEC-035-component-field-inheritance-and-context.md`](../decisions/DEC-035-component-field-inheritance-and-context.md)

## Mục tiêu
Xây dựng phân hệ hiển thị trang web công khai (Public Site Renderer) trực tiếp từ ứng dụng Express chung trên cổng 4000:
- Định tuyến công khai tách biệt hoàn toàn khỏi `/admin`.
- Phân giải URL đường dẫn sang Content Item trong database `items_web`.
- Lấy cấu hình bố cục qua `presentationService.getFinalPresentation(item, lang, version)` và kết xuất mã HTML hoàn chỉnh thông qua template layout EJS và helper `<%- placeholder(key) %>`.
- Truyền ngữ cảnh dữ liệu phong phú (`item`, `fields`, `params`, `datasource`, `site`, `lang`) vào view của layout và component.
- Bộ nhớ đệm trang (Page Render In-memory Cache) tối ưu hiệu năng và tự động xóa cache khi publish.

## Phạm vi
- **Làm:**
  1. **Định tuyến & Phân giải URL (Public Router & Resolver):**
     - Đón nhận request tại `/` (root), `/:slug`, và `/:lang/:slug` (lồng nhiều cấp: `/*`).
     - Bỏ qua các đường dẫn hệ thống (`/admin/*`, `/media/*`, `/public/*`).
     - Xác định ngôn ngữ (mặc định `vi`, tiền tố `/en/...` cho tiếng Anh).
     - Ánh xạ đường dẫn sang item tương ứng trong `items_web` bắt đầu từ Start Item `/sitecore/content/Home` (DEC-034).
     - Trả về mã lỗi HTTP 404 và giao diện `views/site/404.ejs` nếu trang không tồn tại hoặc chưa publish lên Web.
  2. **Trình kết xuất Layout & Helper `placeholder`:**
     - Gọi `presentationService.getFinalPresentation` để lấy `layoutId` và danh sách renderings theo placeholder.
     - Nạp file EJS của layout qua thuộc tính `viewPath` (được bảo vệ an toàn bởi whitelist `src/views/site/layouts/`).
     - Cung cấp helper `<%- placeholder(placeholderKey) %>` trong view layout:
       - Duyệt qua các renderings được gán vào `placeholderKey` theo đúng thứ tự `sortOrder`.
       - Nạp file EJS của rendering qua `viewPath` (whitelist `src/views/site/components/`).
       - Truyền đầy đủ ngữ cảnh `{ item, fields, params, datasource, site, lang }`. Mặc định component đọc `fields` từ chính Page Item (DEC-035).
  3. **Cơ chế An toàn & Component Error Boundary (DEC-033):**
     - Mặc định EJS escape an toàn (`<%= %>`); chỉ dùng `<%- %>` cho Rich Text đã qua `resolveRichText` và sanitize.
     - Cơ chế Error Boundary: Khi một component bị lỗi biên dịch hoặc thiếu dữ liệu, hiển thị khối cảnh báo trực quan ở môi trường `development` và ghi log ẩn ở `production`, tuyệt đối không làm sập toàn bộ trang.
  4. **SEO cơ bản:**
     - Truyền thẻ `<title>` và `<meta name="description">` lấy từ các trường tương ứng của Page Item (`PageTitle`, `MetaDescription`).
  5. **Bộ nhớ đệm (In-memory Render Cache):**
     - Cache toàn bộ kết quả HTML kết xuất theo key: `site:{siteName}:{itemId}:{lang}:{version}`.
     - Tự động invalidate cache khi Publish hoàn tất (liên kết với GĐ 8 `publishService`).
- **Không làm:**
  - Không làm Layout Service JSON REST API cho React/Next.js frontend.
  - Không cấu hình CORS hay API key cho client ngoài.
  - Không hydrate client-side JS hay dùng framework SPA.

## Checklist Task
- [ ] **Task 10.1:** Xây dựng module cache `src/utils/renderCache.js` quản lý lưu và xóa bộ nhớ đệm HTML kết xuất theo item ID / site.
- [ ] **Task 10.2:** Xây dựng `siteRendererService.js`:
  - `resolveItemByPath(urlPath, lang)`: Phân giải HTTP URL path sang Page Item từ database `items_web`.
  - `resolvePageFields(item, lang)`: Phân giải giá trị các trường của Page (bao gồm fallback ngôn ngữ và Standard Values).
  - Phân giải URL cho trường Media và rich text (`resolveRichText`).
- [ ] **Task 10.3:** Xây dựng `siteRendererController.js`:
  - Tiếp nhận request công khai, kiểm tra cache.
  - Gọi `presentationService.getFinalPresentation(item, lang, version)`.
  - Khởi tạo helper `placeholder(key)` cho EJS.
  - Xử lý HTTP 404 cho trang chưa publish hoặc đường dẫn sai.
  - Bổ sung dữ liệu SEO cơ bản (title, meta description).
- [ ] **Task 10.4:** Đăng ký định tuyến công khai tại `src/routes/site/siteRoutes.js` và tích hợp vào `src/app.js` (nằm ngoài phạm vi middleware xác thực `/admin`).
- [ ] **Task 10.5:** Tích hợp cơ chế Invalidate Cache vào `publishService.js`: Xóa cache ngay khi một item hoặc nhánh cây được publish lên Web.
- [ ] **Task 10.6:** Viết các unit và integration test kiểm thử:
  - Truy cập `/` trả về trang Home (HTTP 200).
  - Truy cập `/about-us` trả về trang About us với đầy đủ component theo placeholder.
  - Truy cập đường dẫn chưa publish trả về HTTP 404.
  - Kiểm tra Error Boundary khi component gặp lỗi cú pháp EJS.
  - Kiểm tra Hit / Miss Cache và Invalidation sau khi publish.

## File/Thư mục Dự kiến
- `src/utils/renderCache.js`
- `src/services/siteRendererService.js`
- `src/controllers/site/siteRendererController.js`
- `src/routes/site/siteRoutes.js`
- `src/views/site/404.ejs`
- `src/views/site/partials/head.ejs`
- `src/views/site/partials/header.ejs`
- `src/views/site/partials/footer.ejs`
- `tests/siteRenderer.test.js`

## Route / API Dự kiến
- `GET /`
- `GET /:slug` (ví dụ `/about-us`)
- `GET /:parentSlug/:childSlug` (ví dụ `/about-us/team`)
- `GET /:lang/*` (ví dụ `/en/about-us`)

## Thay đổi Database
Không thay đổi schema (truy vấn trực tiếp trên `items_web`).

## Definition of Done & Cách kiểm thử
- Khởi động server tại cổng 4000 (`http://localhost:4000/`).
- Truy cập `http://localhost:4000/` trên trình duyệt:
  - Trang chủ hiển thị chuẩn mã HTML SSR với đầy đủ layout `HomeLayout` và các khối `HeroBanner`, `Introduction`, `ImageText` trong placeholder `maincontent`.
  - Tiêu đề `<title>` hiển thị đúng giá trị `HeroTitle` hoặc `PageTitle`.
- Truy cập `http://localhost:4000/about-us`: Hiển thị đúng nội dung trang About us đã publish.
- Truy cập một trang chưa publish hoặc không tồn tại (ví dụ `/draft-page`): Trả về mã lỗi 404 và render giao diện `404.ejs`.
- Lần gọi thứ 2 đến `/about-us`: Tốc độ phản hồi dưới 10ms do đọc từ bộ nhớ đệm render cache.
- Thay đổi nội dung trang trong Content Editor, bấm "Publish Item" -> Truy cập lại `http://localhost:4000/about-us`: Cache tự động xóa và hiển thị nội dung mới ngay lập tức.
- Thử nghiệm tạo component cố tình chứa lỗi cú pháp trong `src/views/site/components/`: Trang web không bị sập (crash server 500); ở môi trường dev hiển thị khối viền đỏ báo lỗi riêng của component đó.

## Rủi ro & Giảm thiểu
- *Rủi ro:* Lỗi trong một component EJS làm crash tiến trình Node.js hoặc sập toàn bộ trang web.
- *Giảm thiểu:* Bọc từng lệnh render component trong khối `try...catch` (Error Boundary), ghi log bằng Winston và hiển thị fallback an toàn.

## Ghi chú / Kết quả
*(Chưa bắt đầu - Chờ phê duyệt `APPROVE GĐ 10`)*
