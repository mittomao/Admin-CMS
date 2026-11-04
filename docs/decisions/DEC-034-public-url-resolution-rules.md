# DEC-034: QUY TẮC PHÂN GIẢI URL CÔNG KHAI (PUBLIC URL RESOLUTION RULES)

## Trạng thái
- **Trạng thái:** Đã phê duyệt (Accepted)
- **Ngày quyết định:** 2026-11-04
- **Người đề xuất:** Tech Lead / Solution Architect
- **Người duyệt:** Project Owner / Architecture Committee
- **Phạm vi áp dụng:** Giai đoạn 6, Giai đoạn 10, Giai đoạn 12

---

## 1. Ngữ cảnh & Đặt vấn đề
Khi chuyển đổi từ Headless CMS (Next.js/React gọi REST API JSON) sang kiến trúc Monolithic Server-Side EJS rendering chạy chung ứng dụng Express trên cổng 4000:
- Người dùng truy cập trực tiếp website công khai qua các URL như `http://localhost:4000/`, `http://localhost:4000/about-us`, `http://localhost:4000/about-us/team`.
- Cần có cơ chế định tuyến (router) và phân giải URL (URL resolver) để chuyển đổi từ HTTP request path sang đúng **Content Item** trong database **Web** (`items_web`), từ đó xác định layout và component cần render.

---

## 2. Quyết định kỹ thuật

### 2.1. Nguồn dữ liệu
- Public Site Renderer **chỉ đọc** dữ liệu từ database **Web** (`items_web`).
- Các item chưa publish hoặc đang ở trạng thái draft/workflow chưa được duyệt sẽ không tồn tại hoặc không ở trạng thái khả dụng trong `items_web`, hệ thống sẽ trả về mã lỗi HTTP `404 Not Found`.

### 2.2. Điểm bắt đầu (Start Item) và Trang chủ (`/`)
- Mặc định, cây nội dung được tổ chức tại `/sitecore/content`.
- Node **`Home`** (`/sitecore/content/Home`) được quy định là **Start Item** của trang web mặc định.
- Khi người dùng gửi request tới root `/` (hoặc `/vi`), URL resolver tự động phân giải thành item `Home`.

### 2.3. Quy tắc ánh xạ URL Segment sang Item Path
1. **Dùng Item Name làm URL Segment:**
   - Mỗi segment trên URL path tương ứng với một cấp con phân cấp trong cây nội dung bắt đầu từ `Home`.
   - Ví dụ:
     - `/` $\rightarrow$ `/sitecore/content/Home`
     - `/about-us` $\rightarrow$ Item con của `Home` có name khớp với `about-us` (hoặc item tại `/sitecore/content/Home/About-Us` / `/sitecore/content/About-Us` tùy cấu hình site root).
     - `/about-us/team` $\rightarrow$ Item con `Team` nằm dưới item `About-Us`.
2. **Không phân biệt hoa thường (Case-insensitive) & Chuẩn hóa:**
   - URL segment được chuẩn hóa: `lowercase`, loại bỏ dấu tiếng Việt (kebab-case) nếu cần so khớp slug hoặc so khớp trực tiếp item name không phân biệt hoa thường (`{ $regex: new RegExp('^' + segment + '$', 'i') }`).
   - Khuyến nghị đặt tên Item Name cho Page theo quy chuẩn kebab-case hoặc PascalCase được tự động slugify tương ứng (`about-us` hoặc `About Us`).
3. **Cấu trúc Đa ngôn ngữ (Localization Prefix):**
   - Ngôn ngữ mặc định: `vi` (không bắt buộc tiền tố, ví dụ `/about-us` ngầm định là `vi`).
   - Ngôn ngữ khác (ví dụ tiếng Anh `en`): URL có tiền tố `/en/about-us`. Resolver trích xuất mã ngôn ngữ `en`, loại bỏ tiền tố khỏi path và phân giải segment còn lại theo cây item, sau đó truy vấn version tương ứng với `en`.

---

## 3. Quy trình phân giải URL (Resolution Pipeline)
```
[HTTP Request: GET /about-us/team]
       │
       ▼
1. Tách Language Prefix (nếu có: /en/..., /ja/...) -> default 'vi'
       │
       ▼
2. Tách segments: ['about-us', 'team']
       │
       ▼
3. Khởi tạo parent = Start Item ('/sitecore/content/Home')
       │
       ▼
4. Lặp qua từng segment:
   - Tìm item con trực tiếp trong items_web có parent_id = parent._id
     và name khớp segment (case-insensitive regex)
   - Nếu không tìm thấy -> Return 404 (Render views/site/404.ejs)
   - Nếu tìm thấy -> parent = foundItem
       │
       ▼
5. Kết quả: Resolved Page Item (database Web)
       │
       ▼
6. Gọi presentationService.getFinalPresentation(item, lang, version)
```

---

## 4. Ưu và nhược điểm
### Ưu điểm
- Rõ ràng, tự nhiên, bám sát mô hình phân cấp Sitecore Content Tree.
- Không cần quản lý bảng ánh xạ routing riêng phức tạp, không sợ lệch slug khi di chuyển cây thư mục.
- Tự động hỗ trợ URL lồng nhau không giới hạn cấp độ (`/parent/child/grandchild`).

### Nhược điểm / Rủi ro
- Thay đổi tên Item Name sẽ làm thay đổi URL của trang (ảnh hưởng SEO nếu không có 301 redirect).
- *Biện pháp giảm thiểu:* Sẽ bổ sung cơ chế Aliases / 301 Redirects ở các giai đoạn sau nếu cần thiết.

---

## 5. Tài liệu liên quan
- `docs/rules/04-routing.md`
- `docs/decisions/DEC-031-server-side-ejs-renderer-architecture.md`
- `docs/phases/phase-10-delivery-layout-api.md`

