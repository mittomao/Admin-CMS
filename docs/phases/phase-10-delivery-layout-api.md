---
phase: 10
name: Public Site Renderer (100% Server-Side EJS & In-Memory Cache)
status: Hoàn thành
depends_on: [6, 8]
estimate: 2.5 ngày làm việc
started: 2026-11-07
completed: 2026-11-07
updated: 2026-11-07
---

# GĐ 10 - Public Site Renderer (100% Server-Side EJS & In-Memory Cache)
> Bộ phân giải định tuyến công khai (Public Site Router & URL Resolver), kết xuất giao diện Server-Side EJS từ cơ sở dữ liệu `items_web`, helper `<%- placeholder(key) %>`, cơ chế bắt lỗi Error Boundary, bộ nhớ đệm trang và tối ưu hóa SEO cơ bản.
> 
> **[Ghi chú Quan trọng - Thực hiện trước GĐ 7 và GĐ 9 theo DEC-040]:** Website công khai kết xuất 100% SSR bằng EJS, chỉ đọc từ kho dữ liệu đã xuất bản `items_web`. Route Preview admin dùng chung renderer đọc Master và kiểm tra quyền qua `canPerform(user, item, 'item:read')`.
> 
> **[Ghi chú Quan trọng - Điều chỉnh bởi GĐ 5.1]:** Khi kết xuất trang web công khai, các thẻ ảnh `<img>` trong component EJS và nội dung Rich Text nhận Cloudinary CDN URLs trực tiếp (kèm responsive transformation preset `f_auto,q_auto`) từ `items_web` theo [`phase-05-1-cloudinary-media.md`](./phase-05-1-cloudinary-media.md).

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
- [`docs/decisions/DEC-040-execute-phase-10-before-phase-07-and-phase-09.md`](../decisions/DEC-040-execute-phase-10-before-phase-07-and-phase-09.md)

## Mục tiêu
Xây dựng phân hệ hiển thị trang web công khai (Public Site Renderer) trực tiếp từ ứng dụng Express chung trên cổng 4000:
- Định tuyến công khai tách biệt hoàn toàn khỏi `/admin`, không áp dụng session/auth/CSRF admin.
- Phân giải URL đường dẫn sang Content Item trong database `items_web`.
- Lấy cấu hình bố cục qua `webItemService.getFinalPresentation` và kết xuất mã HTML hoàn chỉnh thông qua template layout EJS và helper `<%- placeholder(key) %>`.
- Truyền ngữ cảnh dữ liệu phong phú (`item`, `fields`, `params`, `datasource`, `site`, `lang`) vào view của layout và component.
- Bộ nhớ đệm trang (Page Render In-memory Cache) tối ưu hiệu năng và tự động xóa cache qua Event Bus khi publish.

## Phạm vi
- **Làm:**
  1. **Định tuyến & Hạ tầng:**
     - Route công khai gắn sau `/admin`, `/api`, `/media`, `/health`, static.
     - `GET /` render Home (thay thế redirect admin cũ). Catch-all `GET /*` chuyển tới Site Renderer.
     - Static assets `public/site/` (`/site/...`). CSP riêng cho public website.
  2. **Bộ phân giải URL (Site Resolver):**
     - Ánh xạ URL path sang item trong `items_web` bắt đầu từ Start Item `/sitecore/content/Home` (DEC-034).
     - Hỗ trợ đa ngôn ngữ: `vi` mặc định (không tiền tố), `/en/...` cho tiếng Anh.
     - Chỉ item có template Page / Presentation hợp lệ mới là trang; item khác (component, media...) trả 404.
     - Page chưa publish, đã unpublish, hoặc cha chưa publish: 404.
  3. **Trình kết xuất Site Renderer (Lõi):**
     - Nạp layout `viewPath`, helper `placeholder(key)` render tuần tự các rendering của placeholder đó.
     - Whitelist `src/views/site/`, chặn path traversal và đuôi khác `.ejs`.
     - Error Boundary cho từng rendering: lỗi 1 component không làm sập trang.
     - Helpers trong view: `field()`, `richText()` (qua `resolveRichText`), `imageUrl(media, preset)`, `link(itemId)`, `navItems()`.
  4. **Trang mẫu Sample Website:**
     - Layout `HomeLayout.ejs` và các components `HeroBanner.ejs`, `Introduction.ejs`, `ImageText.ejs`.
     - Lệnh `npm run seed:sample` khởi tạo nội dung mẫu và publish sang Web.
  5. **Bộ nhớ đệm & Invalidate (In-Memory Render Cache):**
     - Cache HTML theo `(itemId, lang, versionPublished)`.
     - Lắng nghe sự kiện từ Event Bus GĐ 8 (`item.published`, `item.unpublished`, `publish.job.finished`) để tự động xóa cache.
     - Hỗ trợ ETag và 304 Not Modified.
  6. **404/500, SEO, Robots & Sitemap:**
     - Views riêng `src/views/site/errors/{404,500}.ejs`.
     - SEO tags tự động từ trường của trang (`PageTitle`/`Title`, `MetaDescription`, `OgImage`).
     - Route `GET /robots.txt` và `GET /sitemap.xml` chỉ liệt kê các page đã publish trên Web.
  7. **Preview cho Admin:**
     - `GET /admin/preview?path=&lang=` dùng chung `siteRenderer` đọc dữ liệu Master.
     - Kiểm tra quyền qua `canPerform(user, item, 'item:read')`.
     - Dải banner cố định trên cùng thông báo "Chế độ Xem trước (Preview)".
     - Nút "Open published site" trên form Content Editor.
- **Không làm:**
  - Không làm Layout Service JSON REST API cho React/Next.js.
  - Không làm Headless client, GraphQL, SPA.
  - Không làm personalization hay A/B testing (GĐ 11).

## Checklist Task
- [x] **Task 10.1:** Hạ tầng Định tuyến, CSP & Static Assets:
  - Cấu hình CSP riêng cho public site trong `src/app.js` cho phép ảnh Cloudinary.
  - Tạo `src/routes/site/siteRoutes.js` đón nhận request công khai (GET/HEAD), gắn sau các route admin.
  - Chuyển `GET /` từ redirect admin sang gọi Site Renderer.
- [x] **Task 10.2:** Bộ Phân giải URL (`src/services/siteResolver.js`):
  - Chuẩn hóa URL, tách language prefix (`vi` mặc định, `/en/...`).
  - Ánh xạ đường dẫn sang item trong `items_web` từ Start Item `/sitecore/content/Home`.
  - Kiểm tra ràng buộc hợp lệ: chỉ Page item có presentation hợp lệ mới render; chưa publish/cha chưa publish trả 404.
- [x] **Task 10.3:** Trình Kết xuất Lõi (`src/services/siteRenderer.js`):
  - Phân giải bố cục qua `webItemService.getFinalPresentation` và các trường qua `webItemService.resolveFields`.
  - Khởi tạo helper `<%- placeholder(key) %>` tuần tự render các component theo sortOrder.
  - Error Boundary: bọc try/catch từng rendering, hiển thị cảnh báo ở dev, ẩn ở production.
  - Các helpers phong phú: `field()`, `richText()` (resolve links & media), `imageUrl(media, preset)`, `link(itemId)`, `navItems()`.
  - Whitelist an toàn `viewPath` nghiêm ngặt (`src/views/site/`).
- [x] **Task 10.4:** Bộ Nhớ Đệm & Invalidate (`src/utils/renderCache.js`):
  - In-memory cache HTML theo key `site:{itemId}:{lang}:{versionPublished}`.
  - Đăng ký lắng nghe Event Bus GĐ 8 (`item.published`, `item.unpublished`, `publish.job.finished`) để tự động xóa cache.
  - Sinh ETag và trả về 304 Not Modified khi có header `If-None-Match`.
- [x] **Task 10.5:** Trang Mẫu Sample Website & Seed Script:
  - Hoàn thiện `src/views/site/layouts/HomeLayout.ejs` và các component `HeroBanner.ejs`, `Introduction.ejs`, `ImageText.ejs`.
  - Partials: `head.ejs`, `header.ejs`, `footer.ejs`.
  - Script `src/scripts/seed-sample-site.js` (npm run `seed:sample`): tạo page `Home` và `About us`, gắn presentation và publish sang Web.
- [x] **Task 10.6:** Trang Lỗi, SEO, Robots.txt & Sitemap.xml:
  - Trang lỗi riêng `src/views/site/errors/404.ejs` và `500.ejs`.
  - SEO tags tự động từ trường của trang (`PageTitle`/`Title`, `MetaDescription`, `OgImage`).
  - Route `GET /robots.txt` và `GET /sitemap.xml` chỉ liệt kê các page đã publish trên Web.
- [x] **Task 10.7:** Chế độ Xem trước (Preview) cho Admin:
  - Route `GET /admin/preview?path=&lang=` dùng chung `siteRenderer` đọc dữ liệu Master.
  - Kiểm tra quyền qua `canPerform(user, item, 'item:read')`.
  - Dải banner cố định trên cùng thông báo "Chế độ Xem trước (Preview)".
  - Nút "Open published site" trên form Content Editor.
- [x] **Task 10.8:** Cấu hình, Hướng dẫn & Kiểm thử Hồi quy Toàn diện:
  - Cập nhật biến môi trường trong `src/config/env.js` và `.env.example`.
  - Tài liệu hướng dẫn `docs/guides/add-page-and-component.md`.
  - Viết Unit & Integration tests (`tests/siteRenderer.test.js`, `tests/siteResolver.test.js`).
  - Chạy full test suite hồi quy (GĐ 0-8 & GĐ 10) và ESLint.
