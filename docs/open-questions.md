# CÂU HỎI KỸ THUẬT GIAI ĐOẠN L1 (LANGUAGE MANAGER - QUẢN LÝ NGÔN NGỮ ĐỘNG)

Tài liệu này lưu trữ danh sách 8 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho **Giai đoạn L1: Quản lý Ngôn ngữ Động (Language Manager) Thay thế Hard-code**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Language là Item dưới `/root/system/Languages` hay collection `settings`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Language là Item phân cấp dưới `/root/system/Languages`**, sử dụng System Templates `Language` và `Languages Folder`. Được xuất bản (publish) sang Web database như các item hệ thống khác.
- **Lựa chọn B:** Lưu dưới dạng cấu hình mảng trong collection `settings` (tương tự `basicAuth`).
- **Lý do đề xuất:** Tuân thủ triệt để triết lý *"Mọi thứ là Item"*, tận dụng toàn bộ hạ tầng sẵn có của Treecraft: ACL, phả hệ cây, xuất bản Master/Web, audit log, và cho phép biên tập viên mở xem trong Content Editor.

---

### 2. Mã ngôn ngữ `code` theo chuẩn BCP 47 (`vi`, `en`, `fr-FR`) và có tính chất bất biến?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Mã `code` phải tuân theo định dạng BCP 47 rút gọn (regex `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)?$`, chuẩn hoá chữ hoa/thường như `fr-FR`) và **bất biến tuyệt đối sau khi tạo**.
- **Lựa chọn B:** Cho phép đổi `code` và chạy background job quét toàn bộ database để cập nhật lại tất cả `item.languages[].code`.
- **Lý do đề xuất:** `code` là khóa định danh dùng trong cấu trúc dữ liệu `Item.languages`, `unversionedFields`, `presentation.final` và URL. Việc cho phép sửa mã sẽ tiềm ẩn rủi ro phá vỡ tính toàn vẹn dữ liệu cực lớn. Nếu muốn đổi mã, người dùng tạo ngôn ngữ mới và nhập lại nội dung.

---

### 3. Ngôn ngữ mặc định hệ thống (Site Default Language) lưu ở đâu?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Lưu tại cấu hình site trong collection `settings`** (key `siteConfig.defaultLanguage`), bắt buộc phải trỏ tới một Language item đang có trạng thái `enabled = true`.
- **Lựa chọn B:** Lưu cờ `isDefault: true` trực tiếp trên Language Item.
- **Lý do đề xuất:** Ngôn ngữ mặc định là thuộc tính cấp toàn site, không phải thuộc tính nội tại của từng item ngôn ngữ riêng lẻ. Lưu tại `settings` tránh rủi ro nhiều item cùng nhận `isDefault: true` do lỗi bất đồng bộ.

---

### 4. Khi ngôn ngữ bị tắt (`enabled = false`), biên tập viên trong Admin có được xem nội dung cũ không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có, nhưng ở chế độ chỉ đọc (Read-only)**. Ẩn khỏi dropdown tạo phiên bản mới và ẩn hoàn toàn khỏi website công khai (URL trả về 404), nhưng bảo toàn 100% dữ liệu để biên tập viên vẫn có thể tra cứu khi cần.
- **Lựa chọn B:** Ẩn hoàn toàn cả trong Admin khiến biên tập viên không xem được nội dung cũ.
- **Lý do đề xuất:** Tránh mất mát dữ liệu và phục vụ nhu cầu tham chiếu lịch sử nội dung trước khi quyết định bật lại.

---

### 5. Có cho phép xóa vĩnh viễn ngôn ngữ khi còn dữ liệu liên kết không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Không cho xóa.** Chỉ cho phép xóa khi `getUsage(code) === 0` và không phải ngôn ngữ mặc định. Nếu còn dữ liệu, hệ thống chặn lại, hiển thị số liệu chi tiết và gợi ý chuyển sang vô hiệu hóa (`enabled = false`).
- **Lựa chọn B:** Cho phép xóa kèm tùy chọn xóa thác đổ (cascade delete) toàn bộ các version của ngôn ngữ đó.
- **Lý do đề xuất:** Tuân thủ nguyên tắc Safe Deletion tương tự DEC-018 và DEC-044, chống mất mát dữ liệu nghiêm trọng ngoài ý muốn của người dùng.

---

### 6. Có cần thuộc tính `fallbackLanguage` cấu hình cho từng ngôn ngữ ngay từ bản đầu không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có, nhưng là tùy chọn (optional).** Mỗi ngôn ngữ có thể chỉ định `fallbackLanguage` (ví dụ `ja` fallback sang `en`, `en` fallback sang `vi`). Hệ thống có thuật toán phát hiện chu trình (cycle detection) và giới hạn tối đa 5 bước fallback.
- **Lựa chọn B:** Luôn luôn fallback cứng về ngôn ngữ mặc định của site.
- **Lý do đề xuất:** Linh hoạt cho các tổ chức đa quốc gia khi các chi nhánh khu vực muốn fallback theo ngôn ngữ bản địa lân cận trước khi về ngôn ngữ chính.

---

### 7. Tiền tố URL (`urlPrefix`) trên Website công khai có cho phép tùy biến khác mã `code` không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có, nhưng mặc định bằng `code`.** Cho phép quản trị viên tùy biến trường `urlPrefix` (ví dụ code `en-US` có thể đặt `urlPrefix: 'us'` hoặc `en`). Ngôn ngữ mặc định của site không áp dụng tiền tố URL.
- **Lựa chọn B:** Bắt buộc `urlPrefix` luôn bằng `code`.
- **Lý do đề xuất:** Tối ưu hóa SEO và trải nghiệm URL người dùng cuối cho các thị trường địa phương.

---

### 8. Role nào được phép quản trị ngôn ngữ (thêm, sửa, đổi mặc định, xóa)?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-048: Kiến Trúc Quản Lý Ngôn Ngữ Động](decisions/DEC-048-dynamic-language-manager-item-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chỉ Administrator** (hoặc user có quyền `language:manage` được cấp thông qua ACL/Role). Các user khác chỉ có quyền `language:read` để hiển thị danh sách trên các dropdown.
- **Lựa chọn B:** Cả Administrator và Content Editor / Publisher đều được cấu hình ngôn ngữ.
- **Lý do đề xuất:** Cấu hình ngôn ngữ là thiết lập hệ thống quan trọng ảnh hưởng trực tiếp tới cấu trúc URL công khai, sitemap và toàn bộ cơ sở dữ liệu. Cần giới hạn nghiêm ngặt ở quyền quản trị cấp cao.

---

# CÂU HỎI KỸ THUẬT GIAI ĐOẠN B1 (BASIC AUTHENTICATION)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật cần xác nhận cho **Giai đoạn B1: Basic Auth (Bảo vệ Site Công Khai)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Cấu hình `trust proxy` trong Express để nhận diện chính xác `ipAllowlist`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-046: Basic Auth](decisions/DEC-046-basic-auth-public-site-protection.md), `src/app.js`
- **Lựa chọn A (Đề xuất mặc định):** Thêm biến môi trường `TRUST_PROXY` (mặc định `false`, khi chạy sau reverse proxy như Nginx/Cloudflare thì đặt `true` hoặc số hop). Khi `TRUST_PROXY=true`, cấu hình `app.set('trust proxy', 1)`. Middleware sẽ đọc `req.ip` chuẩn xác từ proxy đã tin cậy. Nếu không bật, chỉ dùng `req.socket.remoteAddress` để chống giả mạo header `X-Forwarded-For`.
- **Lựa chọn B:** Luôn đọc `X-Forwarded-For` không điều kiện.
- **Lý do đề xuất:** Ngăn chặn kẻ xấu giả mạo header `X-Forwarded-For` để vượt qua `ipAllowlist` khi server chạy độc lập trực tiếp.

---

### 2. Cơ chế Chống Dò Mật Khẩu (Brute-Force Rate Limiting): Dùng bộ đếm In-Memory nội bộ hay cài thêm thư viện?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-046: Basic Auth](decisions/DEC-046-basic-auth-public-site-protection.md), `basicAuthMiddleware.js`
- **Lựa chọn A (Đề xuất mặc định):** **Sử dụng cấu trúc bộ nhớ In-Memory `Map` nội bộ với cơ chế Sliding Window / Token Bucket** (ví dụ: tối đa 5 lần thử sai trong 15 phút theo cặp `(ip, username)`, khoá tạm 15 phút trả về 429 Too Many Requests kèm header `Retry-After`). Tự động giải phóng bộ nhớ bằng timer định kỳ. Không cài thêm thư viện bên ngoài.
- **Lựa chọn B:** Cài đặt package `express-rate-limit`.
- **Lý do đề xuất:** Tuân thủ triệt để Quy tắc Vàng: Không cài thêm package ngoài khi công nghệ hiện có hoặc code native giải quyết được gọn gàng, hiệu năng cao và độc lập.

---

### 3. Phản hồi `robots.txt` khi Basic Auth kích hoạt?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-046: Basic Auth](decisions/DEC-046-basic-auth-public-site-protection.md), `siteController.js`
- **Lựa chọn A (Đề xuất mặc định):** Khi Basic Auth đang kích hoạt (`enabled = true`), endpoint `/robots.txt` tự động kết xuất `User-agent: *\nDisallow: /` để ngăn chặn hoàn toàn các bot tìm kiếm (Googlebot, Bingbot...) thu thập các trang 401 hoặc làm tràn log xác thực.
- **Lựa chọn B:** Giữ nguyên nội dung `robots.txt` thông thường.
- **Lý do đề xuất:** Đúng chuẩn SEO và bảo mật cho các môi trường thử nghiệm (UAT/Staging).

---

# CÂU HỎI KỸ THUẬT GIAI ĐOẠN 6.2 (OPEN QUESTIONS)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu thay đổi: **Rendering gắn Component Template & Page Template không kế thừa Component Template (GĐ 6.2)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Dùng cơ chế suy ra (computed) động, không tự ghi base template vào page template?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036: Rendering gắn Component Template & Cơ chế Suy ra Trường Hiệu lực](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Dùng cơ chế suy ra (computed).** Hàm `resolveEffectiveTemplate(item, lang, version)` tự động hợp nhất template của item cùng các `componentTemplate` của các rendering trong presentation thực tế. Tuyệt đối không tự động ghi hay ép buộc gắn component templates vào mảng `baseTemplates` của page template.
- **Lựa chọn B:** Khi thêm rendering vào Standard Presentation, tự động ghi âm thầm ID của component template vào mảng `baseTemplates` của page template.
- **Lý do đề xuất:** Đảm bảo tính linh hoạt tối đa; khi gỡ rendering khỏi presentation, form tự động ẩn trường mà không phải can thiệp sửa đổi schema base template; tách bạch rõ ràng giữa kế thừa cấu trúc trang và component presentation.

---

### 2. Cùng một component lặp nhiều lần trong một page thì dùng chung một bộ field?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-035](decisions/DEC-035-component-field-inheritance-and-context.md), [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Nếu một page item có 2 hay nhiều rendering cùng loại (ví dụ 2 khối `HeroBanner`), cả 2 sẽ dùng chung một bộ giá trị field đọc từ chính page item. Nếu tác giả cần nội dung độc lập cho từng khối, tác giả sẽ sử dụng trường tùy chọn `datasourceId` trỏ tới item nội dung riêng.
- **Lựa chọn B:** Tự động tạo bản sao trường với hậu tố số thứ tự (ví dụ `HeroTitle_1`, `HeroTitle_2`).
- **Lý do đề xuất:** Tránh làm ô nhiễm và biến dạng schema template; đúng chuẩn thiết kế CMS phân cấp truyền thống (Datasource Item cho các component độc lập tái sử dụng).

---

### 3. Page item có presentation override (shared/final) thêm rendering mới thì field của component đó xuất hiện cho item đó?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Vì `resolveEffectiveTemplate` nhận trực tiếp ngữ cảnh `(item, lang, version)`, nó phân giải qua `getFinalPresentation`. Khi một item có Final Presentation override thêm một rendering mới (ví dụ thêm `ImageText`), form soạn thảo của chính phiên bản đó sẽ ngay lập tức xuất hiện thêm section và các trường của component đó.
- **Lựa chọn B:** Chỉ cho phép các trường từ Standard Presentation của Page Template, bỏ qua rendering được thêm ở item level.
- **Lý do đề xuất:** Đảm bảo tính nhất quán giữa những gì tác giả cấu hình trên Presentation Details của trang và những trường tác giả có thể nhập liệu trong Content Editor.

---

### 4. Field của component hiển thị thành section riêng theo tên component?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Mỗi component template được gom thành một Section riêng mang tên của Component/Rendering (ví dụ `HeroBanner`, `Introduction`), kèm badge nguồn rõ ràng (`từ rendering HeroBanner`).
- **Lựa chọn B:** Hòa trộn tất cả các trường của component vào chung một Section "Content" mặc định của trang.
- **Lý do đề xuất:** Tránh nhầm lẫn thị giác cho người dùng khi nhiều component có trường cùng tên (như `Title`, `Description`, `Image`), giúp cấu trúc form gọn gàng, trực quan và dễ quản lý.

---

### 5. Chặn hay chỉ cảnh báo khi chọn template `Feature/Components` làm base template của page template?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chỉ cảnh báo.** Trong Template Manager (tab Base Templates), khi người dùng tick chọn một template nằm dưới `/root/templates/Feature/Components`, hiển thị thông báo/cảnh báo màu vàng: *"Template này là Component Template, trường sẽ được tự động suy ra khi gắn vào Presentation. Không khuyến khích kế thừa trực tiếp làm Base Template"*. Không chặn cứng (hard block) để duy trì tính linh hoạt nếu có nhu cầu kiến trúc đặc thù.
- **Lựa chọn B:** Chặn cứng (báo lỗi và không cho lưu).
- **Lý do đề xuất:** Tránh gây gián đoạn khó chịu cho người dùng quản trị cấp cao (Admin/Developer), vừa giáo dục hướng dẫn đúng chuẩn vừa không cản trở thao tác tự do.

---

### 6. Dữ liệu hiện tại reset được hay cần migration giữ nguyên?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-036](decisions/DEC-036-rendering-component-template-and-effective-field-resolution.md), `src/scripts/migrate-rendering-component-templates.js`
- **Lựa chọn A (Đề xuất mặc định):** **Viết script Migration giữ nguyên dữ liệu** (hỗ trợ `--dry-run`, có rollback, nhắc backup DB trước khi chạy). Cụ thể:
  1. Tự động điền `componentTemplate` cho từng Rendering theo quy ước tên khớp trong `Feature/Components` (`HeroBanner`, `Introduction`, `ImageText`).
  2. Báo cáo danh sách rendering không khớp được để người dùng tự xử lý.
  3. Gỡ các base template thuộc `Feature/Components` ra khỏi các Page Template (`Home`, `About us`).
  4. Bảo toàn nguyên vẹn 100% dữ liệu field đã nhập của các item (nhờ lưu theo `fieldId`).
---

# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN 5.1 (TÁI ĐỊNH NGHĨA MEDIA LIBRARY)

Tài liệu này lưu trữ danh sách 8 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu thay đổi: **Tái định nghĩa Media Library (Cloudinary Storage độc quyền & Mọi Media là Item)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Cho phép sử dụng chính thức package `cloudinary`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Tái Định Nghĩa Media Library](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Sử dụng SDK chính thức `cloudinary@^2.5.1` (hiện đã có trong dependencies dự án), không cài thêm wrapper ngoài.
- **Lựa chọn B:** Không sử dụng SDK, tự viết HTTP client gọi REST API của Cloudinary.
- **Lý do đề xuất:** SDK chính thức hỗ trợ sẵn stream upload, ký chữ ký HMAC-SHA256, phân trang Admin API và tự động sinh transformation URL an toàn.

---

### 2. Tài khoản Cloudinary đang dùng fixed folder mode hay dynamic folder mode?
- **Trạng thái:** Đã kiểm tra thực tế trên tài khoản `v41qu0lg` (Chờ ghi nhận)
- **Quyết định liên quan:** [DEC-038: Mục 2.2](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Kết quả kiểm tra thực tế:** Tài khoản Cloudinary của dự án đang kích hoạt **Dynamic Folder Mode** (API trả về cả trường `asset_folder` và `display_name`).
- **Đề xuất kỹ thuật:** `CloudinaryStorageProvider` gửi tham số `folder: 'AdminCMS/<subpath>'` và `public_id: '<cleanBaseName>'`, hỗ trợ đồng thời cả Dynamic Folders và Fixed Folders để tương thích tối đa.

---

### 3. Hai file khác đuôi cùng tên (`image1.jpg`, `image1.png`) trong một thư mục: Chặn hay tự thêm hậu tố?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.1](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chặn và báo lỗi rõ ràng (HTTP 409 Conflict).** Vì Item name trên CMS không chứa đuôi mở rộng, cả 2 file sẽ cùng tạo ra Item có tên `image1` trong cùng một thư mục cha, gây vi phạm ràng buộc duy nhất `path`. Hệ thống thông báo lỗi: *"Item 'image1' đã tồn tại trong thư mục này. Vui lòng đổi tên tệp trước khi tải lên."*
- **Lựa chọn B:** Tự động thêm hậu tố thời gian hoặc số thứ tự (ví dụ `image1-1`).
- **Lý do đề xuất:** Tránh việc tự ý biến dạng tên item gây khó kiểm soát tài nguyên cho tác giả nội dung; đúng chuẩn bảo đảm tính toàn vẹn đường dẫn của CMS.

---

### 4. Xóa item: Chỉ soft-delete ở CMS, giữ file trên Cloudinary đến GĐ 9?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.3](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Khi xóa media trên Content Editor, chỉ đánh dấu `isDeleted: true` trên Item CMS (đưa vào Recycle Bin), giữ nguyên file trên Cloudinary để có thể khôi phục (Restore). Chỉ khi nào dọn sạch vĩnh viễn thùng rác (Purge Recycle Bin ở GĐ 9), hệ thống mới gọi lệnh `cloudinary.uploader.destroy`.
- **Lựa chọn B:** Xóa tức thì file vật lý trên Cloudinary ngay khi xóa Item trên CMS.
- **Lý do đề xuất:** Tránh rủi ro xóa nhầm làm mất vĩnh viễn tệp gốc của khách hàng mà không thể hoàn tác; phù hợp hoàn hảo với kiến trúc Recycle Bin của Treecraft.

---

### 5. Dữ liệu media hiện có: Migration lên Cloudinary hay reset?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** `scripts/migrate-legacy-media-to-items.js`, [DEC-038](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cung cấp script Migration giữ nguyên dữ liệu** (`scripts/migrate-legacy-media-to-items.js` có `--dry-run`, giữ nguyên `_id` cũ). Nếu toàn bộ dữ liệu hiện có chỉ là ảnh thử nghiệm dev, cho phép chạy lệnh reset database và seed lại chuẩn.
- **Lựa chọn B:** Bắt buộc reset toàn bộ CSDL và seed lại từ đầu.
- **Lý do đề xuất:** Tạo sẵn script migration phục vụ việc nâng cấp dữ liệu thực tế mà không làm đứt gãy các tham chiếu Image field và Rich Text đã nhập.

---

### 6. Route `/media/file/:id` cũ: Redirect sang Cloudinary hay bỏ?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.5](decisions/DEC-038-cloudinary-media-item-unification.md)
- **Lựa chọn A (Đề xuất mặc định):** **Redirect HTTP 302** trực tiếp sang Cloudinary CDN URL (`secure_url`), kèm header `Cache-Control: public, max-age=31536000, immutable`.
- **Lựa chọn B:** Xóa bỏ hoàn toàn route `/media/file/:id`.
- **Lý do đề xuất:** Đảm bảo toàn bộ liên kết ảnh cũ trong các bài viết Rich Text hoặc bookmark của người dùng không bị gãy (404), đồng thời chuyển gánh nặng truyền tải sang CDN toàn cầu của Cloudinary.

---

### 7. Gỡ bỏ thư viện `sharp` sau khi chuyển sang Cloudinary Transformation?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038: Mục 2.5](decisions/DEC-038-cloudinary-media-item-unification.md), `docs/rules/02-tech-stack.md`
- **Lựa chọn A (Đề xuất mặc định):** **Gỡ bỏ `sharp` khỏi `package.json`** khi bước vào triển khai GĐ 5.1.
- **Lựa chọn B:** Giữ lại `sharp` làm dự phòng nếu offline.
- **Lý do đề xuất:** Cloudinary đảm nhiệm 100% việc resize, nén WebP, crop tự động qua transformation URL; gỡ `sharp` giúp giảm đáng kể kích thước `node_modules` và tránh các vấn đề biên dịch native C++ binary trên các môi trường CI/CD hoặc container.

---

---

# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN 8.1 (DATABASE SWITCHER)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu: **Bộ chuyển Database Master / Web trong Content Editor (GĐ 8.1)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Tham số `db` trên URL, không lưu session?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md)
- **Lựa chọn A (Đề xuất mặc định):** **Lưu trên URL query parameter (`?db=master|web`), không chỉ lưu session.** Điều này giúp người dùng có thể mở đồng thời 2 tab trình duyệt (1 tab xem Master, 1 tab xem Web) mà không bị lẫn lộn dữ liệu giữa các tab.
- **Lựa chọn B:** Lưu biến `currentDb` trong Session của Express.
- **Lý do đề xuất:** Ngăn chặn xung đột session giữa các tab; cho phép chia sẻ URL chính xác trạng thái database cho thành viên khác trong nhóm.

---

### 2. Role nào được xem Web DB?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md), `src/config/permissions.js`
- **Lựa chọn A (Đề xuất mặc định):** **Chỉ cấp cho `Administrator` và `Approver`.** `Editor` và `Author` mặc định chỉ làm việc trên Master trừ khi được cấp quyền riêng ở GĐ 7.
- **Lựa chọn B:** Cho phép tất cả người dùng có quyền đăng nhập admin (`Author`, `Editor`, `Approver`, `Administrator`) đều được xem Web DB.
- **Lý do đề xuất:** Approver và Admin là những người trực tiếp chịu trách nhiệm nghiệm thu và xuất bản; hạn chế tác giả sơ cấp bị bối rối giữa môi trường soạn thảo và môi trường công khai.

---

### 3. Badge trạng thái publish trong cây Fancytree bật mặc định hay tắt?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md), Ribbon Tab VIEW
- **Lựa chọn A (Đề xuất mặc định):** **Mặc định tắt.** Người dùng có thể chủ động bật/tắt hiển thị badge trong Ribbon tab `VIEW` (nhóm `Tree Options`). Trên Form soạn thảo thì badge luôn hiển thị.
- **Lựa chọn B:** Luôn luôn bật hiển thị trên cây Fancytree.
- **Lý do đề xuất:** Giúp tải cây nhanh nhất khi số lượng node lớn; chỉ tính toán so sánh khi người dùng thực sự có nhu cầu kiểm tra trạng thái cây.

---

### 4. Có cần xuất CSV danh sách đối soát diff?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md), `/admin/databases`
- **Lựa chọn A (Đề xuất mặc định):** **Chưa cần ở bản đầu.** Tập trung hoàn thiện giao diện phân trang, lọc theo nhánh, tìm kiếm và liên kết mở trực tiếp item. Tính năng xuất CSV sẽ bổ sung ở GĐ 11 nếu có nhu cầu báo cáo nghiệp vụ.
- **Lựa chọn B:** Bắt buộc xây dựng tính năng xuất file CSV ngay trong GĐ 8.1.
- **Lý do đề xuất:** Tối ưu hóa thời gian triển khai, tập trung vào trải nghiệm xem và đối soát trực quan trên web trước.

---

### 5. Có cho "Open in Master" từ item mồ côi (Orphan) ở web?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md)
- **Lựa chọn A (Đề xuất mặc định):** **Hiển thị cảnh báo "Item này không còn tồn tại trên Master", không cung cấp nút Open in Master.** Kèm theo hướng dẫn dọn dẹp Web Store bằng Publish Manager hoặc Unpublish.
- **Lựa chọn B:** Vẫn giữ nút và khi click thì mở trang 404 ở Master.
- **Lý do đề xuất:** Tránh gây hiểu nhầm hoặc dẫn người dùng đến trang lỗi không tìm thấy item trên Master.

---

### 6. Trang `/admin/databases` đặt riêng hay trong Publish Manager?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-041](decisions/DEC-041-content-editor-database-switcher-master-web.md), Launchpad
- **Lựa chọn A (Đề xuất mặc định):** **Đặt làm ứng dụng độc lập tại `/admin/databases`, có Tile riêng trên Launchpad** và có liên kết truy cập nhanh từ ứng dụng Publish Manager.
- **Lựa chọn B:** Tích hợp thành một tab con bên trong trang `/admin/publish-manager`.
- **Lý do đề xuất:** Giữ đúng triết lý của Treecraft Desktop: Các công cụ quản trị hệ thống (Databases, Publish Manager, Content Editor, Workbox) là các ứng dụng độc lập trên Launchpad để tiện mở theo từng ngữ cảnh tác vụ.

---

# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN R1 (REBRAND & ROOT RENAME)

Tài liệu này lưu trữ danh sách 10 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho kế hoạch: **Đổi tên dự án sang "Treecraft" và đổi Root `/root` &rarr; `/root` (GĐ R1)**, kèm đề xuất mặc định của Tech Lead.

---

### 1. Domain người dùng đổi `treecraft\admin` &rarr; `treecraft\admin` hay giữ `sitecore`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), `Domain` model, `User` model
- **Lựa chọn A (Đề xuất mặc định):** **Đổi sang `treecraft\admin`** (domain mặc định là `treecraft`). Cung cấp migration đổi domain của các user hiện có từ `sitecore` sang `treecraft`, đồng thời cập nhật bản ghi domain mặc định trong collection `domains`.
- **Lựa chọn B:** Giữ nguyên domain `treecraft\admin` hoặc đổi sang định danh trung tính `cms\admin`.
- **Lý do đề xuất:** Nhất quán 100% với thương hiệu mới `Treecraft`; loại bỏ triệt để mọi dấu vết của từ khóa `sitecore` trên giao diện đăng nhập và Quick Info.

---

### 2. Giữ thư mục Cloudinary `/AdminCMS`, chỉ đổi mapper?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038](decisions/DEC-038-cloudinary-media-item-unification.md), [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), `src/utils/mediaPathMapper.js`
- **Lựa chọn A (Đề xuất mặc định):** **Giữ nguyên thư mục gốc Cloudinary `AdminCMS`**, không đổi tên folder trên Cloudinary. Chỉ cập nhật hằng số trong mapper `ROOT_MEDIA_PATH = '/root/media library'` (đọc từ `branding.PATHS.MEDIA`).
- **Lựa chọn B:** Đổi tên thư mục trên Cloudinary thành `TreecraftCMS` hoặc `Treecraft`.
- **Lý do đề xuất:** Đổi tên thư mục trên Cloudinary đòi hỏi gọi API Cloudinary Rename hàng loạt asset, tiềm ẩn rủi ro rate-limit, lỗi mạng làm mất liên kết ảnh đã gắn trong các bài viết và rich text. Giữ nguyên Cloudinary folder là giải pháp an toàn tuyệt đối, zero-downtime cho media assets.

---

### 3. Có đổi tên database thật (Mongo) hay chỉ đổi biến env / tên hiển thị?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), `src/config/env.js`, `.env.example`
- **Lựa chọn A (Đề xuất mặc định):** **Không đổi tên cơ sở dữ liệu vật lý đang chạy trên MongoDB Atlas.** Chỉ cập nhật chuỗi kết nối mẫu trong `.env.example` (`treecraft_master`) và biến env `APP_NAME="Treecraft CMS"`.
- **Lựa chọn B:** Yêu cầu người dùng dump & restore database MongoDB sang tên mới (ví dụ `treecraft_cms_master`).
- **Lý do đề xuất:** Tránh rủi ro gián đoạn dịch vụ và không bắt buộc người dùng phải can thiệp cấu hình MongoDB cluster phức tạp trong giai đoạn này.

---

### 4. Đổi tên cookie / session (làm mất phiên hiện tại)?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), `src/config/session.js`
- **Lựa chọn A (Đề xuất mặc định):** **Đổi tên cookie session thành `treecraft_session_id`** (thay cho `cms_session_id`). Chấp nhận người dùng quản trị hiện tại phải đăng nhập lại một lần sau khi deploy R1.
- **Lựa chọn B:** Giữ nguyên tên cookie `cms_session_id`.
- **Lý do đề xuất:** Đảm bảo tính nhận diện thương hiệu đồng bộ và phân biệt rõ cookie của Treecraft với các hệ thống CMS khác trên cùng domain máy chủ.

---

### 5. Thuật ngữ vay mượn (`Launchpad`, `Workbox`, `Standard Values`, `Experience Editor`...): Giữ hay đổi?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md)
- **Lựa chọn A (Đề xuất mặc định):** **Giữ nguyên toàn bộ thuật ngữ nghiệp vụ này trong giai đoạn R1.**
- **Lựa chọn B:** Đổi đồng loạt (ví dụ: `Launchpad` &rarr; `Dashboard`, `Workbox` &rarr; `ApprovalQueue`, `Standard Values` &rarr; `DefaultValues`).
- **Lý do đề xuất:** Các thuật ngữ này đã gắn liền với mã nguồn, tên model (`WorkboxService`), test suites (305 tests), và tài liệu 14 giai đoạn đã hoàn thành. Giữ nguyên giúp tập trung chính xác vào mục tiêu cốt lõi của R1: Rebrand thương hiệu `Treecraft` và đổi Root path `/root` &rarr; `/root` mà không gây phình to phạm vi rủi ro logic.

---

### 6. Dữ liệu hiện tại là dữ liệu thử, nên reset và seed lại hay migration?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), `src/scripts/`
- **Lựa chọn A (Đề xuất mặc định):** **Cung cấp Script Migration idempotent (`migrate-phase-r1-root-rename.js`) hỗ trợ cả `--dry-run` và rollback** để nâng cấp dữ liệu DB hiện có (72 Master items, 53 Web items, 24 templates); đồng thời **cập nhật bộ seed scripts** để môi trường cài đặt mới (Clean DB) tự động tạo cây `/root` ngay từ đầu.
- **Lựa chọn B:** Chỉ hỗ trợ xóa sạch database (Reset) và chạy seed lại từ đầu.
- **Lý do đề xuất:** Cung cấp migration thể hiện năng lực kiến trúc chuyên nghiệp của Tech Lead, bảo vệ dữ liệu nội dung người dùng đã biên tập (bài viết, ảnh Cloudinary, phân quyền ACL 55 rules đã gán), đồng thời vẫn bảo đảm khả năng bootstrap DB mới sạch sẽ.

---

### 7. Migration / seed cũ: Sửa trực tiếp sang `ROOT_PATH` hay giữ bất biến và thêm migration mới?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cập nhật các seed script chính (`seed-initial-data.js`, `seed-presentation-data.js`, `seed-sample-site.js`, `sync-system-templates.js`) sử dụng hằng số `branding.PATHS.ROOT`** để các môi trường mới dựng lên đúng chuẩn `/root`. Các migration lịch sử từ GĐ 0 đến GĐ 8 giữ bất biến (đóng băng lịch sử) và bổ sung 1 migration duy nhất cho R1: `migrate-phase-r1-root-rename.js`.
- **Lựa chọn B:** Sửa toàn bộ tất cả migration cũ từ GĐ 0 &rarr; 8.
- **Lý do đề xuất:** Tuân thủ nguyên tắc "Migration Immutability" trong kỹ nghệ phần mềm: Migration cũ đã chạy trên production không được sửa lại; chỉ tạo migration mới để chuyển dịch trạng thái.

---

### 8. Item gốc: Đổi `name` `sitecore` &rarr; `root` và giữ nguyên `_id`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), Item Model
- **Lựa chọn A (Đề xuất mặc định):** **Đổi `name: "root"`, `path: "/root"` nhưng giữ nguyên `_id: ObjectId("6ae95cc6b1e541e051fd4162")`** trên cả Master và Web.
- **Lựa chọn B:** Xóa item cũ và tạo một item gốc mới với `_id` mới.
- **Lý do đề xuất:** Giữ nguyên `_id` đảm bảo toàn bộ quan hệ `parentId`, liên kết ACL rules (`itemId: 6ae95cc6b1e541e051fd4162`), và lịch sử xuất bản không bị mồ côi hoặc gãy vỡ.

---

### 9. Có logo / favicon Treecraft chưa, hay dùng placeholder chữ?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md), Topbar & Shell
- **Lựa chọn A (Đề xuất mặc định):** **Dùng Logo chữ Treecraft tinh tế kèm biểu tượng cây cách điệu (Tabler icon `ti ti-trees` hoặc `ti ti-binary-tree`) và SVG Favicon xanh lá/navy hiện đại.** Khi người dùng có file ảnh logo chính thức sẽ thay thế sau mà không ảnh hưởng mã nguồn.
- **Lựa chọn B:** Giữ logo cũ hoặc để trống không hiển thị icon.
- **Lý do đề xuất:** Tạo ngay nhận diện thị giác mới chuyên nghiệp, đẹp mắt và đồng bộ trên topbar, taskbar, login và tab trình duyệt.

---

### 10. Tên repository git và thư mục dự án (`Admin-CMS`) có đổi không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-043](decisions/DEC-043-rebrand-treecraft-and-root-rename.md)
- **Lựa chọn A (Đề xuất mặc định):** **Không đổi tên thư mục hay git remote trong giai đoạn R1.** Việc đổi tên thư mục dự án trên máy cá nhân hoặc đổi tên repo trên GitHub thuộc quyền chủ động của người dùng sau khi commit mã nguồn xong.
- **Lựa chọn B:** Yêu cầu kịch bản đổi tên thư mục và remote origin.
- **Lý do đề xuất:** Tránh xung đột đường dẫn workspace hiện tại của IDE và terminal runner.

---

# CÂU HỎI KỸ THUẬT GIAI ĐOẠN K1 (DATABASE BACKUP & RESTORE)

Tài liệu này lưu trữ danh sách 8 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho **Giai đoạn K1: Sao lưu & Phục hồi Cơ sở dữ liệu (Database Backup & Restore)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Máy chủ có sẵn công cụ `mongodump` / `mongorestore` không, hay sử dụng động cơ fallback NDJSON?
- **Trạng thái:** Đã xác minh & có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051: Kiến Trúc Sao Lưu & Phục Hồi Cơ Sở Dữ Liệu Toàn Diện](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Ưu tiên sử dụng `mongodump` và `mongorestore` nhị phân.** Đã kiểm tra thực tế: máy chủ hiện đã có sẵn tại `/opt/homebrew/bin/mongodump` và `/opt/homebrew/bin/mongorestore` (phiên bản 100.16.1). Đồng thời, hệ thống vẫn cài đặt sẵn động cơ dự phòng (Fallback Engine) trích xuất luồng NDJSON tương thích BSON qua Mongo Driver để phòng trường hợp triển khai trên môi trường container tối giản không có tiện ích CLI.
- **Lựa chọn B:** Chỉ sử dụng duy nhất fallback NDJSON và bỏ qua mongodump.
- **Lý do đề xuất:** Sử dụng tiện ích nhị phân chính chủ của MongoDB mang lại tốc độ vượt trội, tiết kiệm tối đa CPU/RAM và bảo đảm tính tương thích nhị phân 100%.

---

### 2. Mô hình triển khai MongoDB là Replica Set hay Standalone?
- **Trạng thái:** Đã xác minh & có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Hệ thống đang kết nối MongoDB Atlas dạng Replica Set (`ReplicaSetWithPrimary`).** Tận dụng tính năng đọc snapshot nhất quán (`secondaryPreferred`) hoặc Mongo Client Session với Causal Consistency để sao lưu an toàn mà không gây áp lực ghi lên nút Primary.
- **Lựa chọn B:** Coi như Standalone và sao lưu không có session.
- **Lý do đề xuất:** Tận dụng đúng năng lực kiến trúc hiện tại của cơ sở dữ liệu trên cloud để tạo ra các bản sao lưu đạt tính nhất quán giao dịch (Point-in-Time consistency).

---

### 3. Có kích hoạt mã hóa bản sao lưu (AES-256-GCM) mặc định không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Bật mã hóa mặc định bằng thuật toán AES-256-GCM** với khóa 256-bit cấu hình qua biến môi trường `BACKUP_ENCRYPTION_KEY`. Khóa tuyệt đối không lưu kèm trong tệp sao lưu. Nếu hệ thống chưa cấu hình biến môi trường này, sẽ hiển thị cảnh báo bảo mật rõ ràng khi tạo bản sao lưu ở dạng thô không mã hóa.
- **Lựa chọn B:** Không mã hóa bản sao lưu để tiết kiệm CPU.
- **Lý do đề xuất:** Bản sao lưu chứa dữ liệu nhạy cảm của tổ chức (hash mật khẩu người dùng, cấu hình Basic Auth, log kiểm toán). Mã hóa là yêu cầu bắt buộc theo tiêu chuẩn bảo mật dữ liệu cấp doanh nghiệp.

---

### 4. Tài nguyên Cloudinary Media: Chỉ lưu manifest metadata hay sao chép tệp nhị phân?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038](decisions/DEC-038-cloudinary-media-item-unification.md), [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chỉ sao lưu bản lược kê `media-manifest.json` (`publicId`, `assetId`, `format`, `bytes`, `etag`, `url`), tuyệt đối không tải về hay sao chép file nhị phân của Cloudinary.** Khi phục hồi (Restore), hệ thống sẽ đối chiếu manifest này với Cloudinary API và xuất báo cáo danh sách tài nguyên bị thiếu (nếu có).
- **Lựa chọn B:** Tải toàn bộ file ảnh/video từ Cloudinary về lưu kèm trong gói backup.
- **Lý do đề xuất:** Cloudinary là hạ tầng đám mây lưu trữ chuyên dụng có sẵn SLA và cơ chế dự phòng dữ liệu riêng. Việc tải về toàn bộ media sẽ làm gói backup phình to hàng Gigabytes, làm chậm quá trình sao lưu và gây quá tải băng thông mạng.

---

### 5. Có loại trừ `audit_logs` và `publish_histories` theo mặc định để giảm dung lượng không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-045](decisions/DEC-045-audit-log-event-bus-and-retention.md), [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Mặc định KHÔNG loại trừ (sao lưu toàn bộ cả Audit Log và Publish History để đảm bảo khả năng truy vết pháp lý và lịch sử).** Tuy nhiên, trên giao diện web và tham số dòng lệnh CLI cung cấp tùy chọn checkbox `--exclude-audit` để quản trị viên chủ động bỏ qua nếu chỉ muốn tạo bản sao lưu nghiệp vụ siêu nhẹ.
- **Lựa chọn B:** Mặc định luôn luôn loại trừ `audit_logs`.
- **Lý do đề xuất:** Bản sao lưu chuẩn Disaster Recovery cần khôi phục trọn vẹn toàn bộ ngữ cảnh hệ thống, bao gồm cả lịch sử kiểm toán để phục vụ điều tra nguyên nhân sự cố sau thảm họa.

---

### 6. Chính sách lưu giữ (Retention Policy) và lập lịch định kỳ mặc định là bao nhiêu?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Duy trì mặc định 7 bản sao lưu gần nhất (`BACKUP_RETENTION_COUNT=7`) kết hợp thời hạn 30 ngày (`BACKUP_RETENTION_DAYS=30`). Bộ lập lịch nội bộ tự động kích hoạt tạo backup vào lúc 02:00 sáng hàng ngày.** Tuyệt đối áp dụng Quy tắc Vàng: Không bao giờ xóa bản sao lưu duy nhất còn lại và không xóa bản `pre-restore` gần nhất.
- **Lựa chọn B:** Lưu trữ không giới hạn hoặc chỉ giữ đúng 1 bản gần nhất.
- **Lý do đề xuất:** 7 bản gần nhất cho phép quay lui (rollback) về bất kỳ ngày nào trong tuần trước mà vẫn kiểm soát tốt dung lượng ổ cứng máy chủ.

---

### 7. Có cho phép Tải về (Download) gói sao lưu trực tiếp qua giao diện web không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md), [05-security.md](rules/05-security.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có cho phép, nhưng có hàng rào bảo mật nghiêm ngặt:** Phục vụ tệp tin qua luồng stream trực tiếp (không giải nén ra thư mục tạm), yêu cầu quyền chuyên biệt `backup:download`, và **chỉ cho phép tải về đối với các bản sao lưu đã được mã hóa AES-256-GCM** (nếu bản sao lưu không mã hóa, yêu cầu quản trị viên nhập mật khẩu xác nhận cấp 2).
- **Lựa chọn B:** Cấm hoàn toàn tải về qua giao diện web, chỉ cho phép sao chép tệp qua SCP/SSH server.
- **Lý do đề xuất:** Tải về qua giao diện giúp đội ngũ vận hành lưu trữ bản backup offline hoặc chuyển sang môi trường kiểm thử nhanh chóng mà vẫn bảo đảm an toàn dữ liệu nhờ mã hóa.

---

### 8. Thao tác phục hồi đè trực tiếp (`--in-place`) có cho phép thực hiện qua giao diện web không, hay chỉ cho phép qua CLI?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-051](decisions/DEC-051-database-backup-and-restore-architecture.md)
- **Lựa chọn A (Đề xuất mặc định):** **Ở phiên bản đầu tiên (v1.0), giao diện Web CHỈ CHO PHÉP phục hồi sang cơ sở dữ liệu mới (`--target-db <tên-mới>`) để đối chiếu an toàn.** Thao tác ghi đè trực tiếp (`--in-place`) tiềm ẩn rủi ro phá hủy hệ thống nên **chỉ cho phép thực thi thông qua công cụ dòng lệnh CLI** khi quản trị viên có quyền truy cập trực tiếp máy chủ, đảm bảo có sự giám sát kỹ thuật tuyệt đối.
- **Lựa chọn B:** Cho phép nút bấm Restore in-place ngay trên giao diện web.
- **Lý do đề xuất:** Giảm thiểu tối đa nguy cơ thảm họa do click nhầm trên trình duyệt hoặc bị tấn công tài khoản quản trị viên. Khôi phục sang DB mới trên web vừa an toàn, vừa cho phép so sánh dữ liệu qua ứng dụng Database Switcher & Diff (GĐ 8.1) trước khi quyết định chuyển đổi.

---

# CÂU HỎI CẦN XÁC NHẬN CHO GIAI ĐOẠN E1 (TÁCH MÔI TRƯỜNG DATABASE & CHỐT CHẶN AN TOÀN)

Tài liệu này lưu trữ danh sách các câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho yêu cầu: **Tách môi trường Database (Local / Cloud) và Chốt chặn An toàn (GĐ E1)**, kèm theo đề xuất mặc định của Tech Lead.

---

### 1. Dữ liệu hiện trên cloud là Production hay Staging?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Coi database cloud hiện tại là `production` và chỉ gán fingerprint lần đầu sau khi có xác nhận tường minh của người dùng.** Khi triển khai GĐ E1, một script chuyên dụng `src/scripts/init-fingerprint.js` sẽ chạy tương tác, yêu cầu người dùng xác nhận gắn nhãn `production` cho cluster cloud hiện tại.
- **Lựa chọn B:** Tự động gán nhãn `staging` cho cloud.
- **Lý do đề xuất:** Coi cloud là production là phương án an toàn nhất theo nguyên tắc phòng vệ tối đa (Defensive Design), kích hoạt ngay mọi chốt chặn cấm phá hoại.

---

### 2. Có thiết lập `staging` riêng biệt trên Cloud ngay bây giờ không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Chuẩn bị đầy đủ kiến trúc 3 môi trường và tệp mẫu `.env.staging.example`, nhưng trước mắt vận hành thực tế 2 môi trường chính: `development` (Local Docker) và `production` (Atlas Cloud).** Môi trường `staging` sẽ kích hoạt ngay khi người dùng có cụm cluster/database staging riêng.
- **Lựa chọn B:** Bắt buộc tạo ngay cluster staging trên cloud.
- **Lý do đề xuất:** Giúp tiến độ GĐ E1 tập trung dứt điểm vào mục tiêu quan trọng nhất: cô lập an toàn môi trường dev local và bảo vệ cloud production, tránh phát sinh chi phí hoặc thao tác hạ tầng cloud chưa cần thiết.

---

### 3. Phiên bản MongoDB Docker Local nên dùng image nào?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md), [E1-baseline.md](reports/E1-baseline.md)
- **Lựa chọn A (Đề xuất mặc định):** **Sử dụng chính xác Docker image `mongo:8.0` (khớp hoàn toàn với phiên bản MongoDB Atlas Cloud v8.0.37 hiện tại).**
- **Lựa chọn B:** Dùng `mongo:latest` hoặc `mongo:7.0`.
- **Lý do đề xuất:** Đồng nhất tuyệt đối phiên bản engine giữa Local và Cloud giúp triệt tiêu các lỗi tương thích về cú pháp truy vấn, aggregation pipeline và cơ chế chỉ mục.

---

### 4. Docker MongoDB Local có cần chạy chế độ Replica Set đơn nút không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có. Cấu hình Docker Compose khởi chạy replica set đơn nút (`--replSet rs0`) và tự động khởi tạo bằng một container init `rs.initiate()`.**
- **Lựa chọn B:** Chạy standalone thông thường.
- **Lý do đề xuất:** Mặc dù code hiện tại chưa dùng transactions, việc chạy replica set đơn nút giả lập 100% môi trường Atlas, hỗ trợ sẵn sàng cho MongoDB Change Streams và `mongodump --oplog` của GĐ K1 mà không tốn thêm tài nguyên máy.

---

### 5. Cloudinary: Phân định thư mục theo môi trường hay dùng tài khoản khác nhau?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-038](decisions/DEC-038-cloudinary-media-item-unification.md), [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Dùng chung Cloudinary account nhưng tách biệt thư mục gốc qua biến `CLOUDINARY_ROOT_FOLDER`:**
  - `development` &rarr; `AdminCMS-dev`
  - `staging` &rarr; `AdminCMS-uat`
  - `production` &rarr; `AdminCMS`
- **Lựa chọn B:** Bắt buộc đăng ký tài khoản Cloudinary riêng biệt cho dev.
- **Lý do đề xuất:** Đơn giản hóa cấu hình cho lập trình viên, chỉ cần đổi giá trị folder là toàn bộ media tải lên khi dev hoàn toàn tách biệt, không bao giờ ghi đè lên tài nguyên production.

---

### 6. Có triển khai công cụ Clone dữ liệu 1 chiều `db:clone-from-remote` kèm `--anonymize` không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có triển khai. Lệnh `npm run db:clone-from-remote -- --env production|staging` chỉ kéo 1 chiều từ Remote về Local, có bước xác nhận tương tác, loại trừ `sessions`, tự động che email (`***@treecraft.local`), đặt lại mật khẩu của toàn bộ tài khoản về `adminpass123`, xóa hash Basic Auth và tự gán fingerprint `development`.**
- **Lựa chọn B:** Không làm tool clone, để lập trình viên tự copy qua mongodump.
- **Lý do đề xuất:** Tiết kiệm thời gian cho dev khi cần tái hiện bug với dữ liệu thật, đồng thời tuân thủ nghiêm ngặt bảo mật dữ liệu khách hàng (GDPR / An ninh mạng).

---

### 7. Phương thức chạy MongoDB Local trên máy lập trình viên: Docker Compose hay cài Native?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Ưu tiên Docker Compose (`docker-compose.dev.yml`).** Lập trình viên chỉ cần gõ `npm run db:up` là toàn bộ cơ sở dữ liệu local tự động chạy ngầm với volume bền vững. Nếu máy nào không có Docker, cung cấp hướng dẫn cài MongoDB Community và chỉ cần trỏ URI về `mongodb://127.0.0.1:27017/admin_cms`.
- **Lựa chọn B:** Bắt buộc cài native Homebrew / Service trên máy.
- **Lý do đề xuất:** Docker bảo đảm môi trường cô lập, dễ reset và không làm rác máy chủ/máy dev.

---

### 8. Xử lý trường hợp Staging và Production cùng nằm trên một MongoDB Cluster như thế nào?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-052](decisions/DEC-052-environment-database-separation-and-dbguard.md)
- **Lựa chọn A (Đề xuất mặc định):** **Khuyến nghị Staging và Production nằm trên 2 project/cluster Atlas khác nhau. Trường hợp bắt buộc dùng chung cluster, `dbGuard` bắt buộc kiểm tra trường `settings.environmentFingerprint.appEnv` khớp chính xác `staging` hoặc `production` mới cho phép tiến trình chạy.**
- **Lựa chọn B:** Đổi tên database trên staging thành `admin_cms_staging`.
- **Lý do đề xuất:** Phù hợp với nguyên tắc bất biến "giữ nguyên tên database ở mọi môi trường" do người dùng đặt ra, kiểm soát tính an toàn qua fingerprint cấp dữ liệu.

---

# CÂU HỎI KỸ THUẬT GIAI ĐOẠN 11-Y2 (TAB "YAML SYNC" THEO TỪNG SECTION TRÊN TRANG SERIALIZATION)

Danh sách 6 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho **Giai đoạn 11-Y2: Tab "YAML Sync" Theo Từng Section**, kèm theo đề xuất mặc định của Tech Lead:

---

### 1. Chế độ đồng bộ mặc định (Default Sync Mode): Content là `createOnly`, ba section còn lại (Template, Layout, Rendering) là `overwrite`?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.**
  - Nhánh `Content`: Mặc định là `createOnly` (chỉ tạo mới các item chưa có, tuyệt đối không ghi đè lên các trang/bài viết đang được biên tập viên chỉnh sửa trong database). Nếu người dùng cố ý chuyển sang `overwrite`, modal hiển thị cảnh báo đỏ nổi bật và yêu cầu xác nhận.
  - Ba nhánh kỹ thuật (`Template`, `Layout`, `Rendering`): Mặc định là `overwrite` để cập nhật cấu trúc schema, viewPath và component definition từ repo mã nguồn sang database.
- **Lựa chọn B:** Đặt tất cả 4 section đều có mode mặc định là `overwrite` hoặc đều là `createOnly`.
- **Lý do đề xuất:** Đây là quy tắc an toàn cốt lõi kinh điển (chuẩn Sitecore Unicorn), bảo vệ dữ liệu nội dung của biên tập viên không bị ghi đè ngoài ý muốn khi dev chạy sync, đồng thời đảm bảo mã nguồn layout/template luôn được cập nhật mới nhất.

---

### 2. Section Layout có bao gồm cả hai nhánh con `Layouts` và `Placeholders` không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.** Section Layout gom chung cả hai nhánh con:
  - `ROOT_PATH/layout/Layouts` &rarr; lưu tại `items/layout/Layouts/`
  - `ROOT_PATH/layout/Placeholders` &rarr; lưu tại `items/layout/Placeholders/`
- **Lựa chọn B:** Tách riêng thành 2 section độc lập: Section "Layouts" và Section "Placeholders" (thành 5 section thay vì 4).
- **Lý do đề xuất:** Giữ đúng cấu trúc 4 section chuẩn hóa theo yêu cầu, đồng thời Layout và Placeholder có sự gắn kết chặt chẽ trong kiến trúc Presentation của Treecraft (Layout chứa Placeholder, Placeholder chứa Rendering).

---

### 3. Section Template có serialize nhánh `System` (`ROOT_PATH/templates/System`) mặc định không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Lựa chọn A (Đề xuất mặc định):** **Không serialize System templates mặc định.**
  - Chỉ serialize các template do dự án định nghĩa (`Feature`, `Foundation`, `Project`).
  - Nhánh `System` templates là các mẫu cấu trúc hệ thống nền tảng (Item, Template, Section, Field, Media, Language...) được khởi tạo cố định bởi seed/migration script, không nên đưa vào vòng đời serialize hằng ngày của lập trình viên.
  - Cung cấp cờ cấu hình `includeSystemTemplates: false` trong `src/config/serializationSections.js` để có thể bật khi thật sự cần thiết.
- **Lựa chọn B:** Luôn serialize toàn bộ kể cả `System` templates.
- **Lý do đề xuất:** Giảm thiểu rác thư mục, giữ diff Git gọn gàng và tránh rủi ro ghi đè sai lệch các template hệ thống cốt lõi.

---

### 4. Có bổ sung nút thao tác hàng loạt "Reserialize selected" và "Sync selected" không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có.**
  - Checkbox tổng "Chọn tất cả" và 2 nút hành động hàng loạt: "Reserialize selected" và "Sync selected".
  - Khi thực thi "Sync selected", hệ thống **tự động sắp xếp thứ tự thực thi theo đồ thị phụ thuộc**: `Template` &rarr; `Layout` &rarr; `Rendering` &rarr; `Content`.
- **Lựa chọn B:** Chỉ cho phép bấm Reserialize / Sync đơn lẻ từng section một.
- **Lý do đề xuất:** Nâng cao trải nghiệm lập trình viên (Developer Experience). Khi dev kéo code mới về, chỉ cần 1 cú click "Sync selected" là toàn bộ hệ thống được đồng bộ an toàn theo đúng thứ tự phụ thuộc.

---

### 5. Cố định 4 section hay cho phép người dùng cấu hình section tùy chỉnh?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Lựa chọn A (Đề xuất mặc định):** **Cố định 4 section cốt lõi trong `src/config/serializationSections.js`.** Không phát triển tính năng cấu hình section động do người dùng tự thêm/sửa/xóa trên giao diện trong giai đoạn này.
- **Lựa chọn B:** Xây dựng trình quản lý thêm bớt Section động lưu trong database.
- **Lý do đề xuất:** Giữ phạm vi gọn gàng theo yêu cầu ("Làm gọn, không thêm tính năng ngoài phạm vi"), đảm bảo tính ổn định và kiểm soát chặt chẽ quan hệ phụ thuộc kỹ thuật.

---

### 6. Thư viện phân tích/xuất YAML và cách nạp Tailwind CSS:
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md)
- **Khảo sát & Đề xuất:**
  - **Thư viện YAML:** Trong `package.json` hiện chưa có thư viện YAML. Đề xuất xin phép người dùng cài đặt thư viện `js-yaml` (`^4.1.0`) - thư viện parse/dump YAML chuẩn công nghiệp của Node.js, hỗ trợ cấu hình `noCompatMode: true`, `sortKeys: true` (deterministic) và an toàn tuyệt đối khi vô hiệu hóa custom tags / aliases.
  - **Cách nạp Tailwind:** Dự án hiện đang dùng **Tailwind CLI build ra file tĩnh** (`npm run build:css:admin` &rarr; `public/css/tailwind-admin.css`). Do đó, giao diện Tab mới sẽ dùng **100% class Tailwind và Tabler hiện có**, dùng đúng token CSS trong `src/styles/tokens/theme-tokens.js`, không thêm thư viện CSS mới và không cần thay đổi cấu hình Tailwind.

---

# CÂU HỎI KỸ THUẬT GIAI ĐOẠN 11-Y3 (SERIALIZE FIELD DEFINITION CỦA TEMPLATE)

Tài liệu này lưu trữ danh sách 5 câu hỏi kỹ thuật / nghiệp vụ cần xác nhận cho **Giai đoạn 11-Y3: Serialize Field Definition Của Template**, kèm theo chẩn đoán hiện trạng và đề xuất mặc định của Tech Lead.

---

### 1. Field nhúng trong file template hay mỗi field một file?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-055: Serialize Field Definition Của Template Vào YAML](decisions/DEC-055-template-field-definition-yaml-serialization.md)
- **Lựa chọn A (Đề xuất mặc định):** **Nhúng toàn bộ Sections và Fields vào cùng một file YAML của Template.**
- **Lựa chọn B:** Mỗi Field hoặc Section tách ra một file YAML riêng biệt.
- **Lý do đề xuất:** 
  - Một Template là một đơn vị logic hoàn chỉnh (Schema Definition).
  - Nhúng sections và fields trong cùng file giúp lập trình viên theo dõi toàn bộ cấu trúc của template trên 1 màn hình; khi thêm/sửa/xoá field, lệnh `git diff` chỉ hiển thị biến động trực tiếp trên file template đó.
  - Tách mỗi field thành 1 file sẽ sinh ra hàng trăm file nhỏ phân mảnh, làm chậm tốc độ I/O đĩa và tăng độ phức tạp khi giải quyết cây thư mục.

---

### 2. Standard Values có nằm chung file template không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-055: Serialize Field Definition Của Template Vào YAML](decisions/DEC-055-template-field-definition-yaml-serialization.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có, Standard Values nằm chung trong file template**, ánh xạ theo `fieldId` và kèm chú thích `name` để người đọc diff dễ hiểu.
- **Lựa chọn B:** Tách Standard Values thành file riêng hoặc không serialize.
- **Lý do đề xuất:** Standard Values là thuộc tính nội tại của Template, quy định giá trị mặc định khi tạo mới Item. Để chung file bảo đảm tính nguyên khối khi sync sang môi trường mới (Staging/Production).

---

### 3. Xoá field khi Sync chỉ khi bật tuỳ chọn + xác nhận?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-055: Serialize Field Definition Của Template Vào YAML](decisions/DEC-055-template-field-definition-yaml-serialization.md)
- **Lựa chọn A (Đề xuất mặc định):** **Có, mặc định KHÔNG xoá.**
  - Nếu một field có trong Database nhưng không xuất hiện trong file YAML, hệ thống mặc định giữ nguyên field trong DB và chỉ phát cảnh báo *"Field sẽ bị gỡ"*.
  - Chỉ thực hiện xoá field khi người dùng bật cờ tuỳ chọn `deleteMissingFields: true` và bấm xác nhận trong modal cảnh báo.
  - Việc xoá field khỏi định nghĩa template **không xoá dữ liệu đã có trong các Item** (tuân thủ nguyên tắc Safe Schema của GĐ 3), nhưng Dry-Run phải thống kê và **cảnh báo số Item đang có dữ liệu** của field đó.
- **Lựa chọn B:** Tự động xoá field trong DB nếu trong YAML không có.
- **Lý do đề xuất:** Bảo vệ an toàn dữ liệu, chống mất mát schema vô ý do xung đột branch Git hoặc file YAML cũ.

---

### 4. YAML template hiện đã có phần nào của field chưa? (Chẩn đoán hiện trạng)
- **Kết quả chẩn đoán:** **Hiện tại HOÀN TOÀN CHƯA CÓ bất kỳ phần nào của field hay section.**
  - File YAML của template hiện tại chỉ chứa các thuộc tính của một `Item` thông thường (`_id`, `name`, `displayName`, `path`, `icon`, `languages`).
  - Hoàn toàn thiếu: `sections`, `fields`, `baseTemplates`, `insertOptions`, `standardValues`, `presentation`.
  - Nguyên nhân: Serializer cũ chỉ truy vấn bảng `Item` (`items_master`) mà không kết hợp dữ liệu schema từ collection `templates`.
- **Giải pháp:** Cập nhật `yamlItemSerializer.js` và `yamlSectionService.js` để khi reserialize section `template`, hệ thống sẽ nạp schema từ collection `templates` và nhúng đầy đủ các mảng `sections`, `fields`, `baseTemplates`, `insertOptions`, `standardValues`.

---

### 5. Có serialize cả template `System` không?
- **Trạng thái:** Đã có đề xuất mặc định (Chờ duyệt)
- **Quyết định liên quan:** [DEC-053](decisions/DEC-053-section-based-yaml-serialization-and-sync.md), [DEC-055](decisions/DEC-055-template-field-definition-yaml-serialization.md)
- **Lựa chọn A (Đề xuất mặc định):** **Không serialize các template trong nhánh `/root/templates/System`** (như đã chốt trong DEC-053 và cấu hình `includeSystemTemplates: false`).
- **Lựa chọn B:** Xuất toàn bộ cả các system template.
- **Lý do đề xuất:** Các template hệ thống (`/root/templates/System/*`) là bất biến và được khởi tạo tự động bởi hệ thống (`src/scripts/sync-system-templates.js`). Không đưa vào YAML hằng ngày để tránh rác diff và nguy cơ ghi đè schema hệ thống.






