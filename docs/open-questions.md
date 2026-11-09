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



